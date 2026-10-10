import Link from "next/link";
import { FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { loadRecord } from "@/lib/data/record";
import { Uploader } from "@/components/record/Uploader";
import { RetryButton } from "@/components/record/RetryButton";
import { buttonClass, Chip, Empty, fmtDate, SectionTitle } from "@/components/ui";

export const metadata = { title: "Records" };

const TYPE: Record<string, string> = { prescription: "Prescription", lab_report: "Lab report", discharge_summary: "Discharge summary", imaging_report: "Imaging report", other: "Document" };

export default async function Records({ searchParams }: PageProps<"/patient/records">) {
  const { profile } = await requireRole("patient");
  const sp = await searchParams;
  const rec = await loadRecord(await supabaseUser(), profile.id, profile);
  const prov = new Map(rec.providers.map((p) => [p.id, p]));
  const docs = [...rec.documents].sort((a, b) => (b.doc_date ?? b.created_at).localeCompare(a.doc_date ?? a.created_at));
  const waiting = docs.filter((d) => ["needs_review", "pending_patient", "failed", "processing", "uploaded"].includes(d.status));
  const confirmed = docs.filter((d) => d.status === "confirmed");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Records</h1>
        <p className="text-ink-2 mt-1">Every prescription and report you add becomes part of one history, with the original always one tap away.</p>
      </div>
      {sp.confirmed && (
        <p role="status" className="rounded-xl border border-ok-line bg-ok-soft px-4 py-3 font-semibold text-ok">Added to your history. Safety checks have been re-run across all your records.</p>
      )}
      <Uploader />

      {waiting.length > 0 && (
        <section>
          <SectionTitle sub="Nothing here is in your history until you confirm it.">Waiting for you</SectionTitle>
          <ul className="divide-y divide-rule-soft border border-rule rounded-2xl bg-raised">
            {waiting.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <FileText size={20} className="text-ink-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{d.file_name ?? "Document"}</p>
                  <p className="text-sm text-ink-2">
                    {d.source === "lab" ? "Sent by your lab · " : ""}Uploaded {fmtDate(d.created_at)}
                    {d.status === "failed" && d.error ? <span className="text-flag"> · {d.error.includes("{") ? "We could not read this file yet. Try reading it again." : d.error}</span> : null}
                  </p>
                </div>
                {d.status === "needs_review" || d.status === "pending_patient" ? (
                  <>
                    {d.name_mismatch && <Chip tone="flag">Name differs</Chip>}
                    {d.duplicate_of && <Chip tone="warn">Possible copy</Chip>}
                    <Link href={`/patient/records/${d.id}/review`} className={buttonClass("primary", "sm")}>Check &amp; confirm</Link>
                  </>
                ) : d.status === "failed" || d.status === "uploaded" ? (
                  <RetryButton docId={d.id} />
                ) : (
                  <Chip tone="brand" line="pending">Reading…</Chip>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle sub={`${confirmed.length} confirmed record${confirmed.length === 1 ? "" : "s"}, newest first`}>Your history</SectionTitle>
        {confirmed.length === 0 ? (
          <Empty title="No records yet">Add your first prescription or lab report above. A photo of the paper is enough.</Empty>
        ) : (
          <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
            <table className="chart min-w-[640px]">
              <thead><tr><th>Date</th><th>Type</th><th>From</th><th>Contents</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>
                {confirmed.map((d) => {
                  const p = d.provider_id ? prov.get(d.provider_id) : undefined;
                  const meds = rec.medications.filter((m) => m.source_document_id === d.id).length;
                  const labs = rec.labs.filter((l) => l.source_document_id === d.id && l.category === "lab").length;
                  return (
                    <tr key={d.id}>
                      <td className="whitespace-nowrap font-semibold">{fmtDate(d.doc_date)}</td>
                      <td><Chip tone={d.doc_type === "lab_report" ? "brand" : "pend"}>{TYPE[d.doc_type ?? "other"]}</Chip></td>
                      <td>{p?.name ?? d.facility ?? "—"}<div className="text-xs text-ink-2">{p?.specialty}</div></td>
                      <td className="text-ink-2">{[meds && `${meds} medicine${meds > 1 ? "s" : ""}`, labs && `${labs} result${labs > 1 ? "s" : ""}`].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="text-right whitespace-nowrap">
                        <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline mr-4">Original</a>
                        <Link href={`/patient/records/${d.id}/review`} className="text-sm font-semibold text-ink-2 hover:text-brand">Edit</Link>
                      </td>
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
