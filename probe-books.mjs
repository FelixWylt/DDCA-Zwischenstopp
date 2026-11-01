import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const [src, url] of [["DNB", "https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=6&query=" + encodeURIComponent('tit="Das Nibelungenlied" and vlg=Reclam')], ["LIBRIS", "https://libris.kb.se/xsearch?format=marcxml&n=3&query=" + encodeURIComponent('tit:"Nibelungenlied"')]]) {
    const xml = await (await fetch(url)).text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    [...doc.getElementsByTagNameNS("*", "record")].filter(r => [...r.children].some(x => x.localName === "datafield")).slice(0, 5).forEach(rec => {
      const f = [...rec.children].filter(x => x.localName === "datafield" && ["020", "100", "110", "130", "240", "245", "700", "730"].includes(x.getAttribute("tag")));
      lines.push(src + ": " + f.map(x => x.getAttribute("tag") + " " + [...x.children].map(s => "$" + s.getAttribute("code") + s.textContent).join(" ")).join(" | ").slice(0, 500));
    });
    for (const r of Books.parseMarc(xml).filter(x => x.isbn).slice(0, 3)) { const L = await Books.lookupIsbn(r.isbn), d = L.data || {}; lines.push(`  → ${r.isbn} ${d.title} | authors=${JSON.stringify(d.authors)} | ${(L.sources || []).join("+")}`); }
  }
  return lines.join("\n");
});
console.log(out); await b.close();
