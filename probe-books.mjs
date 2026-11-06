// Probe: which catalogues can find Italian ISBNs, and which of them let the app (a web page) read the answer?
// For every source and ISBN: "browser" = fetch from a web page (CORS applies, like the app); "server" = plain fetch (no CORS).
import { chromium } from "playwright";

const ISBNS = ["9788852240317", "9788852230943", "9788804494010", "9788894243307"]; // Giunti 2022, Giunti Paperdinastia, Mondadori 2001, Giunti kids
const to10 = i => { const c = i.slice(3, 12); let s = 0; for (let k = 0; k < 9; k++) s += (10 - k) * +c[k]; const r = (11 - s % 11) % 11; return c + (r === 10 ? "X" : r); };
const SRC = {
  "SBN old XML": i => `https://opac.sbn.it/opacsbn/opaclib?db=solr_iccu&select_db=solr_iccu&searchForm=opac/iccu/error.jsp&do_cmd=search_show_cmd&format=xml&nentries=3&rpnquery=%40attrset+bib-1+%40attr+1%3D7+%22${i}%22`,
  "SBN new search": i => `https://opac.sbn.it/risultati-ricerca-avanzata?item:8:ISBN::${i}`,
  "SBN SRU guess": i => `https://opac.sbn.it/sru?version=1.2&operation=searchRetrieve&query=isbn%3D${i}&maximumRecords=1`,
  "swisscovery": i => `https://swisscovery.slsp.ch/view/sru/41SLSP_NETWORK?version=1.2&operation=searchRetrieve&recordSchema=marcxml&maximumRecords=1&query=alma.isbn%3D${i}`,
  "K10plus": i => `https://sru.k10plus.de/opac-de-627?version=1.1&operation=searchRetrieve&recordSchema=marcxml&maximumRecords=1&query=pica.isb%3D${i}`,
  "lobid (hbz)": i => `https://lobid.org/resources/search?format=json&size=1&q=isbn:${i}`,
  "BnF": i => `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&recordSchema=dublincore&maximumRecords=1&query=bib.isbn%20adj%20%22${i}%22`,
  "SUDOC": i => `https://www.sudoc.fr/services/isbn2ppn/${i}&format=text/json`,
  "Wikidata": i => `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(`SELECT ?l WHERE { { ?b wdt:P212 ?x } UNION { ?b wdt:P957 ?x } FILTER(REPLACE(?x,"-","") IN ("${i}","${to10(i)}")) ?b rdfs:label ?l } LIMIT 3`)}`,
  "Open Library": i => `https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:${i}`,
  "Google Books": i => `https://www.googleapis.com/books/v1/volumes?q=isbn:${i}`,
};
// a short hint whether the answer holds a record
const hint = (t, i) => {
  const m = t.match(/numberOfRecords>\s*(\d+)/) || t.match(/"totalItems"\s*:\s*(\d+)/) || t.match(/"totalItems"\s*:\s*(\d+)/);
  const title = (t.match(/<(?:dc:title|title)>([^<]{2,80})/) || t.match(/"title"\s*:\s*"([^"]{2,80})/) || t.match(/"value"\s*:\s*"([^"]{2,80})/) || t.match(/subfield code="a">([^<]{2,80})/) || [])[1] || "";
  return [m ? "records=" + m[1] : "", t.includes(i) || t.includes(to10(i)) ? "isbn-in-answer" : "", title ? "title: " + title : "", /captcha|cloudflare|access denied|forbidden/i.test(t) ? "BLOCK-PAGE?" : ""].filter(Boolean).join(" | ");
};

const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/t.html");
for (const [name, url] of Object.entries(SRC)) {
  console.log("\n=== " + name);
  for (const i of ISBNS) {
    const u = url(i);
    let srv; try { const r = await fetch(u, { headers: { "User-Agent": "DagobertDucksArchiv-probe" }, signal: AbortSignal.timeout(20000) }); const t = await r.text(); srv = `${r.status} ${t.length}B acao=${r.headers.get("access-control-allow-origin") || "-"} ${hint(t, i)}`; } catch (e) { srv = "ERR " + e.message; }
    const brw = await p.evaluate(async ([u, i]) => { try { const r = await fetch(u); const t = await r.text(); return `${r.status} ${t.length}B readable`; } catch (e) { return "BLOCKED (" + e.message + ")"; } }, [u, i]);
    console.log(`${i}\n  server:  ${srv}\n  browser: ${brw}`);
  }
}
await b.close();
