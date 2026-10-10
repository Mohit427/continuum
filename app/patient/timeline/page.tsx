import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { loadRecord } from "@/lib/data/record";
import { stations } from "@/lib/data/views";
import { TimelineList } from "@/components/record/TimelineList";
import { cn } from "@/components/ui";

export const metadata = { title: "Timeline" };

export default async function Timeline({ searchParams }: PageProps<"/patient/timeline">) {
  const { profile } = await requireRole("patient");
  const sp = await searchParams;
  const provider = typeof sp.provider === "string" ? sp.provider : undefined;
  const kind = typeof sp.kind === "string" ? sp.kind : undefined;
  const rec = await loadRecord(await supabaseUser(), profile.id, profile);
  const st = stations(rec);
  const q = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ provider, kind, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/patient/timeline${u.size ? `?${u}` : ""}`;
  };
  const pill = (on: boolean) => cn("inline-flex items-center min-h-9 px-3 rounded-xl border text-sm font-semibold whitespace-nowrap", on ? "bg-brand text-on-brand border-brand" : "bg-raised border-rule text-ink-2 hover:border-brand hover:text-brand");

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Timeline</h1>
          <p className="text-ink-2 mt-1">Every visit and test, newest first.</p>
        </div>
        <nav aria-label="Filter by type" className="flex flex-wrap gap-2">
          <Link href={q({ kind: undefined })} className={pill(!kind)}>All</Link>
          <Link href={q({ kind: "consultation" })} className={pill(kind === "consultation")}>Visits</Link>
          <Link href={q({ kind: "lab" })} className={pill(kind === "lab")}>Lab tests</Link>
        </nav>
        <nav aria-label="Filter by doctor or lab">
          <p className="label">Doctor or lab</p>
          <ul className="space-y-1">
            <li><Link href={q({ provider: undefined })} className={cn("block rounded-xl px-3 py-2 text-sm", !provider ? "bg-brand-soft font-semibold text-brand" : "hover:bg-sunk")}>All doctors and labs</Link></li>
            {st.map((s) => (
              <li key={s.key}>
                <Link href={q({ provider: s.providerId })} aria-current={provider === s.providerId ? "true" : undefined} className={cn("block rounded-xl px-3 py-2 text-sm", provider === s.providerId ? "bg-brand-soft font-semibold text-brand" : "hover:bg-sunk")}>
                  {s.name}<span className="block text-xs text-ink-2">{s.specialty}{s.city ? ` · ${s.city}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <TimelineList rec={rec} docHref="/api/documents/{id}/file" providerId={provider} kind={kind} />
    </div>
  );
}
