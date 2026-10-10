import { describe, expect, it } from "vitest";
import { matchDrug, nameSimilarity } from "../../kb/match";
import { matchLab } from "../../kb/labs";
import { normalizeExtraction, parseRange, toCanonical } from "../normalize";
import type { Extraction } from "../schema";

describe("drug matching", () => {
  it("maps Indian brands to generics", () => {
    expect(matchDrug("Tab. Amlong 10mg")?.drug.generic).toBe("amlodipine");
    expect(matchDrug("TELMA 40")?.drug.generic).toBe("telmisartan");
    expect(matchDrug("Thyronorm 50 mcg")?.drug.generic).toBe("levothyroxine");
    expect(matchDrug("Dolo 650")?.drug.generic).toBe("paracetamol");
  });
  it("tolerates handwriting / OCR misspellings", () => {
    const m = matchDrug("Amlodipin 5 mg");
    expect(m?.drug.generic).toBe("amlodipine");
    expect(m?.exact).toBe(false);
  });
  it("returns nothing for unknown words", () => {
    expect(matchDrug("Xylophonex 20mg")).toBeUndefined();
  });
});

describe("lab matching", () => {
  it("prefers the most specific alias", () => {
    expect(matchLab("HDL Cholesterol (Direct)")?.key).toBe("hdl");
    expect(matchLab("Glycosylated Haemoglobin (HbA1c)")?.key).toBe("hba1c");
    expect(matchLab("S. Creatinine")?.key).toBe("creatinine");
  });
});

describe("ranges & units", () => {
  it("parses common range formats", () => {
    expect(parseRange("4.0 - 5.6")).toEqual({ low: 4, high: 5.6 });
    expect(parseRange("<100")).toEqual({ low: null, high: 100 });
    expect(parseRange(">40")).toEqual({ low: 40, high: null });
  });
  it("converts SI units to canonical units", () => {
    expect(toCanonical("creatinine", 115, "µmol/L").value).toBeCloseTo(1.3, 1);
    expect(toCanonical("fbs", 7, "mmol/L").value).toBe(126);
    expect(toCanonical("hba1c", 64, "mmol/mol").value).toBeCloseTo(8.0, 1);
  });
});

describe("name matching", () => {
  it("accepts initials and minor spelling differences", () => {
    expect(nameSimilarity("Lakshmi R.", "Lakshmi Raghavan")).toBe(1);
    expect(nameSimilarity("Laxmi Raghavan", "Lakshmi Raghavan")).toBeGreaterThanOrEqual(0.5);
  });
  it("rejects a different person", () => {
    expect(nameSimilarity("Ramesh Kumar", "Lakshmi Raghavan")).toBeLessThan(0.5);
  });
});

const base: Extraction = {
  doc_type: "prescription", is_medical_document: true, patient_name: "Lakshmi", patient_name_confidence: 0.9,
  document_date: "2026-09-01", document_date_confidence: 0.95, facility: "Clinic", doctor_name: "Dr X", doctor_specialty: null,
  doctor_confidence: 0.9, complaints: [], diagnoses: [], medications: [], labs: [],
  vitals: { bp_systolic: 150, bp_diastolic: 95, pulse: null, weight_kg: null, spo2: null }, allergies: [], notes: null, overall_confidence: 0.9,
};

describe("normalizeExtraction", () => {
  it("computes end date from duration and flags unknown drugs", () => {
    const n = normalizeExtraction({ ...base, medications: [
      { name: "Augmentin", strength: "625 mg", dose: "1", frequency: "BD", duration_days: 5, instructions: null, confidence: 0.9 },
      { name: "Zorbitol", strength: null, dose: null, frequency: null, duration_days: null, instructions: null, confidence: 0.6 },
    ] }, { fallbackDate: "2026-10-10", today: "2026-10-10" });
    expect(n.meds[0].end_date).toBe("2026-09-06");
    expect(n.meds[0].drug_class).toBe("penicillin");
    expect(n.meds[1].matched).toBe(false);
    expect(n.issues.some((i) => i.field === "medications.1")).toBe(true);
  });
  it("turns BP into vitals with flags", () => {
    const n = normalizeExtraction(base, { fallbackDate: "2026-10-10", today: "2026-10-10" });
    expect(n.labs.find((l) => l.test_key === "sbp")?.flag).toBe("H");
  });
  it("falls back to upload date when the date is unreadable", () => {
    const n = normalizeExtraction({ ...base, document_date: null }, { fallbackDate: "2026-10-10", today: "2026-10-10" });
    expect(n.docDate).toBe("2026-10-10");
    expect(n.issues[0].field).toBe("document_date");
  });
});
