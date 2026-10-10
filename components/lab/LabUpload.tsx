"use client";
import { useRef } from "react";
import { Uploader } from "../record/Uploader";
import { Field } from "../ui";

export function LabUpload() {
  const hid = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <Field label="Patient's Health ID" hint="From the patient's Continuum card or app. The report goes to them for confirmation.">
        <input ref={hid} className="field uppercase tracking-[0.04em] max-w-xs" placeholder="CN-XXXX-XXXX" autoComplete="off" />
      </Field>
      <Uploader healthId={() => hid.current?.value.trim() ?? ""} reviewBase={null} compact />
    </div>
  );
}
