"use client";
import { useActionState } from "react";
import { login, type FormState } from "@/app/actions/auth";
import { Button, Field } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Email"><input name="email" type="email" autoComplete="email" required className="field" /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className="field" /></Field>
      {state?.error && <p role="alert" className="font-semibold text-flag">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
