export interface EMed {
  id: string;
  rawName: string;
  generic?: string | null;
  drugClass?: string | null;
  start: string; // ISO date
  end?: string | null;
  status?: "active" | "stopped";
  prescriberId?: string | null;
  documentId?: string | null;
  dose?: string | null;
}

export interface ELab {
  id: string;
  testKey: string;
  testName: string;
  value: number | null;
  unit?: string | null;
  refHigh?: number | null;
  takenAt: string;
  providerId?: string | null;
  documentId?: string | null;
}

export interface ECondition {
  id: string;
  name: string;
  onset?: string | null;
  status?: "active" | "resolved";
  providerId?: string | null;
  documentId?: string | null;
}

export interface EEncounter {
  id: string;
  date: string;
  complaints: string[];
  providerId?: string | null;
  documentId?: string | null;
}

export interface EAllergy {
  id: string;
  substance: string;
  allergenClass?: string | null;
  documentId?: string | null;
}

export interface EProvider { name: string; specialty?: string | null }

export interface Timeline {
  meds: EMed[];
  labs: ELab[];
  conditions: ECondition[];
  encounters: EEncounter[];
  allergies: EAllergy[];
  providers: Record<string, EProvider>;
  today: string;
}

export type AlertType =
  | "cascade" | "drug_lab" | "interaction" | "drug_condition" | "duplicate_therapy"
  | "allergy_conflict" | "duplicate_test" | "refill_due" | "name_mismatch" | "duplicate_upload";

export interface Evidence {
  kind: "medication" | "lab" | "condition" | "encounter" | "allergy" | "symptom" | "document";
  id: string;
  label: string;
  date?: string;
  provider?: string;
  documentId?: string | null;
  /** Role in the chain shown on the card. */
  role?: "cause" | "effect" | "response" | "baseline" | "result" | "context";
}

export interface EngineAlert {
  type: AlertType;
  severity: "info" | "review" | "high";
  title: string;
  body: string;
  evidence: Evidence[];
  crossProvider: boolean;
  ruleId: string;
  ref?: string;
  fingerprint: string;
  /** Extra numbers for the UI (e.g. ₹ wasted). */
  meta?: Record<string, unknown>;
}
