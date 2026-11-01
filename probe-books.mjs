import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const q of ['tit="Nathan der Weise" and per=Lessing and vlg=Reclam', 'tit="Faust" and per=Goethe and vlg=Reclam', 'tit="Die Physiker" and per=Dürrenmatt', 'tit="Der Schimmelreiter" and vlg=Reclam']) {
    const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=5&query=" + encodeURIComponent(q))).text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    [...doc.getElementsByTagNameNS("*", "record")].filter(r => r.getAttribute("type") === "Bibliographic").forEach(rec => {
      const f = [...rec.getElementsByTagNameNS("*", "datafield")].filter(x => ["020", "245", "490", "650", "655", "084", "689"].includes(x.getAttribute("tag")));
      lines.push(f.map(x => x.getAttribute("tag") + " " + [...x.getElementsByTagNameNS("*", "subfield")].filter(s => !/[0-9]/.test(s.getAttribute("code")) || s.getAttribute("code") === "2").map(s => "$" + s.getAttribute("code") + s.textContent).join(" ")).join(" | ").slice(0, 900));
      const isbn = (/code="a">(97[89]\d{10})/.exec(new XMLSerializer().serializeToString(rec)) || [])[1];
      lines.push("  isbn " + isbn);
    });
    lines.push("----");
  }
  return lines.join("\n");
});
console.log(out); await b.close();
