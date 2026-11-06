import { chromium } from "playwright";
const b = await chromium.launch(); const q = await b.newPage({ viewport: { width: 1280, height: 2000 } });
await q.goto("https://www.seriekatalogen.se/magazine/kalle-ankas-pocket", { timeout: 60000 }); await q.waitForTimeout(5000);
for (const t of ["ACCEPTERA"]) { try { await q.click(`text=${t}`, { timeout: 2000 }); } catch (e) {} }
const grab = () => q.evaluate(() => { const t = document.querySelector("table"); return [...t.querySelectorAll("tr")].map(r => [...r.querySelectorAll("td")].map(c => c.innerText.trim()).join("\t")).filter(x => /^\d{4}\t/.test(x)); });
const all = new Map();
for (let pg = 1; pg <= 30; pg++) {
  if (pg > 1) {
    const ok = await q.evaluate(n => { const t = document.querySelector("table"); const scope = t.parentElement.parentElement.parentElement || document; const b = [...document.querySelectorAll("button, a, li")].find(x => x.textContent.trim() === String(n) && x.offsetParent); if (b) { b.click(); return true; } return false; }, pg);
    if (!ok) { console.log("no button for page", pg); break; }
    await q.waitForTimeout(1500);
  }
  const rows = await grab(); rows.forEach(r => all.set(r.split("\t")[1] + "|" + r, r));
}
console.log("TOTAL", all.size);
console.log([...all.values()].join("\n"));
await b.close();
