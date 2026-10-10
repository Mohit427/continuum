"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ExtractionSchema, sanitizeExtraction } from "@/lib/ingest/schema";
import { normalizeExtraction } from "@/lib/ingest/normalize";
import { commitDocument } from "@/lib/ingest/commit";
import { rerunEngine } from "@/lib/engine/persist";
import { SUPPORTED_MIME } from "@/lib/ai/extract";
import { notify } from "@/lib/notify";

const MAX_BYTES = 10 * 1024 * 1024;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export type UploadTicket =
  | { ok: true; documentId: string; path: string; token: string }
  | { ok: false; error: string; duplicateOf?: string };

/**
 * Step 1 of an upload: validate, block exact duplicates (SHA-256), create the document row and
 * return a signed upload URL so the file goes straight to private storage (not through our server).
 * Patients upload to their own record; labs upload to a patient by Health ID.
 */
export async function createUpload(input: { fileName: string; mime: string; size: number; sha256: string; healthId?: string }): Promise<UploadTicket> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Please sign in again." };
  if (!SUPPORTED_MIME.includes(input.mime)) return { ok: false, error: input.mime.includes("heic") ? "iPhone HEIC photos aren't supported. Set the camera to 'Most Compatible' or upload a JPG/PDF." : "Upload a JPG, PNG, WebP or PDF file." };
  if (input.size > MAX_BYTES) return { ok: false, error: "File is larger than 10 MB." };
  if (!/^[a-f0-9]{64}$/.test(input.sha256)) return { ok: false, error: "Could not fingerprint the file." };

  const sb = supabaseAdmin();
  let patientId = s.profile.id;
  let source: "patient" | "lab" = "patient";
  if (s.profile.role === "lab") {
    const { data: p } = await sb.from("profiles").select("id").eq("health_id", (input.healthId ?? "").trim().toUpperCase()).eq("role", "patient").maybeSingle();
    if (!p) return { ok: false, error: "No patient found with that Health ID." };
    patientId = p.id;
    source = "lab";
  } else if (s.profile.role !== "patient") return { ok: false, error: "Only patients and labs can upload documents." };

  const { data: dup } = await sb.from("documents").select("id,file_name").eq("patient_id", patientId).eq("sha256", input.sha256).maybeSingle();
  if (dup) return { ok: false, error: `This exact file was already uploaded${dup.file_name ? ` (${dup.file_name})` : ""}.`, duplicateOf: dup.id };

  const id = crypto.randomUUID();
  const path = `${patientId}/${id}.${EXT[input.mime]}`;
  const { error } = await sb.from("documents").insert({
    id, patient_id: patientId, storage_path: path, file_name: input.fileName.slice(0, 120), sha256: input.sha256, mime: input.mime,
    status: "uploaded", source, uploaded_by: s.profile.id,
  });
  if (error) return { ok: false, error: "Could not register the upload." };
  const { data: signed, error: sErr } = await sb.storage.from("documents").createSignedUploadUrl(path);
  if (sErr || !signed) return { ok: false, error: "Could not prepare the upload." };
  return { ok: true, documentId: id, path, token: signed.token };
}

async function ownDoc(id: string) {
  const s = await getSession();
  if (!s || s.profile.role !== "patient") throw new Error("Not allowed");
  const { data: doc } = await supabaseAdmin().from("documents").select("*").eq("id", id).eq("patient_id", s.profile.id).single();
  if (!doc) throw new Error("Document not found");
  return { s, doc };
}

/** Human-in-the-loop: the patient reviewed (and possibly corrected) the extraction. Commit it. */
export async function confirmDocument(id: string, extractionJson: string): Promise<{ error?: string }> {
  const { s, doc } = await ownDoc(id);
  let parsed;
  try {
    parsed = ExtractionSchema.safeParse(JSON.parse(extractionJson));
  } catch {
    return { error: "Invalid data." };
  }
  if (!parsed.success) return { error: `Please fix: ${parsed.error.issues[0].path.join(".")} ${parsed.error.issues[0].message}` };
  const x = sanitizeExtraction(parsed.data);
  const today = new Date().toISOString().slice(0, 10);
  const n = normalizeExtraction(x, { fallbackDate: doc.created_at.slice(0, 10), today });
  const sb = supabaseAdmin();
  const { providerId } = await commitDocument(sb, { patientId: s.profile.id, documentId: id, docType: x.doc_type, n, verifiedBy: s.profile.id });
  await sb.from("documents").update({
    status: "confirmed", confirmed_at: new Date().toISOString(), doc_type: x.doc_type, doc_date: n.docDate, provider_id: providerId,
    facility: x.facility, name_on_doc: x.patient_name, extracted_json: { ...(doc.extracted_json ?? {}), extraction: x, issues: n.issues, reviewed: true },
  }).eq("id", id);
  await rerunEngine(s.profile.id);
  revalidatePath("/patient", "layout");
  redirect(`/patient/records?confirmed=${id}`);
}

/** Not my document / duplicate / wrong file: delete the document, its file and any derived rows. */
export async function discardDocument(id: string) {
  const { s, doc } = await ownDoc(id);
  const sb = supabaseAdmin();
  await sb.storage.from("documents").remove([doc.storage_path]);
  await sb.from("documents").delete().eq("id", id); // derived rows cascade
  if (doc.status === "confirmed") await rerunEngine(s.profile.id);
  revalidatePath("/patient", "layout");
  redirect("/patient/records");
}

export async function setMedicationStatus(medId: string, status: "active" | "stopped") {
  const s = await getSession();
  if (!s || s.profile.role !== "patient") throw new Error("Not allowed");
  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  await sb.from("medications").update({ status, end_date: status === "stopped" ? today : null }).eq("id", medId).eq("patient_id", s.profile.id);
  await rerunEngine(s.profile.id);
  revalidatePath("/patient", "layout");
}

export async function setAlertStatus(alertId: string, status: "acknowledged" | "dismissed" | "open") {
  const s = await getSession();
  if (!s) throw new Error("Not allowed");
  const sb = supabaseAdmin();
  const { data: a } = await sb.from("alerts").select("patient_id").eq("id", alertId).single();
  if (!a) return;
  if (a.patient_id !== s.profile.id) {
    // a doctor with an active grant may acknowledge
    const { getDoctorAccess } = await import("@/lib/access");
    await getDoctorAccess(s.profile.id, a.patient_id);
    await notify(a.patient_id, { type: "alert", title: `${s.profile.full_name} reviewed a safety flag`, link: "/patient#blind-spots" });
  }
  await sb.from("alerts").update({ status, updated_at: new Date().toISOString() }).eq("id", alertId);
  revalidatePath("/patient", "layout");
  revalidatePath("/doctor", "layout");
}

export async function markNotificationsRead() {
  const s = await getSession();
  if (!s) return;
  await supabaseAdmin().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", s.profile.id).is("read_at", null);
  revalidatePath("/", "layout");
}
