import type { DrugClass } from "./drugs";

// ─────────────────────────── Prescribing cascades ───────────────────────────
// Drug A's adverse effect is misread as a new condition and treated with drug B,
// often by a different clinician who cannot see drug A.

export interface CascadeRule {
  id: string;
  index: DrugClass[];
  /** The cascade is "closed" when one of these appears after the index drug started. */
  marker: { classes?: DrugClass[]; terms?: string[] };
  /** Days after index start in which the marker counts. */
  window: [number, number];
  effect: string;
  note: string;
  ref: string;
}

export const CASCADES: CascadeRule[] = [
  {
    id: "ccb-edema-diuretic",
    index: ["ccb_dhp"],
    marker: { classes: ["loop_diuretic"], terms: ["edema", "oedema", "ankle swelling", "pedal swelling", "swollen feet", "swollen ankles", "swelling of ankles", "swelling of both ankles", "swelling of feet", "leg swelling"] },
    window: [7, 365],
    effect: "ankle / leg swelling",
    note: "Dihydropyridine calcium-channel blockers commonly cause dose-related ankle oedema that does not respond well to diuretics. A loop diuretic started afterwards may be treating a drug side effect.",
    ref: "Savage RD et al. JAMA Intern Med 2020;180(5):643–651",
  },
  {
    id: "acei-cough-antitussive",
    index: ["ace_inhibitor"],
    marker: { classes: ["cough_suppressant", "antihistamine"], terms: ["dry cough", "persistent cough", "cough"] },
    window: [3, 365],
    effect: "persistent dry cough",
    note: "ACE inhibitors cause a dry cough in a meaningful share of patients. Treating it with cough medicine, or investigating it, without linking it to the ACE inhibitor is a recognised cascade.",
    ref: "Vegter S, de Jong-van den Berg LTW. Br J Clin Pharmacol 2010;69(2):200–203",
  },
  {
    id: "thiazide-gout",
    index: ["thiazide_diuretic"],
    marker: { classes: ["urate_lowering", "gout_acute"], terms: ["gout", "hyperuricemia", "hyperuricaemia", "raised uric acid"] },
    window: [14, 730],
    effect: "raised uric acid / gout",
    note: "Thiazide diuretics raise serum urate. New gout treatment after a thiazide was started may reflect a drug effect.",
    ref: "Gurwitz JH et al. J Clin Epidemiol 1997;50(8):953–959",
  },
  {
    id: "nsaid-hypertension",
    index: ["nsaid"],
    marker: {
      classes: ["ccb_dhp", "ace_inhibitor", "arb", "beta_blocker", "thiazide_diuretic"],
      terms: ["hypertension", "high blood pressure", "raised bp"],
    },
    window: [7, 180],
    effect: "raised blood pressure",
    note: "NSAIDs raise blood pressure and blunt antihypertensives. A new or intensified BP medicine shortly after an NSAID may be treating the NSAID's effect.",
    ref: "Gurwitz JH et al. JAMA 1994;272(10):781–786",
  },
  {
    id: "antidopaminergic-parkinsonism",
    index: ["antidopaminergic"],
    marker: { classes: ["antiparkinson"], terms: ["tremor", "parkinsonism", "rigidity"] },
    window: [7, 365],
    effect: "drug-induced parkinsonism",
    note: "Metoclopramide and prochlorperazine can cause parkinsonism; starting levodopa afterwards is a classic cascade.",
    ref: "Avorn J et al. JAMA 1995;274(22):1780–1782",
  },
  {
    id: "chei-incontinence",
    index: ["cholinesterase_inhibitor"],
    marker: { classes: ["bladder_antimuscarinic"], terms: ["urinary incontinence", "urge incontinence"] },
    window: [7, 365],
    effect: "urinary incontinence",
    note: "Cholinesterase inhibitors can cause incontinence; adding a bladder antimuscarinic opposes the dementia drug.",
    ref: "Gill SS et al. Arch Intern Med 2005;165(7):808–813",
  },
  {
    id: "steroid-hyperglycemia",
    index: ["corticosteroid_systemic"],
    marker: {
      classes: ["biguanide", "sulfonylurea", "dpp4_inhibitor", "sglt2_inhibitor", "insulin"],
      terms: ["hyperglycemia", "hyperglycaemia", "high sugar", "steroid induced diabetes"],
    },
    window: [3, 120],
    effect: "raised blood sugar",
    note: "Systemic corticosteroids raise blood glucose. A new or escalated diabetes medicine during a steroid course may be steroid-driven.",
    ref: "Product labelling (prednisolone); Endocrine Society guidance on steroid hyperglycaemia",
  },
  {
    id: "amiodarone-hypothyroid",
    index: ["antiarrhythmic_amiodarone"],
    marker: { classes: ["thyroid_hormone"], terms: ["hypothyroidism"] },
    window: [30, 730],
    effect: "drug-induced hypothyroidism",
    note: "Amiodarone contains iodine and frequently causes thyroid dysfunction; new levothyroxine may be treating a drug effect.",
    ref: "Product labelling (amiodarone): thyroid abnormalities",
  },
  {
    id: "gabapentinoid-edema-diuretic",
    index: ["gabapentinoid"],
    marker: { classes: ["loop_diuretic"], terms: ["edema", "oedema", "ankle swelling", "pedal swelling"] },
    window: [7, 365],
    effect: "peripheral oedema",
    note: "Pregabalin and gabapentin cause peripheral oedema; a diuretic started afterwards may be treating the side effect.",
    ref: "Product labelling (pregabalin): peripheral oedema",
  },
  {
    id: "metformin-b12-neuropathy",
    index: ["biguanide"],
    marker: { classes: ["gabapentinoid"], terms: ["neuropathy", "tingling", "numbness", "burning feet"] },
    window: [365, 3650],
    effect: "B12 deficiency presenting as neuropathy",
    note: "Long-term metformin lowers vitamin B12, which can present as neuropathy. Check B12 before attributing symptoms to diabetes alone.",
    ref: "de Jager J et al. BMJ 2010;340:c2181",
  },
  {
    id: "ics-thrush-antifungal",
    index: ["inhaled_corticosteroid", "laba_ics"],
    marker: { classes: ["azole_antifungal"], terms: ["oral thrush", "oral candidiasis", "white patches in mouth"] },
    window: [7, 365],
    effect: "oral thrush",
    note: "Inhaled steroids cause oral candidiasis, usually preventable by rinsing after use or using a spacer. A systemic antifungal may be avoidable.",
    ref: "GINA 2024 report: inhaled corticosteroid side effects",
  },
  {
    id: "nonselective-bb-bronchospasm",
    index: ["beta_blocker_nonselective"],
    marker: { classes: ["saba", "laba_ics", "inhaled_corticosteroid"], terms: ["wheeze", "bronchospasm", "breathlessness"] },
    window: [1, 180],
    effect: "bronchospasm",
    note: "Non-selective beta blockers such as propranolol can trigger bronchospasm. New inhalers afterwards may be treating a drug effect.",
    ref: "GINA 2024; product labelling (propranolol): contraindicated in asthma",
  },
];

