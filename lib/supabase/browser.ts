"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RELAY_PATH } from "./relay";

let _client: SupabaseClient | null = null;
/** Browser client, routed through the same-origin relay. The cookie name stays the project's so it shares the server session. */
export function supabaseBrowser(): SupabaseClient {
  if (!_client) {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
    _client = createBrowserClient(window.location.origin + RELAY_PATH, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookieOptions: { name: `sb-${ref}-auth-token` },
    });
  }
  return _client;
}
