import { describe, expect, it } from "vitest";
import { runEngine, checkTest, describeTrend } from "../index";
import type { EMed, ELab, Timeline } from "../types";
import { addDays } from "../util";
import { storyToTimeline } from "../../seed/build";
import { ARJUN, LAKSHMI, LIVE_DEMO_DOC } from "../../seed/stories";

const TODAY = "2026-10-10";
const ago = (n: number) => addDays(TODAY, -n);

function tl(partial: Partial<Timeline>): Timeline {
  return {
    meds: [], labs: [], conditions: [], encounters: [], allergies: [], today: TODAY,
    providers: { A: { name: "Dr A", specialty: "Cardiology" }, B: { name: "Dr B", specialty: "General Physician" }, LAB: { name: "Lab", specialty: "Laboratory" } },
    ...partial,
  };
}
const med = (id: string, generic: string, drugClass: string, startAgo: number, prescriberId = "A", extra: Partial<EMed> = {}): EMed =>
  ({ id, rawName: generic, generic, drugClass, start: ago(startAgo), prescriberId, ...extra });
const lab = (id: string, testKey: string, value: number, takenAgo: number, providerId = "LAB"): ELab =>
  ({ id, testKey, testName: testKey, value, takenAt: ago(takenAgo), providerId });

describe("prescribing cascades", () => {
  it("flags CCB → loop diuretic across providers as high", () => {
    const a = runEngine(tl({ meds: [med("1", "amlodipine", "ccb_dhp", 200, "A"), med("2", "furosemide", "loop_diuretic", 100, "B")] }));
    const c = a.find((x) => x.type === "cascade");
    expect(c).toBeDefined();
    expect(c!.crossProvider).toBe(true);
    expect(c!.severity).toBe("high");
    expect(c!.evidence.map((e) => e.role)).toEqual(["cause", "response"]);
  });

  it("includes the symptom in the chain when recorded", () => {
    const a = runEngine(tl({
      meds: [med("1", "amlodipine", "ccb_dhp", 200, "A"), med("2", "furosemide", "loop_diuretic", 100, "B")],
      encounters: [{ id: "e1", date: ago(101), complaints: ["ankle swelling"], providerId: "B" }],
    }));
    expect(a.find((x) => x.type === "cascade")!.evidence.map((e) => e.role)).toEqual(["cause", "effect", "response"]);
  });

  it("is review (not high) when the same doctor prescribed both", () => {
    const a = runEngine(tl({ meds: [med("1", "amlodipine", "ccb_dhp", 200, "A"), med("2", "furosemide", "loop_diuretic", 100, "A")] }));
    const c = a.find((x) => x.type === "cascade")!;
    expect(c.crossProvider).toBe(false);
    expect(c.severity).toBe("review");
  });

  it("ignores a diuretic that pre-dates the CCB", () => {
    const a = runEngine(tl({ meds: [med("1", "furosemide", "loop_diuretic", 300, "B"), med("2", "amlodipine", "ccb_dhp", 200, "A")] }));
    expect(a.filter((x) => x.type === "cascade")).toHaveLength(0);
  });

  it("ignores a marker outside the rule window", () => {
    const a = runEngine(tl({ meds: [med("1", "amlodipine", "ccb_dhp", 900, "A"), med("2", "furosemide", "loop_diuretic", 100, "B")] }));
    expect(a.filter((x) => x.type === "cascade")).toHaveLength(0);
  });

  it("raises an early warning on symptom alone (before a second drug is added)", () => {
    const a = runEngine(tl({
      meds: [med("1", "ramipril", "ace_inhibitor", 60, "A")],
      encounters: [{ id: "e1", date: ago(20), complaints: ["Dry cough for 3 weeks"], providerId: "B" }],
    }));
    const c = a.find((x) => x.type === "cascade")!;
    expect(c.ruleId).toBe("acei-cough-antitussive:early");
  });
});

describe("drug → lab effects", () => {
  it("flags creatinine rise ≥25% after an NSAID", () => {
    const a = runEngine(tl({
      meds: [med("1", "ibuprofen", "nsaid", 100, "A")],
      labs: [lab("b", "creatinine", 0.9, 150), lab("r", "creatinine", 1.3, 50)],
    }));
    const d = a.find((x) => x.ruleId === "nsaid-creatinine")!;
    expect(d).toBeDefined();
    expect(d.crossProvider).toBe(true);
    expect(Math.round(d.meta!.pct as number)).toBe(44);
  });

  it("does not flag a small change", () => {
    const a = runEngine(tl({ meds: [med("1", "ibuprofen", "nsaid", 100)], labs: [lab("b", "creatinine", 0.9, 150), lab("r", "creatinine", 1.0, 50)] }));
    expect(a.filter((x) => x.type === "drug_lab")).toHaveLength(0);
  });

  it("uses absolute thresholds without a baseline (hyperkalaemia on spironolactone)", () => {
    const a = runEngine(tl({ meds: [med("1", "spironolactone", "potassium_sparing_diuretic", 60)], labs: [lab("r", "potassium", 5.9, 10)] }));
    expect(a.find((x) => x.ruleId === "raas-potassium")).toBeDefined();
  });

  it("ignores results long after the drug was stopped", () => {
    const a = runEngine(tl({
      meds: [med("1", "ibuprofen", "nsaid", 110, "A", { end: ago(100) })],
      labs: [lab("b", "creatinine", 0.9, 150), lab("r", "creatinine", 1.4, 20)],
    }));
    expect(a.filter((x) => x.type === "drug_lab")).toHaveLength(0);
  });
});

