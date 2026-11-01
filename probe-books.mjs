import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const i = "9781902407449", lines = [];
  const L = await Books.lookupIsbn(i); lines.push("LOOKUP " + JSON.stringify(L).slice(0, 900));
  const get = async u => { try { return await (await fetch(u)).text(); } catch (e) { return "ERR " + e.message; } };
  lines.push("OL data: " + (await get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + i)).slice(0, 900));
  lines.push("OL edition: " + (await get("https://openlibrary.org/isbn/" + i + ".json")).slice(0, 900));
  lines.push("LIBRIS: " + (await get("https://libris.kb.se/xsearch?format=marcxml&n=1&query=isbn:" + i)).replace(/\s+/g, " ").slice(0, 1200));
  lines.push("DNB n=" + ((await get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=1&query=isbn%3D" + i)).match(/numberOfRecords>(\d+)/) || [])[1]);
  return lines.join("\n\n");
});
console.log(out); await b.close();
