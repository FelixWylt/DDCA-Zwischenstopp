// Probe: let SBN's own pages build the search, then report the resulting link and what it shows.
import { chromium } from "playwright";
const I = "9788804494010", TEN = "8804494018";
const b = await chromium.launch(); const p = await b.newPage();
const show = async (label) => { await p.waitForTimeout(6000); const t = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, " "); const k = t.search(/pocket english|nessun risultato/i); console.log(`\n## ${label}\nURL: ${p.url()}\n${k >= 0 ? t.slice(Math.max(0, k - 150), k + 150) : t.slice(0, 300)}`); };
try { // 1. simple search box on the home page
  await p.goto("https://opac.sbn.it/", { timeout: 30000 }); await p.waitForTimeout(3000);
  const box = p.locator('input[type="text"], input[type="search"]').first(); await box.fill(I); await box.press("Enter"); await show("home search " + I);
} catch (e) { console.log("home ERR " + e.message.split("\n")[0]); }
try { // 2. advanced form: list the field choices, then choose ISBN
  await p.goto("https://opac.sbn.it/ricerca-avanzata", { timeout: 30000 }); await p.waitForTimeout(4000);
  const sels = await p.evaluate(() => [...document.querySelectorAll("select")].map(s => s.name + "#" + s.id + ": " + [...s.options].map(o => o.value + "=" + o.text.trim()).slice(0, 40).join(" ; ")));
  console.log("\nSELECTS:\n" + sels.join("\n"));
  const inputs = await p.evaluate(() => [...document.querySelectorAll("input")].filter(x => x.type !== "hidden").map(x => x.type + " " + x.name + "#" + x.id).slice(0, 30));
  console.log("INPUTS: " + inputs.join(" | "));
  for (const v of [I, TEN]) {
    await p.goto("https://opac.sbn.it/ricerca-avanzata", { timeout: 30000 }); await p.waitForTimeout(4000);
    const s = p.locator("select").filter({ has: p.locator("option", { hasText: /^\s*ISBN\s*$/ }) }).first();
    await s.selectOption({ label: "ISBN" }).catch(async () => { const o = await s.locator("option", { hasText: "ISBN" }).first().getAttribute("value"); await s.selectOption(o); });
    const row = p.locator('input[type="text"]').first(); await row.fill(v); await row.press("Enter"); await show("advanced ISBN " + v);
  }
} catch (e) { console.log("advanced ERR " + e.message.split("\n")[0]); }
await b.close();
