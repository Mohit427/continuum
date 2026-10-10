"use client";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addDoctorNote } from "@/app/actions/doctor";
import { matchDrug } from "@/lib/kb/match";
import { Button, Field } from "../ui";

interface Rx { name: string; strength: string; frequency: string; days: string }

/** Write back into the patient's record: the next clinician sees it, and the Blind Spot Engine re-runs. */
export function NoteForm({ patientId }: { patientId: string }) {
  const [note, setNote] = useState("");
  const [complaints, setComplaints] = useState("");
  const [dx, setDx] = useState("");
  const [rx, setRx] = useState<Rx[]>([]);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const split = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addDoctorNote({
            patientId, note, complaints: split(complaints), diagnoses: split(dx),
            prescriptions: rx.filter((p) => p.name.trim()).map((p) => ({ name: p.name, strength: p.strength || undefined, frequency: p.frequency || undefined, duration_days: p.days ? parseInt(p.days) || null : null })),
          });
          if (r.error) setMsg({ error: r.error });
          else { setMsg({ ok: `Saved to the patient's timeline.${r.newAlerts ? ` ${r.newAlerts} new safety flag${r.newAlerts > 1 ? "s" : ""} raised; see Blind Spots.` : " No new safety flags."}` }); setNote(""); setComplaints(""); setDx(""); setRx([]); }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Complaints" hint="Separate with commas"><input className="field" value={complaints} onChange={(e) => setComplaints(e.target.value)} placeholder="e.g. ankle swelling persists" /></Field>
        <Field label="Diagnosis" hint="Separate with commas"><input className="field" value={dx} onChange={(e) => setDx(e.target.value)} placeholder="e.g. Essential hypertension" /></Field>
      </div>
      <Field label="Note"><textarea className="field min-h-[90px]" value={note} onChange={(e) => setNote(e.target.value)} required placeholder="Assessment and plan" /></Field>
      <div>
        <span className="label">Prescribe</span>
        <div className="space-y-2">
          {rx.map((p, i) => {
            const hit = p.name.length > 2 ? matchDrug(p.name) : undefined;
            const upd = (k: keyof Rx, v: string) => setRx(rx.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
            return (
              <div key={i}>
                <div className="grid gap-2 grid-cols-[2fr_1fr_1.5fr_70px_auto]">
                  <input className="field" value={p.name} onChange={(e) => upd("name", e.target.value)} placeholder="Medicine" aria-label="Medicine" />
                  <input className="field" value={p.strength} onChange={(e) => upd("strength", e.target.value)} placeholder="25 mg" aria-label="Strength" />
                  <input className="field" value={p.frequency} onChange={(e) => upd("frequency", e.target.value)} placeholder="Once daily" aria-label="Frequency" />
                  <input className="field" value={p.days} onChange={(e) => upd("days", e.target.value)} placeholder="days" inputMode="numeric" aria-label="Days" />
                  <button type="button" onClick={() => setRx(rx.filter((_, j) => j !== i))} className="h-11 w-11 grid place-items-center rounded-xl text-ink-2 hover:bg-flag-soft hover:text-flag" aria-label="Remove"><Trash2 size={17} /></button>
                </div>
                {hit && <p className="text-xs text-ok mt-0.5">→ {hit.drug.generic}</p>}
              </div>
            );
          })}
          <button type="button" onClick={() => setRx([...rx, { name: "", strength: "", frequency: "", days: "" }])} className="text-sm font-semibold text-brand inline-flex items-center gap-1"><Plus size={14} /> Add medicine</button>
        </div>
      </div>
      {msg?.error && <p role="alert" className="font-semibold text-flag">{msg.error}</p>}
      {msg?.ok && <p role="status" className="font-semibold text-ok">{msg.ok}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving and checking…" : "Save to patient's record"}</Button>
    </form>
  );
}
