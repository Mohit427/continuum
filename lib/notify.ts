import "server-only";
import { headers } from "next/headers";
import { supabaseAdmin } from "./supabase/server";

export async function notify(userId: string, n: { type: string; title: string; body?: string; link?: string }) {
  await supabaseAdmin().from("notifications").insert({ user_id: userId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null });
}

/** Append-only audit log entry. */
export async function audit(entry: { patientId: string; grantId?: string | null; actorId?: string | null; actorLabel: string; action: string; detail?: string }) {
  let ip: string | null = null, ua: string | null = null;
  try {
    const h = await headers();
    ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip");
    ua = h.get("user-agent");
  } catch { /* outside a request */ }
  await supabaseAdmin().from("access_logs").insert({
    patient_id: entry.patientId, grant_id: entry.grantId ?? null, actor_id: entry.actorId ?? null, actor_label: entry.actorLabel,
    action: entry.action, detail: entry.detail ?? null, ip, user_agent: ua,
  });
}
