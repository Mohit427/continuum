import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRecord, toTimeline } from "../data/record";
import { runEngine } from "./index";
import type { EngineAlert } from "./types";

/** Document-level alerts are created by ingestion, not by the engine; never auto-resolve them. */
const DOC_LEVEL = new Set(["name_mismatch", "duplicate_upload"]);

/**
 * Re-run the Blind Spot Engine for one patient and reconcile alerts by fingerprint:
 * new → insert, still present → refresh text/evidence (keeping acknowledged/dismissed status),
 * gone → mark resolved. Only data from confirmed documents (or direct doctor notes) is used.
 */
export async function reconcileAlerts(sb: SupabaseClient, patientId: string, today?: string): Promise<{ added: EngineAlert[]; resolved: number; total: number }> {
  const rec = await loadRecord(sb, patientId);
  const confirmed = new Set(rec.documents.filter((d) => d.status === "confirmed").map((d) => d.id));
  const ok = (id: string | null | undefined) => !id || confirmed.has(id);
  const timeline = toTimeline(
    {
      providers: rec.providers,
      medications: rec.medications.filter((m) => ok(m.source_document_id)),
      labs: rec.labs.filter((l) => ok(l.source_document_id)),
      conditions: rec.conditions.filter((c) => ok(c.source_document_id)),
      encounters: rec.encounters.filter((e) => ok(e.document_id)),
      allergies: rec.allergies.filter((a) => ok(a.source_document_id)),
    },
    today,
  );
  const results = runEngine(timeline);

  const existing = new Map(rec.alerts.map((a) => [a.fingerprint, a]));
  const now = new Date().toISOString();
  const rows = results.map((a) => {
    const prev = existing.get(a.fingerprint);
    return {
      patient_id: patientId, type: a.type, severity: a.severity, title: a.title, body: a.body, evidence: a.evidence,
      meta: a.meta ?? null, cross_provider: a.crossProvider, rule_id: a.ruleId, ref: a.ref ?? null, fingerprint: a.fingerprint,
      status: prev && prev.status !== "resolved" ? prev.status : "open", updated_at: now,
    };
  });
  if (rows.length) {
    const { error } = await sb.from("alerts").upsert(rows, { onConflict: "patient_id,fingerprint" });
    if (error) throw new Error(`alerts upsert: ${error.message}`);
  }
  const live = new Set(results.map((a) => a.fingerprint));
  const stale = rec.alerts.filter((a) => !live.has(a.fingerprint) && !DOC_LEVEL.has(a.type) && a.status !== "resolved").map((a) => a.id);
  if (stale.length) await sb.from("alerts").update({ status: "resolved", updated_at: now }).in("id", stale);

  const added = results.filter((a) => !existing.has(a.fingerprint) || existing.get(a.fingerprint)!.status === "resolved");
  return { added, resolved: stale.length, total: results.length };
}
