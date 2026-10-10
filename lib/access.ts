import "server-only";
import { headers } from "next/headers";
import { supabaseAdmin } from "./supabase/server";
import { hashToken } from "./crypto";
import type { Scope } from "./data/record";

export interface Grant {
  id: string; patient_id: string; kind: "doctor" | "link" | "emergency" | "caregiver" | "break_glass"; grantee_id: string | null;
  label: string | null; token_hash: string | null; token_enc: string | null; scope: Scope; purpose: string;
  expires_at: string | null; revoked_at: string | null; created_from_request: string | null; created_at: string;
}

export const isActive = (g: Pick<Grant, "revoked_at" | "expires_at">) => !g.revoked_at && (!g.expires_at || Date.parse(g.expires_at) > Date.now());

export class AccessDenied extends Error {
  constructor(public reason: "none" | "expired" | "revoked" | "not_found" | "rate_limited") {
    super(reason);
  }
}

/**
 * The single gate for clinician access: returns the doctor's active grant for this patient
 * (break-glass beats a scoped grant), or throws AccessDenied.
 */
export async function getDoctorAccess(doctorId: string, patientId: string): Promise<Grant> {
  const { data } = await supabaseAdmin().from("grants").select("*").eq("patient_id", patientId).eq("grantee_id", doctorId)
    .in("kind", ["doctor", "break_glass"]).order("created_at", { ascending: false });
  const grants = (data ?? []) as Grant[];
  const active = grants.filter(isActive);
  if (active.length) return active.find((g) => g.kind === "break_glass") ?? active[0];
  if (grants.some((g) => g.revoked_at)) throw new AccessDenied("revoked");
  if (grants.length) throw new AccessDenied("expired");
  throw new AccessDenied("none");
}

// Simple fixed-window limiter for public token routes (per server instance).
const hits = new Map<string, { n: number; at: number }>();
async function rateLimit(bucket: string, max = 30, windowMs = 60_000) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  const k = `${bucket}:${ip}`, now = Date.now();
  const e = hits.get(k);
  if (!e || now - e.at > windowMs) hits.set(k, { n: 1, at: now });
  else if (++e.n > max) throw new AccessDenied("rate_limited");
}

/** Resolve a public share / emergency token to its grant. */
export async function resolveToken(token: string, kinds: Grant["kind"][]): Promise<Grant> {
  await rateLimit("token");
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(token)) throw new AccessDenied("not_found");
  const { data } = await supabaseAdmin().from("grants").select("*").eq("token_hash", hashToken(token)).maybeSingle<Grant>();
  if (!data || !kinds.includes(data.kind)) throw new AccessDenied("not_found");
  if (data.revoked_at) throw new AccessDenied("revoked");
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) throw new AccessDenied("expired");
  return data;
}

export const DENIED_COPY: Record<AccessDenied["reason"], { title: string; body: string }> = {
  none: { title: "No access", body: "This patient has not shared their record with you. Send an access request using their Health ID." },
  expired: { title: "Access expired", body: "The time-limited access the patient granted has ended. Request access again if you still need it." },
  revoked: { title: "Access revoked", body: "The patient has withdrawn access to this record." },
  not_found: { title: "Link not valid", body: "This link does not exist or has been replaced. Ask the patient for a new one." },
  rate_limited: { title: "Too many attempts", body: "Please wait a minute and try again." },
};
