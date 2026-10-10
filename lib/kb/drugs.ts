// Curated drug dictionary for common chronic-care medicines in India.
// brand names → generic → therapeutic class (engine key) → WHO ATC code.

export type DrugClass =
  | "biguanide" | "sulfonylurea" | "dpp4_inhibitor" | "sglt2_inhibitor" | "insulin" | "thiazolidinedione"
  | "ccb_dhp" | "ace_inhibitor" | "arb" | "beta_blocker" | "beta_blocker_nonselective" | "loop_diuretic"
  | "thiazide_diuretic" | "potassium_sparing_diuretic" | "alpha_blocker"
  | "statin" | "antiplatelet" | "anticoagulant_vka" | "antiarrhythmic_amiodarone" | "cardiac_glycoside"
  | "thyroid_hormone" | "antithyroid"
  | "saba" | "inhaled_corticosteroid" | "laba_ics" | "ltra" | "methylxanthine"
  | "nsaid" | "analgesic" | "opioid_weak"
  | "ppi" | "corticosteroid_systemic"
  | "penicillin" | "macrolide" | "fluoroquinolone" | "sulfonamide_antibiotic" | "azole_antifungal"
  | "urate_lowering" | "gout_acute"
  | "gabapentinoid" | "antiepileptic" | "benzodiazepine" | "ssri"
  | "antidopaminergic" | "antiparkinson" | "cholinesterase_inhibitor" | "bladder_antimuscarinic"
  | "vestibular_suppressant" | "cough_suppressant" | "antihistamine"
  | "vitamin_b12" | "calcium_supplement" | "potassium_supplement" | "dmard_methotrexate";

export interface Drug {
  generic: string;
  class: DrugClass;
  atc: string;
  brands: string[];
  /** Safety-critical in an emergency (shown on the emergency card). */
  critical?: boolean;
}

