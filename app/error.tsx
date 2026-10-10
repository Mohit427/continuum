"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <h1 className="text-2xl font-semibold">Something went wrong on our side</h1>
      <p className="text-ink-2 mt-2">Your records are safe. Try again, and if it keeps happening, sign out and back in.</p>
      {error.digest && <p className="text-xs text-ink-3 mt-2">Reference: {error.digest}</p>}
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </div>
  );
}
