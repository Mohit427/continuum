"use server";
import { appUrl } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/data/record";
import { LENS_BY_KEY } from "@/lib/kb/labs";
import { encryptToken, hashToken, newToken } from "@/lib/crypto";
import { audit, notify } from "@/lib/notify";
import { isActive, type Grant } from "@/lib/access";

const ScopeInput = z.object({
  categories: z.array(z.enum([...CATEGORIES, "all"])).min(1, "Choose at least one category"),
  lens: z.string().nullable().optional().refine((l) => !l || !!LENS_BY_KEY[l], "Unknown specialty lens"),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const HOURS = z.number().int().min(1).max(24 * 365);

async function patient() {
  const s = await getSession();
  if (!s || s.profile.role !== "patient") throw new Error("Not allowed");
  return s;
}
async function doctor() {
  const s = await getSession();
  if (!s || s.profile.role !== "doctor") throw new Error("Not allowed");
  return s;
}
const doctorLabel = (p: { full_name: string; specialty: string | null }) => `${p.full_name}${p.specialty ? ` (${p.specialty})` : ""}`;

// ───────────── Doctor → patient access request ─────────────
export async function requestAccess(input: { healthId: string; purpose: string; categories: string[]; lens: string | null; hours: number }): Promise<{ error?: string; ok?: string }> {
  const s = await doctor();
  const scope = ScopeInput.safeParse({ categories: input.categories, lens: input.lens });
  if (!scope.success) return { error: scope.error.issues[0].message };
  if (!HOURS.safeParse(input.hours).success) return { error: "Choose a valid duration." };
  const purpose = input.purpose.trim();
  if (purpose.length < 3) return { error: "Describe the purpose of access (e.g. 'Cardiology consultation')." };
  const sb = supabaseAdmin();
  const { data: p } = await sb.from("profiles").select("id,full_name").eq("health_id", input.healthId.trim().toUpperCase()).eq("role", "patient").maybeSingle();
  if (!p) return { error: "No patient found with that Health ID. Check the code on their Continuum card." };
  const { data: pending } = await sb.from("access_requests").select("id").eq("doctor_id", s.profile.id).eq("patient_id", p.id).eq("status", "pending").maybeSingle();
  if (pending) return { error: "You already have a pending request with this patient." };
  await sb.from("access_requests").insert({ doctor_id: s.profile.id, patient_id: p.id, requested_scope: scope.data, purpose: purpose.slice(0, 160), duration_hours: input.hours });
  await notify(p.id, { type: "access_request", title: `${doctorLabel(s.profile)} is requesting access to your records`, body: purpose, link: "/patient/sharing" });
  revalidatePath("/doctor");
  return { ok: `Request sent to ${p.full_name}. You will see the record as soon as they approve.` };
}

export async function cancelRequest(id: string) {
  const s = await doctor();
  await supabaseAdmin().from("access_requests").update({ status: "cancelled", responded_at: new Date().toISOString() }).eq("id", id).eq("doctor_id", s.profile.id).eq("status", "pending");
  revalidatePath("/doctor");
}

/** Patient approves (optionally narrowing scope / duration) or denies a request. */
export async function respondRequest(input: { id: string; approve: boolean; categories?: string[]; lens?: string | null; hours?: number }): Promise<{ error?: string }> {
  const s = await patient();
  const sb = supabaseAdmin();
  const { data: r } = await sb.from("access_requests").select("*, doctor:profiles!access_requests_doctor_id_fkey(full_name,specialty)").eq("id", input.id).eq("patient_id", s.profile.id).eq("status", "pending").single();
  if (!r) return { error: "This request is no longer pending." };
  const now = new Date().toISOString();
  if (!input.approve) {
    await sb.from("access_requests").update({ status: "denied", responded_at: now }).eq("id", r.id);
    await notify(r.doctor_id, { type: "access_denied", title: `${s.profile.full_name} declined your access request`, link: "/doctor" });
    revalidatePath("/patient", "layout");
    return {};
  }
  // The patient can only narrow what was asked for, never widen it.
  const asked = r.requested_scope as z.infer<typeof ScopeInput>;
  const askedCats = asked.categories.includes("all") ? [...CATEGORIES] : asked.categories;
  const cats = (input.categories ?? askedCats).filter((c) => askedCats.includes(c as (typeof CATEGORIES)[number]) || askedCats.includes("all" as never));
  const scope = ScopeInput.safeParse({ categories: cats.length === CATEGORIES.length ? ["all"] : cats, lens: input.lens === undefined ? asked.lens ?? null : input.lens });
  if (!scope.success) return { error: scope.error.issues[0].message };
  const hours = Math.min(input.hours ?? r.duration_hours, r.duration_hours);
  const { data: g } = await sb.from("grants").insert({
    patient_id: s.profile.id, kind: "doctor", grantee_id: r.doctor_id, label: r.doctor?.full_name ?? "Doctor", scope: scope.data,
    purpose: r.purpose, expires_at: new Date(Date.now() + hours * 3_600_000).toISOString(), created_from_request: r.id,
  }).select("id").single();
  await sb.from("access_requests").update({ status: "approved", responded_at: now, grant_id: g!.id }).eq("id", r.id);
  await notify(r.doctor_id, { type: "access_granted", title: `${s.profile.full_name} approved your request`, body: `Access for ${hours < 48 ? `${hours} hours` : `${Math.round(hours / 24)} days`}.`, link: `/doctor/patients/${s.profile.id}` });
  revalidatePath("/patient", "layout");
  return {};
}

/** Revoke any grant immediately. Doctor views subscribed via realtime drop access at once. */
export async function revokeGrant(id: string) {
  const s = await patient();
  const sb = supabaseAdmin();
  const { data: g } = await sb.from("grants").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("patient_id", s.profile.id).is("revoked_at", null).select("*").single<Grant>();
  if (g) {
    await audit({ patientId: s.profile.id, grantId: g.id, actorId: s.profile.id, actorLabel: s.profile.full_name, action: "revoke", detail: g.label ?? g.kind });
    if (g.grantee_id) await notify(g.grantee_id, { type: "access_revoked", title: `${s.profile.full_name} revoked your access`, link: "/doctor" });
  }
  revalidatePath("/patient", "layout");
}

/** Share link / QR (or caregiver link): scoped, purpose-bound, expiring. Token shown once, stored hashed + encrypted. */
export async function createLink(input: { label: string; purpose: string; categories: string[]; lens: string | null; hours: number; kind: "link" | "caregiver" }): Promise<{ error?: string; url?: string }> {
  const s = await patient();
  const scope = ScopeInput.safeParse({ categories: input.categories, lens: input.lens });
  if (!scope.success) return { error: scope.error.issues[0].message };
  if (!HOURS.safeParse(input.hours).success) return { error: "Choose a valid duration." };
  if (input.label.trim().length < 2) return { error: input.kind === "caregiver" ? "Enter the caregiver's name." : "Give the link a name (e.g. 'Dr. at Apollo ER')." };
  const token = newToken();
  await supabaseAdmin().from("grants").insert({
    patient_id: s.profile.id, kind: input.kind, label: input.label.trim().slice(0, 60), token_hash: hashToken(token), token_enc: encryptToken(token),
    scope: scope.data, purpose: input.purpose.trim().slice(0, 160) || (input.kind === "caregiver" ? "Caregiver access" : "Consultation"),
    expires_at: new Date(Date.now() + input.hours * 3_600_000).toISOString(),
  });
  revalidatePath("/patient/sharing");
  return { url: `${appUrl()}/s/${token}` };
}

/** Rotate the emergency card token (old printed cards stop working). */
export async function regenerateEmergencyCard() {
  const s = await patient();
  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  await sb.from("grants").update({ revoked_at: now }).eq("patient_id", s.profile.id).eq("kind", "emergency").is("revoked_at", null);
  const token = newToken();
  await sb.from("grants").insert({
    patient_id: s.profile.id, kind: "emergency", label: "Emergency card", token_hash: hashToken(token), token_enc: encryptToken(token),
    scope: { categories: ["allergies", "medications", "conditions"], lens: "emergency" }, purpose: "Emergency access (pre-authorised by patient)", expires_at: null,
  });
  await audit({ patientId: s.profile.id, actorId: s.profile.id, actorLabel: s.profile.full_name, action: "emergency_card_rotated" });
  revalidatePath("/patient/emergency");
}

export async function setBreakGlass(enabled: boolean) {
  const s = await patient();
  await supabaseAdmin().from("profiles").update({ emergency_settings: { ...s.profile.emergency_settings, break_glass: enabled } }).eq("id", s.profile.id);
  revalidatePath("/patient/emergency");
}

export async function updateEmergencyInfo(input: { blood_group: string; ec_name: string; ec_relation: string; ec_phone: string }) {
  const s = await patient();
  await supabaseAdmin().from("profiles").update({
    blood_group: input.blood_group.slice(0, 4) || null,
    emergency_contact: input.ec_name ? { name: input.ec_name.slice(0, 60), relation: input.ec_relation.slice(0, 30), phone: input.ec_phone.slice(0, 20) } : null,
  }).eq("id", s.profile.id);
  revalidatePath("/patient", "layout");
}

/**
 * Break-glass: a verified doctor in an emergency gets 1 hour of full access without prior consent,
 * with a mandatory reason. Only if the patient allows it; always logged; patient notified instantly.
 */
export async function breakGlass(input: { healthId: string; reason: string }): Promise<{ error?: string; patientId?: string }> {
  const s = await doctor();
  if (input.reason.trim().length < 10) return { error: "Describe the emergency (at least 10 characters). This is recorded and shown to the patient." };
  const sb = supabaseAdmin();
  const { data: p } = await sb.from("profiles").select("id,full_name,emergency_settings").eq("health_id", input.healthId.trim().toUpperCase()).eq("role", "patient").maybeSingle();
  if (!p) return { error: "No patient found with that Health ID." };
  if (!p.emergency_settings?.break_glass) return { error: "This patient has not allowed emergency (break-glass) access. Use their emergency card instead." };
  const { data: g } = await sb.from("grants").insert({
    patient_id: p.id, kind: "break_glass", grantee_id: s.profile.id, label: s.profile.full_name, scope: { categories: ["all"], lens: "general" },
    purpose: `EMERGENCY: ${input.reason.trim().slice(0, 200)}`, expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  }).select("id").single();
  await audit({ patientId: p.id, grantId: g!.id, actorId: s.profile.id, actorLabel: doctorLabel(s.profile), action: "break_glass", detail: input.reason.trim() });
  await notify(p.id, { type: "break_glass", title: `EMERGENCY ACCESS: ${doctorLabel(s.profile)} opened your full record`, body: input.reason.trim(), link: "/patient/access-log" });
  return { patientId: p.id };
}

export async function activeGrantFor(patientId: string) {
  const s = await doctor();
  const { data } = await supabaseAdmin().from("grants").select("*").eq("patient_id", patientId).eq("grantee_id", s.profile.id);
  return ((data ?? []) as Grant[]).some(isActive);
}
