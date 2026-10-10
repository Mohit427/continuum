import type { Extraction } from "./schema";
import { matchDrug } from "../kb/match";
import { LAB_BY_KEY, matchLab } from "../kb/labs";
import { ALLERGY_GROUPS } from "../kb/rules";
import { addDays } from "../engine/util";

export const LOW_CONFIDENCE = 0.8;

export interface MedDraft {
  raw_name: string; generic: string | null; drug_class: string | null; atc: string | null;
  strength: string | null; dose: string | null; frequency: string | null; duration_days: number | null;
  start_date: string; end_date: string | null; confidence: number; matched: boolean; fuzzy: boolean;
}
export interface LabDraft {
  test_name: string; test_key: string | null; loinc: string | null; category: "lab" | "vital";
  value: number | null; value_text: string | null; unit: string | null; ref_low: number | null; ref_high: number | null;
  flag: "H" | "L" | "N" | null; taken_at: string; confidence: number; converted?: string;
}
export interface ConditionDraft { name: string; onset_date: string; confidence: number }
export interface AllergyDraft { substance: string; allergen_class: string | null; reaction: string | null; severity: string }

export interface Issue { field: string; message: string; level: "warn" | "info" }

export interface Normalized {
  docDate: string;
  provider: { name: string; specialty: string | null; facility: string | null } | null;
  meds: MedDraft[];
  labs: LabDraft[];
  conditions: ConditionDraft[];
  allergies: AllergyDraft[];
  complaints: string[];
  notes: string | null;
  issues: Issue[];
}

export function parseRange(r: string | null | undefined): { low: number | null; high: number | null } {
  if (!r) return { low: null, high: null };
  const s = r.replace(/,/g, "").trim();
  let m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) return { low: Number(m[1]), high: Number(m[2]) };
  m = s.match(/^(?:<|≤|<=|up to|upto)\s*(\d+(?:\.\d+)?)/i);
  if (m) return { low: null, high: Number(m[1]) };
  m = s.match(/^(?:>|≥|>=)\s*(\d+(?:\.\d+)?)/i);
  if (m) return { low: Number(m[1]), high: null };
  return { low: null, high: null };
}

/** Convert common SI units to the canonical unit used for trends and rules. */
export function toCanonical(key: string, value: number, unit: string | null): { value: number; note?: string } {
  const u = (unit ?? "").toLowerCase().replace(/\s/g, "");
  const r = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  if (key === "creatinine" && (u.includes("µmol") || u.includes("umol")))
    return { value: r(value / 88.4), note: `converted from ${value} µmol/L` };
  if ((key === "fbs" || key === "ppbs") && u.includes("mmol"))
    return { value: r(value * 18, 0), note: `converted from ${value} mmol/L` };
  if ((key === "total_cholesterol" || key === "ldl" || key === "hdl") && u.includes("mmol"))
    return { value: r(value * 38.67, 0), note: `converted from ${value} mmol/L` };
  if (key === "triglycerides" && u.includes("mmol")) return { value: r(value * 88.57, 0), note: `converted from ${value} mmol/L` };
  if (key === "hba1c" && u.includes("mmol/mol")) return { value: r(0.0915 * value + 2.15, 1), note: `converted from ${value} mmol/mol` };
  if (key === "urea" && u.includes("mmol")) return { value: r(value * 6.006, 0), note: `converted from ${value} mmol/L` };
  return { value };
}

const isoOk = (d: string | null | undefined) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

