"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronDown, EyeOff, FileText, RotateCcw } from "lucide-react";
import { Chip, cn, fmtDate } from "../ui";
import { setAlertStatus } from "@/app/actions/documents";
import type { AlertRow } from "@/lib/data/record";
import type { Evidence } from "@/lib/engine/types";
import { pct, type CareMapData, type MapRow } from "@/lib/data/caremap";
import { GROUPS, GROUP_ORDER, type GroupKey } from "@/lib/kb/groups";

const TYPE_LABEL: Record<string, string> = {
  cascade: "Prescribing cascade", drug_lab: "Medicine → lab change", interaction: "Interaction", drug_condition: "Medicine vs condition",
  duplicate_therapy: "Duplicate medicine", allergy_conflict: "Allergy conflict", duplicate_test: "Repeated test", refill_due: "Refill gap",
};

const ROW = 42, GROUP_H = 32, TRACK = 34, AXIS = 30;

interface Pt { x: number; y: number; kind: Evidence["kind"] }
interface Link_ { a: AlertRow; n: number; pts: Pt[]; rows: Set<string> }

export function CareMap({
  map, alerts, docHref, providerHref, canAct = true, compact = false, spotsFirst = false, between,
}: { map: CareMapData; alerts: AlertRow[]; docHref: string; providerHref?: string; canAct?: boolean; compact?: boolean; spotsFirst?: boolean; between?: React.ReactNode }) {
  const [hot, setHot] = useState<string | null>(null);
  const live = useMemo(() => alerts.filter((a) => a.status === "open" || a.status === "acknowledged"), [alerts]);
  const layout = useMemo(() => buildLayout(map), [map]);
  const links = useMemo(() => live.map((a, i) => linkFor(a, i + 1, map, layout)).filter((l): l is Link_ => !!l), [live, map, layout]);
  const groupOfRecord = useMemo(() => {
    const m = new Map<string, GroupKey>();
    map.rows.forEach((r) => r.recordIds.forEach((id) => m.set(id, r.group)));
    return m;
  }, [map]);
  const nOf = (id: string) => links.find((l) => l.a.id === id)?.n;
  const [sel, setSel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState<string | null>(null);
  const selected = live.find((a) => a.id === sel) ?? live[0];
  const pick = (id: string) => { setSel(id); setHot(id); };
  const groupOf = (id: string) => groupOfRecord.get(id);

  const mapEl = (
    <section aria-label="Medication map">
      {spotsFirst && <h2 className="text-lg font-bold tracking-[-0.02em] mb-3">Medication map</h2>}
      <MapView map={map} layout={layout} links={links} hot={hot} setHot={setHot} providerHref={providerHref} onPick={(id) => { setSel(id); setMobileOpen(id); document.getElementById("blind-spots")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} />
    </section>
  );
  const spotsEl = (
      <div id="blind-spots" className={cn("scroll-mt-24", !spotsFirst && "mt-8")}>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold tracking-[-0.02em]">{spotsFirst ? "Things to know" : "Blind Spots"} <span className="text-ink-3 font-semibold">{live.length}</span></h2>
          <p className="hidden sm:block text-sm text-ink-3">{spotsFirst ? "Blind Spots across your doctors · hover one to see why" : "Hover one to see why"}</p>
        </div>
        {live.length === 0 ? (
          <p className="text-ink-2 border border-dashed border-rule-strong rounded-2xl px-5 py-6">No open Blind Spots. Every record we hold lines up across your doctors.</p>
        ) : (
          <div className={cn("grid gap-4 items-start", !compact && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]")}>
            <ol className="rounded-2xl border border-rule bg-raised divide-y divide-rule-soft overflow-hidden" onMouseLeave={() => setHot(null)}>
              {live.map((a, i) => {
                const on = selected?.id === a.id;
                const open = mobileOpen === a.id;
                return (
                  <li key={a.id} className="lit-row" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
                    <button
                      type="button"
                      onMouseEnter={() => pick(a.id)}
                      onFocus={() => pick(a.id)}
                      onClick={() => { pick(a.id); setMobileOpen(open ? null : a.id); }}
                      aria-expanded={open}
                      className={cn("w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors", on ? "lg:bg-sunk" : "hover:bg-sunk/60")}
                    >
                      <SpotBadge n={nOf(a.id)} severity={a.severity} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block font-semibold leading-snug", !compact && "lg:truncate", a.status === "acknowledged" && "text-ink-2")}>{a.title}</span>
                        <span className="block text-sm text-ink-3 mt-0.5">{TYPE_LABEL[a.type] ?? a.type}{a.status === "acknowledged" ? " · seen" : ""}</span>
                      </span>
                      <ChevronDown size={16} aria-hidden className={cn("shrink-0 text-ink-3 transition-transform", !compact && "lg:-rotate-90", open && "rotate-180", on && "lg:text-ink")} />
                    </button>
                    {open && (
                      <div className={cn("px-4 pb-4 pt-1", !compact && "lg:hidden")}>
                        <SpotDetail a={a} docHref={docHref} canAct={canAct} groupOf={groupOf} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {!compact && selected && (
              <div className="hidden lg:block sticky top-24 rounded-2xl border border-rule bg-raised p-5" onMouseEnter={() => setHot(selected.id)} onMouseLeave={() => setHot(null)}>
                <SpotDetail key={selected.id} a={selected} n={nOf(selected.id)} docHref={docHref} canAct={canAct} groupOf={groupOf} full />
              </div>
            )}
          </div>
        )}
        <DismissedNote alerts={alerts} canAct={canAct} />
      </div>
  );

  return spotsFirst ? (
    <div className="space-y-10">{spotsEl}{between}{mapEl}</div>
  ) : (
    <div>{mapEl}{between}{spotsEl}</div>
  );
}

function SpotBadge({ n, severity }: { n?: number; severity: AlertRow["severity"] }) {
  const tone = severity === "high" ? "bg-flag text-on-brand" : severity === "review" ? "bg-warn-soft text-warn" : "bg-sunk text-ink-2";
  return <span className={cn("grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold", tone)} aria-label={severity === "high" ? "Review soon" : severity === "review" ? "Worth reviewing" : "For your information"}>{n ?? "•"}</span>;
}

/** Split "Glycomet 500 mg" into name and strength, so the strength sits on the second line and is never truncated away. */
function splitDose(name: string, dose: string | null): [string, string | null] {
  const m = name.match(/^(.*?)\s+(\d[\d.,/]*\s*(?:mg|mcg|µg|g|ml|iu|units?|%)(?![a-z]).*)$/i);
  if (m) return [m[1], m[2]];
  return [name, dose];
}

/* ---------- layout ---------- */

interface Layout { groups: { key: GroupKey; y: number; rows: { row: MapRow; y: number }[] }[]; rowY: Map<string, number>; labsY: number; visitsY: number; height: number }

function buildLayout(map: CareMapData): Layout {
  let y = 0;
  const groups: Layout["groups"] = [];
  const rowY = new Map<string, number>();
  for (const g of GROUP_ORDER) {
    const rows = map.rows.filter((r) => r.group === g);
    if (!rows.length) continue;
    const gy = y;
    y += GROUP_H;
    const placed = rows.map((row) => {
      const ry = y + ROW / 2;
      rowY.set(row.key, ry);
      y += ROW;
      return { row, y: ry };
    });
    groups.push({ key: g, y: gy, rows: placed });
  }
  y += 10;
  const labsY = y + TRACK / 2;
  y += TRACK;
  const visitsY = y + TRACK / 2;
  y += TRACK;
  return { groups, rowY, labsY, visitsY, height: y + 6 };
}

function linkFor(a: AlertRow, n: number, map: CareMapData, L: Layout): Link_ | null {
  const pts: Pt[] = [];
  const rows = new Set<string>();
  for (const e of a.evidence) {
    if (e.kind === "medication") {
      const r = map.rows.find((x) => x.recordIds.includes(e.id));
      if (!r) continue;
      rows.add(r.key);
      pts.push({ x: pct(map, e.date ?? r.start), y: L.rowY.get(r.key)!, kind: e.kind });
    } else if (e.kind === "lab" && e.date) {
      pts.push({ x: pct(map, e.date), y: L.labsY, kind: e.kind });
    } else if ((e.kind === "symptom" || e.kind === "encounter" || e.kind === "condition") && e.date) {
      pts.push({ x: pct(map, e.date), y: L.visitsY, kind: e.kind });
    }
  }
  const uniq = pts.filter((p, i) => pts.findIndex((q) => Math.abs(q.x - p.x) < 0.01 && q.y === p.y) === i).sort((p, q) => p.x - q.x || p.y - q.y);
  return uniq.length >= 2 ? { a, n, pts: uniq, rows } : null;
}

function months(map: CareMapData) {
  const out: { date: string; label: string; year: boolean }[] = [];
  const a = new Date(map.from + "T00:00:00Z"), b = new Date(map.to + "T00:00:00Z");
  const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1));
  const totalMonths = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  const step = totalMonths > 30 ? 6 : totalMonths > 14 ? 3 : 1;
  while (d <= b) {
    if (d.getUTCMonth() % step === 0) {
      const year = d.getUTCMonth() === 0;
      out.push({ date: d.toISOString().slice(0, 10), year, label: year ? String(d.getUTCFullYear()) : d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }) });
    }
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

/* ---------- map ---------- */

function MapView({ map, layout: L, links, hot, setHot, providerHref, onPick }: { map: CareMapData; layout: Layout; links: Link_[]; hot: string | null; setHot: (s: string | null) => void; providerHref?: string; onPick: (id: string) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  // On narrow screens, open the map at today's end so current medicines and recent flags are in view.
  useEffect(() => {
    const id = requestAnimationFrame(() => { const el = scroller.current; if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth; });
    return () => cancelAnimationFrame(id);
  }, []);
  if (!map.rows.length && !map.labs.length) return <p className="text-ink-2 rounded-2xl border border-dashed border-rule-strong px-5 py-6">Your medication map appears here once your first record is confirmed.</p>;
  const focus = hot ?? links[0]?.a.id ?? null;
  const hotLink = hot ? links.find((l) => l.a.id === hot) : undefined;
  const ticks = months(map);
  const todayX = pct(map, map.today);
  const present = L.groups.map((g) => g.key);

  return (
    <figure className="rounded-2xl border border-rule bg-raised" aria-label="Medication map: each medicine course is a bar from its start to its end, coloured by what it treats">
      <figcaption className="flex items-center gap-x-3.5 gap-y-1.5 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:whitespace-normal px-4 sm:px-5 py-3 border-b border-rule-soft text-xs">
        <span className="text-sm font-semibold text-ink mr-2">Medication map</span>
        {present.map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5 text-ink-3"><span className="swatch" style={{ background: GROUPS[g].color }} />{GROUPS[g].label}</span>
        ))}
        {links.length > 0 && <span className="inline-flex items-center gap-1.5 text-ink-3"><svg width="18" height="8" aria-hidden><path d="M1 4 H17" stroke="var(--color-flag)" strokeWidth="2" strokeLinecap="round" /></svg>Blind Spot</span>}
      </figcaption>
      <div className="overflow-x-auto" ref={scroller}>
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "clamp(150px, 20vw, 230px) 1fr" }}>
          {/* label column */}
          <div className="sticky left-0 z-10 bg-raised border-r border-rule-soft">
            <div style={{ height: AXIS }} />
            <div className="relative" style={{ height: L.height }}>
              {L.groups.map((g) => (
                <div key={g.key}>
                  <div className="absolute inset-x-0 flex items-end px-4 sm:px-5 pb-1 text-[0.8rem] font-bold tracking-[-0.01em] text-ink" style={{ top: g.y, height: GROUP_H }}><span className="truncate">{GROUPS[g.key].label}</span></div>
                  {g.rows.map(({ row, y }) => (
                    <div key={row.key} className={cn("absolute inset-x-0 flex items-center gap-2 px-4 sm:px-5 transition-opacity", hotLink && !hotLink.rows.has(row.key) && "opacity-40")} style={{ top: y - ROW / 2, height: ROW }}>
                      <span className="swatch" style={{ background: GROUPS[row.group].color }} />
                      <span className="min-w-0 leading-tight">
                        <span className={cn("block truncate text-sm font-semibold", !row.ongoing && "text-ink-2")}>{splitDose(row.name, row.dose)[0]}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {splitDose(row.name, row.dose)[1] ? <span className="font-semibold text-ink-2">{splitDose(row.name, row.dose)[1]} · </span> : null}
                          {row.prescribers.map((p, i) => (
                            <span key={p.id}>{i ? ", " : ""}{providerHref ? <Link href={`${providerHref}${p.id}`} className="hover:text-brand hover:underline">{p.name}</Link> : p.name}</span>
                          ))}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="absolute inset-x-0 flex items-center px-4 sm:px-5 text-sm font-semibold text-ink-2" style={{ top: L.labsY - TRACK / 2, height: TRACK }}>Lab tests</div>
              <div className="absolute inset-x-0 flex items-center px-4 sm:px-5 text-sm font-semibold text-ink-2" style={{ top: L.visitsY - TRACK / 2, height: TRACK }}>Visits &amp; symptoms</div>
            </div>
          </div>

          {/* time column */}
          <div className="relative pr-4 sm:pr-6 pl-2">
            <div className="relative" style={{ height: AXIS }}>
              {ticks.map((t) => (
                <span key={t.date} className={cn("absolute top-2 -translate-x-1/2 text-xs whitespace-nowrap", t.year ? "font-semibold text-ink" : "text-ink-3")} style={{ left: `${pct(map, t.date)}%` }}>{t.label}</span>
              ))}
              <span className="absolute top-1.5 -translate-x-1/2 rounded-md bg-ink px-1.5 py-px text-[11px] font-semibold text-canvas" style={{ left: `${todayX}%` }}>Today</span>
            </div>
            <div className="relative" style={{ height: L.height }}>
              {ticks.map((t) => <span key={t.date} className={cn("absolute top-0 bottom-0 w-px", t.year ? "bg-rule" : "bg-rule-soft")} style={{ left: `${pct(map, t.date)}%` }} aria-hidden />)}
              <span className="absolute top-0 bottom-0 w-px bg-ink/50" style={{ left: `${todayX}%` }} aria-hidden />
              {map.cities.map((c) => (
                <div key={c.city} className="absolute top-0 bottom-0" style={{ left: `${pct(map, c.date)}%` }}>
                  <span className="absolute top-0 bottom-0 border-l border-dashed border-ink-3/60" aria-hidden />
                  <span className="hidden sm:block absolute -top-px left-1.5 whitespace-nowrap rounded-md bg-sunk px-1.5 py-px text-[11px] font-semibold text-ink-2">{c.city} from here</span>
                </div>
              ))}
              <span className="absolute inset-x-0 h-px bg-rule-soft" style={{ top: L.labsY - TRACK / 2 - 5 }} aria-hidden />

              {/* course bars */}
              {L.groups.flatMap((g) => g.rows).map(({ row, y }, i) => {
                const left = pct(map, row.start);
                const right = row.ongoing ? todayX : pct(map, row.end ?? map.today);
                const lit = hotLink?.rows.has(row.key);
                return (
                  <span
                    key={row.key}
                    title={`${row.name}: ${fmtDate(row.start)} – ${row.ongoing ? "continuing" : fmtDate(row.end)} · ${row.prescribers.map((p) => p.name).join(", ")}`}
                    className={cn("bar-grow absolute h-3.5 -translate-y-1/2 transition-[opacity,box-shadow] duration-200", row.ongoing ? "rounded-l-[4px] rounded-r-full" : "rounded-[4px]", hotLink && !lit && "opacity-25", lit && "ring-2 ring-flag ring-offset-2 ring-offset-raised")}
                    style={{ top: y, left: `${left}%`, width: `max(6px, ${right - left}%)`, background: GROUPS[row.group].color, animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  />
                );
              })}

              {/* lab draws and visits */}
              {map.labs.map((p) => <Dot key={p.id} p={p} y={L.labsY} map={map} shape="lab" dim={!!hotLink} />)}
              {map.visits.map((p) => <Dot key={p.id} p={p} y={L.visitsY} map={map} shape="visit" dim={!!hotLink} />)}

              {/* Blind Spot connectors */}
              <svg className="absolute inset-0 h-full w-full overflow-visible pointer-events-none" viewBox={`0 0 100 ${L.height}`} preserveAspectRatio="none" aria-hidden>
                {links.map((l) => {
                  const on = focus === l.a.id;
                  const d = l.pts.map((p, i) => {
                    if (!i) return `M${p.x} ${p.y}`;
                    const q = l.pts[i - 1];
                    const mx = (q.x + p.x) / 2;
                    return `C${mx} ${q.y} ${mx} ${p.y} ${p.x} ${p.y}`;
                  }).join(" ");
                  return (
                    <path key={l.a.id} d={d} fill="none" stroke="var(--color-flag)" strokeWidth={on ? (hot ? 3 : 2.25) : 1.5} strokeOpacity={on ? 1 : hot ? 0.1 : 0.4} strokeDasharray={l.a.status === "acknowledged" ? "5 5" : undefined}
                      vectorEffect="non-scaling-stroke" className={l.a.status === "acknowledged" ? undefined : "link-draw"} style={{ ["--len" as string]: 600, transition: "stroke-width .2s, stroke-opacity .2s" }} />
                  );
                })}
              </svg>
              {links.map((l) => {
                const on = focus === l.a.id;
                return l.pts.map((p, i) => (
                  <span key={`${l.a.id}-${i}`} aria-hidden className={cn("absolute z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-flag transition-all pointer-events-none", i === l.pts.length - 1 ? "bg-flag" : "bg-raised", on ? "h-3.5 w-3.5" : "h-2.5 w-2.5", !on && (hot ? "opacity-15" : "opacity-60"))} style={{ left: `${p.x}%`, top: p.y }} />
                ));
              })}
              {links.map((l) => {
                const top = l.pts.reduce((m, p) => (p.y < m.y ? p : m), l.pts[0]);
                const on = focus === l.a.id;
                return (
                  <button
                    key={`n-${l.a.id}`}
                    type="button"
                    onMouseEnter={() => setHot(l.a.id)}
                    onMouseLeave={() => setHot(null)}
                    onFocus={() => setHot(l.a.id)}
                    onBlur={() => setHot(null)}
                    onClick={() => onPick(l.a.id)}
                    aria-label={`Blind Spot ${l.n}: ${l.a.title}`}
                    className={cn("absolute z-[2] grid h-5 min-w-5 -translate-x-1/2 -translate-y-[160%] place-items-center rounded-full bg-flag px-1 text-[11px] font-bold text-on-brand transition-[opacity,transform]", on && hot && "scale-125", !on && (hot ? "opacity-20" : "opacity-70"))}
                    style={{ left: `${top.x}%`, top: top.y }}
                  >
                    {l.n}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

function Dot({ p, y, map, shape, dim }: { p: { id: string; date: string; label: string }; y: number; map: CareMapData; shape: "lab" | "visit"; dim: boolean }) {
  return (
    <span
      title={`${p.label} · ${fmtDate(p.date)}`}
      className={cn("absolute -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-ink-3 bg-raised transition-opacity", shape === "lab" ? "h-2.5 w-2.5 rounded-full" : "h-2.5 w-2.5 rotate-45 rounded-[2px]", dim && "opacity-40")}
      style={{ left: `${pct(map, p.date)}%`, top: y }}
    />
  );
}

/* ---------- Blind Spot cards ---------- */

function SpotDetail({ a, n, docHref, canAct, groupOf, full }: { a: AlertRow; n?: number; docHref: string; canAct: boolean; groupOf: (id: string) => GroupKey | undefined; full?: boolean }) {
  const [why, setWhy] = useState(false);
  const [pending, start] = useTransition();
  const providers = [...new Set(a.evidence.map((e) => e.provider).filter(Boolean))];
  const wasted = typeof a.meta?.wastedInr === "number" ? (a.meta.wastedInr as number) : null;
  const sev = a.severity === "high" ? { tone: "flag" as const, label: "Review soon" } : a.severity === "review" ? { tone: "warn" as const, label: "Worth reviewing" } : { tone: "muted" as const, label: "For your information" };
  return (
    <div className="lit-row">
      {full && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {n ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-flag px-1.5 text-xs font-bold text-on-brand" aria-label={`Blind Spot ${n} on the map`}>{n}</span> : null}
            <Chip tone={sev.tone}>{sev.label}</Chip>
            {a.status === "acknowledged" && <Chip tone="ok" line="pending">Seen</Chip>}
          </div>
          <h3 className="text-[1.06rem] font-bold leading-snug tracking-[-0.015em]">{a.title}</h3>
        </>
      )}
      <p className={cn("text-sm text-ink-2", full && "mt-1")}>{full ? (TYPE_LABEL[a.type] ?? a.type) : sev.label}{a.cross_provider && providers.length > 1 ? <span className="font-semibold text-flag"> · across {providers.length} doctors</span> : null}</p>
      <ol className="mt-3 space-y-2 border-t border-rule-soft pt-3" aria-label="Evidence">
        {a.evidence.map((e, k) => {
          const g = e.kind === "medication" ? groupOf(e.id) : undefined;
          return (
            <li key={`${e.id}-${k}`} className="flex gap-2.5 text-sm">
              <span className="mt-[0.4rem] shrink-0" aria-hidden>
                {g ? <span className="swatch block" style={{ background: GROUPS[g].color }} /> : e.kind === "lab" ? <span className="block h-2.5 w-2.5 rounded-full border-[1.5px] border-ink-3" /> : e.kind === "allergy" ? <span className="block h-2.5 w-2.5 rounded-[2px] bg-flag" /> : <span className="block h-2.5 w-2.5 rotate-45 rounded-[2px] border-[1.5px] border-ink-3" />}
              </span>
              <span className="min-w-0">
                <span className="font-semibold">{e.label}</span>
                <span className="text-ink-2">{e.date ? ` · ${fmtDate(e.date)}` : ""}{e.provider ? ` · ${e.provider}` : ""}</span>
                {e.documentId && docHref && (
                  <a href={docHref.replace("{id}", e.documentId)} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-brand font-semibold hover:underline">
                    <FileText size={13} strokeWidth={2} aria-hidden /> source
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {wasted ? <p className="mt-3 text-sm font-semibold text-ink">Avoidable cost ≈ ₹{wasted}</p> : null}
      <button onClick={() => setWhy((o) => !o)} aria-expanded={why} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
        Why this matters <ChevronDown size={15} className={cn("transition-transform", why && "rotate-180")} />
      </button>
      {why && (
        <div className="mt-2 text-sm text-ink-2 space-y-2">
          <p>{a.body}</p>
          {a.ref && <p className="flex gap-1.5 text-xs"><BookOpen size={14} className="shrink-0 mt-0.5" aria-hidden /> {a.ref}</p>}
          <p className="text-xs">Continuum surfaces patterns for a doctor to review. It does not diagnose. Do not stop a medicine without advice.</p>
        </div>
      )}
      {canAct && (
        <div className="mt-4 flex flex-wrap gap-2">
          {a.status === "open" ? (
            <button disabled={pending} onClick={() => start(() => setAlertStatus(a.id, "acknowledged"))} className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-[10px] border border-rule text-sm font-semibold hover:border-rule-strong hover:bg-sunk disabled:opacity-60">
              <Check size={15} /> Mark as seen
            </button>
          ) : (
            <button disabled={pending} onClick={() => start(() => setAlertStatus(a.id, "open"))} className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-[10px] border border-rule text-sm font-semibold hover:border-rule-strong hover:bg-sunk disabled:opacity-60">
              <RotateCcw size={15} /> Reopen
            </button>
          )}
          <button disabled={pending} onClick={() => start(() => setAlertStatus(a.id, "dismissed"))} className="inline-flex items-center gap-1.5 min-h-9 px-3 rounded-[10px] text-sm font-semibold text-ink-2 hover:bg-sunk disabled:opacity-60">
            <EyeOff size={15} /> Not relevant
          </button>
        </div>
      )}
    </div>
  );
}

function DismissedNote({ alerts, canAct }: { alerts: AlertRow[]; canAct: boolean }) {
  const dismissed = alerts.filter((a) => a.status === "dismissed");
  const [show, setShow] = useState(false);
  const [, start] = useTransition();
  if (!dismissed.length) return null;
  return (
    <div className="mt-4 text-sm">
      <button onClick={() => setShow((s) => !s)} className="text-ink-2 font-semibold hover:text-brand inline-flex items-center gap-1">
        {dismissed.length} marked not relevant <ArrowRight size={14} className={cn("transition-transform", show && "rotate-90")} />
      </button>
      {show && (
        <ul className="mt-2 space-y-1">
          {dismissed.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <span className="line-ended">{a.title}</span>
              {canAct && <button onClick={() => start(() => setAlertStatus(a.id, "open"))} className="text-brand font-semibold">Restore</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
