import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=10&query=" + encodeURIComponent('tit="Der Sandmann" and per=Hoffmann and vlg=Reclam'))).text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  [...doc.getElementsByTagNameNS("*", "record")].filter(r => r.getAttribute("type") === "Bibliographic").slice(0, 8).forEach(rec => {
    const f = [...rec.children].filter(x => x.localName === "datafield" && ["020", "084", "245", "490", "650", "655", "689", "082", "083"].includes(x.getAttribute("tag")));
    lines.push(f.map(x => x.getAttribute("tag") + " " + [...x.children].map(s => "$" + s.getAttribute("code") + s.textContent).join(" ")).join(" | ").slice(0, 800));
  });
  for (const r of Books.parseMarc(xml).filter(x => x.isbn).slice(0, 6)) {
    const L = await Books.lookupIsbn(r.isbn), d = L.data || {};
    lines.push(`→ ${r.isbn} ${d.title} | genre=${d.genre || "-"} | sources ${(L.sources || []).join("+")}`);
  }
  try { const ol = await (await fetch("https://openlibrary.org/search.json?q=der+sandmann+hoffmann&fields=title,subject,isbn&limit=3")).json(); ol.docs.forEach(d => lines.push("OL " + d.title + " subjects: " + (d.subject || []).slice(0, 12).join(", "))); } catch (e) {}
  return lines.join("\n");
});
console.log(out); await b.close();
