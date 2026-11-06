import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [], get = async u => { try { const r = await fetch(u); return r.status + " " + (await r.text()); } catch (e) { return "ERR " + e.message; } };
  for (const i of ["9788852237973", "9788828748632", "9791221901658", "3855041814", "9788842829386", "9788828708605"]) {
    let L; try { L = await Books.lookupIsbn(i); } catch (e) { L = { err: e.message }; }
    lines.push(`== ${i}: app → ${JSON.stringify(L && L.data ? { t: L.data.title, a: L.data.authors, s: L.sources } : L).slice(0, 200)}`);
    const i13 = i.length === 10 ? null : i;
    lines.push("  OL: " + (await get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + i)).slice(0, 160));
    lines.push("  Google: " + (await get("https://www.googleapis.com/books/v1/volumes?q=isbn:" + i)).replace(/\s+/g, " ").slice(0, 260));
    lines.push("  SBN: " + (await get("https://opac.sbn.it/api/search?isbn=" + i)).replace(/\s+/g, " ").slice(0, 160));
    lines.push("  DNB n=" + ((await get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=1&query=isbn%3D" + i)).match(/numberOfRecords>(\d+)/) || [])[1]);
    lines.push("  LIBRIS: " + ((await get("https://libris.kb.se/xsearch?format=json&n=1&query=isbn:" + i)).match(/"records":\s*(\d+)/) || [])[1]);
    lines.push("  Swiss (swisscovery): " + (await get("https://swisscovery.slsp.ch/primaws/rest/pub/pnxs?q=any,contains," + i + "&vid=41SLSP_NETWORK:VU1_UNION&scope=DN_and_CI&tab=41SLSP_NETWORK&offset=0&limit=1")).replace(/\s+/g, " ").slice(0, 120));
  }
  return lines.join("\n");
});
console.log(out);
// Seriekatalogen page for Kalle Ankas Pocket, as text
const q = await b.newPage();
for (const u of ["https://www.seriekatalogen.se/magazine/kalle-ankas-pocket", "https://www.seriekatalogen.se/magazine/kalle-anka-och-co"]) {
  try { await q.goto(u, { timeout: 30000 }); await q.waitForTimeout(3000); const t = await q.innerText("body"); console.log("\n##### " + u + "\n" + t.slice(0, 3500)); } catch (e) { console.log("ERR " + u + " " + e.message); }
}
await b.close();
