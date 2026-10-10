import { NextResponse } from "next/server";
import { supabaseUser } from "@/lib/supabase/server";

/** Latest notifications for the signed-in user (RLS-scoped). Polling fallback when Realtime is unavailable. */
export async function GET() {
  const sb = await supabaseUser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data } = await sb.from("notifications").select("id,title,body,link,read_at,created_at,type").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}
