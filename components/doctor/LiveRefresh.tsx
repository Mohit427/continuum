"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLive } from "@/lib/live";

/** Re-render when a grant or request involving this doctor changes (approve, revoke, expiry), so access disappears live. */
export function LiveRefresh({ doctorId, patientId }: { doctorId: string; patientId?: string }) {
  const router = useRouter();
  useLive(
    `doc-${doctorId}-${patientId ?? "all"}`,
    (ch) => ch
      .on("postgres_changes", { event: "*", schema: "public", table: "grants", filter: `grantee_id=eq.${doctorId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "access_requests", filter: `doctor_id=eq.${doctorId}` }, () => router.refresh()),
    () => router.refresh(),
  );
  return null;
}

/** Client-side expiry: when the grant's end time passes, re-render (server then denies access). */
export function ExpiryWatch({ expiresAt }: { expiresAt: string | null }) {
  const router = useRouter();
  useEffect(() => {
    if (!expiresAt) return;
    const ms = Date.parse(expiresAt) - Date.now();
    if (ms <= 0 || ms > 2 ** 31 - 1) return;
    const t = setTimeout(() => router.refresh(), ms + 500);
    return () => clearTimeout(t);
  }, [expiresAt, router]);
  return null;
}
