// Probe: all LIBRIS records of the publisher Select Video (ISBN 91-86374-…), with series and number from the full record
const q = async (query, fmt, n) => { const r = await fetch("https://libris.kb.se/xsearch?format=" + fmt + "&n=" + n + "&query=" + encodeURIComponent(query), { signal: AbortSignal.timeout(30000) }); return r.text(); };
const field = (rec, tag, codes) => { const out = []; const re = new RegExp('<(?:marc:)?datafield[^>]*tag="' + tag + '"[^>]*>([\\s\\S]*?)</(?:marc:)?datafield>', "g"); let m;
  while ((m = re.exec(rec))) { const subs = [...m[1].matchAll(/<(?:marc:)?subfield code="(.)">([^<]*)</g)].filter(s => !codes || codes.includes(s[1])).map(s => s[2].trim()); out.push(subs.join(" ")); } return out.join(" / "); };
const show = xml => { const recs = xml.split(/<(?:marc:)?record[ >]/).slice(1);
  return recs.map(r => [field(r, "020", "a"), field(r, "245", "abnp"), field(r, "260", "abc") || field(r, "264", "abc"), "SERIES: " + (field(r, "490", "av") || "-") + " | " + (field(r, "830", "av") || field(r, "440", "av") || "-"), "NOTE: " + (field(r, "500", "a") || "-").slice(0, 160)].join("\n   ")).join("\n"); };
for (const query of ["isbn:9186374*", "musiksaga", "Select video", "förl:(Select video)", "isbn:91863740*", "isbn:91863741*", "isbn:91863742*"]) {
  try { const x = await q(query, "marcxml", 60); console.log("\n##### " + query + "  (" + ((x.match(/<(?:marc:)?record[ >]/g) || []).length) + " records)\n" + show(x)); } catch (e) { console.log("##### " + query + " ERR " + e.message); }
}
