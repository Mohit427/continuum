import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { LAB_BY_KEY } from "@/lib/kb/labs";
import type { Trend } from "@/lib/engine";
import { TrendChart } from "./TrendChart";
import { Chip, cn } from "../ui";

export function TrendGrid({ trends, columns = 2 }: { trends: Trend[]; columns?: 1 | 2 | 3 }) {
  if (!trends.length) return <p className="text-ink-2 border border-dashed border-rule rounded-xl px-5 py-6">No lab results yet. Add a lab report to see trends.</p>;
  return (
    <ul className={cn("grid gap-4", columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "")}>
      {trends.map((t) => {
        const def = LAB_BY_KEY[t.testKey];
        const Icon = t.direction === "up" ? TrendingUp : t.direction === "down" ? TrendingDown : Minus;
        return (
          <li key={t.testKey} className="rounded-2xl border border-rule bg-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[1.05rem]">{t.name}</h3>
                <p className="text-2xl font-semibold mt-0.5">{t.last}<span className="text-base font-normal text-ink-2"> {t.unit}</span></p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {t.latestFlag && t.latestFlag !== "normal" && <Chip tone="flag">{t.latestFlag}</Chip>}
                {t.status === "worsening" && <Chip tone="warn">Worsening</Chip>}
                {t.status === "improving" && <Chip tone="ok">Improving</Chip>}
              </div>
            </div>
            <p className="text-sm text-ink-2 mt-1 flex gap-1.5"><Icon size={16} className="shrink-0 mt-0.5" aria-hidden />{t.sentence}</p>
            {t.points.length > 1 && <div className="mt-3"><TrendChart t={t} low={def?.low} high={def?.high} /></div>}
            {def && <p className="text-xs text-ink-3 mt-2">Shaded: usual range{def.low !== undefined ? ` ${def.low}` : ""}{def.low !== undefined && def.high !== undefined ? "–" : def.high !== undefined ? " up to " : "+"}{def.high ?? ""} {def.unit} · LOINC {def.loinc}</p>}
          </li>
        );
      })}
    </ul>
  );
}
