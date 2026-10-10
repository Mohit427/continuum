import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { Chip, Empty, fmtDateTime } from "@/components/ui";

export const metadata = { title: "Access log" };

const ACTION: Record<string, { label: string; tone: "brand" | "flag" | "pend" | "muted" }> = {
  view: { label: "Viewed record", tone: "brand" },
  view_document: { label: "Opened a document", tone: "brand" },
  emergency_scan: { label: "Emergency card scanned", tone: "flag" },
  break_glass: { label: "Emergency full access", tone: "flag" },
  add_note: { label: "Added a note", tone: "pend" },
  revoke: { label: "You revoked access", tone: "muted" },
  export: { label: "You exported your record", tone: "muted" },
  emergency_card_rotated: { label: "You replaced your emergency card", tone: "muted" },
};

/** Append-only access log, readable only by the patient (RLS). Nobody can edit or delete entries. */
export default async function AccessLog() {
  const { profile } = await requireRole("patient");
  const { data } = await (await supabaseUser()).from("access_logs").select("*").eq("patient_id", profile.id).order("at", { ascending: false }).limit(200);
  return (
    <div className="space-y-6">
      <Link href="/patient/sharing" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={15} /> Sharing</Link>
      <div>
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Who opened my record</h1>
        <p className="text-ink-2 mt-1 max-w-prose">Every view, document opened, emergency scan and change, in order. Entries can't be edited or deleted, by anyone.</p>
      </div>
      {!data?.length ? (
        <Empty title="No one has opened your record yet" />
      ) : (
        <div className="border border-rule rounded-2xl overflow-x-auto bg-raised">
          <table className="chart min-w-[680px]">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
            <tbody>
              {data.map((l) => {
                const a = ACTION[l.action] ?? { label: l.action, tone: "muted" as const };
                return (
                  <tr key={l.id} className={l.action === "break_glass" || l.action === "emergency_scan" ? "bg-flag-soft" : undefined}>
                    <td className="whitespace-nowrap">{fmtDateTime(l.at)}</td>
                    <td className="font-semibold">{l.actor_label}</td>
                    <td><Chip tone={a.tone}>{a.label}</Chip></td>
                    <td className="text-ink-2">{l.detail ?? ""}{l.ip ? <span className="block text-xs text-ink-3">from {l.ip}</span> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
