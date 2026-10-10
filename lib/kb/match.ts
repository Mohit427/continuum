import Fuse from "fuse.js";
import { DRUGS, type Drug } from "./drugs";

const DOSAGE_FORM = /\b(tab(let)?s?|cap(sule)?s?|inj(ection)?|syp|syrup|susp(ension)?|inhaler|rotacaps?|respules?|oint(ment)?|cream|drops?|sr|xr|er|cr|od|mr|ds|forte|plus)\b\.?/gi;
const STRENGTH = /\b\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|iu|units?|%)\b/gi;

export function cleanDrugName(raw: string): string {
  return raw
    .replace(/^\s*(\d+[.)]|[-•*])\s*/, "")
    .replace(DOSAGE_FORM, " ")
    .replace(STRENGTH, " ")
    .replace(/[^a-zA-Z+\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface Entry { term: string; drug: Drug }
const ENTRIES: Entry[] = DRUGS.flatMap((d) => [
  { term: d.generic.toLowerCase(), drug: d },
  ...d.brands.map((b) => ({ term: b.toLowerCase(), drug: d })),
]);
const fuse = new Fuse(ENTRIES, { keys: ["term"], includeScore: true, threshold: 0.3, ignoreLocation: true, minMatchCharLength: 3 });

export interface DrugMatch { drug: Drug; matchedOn: string; score: number; exact: boolean }

/** Map a raw prescription line ("Tab. Amlong 5mg OD") to a known drug. */
export function matchDrug(raw: string): DrugMatch | undefined {
  const name = cleanDrugName(raw);
  if (!name) return undefined;
  // 1. exact generic / brand
  const exact = ENTRIES.find((e) => e.term === name);
  if (exact) return { drug: exact.drug, matchedOn: exact.term, score: 1, exact: true };
  // 2. any known term appearing as a whole word ("amlong" in "amlong at")
  const words = ` ${name} `;
  const contained = ENTRIES.filter((e) => e.term.length >= 3 && words.includes(` ${e.term} `)).sort((a, b) => b.term.length - a.term.length)[0];
  if (contained) return { drug: contained.drug, matchedOn: contained.term, score: 0.95, exact: true };
  // 3. fuzzy (handles OCR / handwriting misspellings: "Amlodipin", "Telmisarton")
  const res = fuse.search(name)[0] ?? fuse.search(name.split(" ")[0])[0];
  if (res && res.score !== undefined && res.score <= 0.3)
    return { drug: res.item.drug, matchedOn: res.item.term, score: Math.round((1 - res.score) * 100) / 100, exact: false };
  return undefined;
}

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/\b(dr|mr|mrs|ms|smt|shri|sri)\.?\s+/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Loose person-name match: tolerant of initials, ordering and spelling. 0..1 */
export function nameSimilarity(a: string, b: string): number {
  const ta = normalizeName(a).split(" ").filter(Boolean);
  const tb = normalizeName(b).split(" ").filter(Boolean);
  if (!ta.length || !tb.length) return 0;
  let hits = 0;
  for (const x of ta) {
    const ok = tb.some((y) => {
      if (x === y) return true;
      if (x.length === 1 || y.length === 1) return x[0] === y[0]; // initial
      return levenshtein(x, y) <= Math.max(1, Math.floor(Math.min(x.length, y.length) / 4));
    });
    if (ok) hits++;
  }
  return hits / Math.max(ta.length, tb.length);
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
