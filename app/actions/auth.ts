"use server";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";

// Sign-in, demo sign-in and sign-up live in app/auth/[op]/route.ts (route handlers).

export async function logout() {
  const sb = await supabaseUser();
  await sb.auth.signOut();
  redirect("/");
}
