import type { EMed, Timeline } from "./types";

const DAY = 86_400_000;

export const toDay = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DAY);
export const daysBetween = (a: string, b: string) => toDay(b) - toDay(a);
export const addDays = (iso: string, n: number) => new Date((toDay(iso) + n) * DAY).toISOString().slice(0, 10);

export function fmtDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + "T00:00:00Z");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function humanSpan(days: number): string {
  const d = Math.abs(days);
  if (d < 14) return `${d} day${d === 1 ? "" : "s"}`;
  if (d < 60) return `${Math.round(d / 7)} weeks`;
  if (d < 730) return `${Math.round(d / 30.4)} months`;
  return `${(d / 365).toFixed(1)} years`;
}

/** A continuous course of one drug, merged across repeat prescriptions / refills. */
export interface Course {
  key: string; // generic or cleaned raw name
  generic: string;
  drugClass: string | null;
  start: string;
  end: string | null; // null = ongoing
  records: EMed[];
  prescriberIds: string[];
  first: EMed;
}

const GAP_DAYS = 45; // refills within this gap continue the same course

export function buildCourses(meds: EMed[]): Course[] {
  const groups = new Map<string, EMed[]>();
  for (const m of meds) {
    const key = (m.generic || m.rawName).toLowerCase().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  const courses: Course[] = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => toDay(a.start) - toDay(b.start));
    let cur: Course | null = null;
    for (const m of list) {
      const mEnd = effectiveEnd(m);
      if (cur && (cur.end === null || toDay(m.start) <= toDay(cur.end) + GAP_DAYS)) {
        cur.records.push(m);
        if (m.prescriberId && !cur.prescriberIds.includes(m.prescriberId)) cur.prescriberIds.push(m.prescriberId);
        cur.end = cur.end === null || mEnd === null ? null : toDay(mEnd) > toDay(cur.end) ? mEnd : cur.end;
        // a later record that stopped the drug closes an otherwise open course
        if (m.status === "stopped" && m.end) cur.end = m.end;
      } else {
        cur = {
          key, generic: m.generic || m.rawName, drugClass: m.drugClass ?? null, start: m.start, end: mEnd,
          records: [m], prescriberIds: m.prescriberId ? [m.prescriberId] : [], first: m,
        };
        courses.push(cur);
      }
    }
  }
  return courses;
}

function effectiveEnd(m: EMed): string | null {
  if (m.end) return m.end;
  if (m.status === "stopped") return m.start;
  return null;
}

export const activeOn = (c: Course, day: string) =>
  toDay(c.start) <= toDay(day) && (c.end === null || toDay(c.end) >= toDay(day));

/** Overlap window of two courses, or null. */
export function overlap(a: Course, b: Course, today: string): [string, string] | null {
  const s = Math.max(toDay(a.start), toDay(b.start));
  const e = Math.min(toDay(a.end ?? today), toDay(b.end ?? today));
  if (s > e) return null;
  return [new Date(s * DAY).toISOString().slice(0, 10), new Date(e * DAY).toISOString().slice(0, 10)];
}

export const providerName = (t: Timeline, id?: string | null) => (id && t.providers[id]?.name) || "Unknown prescriber";
export const providerLabel = (t: Timeline, id?: string | null) => {
  if (!id || !t.providers[id]) return "Unknown prescriber";
  const p = t.providers[id];
  return p.specialty ? `${p.name} (${p.specialty})` : p.name;
};

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function termMatch(text: string, terms: string[]): string | undefined {
  const t = ` ${text.toLowerCase()} `;
  return terms.find((term) => t.includes(term.toLowerCase()));
}
