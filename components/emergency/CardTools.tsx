"use client";
import { useEffect, useState, useTransition } from "react";
import { Printer, WifiOff, RefreshCw, Check } from "lucide-react";
import { regenerateEmergencyCard, setBreakGlass, updateEmergencyInfo } from "@/app/actions/sharing";
import { Button, Field } from "../ui";

export function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
}

export function SaveOffline({ url, auto }: { url: string; auto?: boolean }) {
  const [state, setState] = useState<"idle" | "saved" | "unsupported">("idle");
  useServiceWorker();
  const save = async () => {
    if (!("serviceWorker" in navigator)) return setState("unsupported");
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "cache-card", url });
    setState("saved");
  };
  useEffect(() => { if (auto) save(); }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Button variant="secondary" onClick={save}>
      {state === "saved" ? <><Check size={17} /> Saved on this device</> : state === "unsupported" ? "Offline not supported here" : <><WifiOff size={17} /> Keep available offline</>}
    </Button>
  );
}

export function PrintButton() {
  return <Button variant="secondary" onClick={() => window.print()}><Printer size={17} /> Print card</Button>;
}

export function CardSettings({ blood, contact, breakGlass }: { blood: string | null; contact: { name: string; relation: string; phone: string } | null; breakGlass: boolean }) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [bg, setBg] = useState(breakGlass);
  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            await updateEmergencyInfo({ blood_group: String(f.get("blood") ?? ""), ec_name: String(f.get("ec_name") ?? ""), ec_relation: String(f.get("ec_relation") ?? ""), ec_phone: String(f.get("ec_phone") ?? "") });
            setSaved(true);
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Blood group">
            <select name="blood" defaultValue={blood ?? ""} className="field">
              <option value="">Not known</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Emergency contact name"><input name="ec_name" defaultValue={contact?.name} className="field" /></Field>
          <Field label="Relation"><input name="ec_relation" defaultValue={contact?.relation} className="field" /></Field>
          <Field label="Phone"><input name="ec_phone" type="tel" defaultValue={contact?.phone} className="field" /></Field>
        </div>
        <Button type="submit" disabled={pending}>{saved ? "Saved" : "Save details"}</Button>
      </form>
      <label className="flex gap-3 items-start rounded-xl border border-rule p-4 cursor-pointer">
        <input type="checkbox" className="mt-1.5 h-5 w-5 accent-brand" checked={bg} onChange={(e) => { setBg(e.target.checked); start(() => setBreakGlass(e.target.checked)); }} />
        <span>
          <strong>Allow emergency full access</strong>
          <span className="block text-ink-2 text-sm">If I can't consent, a registered doctor may open my full record for 1 hour by stating the emergency. I am told immediately and it is logged.</span>
        </span>
      </label>
      <div className="rounded-xl border border-rule p-4">
        <p className="font-semibold">Lost your printed card?</p>
        <p className="text-sm text-ink-2">Replacing it makes the old QR stop working.</p>
        <Button variant="secondary" size="sm" className="mt-2" disabled={pending} onClick={() => { if (confirm("Replace your emergency card? The old QR will stop working.")) start(() => regenerateEmergencyCard()); }}><RefreshCw size={15} /> Replace card</Button>
      </div>
    </div>
  );
}