// ─────────────────────────── Drug → lab effects ───────────────────────────

export interface DrugLabRule {
  id: string;
  classes: DrugClass[];
  test: string; // canonical test key from labs.ts
  direction: "up" | "down" | "either";
  /** Relative change vs. baseline (latest value before drug start). */
  pct?: number;
  /** Absolute thresholds that also trigger (value in canonical unit). */
  above?: number;
  below?: number;
  /** Multiple of upper reference limit. */
  xUln?: number;
  window: [number, number];
  title: string;
  note: string;
  ref: string;
}

export const DRUG_LAB: DrugLabRule[] = [
  {
    id: "nsaid-creatinine", classes: ["nsaid"], test: "creatinine", direction: "up", pct: 25, window: [3, 120],
    title: "Creatinine rose after an NSAID was started",
    note: "NSAIDs reduce kidney blood flow; the risk is higher with ACE inhibitors, ARBs, diuretics, diabetes or older age.",
    ref: "KDIGO Clinical Practice Guideline for Acute Kidney Injury 2012",
  },
  {
    id: "raas-creatinine", classes: ["ace_inhibitor", "arb"], test: "creatinine", direction: "up", pct: 30, window: [7, 90],
    title: "Creatinine rose >30% after starting an ACE inhibitor/ARB",
    note: "A creatinine rise of 30% or more after starting RAAS blockade warrants review of the dose and of other nephrotoxic drugs.",
    ref: "NICE NG203 (CKD) 2021: monitoring after starting ACE inhibitor/ARB",
  },
  {
    id: "raas-potassium", classes: ["ace_inhibitor", "arb", "potassium_sparing_diuretic"], test: "potassium", direction: "up", above: 5.5, window: [3, 365],
    title: "Potassium is high on a potassium-raising drug",
    note: "ACE inhibitors, ARBs and spironolactone raise potassium, especially in combination or with reduced kidney function.",
    ref: "NICE NG203; product labelling (spironolactone)",
  },
  {
    id: "loop-potassium", classes: ["loop_diuretic", "thiazide_diuretic"], test: "potassium", direction: "down", below: 3.5, window: [3, 365],
    title: "Potassium is low on a diuretic",
    note: "Loop and thiazide diuretics waste potassium; this matters more with digoxin or QT-prolonging drugs.",
    ref: "Product labelling (furosemide, hydrochlorothiazide)",
  },
  {
    id: "thiazide-sodium", classes: ["thiazide_diuretic"], test: "sodium", direction: "down", below: 133, window: [3, 365],
    title: "Sodium is low on a thiazide",
    note: "Thiazide-associated hyponatraemia is common in older adults and can cause confusion and falls.",
    ref: "Product labelling (hydrochlorothiazide, indapamide)",
  },
  {
    id: "thiazide-urate", classes: ["thiazide_diuretic"], test: "uric_acid", direction: "up", pct: 15, window: [14, 365],
    title: "Uric acid rose after a thiazide was started",
    note: "Thiazides reduce urate excretion.",
    ref: "Gurwitz JH et al. J Clin Epidemiol 1997",
  },
  {
    id: "steroid-glucose", classes: ["corticosteroid_systemic"], test: "hba1c", direction: "up", pct: 10, window: [14, 180],
    title: "HbA1c rose during/after a steroid course",
    note: "Systemic corticosteroids raise blood glucose; diabetes control may recover after the steroid stops.",
    ref: "Product labelling (prednisolone)",
  },
  {
    id: "steroid-fbs", classes: ["corticosteroid_systemic"], test: "fbs", direction: "up", pct: 20, window: [2, 90],
    title: "Fasting glucose rose after a steroid was started",
    note: "Steroid-induced hyperglycaemia.",
    ref: "Product labelling (prednisolone)",
  },
  {
    id: "amiodarone-tsh", classes: ["antiarrhythmic_amiodarone"], test: "tsh", direction: "either", pct: 50, window: [30, 730],
    title: "TSH changed markedly on amiodarone",
    note: "Amiodarone can cause both hypo- and hyperthyroidism.",
    ref: "Product labelling (amiodarone)",
  },
  {
    id: "statin-alt", classes: ["statin"], test: "alt", direction: "up", xUln: 3, window: [14, 365],
    title: "ALT above 3× upper limit on a statin",
    note: "Persistent transaminase rise above 3× the upper limit warrants statin review.",
    ref: "Product labelling (atorvastatin, rosuvastatin)",
  },
  {
    id: "metformin-b12", classes: ["biguanide"], test: "vitamin_b12", direction: "down", below: 200, window: [180, 3650],
    title: "Low vitamin B12 on long-term metformin",
    note: "Metformin reduces B12 absorption; deficiency can mimic diabetic neuropathy.",
    ref: "de Jager J et al. BMJ 2010;340:c2181",
  },
];

