// Probe: does the SBN search link the app shows find the book? Server-side only, 20 s limit per request.
const T = { "9788852230943": /paperdinastia|barks/i, "9788804494010": /pocket english/i, "9788852240317": /spy stories/i };
const URLS = {
  "app link (item:1032 @frase@)": i => `https://opac.sbn.it/risultati-ricerca-avanzata?item:1032:ISBN::@frase@=${i}`,
  "item:8": i => `https://opac.sbn.it/risultati-ricerca-avanzata?item:8:ISBN::${i}`,
  "simple search": i => `https://opac.sbn.it/risultati-ricerca-semplice?query=${i}`,
};
for (const [name, u] of Object.entries(URLS)) for (const [i, re] of Object.entries(T)) {
  try {
    const r = await fetch(u(i), { signal: AbortSignal.timeout(20000) }); const t = await r.text();
    const txt = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const n = (txt.match(/(\d[\d.]*)\s+(risultat\w*|record|documenti)/i) || [])[0] || "-";
    const at = txt.search(re);
    console.log(`${name} ${i}: ${r.status} found-title=${at >= 0} count="${n}" ${at >= 0 ? "…" + txt.slice(Math.max(0, at - 80), at + 80) : ""}`);
    if (/nessun/i.test(txt)) console.log("   says: " + txt.slice(txt.search(/nessun/i) - 40, txt.search(/nessun/i) + 80));
  } catch (e) { console.log(`${name} ${i}: ERR ${e.message}`); }
}
