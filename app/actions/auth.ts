"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { makeHealthId, type Role } from "@/lib/auth";
import { demoEmail } from "@/lib/seed/run";

export type FormState = { error?: string; ok?: string } | undefined;

const HOME: Record<Role, string> = { patient: "/patient", doctor: "/doctor", lab: "/lab" };

async function roleOf(userId: string): Promise<Role> {
  const { data } = await supabaseAdmin().from("profiles").select("role").eq("id", userId).single();
  return (data?.role ?? "patient") as Role;
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const sb = await supabaseUser();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email or password is incorrect." };
  const role = await roleOf(data.user.id);
  redirect(next.startsWith(HOME[role]) ? next : HOME[role]);
}

const DEMO = new Set(["lakshmi", "arjun", "dr.iyer", "dr.menon", "citycare"]);

/** One-click demo login for judges: no setup, no typing. */
export async function demoLogin(account: string) {
  if (!DEMO.has(account)) throw new Error("Unknown demo account");
  const sb = await supabaseUser();
  const { data, error } = await sb.auth.signInWithPassword({ email: demoEmail(account), password: process.env.DEMO_PASSWORD! });
  if (error || !data.user) redirect("/login?error=demo");
  redirect(HOME[await roleOf(data.user.id)]);
}

export async function logout() {
  const sb = await supabaseUser();
  await sb.auth.signOut();
  redirect("/");
}

const Base = z.object({
  role: z.enum(["patient", "doctor", "lab"]),
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.email("Enter a valid email").transform((s) => s.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const PatientFields = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
  sex: z.enum(["F", "M", "O"]),
  blood_group: z.string().max(4).optional(),
  phone: z.string().max(20).optional(),
  ec_name: z.string().max(60).optional(),
  ec_relation: z.string().max(30).optional(),
  ec_phone: z.string().max(20).optional(),
});
const ProFields = z.object({
  organization: z.string().trim().min(2, "Enter your clinic / lab name").max(100),
  registration_no: z.string().trim().min(3, "Enter your registration / accreditation number").max(40),
  specialty: z.string().max(60).optional(),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(form.entries());
  const base = Base.safeParse(raw);
  if (!base.success) return { error: base.error.issues[0].message };
  const { role, full_name, email, password } = base.data;
  const extra = role === "patient" ? PatientFields.safeParse(raw) : ProFields.safeParse(raw);
  if (!extra.success) return { error: extra.error.issues[0].message };

  const admin = supabaseAdmin();
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
  if (error || !created.user) return { error: error?.message?.includes("already") ? "An account with this email already exists." : "Could not create the account." };

  const e = extra.data as Record<string, string | undefined>;
  const profile =
    role === "patient"
      ? {
          dob: e.dob, sex: e.sex, blood_group: e.blood_group || null, phone: e.phone || null, health_id: makeHealthId(full_name, e.dob ?? null),
          emergency_contact: e.ec_name ? { name: e.ec_name, relation: e.ec_relation ?? "", phone: e.ec_phone ?? "" } : null,
        }
      : { organization: e.organization, registration_no: e.registration_no, specialty: role === "doctor" ? e.specialty || "General Physician" : null };
  const { error: pErr } = await admin.from("profiles").insert({ id: created.user.id, role, full_name, email, ...profile });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not create the profile. Please try again." };
  }
  if (role === "patient") {
    await admin.from("notifications").insert({ user_id: created.user.id, type: "welcome", title: "Welcome to Continuum", body: "Start by uploading a prescription or lab report.", link: "/patient/records" });
  }
  const sb = await supabaseUser();
  await sb.auth.signInWithPassword({ email, password });
  redirect(HOME[role]);
}
