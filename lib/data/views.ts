// Derived, display-ready views over a patient record (shared by patient, doctor and link pages).
import { buildCourses, activeOn, describeTrend, type Trend } from "../engine";
import { LAB_BY_KEY } from "../kb/labs";
import { CLASS_LABEL, DRUGS, type DrugClass } from "../kb/drugs";
import type { ConditionRow, MedicationRow, PatientRecord } from "./record";
import { toTimeline } from "./record";

export interface CurrentMed {
  id: string; name: string; generic: string | null; drugClass: string | null; classLabel: string | null; strength: string | null; frequency: string | null;
  since: string; prescribers: string[]; documentId: string | null; critical: boolean; unmatched: boolean; recordIds: string[];
}

const CRITICAL = new Set(DRUGS.filter((d) => d.critical).map((d) => d.generic));
export const isCriticalDrug = (generic: string | null, cls: string | null) =>
  (!!generic && CRITICAL.has(generic)) || ["insulin", "anticoagulant_vka", "antiplatelet", "corticosteroid_systemic", "antiepileptic", "antiarrhythmic_amiodarone", "cardiac_glycoside"].includes(cls ?? "");

/** Current medicine list (merged courses active today), the patient's "what am I taking" answer. */
export function currentMeds(r: Pick<PatientRecord, "medications" | "providers">, today = new Date().toISOString().slice(0, 10)): CurrentMed[] {
  const t = toTimeline({ ...r, labs: [], conditions: [], encounters: [], allergies: [] }, today);
  const byId = new Map(r.medications.map((m) => [m.id, m]));
  const provName = (id?: string | null) => r.providers.find((p) => p.id === id)?.name ?? "Unknown";
  return buildCourses(t.meds)
    .filter((c) => activeOn(c, today))
    .map((c) => {
      const last = byId.get(c.records[c.records.length - 1].id)!;
      return {
        id: last.id, name: last.raw_name, generic: c.drugClass ? c.generic : null, drugClass: c.drugClass, classLabel: c.drugClass ? CLASS_LABEL[c.drugClass as DrugClass] ?? null : null,
        strength: last.strength, frequency: last.frequency, since: c.start, prescribers: [...new Set(c.records.map((x) => provName(x.prescriberId)))],
        documentId: last.source_document_id, critical: isCriticalDrug(c.generic, c.drugClass), unmatched: !c.drugClass, recordIds: c.records.map((x) => x.id),
      };
    })
    .sort((a, b) => Number(b.critical) - Number(a.critical) || a.name.localeCompare(b.name));
}

export function pastMeds(r: Pick<PatientRecord, "medications" | "providers">, today = new Date().toISOString().slice(0, 10)): (MedicationRow & { prescriber: string })[] {
  const current = new Set(currentMeds(r, today).flatMap((m) => m.recordIds));
  return r.medications.filter((m) => !current.has(m.id)).map((m) => ({ ...m, prescriber: r.providers.find((p) => p.id === m.prescriber_id)?.name ?? "Unknown" }));
}

/** Conditions deduplicated by name (earliest onset kept, all sources listed). */
export function activeProblems(conditions: ConditionRow[]): (ConditionRow & { mentions: number })[] {
  const key = (n: string) => n.toLowerCase().replace(/[-–(].*$/, "").replace(/\s+/g, " ").trim();
  const map = new Map<string, ConditionRow & { mentions: number }>();
  for (const c of [...conditions].sort((a, b) => (a.onset_date ?? "").localeCompare(b.onset_date ?? ""))) {
    const k = key(c.name);
    const e = map.get(k);
    if (e) e.mentions++;
    else map.set(k, { ...c, mentions: 1 });
  }
  return [...map.values()].sort((a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.mentions - a.mentions);
}

export function trends(r: Pick<PatientRecord, "labs" | "providers" | "medications" | "conditions" | "encounters" | "allergies">): Trend[] {
  const t = toTimeline(r);
  const keys = [...new Set(t.labs.map((l) => l.testKey))];
  return keys
    .map((k) => describeTrend(t.labs, k))
    .filter((x): x is Trend => !!x)
    .sort((a, b) => {
      const order = (x: Trend) => (x.status === "worsening" ? 0 : x.latestFlag && x.latestFlag !== "normal" ? 1 : 2);
      return order(a) - order(b) || b.points.length - a.points.length;
    });
}

/** Compact, id-carrying payload for the AI summary (structured rows only, never raw documents). */
export function summaryPayload(r: PatientRecord) {
  const today = new Date().toISOString().slice(0, 10);
  const prov = (id: string | null) => r.providers.find((p) => p.id === id);
  return {
    today,
    patient: { name: r.profile.full_name, sex: r.profile.sex, dob: r.profile.dob, blood_group: r.profile.blood_group },
    allergies: r.allergies.map((a) => ({ id: a.id, substance: a.substance, reaction: a.reaction, severity: a.severity })),
    problems: activeProblems(r.conditions).map((c) => ({ id: c.id, name: c.name, status: c.status, since: c.onset_date, by: prov(c.provider_id)?.name })),
    current_medicines: currentMeds(r, today).map((m) => ({ id: m.id, name: m.name, generic: m.generic, class: m.classLabel, frequency: m.frequency, since: m.since, prescribed_by: m.prescribers })),
    lab_trends: trends(r).slice(0, 12).map((t) => ({ id: t.points[t.points.length - 1].labId, test: t.name, latest: `${t.last} ${t.unit}`, flag: t.latestFlag, trend: t.sentence })),
    safety_flags: r.alerts.filter((a) => a.status === "open" || a.status === "acknowledged").map((a) => ({ id: a.id, severity: a.severity, title: a.title, detail: a.body })),
    recent_visits: [...r.encounters].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((e) => ({ id: e.id, date: e.date, with: prov(e.provider_id)?.name, specialty: prov(e.provider_id)?.specialty, complaints: e.complaints, notes: e.notes })),
  };
}

/** Providers in order of first contact (doctor/lab filter, city changes on the medication map). */
export function stations(r: Pick<PatientRecord, "providers" | "encounters" | "labs" | "medications">) {
  const first = new Map<string, { first: string; visits: number }>();
  const touch = (pid: string | null, d: string | null) => {
    if (!pid || !d) return;
    const e = first.get(pid);
    if (!e) first.set(pid, { first: d, visits: 1 });
    else { e.visits++; if (d < e.first) e.first = d; }
  };
  r.encounters.forEach((e) => touch(e.provider_id, e.date));
  return r.providers
    .filter((p) => first.has(p.id))
    .map((p) => {
      const f = first.get(p.id)!;
      const city = (p.facility ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() ?? null;
      return { key: p.id, providerId: p.id, label: p.specialty ? `${p.name} (${p.specialty})` : p.name, name: p.name, specialty: p.specialty, city, first: f.first, visits: f.visits };
    })
    .sort((a, b) => a.first.localeCompare(b.first));
}

export const labName =(key: string | null, fallback: string) => (key && LAB_BY_KEY[key]?.name) || fallback;
