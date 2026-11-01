import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=8&query=" + encodeURIComponent('tit="Nathan der Weise" and vlg=Reclam'))).text();
  const recs = Books.parseMarc(xml);
  for (const r of recs.filter(x => x.isbn).slice(0, 5)) {
    const L = await Books.lookupIsbn(r.isbn);
    lines.push(`${r.isbn} ${r.title} | raw DNB genre: ${r.genre} | series: ${r.series || "-"} ${r.volume || ""} (raw ${r.rawSeries}) | → genre=${(L.data || {}).genre || "-"} format=${(L.data || {}).format || "-"} pages=${(L.data || {}).pages || "-"}`);
  }
  for (const i of ["9783257230451"]) { const L = await Books.lookupIsbn(i); lines.push(i + " → genre=" + (L.data || {}).genre); }
  return lines.join("\n");
});
console.log(out); await b.close();
