import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { seedAll } from "@/lib/seed/run";

export const maxDuration = 120;
let lastRun = 0;

/** Re-seed the demo accounts so judges always start from a clean, known state. Touches demo accounts only. */
export async function POST() {
  if (!process.env.DEMO_PASSWORD) return NextResponse.json({ error: "Demo not configured" }, { status: 500 });
  if (Date.now() - lastRun < 60_000) return NextResponse.json({ error: "The demo was reset less than a minute ago." }, { status: 429 });
  lastRun = Date.now();
  try {
    await seedAll(supabaseAdmin(), { password: process.env.DEMO_PASSWORD });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Reset failed" }, { status: 500 });
  }
}
