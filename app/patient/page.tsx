import Link from "next/link";
import { FileUp, ArrowRight, Phone } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { loadRecord, toTimeline } from "@/lib/data/record";
import { buildCareMap } from "@/lib/data/caremap";
import { activeProblems, currentMeds, stations } from "@/lib/data/views";
import { CareMap } from "@/components/caremap/CareMap";
import { MedTable } from "@/components/record/MedTable";
import { SummaryPanel } from "@/components/SummaryPanel";
import { buttonClass, Chip, SectionTitle } from "@/components/ui";
import { ageFromDob } from "@/lib/auth";

export const metadata = { title: "Overview" };
const DOC = "/api/documents/{id}/file";

export default async function PatientHome() {
  const { profile } = await requireRole("patient");
  const rec = await loadRecord(await supabaseUser(), profile.id, profile);
  const { data: requests } = await supabaseAdmin().from("access_requests").select("id, purpose, doctor:profiles!access_requests_doctor_id_fkey(full_name,specialty)").eq("patient_id", profile.id).eq("status", "pending");

  const toReview = rec.documents.filter((d) => d.status === "needs_review" || d.status === "pending_patient");
  const st = stations(rec);

  const age = profile.dob ? ageFromDob(profile.dob) : null;
  const meds = currentMeds(rec);
  const problems = activeProblems(rec.conditions).filter((c) => c.status !== "resolved");
  const ec = profile.emergency_contact;
  const sexLabel = profile.sex === "F" ? "Female" : profile.sex === "M" ? "Male" : profile.sex ?? "Not recorded";

  return (
    <div className="space-y-10">
      <section aria-labelledby="me-h" className="rounded-2xl border border-rule bg-raised p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 id="me-h" className="text-[1.6rem] sm:text-[1.85rem] leading-tight">{profile.full_name}</h1>
            <p className="text-ink-3 text-sm mt-0.5">Health ID <span className="font-semibold text-ink-2">{profile.health_id}</span></p>
          </div>
          <Link href="/patient/records" className={buttonClass("primary")}><FileUp size={17} /> Add a record</Link>
        </div>
        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 border-t border-rule-soft pt-5">
          <Fact label="Age">{age !== null ? `${age} years` : "Not recorded"}</Fact>
          <Fact label="Sex">{sexLabel}</Fact>
          <Fact label="Blood group">{profile.blood_group ?? "Not recorded"}</Fact>
          <Fact label="Allergies" tone={rec.allergies.length ? "flag" : undefined}>
            {rec.allergies.length ? rec.allergies.map((a) => a.substance).join(", ") : "None recorded"}
          </Fact>
          <Fact label="Long-term conditions" wide>
            {problems.length ? <>{problems.slice(0, 4).map((c) => c.name).join(", ")}{problems.length > 4 ? <span className="text-ink-3 font-normal"> +{problems.length - 4} more</span> : null}</> : "None recorded"}
          </Fact>
          <Fact label="Emergency contact" wide>
            {ec?.name ? <a href={`tel:${(ec.phone ?? "").replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brand"><Phone size={14} className="text-ink-3" aria-hidden /> {ec.name}{ec.relation ? ` (${ec.relation})` : ""}{ec.phone ? ` · ${ec.phone}` : ""}</a> : <Link href="/patient/emergency" className="text-brand">Add one</Link>}
          </Fact>
        </dl>
      </section>

      {((requests ?? []).length > 0 || toReview.length > 0) && (
        <div className="flex flex-wrap gap-2 -mt-4">
          {(requests ?? []).map((r) => {
            const d = r.doctor as unknown as { full_name: string; specialty: string | null } | null;
            return (
              <Link key={r.id} href="/patient/sharing" className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 min-h-10 text-sm font-semibold text-brand hover:bg-brand hover:text-on-brand transition-colors">
                {d?.full_name} asks to see your record <ArrowRight size={15} />
              </Link>
            );
          })}
          {toReview.length > 0 && (
            <Link href={`/patient/records/${toReview[0].id}/review`} className="inline-flex items-center gap-2 rounded-full bg-pend-soft px-3.5 min-h-10 text-sm font-semibold text-pend-ink hover:bg-pend transition-colors">
              {toReview.length} record{toReview.length === 1 ? "" : "s"} to check <ArrowRight size={15} />
            </Link>
          )}
        </div>
      )}

      <CareMap
        spotsFirst
        map={buildCareMap(toTimeline(rec), st)}
        alerts={rec.alerts}
        docHref={DOC}
        providerHref="/patient/timeline?provider="
        between={
          <section>
            <SectionTitle sub="Built from your prescriptions. Tell us if you stopped one." action={<Chip tone="brand">{meds.length} continuing</Chip>}>Your prescriptions</SectionTitle>
            <MedTable meds={meds} docHref={DOC} canEdit />
          </section>
        }
      />

      <SummaryPanel audience="patient" docHref={DOC} title="Your record in plain words" />
    </div>
  );
}

function Fact({ label, children, tone, wide }: { label: string; children: React.ReactNode; tone?: "flag"; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs font-semibold text-ink-3">{label}</dt>
      <dd className={tone === "flag" ? "mt-0.5 font-semibold text-flag" : "mt-0.5 font-semibold"}>{children}</dd>
    </div>
  );
}
