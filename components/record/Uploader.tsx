"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, FileUp, Loader2, RotateCcw, XCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { createUpload } from "@/app/actions/documents";
import { buttonClass, cn } from "../ui";

type Step = "hashing" | "uploading" | "reading" | "ready" | "error";
interface Item { key: string; name: string; step: Step; message?: string; docId?: string; retryable?: boolean }

const STEP_TEXT: Record<Step, string> = {
  hashing: "Fingerprinting the file…",
  uploading: "Uploading securely…",
  reading: "Reading the document (about 20–40 seconds)…",
  ready: "Ready for your check",
  error: "",
};

async function sha256(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function runExtraction(docId: string): Promise<{ ok: boolean; error?: string; retryable?: boolean; status?: string }> {
  const res = await fetch(`/api/documents/${docId}/extract`, { method: "POST" });
  const j = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, status: j.status } : { ok: false, error: j.error ?? "Could not read the document.", retryable: j.retryable ?? true };
}

/** Photo / PDF upload → fingerprint → private storage → AI extraction → human review. Used by patients and labs. */
export function Uploader({ healthId, reviewBase = "/patient/records", compact }: { healthId?: () => string; reviewBase?: string | null; compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const patch = (key: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const handle = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const key = `${file.name}-${file.size}-${Date.now()}`;
      setItems((xs) => [{ key, name: file.name, step: "hashing" }, ...xs]);
      try {
        const hid = healthId?.();
        if (healthId && !hid) { patch(key, { step: "error", message: "Enter the patient's Health ID first." }); continue; }
        const ticket = await createUpload({ fileName: file.name, mime: file.type || "application/octet-stream", size: file.size, sha256: await sha256(file), healthId: hid });
        if (!ticket.ok) { patch(key, { step: "error", message: ticket.error, docId: ticket.duplicateOf }); continue; }
        patch(key, { step: "uploading", docId: ticket.documentId });
        const up = await supabaseBrowser().storage.from("documents").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (up.error) { patch(key, { step: "error", message: "Upload failed. Check your connection and try again.", retryable: false }); continue; }
        patch(key, { step: "reading" });
        const r = await runExtraction(ticket.documentId);
        patch(key, r.ok ? { step: "ready" } : { step: "error", message: r.error, retryable: r.retryable });
        router.refresh();
      } catch {
        patch(key, { step: "error", message: "Something went wrong. Please try again." });
      }
    }
  };

  const retry = async (it: Item) => {
    if (!it.docId) return;
    patch(it.key, { step: "reading", message: undefined });
    const r = await runExtraction(it.docId);
    patch(it.key, r.ok ? { step: "ready" } : { step: "error", message: r.error, retryable: r.retryable });
    router.refresh();
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) handle(e.dataTransfer.files); }}
        className={cn("rounded-xl border-2 border-dashed transition-colors", drag ? "border-brand bg-brand-soft" : "border-rule-strong bg-sunk/60", compact ? "p-5" : "p-6 sm:p-8")}
      >
        <p className="text-lg font-semibold">Add a prescription, lab report or discharge summary</p>
        <p className="text-ink-2 mt-1 max-w-prose">A clear phone photo or a PDF works. We read it, show you what we found, and add nothing until you confirm.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => camRef.current?.click()} className={buttonClass("primary")}><Camera size={18} /> Take a photo</button>
          <button type="button" onClick={() => fileRef.current?.click()} className={buttonClass("secondary")}><FileUp size={18} /> Choose files</button>
        </div>
        <p className="mt-3 text-xs text-ink-2">JPG, PNG, WebP or PDF, up to 10 MB. Files are stored privately and only shared when you allow it.</p>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={(e) => e.target.files && handle(e.target.files)} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files && handle(e.target.files)} />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-rule-soft border border-rule rounded-2xl bg-raised" aria-live="polite">
          {items.map((it) => (
            <li key={it.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {it.step === "ready" ? <CheckCircle2 className="text-ok shrink-0" size={20} /> : it.step === "error" ? <XCircle className="text-flag shrink-0" size={20} /> : <Loader2 className="animate-spin text-brand shrink-0" size={20} />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{it.name}</p>
                <p className={cn("text-sm", it.step === "error" ? "text-flag" : "text-ink-2")}>{it.step === "error" ? it.message : STEP_TEXT[it.step]}</p>
              </div>
              {it.step === "ready" && it.docId && reviewBase && <Link href={`${reviewBase}/${it.docId}/review`} className={buttonClass("primary", "sm")}>Check &amp; confirm</Link>}
              {it.step === "ready" && !reviewBase && <span className="text-sm font-semibold text-ok">Sent. The patient will confirm it.</span>}
              {it.step === "error" && it.retryable && it.docId && <button onClick={() => retry(it)} className={buttonClass("secondary", "sm")}><RotateCcw size={15} /> Retry</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
