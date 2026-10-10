import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../auth";
import type { Timeline } from "../engine/types";
import { LENS_BY_KEY } from "../kb/labs";

export interface ProviderRow { id: string; name: string; specialty: string | null; facility: string | null }
export interface DocumentRow {
  id: string; patient_id: string; storage_path: string; file_name: string | null; mime: string; doc_type: string | null; status: string;
  extracted_json: unknown; overall_confidence: number | null; name_on_doc: string | null; name_mismatch: boolean; duplicate_of: string | null;
  doc_date: string | null; provider_id: string | null; facility: string | null; error: string | null; source: string; created_at: string; confirmed_at: string | null;
}
export interface EncounterRow { id: string; date: string; provider_id: string | null; document_id: string | null; kind: string; complaints: string[]; notes: string | null }
export interface ConditionRow { id: string; name: string; icd10: string | null; status: "active" | "resolved"; onset_date: string | null; provider_id: string | null; source_document_id: string | null; confidence: number | null }
export interface MedicationRow {
  id: string; raw_name: string; generic: string | null; drug_class: string | null; atc: string | null; strength: string | null; dose: string | null; frequency: string | null;
  duration_days: number | null; start_date: string | null; end_date: string | null; status: "active" | "stopped"; prescriber_id: string | null; source_document_id: string | null; confidence: number | null;
}
export interface AllergyRow { id: string; substance: string; allergen_class: string | null; reaction: string | null; severity: string; source_document_id: string | null }
export interface LabRow {
  id: string; test_name: string; test_key: string | null; loinc: string | null; category: "lab" | "vital"; value: number | null; value_text: string | null; unit: string | null;
  ref_low: number | null; ref_high: number | null; flag: string | null; taken_at: string; provider_id: string | null; source_document_id: string | null; confidence: number | null;
}
export interface AlertRow {
  id: string; type: string; severity: "info" | "review" | "high"; title: string; body: string; evidence: import("../engine/types").Evidence[];
  cross_provider: boolean; rule_id: string | null; ref: string | null; fingerprint: string; status: string; created_at: string; meta?: Record<string, unknown> | null;
}

export interface PatientRecord {
  profile: Profile;
  providers: ProviderRow[];
  documents: DocumentRow[];
  encounters: EncounterRow[];
  conditions: ConditionRow[];
  medications: MedicationRow[];
  allergies: AllergyRow[];
  labs: LabRow[];
  alerts: AlertRow[];
}

export const CATEGORIES = ["conditions", "medications", "allergies", "labs", "encounters", "documents", "alerts"] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = {
  conditions: "Diagnoses & conditions", medications: "Medicines", allergies: "Allergies", labs: "Lab results & vitals",
  encounters: "Visits & complaints", documents: "Original documents", alerts: "Safety alerts",
};

export interface Scope { categories: (Category | "all")[]; lens?: string | null; date_from?: string | null }

/** Load a patient's full record with the given client (user client â†’ RLS applies; admin â†’ caller must authorize first). */
export async function loadRecord(sb: SupabaseClient, patientId: string, profile?: Profile): Promise<PatientRecord> {
  const q = <T>(table: string, order: string, asc = false) =>
    sb.from(table).select("*").eq("patient_id", patientId).order(order, { ascending: asc }).then(({ data, error }) => {
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as T[];
    });
  const [prof, providers, documents, encounters, conditions, medications, allergies, labs, alerts] = await Promise.all([
    profile ? Promise.resolve(profile) : sb.from("profiles").select("*").eq("id", patientId).single<Profile>().then(({ data }) => data!),
    q<ProviderRow>("providers", "name", true),
    q<DocumentRow>("documents", "created_at"),
    q<EncounterRow>("encounters", "date"),
    q<ConditionRow>("conditions", "onset_date"),
    q<MedicationRow>("medications", "start_date"),
    q<AllergyRow>("allergies", "created_at"),
    q<LabRow>("lab_results", "taken_at"),
    q<AlertRow>("alerts", "created_at"),
  ]);
  return { profile: prof, providers, documents, encounters, conditions, medications, allergies, labs, alerts };
}

/** Data minimisation: apply a grant's categories, specialty lens and date window. */
export function applyScope(r: PatientRecord, scope: Scope): PatientRecord {
  const all = scope.categories.includes("all");
  const has = (c: Category) => all || scope.categories.includes(c);
  const lens = scope.lens ? LENS_BY_KEY[scope.lens] : undefined;
  const from = scope.date_from ? Date.parse(scope.date_from) : null;
  const inDate = (d: string | null) => from === null || !d || Date.parse(d) >= from;
  const condOk = (name: string) => !lens || lens.conditionTerms === "all" || lens.conditionTerms.some((t) => name.toLowerCase().includes(t));
  const testOk = (key: string | null) => !lens || lens.tests === "all" || (!!key && lens.tests.includes(key));

  const conditions = has("conditions") ? r.conditions.filter((c) => condOk(c.name) && inDate(c.onset_date)) : [];
  const encounters = has("encounters") ? r.encounters.filter((e) => inDate(e.date)) : [];
  const labs = has("labs") ? r.labs.filter((l) => testOk(l.test_key) && inDate(l.taken_at)) : [];
  // Medicines and allergies are never narrowed by lens: medication safety needs the full list.
  const medications = has("medications") ? r.medications : [];
  const allergies = r.allergies; // always shared with any grantee (safety-critical)
  const documents = has("documents") ? r.documents.filter((d) => d.status === "confirmed" && inDate(d.doc_date)) : [];
  const alerts = has("alerts") ? r.alerts.filter((a) => a.status === "open" || a.status === "acknowledged") : [];
  return { ...r, conditions, encounters, labs, medications, allergies, documents, alerts };
}

export function toTimeline(r: Pick<PatientRecord, "providers" | "medications" | "labs" | "conditions" | "encounters" | "allergies">, today = new Date().toISOString().slice(0, 10)): Timeline {
  return {
    today,
    providers: Object.fromEntries(r.providers.map((p) => [p.id, { name: p.name, specialty: p.specialty }])),
    meds: r.medications.filter((m) => m.start_date).map((m) => ({
      id: m.id, rawName: m.raw_name, generic: m.generic, drugClass: m.drug_class, start: m.start_date!, end: m.end_date,
      status: m.status, prescriberId: m.prescriber_id, documentId: m.source_document_id, dose: m.strength,
    })),
    labs: r.labs.filter((l) => l.test_key).map((l) => ({
      id: l.id, testKey: l.test_key!, testName: l.test_name, value: l.value === null ? null : Number(l.value), unit: l.unit,
      refHigh: l.ref_high === null ? null : Number(l.ref_high), takenAt: l.taken_at, providerId: l.provider_id, documentId: l.source_document_id,
    })),
    conditions: r.conditions.map((c) => ({ id: c.id, name: c.name, onset: c.onset_date, status: c.status, providerId: c.provider_id, documentId: c.source_document_id })),
    encounters: r.encounters.map((e) => ({ id: e.id, date: e.date, complaints: e.complaints ?? [], providerId: e.provider_id, documentId: e.document_id })),
    allergies: r.allergies.map((a) => ({ id: a.id, substance: a.substance, allergenClass: a.allergen_class, documentId: a.source_document_id })),
  };
}
