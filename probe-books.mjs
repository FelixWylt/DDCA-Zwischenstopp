// Probe: which Duckipedia page does each name of "MEGA Micky Maus Sonderheft" lead to?
const API = "https://de.duckipedia.org/api.php";
const titles = ["Mega Micky Maus Sonderheft", "MEGA Micky Maus Sonderheft", "MMS", "Mega Micky Maus", "MEGA Micky Maus", "Micky Maus Spezial"];
const q = new URLSearchParams({ action: "query", titles: titles.join("|"), redirects: "1", format: "json", formatversion: "2" });
const j = await (await fetch(API + "?" + q, { headers: { "Api-User-Agent": "DagobertDucksArchiv-probe" }, signal: AbortSignal.timeout(20000) })).json();
console.log(JSON.stringify({ normalized: j.query.normalized, redirects: j.query.redirects, pages: j.query.pages.map(p => [p.title, p.missing ? "missing" : "exists"]) }, null, 1));
const s = await (await fetch(API + "?" + new URLSearchParams({ action: "query", list: "search", srsearch: "MEGA Micky Maus Sonderheft", srlimit: "5", format: "json" }), { signal: AbortSignal.timeout(20000) })).json();
console.log("search:", s.query.search.map(x => x.title).join(" | "));
