// Probe: every LIBRIS record in the series "Walt Disney's musiksaga", sorted by number
const q = async (query, n, start) => { const r = await fetch("https://libris.kb.se/xsearch?format=marcxml&n=" + n + "&start=" + (start || 1) + "&query=" + encodeURIComponent(query), { signal: AbortSignal.timeout(30000) }); return r.text(); };
const field = (rec, tag, codes) => { const out = []; const re = new RegExp('<(?:marc:)?datafield[^>]*tag="' + tag + '"[^>]*>([\\s\\S]*?)</(?:marc:)?datafield>', "g"); let m;
  while ((m = re.exec(rec))) out.push([...m[1].matchAll(/<(?:marc:)?subfield code="(.)">([^<]*)</g)].filter(s => !codes || codes.includes(s[1])).map(s => s[2].trim()).join(" ")); return out.join(" / "); };
const seen = new Map();
for (const query of ['"Walt Disney\'s musiksaga"', "serie:(Walt Disney's musiksaga)", "Walt Disney's musiksaga", "musiksaga disney", "disneys musiksaga"]) {
  for (const start of [1, 201]) {
    let x; try { x = await q(query, 200, start); } catch (e) { console.log(query, "ERR", e.message); continue; }
    const recs = x.split(/<(?:marc:)?record[ >]/).slice(1); if (!recs.length) break;
    recs.forEach(r => { const ser = field(r, "490", "av") + " | " + field(r, "830", "av") + " | " + field(r, "440", "av"); if (!/musiksaga/i.test(ser)) return;
      const num = +((/musiksaga\W+(\d+)/i.exec(ser) || [])[1]) || 0, isbn = field(r, "020", "a"), title = field(r, "245", "abnp").replace(/\s*[\/:]\s*$/, ""), pub = field(r, "260", "bc") || field(r, "264", "bc");
      const k = isbn || title; if (!seen.has(k)) seen.set(k, { num, isbn, title, pub, query }); });
    if (recs.length < 200) break;
  }
  console.log("query", query, "→ total so far", seen.size);
}
[...seen.values()].sort((a, b) => a.num - b.num || a.title.localeCompare(b.title)).forEach(x => console.log((x.num || "?") + "\t" + x.title + "\t" + x.pub + "\t" + x.isbn));
