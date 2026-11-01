import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const qs = [['tit="Die Augen des ewigen Bruders" and per=Zweig', "Augen des ewigen Bruders Zweig"], ['tit="Weltanfänge in der japanischen Mythologie"', "Weltanfänge japanischen Mythologie Numazawa"], ['tit=Uhlands and tit=Werke and jhr=1893', "Uhlands Werke Fränkel"]];
  for (const [cql, free] of qs) {
    const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=8&query=" + encodeURIComponent(cql))).text();
    lines.push("### " + cql + " → " + ((xml.match(/numberOfRecords>(\d+)/) || [])[1]));
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    [...doc.getElementsByTagNameNS("*", "record")].filter(r => [...r.children].some(x => x.localName === "datafield")).slice(0, 8).forEach(rec => {
      const f = [...rec.children].filter(x => x.localName === "datafield" && ["100", "245", "250", "264", "260", "300", "490", "773", "800", "830", "655", "041", "082", "084"].includes(x.getAttribute("tag")));
      const ctl = [...rec.children].find(x => x.localName === "controlfield" && x.getAttribute("tag") === "001");
      lines.push((ctl ? ctl.textContent + " " : "") + f.map(x => x.getAttribute("tag") + " " + [...x.children].filter(s => !/^[089]$/.test(s.getAttribute("code"))).map(s => "$" + s.getAttribute("code") + s.textContent).join(" ")).join(" | ").slice(0, 700));
    });
    const hits = await Books.search(free);
    lines.push("APP SEARCH '" + free + "': " + hits.slice(0, 6).map(h => `[${h.title} | ${(h.authors || []).join(", ")} | ${h.year} | ${h.publisher} | series=${h.series || "-"} ${h.volume || ""}]`).join(" "));
  }
  return lines.join("\n");
});
console.log(out); await b.close();
