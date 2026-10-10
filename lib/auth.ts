import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin, supabaseUser } from "./supabase/server";

export type Role = "patient" | "doctor" | "lab";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string | null;
  dob: string | null;
  sex: string | null;
  blood_group: string | null;
  phone: string | null;
  health_id: string | null;
  emergency_contact: { name: string; relation: string; phone: string } | null;
  specialty: string | null;
  registration_no: string | null;
  organization: string | null;
  verified: boolean;
  emergency_settings: { break_glass: boolean };
}

/** Current user + profile, or null. Cached per request. */
export const getSession = cache(async () => {
  const sb = await supabaseUser();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) return null;
  return { user, profile };
});

export async function requireRole(role: Role) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.profile.role !== role) redirect(`/${s.profile.role}`);
  return s;
}

export { ageFromDob } from "./auth-utils";

const ALPH = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function makeHealthId(name: string, dob: string | null) {
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase().padEnd(2, "X");
  const yy = dob ? String(new Date().getFullYear() - new Date(dob).getFullYear()).padStart(2, "0") : "00";
  const rnd = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => ALPH[b % ALPH.length]).join("");
  return `CN-${initials}${yy}-${rnd}`;
}
