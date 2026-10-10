import { CASCADES } from "../kb/rules";
import { CLASS_LABEL, type DrugClass } from "../kb/drugs";
import type { EngineAlert, Evidence, Timeline } from "./types";
import { buildCourses, cap, daysBetween, fmtDate, humanSpan, providerLabel, termMatch, toDay, type Course } from "./util";

/**
 * Prescribing cascades: index drug A started → within the rule window a symptom
 * and/or a marker drug B appears. Flags whether A and B came from different prescribers,
 * i.e. the second clinician most likely could not see the first prescription.
 */
export function detectCascades(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];

  for (const rule of CASCADES) {
    const indexCourses = courses.filter((c) => c.drugClass && rule.index.includes(c.drugClass as DrugClass));
    for (const a of indexCourses) {
      const inWindow = (date: string) => {
        const d = daysBetween(a.start, date);
        return d >= rule.window[0] && d <= rule.window[1];
      };

      // Symptom evidence (complaints or new conditions) inside the window
      const symptoms: Evidence[] = [];
      for (const e of t.encounters) {
        if (!inWindow(e.date)) continue;
        for (const c of e.complaints) {
          if (termMatch(c, rule.marker.terms ?? []))
            symptoms.push({ kind: "symptom", id: e.id, label: cap(c), date: e.date, provider: providerLabel(t, e.providerId), documentId: e.documentId, role: "effect" });
        }
      }
      for (const c of t.conditions) {
        if (c.onset && inWindow(c.onset) && termMatch(c.name, rule.marker.terms ?? []))
          symptoms.push({ kind: "condition", id: c.id, label: cap(c.name), date: c.onset, provider: providerLabel(t, c.providerId), documentId: c.documentId, role: "effect" });
      }

      // Marker drugs that START after the index drug (not pre-existing therapy)
      const markers = courses.filter(
        (b) => b !== a && b.drugClass && (rule.marker.classes ?? []).includes(b.drugClass as DrugClass) &&
          toDay(b.start) > toDay(a.start) && inWindow(b.start),
      );

      const indexEv: Evidence = {
        kind: "medication", id: a.first.id, label: `${cap(a.generic)}${a.first.dose ? " " + a.first.dose : ""} started`,
        date: a.start, provider: providerLabel(t, a.first.prescriberId), documentId: a.first.documentId, role: "cause",
      };

      if (markers.length) {
        for (const b of markers) {
          const symptom = symptoms.filter((s) => toDay(s.date!) <= toDay(b.start)).sort((x, y) => toDay(y.date!) - toDay(x.date!))[0];
          const cross = !!(a.first.prescriberId && b.first.prescriberId && a.first.prescriberId !== b.first.prescriberId);
          const stillOnBoth = a.end === null && b.end === null;
          const evidence: Evidence[] = [indexEv];
          if (symptom) evidence.push(symptom);
          evidence.push({
            kind: "medication", id: b.first.id, label: `${cap(b.generic)} started`, date: b.start,
            provider: providerLabel(t, b.first.prescriberId), documentId: b.first.documentId, role: "response",
          });
          const gap = humanSpan(daysBetween(a.start, b.start));
          alerts.push({
            type: "cascade",
            severity: cross && stillOnBoth ? "high" : "review",
            title: `Possible prescribing cascade: ${cap(a.generic)} → ${rule.effect} → ${cap(b.generic)}`,
            body:
              `${cap(b.generic)} (${CLASS_LABEL[b.drugClass as DrugClass] ?? b.drugClass}) was started ${gap} after ${a.generic}` +
              (cross ? `, by a different clinician (${providerLabel(t, b.first.prescriberId)}) than the one who prescribed ${a.generic} (${providerLabel(t, a.first.prescriberId)}).` : ".") +
              ` ${rule.note}` + (symptom ? ` Recorded on ${fmtDate(symptom.date!)}: “${symptom.label}”.` : "") +
              " Worth reviewing whether the original drug is the cause.",
            evidence,
            crossProvider: cross,
            ruleId: rule.id,
            ref: rule.ref,
            fingerprint: `cascade:${rule.id}:${a.key}:${b.key}`,
          });
        }
      } else if (symptoms.length && a.end === null) {
        // Symptom only, no treatment yet: an early warning before the cascade completes.
        const s = symptoms.sort((x, y) => toDay(x.date!) - toDay(y.date!))[0];
        alerts.push({
          type: "cascade",
          severity: "review",
          title: `${s.label} after ${cap(a.generic)}: possible side effect`,
          body: `“${s.label}” was recorded ${humanSpan(daysBetween(a.start, s.date!))} after ${a.generic} was started. ${rule.note} Consider the drug before adding a new treatment.`,
          evidence: [indexEv, s],
          crossProvider: !!(s.provider && s.provider !== indexEv.provider),
          ruleId: rule.id + ":early",
          ref: rule.ref,
          fingerprint: `cascade-early:${rule.id}:${a.key}`,
        });
      }
    }
  }
  return alerts;
}
