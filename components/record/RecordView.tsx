import type { ReactNode } from "react";
import { toTimeline, type PatientRecord } from "@/lib/data/record";
import { buildCareMap } from "@/lib/data/caremap";
import { activeProblems, currentMeds, stations, trends } from "@/lib/data/views";
import { CareMap } from "../caremap/CareMap";
import { MedTable } from "./MedTable";
import { Allergies, Problems } from "./Facts";
import { TrendGrid } from "./TrendGrid";
import { TimelineList } from "./TimelineList";
import { SectionTitle } from "../ui";

/** Read-only clinical view of a (scoped) record. Used by doctors and share-link viewers. */
export function RecordView({ rec, docHref, canAct, side, summary, tools }: { rec: PatientRecord; docHref: string; canAct: boolean; side?: ReactNode; summary?: ReactNode; tools?: ReactNode }) {
  const meds = currentMeds(rec);
  const tr = trends(rec);
  return (
    <div className="space-y-10">
      <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
        <div className="space-y-8 min-w-0">
          {summary}
          <section>
            <SectionTitle sub={`${meds.length} continuing · from every prescriber on record`}>Current medicines</SectionTitle>
            <MedTable meds={meds} docHref={docHref} />
          </section>
        </div>
        <aside className="space-y-5">
          <Allergies allergies={rec.allergies} />
          {rec.conditions.length > 0 && <Problems problems={activeProblems(rec.conditions)} />}
          {side}
        </aside>
      </div>

      {rec.alerts.length > 0 || rec.encounters.length > 0 ? (
        <section>
          <SectionTitle sub="Every medicine course by what it treats, from start to stop. Red connectors join records from different doctors that were never seen together.">Medication map &amp; Blind Spots</SectionTitle>
          <CareMap map={buildCareMap(toTimeline(rec), stations(rec))} alerts={rec.alerts} docHref={docHref} canAct={canAct} />
        </section>
      ) : null}

      {tools}

      {tr.length > 0 && (
        <section>
          <SectionTitle>Results over time</SectionTitle>
          <TrendGrid trends={tr} columns={3} />
        </section>
      )}
      {rec.encounters.length > 0 && (
        <section>
          <SectionTitle>Timeline</SectionTitle>
          <TimelineList rec={rec} docHref={docHref} />
        </section>
      )}
    </div>
  );
}
