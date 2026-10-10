import type { ReactNode } from "react";
import Link from "next/link";
import { Wordmark } from "./shell/Logo";
import { ThemeToggle } from "./shell/ThemeToggle";

export function PublicShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <>
      <header className="bg-raised border-b border-rule no-print">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="rounded"><Wordmark /></Link>
          <div className="flex items-center gap-2 text-ink-2">{right}<ThemeToggle /></div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-[1360px] px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </>
  );
}

export function Denied({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="mx-auto mb-5 h-14 w-14 rounded-full border-[3px] border-dashed border-ink-3 grid place-items-center"><span className="block h-0.5 w-6 bg-ink-3 rotate-45" /></div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-ink-2 mt-2">{body}</p>
    </div>
  );
}
