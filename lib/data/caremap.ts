// The medication map: every medicine course as a bar (length = exact duration), grouped by therapeutic class,
// with lab draws and visits on their own tracks, so Blind Spot evidence can be drawn as connectors.
import { buildCourses, activeOn } from "../engine";
import type { Timeline } from "../engine/types";
import { groupOf, GROUP_ORDER, type GroupKey } from "../kb/groups";

export interface MapRow { key: string; group: GroupKey; name: string; dose: string | null; start: string; end: string | null; ongoing: boolean; prescribers: { id: string; name: string }[]; recordIds: string[] }
export interface MapPoint { id: string; date: string; label: string; providerId: string | null }
export interface CityBreak { date: string; city: string }
export interface CareMapData { from: string; to: string; today: string; rows: MapRow[]; labs: MapPoint[]; visits: MapPoint[]; cities: CityBreak[] }

const day = (iso: string) => Date.parse(iso.slice(0, 10) + "T00:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export interface Station { key: string; label: string; name: string; specialty: string | null; city: string | null; first: string; visits: number; providerId: string }

export function buildCareMap(t: Timeline, stations: Pick<Station, "city" | "first">[] = []): CareMapData {
  const courses = buildCourses(t.meds);
  const rows: MapRow[] = courses.map((c) => {
    const ongoing = activeOn(c, t.today);
    const last = c.records[c.records.length - 1];
    return {
      key: `${c.key}-${c.start}`,
      group: groupOf(c.drugClass),
      name: c.first.rawName,
      dose: last.dose ?? null,
      start: c.start,
      end: ongoing ? null : c.end ?? t.today,
      ongoing,
      prescribers: c.prescriberIds.map((id) => ({ id, name: t.providers[id]?.name ?? "Unknown" })),
      recordIds: c.records.map((r) => r.id),
    };
  });
  rows.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.start.localeCompare(b.start));

  const labs = t.labs.map((l) => ({ id: l.id, date: l.takenAt.slice(0, 10), label: `${l.testName}${l.value !== null ? ` ${l.value}${l.unit ? " " + l.unit : ""}` : ""}`, providerId: l.providerId ?? null }));
  const visits = t.encounters.map((e) => ({ id: e.id, date: e.date, label: e.complaints.length ? e.complaints.join(", ") : "Visit", providerId: e.providerId ?? null }));

  const cities: CityBreak[] = [];
  const st = [...stations].sort((a, b) => a.first.localeCompare(b.first));
  for (let i = 1; i < st.length; i++) if (st[i].city && st[i - 1].city && st[i].city !== st[i - 1].city && !cities.some((c) => c.city === st[i].city)) cities.push({ date: st[i].first, city: st[i].city! });

  const dates = [...rows.map((r) => r.start), ...labs.map((l) => l.date), ...visits.map((v) => v.date)].map(day).filter(Number.isFinite);
  const min = dates.length ? Math.min(...dates) : day(t.today) - 180 * 864e5;
  const span = Math.max(day(t.today) - min, 60 * 864e5);
  return { from: iso(min - span * 0.03), to: iso(day(t.today) + span * 0.04), today: t.today, rows, labs, visits, cities };
}

/** Position of a date across the map, 0..100. */
export const pct = (m: Pick<CareMapData, "from" | "to">, date: string) => {
  const a = day(m.from), b = day(m.to);
  return Math.min(100, Math.max(0, ((day(date) - a) / (b - a)) * 100));
};
