import { DRUG_LAB } from "../kb/rules";
import { LAB_BY_KEY } from "../kb/labs";
import type { DrugClass } from "../kb/drugs";
import type { EngineAlert, ELab, Timeline } from "./types";
import { buildCourses, cap, daysBetween, fmtDate, humanSpan, providerLabel, toDay, type Course } from "./util";

const BASELINE_LOOKBACK = 365;

/** Drug-induced lab changes: compares the pre-drug baseline with results inside the rule window. */
export function detectDrugLab(t: Timeline, courses: Course[] = buildCourses(t.meds)): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  for (const rule of DRUG_LAB) {
    const labs = t.labs.filter((l) => l.testKey === rule.test && l.value !== null).sort((a, b) => toDay(a.takenAt) - toDay(b.takenAt));
    if (!labs.length) continue;
    const def = LAB_BY_KEY[rule.test];

    for (const c of courses) {
      if (!c.drugClass || !rule.classes.includes(c.drugClass as DrugClass)) continue;

      const baseline = [...labs].reverse().find((l) => {
        const d = daysBetween(l.takenAt, c.start);
        return d >= 0 && d <= BASELINE_LOOKBACK;
      });
      const windowLabs = labs.filter((l) => {
        const d = daysBetween(c.start, l.takenAt);
        // drug must have been taken around the time of the result (allow 30 days after stopping)
        const exposed = c.end === null || toDay(l.takenAt) <= toDay(c.end) + 30;
        return d >= rule.window[0] && d <= rule.window[1] && exposed;
      });

      let worst: { lab: ELab; pct: number | null; reason: string; magnitude: number } | null = null;
      for (const l of windowLabs) {
        const v = l.value!;
        const pct = baseline && baseline.value ? ((v - baseline.value) / baseline.value) * 100 : null;
        const reasons: { reason: string; magnitude: number }[] = [];
        if (rule.pct !== undefined && pct !== null) {
          const ok = rule.direction === "up" ? pct >= rule.pct : rule.direction === "down" ? pct <= -rule.pct : Math.abs(pct) >= rule.pct;
          if (ok) reasons.push({ reason: `${pct > 0 ? "+" : ""}${Math.round(pct)}% vs. baseline`, magnitude: Math.abs(pct) });
        }
        if (rule.above !== undefined && v > rule.above) reasons.push({ reason: `above ${rule.above} ${def?.unit ?? ""}`.trim(), magnitude: 100 + v });
        if (rule.below !== undefined && v < rule.below) reasons.push({ reason: `below ${rule.below} ${def?.unit ?? ""}`.trim(), magnitude: 100 + (rule.below - v) });
        if (rule.xUln !== undefined) {
          const uln = l.refHigh ?? def?.high;
          if (uln && v >= rule.xUln * uln) reasons.push({ reason: `${(v / uln).toFixed(1)}× upper limit`, magnitude: 100 + v / uln });
        }
        const best = reasons.sort((a, b) => b.magnitude - a.magnitude)[0];
        if (best && (!worst || best.magnitude > worst.magnitude)) worst = { lab: l, pct, reason: best.reason, magnitude: best.magnitude };
      }
      if (!worst) continue;

      const l = worst.lab;
      const unit = l.unit || def?.unit || "";
      const cross = !!(l.providerId && c.first.prescriberId && l.providerId !== c.first.prescriberId);
      const evidence = [
        { kind: "medication" as const, id: c.first.id, label: `${cap(c.generic)} started`, date: c.start, provider: providerLabel(t, c.first.prescriberId), documentId: c.first.documentId, role: "cause" as const },
        ...(baseline ? [{ kind: "lab" as const, id: baseline.id, label: `${def?.name ?? baseline.testName} ${baseline.value} ${unit} (baseline)`, date: baseline.takenAt, provider: providerLabel(t, baseline.providerId), documentId: baseline.documentId, role: "baseline" as const }] : []),
        { kind: "lab" as const, id: l.id, label: `${def?.name ?? l.testName} ${l.value} ${unit}`, date: l.takenAt, provider: providerLabel(t, l.providerId), documentId: l.documentId, role: "result" as const },
      ];
      alerts.push({
        type: "drug_lab",
        severity: rule.above !== undefined || rule.below !== undefined || rule.xUln !== undefined || (worst.pct !== null && Math.abs(worst.pct) >= 2 * (rule.pct ?? 100)) ? "high" : "review",
        title: rule.title,
        body:
          `${def?.name ?? l.testName} ${baseline ? `${baseline.value} → ` : ""}${l.value} ${unit} (${worst.reason}) on ${fmtDate(l.takenAt)}, ` +
          `${humanSpan(daysBetween(c.start, l.takenAt))} after ${c.generic} was started by ${providerLabel(t, c.first.prescriberId)}.` +
          (cross ? ` The result came from a different provider, so the prescriber may not have seen it.` : "") +
          ` ${rule.note}`,
        evidence,
        crossProvider: cross,
        ruleId: rule.id,
        ref: rule.ref,
        fingerprint: `druglab:${rule.id}:${c.key}:${c.start}`,
        meta: { baseline: baseline?.value ?? null, value: l.value, pct: worst.pct },
      });
    }
  }
  return alerts;
}