// ─────────────────────────── Drug–drug interactions ───────────────────────────

export interface InteractionRule {
  id: string;
  a: { classes?: DrugClass[]; generics?: string[] };
  b: { classes?: DrugClass[]; generics?: string[] };
  severity: "high" | "review" | "info";
  effect: string;
  note: string;
  ref: string;
}

const VKA = { classes: ["anticoagulant_vka"] as DrugClass[] };
const RAAS = { classes: ["ace_inhibitor", "arb"] as DrugClass[] };

export const INTERACTIONS: InteractionRule[] = [
  { id: "vka-nsaid", a: VKA, b: { classes: ["nsaid"] }, severity: "high", effect: "Major bleeding risk", note: "NSAIDs add antiplatelet effect and GI injury to anticoagulation.", ref: "BNF: warfarin interactions" },
  { id: "vka-antiplatelet", a: VKA, b: { classes: ["antiplatelet"] }, severity: "high", effect: "Major bleeding risk", note: "Combined anticoagulant + antiplatelet therapy should be deliberate and time-limited.", ref: "BNF: warfarin interactions" },
  { id: "vka-azole", a: VKA, b: { classes: ["azole_antifungal"] }, severity: "high", effect: "INR rises sharply", note: "Fluconazole inhibits warfarin metabolism (CYP2C9).", ref: "BNF: warfarin + fluconazole" },
  { id: "vka-macrolide", a: VKA, b: { generics: ["clarithromycin", "azithromycin"] }, severity: "review", effect: "INR may rise", note: "Macrolides can potentiate warfarin; monitor INR.", ref: "BNF: warfarin + macrolides" },
  { id: "vka-quinolone", a: VKA, b: { classes: ["fluoroquinolone"] }, severity: "review", effect: "INR may rise", note: "Fluoroquinolones can potentiate warfarin; monitor INR.", ref: "BNF: warfarin + quinolones" },
  { id: "vka-cotrimoxazole", a: VKA, b: { classes: ["sulfonamide_antibiotic"] }, severity: "high", effect: "INR rises sharply", note: "Cotrimoxazole markedly potentiates warfarin.", ref: "BNF: warfarin + co-trimoxazole" },
  { id: "vka-amiodarone", a: VKA, b: { classes: ["antiarrhythmic_amiodarone"] }, severity: "high", effect: "INR rises", note: "Amiodarone inhibits warfarin metabolism; dose reduction is usually needed.", ref: "BNF: warfarin + amiodarone" },
  { id: "raas-kspare", a: RAAS, b: { classes: ["potassium_sparing_diuretic"] }, severity: "high", effect: "Hyperkalaemia", note: "Monitor potassium and creatinine closely.", ref: "NICE NG203; RALES trial safety data" },
  { id: "raas-ksupp", a: RAAS, b: { classes: ["potassium_supplement"] }, severity: "review", effect: "Hyperkalaemia", note: "Potassium supplements with RAAS blockade need potassium monitoring.", ref: "BNF: ACE inhibitors + potassium" },
  { id: "acei-arb", a: { classes: ["ace_inhibitor"] }, b: { classes: ["arb"] }, severity: "high", effect: "Dual RAAS blockade: hyperkalaemia, AKI", note: "ACE inhibitor + ARB combination is generally not recommended.", ref: "ONTARGET trial; NICE NG136" },
  { id: "raas-nsaid", a: RAAS, b: { classes: ["nsaid"] }, severity: "review", effect: "Reduced kidney function, raised BP", note: "Becomes 'triple whammy' AKI risk if a diuretic is also taken.", ref: "Lapi F et al. BMJ 2013;346:e8525" },
  { id: "nsaid-steroid", a: { classes: ["nsaid"] }, b: { classes: ["corticosteroid_systemic"] }, severity: "review", effect: "GI bleeding", note: "Consider gastroprotection.", ref: "BNF: NSAIDs + corticosteroids" },
  { id: "nsaid-antiplatelet", a: { classes: ["nsaid"] }, b: { classes: ["antiplatelet"] }, severity: "review", effect: "GI bleeding", note: "Ibuprofen can also blunt aspirin's cardioprotective effect.", ref: "FDA 2006 ibuprofen–aspirin advisory" },
  { id: "nsaid-ssri", a: { classes: ["nsaid"] }, b: { classes: ["ssri"] }, severity: "review", effect: "GI bleeding", note: "SSRIs impair platelet serotonin uptake.", ref: "BNF: SSRIs + NSAIDs" },
  { id: "clopidogrel-omeprazole", a: { generics: ["clopidogrel"] }, b: { generics: ["omeprazole"] }, severity: "review", effect: "Reduced clopidogrel activation", note: "Omeprazole inhibits CYP2C19; pantoprazole is preferred.", ref: "FDA Drug Safety Communication 2009/2010" },
  { id: "statin-clarithro", a: { generics: ["atorvastatin"] }, b: { generics: ["clarithromycin"] }, severity: "high", effect: "Myopathy / rhabdomyolysis", note: "Clarithromycin strongly inhibits CYP3A4.", ref: "Product labelling (atorvastatin)" },
  { id: "digoxin-amiodarone", a: { classes: ["cardiac_glycoside"] }, b: { classes: ["antiarrhythmic_amiodarone"] }, severity: "high", effect: "Digoxin toxicity", note: "Amiodarone raises digoxin levels; dose usually halved.", ref: "Product labelling (amiodarone)" },
  { id: "digoxin-clarithro", a: { classes: ["cardiac_glycoside"] }, b: { generics: ["clarithromycin"] }, severity: "review", effect: "Digoxin toxicity", note: "Clarithromycin inhibits P-glycoprotein.", ref: "BNF: digoxin + macrolides" },
  { id: "digoxin-diuretic", a: { classes: ["cardiac_glycoside"] }, b: { classes: ["loop_diuretic", "thiazide_diuretic"] }, severity: "review", effect: "Low potassium increases digoxin toxicity", note: "Monitor potassium.", ref: "BNF: digoxin + diuretics" },
  { id: "theo-cipro", a: { classes: ["methylxanthine"] }, b: { generics: ["ciprofloxacin"] }, severity: "high", effect: "Theophylline toxicity (seizures, arrhythmia)", note: "Ciprofloxacin inhibits CYP1A2.", ref: "Product labelling (ciprofloxacin)" },
  { id: "theo-clarithro", a: { classes: ["methylxanthine"] }, b: { generics: ["clarithromycin"] }, severity: "review", effect: "Raised theophylline level", note: "Monitor levels.", ref: "BNF: theophylline + macrolides" },
  { id: "su-quinolone", a: { classes: ["sulfonylurea"] }, b: { classes: ["fluoroquinolone"] }, severity: "review", effect: "Severe hypo- or hyperglycaemia", note: "Fluoroquinolones cause dysglycaemia, especially with sulfonylureas.", ref: "FDA Drug Safety Communication 2018" },
  { id: "su-cotrimoxazole", a: { classes: ["sulfonylurea"] }, b: { classes: ["sulfonamide_antibiotic", "azole_antifungal"] }, severity: "review", effect: "Hypoglycaemia", note: "Inhibited sulfonylurea metabolism.", ref: "BNF: sulfonylureas" },
  { id: "hypo-bb", a: { classes: ["insulin", "sulfonylurea"] }, b: { classes: ["beta_blocker", "beta_blocker_nonselective"] }, severity: "info", effect: "Masked hypoglycaemia symptoms", note: "Beta blockers can hide tremor and palpitations of a low sugar.", ref: "BNF: beta-blockers + antidiabetics" },
  { id: "benzo-gaba", a: { classes: ["benzodiazepine"] }, b: { classes: ["gabapentinoid", "opioid_weak"] }, severity: "high", effect: "Sedation and respiratory depression", note: "Combined CNS depressants.", ref: "FDA Drug Safety Communication 2019 (gabapentinoids)" },
  { id: "ssri-tramadol", a: { classes: ["ssri"] }, b: { generics: ["tramadol"] }, severity: "high", effect: "Serotonin syndrome, seizures", note: "Avoid or monitor closely.", ref: "Product labelling (tramadol)" },
  { id: "mtx-cotrimoxazole", a: { classes: ["dmard_methotrexate"] }, b: { classes: ["sulfonamide_antibiotic"] }, severity: "high", effect: "Bone-marrow suppression", note: "Both are antifolates.", ref: "BNF: methotrexate + trimethoprim" },
  { id: "mtx-nsaid", a: { classes: ["dmard_methotrexate"] }, b: { classes: ["nsaid"] }, severity: "review", effect: "Methotrexate toxicity", note: "Reduced methotrexate clearance.", ref: "BNF: methotrexate + NSAIDs" },
  { id: "colchicine-clarithro", a: { classes: ["gout_acute"] }, b: { generics: ["clarithromycin"] }, severity: "high", effect: "Colchicine toxicity (can be fatal)", note: "Strong CYP3A4/P-gp inhibition.", ref: "FDA labelling (colchicine)" },
  { id: "qt-amiodarone-macrolide", a: { classes: ["antiarrhythmic_amiodarone"] }, b: { classes: ["macrolide", "fluoroquinolone"] }, severity: "high", effect: "QT prolongation / arrhythmia", note: "Additive QT effect.", ref: "CredibleMeds QT drug lists" },
  { id: "phenytoin-azole", a: { generics: ["phenytoin"] }, b: { classes: ["azole_antifungal"] }, severity: "review", effect: "Phenytoin toxicity", note: "Fluconazole raises phenytoin levels.", ref: "BNF: phenytoin + fluconazole" },
  { id: "levo-calcium", a: { classes: ["thyroid_hormone"] }, b: { classes: ["calcium_supplement", "ppi"] }, severity: "info", effect: "Reduced levothyroxine absorption", note: "Separate calcium by 4 hours; PPIs can raise TSH over time.", ref: "Product labelling (levothyroxine)" },
];

