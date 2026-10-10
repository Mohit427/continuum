"use client";
import { useTransition } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { Chip, fmtDate } from "../ui";
import { setMedicationStatus } from "@/app/actions/documents";
import type { CurrentMed } from "@/lib/data/views";
import { GROUPS, groupOf } from "@/lib/kb/groups";

export function MedTable({ meds, docHref, canEdit }: { meds: CurrentMed[]; docHref: string; canEdit?: boolean }) {
  const [pending, start] = useTransition();
  if (!meds.length) return <p className="text-ink-2 border border-dashed border-rule rounded-xl px-5 py-6">No current medicines on record.</p>;
  return (
    <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
      <table className="chart min-w-[640px]">
        <thead><tr><th>Medicine</th><th>How to take</th><th>Since</th><th>Prescribed by</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {meds.map((m) => (
            <tr key={m.id}>
              <td>
                <div className="font-semibold flex items-center gap-2">
                  <span className="swatch" style={{ background: GROUPS[groupOf(m.drugClass)].color }} title={GROUPS[groupOf(m.drugClass)].label} />
                  {m.name}
                  {m.critical && <span title="Safety-critical in an emergency"><AlertTriangle size={14} className="text-flag" aria-label="Safety-critical" /></span>}
                </div>
                <div className="text-xs text-ink-2 pl-[1.2rem]">{m.generic ? `${m.generic}${m.classLabel ? ` · ${m.classLabel}` : ""}` : <Chip tone="warn">Not in dictionary</Chip>}</div>
              </td>
              <td className="text-ink-2">{m.frequency ?? "—"}</td>
              <td className="whitespace-nowrap">{fmtDate(m.since)}</td>
              <td>
                {m.prescribers.join(", ")}
                {m.prescribers.length > 1 && <div><Chip tone="flag" className="mt-1">{m.prescribers.length} prescribers</Chip></div>}
              </td>
              <td className="text-right whitespace-nowrap">
                {m.documentId && (
                  <a href={docHref.replace("{id}", m.documentId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline mr-3" aria-label={`Source prescription for ${m.name}`}>
                    <FileText size={14} /> Source
                  </a>
                )}
                {canEdit && (
                  <button disabled={pending} onClick={() => { if (confirm(`Mark ${m.name} as stopped today? Your record will update and safety checks will re-run.`)) start(() => setMedicationStatus(m.id, "stopped")); }} className="text-sm font-semibold text-ink-2 hover:text-flag disabled:opacity-50">
                    I stopped this
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
