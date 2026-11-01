import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  for (const free of ["Augen des ewigen Bruders Zweig", "Weltanfänge japanischen Mythologie Numazawa", "Uhlands Werke Fränkel", "Uhlands Werke 1893"]) {
    const hits = await Books.search(free);
    lines.push("SEARCH '" + free + "':\n  " + hits.slice(0, 8).map(h => `${h.title} | ${(h.authors || []).join(", ")} | ${h.year} | ${h.publisher} | series=${h.series || "-"} vol=${h.volume || "-"} | pages=${h.pages || "-"} | genre=${h.genre || "-"}`).join("\n  "));
  }
  const xml = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=3&query=" + encodeURIComponent('WOE="Numazawa Weltanfänge"'))).text();
  lines.push("Numazawa 490/260: " + (xml.match(/tag="(490|260|264|830)"[\s\S]*?<\/datafield>/g) || []).map(x => x.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).join(" || "));
  return lines.join("\n");
});
console.log(out); await b.close();
