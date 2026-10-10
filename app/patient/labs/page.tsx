import { requireRole } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { loadRecord } from "@/lib/data/record";
import { trends } from "@/lib/data/views";
import { TrendGrid } from "@/components/record/TrendGrid";

export const metadata = { title: "Lab trends" };

export default async function Labs() {
  const { profile } = await requireRole("patient");
  const rec = await loadRecord(await supabaseUser(), profile.id, profile);
  const all = trends(rec);
  const labs = all.filter((t) => rec.labs.find((l) => l.test_key === t.testKey)?.category === "lab");
  const vitals = all.filter((t) => rec.labs.find((l) => l.test_key === t.testKey)?.category === "vital");
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Lab trends</h1>
        <p className="text-ink-2 mt-1 max-w-prose">Results from every lab you have used, in one line per test, so a single number is never read without its history. Results in other units are converted.</p>
      </div>
      <section><h2 className="text-xl font-semibold mb-3">Tests</h2><TrendGrid trends={labs} columns={3} /></section>
      {vitals.length > 0 && <section><h2 className="text-xl font-semibold mb-3">Blood pressure, pulse and weight</h2><TrendGrid trends={vitals} columns={3} /></section>}
    </div>
  );
}
