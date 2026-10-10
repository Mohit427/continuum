import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { loadRecord } from "@/lib/data/record";
import { toFhirBundle } from "@/lib/fhir";
import { audit } from "@/lib/notify";

/** Patient downloads their whole record as a FHIR R4 Bundle (data portability). */
export async function GET() {
  const s = await getSession();
  if (!s || s.profile.role !== "patient") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const rec = await loadRecord(await supabaseUser(), s.profile.id, s.profile);
  await audit({ patientId: s.profile.id, actorId: s.profile.id, actorLabel: s.profile.full_name, action: "export", detail: "FHIR R4 bundle" });
  return new NextResponse(JSON.stringify(toFhirBundle(rec), null, 2), {
    headers: {
      "content-type": "application/fhir+json",
      "content-disposition": `attachment; filename="continuum-${s.profile.health_id ?? "record"}-fhir.json"`,
    },
  });
}
