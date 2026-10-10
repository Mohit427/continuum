import { Clock, Eye } from "lucide-react";
import { AccessDenied, DENIED_COPY, resolveToken } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase/server";
import { applyScope, CATEGORY_LABEL, loadRecord, type Category } from "@/lib/data/record";
import { LENS_BY_KEY } from "@/lib/kb/labs";
import { ageFromDob } from "@/lib/auth-utils";
import { audit } from "@/lib/notify";
import { RecordView } from "@/components/record/RecordView";
import { SummaryPanel } from "@/components/SummaryPanel";
import { Denied, PublicShell } from "@/components/PublicShell";
import { Chip, fmtDateTime, relTime } from "@/components/ui";

export const metadata = { title: "Shared record", robots: { index: false, follow: false } };

/** Share-link viewer: no login. Scope, purpose and expiry enforced on the server; every view logged. */
export default async function SharedRecord({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  let grant;
  try {
    grant = await resolveToken(token, ["link", "caregiver"]);
  } catch (e) {
    const c = DENIED_COPY[e instanceof AccessDenied ? e.reason : "not_found"];
    return <PublicShell><Denied title={c.title} body={c.body} /></PublicShell>;
  }
  const rec = applyScope(await loadRecord(supabaseAdmin(), grant.patient_id), grant.scope);
  await audit({ patientId: grant.patient_id, grantId: grant.id, actorLabel: grant.label ? `${grant.kind === "caregiver" ? "Caregiver" : "Link"}: ${grant.label}` : "Share link", action: "view" });
  const cats = grant.scope.categories as string[];
  const p = rec.profile;
  const docHref = `/api/documents/{id}/file?t=${token}`;

  return (
    <PublicShell right={<span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-ink-2"><Eye size={16} /> Shared by the patient · view is logged</span>}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">{p.full_name}</h1>
          <p className="text-ink-2 mt-1">{[ageFromDob(p.dob) && `${ageFromDob(p.dob)} years`, p.sex === "F" ? "Female" : p.sex === "M" ? "Male" : null, p.blood_group && `Blood ${p.blood_group}`, p.health_id].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 text-[1.05rem]"><span className="text-ink-2">Shared for: </span><strong>{grant.purpose}</strong></p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <Chip tone="brand">{cats.includes("all") ? "Full record" : cats.map((c) => CATEGORY_LABEL[c as Category] ?? c).join(" · ")}{grant.scope.lens && LENS_BY_KEY[grant.scope.lens] && grant.scope.lens !== "general" ? ` · ${LENS_BY_KEY[grant.scope.lens].label}` : ""}</Chip>
          {grant.expires_at && <span className="text-sm text-ink-2 inline-flex items-center gap-1"><Clock size={14} /> Access ends {relTime(grant.expires_at)} ({fmtDateTime(grant.expires_at)})</span>}
        </div>
      </div>
      <RecordView
        rec={rec}
        docHref={docHref}
        canAct={false}
        summary={<SummaryPanel token={token} audience={grant.kind === "caregiver" ? "patient" : "clinician"} docHref={docHref} />}
      />
    </PublicShell>
  );
}
