"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RELAY_PATH } from "./relay";
import { authCookieName, isSlot, SLOT_COOKIE, slotFromPath } from "./slot";

let _client: SupabaseClient | null = null;
/** Browser client, routed through the same-origin relay. It uses the session cookie of this tab's role slot, shared with the server. */
export function supabaseBrowser(): SupabaseClient {
  if (!_client) {
    const remembered = document.cookie.match(new RegExp(`(?:^|; )${SLOT_COOKIE}=([^;]*)`))?.[1];
    const slot = slotFromPath(window.location.pathname) ?? (isSlot(remembered) ? remembered : "patient");
    _client = createBrowserClient(window.location.origin + RELAY_PATH, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookieOptions: { name: authCookieName(slot) },
    });
  }
  return _client;
}
