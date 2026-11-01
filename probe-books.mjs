import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const i of ["9783257230451", "9783257073690", "9783804420847", "9783551354013", "9783551551672", "9789132163838", "9789132163845", "9789178033713", "9783423214124", "9783257236538"]) {
    const r = await Books.lookupIsbn(i); const d = r.data || {};
    lines.push(`${i}: ${d.title} | series=${d.series || "-"} vol=${d.volume || "-"} | format=${d.format || "-"} pages=${d.pages || "-"} | ${(r.sources || []).join("+")}`);
  }
  return lines.join("\n");
});
console.log(out); await b.close();
