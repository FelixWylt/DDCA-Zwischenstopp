import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const i = "9780393679212", lines = [];
  const L = await Books.lookupIsbn(i); lines.push("LOOKUP " + JSON.stringify(L).slice(0, 1200));
  const get = async u => { try { return await (await fetch(u)).text(); } catch (e) { return "ERR " + e.message; } };
  lines.push("OL data: " + (await get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + i)).slice(0, 1500));
  lines.push("OL edition: " + (await get("https://openlibrary.org/isbn/" + i + ".json")).slice(0, 1500));
  lines.push("Google: " + (await get("https://www.googleapis.com/books/v1/volumes?q=isbn:" + i)).replace(/\s+/g, " ").slice(0, 1800));
  lines.push("LIBRIS: " + (await get("https://libris.kb.se/xsearch?format=marcxml&n=1&query=isbn:" + i)).replace(/\s+/g, " ").slice(0, 1500));
  lines.push("DNB: " + (await get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=1&query=isbn%3D" + i)).replace(/\s+/g, " ").slice(0, 600));
  return lines.join("\n\n");
});
console.log(out); await b.close();
