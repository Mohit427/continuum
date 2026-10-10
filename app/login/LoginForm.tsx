"use client";
import { useState } from "react";
import { submitAuth } from "@/components/authSubmit";
import { Button, Field } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      method="post"
      action="/auth/login"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const err = await submitAuth("login", e.currentTarget);
        if (err) { setError(err); setPending(false); }
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="next" value={next} />
      <Field label="Email"><input name="email" type="email" autoComplete="email" required className="field" /></Field>
      <Field label="Password"><input name="password" type="password" autoComplete="current-password" required className="field" /></Field>
      {error && <p role="alert" className="font-semibold text-flag">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
