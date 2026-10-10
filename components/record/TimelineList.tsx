import { FileText, FlaskConical, Stethoscope, Hospital, PenLine } from "lucide-react";
import { Chip, fmtDate } from "../ui";
import type { PatientRecord } from "@/lib/data/record";

const KIND: Record<string, { label: string; Icon: typeof FileText }> = {
  consultation: { label: "Consultation", Icon: Stethoscope },
  lab: { label: "Lab test", Icon: FlaskConical },
  admission: { label: "Hospital stay", Icon: Hospital },
  imaging: { label: "Imaging", Icon: FileText },
};

/** Chronological history, newest first, grouped by year. Every entry links back to its source document. */
export function TimelineList({ rec, docHref, providerId, kind }: { rec: PatientRecord; docHref: string; providerId?: string; kind?: string }) {
  const prov = new Map(rec.providers.map((p) => [p.id, p]));
  const enc = [...rec.encounters]
    .filter((e) => (!providerId || e.provider_id === providerId) && (!kind || e.kind === kind))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!enc.length) return <p className="text-ink-2 border border-dashed border-rule rounded-xl px-5 py-6">No entries match.</p>;
  const years = [...new Set(enc.map((e) => e.date.slice(0, 4)))];

  return (
    <div className="space-y-8">
      {years.map((y) => (
        <section key={y} aria-labelledby={`y-${y}`}>
          <h2 id={`y-${y}`} className="text-sm font-bold text-ink-3 mb-3">{y}</h2>
          <ol className="relative border-l-[3px] border-brand ml-2.5 space-y-5">
            {enc.filter((e) => e.date.startsWith(y)).map((e) => {
              const p = e.provider_id ? prov.get(e.provider_id) : undefined;
              const fromDoc = (id: string | null) => (e.document_id ? id === e.document_id : false);
              const meds = rec.medications.filter((m) => (e.document_id ? fromDoc(m.source_document_id) : !m.source_document_id && m.start_date === e.date && m.prescriber_id === e.provider_id));
              const labs = rec.labs.filter((l) => fromDoc(l.source_document_id));
              const dx = rec.conditions.filter((c) => (e.document_id ? fromDoc(c.source_document_id) : !c.source_document_id && c.onset_date === e.date && c.provider_id === e.provider_id));
              const k = e.document_id ? KIND[e.kind] ?? KIND.consultation : { label: "Note in Continuum", Icon: PenLine };
              const flagged = labs.filter((l) => l.flag === "H" || l.flag === "L");
              return (
                <li key={e.id} className="pl-6 relative">
                  <span className="absolute -left-[11px] top-1.5 h-5 w-5 rounded-full border-[3px] border-brand bg-raised" aria-hidden />
                  <div className="rounded-2xl border border-rule bg-raised p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-[1.05rem] flex items-center gap-2"><k.Icon size={17} className="text-brand" aria-hidden /> {p?.name ?? "Unknown provider"} <span className="font-normal text-ink-2">· {p?.specialty ?? k.label}</span></p>
                      <span className="text-sm font-semibold text-ink-2">{fmtDate(e.date)}</span>
                    </div>
                    {e.complaints.length > 0 && <p className="mt-2 text-[0.97rem]"><span className="text-ink-2">Complaints: </span>{e.complaints.join(", ")}</p>}
                    {dx.length > 0 && <p className="mt-1 text-[0.97rem]"><span className="text-ink-2">Diagnosis: </span><strong>{dx.map((d) => d.name).join("; ")}</strong></p>}
                    {meds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {meds.map((m) => <Chip key={m.id} tone="pend">{m.raw_name}{m.duration_days ? ` × ${m.duration_days}d` : ""}</Chip>)}
                      </div>
                    )}
                    {labs.length > 0 && (
                      <p className="mt-2 text-sm text-ink-2">
                        {labs.filter((l) => l.category === "lab").length} results{flagged.length ? <>: <span className="text-flag font-semibold">{flagged.map((l) => `${l.test_name} ${l.value} ${l.unit ?? ""} (${l.flag === "H" ? "high" : "low"})`).join(", ")}</span></> : ", all in range"}
                      </p>
                    )}
                    {e.notes && <p className="mt-2 text-sm text-ink-2 italic">“{e.notes}”</p>}
                    {e.document_id && (
                      <a href={docHref.replace("{id}", e.document_id)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><FileText size={14} /> Original document</a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
