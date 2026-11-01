import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const q of ['tit="Besuch der alten Dame" and per=Dürrenmatt', 'tit="Der Richter und sein Henker"', 'tit="Der Vorleser" and per=Schlink', 'tit="Homo faber" and per=Frisch']) {
    const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=6&query=" + encodeURIComponent(q))).text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    [...doc.getElementsByTagNameNS("*", "record")].filter(r => r.getAttribute("type") === "Bibliographic").forEach(rec => {
      const f = [...rec.getElementsByTagNameNS("*", "datafield")].filter(x => ["020", "245", "264", "490", "800", "830", "773"].includes(x.getAttribute("tag")));
      lines.push(f.map(x => x.getAttribute("tag") + " " + [...x.getElementsByTagNameNS("*", "subfield")].map(s => "$" + s.getAttribute("code") + s.textContent).join(" ")).join(" | ").slice(0, 700));
    });
    const recs = Books.parseMarc(xml);
    recs.forEach(r => lines.push("  → series=" + JSON.stringify(r.series) + " volume=" + JSON.stringify(r.volume) + " raw=" + JSON.stringify(r.rawSeries) + " / " + JSON.stringify(r.rawVolume) + " isbn=" + r.isbn));
    lines.push("----");
  }
  return lines.join("\n");
});
console.log(out); await b.close();
