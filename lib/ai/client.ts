import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

/**
 * One structured-output call, two providers:
 * - OpenRouter (OPENROUTER_API_KEY set): OpenAI-compatible chat completions with a JSON schema.
 * - Anthropic (ANTHROPIC_API_KEY): Messages API with Zod-parsed structured output.
 * Either way the result is validated against the same Zod schema before it is used.
 */

export type Part = { type: "text"; text: string } | { type: "image"; mime: string; base64: string } | { type: "pdf"; base64: string };

export class AIError extends Error {
  constructor(message: string, public kind: "busy" | "auth" | "credits" | "bad_input" | "refused" | "too_long" | "invalid" | "network", public status?: number) { super(message); }
}

export const PROVIDER: "openrouter" | "anthropic" = process.env.OPENROUTER_API_KEY ? "openrouter" : "anthropic";
export const MODEL = PROVIDER === "openrouter" ? process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5.5" : process.env.EXTRACTION_MODEL || "claude-opus-5-5";

export async function structured<S extends z.ZodType>(opts: { schema: S; name: string; system: string; parts: Part[]; maxTokens: number; effort: "low" | "medium" }): Promise<{ data: z.infer<S>; model: string }> {
  return PROVIDER === "openrouter" ? viaOpenRouter(opts) : viaAnthropic(opts);
}

/* ---------- OpenRouter ---------- */

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

function orContent(parts: Part[]) {
  return parts.map((p, i) =>
    p.type === "text" ? { type: "text", text: p.text }
    : p.type === "image" ? { type: "image_url", image_url: { url: `data:${p.mime};base64,${p.base64}` } }
    : { type: "file", file: { filename: `document-${i + 1}.pdf`, file_data: `data:application/pdf;base64,${p.base64}` } },
  );
}

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch {
    const a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("not json");
  }
}

/** One retry for transient upstream failures (rate limits, 5xx, a provider hiccup behind OpenRouter's routing). */
async function orCall(body: Record<string, unknown>) {
  try {
    return await orCallOnce(body);
  } catch (e) {
    if (e instanceof AIError && (e.kind === "busy" || (e.kind === "bad_input" && /provider returned error/i.test(e.message)))) {
      await new Promise((r) => setTimeout(r, 800));
      return orCallOnce(body);
    }
    throw e;
  }
}

async function orCallOnce(body: Record<string, unknown>) {
  let res: Response;
  try {
    res = await fetch(OR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Continuum",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110_000),
    });
  } catch {
    throw new AIError("Could not reach the AI service.", "network");
  }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string; code?: number; metadata?: { raw?: string } }; choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[]; model?: string } | null;
  if (!res.ok || json?.error) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    const status = json?.error?.code ?? res.status;
    console.error("openrouter:", status, msg, json?.error?.metadata?.raw?.slice(0, 400) ?? "");
    if (status === 401 || status === 403) throw new AIError("AI service is not configured (invalid API key).", "auth", status);
    if (status === 402) throw new AIError("The AI account has no credits left.", "credits", status);
    if (status === 429 || status >= 500) throw new AIError("The AI service is busy.", "busy", status);
    throw new AIError(msg, "bad_input", status);
  }
  return json!;
}

async function viaOpenRouter<S extends z.ZodType>({ schema, system, parts, maxTokens }: { schema: S; system: string; parts: Part[]; maxTokens: number }) {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
  const sys = `${system}\n\nRespond with a single JSON object that matches this JSON Schema exactly, and nothing else:\n${JSON.stringify(jsonSchema)}`;
  const base: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature: 0,
    messages: [{ role: "system", content: sys }, { role: "user", content: orContent(parts) }],
    plugins: parts.some((p) => p.type === "pdf") ? [{ id: "file-parser", pdf: { engine: "native" } }] : undefined,
  };

  let messages = base.messages as unknown[];
  for (let attempt = 0; attempt < 2; attempt++) {
    // No response_format: provider-side constrained decoding caps nullable fields (16), and the extraction
    // schema has more. The schema travels in the prompt and every reply is validated (and repaired once) below.
    const json = await orCall({ ...base, messages });
    const choice = json.choices?.[0];
    if (choice?.message?.refusal) throw new AIError("The model declined to read this document.", "refused");
    if (choice?.finish_reason === "length") throw new AIError("The document is too long to read in one pass.", "too_long");
    const text = choice?.message?.content ?? "";
    let parsed: unknown;
    try { parsed = parseJson(text); } catch { parsed = undefined; }
    const ok = parsed === undefined ? null : schema.safeParse(parsed);
    if (ok?.success) return { data: ok.data as z.infer<S>, model: json.model ?? MODEL };
    // one repair round with the validation errors
    messages = [...(base.messages as unknown[]), { role: "assistant", content: text }, { role: "user", content: `That was not valid against the schema${ok ? `: ${ok.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` : " (not parseable JSON)"}. Reply again with only the corrected JSON object.` }];
  }
  throw new AIError("The AI response could not be validated.", "invalid");
}

/* ---------- Plain chat (assistant) ---------- */

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function chat({ system, messages, maxTokens = 700 }: { system: string; messages: ChatTurn[]; maxTokens?: number }): Promise<string> {
  if (PROVIDER === "openrouter") {
    const json = await orCall({ model: MODEL, max_tokens: maxTokens, temperature: 0.2, messages: [{ role: "system", content: system }, ...messages] });
    return (json.choices?.[0]?.message?.content ?? "").trim();
  }
  try {
    const r = await anthropic().messages.create({ model: MODEL, max_tokens: maxTokens, system, messages });
    return r.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  } catch (e) {
    if (e instanceof Anthropic.APIError) throw new AIError(`AI service error (${e.status}).`, e.status === 401 ? "auth" : "busy", e.status);
    throw new AIError("Could not reach the AI service.", "network");
  }
}

/* ---------- Anthropic ---------- */

let _client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 2 });
  return _client;
}

async function viaAnthropic<S extends z.ZodType>({ schema, system, parts, maxTokens, effort }: { schema: S; system: string; parts: Part[]; maxTokens: number; effort: "low" | "medium" }) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = parts.map((p) =>
    p.type === "text" ? { type: "text", text: p.text }
    : p.type === "pdf" ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: p.base64 } }
    : { type: "image", source: { type: "base64", media_type: p.mime as "image/png", data: p.base64 } },
  );
  let response;
  try {
    response = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output_config: { effort, format: betaZodOutputFormat(schema as any) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AIError("The AI service is busy.", "busy", 429);
    if (e instanceof Anthropic.AuthenticationError) throw new AIError("AI service is not configured (invalid API key).", "auth", 401);
    if (e instanceof Anthropic.BadRequestError) {
      console.error("anthropic: bad request", e.message);
      if (/credit balance/i.test(e.message)) throw new AIError("The AI account has no credits left.", "credits", 400);
      throw new AIError(e.message, "bad_input", 400);
    }
    if (e instanceof Anthropic.APIError) throw new AIError(`AI service error (${e.status}).`, "busy", e.status);
    throw new AIError("Could not reach the AI service.", "network");
  }
  if (response.stop_reason === "refusal") throw new AIError("The model declined to read this document.", "refused");
  if (response.stop_reason === "max_tokens") throw new AIError("The document is too long to read in one pass.", "too_long");
  if (!response.parsed_output) throw new AIError("The AI response could not be validated.", "invalid");
  return { data: response.parsed_output as z.infer<S>, model: response.model };
}
