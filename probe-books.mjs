// Probe: open the SBN search link the app shows in a real browser (as a phone would) and read what the page shows.
import { chromium } from "playwright";
const T = { "9788852230943": /paperdinastia|barks/i, "9788804494010": /pocket english/i, "9788852240317": /spy stories/i };
const URLS = {
  "app link (item:1032 @frase@)": i => `https://opac.sbn.it/risultati-ricerca-avanzata?item:1032:ISBN::@frase@=${i}`,
  "item:8": i => `https://opac.sbn.it/risultati-ricerca-avanzata?item:8:ISBN::${i}`,
};
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, u] of Object.entries(URLS)) for (const [i, re] of Object.entries(T)) {
  try {
    await p.goto(u(i), { timeout: 30000, waitUntil: "domcontentloaded" }); await p.waitForTimeout(6000);
    const txt = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
    const at = txt.search(re), nr = txt.search(/risultat|nessun/i);
    console.log(`${name} ${i}: found-title=${at >= 0} | ${at >= 0 ? txt.slice(Math.max(0, at - 100), at + 100) : ""}\n   near 'risultati': ${nr >= 0 ? txt.slice(Math.max(0, nr - 60), nr + 120) : "-"}`);
  } catch (e) { console.log(`${name} ${i}: ERR ${e.message.split("\n")[0]}`); }
}
await b.close();
