// Dagobert Ducks Archiv service worker: keeps the app (and the INDUCKS catalogue) on the phone for offline use.
const APP_VERSION = "da-v43";
const CATALOGUE = "202610311203";   // set by the INDUCKS catalogue job, so phones pick up a new catalogue
const VERSION = APP_VERSION + "-" + CATALOGUE;      // changes when either changes, so phones notice
const SHELL_CACHE = "da-app-" + APP_VERSION, CAT_CACHE = "da-cat-" + CATALOGUE;
const SHELL = [
  "./", "index.html", "styles.css", "app.js", "duckipedia.js", "books.js", "vendor/zxing.min.js", "manifest.webmanifest", "vendor/papaparse.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "fonts/bricolage-grotesque-latin-500-normal.woff2", "fonts/bricolage-grotesque-latin-700-normal.woff2",
  "fonts/bricolage-grotesque-latin-800-normal.woff2", "fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "fonts/atkinson-hyperlegible-latin-700-normal.woff2", "fonts/jetbrains-mono-latin-400-normal.woff2",
  "fonts/jetbrains-mono-latin-500-normal.woff2"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // "reload" skips the browser's own HTTP cache, so an update never stores old files
    await shell.addAll(SHELL.map(u => new Request(u, { cache: "reload" })));
    // the catalogue (about 16 MB) is downloaded only when it has changed, not on every app update
    try {
      const cat = await caches.open(CAT_CACHE);
      if (await cat.match("catalogue/index.json")) return;
      const r = await fetch("catalogue/index.json", { cache: "reload" });
      if (r.ok) {
        const idx = await r.clone().json();
        const files = [...new Set(Object.values(idx.series || {}).map(s => "catalogue/" + s.file))];
        await cat.addAll(files.map(u => new Request(u, { cache: "reload" })));
        await cat.put("catalogue/index.json", r);   // last, so a half-finished download is never taken as complete
      }
    } catch (e) { /* no catalogue yet, or offline: the old one stays in use */ }
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE];
    // keep the new catalogue if it downloaded completely, otherwise the newest complete older one
    const cats = (await caches.keys()).filter(k => k.startsWith("da-cat-")).sort().reverse();
    for (const k of [CAT_CACHE].concat(cats)) { if (await (await caches.open(k)).match("catalogue/index.json")) { keep.push(k); break; } }
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => { if (event.data === "activate") self.skipWaiting(); });

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(new URL(req.url).pathname.includes("/catalogue/") ? CAT_CACHE : SHELL_CACHE)).put(req, res.clone());
      return res;
    } catch (e) {
      if (req.mode === "navigate") return (await caches.match("index.html")) || Response.error();
      return Response.error();
    }
  })());
});
