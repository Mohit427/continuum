import "server-only";
import { z } from "zod";
import { AIError, structured } from "./client";

export const SummarySchema = z.object({
  headline: z.string().describe("One sentence: who the patient is and the main active problems."),
  sections: z.array(
    z.object({
      title: z.string(),
      bullets: z.array(
        z.object({
          text: z.string(),
          cites: z.array(z.string()).describe("ids of the records this bullet is based on"),
          attention: z.boolean().describe("true if this needs the clinician's attention"),
        }),
      ),
    }),
  ),
});
export type Summary = z.infer<typeof SummarySchema>;

const LANG: Record<string, string> = { en: "English", hi: "Hindi (Devanagari script)", ta: "Tamil (Tamil script)" };

const SYSTEM = `You write a one-screen clinical handover summary from a patient's structured health record.

Rules:
- Use ONLY the records provided. Every bullet must cite the ids of the records it uses in "cites". Never cite an id that is not in the input.
- Do not diagnose, recommend treatment, or tell anyone to start/stop a medicine. You organise and surface; the clinician decides.
- Safety alerts in the input were produced by a rules engine; restate the important ones neutrally ("flagged for review: …") and cite the alert id.
- Sections, in this order, omitting empty ones: "Active problems", "Current medicines", "Allergies", "Recent results & trends", "Flagged for review", "Recent visits".
- Be terse: short bullets, numbers with units and dates, no filler.`;

const AUDIENCE: Record<"clinician" | "patient", string> = {
  clinician: "Audience: a doctor seeing this patient for the first time, with five minutes.",
  patient: "Audience: the patient or a family caregiver. Use plain everyday words and explain abbreviations; keep the same rules.",
};

export async function summarizeRecord(record: unknown, opts: { audience: "clinician" | "patient"; lang: string; lens?: string }): Promise<Summary> {
  const lang = LANG[opts.lang] ?? "English";
  const text =
    `${AUDIENCE[opts.audience]}${opts.lens ? ` The doctor is a ${opts.lens} specialist; put what matters to them first.` : ""}\n` +
    `Write the summary in ${lang} (section titles too).\n\n<record>\n${JSON.stringify(record)}\n</record>`;
  try {
    const { data } = await structured({ schema: SummarySchema, name: "clinical_summary", system: SYSTEM, parts: [{ type: "text", text }], maxTokens: 8000, effort: "low" });
    return data;
  } catch (e) {
    if (e instanceof AIError) throw new Error(e.kind === "busy" || e.kind === "network" ? "Summary unavailable right now. Please retry." : "Summary could not be generated.");
    throw e;
  }
}
