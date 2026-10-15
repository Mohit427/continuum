import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { authCookieName, isSlot, SLOT_COOKIE, SLOT_HEADER, slotFromPath, type Slot } from "@/lib/supabase/slot";

const AREAS = { patient: "/patient", doctor: "/doctor", lab: "/lab" } as const;
type Role = keyof typeof AREAS;

/**
 * Refreshes the Supabase session cookie and does optimistic role routing:
 * each role can only enter its own area. Real authorization happens again in
 * server code (lib/auth.ts) and in Postgres Row Level Security.
 *
 * Sessions are kept per role (see lib/supabase/slot.ts), so a patient and a doctor can be
 * signed in side by side in one browser. The resolved slot is forwarded to server code as a header.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hinted = request.headers.get(SLOT_HEADER);
  const remembered = request.cookies.get(SLOT_COOKIE)?.value;
  const slot: Slot = slotFromPath(path) ?? (isSlot(hinted) ? hinted : isSlot(remembered) ? remembered : "patient");
  request.headers.set(SLOT_HEADER, slot);

  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { name: authCookieName(slot) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const area = (Object.entries(AREAS) as [Role, string][]).find(([, p]) => path === p || path.startsWith(p + "/"));

  if (area) {
    if (!user) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    const role = user.app_metadata?.role as Role | undefined;
    if (role && role !== area[0]) return NextResponse.redirect(new URL(AREAS[role], request.url));
  }
  // /login and /signup stay reachable while signed in, so a second role can sign in alongside the first.
  return response;
}

export const config = {
  matcher: ["/((?!sb/|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)"],
};
