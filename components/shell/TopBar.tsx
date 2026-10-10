import Link from "next/link";
import { LogOut } from "lucide-react";
import { Wordmark } from "./Logo";
import { NavLinks } from "./NavLinks";
import { Notifications } from "./Notifications";
import { ThemeToggle } from "./ThemeToggle";
import { logout } from "@/app/actions/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

const NAV = {
  patient: [
    { href: "/patient", label: "Overview" },
    { href: "/patient/records", label: "Records" },
    { href: "/patient/timeline", label: "Timeline" },
    { href: "/patient/labs", label: "Lab trends" },
    { href: "/patient/sharing", label: "Sharing" },
    { href: "/patient/emergency", label: "Emergency card" },
  ],
  doctor: [{ href: "/doctor", label: "My patients" }],
  lab: [{ href: "/lab", label: "Send reports" }],
};

export async function TopBar({ profile }: { profile: Profile }) {
  const { data } = await supabaseAdmin().from("notifications").select("id,title,body,link,read_at,created_at,type").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(15);
  const who = profile.role === "doctor" ? `${profile.full_name} · ${profile.specialty ?? "Doctor"}` : profile.role === "lab" ? profile.full_name : profile.full_name;
  return (
    <header className="bg-raised/90 backdrop-blur-md border-b border-rule sticky top-0 z-40 no-print">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 h-16 flex items-center gap-6">
        <Link href={`/${profile.role}`} className="shrink-0 rounded"><Wordmark /></Link>
        <div className="hidden lg:block flex-1 min-w-0"><NavLinks items={NAV[profile.role]} /></div>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Notifications userId={profile.id} initial={data ?? []} />
          <div className="hidden sm:block text-right leading-tight pl-3 ml-1 border-l border-rule">
            <div className="text-sm font-semibold">{who}</div>
            <div className="text-xs text-ink-3">{profile.role === "patient" ? profile.health_id : profile.registration_no}</div>
          </div>
          <form action={logout}>
            <button className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunk hover:text-ink" aria-label="Sign out" title="Sign out">
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
      <div className="lg:hidden border-t border-rule overflow-x-auto"><div className="px-4 sm:px-8"><NavLinks items={NAV[profile.role]} compact /></div></div>
    </header>
  );
}
