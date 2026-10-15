import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { SLOT_COOKIE } from "@/lib/supabase/slot";
import { makeHealthId, type Role } from "@/lib/auth";
import { demoEmail } from "@/lib/demo";

/**
 * Sign-in, demo sign-in and sign-up as route handlers (session cookies are set on this response).
 * login/signup answer JSON ({ to } or { error }) for the client forms; demo answers a 303 redirect,
 * so the demo buttons work as plain HTML forms.
 */

const HOME: Record<Role, string> = { patient: "/patient", doctor: "/doctor", lab: "/lab" };
const DEMO = new Set(["lakshmi", "arjun", "dr.iyer", "dr.menon", "citycare"]);

async function roleOf(userId: string): Promise<Role> {
  const { data } = await supabaseAdmin().from("profiles").select("role").eq("id", userId).single();
  return (data?.role ?? "patient") as Role;
}

/**
 * Sign in without touching any existing session, then store the new session in the cookie of the
 * account's role slot. A doctor signing in therefore never signs out the patient in another tab.
 */
async function signIn(email: string, password: string): Promise<Role | null> {
  const tmp = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  const role = await roleOf(data.session.user.id);
  const sb = await supabaseUser(role);
  const { error: setErr } = await sb.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  if (setErr) return null;
  (await cookies()).set(SLOT_COOKIE, role, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return role;
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

export async function POST(req: Request, ctx: RouteContext<"/auth/[op]">) {
  const { op } = await ctx.params;
  const form = await req.formData();
  // The client forms send x-auth-fetch and get JSON; a plain HTML submission (no JS yet) gets a redirect instead.
  const viaFetch = req.headers.get("x-auth-fetch") === "1";
  const back = op === "signup" ? `/signup?role=${encodeURIComponent(String(form.get("role") ?? "patient"))}` : `/login${form.get("next") ? `?next=${encodeURIComponent(String(form.get("next")))}` : ""}`;
  const json = (body: { to?: string; error?: string }) =>
    viaFetch
      ? NextResponse.json(body, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.redirect(new URL(body.to ?? `${back}${back.includes("?") ? "&" : "?"}error=form`, req.url), 303);

  if (op === "demo") {
    const account = String(form.get("account") ?? "");
    let to = "/login?error=demo";
    if (DEMO.has(account)) {
      const role = await signIn(demoEmail(account), process.env.DEMO_PASSWORD ?? "");
      if (role) to = HOME[role];
    }
    return NextResponse.redirect(new URL(to, req.url), 303);
  }

  if (op === "login") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const next = String(form.get("next") ?? "");
    if (!email || !password) return json({ error: "Enter your email and password." });
    const role = await signIn(email, password);
    if (!role) return json({ error: "Email or password is incorrect." });
    return json({ to: next.startsWith(HOME[role]) ? next : HOME[role] });
  }

  if (op === "signup") {
    const raw = Object.fromEntries(form.entries());
    const base = Base.safeParse(raw);
    if (!base.success) return json({ error: base.error.issues[0].message });
    const { role, full_name, email, password } = base.data;
    const extra = role === "patient" ? PatientFields.safeParse(raw) : ProFields.safeParse(raw);
    if (!extra.success) return json({ error: extra.error.issues[0].message });

    const admin = supabaseAdmin();
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role } });
    if (error || !created.user) return json({ error: error?.message?.includes("already") ? "An account with this email already exists." : "Could not create the account." });

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
      return json({ error: "Could not create the profile. Please try again." });
    }
    if (role === "patient") {
      await admin.from("notifications").insert({ user_id: created.user.id, type: "welcome", title: "Welcome to Continuum", body: "Start by uploading a prescription or lab report.", link: "/patient/records" });
    }
    await signIn(email, password);
    return json({ to: HOME[role] });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
