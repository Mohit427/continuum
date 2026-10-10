"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { runExtraction } from "./Uploader";
import { buttonClass } from "../ui";

export function RetryButton({ docId }: { docId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  return (
    <span className="inline-flex items-center gap-2">
      <button disabled={busy} onClick={async () => { setBusy(true); setErr(null); const r = await runExtraction(docId); setBusy(false); if (!r.ok) setErr(r.error ?? "Failed"); router.refresh(); }} className={buttonClass("secondary", "sm")}>
        <RotateCcw size={14} className={busy ? "animate-spin" : undefined} /> {busy ? "Reading…" : "Read again"}
      </button>
      {err && <span className="text-sm text-flag">{err}</span>}
    </span>
  );
}
