import type { Extraction } from "../ingest/schema";
import { normalizeExtraction, type Normalized } from "../ingest/normalize";
import type { Timeline } from "../engine/types";
import { addDays } from "../engine/util";
import type { SeedDoc, SeedPatient, SeedProvider } from "./stories";

export function seedDocToExtraction(p: SeedPatient, d: SeedDoc, today: string): Extraction {
  const prov = p.providers.find((x) => x.key === d.provider)!;
  const isLab = d.type === "lab_report";
  const [sys, dia] = d.vitals?.bp?.split("/").map(Number) ?? [null, null];
  return {
    doc_type: d.type,
    is_medical_document: true,
    patient_name: d.nameOnDoc ?? p.name,
    patient_name_confidence: 0.98,
    document_date: addDays(today, -d.daysAgo),
    document_date_confidence: 0.97,
    facility: `${prov.facility}, ${prov.city}`,
    doctor_name: isLab ? null : prov.name,
    doctor_specialty: isLab ? null : prov.specialty,
    doctor_confidence: 0.95,
    complaints: d.complaints ?? [],
    diagnoses: (d.diagnoses ?? []).map((name) => ({ name, confidence: 0.93 })),
    medications: (d.meds ?? []).map((m) => ({
      name: m.brand, strength: m.strength ?? null, dose: m.dose, frequency: m.frequency,
      duration_days: m.durationDays ?? null, instructions: m.instructions ?? null, confidence: 0.94,
    })),
    labs: (d.labs ?? []).map((l) => ({ test: l.test, value: l.value, value_text: null, unit: l.unit, ref_range: l.ref ?? null, confidence: 0.97 })),
    vitals: { bp_systolic: sys ?? null, bp_diastolic: dia ?? null, pulse: d.vitals?.pulse ?? null, weight_kg: d.vitals?.weight ?? null, spo2: d.vitals?.spo2 ?? null },
    allergies: d.allergies ?? [],
    notes: d.notes ?? null,
    overall_confidence: 0.95,
  };
}

export const providerDisplayName = (prov: SeedProvider, isLab: boolean) => (isLab ? prov.facility : prov.name);

/** Build an in-memory engine timeline straight from a seed story (used by tests). */
export function storyToTimeline(p: SeedPatient, today: string, extraDocs: SeedDoc[] = []): { timeline: Timeline; normalized: Map<string, Normalized> } {
  const t: Timeline = { meds: [], labs: [], conditions: [], encounters: [], allergies: [], providers: {}, today };
  const normalized = new Map<string, Normalized>();
  for (const prov of p.providers) t.providers[prov.key] = { name: prov.name, specialty: prov.specialty };
  for (const d of [...p.docs, ...extraDocs]) {
    const n = normalizeExtraction(seedDocToExtraction(p, d, today), { fallbackDate: today, today });
    normalized.set(d.key, n);
    n.meds.forEach((m, i) =>
      t.meds.push({ id: `${d.key}-m${i}`, rawName: m.raw_name, generic: m.generic, drugClass: m.drug_class, start: m.start_date, end: m.end_date, status: "active", prescriberId: d.provider, documentId: d.key, dose: m.strength }),
    );
    n.labs.forEach((l, i) =>
      l.test_key && t.labs.push({ id: `${d.key}-l${i}`, testKey: l.test_key, testName: l.test_name, value: l.value, unit: l.unit, refHigh: l.ref_high, takenAt: l.taken_at, providerId: d.provider, documentId: d.key }),
    );
    n.conditions.forEach((c, i) => t.conditions.push({ id: `${d.key}-c${i}`, name: c.name, onset: c.onset_date, status: "active", providerId: d.provider, documentId: d.key }));
    if (n.complaints.length) t.encounters.push({ id: `${d.key}-e`, date: n.docDate, complaints: n.complaints, providerId: d.provider, documentId: d.key });
    n.allergies.forEach((a, i) => t.allergies.push({ id: `${d.key}-a${i}`, substance: a.substance, allergenClass: a.allergen_class, documentId: d.key }));
  }
  return { timeline: t, normalized };
}
