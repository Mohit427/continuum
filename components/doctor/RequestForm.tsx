"use client";
import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestAccess, breakGlass, cancelRequest } from "@/app/actions/sharing";
import { Button, Field } from "../ui";
import { DURATIONS, ScopePicker } from "../sharing/ScopePicker";
import type { Category } from "@/lib/data/record";

export function RequestForm({ defaultLens }: { defaultLens: string | null }) {
  const [hid, setHid] = useState("");
  const [purpose, setPurpose] = useState("");
  const [cats, setCats] = useState<Category[]>(["conditions", "medications", "allergies", "labs", "encounters", "documents", "alerts"]);
  const [lens, setLens] = useState<string | null>(defaultLens);
  const [hours, setHours] = useState(24);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await requestAccess({ healthId: hid, purpose, categories: cats.length === 7 ? ["all"] : cats, lens, hours });
          setMsg(r);
          if (r.ok) { setHid(""); setPurpose(""); router.refresh(); }
        });
      }}
    >
      <Field label="Patient's Health ID" hint="Printed on their Continuum card, e.g. CN-LR62-4K7Q">
        <input className="field uppercase tracking-[0.04em]" value={hid} onChange={(e) => setHid(e.target.value)} placeholder="CN-XXXX-XXXX" required autoComplete="off" />
      </Field>
      <Field label="Reason for access"><input className="field" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Cardiology follow-up, uncontrolled BP" required /></Field>
      <details className="rounded-xl border border-rule p-3">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden font-semibold text-sm flex items-center justify-between">Scope and duration <ChevronDown size={16} className="text-ink-3 transition-transform [details[open]_&]:rotate-180" aria-hidden /></summary>
        <div className="mt-3 space-y-4">
          <ScopePicker cats={cats} setCats={setCats} lens={lens} setLens={setLens} />
          <Field label="For how long">
            <select className="field" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {DURATIONS.filter((d) => d.h <= 720).map((d) => <option key={d.h} value={d.h}>{d.label}</option>)}
            </select>
          </Field>
        </div>
      </details>
      {msg?.error && <p role="alert" className="font-semibold text-flag">{msg.error}</p>}
      {msg?.ok && <p role="status" className="font-semibold text-ok">{msg.ok}</p>}
      <Button type="submit" disabled={pending || !cats.length}>{pending ? "Sending…" : "Request access"}</Button>
    </form>
  );
}

export function BreakGlassForm({ initialHid = "" }: { initialHid?: string }) {
  const [hid, setHid] = useState(initialHid);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm("Open this patient's full record without their consent? This is logged and the patient is notified immediately.")) return;
        start(async () => {
          const r = await breakGlass({ healthId: hid, reason });
          if (r.error) setErr(r.error);
          else router.push(`/doctor/patients/${r.patientId}`);
        });
      }}
    >
      <Field label="Patient's Health ID (from their emergency card)"><input className="field uppercase" value={hid} onChange={(e) => setHid(e.target.value)} required autoComplete="off" /></Field>
      <Field label="The emergency" hint="Recorded and shown to the patient."><textarea className="field min-h-[80px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Unconscious after road accident, brought to ER, needs medication history" required /></Field>
      {err && <p role="alert" className="font-semibold text-flag">{err}</p>}
      <Button type="submit" variant="danger" disabled={pending}>{pending ? "Opening…" : "Open full record for 1 hour"}</Button>
    </form>
  );
}

export function CancelRequest({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} onClick={() => start(() => cancelRequest(id))} className="text-sm font-semibold text-ink-2 hover:text-flag">Cancel</button>;
}
