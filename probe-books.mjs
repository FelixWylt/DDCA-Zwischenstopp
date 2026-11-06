import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [], get = async (u, o) => { try { const r = await fetch(u, o); return r.status + " cors=" + r.headers.get("access-control-allow-origin") + " " + (await r.text()); } catch (e) { return "ERR " + e.message; } };
  for (const i of ["9788852237973", "9788828748632", "9791221901658", "9788842829386", "9788828708605"]) {
    lines.push("== " + i);
    lines.push("  SBN gw: " + (await get("https://opac.sbn.it/opacmobilegw/search.json?isbn=" + i)).replace(/\s+/g, " ").slice(0, 500));
    lines.push("  SBN gw2: " + (await get("https://opac.sbn.it/opacmobilegw/search.json?any=" + i + "&type=0&start=0&rows=1")).replace(/\s+/g, " ").slice(0, 500));
  }
  lines.push("SWISS 13: " + JSON.stringify((await Books.lookupIsbn(Books.normalize ? Books.normalize("3855041814") : "9783855041817")).data || null).slice(0, 300));
  const x = await (await fetch("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=5&query=isbn%3D3855041814")).text();
  lines.push("DNB titles: " + Books.parseMarc(x).map(r => r.title + " / " + r.isbn + " / " + r.year).join(" || "));
  return lines.join("\n");
});
console.log(out); await b.close();
