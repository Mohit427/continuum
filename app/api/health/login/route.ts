import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { demoEmail } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Temporary: runs the demo-login steps in a route handler and reports which step fails (no secrets returned). */
export async function GET() {
  const steps: Record<string, string> = {};
  try {
    const sb = await supabaseUser();
    steps.client = "ok";
    const { data, error } = await sb.auth.signInWithPassword({ email: demoEmail("lakshmi"), password: process.env.DEMO_PASSWORD! });
    steps.signin = error ? `error: ${error.message}` : "ok";
    if (data.user) {
      const { data: p, error: pe } = await supabaseAdmin().from("profiles").select("role").eq("id", data.user.id).single();
      steps.role = pe ? `error: ${pe.message}` : String(p?.role);
    }
    await sb.auth.signOut();
  } catch (e) {
    steps.thrown = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return NextResponse.json(steps, { headers: { "Cache-Control": "no-store" } });
}
