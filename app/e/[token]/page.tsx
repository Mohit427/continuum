import Link from "next/link";
import { AccessDenied, DENIED_COPY, resolveToken } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/server";
import { applyScope, loadRecord } from "@/lib/data/record";
import { emergencyData } from "@/lib/data/emergency";
import { audit, notify } from "@/lib/notify";
import { EmergencyCard } from "@/components/emergency/EmergencyCard";
import { SaveOffline } from "@/components/emergency/CardTools";
import { Denied, PublicShell } from "@/components/PublicShell";
import { buttonClass } from "@/components/ui";

export const metadata = { title: "Emergency card", robots: { index: false, follow: false } };

/** Public emergency card: no login, minimal data, every scan logged and the patient notified. */
export default async function EmergencyScan({ params }: PageProps<"/e/[token]">) {
  const { token } = await params;
  let grant;
  try {
    grant = await resolveToken(token, ["emergency"]);
  } catch (e) {
    const c = DENIED_COPY[e instanceof AccessDenied ? e.reason : "not_found"];
    return <PublicShell><Denied title={c.title} body={c.body} /></PublicShell>;
  }
  const sb = supabaseAdmin();
  const rec = applyScope(await loadRecord(sb, grant.patient_id), grant.scope);

  // Log every scan; notify the patient at most once per 10 minutes per card.
  const { data: recent } = await sb.from("access_logs").select("id").eq("grant_id", grant.id).eq("action", "emergency_scan").gte("at", new Date(Date.now() - 600_000).toISOString()).limit(1);
  await audit({ patientId: grant.patient_id, grantId: grant.id, actorLabel: "Emergency card scan", action: "emergency_scan" });
  if (!recent?.length) await notify(grant.patient_id, { type: "break_glass", title: "Your emergency card was just scanned", body: "If this wasn't expected, check your access log.", link: "/patient/access-log" });

  return (
    <PublicShell right={<span className="text-sm text-ink-2">Emergency view</span>}>
      <div className="space-y-6">
        <EmergencyCard d={emergencyData(rec)} />
        <div className="no-print max-w-[860px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <SaveOffline url={`/e/${token}`} auto />
          <Link href={`/login?next=/doctor`} className={buttonClass("ghost")}>Doctor? Sign in for emergency full access</Link>
        </div>
        <p className="no-print max-w-[860px] mx-auto text-sm text-ink-2">This scan was recorded and {rec.profile.full_name.split(" ")[0]} has been notified. Health ID for full-access requests: <strong className="text-ink">{rec.profile.health_id}</strong></p>
      </div>
    </PublicShell>
  );
}
