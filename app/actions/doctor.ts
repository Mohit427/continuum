"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getDoctorAccess, AccessDenied } from "@/lib/access";
import { normalizeExtraction } from "@/lib/ingest/normalize";
import { commitDocument } from "@/lib/ingest/commit";
import { rerunEngine } from "@/lib/engine/persist";
import { audit, notify } from "@/lib/notify";
import { LAB_BY_KEY } from "@/lib/kb/labs";
import { checkTest } from "@/lib/engine";
import { loadRecord, toTimeline } from "@/lib/data/record";
import type { Extraction } from "@/lib/ingest/schema";

async function doctorWithAccess(patientId: string) {
  const s = await getSession();
  if (!s || s.profile.role !== "doctor") throw new Error("Not allowed");
  const grant = await getDoctorAccess(s.profile.id, patientId);
  return { s, grant };
}

const NoteInput = z.object({
  patientId: z.uuid(),
  note: z.string().trim().min(3, "Write a short note").max(2000),
  complaints: z.array(z.string().trim().min(1)).max(10),
  diagnoses: z.array(z.string().trim().min(1)).max(10),
  prescriptions: z.array(z.object({ name: z.string().trim().min(2), strength: z.string().optional(), frequency: z.string().optional(), duration_days: z.number().int().positive().nullable().optional() })).max(15),
});

/** Doctor writes back into the patient's timeline: the next clinician sees it, and the engine re-runs. */
export async function addDoctorNote(raw: z.input<typeof NoteInput>): Promise<{ error?: string; newAlerts?: number }> {
  const input = NoteInput.safeParse(raw);
  if (!input.success) return { error: input.error.issues[0].message };
  let ctx;
  try { ctx = await doctorWithAccess(input.data.patientId); } catch (e) { return { error: e instanceof AccessDenied ? "Your access has ended." : "Not allowed" }; }
  const { s, grant } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const x: Extraction = {
    doc_type: "prescription", is_medical_document: true, patient_name: null, patient_name_confidence: 1, document_date: today, document_date_confidence: 1,
    facility: s.profile.organization, doctor_name: s.profile.full_name, doctor_specialty: s.profile.specialty, doctor_confidence: 1,
    complaints: input.data.complaints, diagnoses: input.data.diagnoses.map((name) => ({ name, confidence: 1 })),
    medications: input.data.prescriptions.map((p) => ({ name: p.name, strength: p.strength || null, dose: null, frequency: p.frequency || null, duration_days: p.duration_days ?? null, instructions: null, confidence: 1 })),
    labs: [], vitals: { bp_systolic: null, bp_diastolic: null, pulse: null, weight_kg: null, spo2: null }, allergies: [], notes: input.data.note, overall_confidence: 1,
  };
  const n = normalizeExtraction(x, { fallbackDate: today, today });
  const sb = supabaseAdmin();
  const { encounterId } = await commitDocument(sb, { patientId: input.data.patientId, documentId: null, docType: "prescription", n, verifiedBy: s.profile.id, doctorProfileId: s.profile.id });
  await sb.from("doctor_notes").insert({ patient_id: input.data.patientId, doctor_id: s.profile.id, grant_id: grant.id, note: input.data.note, new_prescriptions: input.data.prescriptions, encounter_id: encounterId });
  const res = await rerunEngine(input.data.patientId);
  await audit({ patientId: input.data.patientId, grantId: grant.id, actorId: s.profile.id, actorLabel: `${s.profile.full_name} (${s.profile.specialty ?? "Doctor"})`, action: "add_note", detail: `${input.data.prescriptions.length} prescription(s)` });
  await notify(input.data.patientId, { type: "note", title: `${s.profile.full_name} added a visit note to your record`, link: "/patient/timeline" });
  revalidatePath(`/doctor/patients/${input.data.patientId}`);
  return { newAlerts: res.added };
}

/** "Ordering a test?": returns the last result + whether it's still clinically recent. */
export async function checkTestAction(patientId: string, testKey: string) {
  const { grant } = await doctorWithAccess(patientId);
  if (!LAB_BY_KEY[testKey]) throw new Error("Unknown test");
  const cats = grant.scope.categories as string[];
  if (!cats.includes("all") && !cats.includes("labs")) return { message: "Lab results are not part of what this patient shared with you.", stillValid: false, priceInr: 0, last: null };
  const rec = await loadRecord(supabaseAdmin(), patientId);
  return checkTest(toTimeline(rec), testKey);
}

/** Record the doctor's decision; reusing a recent result adds to the ₹-saved counter. */
export async function logTestDecision(patientId: string, testKey: string, reused: boolean) {
  const { s } = await doctorWithAccess(patientId);
  const def = LAB_BY_KEY[testKey];
  await supabaseAdmin().from("test_checks").insert({ patient_id: patientId, doctor_id: s.profile.id, test_key: testKey, reused, saved_inr: reused ? def?.priceInr ?? 0 : 0 });
  revalidatePath(`/doctor/patients/${patientId}`);
  revalidatePath("/doctor");
}
