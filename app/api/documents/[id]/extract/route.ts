import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extractDocument, ExtractionError } from "@/lib/ai/extract";
import { normalizeExtraction } from "@/lib/ingest/normalize";
import { nameSimilarity } from "@/lib/kb/match";
import { sha256Hex } from "@/lib/crypto";
import { notify } from "@/lib/notify";

export const maxDuration = 120;

/** Step 2 of an upload: read the stored file with Claude, normalise, run review checks. */
export async function POST(_req: Request, ctx: RouteContext<"/api/documents/[id]/extract">) {
  const { id } = await ctx.params;
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: doc } = await sb.from("documents").select("*").eq("id", id).single();
  const allowed = doc && (doc.patient_id === s.profile.id || (s.profile.role === "lab" && doc.uploaded_by === s.profile.id));
  if (!allowed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.status === "confirmed") return NextResponse.json({ status: "confirmed" });

  const file = await sb.storage.from("documents").download(doc.storage_path);
  if (file.error || !file.data) {
    await sb.from("documents").update({ status: "failed", error: "File was not uploaded completely." }).eq("id", id);
    return NextResponse.json({ error: "File was not uploaded completely. Please upload again." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.data.arrayBuffer());
  if (sha256Hex(bytes) !== doc.sha256) {
    await sb.from("documents").update({ status: "failed", error: "File fingerprint mismatch." }).eq("id", id);
    return NextResponse.json({ error: "The uploaded file did not match its fingerprint. Please upload again." }, { status: 400 });
  }

  await sb.from("documents").update({ status: "processing", error: null }).eq("id", id);
  try {
    const { data: x, model } = await extractDocument([{ mime: doc.mime, base64: bytes.toString("base64") }]);
    const today = new Date().toISOString().slice(0, 10);
    const n = normalizeExtraction(x, { fallbackDate: doc.created_at.slice(0, 10), today });

    const { data: patient } = await sb.from("profiles").select("full_name").eq("id", doc.patient_id).single();
    const sim = x.patient_name && patient ? nameSimilarity(x.patient_name, patient.full_name) : 1;
    const nameMismatch = !!x.patient_name && sim < 0.6;
    if (nameMismatch)
      n.issues.unshift({ field: "patient_name", level: "warn", message: `The name on this document (“${x.patient_name}”) does not match ${patient!.full_name}. Confirm it is yours before saving.` });

    // Near-duplicate: same type + date + provider with mostly the same content as an existing document.
    let duplicateOf: string | null = null;
    const { data: sameDay } = await sb.from("documents").select("id,file_name,extracted_json").eq("patient_id", doc.patient_id).eq("doc_type", x.doc_type).eq("doc_date", n.docDate).neq("id", id);
    for (const other of sameDay ?? []) {
      const ox = (other.extracted_json as { extraction?: typeof x } | null)?.extraction;
      if (!ox) continue;
      const a = new Set([...x.medications.map((m) => m.name.toLowerCase()), ...x.labs.map((l) => `${l.test.toLowerCase()}=${l.value}`)]);
      const b = new Set([...ox.medications.map((m) => m.name.toLowerCase()), ...ox.labs.map((l) => `${l.test.toLowerCase()}=${l.value}`)]);
      const inter = [...a].filter((k) => b.has(k)).length;
      if (a.size && inter / Math.max(a.size, b.size) >= 0.8) {
        duplicateOf = other.id;
        n.issues.unshift({ field: "document", level: "warn", message: `This looks like a copy of “${other.file_name ?? "an earlier document"}” (same date, same content). Discard it if it is a duplicate.` });
        break;
      }
    }

    const status = doc.source === "lab" ? "pending_patient" : "needs_review";
    await sb.from("documents").update({
      status, extracted_json: { extraction: x, issues: n.issues, model }, overall_confidence: x.overall_confidence, doc_type: x.doc_type,
      doc_date: n.docDate, name_on_doc: x.patient_name, name_mismatch: nameMismatch, duplicate_of: duplicateOf, facility: x.facility,
    }).eq("id", id);
    if (doc.source === "lab")
      await notify(doc.patient_id, { type: "lab_report", title: `${s.profile.full_name} sent you a lab report`, body: "Review it to add the results to your record.", link: `/patient/records/${id}/review` });
    return NextResponse.json({ status, issues: n.issues.length });
  } catch (e) {
    const msg = e instanceof ExtractionError ? e.message : "Unexpected error while reading the document.";
    await sb.from("documents").update({ status: "failed", error: msg }).eq("id", id);
    return NextResponse.json({ error: msg, retryable: e instanceof ExtractionError ? e.retryable : true }, { status: 502 });
  }
}
