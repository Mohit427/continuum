import { detectCascades } from "./cascades";
import { detectDrugLab } from "./drugLab";
import { detectAllergyConflicts, detectDrugCondition, detectDuplicateTherapy, detectInteractions, detectRefillGaps } from "./safety";
import { detectDuplicateTests } from "./tests";
import type { EngineAlert, Timeline } from "./types";
import { buildCourses } from "./util";

export * from "./types";
export { checkTest, describeTrend, type Trend, type TestCheck } from "./tests";
export { buildCourses, activeOn } from "./util";

const SEVERITY_RANK = { high: 0, review: 1, info: 2 } as const;
const TYPE_RANK: Record<string, number> = {
  allergy_conflict: 0, cascade: 1, drug_lab: 2, interaction: 3, drug_condition: 4, duplicate_therapy: 5, duplicate_test: 6, refill_due: 7,
};

/**
 * The Blind Spot Engine. Pure and deterministic: same timeline in, same alerts out.
 * Every alert carries its evidence chain (record ids + source documents) and a reference.
 */
export function runEngine(t: Timeline): EngineAlert[] {
  const courses = buildCourses(t.meds);
  const all = [
    ...detectAllergyConflicts(t, courses),
    ...detectCascades(t, courses),
    ...detectDrugLab(t, courses),
    ...detectInteractions(t, courses),
    ...detectDrugCondition(t, courses),
    ...detectDuplicateTherapy(t, courses),
    ...detectDuplicateTests(t),
    ...detectRefillGaps(t, courses),
  ];

  // De-duplicate: identical fingerprints, and drug→lab alerts that point at the same result.
  const seen = new Set<string>();
  const out: EngineAlert[] = [];
  for (const a of all) {
    const resultLab = a.type === "drug_lab" ? a.evidence.find((e) => e.role === "result")?.id : undefined;
    const key = resultLab ? `${a.ruleId}:${resultLab}` : a.fingerprint;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }

  return out.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      Number(b.crossProvider) - Number(a.crossProvider) ||
      (TYPE_RANK[a.type] ?? 9) - (TYPE_RANK[b.type] ?? 9),
  );
}
