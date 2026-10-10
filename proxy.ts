import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AREAS = { patient: "/patient", doctor: "/doctor", lab: "/lab" } as const;
type Role = keyof typeof AREAS;

/**
 * Refreshes the Supabase session cookie and does optimistic role routing:
 * each role can only enter its own area. Real authorization happens again in
 * server code (lib/auth.ts) and in Postgres Row Level Security.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response;

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  const path = request.nextUrl.pathname;
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
  if (user && (path === "/login" || path === "/signup")) {
    const role = user.app_metadata?.role as Role | undefined;
    if (role) return NextResponse.redirect(new URL(AREAS[role], request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!sb/|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)"],
};
