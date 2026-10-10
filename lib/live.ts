"use client";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Live updates with a fallback: Supabase Realtime when the websocket connects, otherwise
 * (blocked network, proxy without websocket support) poll every `pollMs`.
 */
export function useLive(key: string, build: (ch: RealtimeChannel) => RealtimeChannel, poll: () => void, pollMs = 8000) {
  const buildRef = useRef(build);
  const pollRef = useRef(poll);
  buildRef.current = build;
  pollRef.current = poll;

  useEffect(() => {
    const sb = supabaseBrowser();
    let timer: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => { if (!timer) timer = setInterval(() => { if (document.visibilityState === "visible") pollRef.current(); }, pollMs); };
    const stopPolling = () => { if (timer) { clearInterval(timer); timer = null; } };
    const fallback = setTimeout(startPolling, 6000);
    const ch = buildRef.current(sb.channel(key)).subscribe((status) => {
      if (status === "SUBSCRIBED") { clearTimeout(fallback); stopPolling(); }
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") startPolling();
    });
    return () => { clearTimeout(fallback); stopPolling(); sb.removeChannel(ch); };
  }, [key, pollMs]);
}
