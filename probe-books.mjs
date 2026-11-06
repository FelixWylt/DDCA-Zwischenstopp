import { chromium } from "playwright";
const b = await chromium.launch(); const q = await b.newPage({ viewport: { width: 1280, height: 2000 } });
await q.goto("https://www.seriekatalogen.se/magazine/kalle-ankas-pocket", { timeout: 60000 }); await q.waitForTimeout(5000);
for (const t of ["ACCEPTERA"]) { try { await q.click(`text=${t}`, { timeout: 2000 }); } catch (e) {} }
const grab = () => q.evaluate(() => { const t = document.querySelector("table"); return [...t.querySelectorAll("tr")].map(r => [...r.querySelectorAll("td")].map(c => c.innerText.trim()).join("\t")).map(x => x.replace(/^\t+/, "")).filter(x => /^\d{4}\t/.test(x)); });
const all = new Map();
for (let pg = 1; pg <= 40; pg++) {
  const rows = await grab(); rows.forEach(r => all.set(r, r));
  const ok = await q.evaluate(() => { const b = [...document.querySelectorAll("button")].find(x => /next|nästa/i.test((x.getAttribute("aria-label") || "") + " " + (x.title || ""))); if (b && !b.disabled) { b.click(); return true; } return false; });
  if (!ok) { console.log("last page", pg); break; }
  await q.waitForTimeout(1500);
}
console.log("DEBUG", await q.evaluate(() => [...document.querySelectorAll("button, [role=button], nav *")].filter(x => x.offsetParent).map(x => x.tagName + "[" + (x.getAttribute("aria-label") || "") + "|" + (x.title || "") + "|" + x.className.slice(0, 40) + "]=" + x.textContent.trim().slice(0, 15)).slice(0, 60).join("\n")));
console.log("PAGTEXT", await q.evaluate(() => { const t = document.querySelector("table"); let p = t; for (let i = 0; i < 5 && p.parentElement; i++) p = p.parentElement; return p.innerText.slice(-400); }));
console.log("TOTAL", all.size);
console.log([...all.values()].join("\n"));
await b.close();
