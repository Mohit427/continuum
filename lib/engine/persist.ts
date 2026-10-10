import "server-only";
import { supabaseAdmin } from "../supabase/server";
import { reconcileAlerts } from "./reconcile";
import { notify } from "../notify";

/** Re-run the engine for a patient and notify them about new high-severity flags. */
export async function rerunEngine(patientId: string) {
  const res = await reconcileAlerts(supabaseAdmin(), patientId);
  for (const a of res.added.filter((x) => x.severity === "high")) {
    await notify(patientId, {
      type: "alert",
      title: `New safety flag: ${a.title}`,
      body: a.crossProvider ? "Found by connecting records from different doctors." : undefined,
      link: "/patient#blind-spots",
    });
  }
  return { added: res.added.length, resolved: res.resolved, total: res.total };
}
