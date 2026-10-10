import { ALLERGY_GROUPS, DRUG_CONDITION, INTERACTIONS, type InteractionRule } from "../kb/rules";
import { CLASS_LABEL, type DrugClass } from "../kb/drugs";
import type { EngineAlert, Evidence, Timeline } from "./types";
import { activeOn, addDays, buildCourses, cap, daysBetween, fmtDate, overlap, providerLabel, termMatch, toDay, type Course } from "./util";

const RECENT_DAYS = 30; // an interaction matters if the overlap reaches into the last 30 days

const medEv = (t: Timeline, c: Course, role: Evidence["role"] = "context"): Evidence => ({
  kind: "medication", id: c.records[c.records.length - 1].id, label: cap(c.generic) + (c.first.dose ? ` ${c.first.dose}` : ""),
  date: c.start, provider: providerLabel(t, c.records[c.records.length - 1].prescriberId), documentId: c.records[c.records.length - 1].documentId, role,
});

const lastPrescriber = (c: Course) => c.records[c.records.length - 1].prescriberId ?? null;

function sideMatches(side: InteractionRule["a"], c: Course): boolean {
  return (!!c.drugClass && !!side.classes?.includes(c.drugClass as DrugClass)) || !!side.generics?.includes(c.generic.toLowerCase());
}

// ─────────────── Drug–drug interactions (concurrent therapy) ───────────────
export function detectInteractions(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  const recentCut = toDay(t.today) - RECENT_DAYS;
  const diureticActive = (from: string, to: string) =>
    courses.some((c) => (c.drugClass === "loop_diuretic" || c.drugClass === "thiazide_diuretic" || c.drugClass === "potassium_sparing_diuretic") &&
      overlap(c, { ...c, start: from, end: to }, t.today));

  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const x = courses[i], y = courses[j];
      if (x.key === y.key) continue;
      const ov = overlap(x, y, t.today);
      if (!ov || toDay(ov[1]) < recentCut) continue;
      for (const rule of INTERACTIONS) {
        let a: Course | null = null, b: Course | null = null;
        if (sideMatches(rule.a, x) && sideMatches(rule.b, y)) { a = x; b = y; }
        else if (sideMatches(rule.a, y) && sideMatches(rule.b, x)) { a = y; b = x; }
        if (!a || !b) continue;

        const pa = lastPrescriber(a), pb = lastPrescriber(b);
        const cross = !!(pa && pb && pa !== pb);
        let severity = rule.severity, title = `${cap(a.generic)} + ${b.generic}: ${rule.effect.toLowerCase()}`, extra = "";
        if (rule.id === "raas-nsaid" && diureticActive(ov[0], ov[1])) {
          severity = "high";
          title = `“Triple whammy”: ${a.generic} + ${b.generic} + a diuretic`;
          extra = " A diuretic is also being taken; the ACE-inhibitor/ARB + diuretic + NSAID combination carries a markedly higher acute kidney injury risk.";
        }
        alerts.push({
          type: "interaction",
          severity,
          title,
          body:
            `Taken together since ${fmtDate(ov[0])}.` +
            (cross ? ` Prescribed by different clinicians: ${providerLabel(t, pa)} and ${providerLabel(t, pb)}.` : "") +
            ` ${rule.note}${extra}`,
          evidence: [medEv(t, a, "cause"), medEv(t, b, "cause")],
          crossProvider: cross,
          ruleId: rule.id,
          ref: rule.ref,
          fingerprint: `ix:${rule.id}:${[a.key, b.key].sort().join("+")}`,
        });
      }
    }
  }
  return alerts;
}

// ─────────────── Duplicate therapy ───────────────
const DUP_EXEMPT = new Set(["insulin", "antiplatelet", "saba", "analgesic", "calcium_supplement", "vitamin_b12", "potassium_supplement"]);

export function detectDuplicateTherapy(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  const active = courses.filter((c) => activeOn(c, t.today));

  // Same drug, two parallel prescriptions from different clinicians (courses merge by generic,
  // so look inside a course for overlapping records with different prescribers).
  for (const c of active) {
    const ps = c.prescriberIds;
    if (ps.length > 1) {
      const recent = c.records.filter((r) => daysBetween(r.start, t.today) <= 120);
      const distinct = [...new Set(recent.map((r) => r.prescriberId).filter(Boolean))];
      if (distinct.length > 1) {
        alerts.push({
          type: "duplicate_therapy", severity: "review",
          title: `${cap(c.generic)} prescribed by ${distinct.length} different clinicians`,
          body: `${cap(c.generic)} appears on recent prescriptions from ${distinct.map((p) => providerLabel(t, p)).join(" and ")}. Check that the patient is not taking two supplies or two different doses.`,
          evidence: recent.map((r) => ({ kind: "medication" as const, id: r.id, label: `${cap(c.generic)}${r.dose ? " " + r.dose : ""}`, date: r.start, provider: providerLabel(t, r.prescriberId), documentId: r.documentId, role: "context" as const })),
          crossProvider: true, ruleId: "same-drug-multi-prescriber", fingerprint: `dupdrug:${c.key}`,
        });
      }
    }
  }

  // Same class, different drugs, both active now.
  const byClass = new Map<string, Course[]>();
  for (const c of active) if (c.drugClass && !DUP_EXEMPT.has(c.drugClass)) byClass.set(c.drugClass, [...(byClass.get(c.drugClass) ?? []), c]);
  for (const [cls, list] of byClass) {
    const generics = [...new Set(list.map((c) => c.key))];
    if (generics.length < 2) continue;
    const ps = new Set(list.map(lastPrescriber).filter(Boolean));
    alerts.push({
      type: "duplicate_therapy", severity: cls === "nsaid" || cls === "anticoagulant_vka" ? "high" : "review",
      title: `Two ${CLASS_LABEL[cls as DrugClass] ?? cls} drugs at the same time`,
      body: `${list.map((c) => cap(c.generic)).join(" and ")} belong to the same drug class and are both active. ${ps.size > 1 ? "They were prescribed by different clinicians. " : ""}Usually only one is intended.`,
      evidence: list.map((c) => medEv(t, c, "cause")),
      crossProvider: ps.size > 1, ruleId: `dup-class:${cls}`, fingerprint: `dupclass:${cls}:${generics.sort().join("+")}`,
    });
  }
  return alerts;
}

