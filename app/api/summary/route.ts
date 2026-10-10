import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { AccessDenied, getDoctorAccess, resolveToken } from "@/lib/access";
import { applyScope, loadRecord, type PatientRecord } from "@/lib/data/record";
import { summaryPayload } from "@/lib/data/views";
import { summarizeRecord } from "@/lib/ai/summary";

export const maxDuration = 120;

const Body = z.object({
  patientId: z.uuid().optional(),
  token: z.string().optional(),
  audience: z.enum(["clinician", "patient"]).default("clinician"),
  lang: z.enum(["en", "hi", "ta"]).default("en"),
  refresh: z.boolean().optional(),
});

/** Grounded AI summary of the (scoped) record. Every bullet cites record ids; cached per data version. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { patientId, token, audience, lang } = body.data;

  let record: PatientRecord;
  let lens: string | undefined;
  try {
    if (token) {
      const g = await resolveToken(token, ["link", "caregiver"]);
      record = applyScope(await loadRecord(supabaseAdmin(), g.patient_id), g.scope);
      lens = g.scope.lens ?? undefined;
    } else {
      const s = await getSession();
      if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      if (s.profile.role === "patient") {
        record = await loadRecord(await supabaseUser(), s.profile.id, s.profile);
        record = { ...record, alerts: record.alerts.filter((a) => a.status !== "resolved" && a.status !== "dismissed") };
      } else if (s.profile.role === "doctor" && patientId) {
        const g = await getDoctorAccess(s.profile.id, patientId);
        record = applyScope(await loadRecord(await supabaseUser(), patientId), g.scope); // RLS + scope
        lens = g.scope.lens && g.scope.lens !== "general" ? g.scope.lens : s.profile.specialty ?? undefined;
      } else return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
  } catch (e) {
    if (e instanceof AccessDenied) return NextResponse.json({ error: "Access denied", reason: e.reason }, { status: 403 });
    throw e;
  }

  const payload = summaryPayload(record);
  const cacheKey = createHash("sha256").update(JSON.stringify({ payload: { ...payload, today: undefined }, audience, lang, lens })).digest("hex");
  const sb = supabaseAdmin();
  if (!body.data.refresh) {
    const { data: hit } = await sb.from("summaries").select("content").eq("patient_id", record.profile.id).eq("cache_key", cacheKey).maybeSingle();
    if (hit) return NextResponse.json({ summary: hit.content, cached: true, ids: idIndex(record) });
  }
  try {
    const summary = await summarizeRecord(payload, { audience, lang, lens });
    // Drop citations to ids that are not in the payload (grounding check).
    const known = new Set(Object.keys(idIndex(record)));
    summary.sections.forEach((s) => s.bullets.forEach((b) => (b.cites = b.cites.filter((c) => known.has(c)))));
    await sb.from("summaries").upsert({ patient_id: record.profile.id, cache_key: cacheKey, content: summary }, { onConflict: "patient_id,cache_key" });
    return NextResponse.json({ summary, cached: false, ids: idIndex(record) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Summary unavailable" }, { status: 502 });
  }
}

/** id → {kind, label, documentId} so the UI can turn citations into links to the source. */
function idIndex(r: PatientRecord) {
  const out: Record<string, { kind: string; label: string; documentId: string | null }> = {};
  r.medications.forEach((m) => (out[m.id] = { kind: "medication", label: m.raw_name, documentId: m.source_document_id }));
  r.labs.forEach((l) => (out[l.id] = { kind: "lab", label: `${l.test_name} ${l.value ?? l.value_text ?? ""} ${l.unit ?? ""} (${l.taken_at})`, documentId: l.source_document_id }));
  r.conditions.forEach((c) => (out[c.id] = { kind: "condition", label: c.name, documentId: c.source_document_id }));
  r.allergies.forEach((a) => (out[a.id] = { kind: "allergy", label: `Allergy: ${a.substance}`, documentId: a.source_document_id }));
  r.encounters.forEach((e) => (out[e.id] = { kind: "visit", label: `Visit ${e.date}`, documentId: e.document_id }));
  r.alerts.forEach((a) => (out[a.id] = { kind: "alert", label: a.title, documentId: null }));
  return out;
}
