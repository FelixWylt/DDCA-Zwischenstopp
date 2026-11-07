// Probe: what do the book catalogues know about ISBN 91-86374-07-9 (Walt Disney's Musiksaga: Musse Piggs julsaga)?
const I10 = "9186374079", I13 = "9789186374070";
const get = async (name, url) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); const t = await r.text(); console.log("\n=== " + name + " " + r.status + "\n" + t.slice(0, 2500)); } catch (e) { console.log("\n=== " + name + " ERR " + e.message); } };
await get("LIBRIS isbn", "https://libris.kb.se/xsearch?format=json&n=3&query=" + encodeURIComponent("isbn:" + I10));
await get("LIBRIS julsaga", "https://libris.kb.se/xsearch?format=json&n=5&query=" + encodeURIComponent('musiksaga julsaga'));
await get("LIBRIS publisher 91-86374", "https://libris.kb.se/xsearch?format=json&n=20&query=" + encodeURIComponent('isbn:9186374*'));
await get("Open Library", "https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + I10);
