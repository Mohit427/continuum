import Link from "next/link";
import { ArrowRight, Siren } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ageFromDob } from "@/lib/auth-utils";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isActive, type Grant } from "@/lib/access";
import { LENS_BY_KEY } from "@/lib/kb/labs";
import { RequestForm, BreakGlassForm, CancelRequest } from "@/components/doctor/RequestForm";
import { LiveRefresh } from "@/components/doctor/LiveRefresh";
import { Chip, Empty, fmtDateTime, relTime, SectionTitle } from "@/components/ui";

export const metadata = { title: "My patients" };

const SPECIALTY_LENS: Record<string, string> = { Cardiology: "cardiology", Endocrinology: "endocrinology", Nephrology: "nephrology", Pulmonology: "pulmonology" };

export default async function DoctorHome({ searchParams }: PageProps<"/doctor">) {
  const { profile } = await requireRole("doctor");
  const sp = await searchParams;
  const sb = supabaseAdmin();
  const [{ data: grantsRaw }, { data: requests }, { data: checks }] = await Promise.all([
    sb.from("grants").select("*").eq("grantee_id", profile.id).order("created_at", { ascending: false }),
    sb.from("access_requests").select("id,purpose,status,created_at,responded_at,patient:profiles!access_requests_patient_id_fkey(full_name,health_id)").eq("doctor_id", profile.id).order("created_at", { ascending: false }).limit(10),
    sb.from("test_checks").select("saved_inr,reused").eq("doctor_id", profile.id),
  ]);
  const grants = (grantsRaw ?? []) as Grant[];
  const active = grants.filter(isActive);
  // one row per patient (newest active grant)
  const byPatient = new Map<string, Grant>();
  for (const g of active) if (!byPatient.has(g.patient_id)) byPatient.set(g.patient_id, g);
  const ids = [...byPatient.keys()];
  const [{ data: pats }, { data: alerts }] = ids.length
    ? await Promise.all([
        sb.from("profiles").select("id,full_name,dob,sex,health_id").in("id", ids),
        sb.from("alerts").select("patient_id,severity,cross_provider,status").in("patient_id", ids).in("status", ["open", "acknowledged"]),
      ])
    : [{ data: [] }, { data: [] }];
  const saved = (checks ?? []).reduce((s, c) => s + (c.saved_inr ?? 0), 0);
  const reused = (checks ?? []).filter((c) => c.reused).length;
  const ended = grants.filter((g) => !isActive(g) && !ids.includes(g.patient_id)).slice(0, 6);
  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const allFlags = alerts ?? [];
  const crossOpen = allFlags.filter((a) => a.cross_provider && a.status === "open").length;

  return (
    <div className="space-y-10">
      <LiveRefresh doctorId={profile.id} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">My patients</h1>
          <p className="text-ink-2 mt-1">Only patients who have shared their record with you appear here, for as long as they allow.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className={`inline-flex items-center gap-2 rounded-full px-3.5 min-h-10 ${crossOpen ? "bg-flag-soft text-flag" : "bg-sunk text-ink-2"}`}>
            <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] ${crossOpen ? "bg-flag text-on-brand" : "bg-rule text-ink-2"}`}>{crossOpen}</span>
            open cross-doctor flags
          </span>
          {reused > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-ok-soft px-3.5 min-h-10 text-ok">
              {reused} repeat test{reused === 1 ? "" : "s"} avoided · ₹{saved.toLocaleString("en-IN")} saved
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_420px]">
        <section className="min-w-0">
          {byPatient.size === 0 ? (
            <Empty title="No patients have shared with you yet">Ask your patient for their Health ID and send a request. They approve it on their phone, and the record opens here.</Empty>
          ) : (
            <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
              <table className="chart min-w-[680px]">
                <thead><tr><th>Patient</th><th>Shared</th><th>Flags</th><th>Access ends</th><th><span className="sr-only">Open</span></th></tr></thead>
                <tbody>
                  {[...byPatient.values()].map((g) => {
                    const p = pats?.find((x) => x.id === g.patient_id);
                    const f = allFlags.filter((a) => a.patient_id === g.patient_id);
                    const high = f.filter((a) => a.severity === "high").length;
                    return (
                      <tr key={g.id} className={g.kind === "break_glass" ? "bg-flag-soft" : undefined}>
                        <td>
                          <Link href={`/doctor/patients/${g.patient_id}`} className="font-semibold text-[1.05rem] text-brand hover:underline">{p?.full_name}</Link>
                          <div className="text-xs text-ink-2">{[ageFromDob(p?.dob ?? null) && `${ageFromDob(p?.dob ?? null)} y`, p?.sex, p?.health_id].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="max-w-[240px]">
                          {g.kind === "break_glass" ? <Chip tone="flag">Emergency access</Chip> : <Chip tone="brand">{(g.scope.categories as string[]).includes("all") ? "Full record" : `${g.scope.categories.length} categories`}{g.scope.lens && LENS_BY_KEY[g.scope.lens] && g.scope.lens !== "general" ? ` · ${LENS_BY_KEY[g.scope.lens].label}` : ""}</Chip>}
                          <div className="text-xs text-ink-2 mt-1">{g.purpose}</div>
                        </td>
                        <td>{f.length ? <span className="font-semibold">{high > 0 && <span className="text-flag">{high} high · </span>}{f.length} open</span> : <span className="text-ink-3">None</span>}</td>
                        <td className="whitespace-nowrap">{g.expires_at ? relTime(g.expires_at) : "—"}</td>
                        <td className="text-right"><Link href={`/doctor/patients/${g.patient_id}`} className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">Open <ArrowRight size={15} /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {pending.length > 0 && (
            <div className="mt-8">
              <SectionTitle sub="The patient sees these on their phone.">Waiting for the patient</SectionTitle>
              <ul className="divide-y divide-rule-soft border border-dashed border-brand-line rounded-2xl bg-raised">
                {pending.map((r) => {
                  const p = r.patient as unknown as { full_name: string; health_id: string } | null;
                  return (
                    <li key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <span><strong>{p?.full_name}</strong> <span className="text-ink-2 text-sm">· {r.purpose} · sent {relTime(r.created_at)}</span></span>
                      <span className="flex items-center gap-3"><Chip tone="brand" line="pending">Pending</Chip><CancelRequest id={r.id} /></span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {ended.length > 0 && (
            <div className="mt-8">
              <SectionTitle>Access that has ended</SectionTitle>
              <ul className="divide-y divide-rule-soft border border-rule rounded-2xl bg-raised">
                {ended.map((g) => (
                  <li key={g.id} className="px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="line-ended font-semibold">{g.purpose}</span>
                    <Chip tone="muted" line="ended">{g.revoked_at ? `Revoked by patient ${fmtDateTime(g.revoked_at)}` : `Expired ${fmtDateTime(g.expires_at)}`}</Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="border border-rule rounded-2xl bg-raised p-5">
            <h2 className="text-lg font-bold mb-3">Request access</h2>
            <RequestForm defaultLens={SPECIALTY_LENS[profile.specialty ?? ""] ?? null} />
          </section>
          <details className="border border-flag-line rounded-2xl bg-flag-soft p-5" open={typeof sp.breakglass === "string"}>
            <summary className="cursor-pointer text-lg font-semibold text-flag flex items-center gap-2"><Siren size={19} /> Emergency access</summary>
            <p className="text-sm text-ink-2 mt-2 mb-4">Only when the patient cannot consent. Full record for 1 hour, if the patient allows emergency access. Logged, and the patient is notified at once.</p>
            <BreakGlassForm initialHid={typeof sp.breakglass === "string" ? sp.breakglass : ""} />
          </details>
        </aside>
      </div>
    </div>
  );
}
