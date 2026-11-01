import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const qs = ["percy jackson grekiska gudarna", "percy jackson blixtjuven", "spejarens lärling", "harry potter och de vises sten"];
  const isbns = new Set();
  for (const q of qs) {
    const xml = await (await fetch("https://libris.kb.se/xsearch?format=marcxml&n=4&query=" + encodeURIComponent(q))).text();
    (xml.match(/tag="020"[\s\S]*?<\/datafield>/g) || []).forEach(f => { const m = /code="a">\s*([\dX-]{10,17})/.exec(f); const qq = (/code="q">([^<]*)/.exec(f) || [])[1] || ""; const c = (/code="c">([^<]*)/.exec(f) || [])[1] || ""; if (m) { const i = m[1].replace(/-/g, ""); if (i.length === 13) isbns.add(i); lines.push(q + " | 020 " + m[1] + " q=" + qq + " c=" + c); } });
  }
  [...isbns].slice(0, 8).concat(["9783551354013", "9780439023481", "9783423214124"]).forEach(i => isbns.add(i));
  for (const i of [...isbns].slice(0, 12)) {
    try {
      const raw = await (await fetch("https://libris.kb.se/xsearch?format=marcxml&n=1&query=" + encodeURIComponent("isbn:" + i))).text();
      const recs = Books.parseMarc(raw);
      const r = await Books.lookupIsbn(i);
      lines.push(`ISBN ${i}: LIBRIS isbn-query records=${recs.length} fmt=${(recs[0] || {}).format || "-"} | lookup sources=${(r.sources || []).join("+")} title=${(r.data || {}).title} format=${(r.data || {}).format || "-"} pages=${(r.data || {}).pages || "-"} genre=${(r.data || {}).genre || "-"}`);
    } catch (e) { lines.push("ISBN " + i + " ERR " + e.message); }
  }
  return lines.join("\n");
});
console.log(out); await b.close();
