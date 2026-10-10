import type { SupabaseClient } from "@supabase/supabase-js";
import type { Normalized } from "./normalize";
import { normalizeName } from "../kb/match";

const ENCOUNTER_KIND: Record<string, string> = {
  prescription: "consultation", lab_report: "lab", discharge_summary: "admission", imaging_report: "imaging", other: "consultation",
};

async function check<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

/** Find-or-create a provider in this patient's record (deduped by normalised name). */
export async function upsertProvider(sb: SupabaseClient, patientId: string, p: { name: string; specialty?: string | null; facility?: string | null; doctorProfileId?: string | null }) {
  const normalized = normalizeName(p.name) || p.name.toLowerCase();
  const rows = await check(
    sb.from("providers").upsert(
      { patient_id: patientId, name: p.name, normalized_name: normalized, specialty: p.specialty ?? null, facility: p.facility ?? null, ...(p.doctorProfileId ? { doctor_profile_id: p.doctorProfileId } : {}) },
      { onConflict: "patient_id,normalized_name" },
    ).select("id"),
    "providers",
  );
  return (rows as { id: string }[])[0].id;
}

/**
 * Write a reviewed document's structured data into the clinical tables with provenance
 * (every row points at its source document). Idempotent: re-confirming replaces the rows.
 */
export async function commitDocument(
  sb: SupabaseClient,
  args: { patientId: string; documentId: string | null; docType: string; n: Normalized; verifiedBy?: string | null; doctorProfileId?: string | null },
): Promise<{ providerId: string | null; encounterId: string }> {
  const { patientId, documentId, n } = args;
  if (documentId) {
    for (const t of ["medications", "lab_results", "conditions", "allergies"]) await check(sb.from(t).delete().eq("source_document_id", documentId), `clear ${t}`);
    await check(sb.from("encounters").delete().eq("document_id", documentId), "clear encounters");
  }

  const providerId = n.provider ? await upsertProvider(sb, patientId, { ...n.provider, doctorProfileId: args.doctorProfileId }) : null;

  const enc = await check(
    sb.from("encounters").insert({
      patient_id: patientId, date: n.docDate, provider_id: providerId, document_id: documentId,
      kind: ENCOUNTER_KIND[args.docType] ?? "consultation", complaints: n.complaints, notes: n.notes,
    }).select("id").single(),
    "encounters",
  );

  if (n.meds.length)
    await check(sb.from("medications").insert(n.meds.map((m) => ({
      patient_id: patientId, raw_name: m.raw_name, generic: m.generic, drug_class: m.drug_class, atc: m.atc, strength: m.strength,
      dose: m.dose, frequency: m.frequency, duration_days: m.duration_days, start_date: m.start_date, end_date: m.end_date,
      status: "active", prescriber_id: providerId, source_document_id: documentId, confidence: m.confidence, verified_by: args.verifiedBy ?? null,
    }))), "medications");

  if (n.labs.length)
    await check(sb.from("lab_results").insert(n.labs.map((l) => ({
      patient_id: patientId, test_name: l.test_name, test_key: l.test_key, loinc: l.loinc, category: l.category, value: l.value,
      value_text: l.value_text, unit: l.unit, ref_low: l.ref_low, ref_high: l.ref_high, flag: l.flag, taken_at: l.taken_at,
      provider_id: providerId, source_document_id: documentId, confidence: l.confidence,
    }))), "lab_results");

  if (n.conditions.length)
    await check(sb.from("conditions").insert(n.conditions.map((c) => ({
      patient_id: patientId, name: c.name, onset_date: c.onset_date, provider_id: providerId, source_document_id: documentId, confidence: c.confidence,
      status: /resolved|history of|h\/o|past/i.test(c.name) ? "resolved" : "active",
    }))), "conditions");

  if (n.allergies.length) {
    const existing = (await check(sb.from("allergies").select("substance").eq("patient_id", patientId), "allergies")) as { substance: string }[];
    const have = new Set(existing.map((a) => a.substance.toLowerCase()));
    const fresh = n.allergies.filter((a) => !have.has(a.substance.toLowerCase()));
    if (fresh.length)
      await check(sb.from("allergies").insert(fresh.map((a) => ({ patient_id: patientId, substance: a.substance, allergen_class: a.allergen_class, reaction: a.reaction, severity: a.severity, source_document_id: documentId }))), "allergies insert");
  }
  return { providerId, encounterId: (enc as { id: string }).id };
}