// ─────────────── Allergy conflicts ───────────────
export function detectAllergyConflicts(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  for (const al of t.allergies) {
    const sub = al.substance.toLowerCase();
    const groups = ALLERGY_GROUPS.filter((g) => g.terms.some((term) => sub.includes(term)) || (al.allergenClass && g.group.toLowerCase() === al.allergenClass.toLowerCase()));
    for (const c of courses) {
      const direct = c.generic.toLowerCase().includes(sub) || sub.includes(c.generic.toLowerCase());
      const group = groups.find((g) => (c.drugClass && g.classes.includes(c.drugClass as DrugClass)) || g.generics?.includes(c.generic.toLowerCase()));
      if (!direct && !group) continue;
      const recent = c.end === null || daysBetween(c.end, t.today) <= 180;
      if (!recent) continue;
      alerts.push({
        type: "allergy_conflict", severity: "high",
        title: `${cap(c.generic)} prescribed despite recorded ${al.substance} allergy`,
        body: `${cap(c.generic)} ${group ? `belongs to the ${group.group.toLowerCase()} group, which cross-reacts with` : "matches"} the recorded allergy to ${al.substance}. Prescribed by ${providerLabel(t, lastPrescriber(c))} on ${fmtDate(c.start)}.`,
        evidence: [
          { kind: "allergy", id: al.id, label: `Allergy: ${al.substance}`, documentId: al.documentId, role: "context" },
          medEv(t, c, "cause"),
        ],
        crossProvider: true, ruleId: `allergy:${group?.group ?? "direct"}`, fingerprint: `allergy:${al.id}:${c.key}`,
      });
    }
  }
  return alerts;
}

// ─────────────── Drug–condition cautions ───────────────
export function detectDrugCondition(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  const active = courses.filter((c) => activeOn(c, t.today));
  for (const rule of DRUG_CONDITION) {
    const conds = t.conditions.filter((c) => c.status !== "resolved" && termMatch(c.name, rule.conditionTerms));
    if (!conds.length) continue;
    for (const c of active) {
      if (!c.drugClass || !rule.classes.includes(c.drugClass as DrugClass)) continue;
      const cond = conds[0];
      alerts.push({
        type: "drug_condition", severity: rule.severity,
        title: `${cap(c.generic)} with ${cond.name.toLowerCase()}`,
        body: `${rule.effect}. ${cap(c.generic)} was prescribed by ${providerLabel(t, lastPrescriber(c))}; ${cond.name} is recorded${cond.providerId ? ` by ${providerLabel(t, cond.providerId)}` : ""}.`,
        evidence: [medEv(t, c, "cause"), { kind: "condition", id: cond.id, label: cond.name, date: cond.onset ?? undefined, provider: providerLabel(t, cond.providerId), documentId: cond.documentId, role: "context" }],
        crossProvider: !!(cond.providerId && lastPrescriber(c) && cond.providerId !== lastPrescriber(c)),
        ruleId: rule.id, ref: rule.ref, fingerprint: `drugcond:${rule.id}:${c.key}`,
      });
    }
  }
  return alerts;
}

// ─────────────── Refill gaps for chronic medicines ───────────────
const CHRONIC = new Set([
  "biguanide", "sulfonylurea", "dpp4_inhibitor", "sglt2_inhibitor", "insulin", "ccb_dhp", "ace_inhibitor", "arb", "beta_blocker",
  "statin", "antiplatelet", "anticoagulant_vka", "thyroid_hormone", "antiepileptic", "laba_ics", "inhaled_corticosteroid",
]);

export function detectRefillGaps(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  for (const c of courses) {
    if (!c.drugClass || !CHRONIC.has(c.drugClass) || c.end === null) continue;
    const last = c.records[c.records.length - 1];
    if (last.status === "stopped") continue; // deliberately stopped
    const overdue = daysBetween(c.end, t.today);
    if (overdue < 3 || overdue > 120) continue;
    const later = courses.some((o) => o.key === c.key && toDay(o.start) > toDay(c.start));
    if (later) continue;
    alerts.push({
      type: "refill_due", severity: "info",
      title: `${cap(c.generic)} supply likely ran out ${overdue} days ago`,
      body: `The last prescription covered until ${fmtDate(c.end)} and no renewal is on record. ${CLASS_LABEL[c.drugClass as DrugClass]} medicines should not usually be stopped abruptly without advice.`,
      evidence: [medEv(t, c, "context")],
      crossProvider: false, ruleId: "refill-gap", fingerprint: `refill:${c.key}:${c.end}`,
      meta: { ranOut: c.end, due: addDays(c.end, 0) },
    });
  }
  return alerts;
}
