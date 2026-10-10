"use client";
import { useState } from "react";
import { FileText, RefreshCw, Sparkles } from "lucide-react";
import { Button, cn } from "./ui";

interface Bullet { text: string; cites: string[]; attention: boolean }
interface Summary { headline: string; sections: { title: string; bullets: Bullet[] }[] }
type Ids = Record<string, { kind: string; label: string; documentId: string | null }>;

const LANGS = [{ id: "en", label: "English" }, { id: "hi", label: "हिन्दी" }, { id: "ta", label: "தமிழ்" }] as const;

/** Grounded AI summary: every bullet cites the records it came from; citations open the source document. */
export function SummaryPanel({ patientId, token, audience, docHref, title = "One-screen summary" }: { patientId?: string; token?: string; audience: "clinician" | "patient"; docHref: string; title?: string }) {
  const [lang, setLang] = useState<"en" | "hi" | "ta">("en");
  const [state, setState] = useState<{ loading: boolean; error?: string; summary?: Summary; ids?: Ids; cached?: boolean }>({ loading: false });

  const run = async (l = lang, refresh = false) => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const res = await fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ patientId, token, audience, lang: l, refresh }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Summary unavailable");
      setState({ loading: false, summary: j.summary, ids: j.ids, cached: j.cached });
    } catch (e) {
      setState({ loading: false, error: e instanceof Error ? e.message : "Summary unavailable" });
    }
  };

  return (
    <section className="border border-rule rounded-2xl bg-raised" aria-busy={state.loading}>
      <div className="flex flex-wrap items-center gap-3 justify-between px-4 py-3 border-b border-rule-soft">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles size={18} className="text-brand" aria-hidden /> {title}</h2>
        <div role="tablist" aria-label="Language" className="flex rounded-xl border border-rule overflow-hidden text-sm">
          {LANGS.map((l) => (
            <button key={l.id} role="tab" aria-selected={lang === l.id} onClick={() => { setLang(l.id); if (state.summary) run(l.id); }}
              className={cn("px-3 min-h-9 font-semibold", lang === l.id ? "bg-brand text-on-brand" : "bg-raised text-ink-2 hover:text-brand")}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {!state.summary && !state.loading && !state.error && (
          <div>
            <p className="text-ink-2 text-sm max-w-prose">{audience === "clinician" ? "Problems, current medicines, allergies, trends and flags, written from the structured record. Every line links to its source." : "A plain-language summary of your record you can read or show a family member. Every line links to where it came from."}</p>
            <Button className="mt-3" onClick={() => run()}>Write the summary</Button>
          </div>
        )}
        {state.loading && (
          <div className="space-y-3" aria-live="polite">
            <p className="text-sm text-ink-2">Reading the structured record…</p>
            {[80, 64, 72, 50].map((w, i) => <div key={i} className="h-3.5 rounded bg-sunk animate-pulse" style={{ width: `${w}%` }} />)}
          </div>
        )}
        {state.error && (
          <div role="alert" className="text-sm">
            <p className="font-semibold text-flag">{state.error}</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => run()}>Try again</Button>
          </div>
        )}
        {state.summary && !state.loading && (
          <div lang={lang}>
            <p className="font-semibold text-[1.05rem] leading-snug">{state.summary.headline}</p>
            {state.summary.sections.map((s) => (
              <div key={s.title} className="mt-4">
                <h3 className="text-sm font-semibold text-ink-2 mb-1.5">{s.title}</h3>
                <ul className="space-y-1.5">
                  {s.bullets.map((b, i) => (
                    <li key={i} className={cn("text-[0.97rem] leading-snug pl-3 relative", b.attention && "font-semibold text-flag")}>
                      <span className={cn("absolute left-0 top-[0.6em] h-1.5 w-1.5 rounded-full", b.attention ? "bg-flag" : "bg-brand")} aria-hidden />
                      {b.text}
                      {b.cites.length > 0 && (
                        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                          {b.cites.slice(0, 3).map((c, k) => {
                            const ref = state.ids?.[c];
                            const doc = ref?.documentId;
                            return doc ? (
                              <a key={c} href={docHref.replace("{id}", doc)} target="_blank" rel="noreferrer" title={ref?.label} className="inline-flex items-center gap-0.5 rounded-md border border-brand-line bg-brand-soft px-1 text-[11px] font-semibold text-brand hover:bg-raised">
                                <FileText size={10} aria-hidden />{k + 1}
                              </a>
                            ) : (
                              <span key={c} title={ref?.label} className="rounded-md border border-rule bg-sunk px-1 text-[11px] font-semibold text-ink-2">{k + 1}</span>
                            );
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink-3">
              <span>Written by AI from structured records only; it does not diagnose. Check the linked sources.</span>
              <button onClick={() => run(lang, true)} className="inline-flex items-center gap-1 font-semibold text-brand shrink-0"><RefreshCw size={12} /> Rewrite</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
