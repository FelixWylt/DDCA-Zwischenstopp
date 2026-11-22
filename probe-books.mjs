// GCD cover lookup (2026-11-22): for each series in cover-input.json find the comics.org series and the issues' cover links.
import fs from "fs";
const H = { "User-Agent": "DagobertDucksArchiv/1.0 (cover lookup; github.com/FelixWylt)", "Accept": "application/json" };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const j = async u => { for (let t = 0; t < 3; t++) { try { await sleep(350); const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); if (r.ok) return r.json(); if (r.status === 404) return {}; } catch (e) {} await sleep(2000); } return {}; };
const LANG = { SE: "sv", DE: "de", CH: "de", IT: "it", US: "en", ENG: "en" };
const strip = n => n.replace(/\s*\((swedish|german|english|italian)\)\s*$/i, "").trim();
const NAMES = { "x-herman-hedning-co": ["Herman Hedning & C"], "x-herman-hedning-samlade-serier-swedish": ["Herman Hedning"], "x-marvel-mutanter-swedish": ["Marvel mutanter", "Marvel-mutanter"],
  "x-spider-man-german": ["Spider-Man Magazin"], "x-asterix-magazin-german": ["Asterix"], "x-scooby-doo-stort-presentalbum": ["Scooby Doo", "Scooby-Doo"], "x-scooby-doo-swedish": ["Scooby Doo", "Scooby-Doo"],
  "x-doctor-strange-the-punisher-magic-bullets": ["Magic Bullets"], "x-doctor-strange-flight-of-bones": ["Flight of Bones"], "x-the-sandman-the-deluxe-edition": ["Sandman"], "x-war-of-the-realms": ["War of the Realms"],
  "x-x-en-swedish": ["X:en"], "x-micky-maus-zeitung": ["Micky Maus Zeitung", "Micky-Maus-Zeitung"], "se-KA": ["Kalle Anka & C:o"], "x-tintin-swedish": ["Tintin"], "x-spirous-aventyr": ["Spirous äventyr", "Spirou"] };
// numbers found in a GCD descriptor: "5/1988" → {y:1988,n:5}; "[2]" "#16" "T-015" → running 2/16/15
function desc(d) {
  const s = String(d || ""), pairs = [];
  for (const m of s.matchAll(/(?<!\d)(\d{1,2})(?:-(\d{1,2}))?\/((?:19|20)\d\d|\d\d)(?!\d)/g)) { const y = +m[3] < 100 ? (+m[3] > 40 ? 1900 : 2000) + +m[3] : +m[3]; pairs.push({ y, n: +m[1], n2: m[2] ? +m[2] : null }); }
  for (const m of s.matchAll(/((?:19|20)\d\d)\/(\d{1,2})(?!\d)/g)) pairs.push({ y: +m[1], n: +m[2] });
  const run = (s.match(/\d+/) || [])[0];
  return { pairs, run: run != null ? +run : null };
}
function matchLabel(label, year, d, numbering) {
  const L = String(label || "").trim(); if (!L || /\?/.test(L)) return false;
  let m = /^(\d{4})\/(\d{1,2})(?:-(\d{1,2}))?$/.exec(L);
  if (m) return d.pairs.some(p => p.y === +m[1] && p.n === +m[2]);
  m = /^(\d+)$/.exec(L);
  if (m) { if (numbering === "year" && +m[1] > 1900) return false; return d.pairs.length ? false : d.run === +m[1]; }
  return false;
}
const input = JSON.parse(fs.readFileSync("cover-input.json", "utf8"));
const out = [], report = [];
for (const s of input) {
  const lang = LANG[s.country] || "";
  const names = NAMES[s.sid] || [strip(s.name)];
  const cands = new Map();
  for (const nm of names) {
    let u = "https://www.comics.org/api/series/name/" + encodeURIComponent(nm) + "/?format=json";
    for (let pg = 0; pg < 6 && u; pg++) { const r = await j(u); (r.results || []).forEach(x => { if (!lang || x.language === lang) cands.set(x.api_url, x); }); u = r.next; }
  }
  const items = s.items.filter(i => i.label && !/\?/.test(i.label));
  const single = s.items.length === 1 && (!/^\d+$/.test(s.items[0].label) || s.numbering !== "year");
  // score each candidate: how many of the user's numbers it has
  const scored = [...cands.values()].map(x => {
    const ds = (x.issue_descriptors || []).map(desc);
    const hits = items.map(i => ds.findIndex(d => matchLabel(i.label, i.year, d, s.numbering)));
    return { x, ds, hits, n: hits.filter(h => h >= 0).length };
  }).sort((a, b) => b.n - a.n || +a.x.year_began - +b.x.year_began);
  const best = scored[0];
  report.push(`\n## ${s.name} (${s.sid}) ${lang}: ${cands.size} candidates; best: ${best ? best.x.name + " " + best.x.year_began + " (" + best.n + "/" + items.length + " numbers)" : "none"}`);
  scored.slice(0, 4).forEach(c => report.push(`   cand ${c.x.name} ${c.x.year_began}-${c.x.year_ended || ""} ${c.x.country} issues ${(c.x.active_issues || []).length} hits ${c.n} ${c.x.api_url} first descr: ${(c.x.issue_descriptors || []).slice(0, 4).join(" | ")}`));
  for (const [k, i] of s.items.entries()) {
    let idx = -1, why = "";
    if (best && best.n) { const ii = items.indexOf(i); idx = ii >= 0 ? best.hits[ii] : -1; }
    else if (single && best) { const one = scored.find(c => (c.x.active_issues || []).length === 1 && (!i.year || Math.abs(+c.x.year_began - +i.year) <= 1)); if (one) { idx = 0; best.x = one.x; why = "single"; } }
    if (idx < 0) { report.push(`   - ${i.label} ${i.year} ${i.title}: no match`); continue; }
    const is = await j(best.x.active_issues[idx]);
    const y = (String(is.key_date || is.publication_date || "").match(/(19|20)\d\d/) || [])[0];
    const yearOk = !i.year || !y || Math.abs(+y - +i.year) <= 1;
    const rec = { sid: s.sid, label: i.label, url: is.cover || "", gcd: `${is.series_name} ${is.descriptor || is.number} (${is.publication_date || is.key_date || "?"})`, sure: yearOk && !!is.cover, why: why || (yearOk ? "" : "year " + y + " vs " + i.year) };
    out.push(rec); report.push(`   ${rec.sure ? "+" : "?"} ${i.label} ${i.year} ${i.title} -> ${rec.gcd} ${rec.url} ${rec.why}`);
  }
}
fs.writeFileSync("covers-found.json", JSON.stringify(out, null, 1));
console.log(report.join("\n"));
console.log("\nsure:", out.filter(x => x.sure).length, "unsure:", out.filter(x => !x.sure).length, "of", input.reduce((a, s) => a + s.items.length, 0));
