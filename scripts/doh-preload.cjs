// Dev-only workaround: some Indian ISPs DNS-block *.supabase.co (resolve to 127.0.0.1).
// Preloaded via NODE_OPTIONS, it resolves Supabase hosts over DNS-over-HTTPS instead.
// Not used in production (Vercel resolves normally).
const dns = require("node:dns");
const https = require("node:https");

const cache = new Map();
const origLookup = dns.lookup;

function doh(host) {
  if (cache.has(host)) return cache.get(host);
  const p = new Promise((resolve, reject) => {
    const req = https.get(
      { host: "1.1.1.1", path: `/dns-query?name=${encodeURIComponent(host)}&type=A`, headers: { accept: "application/dns-json" }, servername: "cloudflare-dns.com" },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const ips = (JSON.parse(body).Answer || []).filter((a) => a.type === 1).map((a) => a.data);
            ips.length ? resolve(ips) : reject(new Error(`DoH: no A record for ${host}`));
          } catch (e) { reject(e); }
        });
      },
    );
    req.on("error", reject);
  });
  p.catch(() => cache.delete(host));
  cache.set(host, p);
  return p;
}

dns.lookup = function lookup(host, options, callback) {
  if (typeof options === "function") { callback = options; options = {}; }
  if (typeof options === "number") options = { family: options };
  if (typeof host !== "string" || !/\.supabase\.(co|in)$/i.test(host)) return origLookup.call(dns, host, options, callback);
  doh(host).then(
    (ips) => (options && options.all ? callback(null, ips.map((address) => ({ address, family: 4 }))) : callback(null, ips[0], 4)),
    () => origLookup.call(dns, host, options, callback),
  );
};
