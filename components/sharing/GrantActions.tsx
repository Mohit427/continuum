"use client";
import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { revokeGrant } from "@/app/actions/sharing";

export function GrantActions({ id, url, who }: { id: string; url?: string | null; who: string }) {
  const [pending, start] = useTransition();
  const [qr, setQr] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {url && <button onClick={() => setQr((q) => !q)} className="text-sm font-semibold text-brand hover:underline">{qr ? "Hide QR" : "Show QR"}</button>}
      <button disabled={pending} onClick={() => { if (confirm(`Revoke access for ${who}? They lose access immediately.`)) start(() => revokeGrant(id)); }} className="min-h-9 px-3 rounded-xl border border-flag-line text-sm font-semibold text-flag hover:bg-flag-soft disabled:opacity-50">
        {pending ? "Revoking…" : "Revoke"}
      </button>
      {qr && url && <div className="basis-full flex justify-end"><div className="bg-white border border-rule rounded-2xl p-2"><QRCodeSVG value={url} size={132} /></div></div>}
    </div>
  );
}
