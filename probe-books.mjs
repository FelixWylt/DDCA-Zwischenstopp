import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=10&query=" + encodeURIComponent('tit="Io non ho paura" and per=Ammaniti'))).text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  [...doc.getElementsByTagNameNS("*", "record")].filter(r => r.getAttribute("type") === "Bibliographic").slice(0, 8).forEach(rec => {
    const f = [...rec.children].filter(x => x.localName === "datafield" && ["020", "041", "082", "245", "264", "490", "650", "655"].includes(x.getAttribute("tag")));
    lines.push(f.map(x => x.getAttribute("tag") + " " + [...x.children].map(s => "$" + s.getAttribute("code") + s.textContent).join(" ")).join(" | ").slice(0, 600));
  });
  for (const r of Books.parseMarc(xml).filter(x => x.isbn).slice(0, 4)) { const L = await Books.lookupIsbn(r.isbn), d = L.data || {}; lines.push(`→ ${r.isbn} ${d.title} | genre=${d.genre || "-"} | ${(L.sources || []).join("+")}`); }
  try { const ol = await (await fetch("https://openlibrary.org/search.json?title=io+non+ho+paura&author=ammaniti&fields=title,subject,isbn,key&limit=5")).json(); ol.docs.forEach(d => lines.push("OL search " + d.title + " | subjects: " + (d.subject || []).slice(0, 15).join(", "))); } catch (e) { lines.push("OL err " + e.message); }
  try { const g = await (await fetch("https://www.googleapis.com/books/v1/volumes?q=intitle:%22io+non+ho+paura%22+inauthor:ammaniti&maxResults=5")).json(); (g.items || []).forEach(v => lines.push("Google " + v.volumeInfo.title + " | " + (v.volumeInfo.categories || []).join(", "))); } catch (e) { lines.push("G err " + e.message); }
  try { const x = await (await fetch("https://libris.kb.se/xsearch?format=marcxml&n=5&query=" + encodeURIComponent('tit:"Io non ho paura"'))).text(); Books.parseMarc(x).forEach(r => lines.push("LIBRIS " + r.title + " | " + r.genre)); } catch (e) {}
  return lines.join("\n");
});
console.log(out); await b.close();
