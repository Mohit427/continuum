import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { authCookieName, isSlot, SLOT_HEADER, type Slot } from "./slot";

const URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Per-request client acting as the signed-in user. Row Level Security applies.
 * Reads the session of the request's role slot (resolved in proxy.ts), or of an explicit slot when signing in.
 */
export async function supabaseUser(slot?: Slot): Promise<SupabaseClient> {
  const store = await cookies();
  const hinted = (await headers()).get(SLOT_HEADER);
  const s: Slot = slot ?? (isSlot(hinted) ? hinted : "patient");
  return createServerClient(URL(), ANON(), {
    cookieOptions: { name: authCookieName(s) },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there; proxy.ts refreshes the session.
        }
      },
    },
  });
}

let _admin: SupabaseClient | null = null;
/** Service-role client. Bypasses RLS: only use after an explicit authorization check. */
export function supabaseAdmin(): SupabaseClient {
  if (!_admin) _admin = createSbClient(URL(), process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  return _admin;
}
