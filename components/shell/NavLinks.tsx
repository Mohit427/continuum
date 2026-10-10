"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../ui";

export function NavLinks({ items, compact }: { items: { href: string; label: string }[]; compact?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className={cn("flex items-center gap-1", compact ? "h-12" : "h-16")}>
      {items.map((it) => {
        const on = it.href === path || (it.href !== items[0].href && path.startsWith(it.href)) || (it.href === items[0].href && path.startsWith(it.href + "/patients"));
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex items-center h-9 px-3.5 rounded-full text-[0.95rem] whitespace-nowrap transition-colors",
              on ? "bg-brand-soft text-brand font-semibold" : "text-ink-2 hover:text-ink hover:bg-sunk",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