/** Extraction (from Claude or the review form) → typed row drafts + review issues. */
export function normalizeExtraction(x: Extraction, opts: { fallbackDate: string; today: string }): Normalized {
  const issues: Issue[] = [];
  let docDate = x.document_date;
  if (!isoOk(docDate)) {
    issues.push({ field: "document_date", message: "Document date could not be read. Using upload date; please correct it.", level: "warn" });
    docDate = opts.fallbackDate;
  } else if (Date.parse(docDate!) > Date.parse(opts.today) + 86_400_000) {
    issues.push({ field: "document_date", message: `Date ${docDate} is in the future. Please check.`, level: "warn" });
  }
  if (x.document_date_confidence < LOW_CONFIDENCE) issues.push({ field: "document_date", message: "Low confidence in the document date.", level: "warn" });
  if (!x.is_medical_document) issues.push({ field: "doc_type", message: "This does not look like a medical document.", level: "warn" });

  const meds: MedDraft[] = x.medications.map((m, i) => {
    const hit = matchDrug(`${m.name}`);
    if (!hit) issues.push({ field: `medications.${i}`, message: `“${m.name}” is not in the drug dictionary. Please confirm the name.`, level: "warn" });
    else if (!hit.exact) issues.push({ field: `medications.${i}`, message: `“${m.name}” read as ${hit.drug.generic} (fuzzy match). Please confirm.`, level: "warn" });
    if (m.confidence < LOW_CONFIDENCE) issues.push({ field: `medications.${i}`, message: `Low confidence reading “${m.name}”.`, level: "warn" });
    return {
      raw_name: [m.name, m.strength].filter(Boolean).join(" "),
      generic: hit?.drug.generic ?? null,
      drug_class: hit?.drug.class ?? null,
      atc: hit?.drug.atc ?? null,
      strength: m.strength, dose: m.dose, frequency: m.frequency,
      duration_days: m.duration_days,
      start_date: docDate!,
      end_date: m.duration_days ? addDays(docDate!, m.duration_days) : null,
      confidence: Math.min(m.confidence, hit ? hit.score : 0.5),
      matched: !!hit, fuzzy: !!hit && !hit.exact,
    };
  });

  const labs: LabDraft[] = [];
  x.labs.forEach((l, i) => {
    const def = matchLab(l.test);
    const range = parseRange(l.ref_range);
    let value = l.value;
    let converted: string | undefined;
    let unit = l.unit;
    if (def && value !== null) {
      const c = toCanonical(def.key, value, l.unit);
      if (c.note) { value = c.value; converted = c.note; unit = def.unit; }
    }
    const low = converted ? def?.low ?? null : range.low ?? def?.low ?? null;
    const high = converted ? def?.high ?? null : range.high ?? def?.high ?? null;
    const flag = value === null ? null : high !== null && value > high ? "H" : low !== null && value < low ? "L" : "N";
    if (!def) issues.push({ field: `labs.${i}`, message: `Test “${l.test}” is not mapped to a standard code; it will be stored but not trended.`, level: "info" });
    if (l.confidence < LOW_CONFIDENCE) issues.push({ field: `labs.${i}`, message: `Low confidence reading ${l.test}.`, level: "warn" });
    if (converted) issues.push({ field: `labs.${i}`, message: `${def!.name} ${converted} to ${value} ${def!.unit}.`, level: "info" });
    labs.push({
      test_name: l.test, test_key: def?.key ?? null, loinc: def?.loinc ?? null, category: def?.category ?? "lab",
      value, value_text: l.value_text, unit: unit ?? def?.unit ?? null, ref_low: low, ref_high: high, flag,
      taken_at: docDate!, confidence: l.confidence, converted,
    });
  });

  const v = x.vitals;
  const vital = (key: string, value: number | null) => {
    if (value === null || value === undefined) return;
    const def = LAB_BY_KEY[key];
    const flag = def.high !== undefined && value > def.high ? "H" : def.low !== undefined && value < def.low ? "L" : "N";
    labs.push({ test_name: def.name, test_key: key, loinc: def.loinc, category: "vital", value, value_text: null, unit: def.unit, ref_low: def.low ?? null, ref_high: def.high ?? null, flag, taken_at: docDate!, confidence: 0.95 });
  };
  vital("sbp", v.bp_systolic); vital("dbp", v.bp_diastolic); vital("pulse", v.pulse); vital("weight", v.weight_kg); vital("spo2", v.spo2);

  const conditions = x.diagnoses.map((d) => ({ name: d.name, onset_date: docDate!, confidence: d.confidence }));
  const allergies = x.allergies.map((a) => {
    const s = a.substance.toLowerCase();
    const g = ALLERGY_GROUPS.find((gr) => gr.terms.some((t) => s.includes(t)));
    return { substance: a.substance, allergen_class: g?.group ?? null, reaction: a.reaction, severity: a.severity ?? "moderate" };
  });

  if (x.overall_confidence < LOW_CONFIDENCE) issues.push({ field: "document", message: "Overall extraction confidence is low. Please review every field.", level: "warn" });

  return {
    docDate: docDate!,
    provider: x.doctor_name || x.facility ? { name: x.doctor_name || x.facility!, specialty: x.doctor_specialty, facility: x.facility } : null,
    meds, labs, conditions, allergies, complaints: x.complaints, notes: x.notes, issues,
  };
}
