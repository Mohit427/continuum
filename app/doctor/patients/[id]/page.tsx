import Link from "next/link";
import { ArrowLeft, Clock, Siren } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { ageFromDob } from "@/lib/auth-utils";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { AccessDenied, DENIED_COPY, getDoctorAccess } from "@/lib/access";
import { applyScope, CATEGORY_LABEL, loadRecord, type Category } from "@/lib/data/record";
import { LENS_BY_KEY } from "@/lib/kb/labs";
import { audit } from "@/lib/notify";
import { RecordView } from "@/components/record/RecordView";
import { SummaryPanel } from "@/components/SummaryPanel";
import { TestChecker } from "@/components/doctor/TestChecker";
import { NoteForm } from "@/components/doctor/NoteForm";
import { LiveRefresh, ExpiryWatch } from "@/components/doctor/LiveRefresh";
import { Denied } from "@/components/PublicShell";
import { Chip, fmtDateTime, relTime, SectionTitle } from "@/components/ui";

export const metadata = { title: "Patient" };

export default async function DoctorPatient({ params }: PageProps<"/doctor/patients/[id]">) {
  const { id } = await params;
  const { profile } = await requireRole("doctor");
  let grant;
  try {
    grant = await getDoctorAccess(profile.id, id);
  } catch (e) {
    const c = DENIED_COPY[e instanceof AccessDenied ? e.reason : "none"];
    return (
      <>
        <LiveRefresh doctorId={profile.id} patientId={id} />
        <Link href="/doctor" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={15} /> My patients</Link>
        <Denied title={c.title} body={c.body} />
      </>
    );
  }
  // Read with the doctor's own session: Postgres RLS enforces the grant, then the scope/lens is applied.
  const rec = applyScope(await loadRecord(await supabaseUser(), id), grant.scope);
  await audit({ patientId: id, grantId: grant.id, actorId: profile.id, actorLabel: `${profile.full_name} (${profile.specialty ?? "Doctor"})`, action: "view", detail: grant.kind === "break_glass" ? "Emergency access" : grant.purpose });
  const { data: checks } = await supabaseAdmin().from("test_checks").select("saved_inr").eq("patient_id", id);
  const saved = (checks ?? []).reduce((s, c) => s + (c.saved_inr ?? 0), 0);
  const cats = grant.scope.categories as string[];
  const p = rec.profile;
  const bg = grant.kind === "break_glass";
  const docHref = "/api/documents/{id}/file";

  return (
    <div>
      <LiveRefresh doctorId={profile.id} patientId={id} />
      <ExpiryWatch expiresAt={grant.expires_at} />
      <Link href="/doctor" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={15} /> My patients</Link>
      {bg && (
        <p className="mt-3 rounded-xl bg-flag text-on-brand px-4 py-3 flex items-center gap-2 font-semibold"><Siren size={18} /> Emergency access: {grant.purpose.replace(/^EMERGENCY:\s*/, "")}. Ends {relTime(grant.expires_at!)}. The patient has been notified.</p>
      )}
      <div className="mt-3 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">{p.full_name}</h1>
          <p className="text-ink-2 mt-1 text-[1.05rem]">{[ageFromDob(p.dob) && `${ageFromDob(p.dob)} years`, p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : null, p.blood_group && `Blood ${p.blood_group}`, p.health_id].filter(Boolean).join(" · ")}</p>
          {!bg && <p className="mt-1"><span className="text-ink-2">Shared for: </span><strong>{grant.purpose}</strong></p>}
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <Chip tone={bg ? "flag" : "brand"}>{cats.includes("all") ? "Full record" : cats.map((c) => CATEGORY_LABEL[c as Category] ?? c).join(" · ")}{grant.scope.lens && grant.scope.lens !== "general" && LENS_BY_KEY[grant.scope.lens] ? ` · ${LENS_BY_KEY[grant.scope.lens].label} lens` : ""}</Chip>
          {grant.expires_at && <span className="text-sm text-ink-2 inline-flex items-center gap-1"><Clock size={14} /> Access ends {relTime(grant.expires_at)} · {fmtDateTime(grant.expires_at)}</span>}
        </div>
      </div>

      <RecordView
        rec={rec}
        docHref={docHref}
        canAct={cats.includes("all") || cats.includes("alerts")}
        summary={<SummaryPanel patientId={id} audience="clinician" docHref={docHref} title="Five-minute summary" />}
        side={<TestChecker patientId={id} savedInr={saved} />}
        tools={
          <section className="border border-rule rounded-2xl bg-raised p-5">
            <SectionTitle sub="Saved to the patient's timeline with your name. Safety checks re-run immediately.">Add a visit note</SectionTitle>
            <NoteForm patientId={id} />
          </section>
        }
      />
    </div>
  );
}
