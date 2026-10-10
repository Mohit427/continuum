"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trend } from "@/lib/engine";

const fmt = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });

/** One test over time with its reference band. Cobalt line; out-of-range points in the flag colour. */
export function TrendChart({ t, low, high, height = 180 }: { t: Trend; low?: number; high?: number; height?: number }) {
  const data = t.points.map((p) => ({ ...p, label: fmt(p.date), out: (high !== undefined && p.value > high) || (low !== undefined && p.value < low) }));
  const vals = data.map((d) => d.value);
  const lo = Math.min(...vals, low ?? Infinity), hi = Math.max(...vals, high ?? -Infinity);
  const padv = (hi - lo || hi || 1) * 0.15;
  return (
    <div style={{ height }} role="img" aria-label={t.sentence}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--color-rule-soft)" vertical={false} />
          {(low !== undefined || high !== undefined) && (
            <ReferenceArea y1={low ?? lo - padv} y2={high ?? hi + padv} fill="var(--color-ok-soft)" fillOpacity={0.9} ifOverflow="extendDomain" />
          )}
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-ink-3)" }} tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} />
          <YAxis domain={[Math.floor((lo - padv) * 10) / 10, Math.ceil((hi + padv) * 10) / 10]} tick={{ fontSize: 12, fill: "var(--color-ink-3)" }} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-rule)", background: "var(--color-raised)", color: "var(--color-ink)", fontFamily: "var(--font-sans)", fontSize: 14 }}
            formatter={(v) => [`${v} ${t.unit}`, t.name]}
            labelFormatter={(l) => String(l)}
          />
          <Line
            type="monotone" dataKey="value" stroke="var(--color-brand)" strokeWidth={2.5} isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; payload?: { out: boolean }; index?: number }) => (
              <circle key={p.index} cx={p.cx} cy={p.cy} r={5} fill={p.payload?.out ? "var(--color-flag)" : "var(--color-raised)"} stroke={p.payload?.out ? "var(--color-flag)" : "var(--color-brand)"} strokeWidth={2.5} />
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
