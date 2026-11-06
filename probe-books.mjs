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
console.log("DEBUG", await q.evaluate(() => [...document.querySelectorAll("*")].filter(x => x.children.length === 0 && /^\d+$/.test(x.textContent.trim()) && !x.closest("table")).slice(0, 12).map(x => x.tagName + "." + x.className + "=" + x.textContent.trim()).join(" | ")));
console.log("TOTAL", all.size);
console.log([...all.values()].join("\n"));
await b.close();
