import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { AccessDenied, getDoctorAccess, resolveToken } from "@/lib/access";
import { audit } from "@/lib/notify";
import { relayUrl } from "@/lib/supabase/relay";

/**
 * Open an original document. Access is checked first (owner, doctor grant covering "documents",
 * or a share-link token), the access is logged, then a 60-second signed URL is issued.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/documents/[id]/file">) {
  const { id } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");
  const sb = supabaseAdmin();
  const { data: doc } = await sb.from("documents").select("id,patient_id,storage_path,file_name,status").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    if (token) {
      const g = await resolveToken(token, ["link", "caregiver"]);
      const cats = g.scope.categories as string[];
      if (g.patient_id !== doc.patient_id || !(cats.includes("all") || cats.includes("documents"))) throw new AccessDenied("none");
      await audit({ patientId: doc.patient_id, grantId: g.id, actorLabel: g.label ? `Link: ${g.label}` : "Share link", action: "view_document", detail: doc.file_name ?? undefined });
    } else {
      const s = await getSession();
      if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      if (s.profile.id !== doc.patient_id) {
        if (s.profile.role !== "doctor") throw new AccessDenied("none");
        const g = await getDoctorAccess(s.profile.id, doc.patient_id);
        const cats = g.scope.categories as string[];
        if (!(cats.includes("all") || cats.includes("documents")) || doc.status !== "confirmed") throw new AccessDenied("none");
        await audit({ patientId: doc.patient_id, grantId: g.id, actorId: s.profile.id, actorLabel: `${s.profile.full_name} (${s.profile.specialty ?? "Doctor"})`, action: "view_document", detail: doc.file_name ?? undefined });
      }
    }
  } catch (e) {
    if (e instanceof AccessDenied) return NextResponse.json({ error: "Access denied", reason: e.reason }, { status: 403 });
    throw e;
  }
  const { data } = await sb.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  if (!data) return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  return NextResponse.redirect(new URL(relayUrl(data.signedUrl), req.url));
}
