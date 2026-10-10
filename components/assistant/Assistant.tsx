"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { cn } from "../ui";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = {
  patient: ["What medicines am I taking now?", "Why is my HbA1c flagged?", "When was my last kidney test?"],
  doctor: ["Which of my patients have high-severity flags?", "Summarise current medicines", "Any allergies I should know?"],
};

/** Floating record assistant. Answers only from the signed-in user's own (scoped) records. */
export function Assistant({ role }: { role: "patient" | "doctor" }) {
  const path = usePathname();
  const patientId = role === "doctor" ? path.match(/^\/doctor\/patients\/([0-9a-f-]{36})/)?.[1] : undefined;
  const [open, setOpen] = useState(false);
  // A doctor's conversation belongs to the patient on screen; switching patients starts a fresh one.
  const convoKey = patientId ?? "all";
  const [convo, setConvo] = useState<{ key: string; turns: Turn[] }>({ key: convoKey, turns: [] });
  const turns = convo.key === convoKey ? convo.turns : [];
  const setTurns = (t: Turn[]) => setConvo({ key: convoKey, turns: t });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [convo, busy]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, patientId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "The assistant is unavailable right now.");
      setTurns([...next, { role: "assistant", content: j.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  const scope = role === "patient" ? "your record" : patientId ? "this patient's shared record" : "the patients who shared with you";

  return (
    <div className="no-print">
      {open && (
        <section
          role="dialog"
          aria-label="Record assistant"
          className="fixed z-50 bottom-24 right-4 sm:right-6 w-[min(calc(100vw-2rem),380px)] h-[min(70vh,540px)] flex flex-col rounded-2xl border border-rule bg-raised shadow-pop lit-row"
        >
          <header className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-rule-soft">
            <div>
              <h2 className="font-bold tracking-[-0.015em]">Ask about {role === "patient" ? "your record" : patientId ? "this patient" : "your patients"}</h2>
              <p className="text-xs text-ink-3 mt-0.5">Answers only from {scope}. Not medical advice.</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-sunk hover:text-ink"><X size={17} /></button>
          </header>

          <div ref={list} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" aria-live="polite">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-ink-2">Try one of these:</p>
                {STARTERS[role].map((s) => (
                  <button key={s} onClick={() => ask(s)} className="block w-full text-left rounded-xl border border-rule px-3 py-2 text-sm hover:border-rule-strong hover:bg-sunk">{s}</button>
                ))}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
                <p className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed", t.role === "user" ? "bg-brand text-on-brand rounded-br-md" : "bg-sunk text-ink rounded-bl-md")}>{t.role === "assistant" ? <Rich text={t.content} /> : t.content}</p>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start" aria-label="Thinking">
                <span className="inline-flex gap-1 rounded-2xl rounded-bl-md bg-sunk px-3.5 py-3">
                  {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 rounded-full bg-ink-3 animate-pulse" style={{ animationDelay: `${d * 150}ms` }} />)}
                </span>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-warn">{error}</p>}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); ask(text); }} className="flex items-end gap-2 border-t border-rule-soft p-3">
            <label htmlFor="assistant-q" className="sr-only">Your question</label>
            <textarea
              id="assistant-q"
              ref={input}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }}
              placeholder="Ask a question…"
              maxLength={2000}
              className="field resize-none min-h-11 max-h-28 py-2.5"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand hover:bg-brand-deep disabled:opacity-40"><ArrowUp size={18} /></button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Ask about your record"}
        aria-expanded={open}
        title="Ask about your record"
        className={cn("fixed z-50 bottom-5 right-4 sm:right-6 grid h-14 w-14 place-items-center rounded-full bg-brand text-on-brand shadow-pop transition-transform hover:scale-105 active:scale-95", open && "rotate-90")}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>
    </div>
  );
}

/** Minimal, safe rendering of the model's light markdown: **bold** and "- " bullets. No HTML injection. */
function Rich({ text }: { text: string }) {
  const lines = text.replace(/^#{1,6}\s*/gm, "").replace(/\n{3,}/g, "\n\n").split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const body = line.replace(/^\s*[-*•]\s+/, "");
        const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, k) => (p.startsWith("**") && p.endsWith("**") ? <strong key={k}>{p.slice(2, -2)}</strong> : <span key={k}>{p}</span>));
        return <span key={i}>{bullet ? "• " : ""}{parts}{i < lines.length - 1 ? "\n" : ""}</span>;
      })}
    </>
  );
}

