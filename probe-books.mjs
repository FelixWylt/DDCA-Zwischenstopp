import { chromium } from "playwright";
const b = await chromium.launch(); const q = await b.newPage({ viewport: { width: 1280, height: 2000 } });
await q.goto("https://www.seriekatalogen.se/magazine/kalle-ankas-pocket", { timeout: 60000 }); await q.waitForTimeout(5000);
for (const t of ["ACCEPTERA", "Accept"]) { try { await q.click(`text=${t}`, { timeout: 2000 }); } catch (e) {} }
// show everything: buttons like "Visa alla", "Visa fler", page size selects
for (let k = 0; k < 40; k++) {
  const clicked = await q.evaluate(() => { const b = [...document.querySelectorAll("button, a")].find(x => /visa (alla|fler)|ladda fler|show more|load more/i.test(x.textContent) && x.offsetParent); if (b) { b.click(); return b.textContent.trim(); } return ""; });
  await q.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await q.waitForTimeout(1200);
  if (!clicked && k > 3) break;
}
const info = await q.evaluate(() => ({ selects: [...document.querySelectorAll("select")].map(s => [...s.options].map(o => o.text).join("/")), pages: [...document.querySelectorAll("button, a")].map(x => x.textContent.trim()).filter(t => /^\d+$|nästa|next|›|»/i.test(t)).slice(0, 30) }));
console.log("INFO", JSON.stringify(info));
const rows = await q.evaluate(() => [...document.querySelectorAll("table")].map((t, ti) => [...t.querySelectorAll("tr")].map(r => ti + "\t" + [...r.querySelectorAll("td")].map(c => c.innerText.trim()).join("\t")).filter(x => /\t\d{4}\t/.test(x)).join("\n")).join("\n"));
console.log("ROWS", rows.split("\n").length); console.log(rows);
await b.close();
