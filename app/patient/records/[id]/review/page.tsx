import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { relayUrl } from "@/lib/supabase/relay";
import { ReviewForm } from "@/components/record/ReviewForm";
import { RetryButton } from "@/components/record/RetryButton";
import { Chip, fmtDate } from "@/components/ui";
import type { Extraction } from "@/lib/ingest/schema";
import type { Issue } from "@/lib/ingest/normalize";

export const metadata = { title: "Check a record" };

export default async function Review({ params }: PageProps<"/patient/records/[id]/review">) {
  const { id } = await params;
  const { profile } = await requireRole("patient");
  const sb = supabaseAdmin();
  const { data: doc } = await sb.from("documents").select("*").eq("id", id).eq("patient_id", profile.id).maybeSingle();
  if (!doc) notFound();
  const { data: signed } = await sb.storage.from("documents").createSignedUrl(doc.storage_path, 900);
  const ex = (doc.extracted_json ?? {}) as { extraction?: Extraction; issues?: Issue[]; model?: string };
  const confirmed = doc.status === "confirmed";

  return (
    <div>
      <Link href="/patient/records" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"><ArrowLeft size={15} /> Records</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">{confirmed ? "Edit record" : "Check what we read"}</h1>
          <p className="text-ink-2 mt-1">{doc.file_name} · uploaded {fmtDate(doc.created_at)}{doc.source === "lab" ? " by your lab" : ""}</p>
        </div>
        <div className="flex gap-2">
          {confirmed ? <Chip tone="ok">In your history</Chip> : <Chip tone="pend" line="pending">Not added yet</Chip>}
          {typeof doc.overall_confidence === "number" && <Chip tone={doc.overall_confidence >= 0.8 ? "brand" : "warn"}>Read with {Math.round(doc.overall_confidence * 100)}% confidence</Chip>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start">
        <div className="lg:sticky lg:top-24 rounded-xl border border-rule bg-sunk overflow-hidden">
          {signed?.signedUrl ? (
            doc.mime === "application/pdf" ? (
              <iframe src={`${relayUrl(signed.signedUrl)}#toolbar=0&view=FitH`} title="Original document" className="w-full h-[70vh] bg-raised" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={relayUrl(signed.signedUrl)} alt="Original document" className="w-full max-h-[75vh] object-contain bg-raised" />
            )
          ) : (
            <p className="p-6 text-ink-2">The original file could not be loaded.</p>
          )}
          <p className="px-4 py-2 text-xs text-ink-2 border-t border-rule bg-raised">The original stays attached to every fact taken from it.</p>
        </div>
        <div className="min-w-0">
          {ex.extraction ? (
            <ReviewForm id={doc.id} initial={ex.extraction} issues={ex.issues ?? []} patientName={profile.full_name} nameMismatch={!!doc.name_mismatch && !confirmed} duplicate={!!doc.duplicate_of && !confirmed} />
          ) : (
            <div className="rounded-xl border border-rule p-6">
              <p className="font-semibold">{doc.status === "failed" ? "We could not read this document." : "This document is still being read."}</p>
              {doc.error && <p className="text-ink-2 mt-1">{doc.error}</p>}
              <div className="mt-3"><RetryButton docId={doc.id} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