// ─────────────────────────── Drug–condition cautions ───────────────────────────

export interface DrugConditionRule {
  id: string;
  classes: DrugClass[];
  conditionTerms: string[];
  severity: "high" | "review";
  effect: string;
  ref: string;
}

export const DRUG_CONDITION: DrugConditionRule[] = [
  { id: "nsbb-asthma", classes: ["beta_blocker_nonselective"], conditionTerms: ["asthma", "copd"], severity: "high", effect: "Non-selective beta blocker in asthma/COPD can cause bronchospasm", ref: "GINA 2024; product labelling (propranolol)" },
  { id: "nsaid-ckd", classes: ["nsaid"], conditionTerms: ["chronic kidney disease", "ckd", "renal failure", "nephropathy"], severity: "high", effect: "NSAID in kidney disease risks further kidney injury", ref: "KDIGO CKD Guideline 2024" },
  { id: "nsaid-hf", classes: ["nsaid"], conditionTerms: ["heart failure", "cardiac failure"], severity: "high", effect: "NSAIDs worsen fluid retention in heart failure", ref: "ESC Heart Failure Guidelines 2021" },
  { id: "pio-hf", classes: ["thiazolidinedione"], conditionTerms: ["heart failure", "cardiac failure"], severity: "high", effect: "Pioglitazone causes fluid retention; avoid in heart failure", ref: "Product labelling (pioglitazone)" },
];

