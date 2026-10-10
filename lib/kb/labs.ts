// Canonical lab tests / vitals: LOINC mapping, aliases for matching extracted names,
// adult reference ranges, minimum re-test intervals and typical Indian lab price.
//
// Re-test intervals are outpatient defaults for a stable chronic patient, based on the
// RCPath/ACB "National Minimum Retesting Intervals in Pathology" (2021). Clinical judgement
// always overrides; the app only surfaces the previous result.

export interface LabTest {
  key: string;
  name: string;
  loinc: string;
  unit: string;
  aliases: string[];
  low?: number;
  high?: number;
  category: "lab" | "vital";
  /** Days within which a repeat is usually unnecessary for a stable patient. */
  retestDays?: number;
  priceInr?: number;
  /** Lower is better (used for trend wording). */
  lowerIsBetter?: boolean;
  panel?: string;
}

export const LABS: LabTest[] = [
  { key: "hba1c", name: "HbA1c", loinc: "4548-4", unit: "%", aliases: ["hba1c", "glycated hemoglobin", "glycated haemoglobin", "glycosylated hemoglobin", "glycosylated haemoglobin", "a1c", "hb a1c"], low: 4, high: 5.6, category: "lab", retestDays: 90, priceInr: 450, lowerIsBetter: true, panel: "Diabetes" },
  { key: "fbs", name: "Fasting blood sugar", loinc: "1558-6", unit: "mg/dL", aliases: ["fbs", "fasting blood sugar", "fasting plasma glucose", "fpg", "glucose fasting", "blood sugar fasting", "fasting glucose"], low: 70, high: 100, category: "lab", retestDays: 7, priceInr: 100, lowerIsBetter: true, panel: "Diabetes" },
  { key: "ppbs", name: "Post-prandial blood sugar", loinc: "1521-4", unit: "mg/dL", aliases: ["ppbs", "post prandial blood sugar", "postprandial glucose", "pp blood sugar", "glucose pp", "ppbg", "2 hr post prandial"], low: 70, high: 140, category: "lab", retestDays: 7, priceInr: 100, lowerIsBetter: true, panel: "Diabetes" },
  { key: "creatinine", name: "Serum creatinine", loinc: "2160-0", unit: "mg/dL", aliases: ["creatinine", "serum creatinine", "s. creatinine", "s creatinine", "creat"], low: 0.5, high: 1.1, category: "lab", retestDays: 30, priceInr: 200, lowerIsBetter: true, panel: "Kidney" },
  { key: "egfr", name: "eGFR", loinc: "62238-1", unit: "mL/min/1.73m²", aliases: ["egfr", "estimated gfr", "gfr", "e-gfr"], low: 90, category: "lab", retestDays: 30, priceInr: 0, panel: "Kidney" },
  { key: "urea", name: "Blood urea", loinc: "3094-0", unit: "mg/dL", aliases: ["urea", "blood urea", "bun", "blood urea nitrogen", "serum urea"], low: 15, high: 40, category: "lab", retestDays: 30, priceInr: 150, lowerIsBetter: true, panel: "Kidney" },
  { key: "urine_acr", name: "Urine albumin/creatinine ratio", loinc: "9318-7", unit: "mg/g", aliases: ["uacr", "acr", "urine acr", "albumin creatinine ratio", "microalbumin", "urine microalbumin"], high: 30, category: "lab", retestDays: 90, priceInr: 500, lowerIsBetter: true, panel: "Kidney" },
  { key: "potassium", name: "Potassium", loinc: "2823-3", unit: "mmol/L", aliases: ["potassium", "k+", "serum potassium", "s. potassium", "k"], low: 3.5, high: 5.1, category: "lab", retestDays: 7, priceInr: 250, panel: "Electrolytes" },
  { key: "sodium", name: "Sodium", loinc: "2951-2", unit: "mmol/L", aliases: ["sodium", "na+", "serum sodium", "s. sodium", "na"], low: 135, high: 145, category: "lab", retestDays: 7, priceInr: 250, panel: "Electrolytes" },
  { key: "uric_acid", name: "Uric acid", loinc: "3084-1", unit: "mg/dL", aliases: ["uric acid", "serum uric acid", "s. uric acid", "urate"], low: 2.6, high: 6.0, category: "lab", retestDays: 90, priceInr: 250, lowerIsBetter: true, panel: "Kidney" },
  { key: "total_cholesterol", name: "Total cholesterol", loinc: "2093-3", unit: "mg/dL", aliases: ["total cholesterol", "cholesterol total", "s. cholesterol", "cholesterol", "tc"], high: 200, category: "lab", retestDays: 90, priceInr: 600, lowerIsBetter: true, panel: "Lipid profile" },
  { key: "ldl", name: "LDL cholesterol", loinc: "13457-7", unit: "mg/dL", aliases: ["ldl", "ldl cholesterol", "ldl-c", "ldl chol", "low density lipoprotein"], high: 100, category: "lab", retestDays: 90, priceInr: 600, lowerIsBetter: true, panel: "Lipid profile" },
  { key: "hdl", name: "HDL cholesterol", loinc: "2085-9", unit: "mg/dL", aliases: ["hdl", "hdl cholesterol", "hdl-c", "high density lipoprotein"], low: 40, category: "lab", retestDays: 90, priceInr: 600, panel: "Lipid profile" },
  { key: "triglycerides", name: "Triglycerides", loinc: "2571-8", unit: "mg/dL", aliases: ["triglycerides", "tg", "triglyceride", "s. triglycerides"], high: 150, category: "lab", retestDays: 90, priceInr: 600, lowerIsBetter: true, panel: "Lipid profile" },
  { key: "tsh", name: "TSH", loinc: "3016-3", unit: "mIU/L", aliases: ["tsh", "thyroid stimulating hormone", "s. tsh", "ultrasensitive tsh", "tsh (ultrasensitive)"], low: 0.4, high: 4.5, category: "lab", retestDays: 42, priceInr: 400, panel: "Thyroid" },
  { key: "ft4", name: "Free T4", loinc: "3024-7", unit: "ng/dL", aliases: ["ft4", "free t4", "free thyroxine", "f.t4"], low: 0.8, high: 1.8, category: "lab", retestDays: 42, priceInr: 400, panel: "Thyroid" },
  { key: "hemoglobin", name: "Haemoglobin", loinc: "718-7", unit: "g/dL", aliases: ["hemoglobin", "haemoglobin", "hb", "hgb"], low: 12, high: 16, category: "lab", retestDays: 30, priceInr: 300, panel: "CBC" },
  { key: "wbc", name: "Total WBC count", loinc: "6690-2", unit: "/µL", aliases: ["wbc", "total wbc", "tlc", "total leucocyte count", "total leukocyte count", "white blood cells"], low: 4000, high: 11000, category: "lab", retestDays: 30, priceInr: 300, panel: "CBC" },
  { key: "platelets", name: "Platelet count", loinc: "777-3", unit: "/µL", aliases: ["platelets", "platelet count", "plt"], low: 150000, high: 450000, category: "lab", retestDays: 30, priceInr: 300, panel: "CBC" },
  { key: "alt", name: "ALT (SGPT)", loinc: "1742-6", unit: "U/L", aliases: ["alt", "sgpt", "alanine aminotransferase", "alt (sgpt)", "sgpt (alt)"], high: 40, category: "lab", retestDays: 30, priceInr: 600, lowerIsBetter: true, panel: "Liver" },
  { key: "ast", name: "AST (SGOT)", loinc: "1920-8", unit: "U/L", aliases: ["ast", "sgot", "aspartate aminotransferase", "ast (sgot)", "sgot (ast)"], high: 40, category: "lab", retestDays: 30, priceInr: 600, lowerIsBetter: true, panel: "Liver" },
  { key: "bilirubin", name: "Total bilirubin", loinc: "1975-2", unit: "mg/dL", aliases: ["bilirubin", "total bilirubin", "s. bilirubin", "bilirubin total"], low: 0.3, high: 1.2, category: "lab", retestDays: 30, priceInr: 600, lowerIsBetter: true, panel: "Liver" },
  { key: "vitamin_b12", name: "Vitamin B12", loinc: "2132-9", unit: "pg/mL", aliases: ["vitamin b12", "b12", "cobalamin", "vit b12", "cyanocobalamin"], low: 200, high: 900, category: "lab", retestDays: 180, priceInr: 900, panel: "Vitamins" },
  { key: "vitamin_d", name: "Vitamin D (25-OH)", loinc: "1989-3", unit: "ng/mL", aliases: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d", "vit d", "vitamin d3", "25(oh)d"], low: 30, high: 100, category: "lab", retestDays: 90, priceInr: 1200, panel: "Vitamins" },
  { key: "inr", name: "INR", loinc: "6301-6", unit: "", aliases: ["inr", "pt/inr", "prothrombin time inr", "international normalized ratio"], low: 0.8, high: 1.2, category: "lab", retestDays: 3, priceInr: 300, panel: "Coagulation" },
  { key: "magnesium", name: "Magnesium", loinc: "19123-9", unit: "mg/dL", aliases: ["magnesium", "mg", "serum magnesium"], low: 1.7, high: 2.2, category: "lab", retestDays: 30, priceInr: 400, panel: "Electrolytes" },
  { key: "calcium", name: "Calcium", loinc: "17861-6", unit: "mg/dL", aliases: ["calcium", "serum calcium", "s. calcium", "ca"], low: 8.5, high: 10.5, category: "lab", retestDays: 30, priceInr: 250, panel: "Electrolytes" },
  // Vitals
  { key: "sbp", name: "Systolic BP", loinc: "8480-6", unit: "mmHg", aliases: ["systolic", "systolic bp", "sbp"], low: 90, high: 130, category: "vital", lowerIsBetter: true, panel: "Vitals" },
  { key: "dbp", name: "Diastolic BP", loinc: "8462-4", unit: "mmHg", aliases: ["diastolic", "diastolic bp", "dbp"], low: 60, high: 85, category: "vital", lowerIsBetter: true, panel: "Vitals" },
  { key: "pulse", name: "Pulse", loinc: "8867-4", unit: "bpm", aliases: ["pulse", "heart rate", "hr", "pr"], low: 60, high: 100, category: "vital", panel: "Vitals" },
  { key: "weight", name: "Weight", loinc: "29463-7", unit: "kg", aliases: ["weight", "wt", "body weight"], category: "vital", panel: "Vitals" },
  { key: "spo2", name: "SpO₂", loinc: "59408-5", unit: "%", aliases: ["spo2", "oxygen saturation", "sao2"], low: 95, high: 100, category: "vital", panel: "Vitals" },
  { key: "pefr", name: "Peak expiratory flow", loinc: "19935-6", unit: "L/min", aliases: ["pefr", "peak flow", "peak expiratory flow"], category: "vital", panel: "Respiratory" },
];

export const LAB_BY_KEY: Record<string, LabTest> = Object.fromEntries(LABS.map((l) => [l.key, l]));

export function matchLab(name: string): LabTest | undefined {
  const n = name.toLowerCase().replace(/[^a-z0-9+()\/\-. ]/g, " ").replace(/\s+/g, " ").trim();
  for (const l of LABS) if (l.aliases.includes(n) || l.key === n) return l;
  // Fuzzy: prefer the longest alias contained in the name, so "HDL cholesterol (direct)"
  // matches HDL rather than total cholesterol.
  let best: { lab: LabTest; len: number } | undefined;
  for (const l of LABS)
    for (const a of l.aliases)
      if (a.length > 3 && n.includes(a) && (!best || a.length > best.len)) best = { lab: l, len: a.length };
  return best?.lab;
}

// ─────────────────────────── Specialty lenses ───────────────────────────
// Data minimisation: a lens narrows labs, conditions and visits to what a specialty needs.
// Current medications and allergies are ALWAYS shared in full (medication safety).

export interface Lens {
  key: string;
  label: string;
  tests: string[] | "all";
  conditionTerms: string[] | "all";
}

export const LENSES: Lens[] = [
  { key: "general", label: "General physician (full record)", tests: "all", conditionTerms: "all" },
  { key: "cardiology", label: "Cardiology", tests: ["sbp", "dbp", "pulse", "total_cholesterol", "ldl", "hdl", "triglycerides", "creatinine", "egfr", "potassium", "sodium", "hba1c", "fbs", "inr", "tsh"], conditionTerms: ["hypertension", "heart", "cardiac", "coronary", "angina", "dyslipid", "cholesterol", "diabetes", "edema", "oedema", "arrhythm", "atrial", "stroke"] },
  { key: "endocrinology", label: "Endocrinology / Diabetes", tests: ["hba1c", "fbs", "ppbs", "tsh", "ft4", "total_cholesterol", "ldl", "hdl", "triglycerides", "creatinine", "egfr", "urine_acr", "vitamin_b12", "vitamin_d", "weight", "calcium"], conditionTerms: ["diabetes", "thyroid", "hypothyroid", "hyperthyroid", "obesity", "dyslipid", "neuropathy", "vitamin"] },
  { key: "nephrology", label: "Nephrology", tests: ["creatinine", "egfr", "urea", "urine_acr", "potassium", "sodium", "uric_acid", "hemoglobin", "calcium", "sbp", "dbp", "hba1c"], conditionTerms: ["kidney", "renal", "ckd", "nephro", "hypertension", "diabetes", "gout", "edema", "oedema"] },
  { key: "pulmonology", label: "Pulmonology", tests: ["spo2", "pefr", "hemoglobin", "wbc", "pulse"], conditionTerms: ["asthma", "copd", "bronch", "pneumon", "cough", "wheeze", "lung", "tb", "tuberculosis", "rhinitis"] },
];

export const LENS_BY_KEY: Record<string, Lens> = Object.fromEntries(LENSES.map((l) => [l.key, l]));
