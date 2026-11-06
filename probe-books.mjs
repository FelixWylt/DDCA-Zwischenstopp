const ids = [["3855041814","9783855041817"],["0552131059","9780552131056"],["0345339703","9780345339706"],["9129538413","9789129538415"],["3423110156","9783423110150"]];
const get = async u => { try { const r = await fetch(u); return r.ok ? await r.text() : "HTTP" + r.status; } catch (e) { return "ERR " + e.message; } };
const cnt = (t, re) => (t.match(re) || []).length;
for (const [a, b] of ids) for (const k of [a, b]) {
  const d = await get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=2&query=" + encodeURIComponent("isbn=" + k));
  const l = await get("https://libris.kb.se/xsearch?format=json&n=1&query=" + encodeURIComponent("isbn:" + k));
  const o = await get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + k);
  const g = await get("https://www.googleapis.com/books/v1/volumes?q=isbn:" + k);
  console.log(k, "DNB", (/<numberOfRecords>(\d+)/.exec(d) || [])[1], "| LIBRIS", (/"records":\s*(\d+)/.exec(l) || [])[1], "| OL", o.length > 5 ? (/"title":\s*"([^"]+)/.exec(o) || [])[1] : "none", "| G", (/"totalItems":\s*(\d+)/.exec(g) || [, g.slice(0, 20)])[1]);
}
// combined DNB / LIBRIS queries
console.log("DNBor", (/<numberOfRecords>(\d+)/.exec(await get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=2&query=" + encodeURIComponent("isbn=3855041814 or isbn=9783855041817"))) || [])[1]);
console.log("LIBRISor", (/"records":\s*(\d+)/.exec(await get("https://libris.kb.se/xsearch?format=json&n=1&query=" + encodeURIComponent("isbn:9129538413 OR isbn:9789129538415"))) || [])[1]);
console.log("OLboth", (await get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:0552131059,ISBN:9780552131056")).slice(0, 120));
