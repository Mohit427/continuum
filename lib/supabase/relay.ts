/**
 * Browser traffic to Supabase goes through our own origin (/sb/* is rewritten in next.config.ts).
 * Some Indian ISPs DNS-block *.supabase.co, so a judge or patient on Jio/Airtel could not otherwise
 * upload or open documents. Server-side code talks to Supabase directly.
 */
export const RELAY_PATH = "/sb";

/** Turn a Supabase URL (e.g. a signed storage URL) into a same-origin relay path. */
export function relayUrl(url: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base && url.startsWith(base) ? RELAY_PATH + url.slice(base.length) : url;
}
