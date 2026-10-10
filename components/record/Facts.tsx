import { ShieldAlert } from "lucide-react";
import { Chip, fmtDate } from "../ui";
import type { AllergyRow, ConditionRow } from "@/lib/data/record";

export function Allergies({ allergies }: { allergies: AllergyRow[] }) {
  return (
    <section aria-labelledby="allergies-h" className={allergies.length ? "rounded-2xl border border-flag-line bg-flag-soft" : "rounded-2xl border border-rule bg-raised"}>
      <h2 id="allergies-h" className={`flex items-center gap-2 px-4 pt-3 text-lg font-semibold ${allergies.length ? "text-flag" : "text-ink"}`}><ShieldAlert size={19} aria-hidden /> Allergies</h2>
      {allergies.length === 0 ? (
        <p className="px-4 pb-4 pt-1 text-sm text-ink-2">No allergies recorded. If you have one, it will appear here once a document mentions it.</p>
      ) : (
        <ul className="px-4 pb-3 pt-1 divide-y divide-flag-line">
          {allergies.map((a) => (
            <li key={a.id} className="py-2">
              <span className="font-semibold text-[1.05rem]">{a.substance}</span>
              <span className="text-ink-2">{a.reaction ? `: ${a.reaction}` : ""}</span>
              {(a.severity === "severe" || a.severity === "life-threatening") && <Chip tone="flag" className="ml-2">{a.severity}</Chip>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Problems({ problems }: { problems: (ConditionRow & { mentions: number })[] }) {
  return (
    <section aria-labelledby="problems-h" className="rounded-2xl border border-rule bg-raised">
      <h2 id="problems-h" className="px-4 pt-3 text-lg font-semibold">Conditions</h2>
      {problems.length === 0 ? (
        <p className="px-4 pb-4 pt-1 text-sm text-ink-2">None recorded yet.</p>
      ) : (
        <ul className="px-4 pb-3 pt-1 divide-y divide-rule-soft">
          {problems.map((c) => (
            <li key={c.id} className="py-2 flex items-baseline justify-between gap-3">
              <span className={c.status === "resolved" ? "line-ended" : "font-semibold"}>{c.name}</span>
              <span className="text-xs text-ink-2 whitespace-nowrap">since {fmtDate(c.onset_date, { month: "short", year: "numeric" })}{c.mentions > 1 ? ` · ${c.mentions} records` : ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
