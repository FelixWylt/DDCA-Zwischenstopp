import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const i of ["9780393679212", "9783150197363", "9783150161005", "9783150092675"]) {
    const L = await Books.lookupIsbn(i), d = L.data || {};
    lines.push(`${i} ${d.title} | genre=${d.genre || "-"} lang=${d.lang || "-"} format=${d.format || "-"} pages=${d.pages || "-"} | ${(L.sources || []).join("+")}`);
  }
  return lines.join("\n");
});
console.log(out); await b.close();
