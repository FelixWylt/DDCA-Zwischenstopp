// Dagobert Ducks Archiv service worker: keeps the app (and the INDUCKS catalogue) on the phone for offline use.
const VERSION = "da-v3";
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest", "vendor/papaparse.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "fonts/bricolage-grotesque-latin-500-normal.woff2", "fonts/bricolage-grotesque-latin-700-normal.woff2",
  "fonts/bricolage-grotesque-latin-800-normal.woff2", "fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-700-normal.woff2", "fonts/jetbrains-mono-latin-400-normal.woff2",
  "fonts/jetbrains-mono-latin-500-normal.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL);
    // the catalogue is optional: cache it whole if it has been published
    try {
      const r = await fetch("catalogue/index.json", { cache: "no-cache" });
      if (r.ok) {
        const idx = await r.clone().json();
        await cache.put("catalogue/index.json", r);
        const files = Object.values(idx.series || {}).map(s => "catalogue/" + s.file);
        await cache.addAll(files);
      }
    } catch (e) { /* no catalogue yet */ }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => { if (event.data === "activate") self.skipWaiting(); });

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
      return Response.error();
    }
  })());
});
