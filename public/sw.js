// Continuum service worker: keeps emergency cards readable offline.
// Network-first for /e/* pages (always fresh when online), cached copy when offline.
const CACHE = "continuum-emergency-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "cache-card" && typeof e.data.url === "string") {
    e.waitUntil(caches.open(CACHE).then((c) => c.add(new Request(e.data.url, { credentials: "same-origin" }))));
  }
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  const isCard = url.pathname.startsWith("/e/");
  const isStatic = url.pathname.startsWith("/_next/static/");
  if (!isCard && !isStatic) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || new Response("Offline and this card was not saved on this device.", { status: 503, headers: { "content-type": "text/plain" } }))),
  );
});
