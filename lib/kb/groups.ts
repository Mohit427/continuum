// Therapeutic groups and their code colours (Swiss pharma packaging convention: one colour per therapeutic area).
// Colours are CSS custom properties so the light and dark themes can tune them.
import type { DrugClass } from "./drugs";

export type GroupKey = "heart" | "fluid" | "meta" | "lung" | "pain" | "infect" | "other";

export const GROUPS: Record<GroupKey, { label: string; color: string }> = {
  heart: { label: "Heart & blood pressure", color: "var(--color-c-heart)" },
  fluid: { label: "Kidney & fluid", color: "var(--color-c-fluid)" },
  meta: { label: "Diabetes & hormones", color: "var(--color-c-meta)" },
  lung: { label: "Breathing", color: "var(--color-c-lung)" },
  pain: { label: "Pain & inflammation", color: "var(--color-c-pain)" },
  infect: { label: "Infection", color: "var(--color-c-infect)" },
  other: { label: "Other medicines", color: "var(--color-c-other)" },
};

export const GROUP_ORDER: GroupKey[] = ["heart", "fluid", "meta", "lung", "pain", "infect", "other"];

const BY_CLASS: Partial<Record<DrugClass, GroupKey>> = {
  ccb_dhp: "heart", ace_inhibitor: "heart", arb: "heart", beta_blocker: "heart", beta_blocker_nonselective: "heart", alpha_blocker: "heart",
  statin: "heart", antiplatelet: "heart", anticoagulant_vka: "heart", antiarrhythmic_amiodarone: "heart", cardiac_glycoside: "heart",
  loop_diuretic: "fluid", thiazide_diuretic: "fluid", potassium_sparing_diuretic: "fluid", potassium_supplement: "fluid",
  biguanide: "meta", sulfonylurea: "meta", dpp4_inhibitor: "meta", sglt2_inhibitor: "meta", insulin: "meta", thiazolidinedione: "meta",
  thyroid_hormone: "meta", antithyroid: "meta",
  saba: "lung", inhaled_corticosteroid: "lung", laba_ics: "lung", ltra: "lung", methylxanthine: "lung", cough_suppressant: "lung",
  nsaid: "pain", analgesic: "pain", opioid_weak: "pain", gabapentinoid: "pain", gout_acute: "pain", urate_lowering: "pain",
  corticosteroid_systemic: "pain", dmard_methotrexate: "pain",
  penicillin: "infect", macrolide: "infect", fluoroquinolone: "infect", sulfonamide_antibiotic: "infect", azole_antifungal: "infect",
};

export const groupOf = (cls: string | null | undefined): GroupKey => (cls && BY_CLASS[cls as DrugClass]) || "other";
