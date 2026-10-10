import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ComponentProps, ReactNode } from "react";

export const cn = (...c: ClassValue[]) => twMerge(clsx(c));

type Variant = "primary" | "secondary" | "danger" | "ghost" | "inverse";
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-deep shadow-[0_1px_2px_rgb(12_18_34/0.12)] disabled:opacity-50",
  secondary: "bg-raised text-ink border border-rule hover:border-rule-strong hover:bg-sunk disabled:text-ink-3",
  danger: "bg-flag text-on-brand hover:bg-flag-deep disabled:opacity-50",
  ghost: "text-brand hover:bg-brand-soft",
  inverse: "bg-raised text-brand hover:bg-brand-soft",
};

export function buttonClass(variant: Variant = "primary", size: "md" | "sm" | "lg" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 select-none",
    size === "sm" ? "min-h-9 px-3 text-sm" : size === "lg" ? "min-h-12 px-6 text-[1.05rem]" : "min-h-11 px-4 text-[0.97rem]",
    VARIANT[variant],
  );
}

export function Button({ variant = "primary", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: Variant; size?: "md" | "sm" | "lg" }) {
  return <button {...p} className={cn(buttonClass(variant, size), className)} />;
}

type Tone = "pend" | "brand" | "flag" | "ok" | "warn" | "muted";
const TONE: Record<Tone, string> = {
  pend: "bg-pend-soft text-pend-ink border-transparent",
  brand: "bg-brand-soft text-brand border-transparent",
  flag: "bg-flag-soft text-flag border-transparent",
  ok: "bg-ok-soft text-ok border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  muted: "bg-sunk text-ink-2 border-transparent",
};

/** Status pill. `line` carries state by line form as well as hue: pending = dashed outline, ended = struck through. */
export function Chip({ tone = "pend", line, children, className }: { tone?: Tone; line?: "pending" | "ended"; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONE[tone], line === "pending" && "line-pending border-current", line === "ended" && "line-ended", className)}>
      {children}
    </span>
  );
}

export function SectionTitle({ children, action, id, sub }: { children: ReactNode; action?: ReactNode; id?: string; sub?: ReactNode }) {
  return (
    <div id={id} className="flex flex-wrap items-end justify-between gap-3 mb-4 scroll-mt-24">
      <div>
        <h2 className="text-lg font-bold tracking-[-0.02em]">{children}</h2>
        {sub && <p className="text-sm text-ink-2 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className, ...p }: ComponentProps<"section">) {
  return <section {...p} className={cn("border border-rule rounded-2xl bg-raised", className)}>{children}</section>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-rule-strong rounded-2xl px-6 py-8 text-center">
      <p className="font-semibold text-lg">{title}</p>
      {children && <div className="text-ink-2 mt-1 max-w-prose mx-auto">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-2 mt-1">{hint}</span>}
    </label>
  );
}

export const fmtDate = (iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso).toLocaleDateString("en-IN", { ...opts, timeZone: iso.length === 10 ? "UTC" : undefined }) : "—";

export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export function relTime(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  const f = (n: number, u: string) => `${Math.round(n)} ${u}${Math.round(n) === 1 ? "" : "s"}`;
  const fut = s < 0, a = Math.abs(s);
  const t = a < 60 ? "just now" : a < 3600 ? f(a / 60, "minute") : a < 86400 ? f(a / 3600, "hour") : f(a / 86400, "day");
  return t === "just now" ? t : fut ? `in ${t}` : `${t} ago`;
}
