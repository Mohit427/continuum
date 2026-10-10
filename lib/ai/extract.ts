import "server-only";
import { AIError, structured, type Part } from "./client";
import { ExtractionSchema, sanitizeExtraction, type Extraction } from "../ingest/schema";

const SYSTEM = `You read Indian medical documents (handwritten or printed prescriptions, lab reports, discharge summaries, imaging reports) and transcribe them into structured data.

Rules:
- Transcribe only what is written. Never infer a diagnosis, drug, value or date that is not on the page.
- Medicines: copy the name as written (brand or generic, e.g. "Amlong", "Telma 40"), with strength, dose, frequency (expand OD/BD/TDS/HS/SOS into plain words) and duration in days if stated.
- Lab results: one entry per test with the numeric value, unit and reference range exactly as printed. Use value_text for non-numeric results.
- Vitals (BP, pulse, weight, SpO2) go in "vitals", not in labs.
- Dates: output YYYY-MM-DD. Indian documents use DD/MM/YYYY; interpret accordingly.
- complaints: the patient's presenting symptoms in short phrases (e.g. "swelling of both ankles").
- allergies: only allergies explicitly recorded on the document.
- confidence fields: 0 to 1. Use below 0.8 whenever handwriting is unclear, a value is partly cut off, or you are choosing between readings.
- If the image is not a medical document, set is_medical_document to false and leave lists empty.`;

export type DocInput = { mime: string; base64: string };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
export const SUPPORTED_MIME = [...IMAGE_TYPES, "application/pdf"];

export class ExtractionError extends Error {
  constructor(message: string, public retryable: boolean) { super(message); }
}

/** Read one or more pages (images) or a PDF and return validated structured data. */
export async function extractDocument(pages: DocInput[]): Promise<{ data: Extraction; model: string }> {
  const parts: Part[] = [];
  for (const p of pages) {
    if (p.mime === "application/pdf") parts.push({ type: "pdf", base64: p.base64 });
    else if ((IMAGE_TYPES as readonly string[]).includes(p.mime)) parts.push({ type: "image", mime: p.mime as ImageType, base64: p.base64 });
    else throw new ExtractionError(`Unsupported file type ${p.mime}. Upload a JPG, PNG, WebP or PDF.`, false);
  }
  parts.push({ type: "text", text: `Extract this ${pages.length > 1 ? `${pages.length}-page ` : ""}document.` });

  try {
    const { data, model } = await structured({ schema: ExtractionSchema, name: "medical_document", system: SYSTEM, parts, maxTokens: 16000, effort: "medium" });
    return { data: sanitizeExtraction(data), model };
  } catch (e) {
    if (!(e instanceof AIError)) throw new ExtractionError("Could not reach the AI service. Please retry.", true);
    switch (e.kind) {
      case "busy": return Promise.reject(new ExtractionError("The AI service is busy. Please retry in a moment.", true));
      case "auth": return Promise.reject(new ExtractionError("AI service is not configured (invalid API key).", false));
      case "credits": return Promise.reject(new ExtractionError("The reading service is temporarily unavailable. Please retry later, or enter the details by hand.", true));
      case "refused": return Promise.reject(new ExtractionError("The document could not be read automatically. Please enter it manually.", false));
      case "too_long": return Promise.reject(new ExtractionError("The document is too long to read in one pass. Upload fewer pages.", false));
      case "invalid": return Promise.reject(new ExtractionError("The AI response could not be validated. Please retry.", true));
      case "network": return Promise.reject(new ExtractionError("Could not reach the AI service. Please retry.", true));
      default: return Promise.reject(new ExtractionError("We could not read this file. Try a clearer photo or a PDF, or enter the details by hand.", false));
    }
  }
}
