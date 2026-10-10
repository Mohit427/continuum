import { requireRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LabUpload } from "@/components/lab/LabUpload";
import { Chip, Empty, fmtDateTime, SectionTitle } from "@/components/ui";

export const metadata = { title: "Send reports" };

const STATUS: Record<string, { label: string; tone: "ok" | "brand" | "warn" | "flag" | "muted"; line?: "pending" }> = {
  confirmed: { label: "Added by patient", tone: "ok" },
  pending_patient: { label: "With patient", tone: "brand", line: "pending" },
  processing: { label: "Reading", tone: "muted", line: "pending" },
  uploaded: { label: "Uploaded", tone: "muted", line: "pending" },
  failed: { label: "Could not read", tone: "flag" },
};

/** Labs push reports straight into the patient's record (by Health ID); the patient confirms before it counts. */
export default async function LabHome() {
  const { profile } = await requireRole("lab");
  const { data: sent } = await supabaseAdmin().from("documents").select("id,file_name,status,created_at,patient:profiles!documents_patient_id_fkey(full_name,health_id)").eq("uploaded_by", profile.id).order("created_at", { ascending: false }).limit(30);
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Send reports to patients</h1>
        <p className="text-ink-2 mt-1 max-w-prose">Upload the report PDF once. It lands in the patient's record, already read and structured, and joins the results from every other lab they use.</p>
      </div>
      <section className="border border-rule rounded-2xl bg-raised p-5"><LabUpload /></section>
      <section>
        <SectionTitle>Sent by {profile.full_name}</SectionTitle>
        {!sent?.length ? <Empty title="No reports sent yet" /> : (
          <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
            <table className="chart min-w-[560px]">
              <thead><tr><th>Sent</th><th>Patient</th><th>File</th><th>Status</th></tr></thead>
              <tbody>
                {sent.map((d) => {
                  const p = d.patient as unknown as { full_name: string; health_id: string } | null;
                  const s = STATUS[d.status] ?? STATUS.uploaded;
                  return (
                    <tr key={d.id}>
                      <td className="whitespace-nowrap">{fmtDateTime(d.created_at)}</td>
                      <td><span className="font-semibold">{p?.full_name}</span><div className="text-xs text-ink-2">{p?.health_id}</div></td>
                      <td className="text-ink-2">{d.file_name}</td>
                      <td><Chip tone={s.tone} line={s.line}>{s.label}</Chip></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
