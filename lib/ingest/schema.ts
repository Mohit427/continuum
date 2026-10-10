import { z } from "zod";

// Plain number (structured-output JSON Schema keeps constraints minimal); clamped to 0..1 after parsing.
const conf = z.number().describe("confidence 0..1");

/** Shape Claude must return when reading a medical document. Every field carries a confidence. */
export const ExtractionSchema = z.object({
  doc_type: z.enum(["prescription", "lab_report", "discharge_summary", "imaging_report", "other"]),
  is_medical_document: z.boolean(),
  patient_name: z.string().nullable(),
  patient_name_confidence: conf,
  document_date: z.string().nullable().describe("YYYY-MM-DD"),
  document_date_confidence: conf,
  facility: z.string().nullable(),
  doctor_name: z.string().nullable(),
  doctor_specialty: z.string().nullable(),
  doctor_confidence: conf,
  complaints: z.array(z.string()),
  diagnoses: z.array(z.object({ name: z.string(), confidence: conf })),
  medications: z.array(
    z.object({
      name: z.string().describe("as written, brand or generic"),
      strength: z.string().nullable(),
      dose: z.string().nullable(),
      frequency: z.string().nullable(),
      duration_days: z.number().int().nullable(),
      instructions: z.string().nullable(),
      confidence: conf,
    }),
  ),
  labs: z.array(
    z.object({
      test: z.string(),
      value: z.number().nullable(),
      value_text: z.string().nullable(),
      unit: z.string().nullable(),
      ref_range: z.string().nullable(),
      confidence: conf,
    }),
  ),
  vitals: z.object({
    bp_systolic: z.number().nullable(),
    bp_diastolic: z.number().nullable(),
    pulse: z.number().nullable(),
    weight_kg: z.number().nullable(),
    spo2: z.number().nullable(),
  }),
  allergies: z.array(
    z.object({
      substance: z.string(),
      reaction: z.string().nullable(),
      severity: z.enum(["mild", "moderate", "severe", "life-threatening"]).nullable(),
    }),
  ),
  notes: z.string().nullable(),
  overall_confidence: conf,
});

export type Extraction = z.infer<typeof ExtractionSchema>;

const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));

/** Clamp every confidence to 0..1 (models occasionally answer 0–100). */
export function sanitizeExtraction(x: Extraction): Extraction {
  const c = (n: number) => clamp(n > 1 ? n / 100 : n);
  return {
    ...x,
    patient_name_confidence: c(x.patient_name_confidence),
    document_date_confidence: c(x.document_date_confidence),
    doctor_confidence: c(x.doctor_confidence),
    overall_confidence: c(x.overall_confidence),
    diagnoses: x.diagnoses.map((d) => ({ ...d, confidence: c(d.confidence) })),
    medications: x.medications.map((m) => ({ ...m, confidence: c(m.confidence) })),
    labs: x.labs.map((l) => ({ ...l, confidence: c(l.confidence) })),
  };
}