describe("interactions & safety", () => {
  it("upgrades ARB + NSAID to 'triple whammy' when a diuretic is active", () => {
    const a = runEngine(tl({ meds: [med("1", "telmisartan", "arb", 300, "A"), med("2", "furosemide", "loop_diuretic", 200, "B"), med("3", "ibuprofen", "nsaid", 50, "B")] }));
    const ix = a.find((x) => x.ruleId === "raas-nsaid")!;
    expect(ix.severity).toBe("high");
    expect(ix.title).toMatch(/Triple whammy/);
  });

  it("skips interactions whose overlap ended long ago", () => {
    const a = runEngine(tl({ meds: [med("1", "warfarin", "anticoagulant_vka", 400, "A", { end: ago(200) }), med("2", "ibuprofen", "nsaid", 300, "B", { end: ago(250) })] }));
    expect(a.filter((x) => x.type === "interaction")).toHaveLength(0);
  });

  it("flags penicillin given to a penicillin-allergic patient", () => {
    const a = runEngine(tl({ meds: [med("1", "amoxicillin + clavulanic acid", "penicillin", 10, "B")], allergies: [{ id: "al", substance: "Penicillin" }] }));
    expect(a[0].type).toBe("allergy_conflict");
    expect(a[0].severity).toBe("high");
  });

  it("flags two NSAIDs from different doctors as duplicate therapy", () => {
    const a = runEngine(tl({ meds: [med("1", "ibuprofen", "nsaid", 30, "A"), med("2", "diclofenac", "nsaid", 20, "B")] }));
    expect(a.find((x) => x.type === "duplicate_therapy")?.crossProvider).toBe(true);
  });

  it("does not flag intentional dual antiplatelet therapy as duplicate", () => {
    const a = runEngine(tl({ meds: [med("1", "aspirin", "antiplatelet", 30), med("2", "clopidogrel", "antiplatelet", 30)] }));
    expect(a.filter((x) => x.type === "duplicate_therapy")).toHaveLength(0);
  });

  it("flags non-selective beta blocker with asthma", () => {
    const a = runEngine(tl({ meds: [med("1", "propranolol", "beta_blocker_nonselective", 30, "A")], conditions: [{ id: "c", name: "Bronchial asthma", status: "active", providerId: "B" }] }));
    expect(a.find((x) => x.type === "drug_condition")?.severity).toBe("high");
  });

  it("warns when a chronic medicine's supply ran out without renewal", () => {
    const a = runEngine(tl({ meds: [med("1", "levothyroxine", "thyroid_hormone", 200, "A", { end: ago(20) })] }));
    expect(a.find((x) => x.type === "refill_due")).toBeDefined();
  });
});

describe("tests & trends", () => {
  it("flags a repeat HbA1c inside 90 days with the avoidable cost", () => {
    const a = runEngine(tl({ labs: [lab("1", "hba1c", 8.4, 75, "A"), lab("2", "hba1c", 8.3, 55, "B")] }));
    const d = a.find((x) => x.type === "duplicate_test")!;
    expect(d.meta!.wastedInr).toBe(450);
    expect(d.crossProvider).toBe(true);
  });

  it("checkTest says a recent HbA1c can be reused", () => {
    const c = checkTest(tl({ labs: [lab("1", "hba1c", 8.3, 20)] }), "hba1c");
    expect(c.stillValid).toBe(true);
    expect(c.priceInr).toBe(450);
  });

  it("describes a worsening HbA1c trend in plain language", () => {
    const tr = describeTrend([lab("1", "hba1c", 7.2, 545), lab("2", "hba1c", 8.4, 75)], "hba1c")!;
    expect(tr.status).toBe("worsening");
    expect(tr.sentence).toMatch(/rose from 7.2% to 8.4%/);
  });
});

describe("demo stories (end-to-end through normalisation)", () => {
  it("Lakshmi: cascade, NSAID-creatinine, triple whammy, allergy, duplicate HbA1c, refill gap", () => {
    const { timeline } = storyToTimeline(LAKSHMI, TODAY);
    const a = runEngine(timeline);
    const ids = a.map((x) => x.ruleId);
    expect(ids).toContain("ccb-edema-diuretic");
    expect(ids).toContain("nsaid-creatinine");
    expect(ids).toContain("raas-nsaid");
    expect(ids).toContain("allergy:Penicillins");
    expect(ids).toContain("retest:hba1c");
    expect(ids).toContain("refill-gap");
    const cascade = a.find((x) => x.ruleId === "ccb-edema-diuretic")!;
    expect(cascade.crossProvider).toBe(true);
    expect(cascade.severity).toBe("high");
    // no false raas-creatinine alert: telmisartan was started long before the rise
    expect(ids).not.toContain("raas-creatinine");
  });

  it("Lakshmi live upload (spironolactone) adds a new hyperkalaemia interaction", () => {
    const before = runEngine(storyToTimeline(LAKSHMI, TODAY).timeline).map((x) => x.fingerprint);
    const after = runEngine(storyToTimeline(LAKSHMI, TODAY, [LIVE_DEMO_DOC]).timeline);
    const added = after.filter((x) => !before.includes(x.fingerprint));
    expect(added.map((x) => x.ruleId)).toContain("raas-kspare");
  });

  it("Arjun: propranolol in asthma, beta-blocker → salbutamol cascade, inhaled steroid → thrush cascade", () => {
    const ids = runEngine(storyToTimeline(ARJUN, TODAY).timeline).map((x) => x.ruleId);
    expect(ids).toContain("nsbb-asthma");
    expect(ids).toContain("nonselective-bb-bronchospasm");
    expect(ids).toContain("ics-thrush-antifungal");
  });
});
