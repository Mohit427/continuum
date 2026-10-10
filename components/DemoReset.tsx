"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

export function DemoReset() {
  const [s, setS] = useState<"idle" | "busy" | "done" | string>("idle");
  return (
    <button
      disabled={s === "busy"}
      onClick={async () => {
        if (!confirm("Reset all demo accounts to their starting state? Changes made in the demo will be lost.")) return;
        setS("busy");
        const r = await fetch("/api/demo/reset", { method: "POST" });
        const j = await r.json().catch(() => ({}));
        setS(r.ok ? "done" : j.error ?? "Reset failed");
      }}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-brand disabled:opacity-60"
    >
      <RotateCcw size={14} className={s === "busy" ? "animate-spin" : undefined} />
      {s === "busy" ? "Resetting demo (about 30 s)…" : s === "done" ? "Demo reset. Sign in again." : s === "idle" ? "Reset demo data" : s}
    </button>
  );
}
