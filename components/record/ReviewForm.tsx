"use client";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { matchDrug } from "@/lib/kb/match";
import { matchLab } from "@/lib/kb/labs";
import { CLASS_LABEL } from "@/lib/kb/drugs";
import type { Extraction } from "@/lib/ingest/schema";
import type { Issue } from "@/lib/ingest/normalize";
import { confirmDocument, discardDocument } from "@/app/actions/documents";
import { Button, cn } from "../ui";

const LOW = 0.8;

export function ReviewForm({ id, initial, issues, patientName, nameMismatch, duplicate, readOnly }: {
  id: string; initial: Extraction; issues: Issue[]; patientName: string; nameMismatch: boolean; duplicate: boolean; readOnly?: boolean;
}) {
  const [x, setX] = useState<Extraction>(initial);
  const [nameOk, setNameOk] = useState(!nameMismatch);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Extraction>(k: K, v: Extraction[K]) => setX((p) => ({ ...p, [k]: v }));
  const issueFor = (field: string) => issues.filter((i) => i.field === field);
  const general = issues.filter((i) => !/^(medications|labs)\.\d+$/.test(i.field));

  const meds = useMemo(() => x.medications.map((m) => matchDrug(m.name)), [x.medications]);

  const submit = () => {
    setError(null);
    if (!nameOk) { setError(`Confirm this document belongs to ${patientName}, or discard it.`); return; }
    if (!x.document_date) { setError("Enter the date on the document."); return; }
    // Corrected fields are now human-verified.
    const verified: Extraction = {
      ...x,
      document_date_confidence: 1, patient_name_confidence: 1, doctor_confidence: 1, overall_confidence: Math.max(x.overall_confidence, 0.9),
      medications: x.medications.filter((m) => m.name.trim()).map((m) => ({ ...m, confidence: 1 })),
      labs: x.labs.filter((l) => l.test.trim()).map((l) => ({ ...l, confidence: 1 })),
      diagnoses: x.diagnoses.filter((d) => d.name.trim()).map((d) => ({ ...d, confidence: 1 })),
      allergies: x.allergies.filter((a) => a.substance.trim()),
      complaints: x.complaints.map((c) => c.trim()).filter(Boolean),
    };
    start(async () => {
      const r = await confirmDocument(id, JSON.stringify(verified));
      if (r?.error) setError(r.error);
    });
  };

  return (
    <div className="space-y-6">
      {(general.length > 0 || nameMismatch || duplicate) && (
        <div className="rounded-xl border border-warn-line bg-warn-soft px-4 py-3 space-y-1.5" role="status">
          {general.map((i, k) => (
            <p key={k} className="flex gap-2 text-sm"><AlertTriangle size={16} className="text-warn shrink-0 mt-0.5" aria-hidden />{i.message}</p>
          ))}
        </div>
      )}
      {nameMismatch && (
        <label className="flex gap-3 items-start rounded-xl border border-flag-line bg-flag-soft px-4 py-3 cursor-pointer">
          <input type="checkbox" className="mt-1.5 h-5 w-5 accent-flag" checked={nameOk} onChange={(e) => setNameOk(e.target.checked)} disabled={readOnly} />
          <span><strong>This is my document.</strong> <span className="text-ink-2">The name reads “{x.patient_name}”. Records of another person must not enter your history.</span></span>
        </label>
      )}

      <fieldset disabled={readOnly || pending} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="label">Type</span>
            <select className="field" value={x.doc_type} onChange={(e) => set("doc_type", e.target.value as Extraction["doc_type"])}>
              <option value="prescription">Prescription</option><option value="lab_report">Lab report</option><option value="discharge_summary">Discharge summary</option><option value="imaging_report">Imaging report</option><option value="other">Other</option>
            </select>
          </label>
          <label className="block"><span className="label">Date on the document</span>
            <input type="date" className={cn("field", initial.document_date_confidence < LOW && "low")} value={x.document_date ?? ""} onChange={(e) => set("document_date", e.target.value || null)} />
          </label>
          <label className="block"><span className="label">{x.doc_type === "lab_report" ? "Lab" : "Doctor"}</span>
            <input className={cn("field", initial.doctor_confidence < LOW && "low")} value={(x.doc_type === "lab_report" ? x.facility : x.doctor_name) ?? ""} onChange={(e) => set(x.doc_type === "lab_report" ? "facility" : "doctor_name", e.target.value || null)} />
          </label>
          <label className="block"><span className="label">{x.doc_type === "lab_report" ? "City / branch" : "Specialty"}</span>
            <input className="field" value={(x.doc_type === "lab_report" ? "" : x.doctor_specialty) ?? ""} placeholder={x.doc_type === "lab_report" ? "Optional" : "e.g. Cardiology"} onChange={(e) => x.doc_type !== "lab_report" && set("doctor_specialty", e.target.value || null)} />
          </label>
          {x.doc_type !== "lab_report" && (
            <label className="block sm:col-span-2"><span className="label">Clinic / hospital</span>
              <input className="field" value={x.facility ?? ""} onChange={(e) => set("facility", e.target.value || null)} />
            </label>
          )}
        </div>

        {(x.doc_type !== "lab_report" || x.medications.length > 0) && (
          <section>
            <h3 className="text-lg font-semibold mb-2">Medicines</h3>
            <div className="space-y-3">
              {x.medications.map((m, i) => {
                const hit = meds[i];
                const low = m.confidence < LOW || !hit || !hit.exact;
                return (
                  <div key={i} className={cn("rounded-xl border p-3", low ? "border-warn-line bg-warn-soft" : "border-rule bg-raised")}>
                    <div className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_90px_auto] items-end">
                      <label><span className="label">Name as written</span><input className={cn("field", low && "low")} value={m.name} onChange={(e) => set("medications", x.medications.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} /></label>
                      <label><span className="label">Strength</span><input className="field" value={m.strength ?? ""} onChange={(e) => set("medications", x.medications.map((y, j) => (j === i ? { ...y, strength: e.target.value || null } : y)))} /></label>
                      <label><span className="label">How often</span><input className="field" value={m.frequency ?? ""} onChange={(e) => set("medications", x.medications.map((y, j) => (j === i ? { ...y, frequency: e.target.value || null } : y)))} /></label>
                      <label><span className="label">Days</span><input className="field" inputMode="numeric" value={m.duration_days ?? ""} placeholder="ongoing" onChange={(e) => set("medications", x.medications.map((y, j) => (j === i ? { ...y, duration_days: e.target.value ? Math.max(1, parseInt(e.target.value) || 1) : null } : y)))} /></label>
                      <button type="button" onClick={() => set("medications", x.medications.filter((_, j) => j !== i))} className="h-11 w-11 grid place-items-center rounded-xl text-ink-2 hover:bg-flag-soft hover:text-flag" aria-label={`Remove ${m.name}`}><Trash2 size={18} /></button>
                    </div>
                    <p className="mt-1.5 text-sm">
                      {hit ? (
                        <span className={hit.exact ? "text-ok" : "text-warn"}>→ {hit.drug.generic} · {CLASS_LABEL[hit.drug.class]}{!hit.exact && " (closest match, please check spelling)"}</span>
                      ) : (
                        <span className="text-warn">Not recognised. It will be saved as written but not used in safety checks.</span>
                      )}
                      {m.confidence < LOW && <span className="text-warn"> · hard to read on the page</span>}
                    </p>
                  </div>
                );
              })}
              <Button type="button" variant="secondary" size="sm" onClick={() => set("medications", [...x.medications, { name: "", strength: null, dose: null, frequency: null, duration_days: null, instructions: null, confidence: 1 }])}><Plus size={15} /> Add medicine</Button>
            </div>
          </section>
        )}

        {(x.doc_type === "lab_report" || x.labs.length > 0) && (
          <section>
            <h3 className="text-lg font-semibold mb-2">Results</h3>
            <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
              <table className="chart min-w-[560px]">
                <thead><tr><th>Test</th><th>Value</th><th>Unit</th><th>Reference</th><th /></tr></thead>
                <tbody>
                  {x.labs.map((l, i) => {
                    const def = matchLab(l.test);
                    const upd = (p: Partial<typeof l>) => set("labs", x.labs.map((y, j) => (j === i ? { ...y, ...p } : y)));
                    return (
                      <tr key={i} className={l.confidence < LOW ? "bg-warn-soft" : undefined}>
                        <td><input className={cn("field", l.confidence < LOW && "low")} value={l.test} onChange={(e) => upd({ test: e.target.value })} /><span className="text-xs text-ink-2">{def ? `→ ${def.name} · LOINC ${def.loinc}` : "Not mapped"}</span></td>
                        <td><input className={cn("field w-24", l.confidence < LOW && "low")} inputMode="decimal" value={l.value ?? l.value_text ?? ""} onChange={(e) => { const v = e.target.value; const n = Number(v); upd(v !== "" && Number.isFinite(n) ? { value: n, value_text: null } : { value: null, value_text: v || null }); }} /></td>
                        <td><input className="field w-24" value={l.unit ?? ""} onChange={(e) => upd({ unit: e.target.value || null })} /></td>
                        <td><input className="field w-28" value={l.ref_range ?? ""} onChange={(e) => upd({ ref_range: e.target.value || null })} /></td>
                        <td><button type="button" onClick={() => set("labs", x.labs.filter((_, j) => j !== i))} className="h-11 w-11 grid place-items-center rounded-xl text-ink-2 hover:bg-flag-soft hover:text-flag" aria-label={`Remove ${l.test}`}><Trash2 size={18} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => set("labs", [...x.labs, { test: "", value: null, value_text: null, unit: null, ref_range: null, confidence: 1 }])}><Plus size={15} /> Add result</Button>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ListField label="Diagnoses" values={x.diagnoses.map((d) => d.name)} onChange={(v) => set("diagnoses", v.map((name, i) => ({ name, confidence: x.diagnoses[i]?.confidence ?? 1 })))} placeholder="e.g. Type 2 diabetes" />
          <ListField label="Complaints / symptoms" values={x.complaints} onChange={(v) => set("complaints", v)} placeholder="e.g. swelling of both ankles" />
          <ListField label="Allergies on this document" values={x.allergies.map((a) => a.substance)} onChange={(v) => set("allergies", v.map((substance, i) => ({ substance, reaction: x.allergies[i]?.reaction ?? null, severity: x.allergies[i]?.severity ?? "moderate" })))} placeholder="e.g. Penicillin" />
          <label className="block"><span className="label">Doctor&rsquo;s advice / notes</span><textarea className="field min-h-[96px]" value={x.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></label>
        </div>
      </fieldset>

      {error && <p role="alert" className="font-semibold text-flag">{error}</p>}
      {!readOnly && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-raised/95 border-t border-rule flex flex-wrap gap-2 justify-between">
          <Button variant="ghost" type="button" disabled={pending} onClick={() => { if (confirm("Discard this document? The file and anything read from it will be deleted.")) start(() => discardDocument(id)); }}>
            {duplicate ? "Discard duplicate" : nameMismatch ? "Not mine: discard" : "Discard"}
          </Button>
          <Button type="button" size="lg" disabled={pending} onClick={submit}>{pending ? "Saving and re-checking…" : "Looks right: add to my history"}</Button>
        </div>
      )}
    </div>
  );
}

function ListField({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <input className="field" value={v} onChange={(e) => onChange(values.map((y, j) => (j === i ? e.target.value : y)))} aria-label={`${label} ${i + 1}`} />
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="h-11 w-11 shrink-0 grid place-items-center rounded-xl text-ink-2 hover:bg-flag-soft hover:text-flag" aria-label={`Remove ${v}`}><Trash2 size={17} /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...values, ""])} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add{values.length ? " another" : ""}</button>
        {values.length === 0 && <p className="text-xs text-ink-3">{placeholder}</p>}
      </div>
    </div>
  );
}
