import { appUrl } from "@/lib/auth-utils";
import { requireRole } from "@/lib/auth";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { loadRecord } from "@/lib/data/record";
import { emergencyData } from "@/lib/data/emergency";
import { decryptToken } from "@/lib/crypto";
import { EmergencyCard } from "@/components/emergency/EmergencyCard";
import { CardSettings, PrintButton, SaveOffline } from "@/components/emergency/CardTools";
import { fmtDateTime, SectionTitle } from "@/components/ui";

export const metadata = { title: "Emergency card" };

export default async function Emergency() {
  const { profile } = await requireRole("patient");
  const sb = supabaseAdmin();
  const [rec, { data: grant }, { data: scans }] = await Promise.all([
    loadRecord(await supabaseUser(), profile.id, profile),
    sb.from("grants").select("id,token_enc").eq("patient_id", profile.id).eq("kind", "emergency").is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("access_logs").select("at,actor_label,ip,action").eq("patient_id", profile.id).in("action", ["emergency_scan", "break_glass"]).order("at", { ascending: false }).limit(8),
  ]);
  const token = grant?.token_enc ? decryptToken(grant.token_enc) : null;
  const url = token ? `${appUrl()}/e/${token}` : null;

  return (
    <div className="space-y-10">
      <div className="no-print">
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Emergency card</h1>
        <p className="text-ink-2 mt-1 max-w-prose">If you can't speak for yourself, this tells a doctor what matters in the first minutes. Print it for your wallet, or keep it on your phone. Scanning it shows only this card, never your full record.</p>
      </div>
      <EmergencyCard d={emergencyData(rec)} url={url} />
      <div className="no-print flex flex-wrap gap-2 justify-center">
        <PrintButton />
        {token && <SaveOffline url={`/e/${token}`} />}
        {url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-11 px-4 font-semibold text-brand hover:underline">Open as a doctor would see it</a>}
      </div>
      <div className="no-print grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle sub="These appear on the card. Medicines, allergies and conditions come from your records.">Card details</SectionTitle>
          <CardSettings blood={profile.blood_group} contact={profile.emergency_contact} breakGlass={!!profile.emergency_settings?.break_glass} />
        </section>
        <section>
          <SectionTitle sub="You get a notification every time.">Recent emergency access</SectionTitle>
          {scans?.length ? (
            <ul className="divide-y divide-rule-soft border border-rule rounded-2xl bg-raised">
              {scans.map((s, i) => <li key={i} className="px-4 py-3"><span className="font-semibold">{s.actor_label}</span><span className="block text-sm text-ink-2">{fmtDateTime(s.at)}{s.ip ? ` · ${s.ip}` : ""}</span></li>)}
            </ul>
          ) : <p className="text-ink-2 border border-dashed border-rule rounded-xl px-5 py-6">Your card has not been scanned.</p>}
        </section>
      </div>
    </div>
  );
}
