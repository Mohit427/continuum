import { appUrl } from "@/lib/auth-utils";
import Link from "next/link";
import { Download, ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isActive, type Grant } from "@/lib/access";
import { decryptToken } from "@/lib/crypto";
import { CATEGORY_LABEL, type Category } from "@/lib/data/record";
import { LENS_BY_KEY } from "@/lib/kb/labs";
import { RequestCard, type ReqView } from "@/components/sharing/RequestCard";
import { ShareForm } from "@/components/sharing/ShareForm";
import { GrantActions } from "@/components/sharing/GrantActions";
import { buttonClass, Chip, Empty, fmtDateTime, relTime, SectionTitle } from "@/components/ui";

export const metadata = { title: "Sharing" };

const KIND: Record<Grant["kind"], string> = { doctor: "Doctor", link: "Link / QR", caregiver: "Caregiver", emergency: "Emergency card", break_glass: "Emergency access" };

function scopeText(g: Grant) {
  const c = g.scope.categories as string[];
  const what = c.includes("all") ? "Full record" : c.map((x) => CATEGORY_LABEL[x as Category] ?? x).join(", ");
  const lens = g.scope.lens && g.scope.lens !== "general" && LENS_BY_KEY[g.scope.lens] ? ` · ${LENS_BY_KEY[g.scope.lens].label} lens` : "";
  return what + lens;
}

export default async function Sharing() {
  const { profile } = await requireRole("patient");
  const sb = supabaseAdmin();
  const [{ data: reqs }, { data: grantsRaw }, { data: grantees }] = await Promise.all([
    sb.from("access_requests").select("id,purpose,created_at,duration_hours,requested_scope, doctor:profiles!access_requests_doctor_id_fkey(full_name,specialty,organization,registration_no,verified)").eq("patient_id", profile.id).eq("status", "pending").order("created_at", { ascending: false }),
    sb.from("grants").select("*").eq("patient_id", profile.id).neq("kind", "emergency").order("created_at", { ascending: false }),
    sb.from("profiles").select("id,full_name,specialty,organization").in("role", ["doctor"]),
  ]);
  const grants = (grantsRaw ?? []) as Grant[];
  const who = (g: Grant) => {
    const d = grantees?.find((p) => p.id === g.grantee_id);
    return d ? `${d.full_name}${d.specialty ? ` · ${d.specialty}` : ""}` : g.label ?? KIND[g.kind];
  };
  const active = grants.filter(isActive);
  const ended = grants.filter((g) => !isActive(g)).slice(0, 12);
  const base = appUrl();

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Sharing</h1>
          <p className="text-ink-2 mt-1 max-w-prose">You decide who sees what, for how long. Access ends on its own, or the moment you revoke it.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/patient/access-log" className={buttonClass("secondary")}><ScrollText size={18} /> Who opened my record</Link>
          <a href="/api/fhir" className={buttonClass("secondary")}><Download size={18} /> Download everything (FHIR)</a>
        </div>
      </div>

      <section>
        <SectionTitle sub="Doctors who asked to see your record using your Health ID.">Requests</SectionTitle>
        {(reqs ?? []).length === 0 ? (
          <Empty title="No requests waiting">Doctors can request access with your Health ID: <strong className="text-ink">{profile.health_id}</strong></Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{(reqs as unknown as ReqView[]).map((r) => <RequestCard key={r.id} r={r} />)}</div>
        )}
      </section>

      <section>
        <SectionTitle sub="Everyone who can open your record right now.">Who can see your record</SectionTitle>
        {active.length === 0 ? (
          <Empty title="Nobody has access right now" />
        ) : (
          <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
            <table className="chart min-w-[720px]">
              <thead><tr><th>Who</th><th>Can see</th><th>Reason</th><th>Ends</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {active.map((g) => {
                  const tok = g.token_enc && (g.kind === "link" || g.kind === "caregiver") ? decryptToken(g.token_enc) : null;
                  return (
                    <tr key={g.id} className={g.kind === "break_glass" ? "bg-flag-soft" : undefined}>
                      <td><span className="font-semibold">{who(g)}</span><div className="mt-1"><Chip tone={g.kind === "break_glass" ? "flag" : g.kind === "doctor" ? "brand" : "pend"}>{KIND[g.kind]}</Chip></div></td>
                      <td className="max-w-[280px]">{scopeText(g)}</td>
                      <td className="text-ink-2 max-w-[260px]">{g.purpose}</td>
                      <td className="whitespace-nowrap">{g.expires_at ? <>{relTime(g.expires_at)}<div className="text-xs text-ink-2">{fmtDateTime(g.expires_at)}</div></> : "No end date"}</td>
                      <td><GrantActions id={g.id} who={who(g)} url={tok ? `${base}/s/${tok}` : null} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="border border-rule rounded-2xl p-5 bg-raised">
          <SectionTitle sub="For a doctor who isn't on Continuum: they open the link or scan the QR, no login.">Share with a link or QR</SectionTitle>
          <ShareForm kind="link" />
        </section>
        <section className="border border-rule rounded-2xl p-5 bg-raised">
          <SectionTitle sub="A family member who helps manage your care can view your full record.">Add a caregiver</SectionTitle>
          <ShareForm kind="caregiver" />
        </section>
      </div>

      {ended.length > 0 && (
        <section>
          <SectionTitle>Ended access</SectionTitle>
          <ul className="divide-y divide-rule-soft border border-rule rounded-2xl bg-raised">
            {ended.map((g) => (
              <li key={g.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <span><span className="line-ended font-semibold">{who(g)}</span> <span className="text-sm text-ink-2">· {scopeText(g)}</span></span>
                <Chip tone="muted" line="ended">{g.revoked_at ? `Revoked ${fmtDateTime(g.revoked_at)}` : `Expired ${fmtDateTime(g.expires_at)}`}</Chip>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
