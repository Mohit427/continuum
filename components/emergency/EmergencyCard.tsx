import { QRCodeSVG } from "qrcode.react";
import { ShieldAlert, Phone } from "lucide-react";
import { Mark } from "../shell/Logo";
import { cn } from "../ui";

export interface EmergencyData {
  name: string; age: number | null; sex: string | null; bloodGroup: string | null; healthId: string | null;
  allergies: { substance: string; reaction: string | null; severity: string }[];
  criticalMeds: string[]; otherMeds: string[]; conditions: string[];
  contact: { name: string; relation: string; phone: string } | null;
}

/** The emergency card: the facts an ER needs first, in fixed segments, with the scan code on its own panel. */
export function EmergencyCard({ d, url, compact }: { d: EmergencyData; url?: string | null; compact?: boolean }) {
  return (
    <article className={cn("relative mx-auto w-full max-w-[860px] rounded-2xl border border-rule bg-raised overflow-hidden print:shadow-none", !compact && "shadow-pop")} aria-label="Emergency medical card">
      <header className="bg-flag text-on-brand px-5 py-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-bold text-[0.95rem]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-white"><Mark size={20} /></span> Emergency medical card</span>
        <span className="text-xs font-semibold opacity-90">{d.healthId}</span>
      </header>
      <div className="grid sm:grid-cols-[1fr_auto]">
        <div className="p-5 space-y-4 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ink-2">Patient</p>
              <p className="text-2xl sm:text-3xl font-bold leading-tight">{d.name}</p>
              <p className="text-ink-2">{[d.age && `${d.age} years`, d.sex === "F" ? "Female" : d.sex === "M" ? "Male" : d.sex].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-ink-2">Blood group</p>
              <p className="text-4xl font-bold text-flag leading-none">{d.bloodGroup ?? "?"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-flag-line bg-flag-soft px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-flag"><ShieldAlert size={15} aria-hidden /> Allergies</p>
            {d.allergies.length ? (
              <ul className="mt-1">{d.allergies.map((a) => <li key={a.substance} className="text-xl font-bold">{a.substance}<span className="text-base font-normal text-ink-2">{a.reaction ? ` (${a.reaction})` : ""}</span></li>)}</ul>
            ) : <p className="text-lg font-semibold">None known</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-ink-2">Current medicines</p>
              <ul className="mt-1 space-y-0.5">
                {d.criticalMeds.map((m) => <li key={m} className="font-bold text-flag">{m}</li>)}
                {d.otherMeds.map((m) => <li key={m} className="font-semibold">{m}</li>)}
                {!d.criticalMeds.length && !d.otherMeds.length && <li className="text-ink-2">None recorded</li>}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-ink-2">Conditions</p>
              <ul className="mt-1 space-y-0.5">{d.conditions.length ? d.conditions.map((c) => <li key={c} className="font-semibold">{c}</li>) : <li className="text-ink-2">None recorded</li>}</ul>
            </div>
          </div>
          {d.contact && (
            <a href={`tel:${d.contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 rounded-xl bg-sunk px-4 py-3 hover:bg-brand-soft">
              <Phone size={18} className="text-brand" aria-hidden />
              <span><span className="text-xs font-bold text-ink-2 block">Emergency contact</span><span className="font-semibold">{d.contact.name} ({d.contact.relation}) · {d.contact.phone}</span></span>
            </a>
          )}
        </div>
        {url !== undefined && (
          <div className="relative border-t sm:border-t-0 sm:border-l border-rule p-5 flex sm:flex-col items-center justify-center gap-3 bg-sunk sm:w-[220px]">
            {url ? <span className="rounded-xl bg-white p-2.5"><QRCodeSVG value={url} size={150} level="M" fgColor="#0c1222" /></span> : <div className="h-[150px] w-[150px] grid place-items-center text-center text-sm text-ink-2 border border-dashed border-rule rounded">No active card</div>}
            <p className="text-xs text-center text-ink-2 max-w-[170px]">Scan for this card online. Every scan is logged and the patient is told.</p>
          </div>
        )}
      </div>
      <footer className="px-5 py-2 border-t border-rule text-[11px] text-ink-3">Information provided by the patient's own record in Continuum. Verify clinically.</footer>
    </article>
  );
}
