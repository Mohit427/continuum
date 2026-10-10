"use client";
import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check } from "lucide-react";
import { createLink } from "@/app/actions/sharing";
import { Button, Field } from "../ui";
import { DURATIONS, ScopePicker } from "./ScopePicker";
import type { Category } from "@/lib/data/record";

/** Create a scoped, purpose-bound, expiring share link (shown once as URL + QR), or a caregiver link. */
export function ShareForm({ kind }: { kind: "link" | "caregiver" }) {
  const caregiver = kind === "caregiver";
  const [label, setLabel] = useState("");
  const [purpose, setPurpose] = useState("");
  const [cats, setCats] = useState<Category[]>(caregiver ? ["conditions", "medications", "allergies", "labs", "encounters", "documents", "alerts"] : ["conditions", "medications", "allergies", "labs"]);
  const [lens, setLens] = useState<string | null>(null);
  const [hours, setHours] = useState(caregiver ? 2160 : 24);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (url)
    return (
      <div className="rounded-xl border border-brand bg-brand-soft p-5 flex flex-wrap gap-5 items-center">
        <div className="bg-white p-3 rounded-xl border border-rule"><QRCodeSVG value={url} size={164} fgColor="#0f172a" level="M" /></div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-semibold text-lg">{caregiver ? `Caregiver link for ${label} is ready` : "Your link is ready"}</p>
          <p className="text-sm text-ink-2">Show the QR or send the link. It stops working when it expires or when you revoke it below. Every opening is logged.</p>
          <div className="flex gap-2 items-center">
            <input readOnly value={url} className="field text-sm" onFocus={(e) => e.target.select()} aria-label="Share link" />
            <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }} aria-label="Copy link">{copied ? <Check size={17} /> : <Copy size={17} />}</Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setUrl(null); setLabel(""); setPurpose(""); }}>Create another</Button>
        </div>
      </div>
    );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const r = await createLink({ label, purpose, categories: cats, lens, hours, kind });
          if (r.error) setErr(r.error);
          else setUrl(r.url!.startsWith("/") ? window.location.origin + r.url : r.url!);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={caregiver ? "Caregiver's name and relation" : "Who is this for?"}><input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={caregiver ? "e.g. Karthik (son)" : "e.g. Dr. at Apollo emergency"} required /></Field>
        <Field label="Purpose"><input className="field" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={caregiver ? "Helping manage my medicines" : "e.g. Second opinion on knee pain"} /></Field>
      </div>
      {!caregiver && <ScopePicker cats={cats} setCats={setCats} lens={lens} setLens={setLens} />}
      <Field label="Stops working after">
        <select className="field" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {DURATIONS.filter((d) => (caregiver ? d.h >= 168 : d.h <= 720)).map((d) => <option key={d.h} value={d.h}>{d.label}</option>)}
        </select>
      </Field>
      {err && <p role="alert" className="font-semibold text-flag">{err}</p>}
      <Button type="submit" disabled={pending || cats.length === 0}>{pending ? "Creating…" : caregiver ? "Create caregiver link" : "Create link and QR"}</Button>
    </form>
  );
}