export const DRUGS: Drug[] = [
  // ── Diabetes
  { generic: "metformin", class: "biguanide", atc: "A10BA02", brands: ["Glycomet", "Glyciphage", "Glycomet GP"] },
  { generic: "glimepiride", class: "sulfonylurea", atc: "A10BB12", brands: ["Amaryl", "Glimestar"] },
  { generic: "gliclazide", class: "sulfonylurea", atc: "A10BB09", brands: ["Glizid", "Diamicron"] },
  { generic: "sitagliptin", class: "dpp4_inhibitor", atc: "A10BH01", brands: ["Januvia", "Istavel"] },
  { generic: "vildagliptin", class: "dpp4_inhibitor", atc: "A10BH02", brands: ["Galvus"] },
  { generic: "empagliflozin", class: "sglt2_inhibitor", atc: "A10BK03", brands: ["Jardiance"] },
  { generic: "dapagliflozin", class: "sglt2_inhibitor", atc: "A10BK01", brands: ["Forxiga"] },
  { generic: "pioglitazone", class: "thiazolidinedione", atc: "A10BG03", brands: ["Pioz"] },
  { generic: "insulin glargine", class: "insulin", atc: "A10AE04", brands: ["Lantus", "Basalog"], critical: true },
  { generic: "human insulin", class: "insulin", atc: "A10AC01", brands: ["Mixtard", "Huminsulin"], critical: true },

  // ── Blood pressure / cardiac
  { generic: "amlodipine", class: "ccb_dhp", atc: "C08CA01", brands: ["Amlong", "Amlopres", "Stamlo", "Amlodac"] },
  { generic: "nifedipine", class: "ccb_dhp", atc: "C08CA05", brands: ["Depin", "Calcigard"] },
  { generic: "cilnidipine", class: "ccb_dhp", atc: "C08CA14", brands: ["Cilacar"] },
  { generic: "ramipril", class: "ace_inhibitor", atc: "C09AA05", brands: ["Cardace", "Ramistar"] },
  { generic: "enalapril", class: "ace_inhibitor", atc: "C09AA02", brands: ["Envas"] },
  { generic: "telmisartan", class: "arb", atc: "C09CA07", brands: ["Telma", "Telmikind"] },
  { generic: "losartan", class: "arb", atc: "C09CA01", brands: ["Losar", "Repace"] },
  { generic: "olmesartan", class: "arb", atc: "C09CA08", brands: ["Olmezest", "Benicar"] },
  { generic: "atenolol", class: "beta_blocker", atc: "C07AB03", brands: ["Aten", "Tenormin"], critical: true },
  { generic: "metoprolol", class: "beta_blocker", atc: "C07AB02", brands: ["Metolar", "Met XL", "Betaloc"], critical: true },
  { generic: "bisoprolol", class: "beta_blocker", atc: "C07AB07", brands: ["Concor"], critical: true },
  { generic: "propranolol", class: "beta_blocker_nonselective", atc: "C07AA05", brands: ["Ciplar", "Inderal"], critical: true },
  { generic: "furosemide", class: "loop_diuretic", atc: "C03CA01", brands: ["Lasix", "Frusemide"] },
  { generic: "torsemide", class: "loop_diuretic", atc: "C03CA04", brands: ["Dytor", "Tide"] },
  { generic: "hydrochlorothiazide", class: "thiazide_diuretic", atc: "C03AA03", brands: ["Aquazide"] },
  { generic: "chlorthalidone", class: "thiazide_diuretic", atc: "C03BA04", brands: ["Thalizide"] },
  { generic: "indapamide", class: "thiazide_diuretic", atc: "C03BA11", brands: ["Natrilix"] },
  { generic: "spironolactone", class: "potassium_sparing_diuretic", atc: "C03DA01", brands: ["Aldactone"] },
  { generic: "prazosin", class: "alpha_blocker", atc: "C02CA01", brands: ["Minipress"] },
  { generic: "tamsulosin", class: "alpha_blocker", atc: "G04CA02", brands: ["Urimax", "Flomax"] },
  { generic: "atorvastatin", class: "statin", atc: "C10AA05", brands: ["Atorva", "Storvas", "Lipitor"] },
  { generic: "rosuvastatin", class: "statin", atc: "C10AA07", brands: ["Rosuvas", "Rozat", "Crestor"] },
  { generic: "aspirin", class: "antiplatelet", atc: "B01AC06", brands: ["Ecosprin", "Disprin"], critical: true },
  { generic: "clopidogrel", class: "antiplatelet", atc: "B01AC04", brands: ["Clopilet", "Plavix", "Deplatt"], critical: true },
  { generic: "warfarin", class: "anticoagulant_vka", atc: "B01AA03", brands: ["Warf", "Coumadin"], critical: true },
  { generic: "acenocoumarol", class: "anticoagulant_vka", atc: "B01AA07", brands: ["Acitrom"], critical: true },
  { generic: "amiodarone", class: "antiarrhythmic_amiodarone", atc: "C01BD01", brands: ["Cordarone"], critical: true },
  { generic: "digoxin", class: "cardiac_glycoside", atc: "C01AA05", brands: ["Lanoxin"], critical: true },

  // ── Thyroid
  { generic: "levothyroxine", class: "thyroid_hormone", atc: "H03AA01", brands: ["Thyronorm", "Eltroxin", "Thyrox"] },
  { generic: "carbimazole", class: "antithyroid", atc: "H03BB01", brands: ["Neomercazole"] },

  // ── Respiratory
  { generic: "salbutamol", class: "saba", atc: "R03AC02", brands: ["Asthalin", "Ventolin"] },
  { generic: "budesonide", class: "inhaled_corticosteroid", atc: "R03BA02", brands: ["Budecort", "Pulmicort"] },
  { generic: "formoterol + budesonide", class: "laba_ics", atc: "R03AK07", brands: ["Foracort", "Symbicort"] },
  { generic: "montelukast", class: "ltra", atc: "R03DC03", brands: ["Montair", "Montek"] },
  { generic: "theophylline", class: "methylxanthine", atc: "R03DA04", brands: ["Deriphyllin", "Theo-Asthalin", "Unicontin"] },

  // ── Pain / GI / steroids
  { generic: "ibuprofen", class: "nsaid", atc: "M01AE01", brands: ["Brufen", "Combiflam", "Ibugesic"] },
  { generic: "diclofenac", class: "nsaid", atc: "M01AB05", brands: ["Voveran", "Voltaren"] },
  { generic: "aceclofenac", class: "nsaid", atc: "M01AB16", brands: ["Zerodol", "Hifenac"] },
  { generic: "naproxen", class: "nsaid", atc: "M01AE02", brands: ["Naprosyn"] },
  { generic: "paracetamol", class: "analgesic", atc: "N02BE01", brands: ["Dolo", "Dolo 650", "Crocin", "Calpol"] },
  { generic: "tramadol", class: "opioid_weak", atc: "N02AX02", brands: ["Ultracet", "Contramal"] },
  { generic: "pantoprazole", class: "ppi", atc: "A02BC02", brands: ["Pan", "Pan 40", "Pantocid"] },
  { generic: "omeprazole", class: "ppi", atc: "A02BC01", brands: ["Omez"] },
  { generic: "rabeprazole", class: "ppi", atc: "A02BC04", brands: ["Razo", "Rablet"] },
  { generic: "prednisolone", class: "corticosteroid_systemic", atc: "H02AB06", brands: ["Wysolone", "Omnacortil"], critical: true },
  { generic: "methylprednisolone", class: "corticosteroid_systemic", atc: "H02AB04", brands: ["Medrol"], critical: true },
  { generic: "dexamethasone", class: "corticosteroid_systemic", atc: "H02AB02", brands: ["Dexona", "Decadron"], critical: true },

  // ── Anti-infectives
  { generic: "amoxicillin", class: "penicillin", atc: "J01CA04", brands: ["Mox", "Novamox"] },
  { generic: "amoxicillin + clavulanic acid", class: "penicillin", atc: "J01CR02", brands: ["Augmentin", "Moxikind-CV", "Clavam"] },
  { generic: "azithromycin", class: "macrolide", atc: "J01FA10", brands: ["Azithral", "Azee"] },
  { generic: "clarithromycin", class: "macrolide", atc: "J01FA09", brands: ["Claribid"] },
  { generic: "ciprofloxacin", class: "fluoroquinolone", atc: "J01MA02", brands: ["Ciplox", "Cifran"] },
  { generic: "levofloxacin", class: "fluoroquinolone", atc: "J01MA12", brands: ["Levoflox", "Tavanic"] },
  { generic: "cotrimoxazole", class: "sulfonamide_antibiotic", atc: "J01EE01", brands: ["Septran", "Bactrim"] },
  { generic: "fluconazole", class: "azole_antifungal", atc: "J02AC01", brands: ["Forcan", "Zocon"] },

  // ── Gout
  { generic: "allopurinol", class: "urate_lowering", atc: "M04AA01", brands: ["Zyloric"] },
  { generic: "febuxostat", class: "urate_lowering", atc: "M04AA03", brands: ["Febutaz", "Zurig"] },
  { generic: "colchicine", class: "gout_acute", atc: "M04AC01", brands: ["Zycolchin"] },

  // ── Neuro / psych
  { generic: "pregabalin", class: "gabapentinoid", atc: "N03AX16", brands: ["Lyrica", "Pregeb"] },
  { generic: "gabapentin", class: "gabapentinoid", atc: "N03AX12", brands: ["Gabapin", "Neurontin"] },
  { generic: "levetiracetam", class: "antiepileptic", atc: "N03AX14", brands: ["Levipil", "Keppra"], critical: true },
  { generic: "phenytoin", class: "antiepileptic", atc: "N03AB02", brands: ["Eptoin", "Dilantin"], critical: true },
  { generic: "alprazolam", class: "benzodiazepine", atc: "N05BA12", brands: ["Alprax", "Restyl"] },
  { generic: "clonazepam", class: "benzodiazepine", atc: "N03AE01", brands: ["Rivotril", "Clonotril"] },
  { generic: "sertraline", class: "ssri", atc: "N06AB06", brands: ["Daxid", "Serta"] },
  { generic: "escitalopram", class: "ssri", atc: "N06AB10", brands: ["Nexito", "Cipralex"] },
  { generic: "metoclopramide", class: "antidopaminergic", atc: "A03FA01", brands: ["Perinorm", "Reglan"] },
  { generic: "prochlorperazine", class: "antidopaminergic", atc: "N05AB04", brands: ["Stemetil"] },
  { generic: "levodopa + carbidopa", class: "antiparkinson", atc: "N04BA02", brands: ["Syndopa", "Sinemet"] },
  { generic: "donepezil", class: "cholinesterase_inhibitor", atc: "N06DA02", brands: ["Aricept", "Donecept"] },
  { generic: "oxybutynin", class: "bladder_antimuscarinic", atc: "G04BD04", brands: ["Cystran", "Ditropan"] },
  { generic: "betahistine", class: "vestibular_suppressant", atc: "N07CA01", brands: ["Vertin"] },
  { generic: "dextromethorphan", class: "cough_suppressant", atc: "R05DA09", brands: ["Benadryl DR", "Grilinctus"] },
  { generic: "levocetirizine", class: "antihistamine", atc: "R06AE09", brands: ["Levocet", "Xyzal"] },

  // ── Supplements / misc
  { generic: "methylcobalamin", class: "vitamin_b12", atc: "B03BA05", brands: ["Nurokind", "Methycobal"] },
  { generic: "calcium carbonate + vitamin D3", class: "calcium_supplement", atc: "A12AX", brands: ["Shelcal", "Calcimax"] },
  { generic: "potassium chloride", class: "potassium_supplement", atc: "A12BA01", brands: ["K-Cl syrup", "Kesol"] },
  { generic: "methotrexate", class: "dmard_methotrexate", atc: "L04AX03", brands: ["Folitrax", "Imutrex"], critical: true },
];

