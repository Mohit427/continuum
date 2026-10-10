import { LAB_BY_KEY } from "../kb/labs";
import type { EngineAlert, ELab, Timeline } from "./types";
import { daysBetween, fmtDate, humanSpan, providerLabel, toDay } from "./util";

/** Same test repeated inside its minimum re-test interval (stable outpatient defaults). */
export function detectDuplicateTests(t: Timeline): EngineAlert[] {
  const alerts: EngineAlert[] = [];
  const byKey = new Map<string, ELab[]>();
  for (const l of t.labs) {
    const def = LAB_BY_KEY[l.testKey];
    if (!def || def.category !== "lab" || !def.retestDays || def.retestDays <= 7) continue;
    byKey.set(l.testKey, [...(byKey.get(l.testKey) ?? []), l]);
  }
  for (const [key, list] of byKey) {
    const def = LAB_BY_KEY[key];
    // one row per sample date
    const dates = [...new Map(list.map((l) => [l.takenAt.slice(0, 10), l])).values()].sort((a, b) => toDay(a.takenAt) - toDay(b.takenAt));
    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i - 1], cur = dates[i];
      const gap = daysBetween(prev.takenAt, cur.takenAt);
      if (gap <= 0 || gap >= def.retestDays!) continue;
      const cross = !!(prev.providerId && cur.providerId && prev.providerId !== cur.providerId);
      const similar = prev.value !== null && cur.value !== null && prev.value !== 0 && Math.abs((cur.value - prev.value) / prev.value) < 0.1;
      alerts.push({
        type: "duplicate_test",
        severity: "info",
        title: `${def.name} repeated after ${humanSpan(gap)}`,
        body:
          `${def.name} was done on ${fmtDate(prev.takenAt)} (${prev.value ?? "—"} ${def.unit}) and again on ${fmtDate(cur.takenAt)} (${cur.value ?? "—"} ${def.unit}).` +
          ` For a stable patient a repeat is usually not needed within ${humanSpan(def.retestDays!)}.` +
          (cross ? ` Ordered by different providers (${providerLabel(t, prev.providerId)} → ${providerLabel(t, cur.providerId)}), so the earlier result was probably not available.` : "") +
          (similar ? " The result barely changed." : "") +
          (def.priceInr ? ` Avoidable cost ≈ ₹${def.priceInr}.` : ""),
        evidence: [
          { kind: "lab", id: prev.id, label: `${def.name} ${prev.value ?? ""} ${def.unit}`, date: prev.takenAt, provider: providerLabel(t, prev.providerId), documentId: prev.documentId, role: "baseline" },
          { kind: "lab", id: cur.id, label: `${def.name} ${cur.value ?? ""} ${def.unit}`, date: cur.takenAt, provider: providerLabel(t, cur.providerId), documentId: cur.documentId, role: "result" },
        ],
        crossProvider: cross,
        ruleId: `retest:${key}`,
        ref: "RCPath/ACB National Minimum Retesting Intervals in Pathology (2021)",
        fingerprint: `duptest:${key}:${cur.takenAt.slice(0, 10)}`,
        meta: { wastedInr: def.priceInr ?? 0, gapDays: gap },
      });
    }
  }
  return alerts;
}

export interface TestCheck {
  testKey: string;
  name: string;
  last: ELab | null;
  daysAgo: number | null;
  retestDays: number | null;
  stillValid: boolean;
  priceInr: number;
  message: string;
}

/** "About to order this test?": last result + whether it's still within its re-test interval. */
export function checkTest(t: Timeline, testKey: string): TestCheck {
  const def = LAB_BY_KEY[testKey];
  const list = t.labs.filter((l) => l.testKey === testKey).sort((a, b) => toDay(b.takenAt) - toDay(a.takenAt));
  const last = list[0] ?? null;
  const daysAgo = last ? daysBetween(last.takenAt, t.today) : null;
  const retest = def?.retestDays ?? null;
  const stillValid = !!(last && retest && daysAgo !== null && daysAgo < retest);
  const name = def?.name ?? testKey;
  let message: string;
  if (!last) message = `No previous ${name} on record. Ordering it is reasonable.`;
  else if (stillValid)
    message = `${name} was done ${daysAgo === 0 ? "today" : `${humanSpan(daysAgo!)} ago`} (${last.value ?? last.testName} ${def?.unit ?? ""}, ${providerLabel(t, last.providerId)}). That is inside the usual ${humanSpan(retest!)} re-test interval, so reusing it could save ≈ ₹${def?.priceInr ?? 0}.`;
  else message = `Last ${name} was ${humanSpan(daysAgo!)} ago (${last.value ?? ""} ${def?.unit ?? ""}). A repeat is due.`;
  return { testKey, name, last, daysAgo, retestDays: retest, stillValid, priceInr: def?.priceInr ?? 0, message };
}

export interface Trend {
  testKey: string;
  name: string;
  unit: string;
  points: { date: string; value: number; labId: string }[];
  first: number;
  last: number;
  pct: number;
  direction: "up" | "down" | "flat";
  status: "improving" | "worsening" | "stable" | "n/a";
  latestFlag: "high" | "low" | "normal" | null;
  sentence: string;
}

/** Plain-language trend: "HbA1c rose from 6.8% to 8.4% over 9 months." */
export function describeTrend(labs: ELab[], testKey: string): Trend | null {
  const def = LAB_BY_KEY[testKey];
  const pts = labs
    .filter((l) => l.testKey === testKey && l.value !== null)
    .sort((a, b) => toDay(a.takenAt) - toDay(b.takenAt))
    .map((l) => ({ date: l.takenAt.slice(0, 10), value: Number(l.value), labId: l.id }));
  if (!pts.length) return null;
  const first = pts[0].value, last = pts[pts.length - 1].value;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const direction = Math.abs(pct) < 5 ? "flat" : pct > 0 ? "up" : "down";
  const unit = def?.unit ?? "";
  const name = def?.name ?? testKey;
  let status: Trend["status"] = "n/a";
  if (pts.length > 1) {
    if (direction === "flat") status = "stable";
    else if (def?.lowerIsBetter !== undefined) status = (direction === "down") === !!def.lowerIsBetter ? "improving" : "worsening";
    else if (def?.low !== undefined && def?.high !== undefined) {
      const mid = (def.low + def.high) / 2;
      status = Math.abs(last - mid) < Math.abs(first - mid) ? "improving" : "worsening";
    }
  }
  const latestFlag = def ? (def.high !== undefined && last > def.high ? "high" : def.low !== undefined && last < def.low ? "low" : "normal") : null;
  const span = pts.length > 1 ? humanSpan(daysBetween(pts[0].date, pts[pts.length - 1].date)) : "";
  const u = unit === "%" ? "%" : unit ? ` ${unit}` : "";
  const sentence =
    pts.length === 1
      ? `${name} ${last}${u} on ${fmtDate(pts[0].date)} (single result).`
      : direction === "flat"
        ? `${name} has been stable around ${last}${u} over ${span}.`
        : `${name} ${direction === "up" ? "rose" : "fell"} from ${first}${u} to ${last}${u} over ${span}${status === "worsening" ? ", trending the wrong way" : status === "improving" ? ", improving" : ""}.`;
  return { testKey, name, unit, points: pts, first, last, pct, direction, status, latestFlag, sentence };
}
