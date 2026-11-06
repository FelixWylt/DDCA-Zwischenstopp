// Probe: does a corrected SBN link (ISBN field = code 7) find old and new Italian books, under ISBN-13 and ISBN-10?
import { chromium } from "playwright";
const B = [["9788804494010", "8804494018", /pocket english/i], ["9788852230943", "8852230947", /paperdinastia|barks/i], ["9788852240317", "8852240314", /spy stories/i]];
const F = { "item:7:ISBN::v": v => `https://opac.sbn.it/risultati-ricerca-avanzata?item:7:ISBN::${v}`, "item:7:ISBN::@frase@=v": v => `https://opac.sbn.it/risultati-ricerca-avanzata?item:7:ISBN::@frase@=${v}` };
const b = await chromium.launch(); const p = await b.newPage();
for (const [name, f] of Object.entries(F)) for (const [i13, i10, re] of B) for (const v of [i13, i10]) {
  try { await p.goto(f(v), { timeout: 30000 }); await p.waitForTimeout(6000);
    const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, " "); const k = t.search(re), crit = (t.match(/Criteri di ricerca.{0,80}/) || [""])[0];
    console.log(`${name} ${v}: ${k >= 0 ? "FOUND …" + t.slice(k - 40, k + 60) : /nessun risultato/i.test(t) ? "no results" : "?"} | ${crit}`);
  } catch (e) { console.log(`${name} ${v}: ERR ${e.message.split("\n")[0]}`); }
}
await b.close();
