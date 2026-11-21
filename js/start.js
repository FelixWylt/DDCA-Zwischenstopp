// Dagobert Ducks Archiv – start-up.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---------- start ----------
const start = location.hash.slice(1);
if (VIEWS[start]) S.view = start;
render();
boot();

// offline support: the service worker keeps the app itself on this phone
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").then(reg => {
    // the popup says which version it updates to (read from the new sw.js; without a connection only "A new version")
    const offer = w => { const u = $("#update"); u.hidden = false; $("#reload").onclick = () => w.postMessage("activate");
      fetch("sw.js", { cache: "no-store" }).then(r => r.text()).then(s => { const m = /APP_VERSION\s*=\s*"([^"]+)"/.exec(s), t = u.firstChild;
        if (m && t && t.nodeType === 3) t.textContent = `A new version is ready: da-v${APP_BUILD} → ${m[1]}. `; }).catch(() => {}); };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch(() => {});
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  });
}
// only for the screenshot check on GitHub (address ending in ?test): lets it load sample comics and open screens
if (/[?&]test\b/.test(location.search)) window.__dda = { S, nav, render, saveMany, saveSeries, parsePrices, storyIndex, owned };
