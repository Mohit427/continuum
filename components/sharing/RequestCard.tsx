"use client";
import { useState, useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { respondRequest } from "@/app/actions/sharing";
import { Button, relTime } from "../ui";
import { ALL_CATS, DURATIONS, ScopePicker } from "./ScopePicker";
import type { Category } from "@/lib/data/record";

export interface ReqView {
  id: string; purpose: string; created_at: string; duration_hours: number;
  requested_scope: { categories: string[]; lens?: string | null };
  doctor: { full_name: string; specialty: string | null; organization: string | null; registration_no: string | null; verified: boolean } | null;
}

/** Patient decides: approve as asked, narrow (fewer categories, a lens, shorter time) or deny. Never widen. */
export function RequestCard({ r }: { r: ReqView }) {
  const askedAll = r.requested_scope.categories.includes("all");
  const allowed = askedAll ? ALL_CATS : (r.requested_scope.categories as Category[]);
  const [cats, setCats] = useState<Category[]>(allowed);
  const [lens, setLens] = useState<string | null>(r.requested_scope.lens && r.requested_scope.lens !== "general" ? r.requested_scope.lens : null);
  const [hours, setHours] = useState(r.duration_hours);
  const [narrow, setNarrow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const d = r.doctor;

  const act = (approve: boolean) => start(async () => {
    const res = await respondRequest({ id: r.id, approve, categories: cats, lens, hours });
    if (res.error) setErr(res.error);
  });

  return (
    <article className="rounded-xl border-2 border-dashed border-brand bg-raised p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold flex items-center gap-1.5">{d?.full_name}{d?.verified && <BadgeCheck size={18} className="text-brand" aria-label="Registration verified" />}</p>
          <p className="text-ink-2">{d?.specialty} · {d?.organization} · Reg. {d?.registration_no}</p>
        </div>
        <span className="text-sm text-ink-3">{relTime(r.created_at)}</span>
      </div>
      <p className="mt-3 text-[1.05rem]"><span className="text-ink-2">Reason: </span><strong>{r.purpose}</strong></p>
      <p className="text-ink-2">Asks for {askedAll ? "your full record" : allowed.length + " categories"}{r.requested_scope.lens && r.requested_scope.lens !== "general" ? ` through a ${r.requested_scope.lens} lens` : ""} for {DURATIONS.find((x) => x.h === r.duration_hours)?.label ?? `${r.duration_hours} hours`}.</p>

      {narrow && (
        <div className="mt-4 space-y-4 rounded-xl bg-sunk p-4">
          <ScopePicker cats={cats} setCats={setCats} lens={lens} setLens={setLens} allowed={allowed} />
          <label className="block"><span className="label">For how long</span>
            <select className="field" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {DURATIONS.filter((x) => x.h <= r.duration_hours).map((x) => <option key={x.h} value={x.h}>{x.label}</option>)}
            </select>
          </label>
        </div>
      )}
      {err && <p role="alert" className="mt-3 font-semibold text-flag">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={pending || cats.length === 0} onClick={() => act(true)}>{narrow ? "Approve with these limits" : "Approve"}</Button>
        {!narrow && <Button variant="secondary" disabled={pending} onClick={() => setNarrow(true)}>Share less</Button>}
        <Button variant="ghost" disabled={pending} onClick={() => act(false)}>Deny</Button>
      </div>
    </article>
  );
}