// ─────────────────────────── Allergy cross-reactivity ───────────────────────────

export const ALLERGY_GROUPS: { group: string; terms: string[]; classes: DrugClass[]; generics?: string[] }[] = [
  { group: "Penicillins", terms: ["penicillin", "amoxicillin", "amoxycillin", "ampicillin", "augmentin"], classes: ["penicillin"] },
  { group: "Sulfonamides", terms: ["sulfa", "sulpha", "sulfonamide", "cotrimoxazole", "septran", "bactrim"], classes: ["sulfonamide_antibiotic"] },
  { group: "NSAIDs", terms: ["nsaid", "ibuprofen", "diclofenac", "aspirin", "brufen", "aceclofenac"], classes: ["nsaid"], generics: ["aspirin"] },
  { group: "Macrolides", terms: ["macrolide", "azithromycin", "clarithromycin", "erythromycin"], classes: ["macrolide"] },
  { group: "Fluoroquinolones", terms: ["quinolone", "ciprofloxacin", "levofloxacin", "ofloxacin"], classes: ["fluoroquinolone"] },
  { group: "ACE inhibitors", terms: ["ace inhibitor", "ramipril", "enalapril", "angioedema"], classes: ["ace_inhibitor"] },
  { group: "Statins", terms: ["statin", "atorvastatin", "rosuvastatin"], classes: ["statin"] },
];
