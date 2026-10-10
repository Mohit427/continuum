"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useLive } from "@/lib/live";
import { markNotificationsRead } from "@/app/actions/documents";
import { relTime } from "../ui";

interface N { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string; type: string }

/** Notification bell with live updates (Supabase Realtime, polling fallback; RLS-filtered to the user). Refreshes the page on access changes. */
export function Notifications({ userId, initial }: { userId: string; initial: N[] }) {
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read_at).length;

  const seen = useRef(new Set(initial.map((n) => n.id)));
  const arrive = useCallback((fresh: N[]) => {
    const added = fresh.filter((n) => !seen.current.has(n.id));
    if (!added.length) return;
    added.forEach((n) => seen.current.add(n.id));
    setItems((x) => [...added, ...x.filter((o) => !added.some((a) => a.id === o.id))].slice(0, 20));
    const n = added[0];
    toast(n.title, { description: n.body ?? undefined, action: n.link ? { label: "Open", onClick: () => router.push(n.link!) } : undefined });
    router.refresh();
  }, [router]);

  useLive(
    `notif-${userId}`,
    (ch) => ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (p) => arrive([p.new as N])),
    () => { fetch("/api/notifications", { cache: "no-store" }).then((r) => (r.ok ? r.json() : [])).then((list: N[]) => arrive(list.filter((n) => !n.read_at))).catch(() => {}); },
  );

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = async () => {
    setOpen((o) => !o);
    if (!open && unread) {
      setItems((x) => x.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      await markNotificationsRead();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunk hover:text-ink">
        <Bell size={19} strokeWidth={1.75} />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-flag text-[11px] font-bold text-on-brand grid place-items-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] rounded-2xl border border-rule bg-raised text-ink shadow-pop overflow-hidden">
          <div className="px-4 py-3 border-b border-rule text-sm font-semibold">Notifications</div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-ink-2 text-sm">Nothing yet.</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-rule-soft">
              {items.map((n) => {
                const body = (
                  <>
                    <p className="text-sm font-semibold leading-snug">{n.title}</p>
                    {n.body && <p className="text-sm text-ink-2 leading-snug mt-0.5">{n.body}</p>}
                    <p className="text-xs text-ink-3 mt-1">{relTime(n.created_at)}</p>
                  </>
                );
                return (
                  <li key={n.id} className={n.type === "break_glass" ? "bg-flag-soft" : undefined}>
                    {n.link ? <Link href={n.link} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-sunk">{body}</Link> : <div className="px-4 py-3">{body}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