export const CLASS_LABEL: Record<DrugClass, string> = {
  biguanide: "Biguanide (antidiabetic)", sulfonylurea: "Sulfonylurea (antidiabetic)", dpp4_inhibitor: "DPP-4 inhibitor",
  sglt2_inhibitor: "SGLT2 inhibitor", insulin: "Insulin", thiazolidinedione: "Thiazolidinedione",
  ccb_dhp: "Calcium-channel blocker", ace_inhibitor: "ACE inhibitor", arb: "Angiotensin receptor blocker",
  beta_blocker: "Beta blocker", beta_blocker_nonselective: "Non-selective beta blocker", loop_diuretic: "Loop diuretic",
  thiazide_diuretic: "Thiazide diuretic", potassium_sparing_diuretic: "Potassium-sparing diuretic", alpha_blocker: "Alpha blocker",
  statin: "Statin", antiplatelet: "Antiplatelet", anticoagulant_vka: "Anticoagulant (vitamin K antagonist)",
  antiarrhythmic_amiodarone: "Antiarrhythmic", cardiac_glycoside: "Cardiac glycoside",
  thyroid_hormone: "Thyroid hormone", antithyroid: "Antithyroid",
  saba: "Short-acting bronchodilator", inhaled_corticosteroid: "Inhaled corticosteroid", laba_ics: "LABA + inhaled steroid",
  ltra: "Leukotriene antagonist", methylxanthine: "Methylxanthine",
  nsaid: "NSAID painkiller", analgesic: "Analgesic", opioid_weak: "Opioid analgesic", ppi: "Proton-pump inhibitor",
  corticosteroid_systemic: "Systemic corticosteroid", penicillin: "Penicillin antibiotic", macrolide: "Macrolide antibiotic",
  fluoroquinolone: "Fluoroquinolone antibiotic", sulfonamide_antibiotic: "Sulfonamide antibiotic", azole_antifungal: "Azole antifungal",
  urate_lowering: "Urate-lowering (gout)", gout_acute: "Gout (acute)", gabapentinoid: "Gabapentinoid",
  antiepileptic: "Antiepileptic", benzodiazepine: "Benzodiazepine", ssri: "SSRI antidepressant",
  antidopaminergic: "Antidopaminergic antiemetic", antiparkinson: "Antiparkinson", cholinesterase_inhibitor: "Cholinesterase inhibitor",
  bladder_antimuscarinic: "Bladder antimuscarinic", vestibular_suppressant: "Vertigo medicine", cough_suppressant: "Cough suppressant",
  antihistamine: "Antihistamine", vitamin_b12: "Vitamin B12", calcium_supplement: "Calcium supplement",
  potassium_supplement: "Potassium supplement", dmard_methotrexate: "Methotrexate (DMARD)",
};
