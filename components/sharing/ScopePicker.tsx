"use client";
import { CATEGORY_LABEL, type Category } from "@/lib/data/record";
import { LENSES } from "@/lib/kb/labs";

export const ALL_CATS = Object.keys(CATEGORY_LABEL) as Category[];

export function ScopePicker({ cats, setCats, lens, setLens, allowed = ALL_CATS }: { cats: Category[]; setCats: (c: Category[]) => void; lens: string | null; setLens: (l: string | null) => void; allowed?: Category[] }) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label">What they can see</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {allowed.map((c) => (
            <label key={c} className="flex items-center gap-2.5 rounded-xl border border-rule px-3 min-h-11 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="checkbox" className="h-4.5 w-4.5 accent-brand" checked={cats.includes(c)} onChange={(e) => setCats(e.target.checked ? [...cats, c] : cats.filter((x) => x !== c))} />
              <span className="text-[0.97rem]">{CATEGORY_LABEL[c]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-2 mt-1.5">Allergies are always included: they are safety-critical.</p>
      </fieldset>
      <label className="block">
        <span className="label">Show only what this specialty needs</span>
        <select className="field" value={lens ?? ""} onChange={(e) => setLens(e.target.value || null)}>
          <option value="">Everything in the categories above</option>
          {LENSES.filter((l) => l.key !== "general").map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
        <span className="block text-xs text-ink-2 mt-1">A lens narrows lab results, conditions and visits. Current medicines are always shared in full.</span>
      </label>
    </div>
  );
}

export const DURATIONS = [
  { h: 2, label: "2 hours" }, { h: 24, label: "24 hours" }, { h: 72, label: "3 days" }, { h: 168, label: "1 week" }, { h: 720, label: "30 days" }, { h: 2160, label: "90 days" }, { h: 8760, label: "1 year" },
];
