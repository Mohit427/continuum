// Runs the real Blind Spot Engine on the synthetic demo patient, in memory (no database),
// so the landing page shows genuine engine output.
import { runEngine } from "../engine";
import { storyToTimeline } from "./build";
import { addDays } from "../engine/util";
import { LAKSHMI } from "./stories";
import type { AlertRow } from "../data/record";
import { buildCareMap, type Station } from "../data/caremap";

export function showcase(today = new Date().toISOString().slice(0, 10)) {
  const { timeline } = storyToTimeline(LAKSHMI, today);
  const alerts: AlertRow[] = runEngine(timeline).map((a, i) => ({
    id: `demo-${i}`, type: a.type, severity: a.severity, title: a.title, body: a.body, evidence: a.evidence, cross_provider: a.crossProvider,
    rule_id: a.ruleId, ref: a.ref ?? null, fingerprint: a.fingerprint, status: "open", created_at: today, meta: a.meta ?? null,
  }));
  const firstDoc = new Map<string, number>();
  for (const d of LAKSHMI.docs) firstDoc.set(d.provider, Math.max(firstDoc.get(d.provider) ?? 0, d.daysAgo));
  const stations: Station[] = LAKSHMI.providers
    .filter((p) => firstDoc.has(p.key))
    .map((p) => ({ key: p.key, providerId: p.key, label: `${p.name} (${p.specialty})`, name: p.name, specialty: p.specialty, city: p.city, first: addDays(today, -firstDoc.get(p.key)!), visits: 1 }))
    .sort((a, b) => a.first.localeCompare(b.first));
  return { stations, alerts, docs: LAKSHMI.docs.length, map: buildCareMap(timeline, stations), timeline };
}
