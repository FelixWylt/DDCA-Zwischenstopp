import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=10&query=" + encodeURIComponent('tit="The importance of being earnest" and vlg=Reclam'))).text();
  const recs = Books.parseMarc(xml).filter(x => x.isbn);
  for (const r of recs.slice(0, 4)) { const L = await Books.lookupIsbn(r.isbn), d = L.data || {}; lines.push(`${r.isbn} ${d.title} | DNB raw: ${r.genre || "-"} | genre=${d.genre || "-"} | ${(L.sources || []).join("+")}`); }
  return lines.join("\n");
});
console.log(out); await b.close();
