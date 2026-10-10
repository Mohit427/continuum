"use client";
import { useActionState, useState } from "react";
import { signup, type FormState } from "@/app/actions/auth";
import { Button, cn, Field } from "@/components/ui";

const ROLES = [
  { id: "patient", label: "I'm a patient", sub: "or caring for one" },
  { id: "doctor", label: "I'm a doctor", sub: "registered practitioner" },
  { id: "lab", label: "We're a lab", sub: "diagnostic centre" },
] as const;

export function SignupForm({ initialRole }: { initialRole: "patient" | "doctor" | "lab" }) {
  const [role, setRole] = useState(initialRole);
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  return (
    <form action={action} className="mt-6 space-y-5">
      <fieldset>
        <legend className="label">Who are you?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map((r) => (
            <label key={r.id} className={cn("cursor-pointer rounded-xl border px-3 py-2.5", role === r.id ? "border-brand bg-brand-soft" : "border-rule hover:border-brand")}>
              <input type="radio" name="role" value={r.id} checked={role === r.id} onChange={() => setRole(r.id)} className="sr-only" />
              <span className="block font-semibold">{r.label}</span><span className="block text-xs text-ink-2">{r.sub}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={role === "lab" ? "Contact person" : "Full name"}><input name="full_name" required className="field" autoComplete="name" /></Field>
        <Field label="Email"><input name="email" type="email" required className="field" autoComplete="email" /></Field>
        <Field label="Password" hint="At least 8 characters"><input name="password" type="password" minLength={8} required className="field" autoComplete="new-password" /></Field>
        {role === "patient" ? (
          <>
            <Field label="Date of birth"><input name="dob" type="date" required className="field" /></Field>
            <Field label="Sex">
              <select name="sex" className="field" defaultValue="F"><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select>
            </Field>
            <Field label="Blood group (optional)">
              <select name="blood_group" className="field" defaultValue=""><option value="">Not known</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}</select>
            </Field>
            <Field label="Phone (optional)"><input name="phone" type="tel" className="field" /></Field>
            <Field label="Emergency contact name (optional)"><input name="ec_name" className="field" /></Field>
            <Field label="Their relation"><input name="ec_relation" className="field" placeholder="e.g. Son" /></Field>
            <Field label="Their phone"><input name="ec_phone" type="tel" className="field" /></Field>
          </>
        ) : (
          <>
            <Field label={role === "doctor" ? "Clinic / hospital" : "Lab name"}><input name="organization" required className="field" /></Field>
            <Field label={role === "doctor" ? "Medical council registration no." : "NABL / accreditation no."}><input name="registration_no" required className="field" /></Field>
            {role === "doctor" && <Field label="Specialty"><input name="specialty" className="field" placeholder="e.g. Cardiology" /></Field>}
          </>
        )}
      </div>
      {role !== "patient" && <p className="text-sm text-ink-2">Registration numbers are shown to patients with every request. In this prototype they are not verified against the council registry.</p>}
      {state?.error && <p role="alert" className="font-semibold text-flag">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Creating…" : "Create account"}</Button>
    </form>
  );
}
