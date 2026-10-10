import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Deployment health: which settings are present (never their values) and whether Supabase answers. */
export async function GET() {
  const env = Object.fromEntries(
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OPENROUTER_API_KEY", "ANTHROPIC_API_KEY", "DEMO_PASSWORD", "NEXT_PUBLIC_APP_URL"].map((k) => [k, !!process.env[k]]),
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const checks: Record<string, string> = { url_shape: /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url) ? "ok" : "unexpected" };
  try {
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
    const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" });
    checks.service_key = error ? `error: ${error.message}` : "ok";
  } catch (e) { checks.service_key = `throws: ${e instanceof Error ? e.message : "?"}`; }
  return NextResponse.json({ env, checks }, { headers: { "Cache-Control": "no-store" } });
}
