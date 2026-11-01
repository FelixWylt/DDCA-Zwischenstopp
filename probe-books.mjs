import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const i of ["9783150189146", "9783150141908", "9783159619088", "9783150176047", "9783150002308"]) { const L = await Books.lookupIsbn(i), d = L.data || {}; lines.push(`${i} ${d.title} | authors=${JSON.stringify(d.authors)} translator=${d.translator || "-"}`); }
  return lines.join("\n");
});
console.log(out); await b.close();
