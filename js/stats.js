// Dagobert Ducks Archiv – Stats, reading, favourites, book stats.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- Stats ----
// ---- lists opened from Stats: "lang:German:c" = comics in German; scope c comics, b books, a everything ----
const genresOf = c => String(c.genre || "").split(/\s*[,;\/]\s*/).map(x => x.trim()).filter(Boolean);
function langOfEntry(c) { return c.lang || (c.kind !== "book" ? seriesLang(seriesById(c.seriesId) || {}) : "") || "Not set"; }
const yearOf = d => +(String(d || "").slice(0, 4)) || 0;
// a story's first publication comes as "1966", "30.05.1937" or "Januar 1966" (INDUCKS, Duckipedia): the year wherever it is
const storyYearOf = d => { const m = String(d || "").match(/\b(1[89]\d\d|20\d\d)\b/g); return m ? +m[m.length - 1] : 0; };
// when it was bought: the purchase date ("2025" alone counts for that year); entries without one aren't guessed
const boughtOn = c => { const p = isoDate(c.purchaseDate || ""); return /^\d{4}(-\d{2})?/.test(p) ? p : ""; };
// when it was entered in the app
const enteredOn = c => String(c.createdAt || "").slice(0, 10);
const addedOn = boughtOn;
const MISSING = {
  grade: { label: "condition", test: c => c.kind !== "book" && !c.grade },
  price: { label: "price paid", test: c => typeof c.pricePaid !== "number" && !c.lotId },
  cover: { label: "cover picture", test: c => !c.coverUrl },
  genre: { label: "genre", test: c => !c.genre && !(c.kind !== "book" && storyGenres(c)) },
  pages: { label: "pages", test: c => !parseInt(c.pages, 10) },
  date: { label: "purchase date", test: c => !c.purchaseDate },
  source: { label: "where it was bought", test: c => !String(c.source || "").trim() }
};
function pickInfo(pick) {
  const [type, val, scope] = String(pick || "").split("|");
  const inScope = c => scope === "b" ? isNovel(c) : scope === "c" ? !isNovel(c) : true;
  const scopeWord = scope === "b" ? "books" : scope === "c" ? "comics" : "entries";
  const T = {
    lang: [c => langOfEntry(c) === val, `${scopeWord} in ${val}`],
    country: [c => countryOf(c) === val, `${scopeWord} from ${val}`],
    lot: [c => c.lotId === val, (l => `from the lot ${[l && l.source, l && niceDate(l.date)].filter(Boolean).join(", ")}`)(lotInfo(val))],
    genre: [c => val ? genresOf(c).concat(c.genre ? [] : storyGenres(c) ? storyGenres(c).split(", ") : []).includes(val) : !genresOf(c).length, val ? `${val}` : "no genre"],
    grade: [c => String(c.grade || "").split("-")[0] === val, `condition Z${val}`],
    dec: [c => { const y = yearOf(c.date) || c.issueYear; return y && Math.floor(y / 10) * 10 === +val; }, `published in the ${val}s`],
    fmt: [c => (c.format || "Not set") === val, `format ${val}`],
    pub: [c => (c.publisher || "Not set") === val, `from ${val}`],
    author: [c => splitPeople(c.author).includes(val), `by ${val}`],
    miss: [c => !!MISSING[val] && MISSING[val].test(c), `without ${(MISSING[val] || {}).label || val}`],
    added: [c => boughtOn(c).startsWith(val), `bought ${val.length === 4 ? "in " + val : niceDate(val + "-01").replace(/^1\.\s*/, "")}`],
    entered: [c => enteredOn(c).startsWith(val), `entered in the app ${val.length === 4 ? "in " + val : niceDate(val + "-01").replace(/^1\.\s*/, "")}`],
    read: [c => c.read && String(c.readDate || "").startsWith(val), `read in ${val}`],
    src: [c => String(c.source || "").trim().toLowerCase() === val.toLowerCase(), `bought from ${val}`],
    readnodate: [c => c.read && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(c.readDate || ""), "read, without a read date"],
    notowned: [c => notOwned(c), "read, not owned"]
  }[type] || [() => false, "?"];
  // reading lists also show what you read without owning it
  const who = ["read", "readnodate", "notowned"].includes(type) ? isMine : isOwn;
  return { test: c => who(c) && inScope(c) && T[0](c), label: T[1], scope };
}
function openPick(pick) { S.filters.q = ""; S.filters.status = "owned"; S.colSort = "series"; S.colTab = String(pick).endsWith("|b") ? "books" : "comics"; S.col = { pick }; S.shown = 200; nav("collection"); try { history.replaceState({ col: S.col }, "", "#collection"); } catch (e) {} }
function bindPicks(root) { (root || document).querySelectorAll("[data-pick]").forEach(b => b.onclick = e => { e.stopPropagation(); openPick(b.dataset.pick); }); }
// horizontal bars that open their list: [label, count, pick]
function pickBars(list, cls) {
  const max = Math.max(1, ...list.map(x => x[1]));
  return '<div class="hbars">' + list.map(([n, c, pick]) => `<button class="hbar" ${pick ? `data-pick="${esc(pick)}"` : ""} title="${esc(n)}: ${c}"><span class="lab">${esc(n)}</span><span class="track"><span class="fill ${cls || ""}" style="width:${(c / max * 100).toFixed(1)}%"></span></span><span class="n">${Number(c).toLocaleString("de-CH")}</span></button>`).join("") + "</div>";
}
// sort direction of a ranked list: ↓ biggest first (the usual), ↑ smallest first; remembered while the app is open
const isAsc = id => !!(S.statAsc || {})[id];
const ordered = (id, arr) => id && isAsc(id) ? arr.slice().reverse() : arr;
const sortBtn = id => `<button type="button" class="ghost tiny sortdir" data-sortdir="${id}" title="Turn the order round" aria-label="${isAsc(id) ? "Smallest first" : "Biggest first"}, tap to turn round">${isAsc(id) ? "↑" : "↓"}</button>`;
const tallyOf = (list, f, n, id) => { const m = {}; list.forEach(c => f(c).forEach(x => { if (x) m[x] = (m[x] || 0) + 1; })); return ordered(id, Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de", { numeric: true }))).slice(0, n || 99); };
// the scale on the left of a bar chart: a round top (1, 2, 2.5, 5 × 10ⁿ), its half and 0, with light guide lines
const niceMax = m => { if (!(m > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(m))); return [1, 2, 2.5, 5, 10].map(f => f * p).find(v => v >= m - 1e-9); };
const shortNum = n => n >= 1e4 ? Math.round(n / 1e3) + "k" : n >= 1e3 ? String(+(n / 1e3).toFixed(1)).replace(".", ",") + "k" : String(+n.toFixed(n % 1 ? 1 : 0)).replace(".", ",");
const ychart = (max, cols) => `<div class="ychart"><div class="yax" aria-hidden="true"><span style="top:0">${shortNum(max)}</span><span style="top:50%">${shortNum(max / 2)}</span><span style="top:100%">0</span></div>${cols}</div>`;
// which labels under the bars fit: all up to 12, otherwise every n-th, counted from the end so the latest always shows
const labStep = n => n <= 12 ? 1 : Math.ceil(n / 8);
// This year / All time, for the over-time cards
function rangeSwitch() { const r = S.statRange || "year"; return `<div class="seg small" role="group" aria-label="Period"><button type="button" data-range="year" aria-pressed="${r === "year"}">This year</button><button type="button" data-range="all" aria-pressed="${r === "all"}">All time</button></div>`; }
// bars over time: months of this year, or years
function timeBars(per, word, pickType, scope, unitFmt) {
  const now = new Date(), M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let keys;
  if ((S.statRange || "year") === "year") keys = Array.from({ length: 12 }, (_, i) => now.getFullYear() + "-" + String(i + 1).padStart(2, "0"));
  else { const ys = Object.keys(per).map(k => +k.slice(0, 4)).filter(Boolean); const lo = Math.min(now.getFullYear(), ...ys); keys = []; for (let y = Math.max(lo, now.getFullYear() - 29); y <= now.getFullYear(); y++) keys.push(String(y)); }
  const val = k => Object.keys(per).filter(x => x.startsWith(k)).reduce((a, x) => a + per[x], 0);
  const max = niceMax(Math.max(1, ...keys.map(val))), f = unitFmt || (n => Number(n).toLocaleString("de-CH")), step = labStep(keys.length);
  const lab = (k, i) => (keys.length - 1 - i) % step ? "" : k.length === 7 ? M[+k.slice(5) - 1] : "'" + k.slice(2);
  return ychart(max, `<div class="cols short" role="img" aria-label="${esc(word)}">${keys.map((k, i) => `<button class="col${val(k) ? "" : " zero"}" ${pickType && val(k) ? `data-pick="${esc(pickType + "|" + k + "|" + scope)}"` : ""} title="${esc((k.length === 7 ? M[+k.slice(5) - 1] + " " + k.slice(0, 4) : k) + ": " + f(val(k)))}"><span class="bar" style="height:${(val(k) / max * 100).toFixed(1)}%"></span><span class="x">${lab(k, i)}</span></button>`).join("")}</div>`);
}
// the country of an entry: its series' country, or the book's language
const COUNTRY_NAMES = { de: "Germany", it: "Italy", se: "Sweden", ch: "Switzerland", at: "Austria", us: "USA", dk: "Denmark", no: "Norway", fi: "Finland", fr: "France", nl: "Netherlands", es: "Spain", br: "Brazil", gb: "United Kingdom", be: "Belgium", pt: "Portugal", pl: "Poland" };
// books: the country the work first came out in (your own entry, the book series, the original language, the author's country);
// comic books: the country of your edition, like comics
const LANG_COUNTRY = { Swedish: "Sweden", Italian: "Italy", Danish: "Denmark", Norwegian: "Norway", Finnish: "Finland", Dutch: "Netherlands", Japanese: "Japan", Polish: "Poland", Russian: "Russia", Czech: "Czechia", Hungarian: "Hungary", Greek: "Greece", "Ancient Greek": "Ancient Greece", Latin: "Ancient Rome", Icelandic: "Iceland", "Old Norse": "Iceland", French: "France", Chinese: "China", Korean: "South Korea", Turkish: "Turkey", Hebrew: "Israel", Persian: "Iran", "Middle High German": "Germany", "Old High German": "Germany", "Middle English": "United Kingdom", "Old English": "United Kingdom" };
const EDITION_COUNTRY = Object.assign({}, LANG_COUNTRY, { German: "Germany", Latin: "", "Ancient Greek": "" });
function bookCountry(c) {
  if (c.country) return c.country;
  const sm = c.seriesName && typeof bookInfo === "function" ? bookInfo(c.seriesName) : {};
  if (sm.country) return sm.country;
  if (!isNovel(c)) return EDITION_COUNTRY[c.lang] || "";
  if (c.origLang && LANG_COUNTRY[c.origLang]) return LANG_COUNTRY[c.origLang];
  const a = splitPeople(c.author)[0], ac = a && (S.authorCountry || {})[a];
  if (ac) return ac;
  const translated = c.translator || c.originalTitle || (c.origLang && c.origLang !== c.lang);
  return (!translated && LANG_COUNTRY[c.lang]) || "";
}
function countryOf(c) { if (c.kind === "book") return bookCountry(c) || "Not set"; const se = seriesById(c.seriesId); const k = se && (se.country || String(se.code || (catEntry(se) || {}).code || "").split("/")[0]); return k ? COUNTRY_NAMES[k] || k.toUpperCase() : "Not set"; }
// a line chart over months, one line per series of values; tapping a month opens what was bought then
function lineChart(ks, lines, pickType, bars) {
  if (!ks.length) return "";
  const W = 360, H = 160, L = 40, B = 22, max = Math.max(1, ...lines.flatMap(l => l.vals)) * 1.1;
  const x = i => ks.length === 1 ? L + (W - L) / 2 : L + i * (W - L - 8) / (ks.length - 1), y = v => H - B - v / max * (H - B - 8);
  const ticks = [0, max / 2 / 1.1, max / 1.1].map(v => `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v).toLocaleString("de-CH")}</text><line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`).join("");
  const lab = k => { const [yy, mm] = k.split("-"); return mm + "/" + yy.slice(2); }, step = Math.ceil(ks.length / 6);
  const xl = ks.map((k, i) => (i % step || ks.length - 1 - i < step * 0.75) && i !== ks.length - 1 ? "" : `<text x="${x(i)}" y="${H - 6}" text-anchor="${ks.length > 1 && i === ks.length - 1 ? "end" : "middle"}">${lab(k)}</text>`).join("");
  const path = l => `<path class="${l.cls}" d="${l.vals.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ")}"/>`;
  const w = ks.length > 1 ? (W - L - 8) / (ks.length - 1) : W - L;
  // optional bars under the line: how many were added that month (own scale: the highest bar is 40 % of the chart)
  const bmax = bars ? Math.max(1, ...bars) : 1, bh = v => v / bmax * (H - B - 8) * 0.4, bw = Math.max(1.5, Math.min(14, w * 0.7));
  const barsSvg = bars ? bars.map((v, i) => v ? `<rect class="gbar" x="${(x(i) - bw / 2).toFixed(1)}" y="${(H - B - bh(v)).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh(v).toFixed(1)}"/>` : "").join("") : "";
  const hits = ks.map((k, i) => `<rect class="hit" x="${(x(i) - w / 2).toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${H - B}"${pickType ? ` data-pick="${pickType}|${k}|a"` : ""}><title>${lab(k)}: ${lines.map(l => l.label + " " + l.vals[i].toLocaleString("de-CH")).join(", ")}${bars ? " · bought that month: " + bars[i] : ""}</title></rect>`).join("");
  return `<svg class="vhist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Per month">${ticks}${xl}${barsSvg}${lines.map(path).join("")}${hits}</svg>
    <div class="row small" style="gap:14px;flex-wrap:wrap">${lines.map(l => `<span><span class="key ${l.cls}"></span> ${esc(l.label)}: ${l.vals[l.vals.length - 1].toLocaleString("de-CH")}</span>`).join("")}${bars ? `<span><span class="key gbar"></span> bought per month (most: ${bmax.toLocaleString("de-CH")})</span>` : ""}</div>`;
}
// bars for the 12 months of this year
function timeBarsYear(per, word) { const r = S.statRange; S.statRange = "year"; const h = timeBars(per, word, "", "a"); S.statRange = r; return h; }
VIEWS.stats = {
  html() {
    if (!S.comics.length) return '<h2>Stats</h2><div class="empty"><h3>No stats yet</h3><p>Stats appear here once you\'ve added comics.</p></div>';
    // five tabs; the old tab names still lead somewhere
    let tab = S.statTab || "overview";
    if (tab === "comics") tab = "collection"; if (tab === "value") tab = "money"; if (tab === "books") { tab = "collection"; S.statScope = "b"; }
    S.statTab = tab;
    // Comics | Books | Both: filters every tab ("c" comics incl. comic books, "b" books, "a" both)
    const scope = S.statScope || "a", inS = c => scope === "a" ? true : scope === "b" ? isNovel(c) : !isNovel(c);
    const sel = owned().filter(inS), selW = S.comics.filter(c => c.status === "wanted" && inS(c)), selN = S.comics.filter(c => notOwned(c) && inS(c));
    const own = sel.filter(c => !isNovel(c)), novels = sel.filter(isNovel), novelsWanted = selW.filter(isNovel);
    const word = scope === "b" ? "books" : scope === "c" ? "comics" : "entries";
    const nf = n => Number(n).toLocaleString("de-CH"), pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    const now = new Date(), yNow = String(now.getFullYear()), ymNow = yNow + "-" + String(now.getMonth() + 1).padStart(2, "0");
    const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const card = (title, side, body) => `<div class="card stack"><div class="cardhead"><h3>${title}</h3>${side ? `<span class="muted small">${side}</span>` : ""}</div>${body}</div>`;
    const note = t => `<p class="small muted" style="margin:0">${t}</p>`;
    const T = [["overview", "Overview"], ["collection", "Collection"], ["money", "Money"], ["stories", "Stories"], ["reading", "Reading"]];
    const head = `<h2 style="margin:0">Stats</h2>
      <div class="subtabs five" role="tablist" aria-label="Show">${T.map(([k, l]) => `<button role="tab" type="button" data-sttab="${k}" aria-selected="${tab === k}">${l}</button>`).join("")}</div>
      <div class="seg small scopesw" role="group" aria-label="Count">${[["c", "Comics"], ["b", "Books"], ["a", "Both"]].map(([k, l]) => `<button type="button" data-sscope="${k}" aria-pressed="${scope === k}">${l}</button>`).join("")}</div>`;
    if (!sel.length && !(tab === "reading" && selN.length) && tab !== "stories") return head + `<div class="empty"><h3>No ${word} yet</h3><p>Switch to ${scope === "b" ? "Comics" : "Books"} or Both above.</p></div>`;

    // money of a list, in CHF
    const moneyOf = list => { const r = { paid: 0, value: 0, paidValued: 0, priced: 0, valued: 0, n: list.length, sums: {}, vals: {} };
      list.forEach(c => { const n = c.copies || 1, cur = c.currency || "CHF", v = valueOf(c);
        if (typeof c.pricePaid === "number") { r.priced++; r.paid += toCHF(c.pricePaid * n, cur); r.sums[cur] = (r.sums[cur] || 0) + c.pricePaid * n; if (v) r.paidValued += toCHF(c.pricePaid * n, cur); }
        if (v) { r.valued++; r.value += toCHF(v.amount * n, v.cur); r.vals[v.cur] = (r.vals[v.cur] || 0) + v.amount * n; } });
      return r; };
    const allOwned = owned(); let mE = null, mS = null; const mEvery = () => mE || (mE = moneyOf(allOwned)), mSel = () => mS || (mS = moneyOf(sel));
    const chfOf = c => { const v = valueOf(c); return v ? toCHF(v.amount * (c.copies || 1), v.cur) : null; };
    const paidOf = c => typeof c.pricePaid === "number" ? toCHF(c.pricePaid * (c.copies || 1), c.currency) : null;
    const nameOf = c => isNovel(c) ? c.title || "Untitled" : comicTag(c) + (c.title ? ": " + c.title : "");
    const openList = xs => `<ol class="toplist">${xs.join("")}</ol>`;
    // series of comics with a known size (completion), as before
    const ownBy = new Map(), allBy = new Map(), loads = [];
    own.forEach(c => { if (c.kind !== "book") (ownBy.get(c.seriesId) || ownBy.set(c.seriesId, []).get(c.seriesId)).push(c); });
    S.comics.forEach(c => (allBy.get(c.seriesId) || allBy.set(c.seriesId, []).get(c.seriesId)).push(c));
    const perSeries = S.series.map(s => {
      const mine = ownBy.get(s.id) || [];
      if (!mine.length) return { s, n: 0, tot: 0 };   // nothing owned: no need to count its grid
      const ce = catEntry(s), gridN = s.numbering === "year" ? yearGridTotal(s) : null, catN = gridN || (ce && +ce.issues) || 0;
      if (s.numbering === "year" && ce && gridN == null && !S.catCache[ce.file] && !(S.statCat || {})[ce.file]) { S.statCat = Object.assign({}, S.statCat, { [ce.file]: 1 }); loads.push(catalogueFile(ce).catch(() => {})); }
      const zero = zeroSquares(s, ce && S.catCache[ce.file], allBy.get(s.id) || []);
      const tot = s.numbering === "year" ? (catN || Math.max(0, perYearTotal(s))) : Math.max(0, (+s.latest || 0) - Math.max(1, +s.first || 1) + 1) + (zero.has("run") ? 1 : 0);
      const inGrid = k => { const m = /^(\d{4})\/(\d{2,3})$/.exec(k); if (m && +m[2] === 0) return zero.has(m[1]); if (/^\d{4}X\d{2,3}$/.test(k)) return !!catN;
        if (splitLabel(ce && S.catCache[ce.file], k)) return true;
        return s.numbering === "year" ? !!m && +m[2] >= 1 && (catN ? true : +m[1] >= +s.firstYear && +m[1] <= +s.lastYear && +m[2] <= Math.max(perYearOf(s, +m[1]), 1)) : /^\d+$/.test(k) && +k >= Math.max(1, +s.first || 1) && +k <= +s.latest; };
      const gc = s.numbering === "year" ? gridCat(s) : null, n = new Set(mine.filter(c => !c.facsimile).flatMap(c => { const f = gc && fusedSquare(gc, c.issueLabel || c.issue); return f ? [f] : issueSquares(c.issueLabel || c.issue); }).filter(k => /^\d{4}-\d{2,3}-\d{2,3}$/.test(k) ? !!catN : inGrid(k))).size;   // a double issue counts once
      return { s, n, tot };
    }).filter(x => x.tot && x.n);
    if (loads.length) Promise.allSettled(loads).then(() => { if (S.view === "stats") renderKeep(); });   // one redraw when all have loaded
    const wishIn = sid => S.comics.filter(c => c.status === "wanted" && c.seriesId === sid);
    // value per series (also tells which series have no prices)
    const bySer = {}; sel.forEach(c => { const k = isNovel(c) ? (c.seriesName ? "book:" + c.seriesName : "") : seriesKeyOf(c); if (k) (bySer[k] = bySer[k] || []).push(c); });
    const serVals = Object.keys(bySer).map(k => ({ k, v: valueChf(bySer[k]), list: bySer[k] })), noVal = serVals.filter(x => x.v == null).sort((a, b) => b.list.length - a.list.length);
    const noValList = () => S.statNoVal ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${noVal.map(x => x.k.startsWith("name:") ? `<span class="chipbtn" title="Not in your series list">${esc(seriesTitle(x.k))} ${x.list.length}</span>` : `<button type="button" class="chipbtn" data-priceser="${esc(x.k)}">${esc(seriesTitle(x.k))} ${x.list.length}</button>`).join("")}</div><p class="small muted" style="margin:4px 0 0">Tap a series to open its price ranges (Single books: the list of your books, where each gets its own value). The number is how many you own.</p>` : "";
    const bk = () => scope !== "c" && novels.length ? bookStats(novels, novelsWanted, true) : null;
    let idx0 = null; const idxGet = () => idx0 || (idx0 = storyIndex("owned"));

    // ================= Overview =================
    if (tab === "overview") {
      const valSel = valueChf(sel), readN = sel.filter(c => c.read).length;
      const tile = (v, k, to, extra) => `<button type="button" class="stile" data-sttab="${to}"><span class="v2">${v}</span><span class="k small muted">${k}</span>${extra || ""}</button>`;
      const tiles = `<div class="tiles4">${tile(nf(sel.length), word + " you own", "collection")}${tile(valSel != null ? "≈ " + Math.round(valSel).toLocaleString("de-CH") : "–", "CHF value", "money")}${tile(nf(selW.length), "on wishlist", "collection")}${tile(pct(readN, sel.length) + " %", "read · " + nf(sel.length - readN) + " to go", "reading", `<span class="meter"><span style="width:${pct(readN, sel.length)}%"></span></span>`)}</div>`;
      const sc = scope === "b" ? "b" : scope === "c" ? "c" : "a";
      const spentIn = prefix => sel.filter(c => typeof c.pricePaid === "number" && boughtOn(c).startsWith(prefix)).reduce((a, c) => a + paidOf(c), 0);
      const addedM = sel.filter(c => boughtOn(c).startsWith(ymNow)).length, enteredM = sel.filter(c => enteredOn(c).startsWith(ymNow)).length, readM = sel.filter(c => String(c.readDate || "").startsWith(ymNow)).length;
      const month = card("This month", M[now.getMonth()] + " " + yNow, `<div class="row monthrow">
        <button type="button" class="stat3"${addedM ? ` data-pick="added|${ymNow}|${sc}"` : ""}><span class="v2">${nf(addedM)}</span><span class="k small muted">bought</span></button>
        <button type="button" class="stat3"${enteredM ? ` data-pick="entered|${ymNow}|${sc}"` : ""}><span class="v2">${nf(enteredM)}</span><span class="k small muted">entered</span></button>
        <button type="button" class="stat3"${readM ? ` data-pick="read|${ymNow}|${sc}"` : ""}><span class="v2">${nf(readM)}</span><span class="k small muted">read</span></button>
        <div class="stat3"><span class="v2">CHF ${fmt2(spentIn(ymNow))}</span><span class="k small muted">spent</span></div></div>`);
      // To do: everything that needs you, in one place
      const todo = [];
      [["Condition", "grade", "c"], ["Price paid", "price", "a"], ["Purchase date", "date", "a"], ["Genre", "genre", "a"], ["Pages (books)", "pages", "b"]].forEach(([l, k, s2]) => {
        if ((s2 === "c" && scope === "b") || (s2 === "b" && scope === "c")) return;
        const pk = `miss|${k}|${s2 === "a" ? sc : s2}`, n = sel.filter(pickInfo(pk).test).length; if (n) todo.push(`<button type="button" class="todo" data-pick="${esc(pk)}"><b>${nf(n)}</b> without ${esc(l.toLowerCase())}</button>`); });
      const noCov = {}; sel.filter(c => !c.coverUrl).forEach(c => { const k = isNovel(c) ? "" : seriesKeyOf(c); if (k) noCov[k] = (noCov[k] || 0) + 1; });
      const covTop = Object.entries(noCov).sort((a, b) => b[1] - a[1]).slice(0, 6);
      if (covTop.length) todo.push(`<div class="todo"><button type="button" class="link" data-pick="miss|cover|${sc}"><b>${nf(sel.filter(c => !c.coverUrl).length)}</b> without a cover</button>: ${covTop.map(([k, n]) => { const c0 = bySer[k] && bySer[k][0]; return c0 ? `<button type="button" class="chipbtn" data-scol='${esc(JSON.stringify({ p: publisherOf(c0), g: groupOf(c0), s: k }))}'>${esc(seriesTitle(k))} ${n}</button>` : ""; }).join(" ")}</div>`);
      const noStory = own.filter(c => c.kind !== "book" && !(c.stories || []).length && catEntry(seriesById(c.seriesId))).length;
      if (noStory) todo.push(`<div class="todo"><b>${nf(noStory)}</b> comics without stories (their series is in INDUCKS) <button type="button" id="goFill">Fill all</button></div>`);
      if (noVal.length) todo.push(`<div class="todo"><b>${nf(noVal.length)}</b> ${noVal.length === 1 ? "series has" : "series have"} no prices yet <button type="button" class="link" data-novals>${S.statNoVal ? "Hide the list" : "Show them"}</button>${noValList()}</div>`);
      const bdays = daysSince(S.lastBackup);
      if (bdays > 30) todo.push(`<div class="todo">${S.lastBackup ? "Last backup " + nf(bdays) + " days ago" : "No backup yet"} <button type="button" id="goBackup">Make a backup</button></div>`);
      const todoCard = todo.length ? card("To do", "", `<div class="todos">${todo.join("")}</div>`) : card("To do", "", note("Nothing to do: everything is filled in. ✓"));
      // one highlight: the series closest to complete
      const close = perSeries.map(x => Object.assign({ miss: x.tot - x.n }, x)).filter(x => x.miss > 0 && x.n / x.tot >= 0.25).sort((a, b) => a.miss - b.miss || b.n - a.n)[0];
      const hl = close && scope !== "b" ? `<button type="button" class="card highlight" data-gap="${esc(close.s.id)}"><span class="small muted">Closest to complete</span><strong>${esc(seriesLabel(close.s))}: only ${nf(close.miss)} missing</strong><span class="small muted">${nf(close.n)} of ${nf(close.tot)} · tap for the gap grid</span></button>` : "";
      return head + tiles + hl + month + todoCard;
    }

    // ================= Collection =================
    if (tab === "collection") {
      // growth: comics and books owned at the end of each month; entries without a purchase date count from the start
      const ownedAll = allOwned.filter(c => !c.facsimile || true);
      const months = (() => { const ds = ownedAll.map(c => boughtOn(c).slice(0, 7)).filter(d => d.length === 7).sort();
        const all = (S.statRange || "year") === "all", start = all ? (ds[0] || ymNow) : yNow + "-01", out = [];
        let [y, m] = start.split("-").map(Number); const [ey, em] = ymNow.split("-").map(Number);
        while (y < ey || (y === ey && m <= em)) { out.push(y + "-" + String(m).padStart(2, "0")); m++; if (m > 12) { m = 1; y++; } }
        return out; })();
      const upTo = (list, k) => list.filter(c => { const d = boughtOn(c); return !d || d.slice(0, 7) <= k || (d.length === 4 && d <= k.slice(0, 4)); }).length;
      const gc = ownedAll.filter(c => !isNovel(c)), gb = ownedAll.filter(isNovel);
      const lines = [{ cls: "v", label: "Comics", vals: months.map(k => upTo(gc, k)) }]; if (gb.length) lines.push({ cls: "b", label: "Books", vals: months.map(k => upTo(gb, k)) });
      const undated = ownedAll.filter(c => !boughtOn(c)).length;
      const perM = {}; ownedAll.forEach(c => { const d = boughtOn(c).slice(0, 7); if (d.length === 7) perM[d] = (perM[d] || 0) + 1; });
      const growth = card("Growth", "", `${rangeSwitch()}${lineChart(months, lines, "added", months.map(k => perM[k] || 0))}
        ${note(`The lines: owned at the end of each month, by purchase date. The bars: how many you bought that month. ${undated ? `<button type="button" class="link" data-pick="miss|date|a">${nf(undated)} without a purchase date</button> count from the start. ` : ""}Tap a month to see what you bought then.`)}`);
      // what you collect: universe › group
      // Disney by its groups (Italia, Sverige – Pocket …), every other universe as one bar (Franco-Belgian, Swedish comics, Marvel, Other …)
      const groups = {}; sel.forEach(c => { const p = publisherOf(c), g = p === DISNEY ? groupOf(c) : "", k = p + "\u0001" + g; (groups[k] = groups[k] || { p, g, n: 0 }).n++; });
      const gl = ordered("collect", Object.values(groups).sort((a, b) => b.n - a.n)), gmax = Math.max(1, ...gl.map(x => x.n));
      const groupLabel = x => x.p === DISNEY ? "Disney · " + x.g : x.p;
      const comp = card("What you collect " + sortBtn("collect"), gl.length + " groups", `<div class="hbars">${(S.statAllGroups ? gl : gl.slice(0, 8)).map(x => `<button class="hbar" data-p="${esc(x.p)}" data-g="${esc(x.g)}" title="${esc(groupLabel(x))}: ${x.n}"><span class="lab">${esc(groupLabel(x))}</span><span class="track"><span class="fill" style="width:${(x.n / gmax * 100).toFixed(1)}%"></span></span><span class="n">${nf(x.n)}</span></button>`).join("")}</div>
        ${gl.length > 8 ? `<button class="ghost" id="stAllGroups" type="button">${S.statAllGroups ? "Show fewer" : "Show all " + gl.length + " groups"}</button>` : ""}`);
      // countries and languages
      const sc = scope === "b" ? "b" : scope === "c" ? "c" : "a";
      const countries = tallyOf(sel, c => [countryOf(c)], 8).map(([n, k]) => [n, k, `country|${n}|${sc}`]), langs = tallyOf(sel, c => [langOfEntry(c)], 8).map(([n, k]) => [n, k, `lang|${n}|${sc}`]);
      const geo = card("Countries and languages", "", `${scope !== "c" ? note("Books count where the work first came out; comics and comic books where your edition was published.") : ""}${pickBars(countries)}<div class="small muted" style="margin-top:6px">Languages</div>${pickBars(langs)}`);
      // completion: biggest or fewest missing
      const fewest = S.statCompl === "few", cl = perSeries.slice().map(x => Object.assign({ miss: x.tot - x.n }, x)).filter(x => !fewest || x.miss > 0)
        .sort(fewest ? (a, b) => a.miss - b.miss || b.n - a.n : (a, b) => b.n - a.n);
      const clO = ordered("compl", cl);
      const shown = S.statAllSeries ? clO : clO.slice(0, 8);
      const completion = scope !== "b" && cl.length ? card("How complete " + sortBtn("compl"), `<span class="seg small" role="group"><button type="button" data-compl="" aria-pressed="${!fewest}">Biggest</button><button type="button" data-compl="few" aria-pressed="${fewest}">Fewest missing</button></span>`,
        `<div class="hbars">${shown.map(({ s, n, tot }) => `<button class="hbar" data-gap="${esc(s.id)}" title="${esc(s.name)}: ${n} of ${tot}"><span class="lab">${esc(seriesLabel(s))}</span><span class="track"><span class="fill owned" style="width:${Math.max(1, Math.min(100, n / tot * 100)).toFixed(1)}%"></span></span><span class="n">${fewest ? nf(tot - n) + "<small>missing</small>" : pct(n, tot) + " %<small>" + nf(n) + " / " + nf(tot) + "</small>"}</span></button>`).join("")}</div>
        ${cl.length > 8 ? `<button class="ghost" id="stAllSeries" type="button">${S.statAllSeries ? "Show fewer" : "Show all " + cl.length + " series"}</button>` : ""}
        ${note(fewest ? "Series with the fewest issues missing. " + (cl[0] ? nf(wishIn(cl[0].s.id).length) + " of " + esc(seriesLabel(cl[0].s)) + "'s missing ones are on your wishlist. " : "") + "Tap a series for its gap grid." : "Biggest first. Tap a series for its gap grid.")}`) : "";
      // when your copies came out: decades, oldest, newest, median
      const ys = sel.map(c => ({ c, y: yearOf(c.date) || c.issueYear || 0 })).filter(x => x.y > 1400).sort((a, b) => a.y - b.y);
      const dec = {}; ys.forEach(({ y }) => { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; });
      const dks = Object.keys(dec).map(Number), decs = dks.length ? Array.from({ length: (Math.max(...dks) - Math.min(...dks)) / 10 + 1 }, (_, i) => Math.min(...dks) + i * 10) : [];
      const dmax = niceMax(Math.max(1, ...Object.values(dec))), dstep = decs.length <= 6 ? 1 : Math.ceil(decs.length / 6), peak = decs.reduce((a, d) => (dec[d] || 0) > (dec[a] || 0) ? d : a, decs[0]);
      const ol = ys[0], nw = ys[ys.length - 1], med = ys.length ? ys[Math.floor(ys.length / 2)].y : 0;
      const years = decs.length ? card("When they came out", `<span id="decread">${peak}s: ${nf(dec[peak] || 0)}</span>`, `${ychart(dmax, `<div class="cols" role="img" aria-label="Per decade">${decs.map((d, i) => `<button class="col${d === peak ? " on" : ""}" data-dec="${d}" data-n="${dec[d] || 0}"${dec[d] ? ` data-pick="dec|${d}|${sc}"` : ""} title="${d}s: ${dec[d] || 0}"><span class="bar" style="height:${((dec[d] || 0) / dmax * 100).toFixed(1)}%"></span><span class="x">${i % dstep ? "" : decs[decs.length - 1] - decs[0] >= 100 ? d : "'" + String(d).slice(2)}</span></button>`).join("")}</div>`)}
        <div class="small">Oldest: <button class="link" data-open="${esc(ol.c.id)}">${esc(nameOf(ol.c))}</button> (${ol.y}) · Newest: <button class="link" data-open="${esc(nw.c.id)}">${esc(nameOf(nw.c))}</button> (${nw.y}) · Median year ${med}</div>
        ${note(`By publication date${sel.length - ys.length ? " · " + nf(sel.length - ys.length) + " without a date" : ""}. Tap a bar to see those ${word}.`)}`) : "";
      // duplicates and trade copies
      // the same item twice: same series, same number, same edition (1. Auflage and Neuauflage are different items), not a facsimile of it;
      // an unknown number ("1989/?") or a book without a volume number is only the same as another entry with its ISBN
      const slotKey = c => { const lab = String(c.issueLabel || c.issue || "").trim();
        if (!lab || /\?/.test(lab)) return c.kind === "book" && c.isbn ? "isbn:" + String(c.isbn).replace(/[^0-9X]/gi, "") : "id:" + c.id;
        return (c.kind === "book" ? "b:" + (c.seriesName || "") : c.seriesId || c.seriesName || "") + "|" + lab + "|" + String(c.edition || "").trim().toLowerCase() + "|" + (c.facsimile ? "f" : ""); };
      const slots = {}; sel.forEach(c => { const k = slotKey(c), x = slots[k] = slots[k] || { n: 0, cs: [] }; x.n += c.copies || 1; x.cs.push(c); });
      const dupL = Object.values(slots).filter(x => x.n > 1).sort((a, b) => b.n - a.n || nameOf(a.cs[0]).localeCompare(nameOf(b.cs[0]), "de", { numeric: true }));
      const extra = dupL.reduce((a, x) => a + x.n - 1, 0), dupSlots = dupL.length, trade = sel.filter(c => c.forTrade).length;
      const dups = extra || trade ? card("Duplicates", "", `<div class="row" style="gap:24px"><div><div class="v2">${nf(extra)}</div><div class="k small muted">extra copies of ${nf(dupSlots)} ${dupSlots === 1 ? "item" : "items"}</div></div><div><div class="v2">${nf(trade)}</div><div class="k small muted">marked for trade</div></div></div>
        <div class="row" style="gap:8px;flex-wrap:wrap">${extra ? `<button type="button" class="ghost" id="stDups">${S.statDups ? "Hide the list" : "Show them"}</button>` : ""}${trade ? `<button type="button" id="goTrade">Show the trade list</button>` : ""}</div>
        ${S.statDups && extra ? openList(dupL.map(x => `<li><button class="link" data-open="${esc(x.cs[0].id)}">${esc(nameOf(x.cs[0]))}</button><span class="muted"> ×${x.n}${x.cs.length > 1 ? " · " + x.cs.length + " separate entries" : ""}</span></li>`)) + note("Copies of the same item: same series, number and edition. A different edition, a variant cover (B) or a facsimile is a different item.") : ""}`) : "";
      // wishes bought, per month this year (counted since version da-v179)
      const gotOn = c => boughtOn(c) || String(c.wishGotOn || "");   // without a purchase date: the day the wish became owned
      const got = {}; sel.filter(c => c.wasWish && gotOn(c).startsWith(yNow)).forEach(c => { const k = gotOn(c).slice(0, 7); if (k.length === 7) got[k] = (got[k] || 0) + 1; });
      const gotN = Object.values(got).reduce((a, b) => a + b, 0);
      const wishCard = card("Wishes fulfilled", yNow, gotN ? `<div class="small"><strong>${nf(gotN)}</strong> <span class="muted">bought from your wishlist this year</span></div>${timeBarsYear(got, "wishes bought")}` : note("Counted from now on: anything you buy from your wishlist (Got it, or saving a wished comic as owned) shows up here."));
      // formats and genres, one card with chips
      const fg = S.statFG || "fmt";
      const fgList = fg === "genre" ? tallyOf(sel, c => genresOf(c).length ? genresOf(c) : !isNovel(c) && storyGenres(c) ? storyGenres(c).split(", ") : [], 8, "fg").map(([n, k]) => [n, k, `genre|${n}|${sc}`])
        : tallyOf(sel, c => [c.format || "Not set"], 8, "fg").map(([n, k]) => [n, k, `fmt|${n}|${sc}`]);
      const fgCard = card(`<span class="seg small" role="group"><button type="button" data-fg="fmt" aria-pressed="${fg === "fmt"}">Formats</button><button type="button" data-fg="genre" aria-pressed="${fg === "genre"}">Genres</button></span> ${sortBtn("fg")}`, "", fgList.length ? pickBars(fgList) : note("No genres yet. Comics get them from their stories (Duckipedia), books from the book databases."));
      const cond = conditionCard(sel, sc === "a" ? "c" : sc);
      const bkS = bk(), books = bkS ? `<div class="two">${bkS.serCard}${bkS.closeCard}</div><div class="two">${bkS.authorsCard}${bkS.collectCard}</div>` : "";
      return head + growth + `<div class="two">${comp}${geo}</div><div class="two">${completion}${years}</div>` + books + `<div class="two">${dups}${wishCard}</div><div class="two">${fgCard}${cond}</div>`;
    }

    // ================= Money =================
    if (tab === "money") {
      const half = S.statMoney || "value";
      const sw = `<div class="subtabs" role="tablist" aria-label="Money"><button role="tab" type="button" data-money="value" aria-selected="${half === "value"}">Value</button><button role="tab" type="button" data-money="spend" aria-selected="${half === "spend"}">Spending</button></div>`;
      const settings = `<details class="card"><summary><strong>Settings for values</strong> <span class="muted small">exchange rates, condition factors</span></summary><div class="stack" style="margin-top:8px">${valueSettingsHtml()}</div></details>`;
      if (half === "value") {
        const m = mSel(), d = m.value - m.paidValued;
        const totals = card("Value", "CHF", `<div class="row" style="gap:24px;flex-wrap:wrap"><div><div class="v2">CHF ${fmt2(m.value)}</div><div class="k small muted">value of ${nf(m.valued)} of ${nf(m.n)}</div></div><div><div class="v2">CHF ${fmt2(m.paid)}</div><div class="k small muted">paid for ${nf(m.priced)} of ${nf(m.n)}</div></div>${m.paidValued ? `<div><div class="v2">${d >= 0 ? "+" : "−"} ${fmt2(Math.abs(d))}</div><div class="k small muted">gain, for those with both</div></div>` : ""}</div>`);
        const top = ordered("val", sel.map(c => ({ c, v: chfOf(c) })).filter(x => x.v != null).sort((a, b) => b.v - a.v)).slice(0, 10);
        const topCard = top.length ? card("Most valuable " + sortBtn("val"), isAsc("val") ? "lowest 10" : "top 10", openList(top.map(({ c, v }) => `<li><button class="link" data-open="${esc(c.id)}">${esc(nameOf(c))}</button><span class="muted"> ${c.grade ? "Z" + esc(c.grade) + " · " : ""}CHF ${fmt2(v)}</span></li>`))) : "";
        const gains = sel.map(c => ({ c, v: chfOf(c), p: paidOf(c) })).filter(x => x.v != null && x.p != null && x.p > 0 && !x.c.lotId).map(x => Object.assign(x, { g: x.v - x.p }));
        // a lot counts as one buy: what you paid for the whole lot against the value of everything in it
        [...new Set(sel.filter(c => c.lotId).map(c => c.lotId))].forEach(id => { const l = lotInfo(id); if (!l) return;
          const ms = l.members.filter(c => isOwn(c)), vals = ms.map(chfOf).filter(v => v != null), p = typeof parseAmt(l.total) === "number" ? toCHF(parseAmt(l.total), l.currency) : ms.reduce((a, c) => a + (paidOf(c) || 0), 0);
          if (!vals.length || !(p > 0)) return;
          const v = vals.reduce((a, b) => a + b, 0);
          gains.push({ lot: l, n: ms.length, nv: vals.length, v, p, g: v - p }); });
        const best = gains.slice().sort((a, b) => b.g - a.g).slice(0, 5).filter(x => x.g > 0), worst = gains.slice().sort((a, b) => a.g - b.g).slice(0, 5).filter(x => x.g < 0);
        const gl = x => `<li>${x.lot ? `<button class="link" data-pick="${esc("lot|" + x.lot.id + "|a")}">Lot: ${esc([x.lot.source, niceDate(x.lot.date)].filter(Boolean).join(", ") || "no date")} (${x.n}${x.nv < x.n ? ", " + x.nv + " with a value" : ""})</button>` : `<button class="link" data-open="${esc(x.c.id)}">${esc(nameOf(x.c))}</button>`}<span class="muted"> paid ${fmt2(x.p)}, worth ${fmt2(x.v)}: </span><strong>${x.g >= 0 ? "+" : "−"}${fmt2(Math.abs(x.g))}</strong></li>`;
        const buys = best.length || worst.length ? card("Best and worst buys", "CHF", `${best.length ? `<div class="small"><strong>Best</strong>${openList(best.map(gl))}</div>` : ""}${worst.length ? `<div class="small"><strong>Worst</strong>${openList(worst.map(gl))}</div>` : ""}${note("Value minus price paid; things you got for free are left out. A lot counts as one buy: the whole lot's price against the value of everything in it. Tap a lot to see what was in it.")}`) : "";
        const topSer = ordered("ser", serVals.filter(x => x.v != null).sort((a, b) => b.v - a.v)).slice(0, 10), tmax = Math.max(1e-9, ...topSer.map(x => x.v));
        const serCard = topSer.length || noVal.length ? card("Value per series " + sortBtn("ser"), "CHF", `${topSer.length ? `<div class="hbars">${topSer.map(x => { const c0 = x.list[0], col = isNovel(c0) ? { p: NOVEL_PUB, g: BOOK_GROUP, s: x.k } : { p: publisherOf(c0), g: groupOf(c0), s: x.k }; return `<button class="hbar" data-scol='${esc(JSON.stringify(col))}' title="${esc(seriesTitle(x.k))}: CHF ${fmt2(x.v)}"><span class="lab">${esc(seriesTitle(x.k))}</span><span class="track"><span class="fill" style="width:${(x.v / tmax * 100).toFixed(1)}%"></span></span><span class="n">${Math.round(x.v).toLocaleString("de-CH")}</span></button>`; }).join("")}</div>` : ""}
          ${noVal.length ? `<div class="row small" style="gap:8px;align-items:center"><span class="muted">${noVal.length} ${noVal.length === 1 ? "series has" : "series have"} no value yet.</span><button type="button" class="link" data-novals>${S.statNoVal ? "Hide the list" : "Show them"}</button></div>${noValList()}` : ""}`) : "";
        const curRows = Object.keys(Object.assign({}, m.sums, m.vals)).sort();
        const details = `<details class="card"><summary><strong>How the value is made up</strong> <span class="muted small">per currency, checked / table / estimate</span></summary><div class="stack" style="margin-top:8px">
          ${curRows.length ? `<div class="tablewrap"><table class="moneytab"><thead><tr><th>In</th><th>Value</th><th>≈ CHF</th><th>Paid</th><th>≈ CHF</th></tr></thead><tbody>${curRows.map(k => { const cv = x => x == null ? "–" : k === "CHF" ? "–" : fmt2(toCHF(x, k)); return `<tr><td>${k}</td><td>${m.vals[k] != null ? fmt2(m.vals[k]) : "–"}</td><td>${cv(m.vals[k])}</td><td>${m.sums[k] != null ? fmt2(m.sums[k]) : "–"}</td><td>${cv(m.sums[k])}</td></tr>`; }).join("")}</tbody></table></div>` : ""}
          ${own.length ? valueCard(own, "Comics & comic books") : ""}${novels.length ? valueCard(novels, "Books") : ""}</div></details>`;
        return head + sw + historyCard(mEvery()) + totals + `<div class="two">${topCard}${buys}</div>` + serCard + details + settings;
      }
      // spending
      const sc = scope === "b" ? "b" : scope === "c" ? "c" : "a";
      const perSpent = {}; sel.forEach(c => { const d = boughtOn(c).slice(0, 7), p = paidOf(c); if (d && p != null) perSpent[d] = (perSpent[d] || 0) + p; });
      const inRange = Object.keys(perSpent).filter(k => (S.statRange || "year") === "all" || k.startsWith(yNow)).reduce((a, k) => a + perSpent[k], 0);
      const spent = card("Spent", rangeSwitch(), `<div class="small"><strong>CHF ${fmt2(inRange)}</strong> <span class="muted">${(S.statRange || "year") === "year" ? "in " + yNow : "in all"}</span></div>${timeBars(perSpent, "CHF spent", "added", sc, n => "CHF " + fmt2(n))}${note("By purchase date. Tap a bar to see what you bought then.")}`);
      // average price per entry, per purchase year
      const py = {}; sel.forEach(c => { const y = boughtOn(c).slice(0, 4), p = paidOf(c); if (y && p != null) { const x = py[y] = py[y] || { t: 0, n: 0 }; x.t += p; x.n += c.copies || 1; } });
      const pys = Object.keys(py).sort(), pmax = niceMax(Math.max(1, ...pys.map(y => py[y].t / py[y].n))), pstep = labStep(pys.length);
      const avgCard = pys.length ? card("Average price per " + (scope === "b" ? "book" : scope === "c" ? "comic" : "entry"), "CHF, by year bought", `${ychart(pmax, `<div class="cols short">${pys.map((y, i) => { const a = py[y].t / py[y].n; return `<button class="col" data-pick="added|${y}|${sc}" title="${y}: CHF ${fmt2(a)} (${py[y].n})"><span class="bar" style="height:${(a / pmax * 100).toFixed(1)}%"></span><span class="x">${(pys.length - 1 - i) % pstep ? "" : "'" + y.slice(2)}</span></button>`; }).join("")}</div>`)}
        ${note(`Last year with prices: CHF ${fmt2(py[pys[pys.length - 1]].t / py[pys[pys.length - 1]].n)} each${pys.length > 1 ? `, first: CHF ${fmt2(py[pys[0]].t / py[pys[0]].n)} (${pys[0]})` : ""}.`)}`) : "";
      // lots against single purchases
      const lotC = sel.filter(c => c.lotId && paidOf(c) != null), single = sel.filter(c => !c.lotId && paidOf(c) != null);
      const avgOf = xs => { const n = xs.reduce((a, c) => a + (c.copies || 1), 0); return n ? xs.reduce((a, c) => a + paidOf(c), 0) / n : null; };
      const lots = lotC.length ? card("Lots and single buys", "CHF per item", `<div class="row" style="gap:24px"><div><div class="v2">${fmt2(avgOf(lotC))}</div><div class="k small muted">in lots · ${nf(lotC.length)} from ${nf(new Set(lotC.map(c => c.lotId)).size)} lots</div></div>${single.length ? `<div><div class="v2">${fmt2(avgOf(single))}</div><div class="k small muted">bought singly · ${nf(single.length)}</div></div>` : ""}</div>`) : "";
      // bought from
      const srcT = {}; let noSrc = 0;
      sel.forEach(c => { const v = String(c.source || "").trim(); if (!v) { noSrc++; return; } const k = v.toLowerCase(), t = srcT[k] = srcT[k] || { name: v, n: 0, chf: 0 }; t.n++; t.chf += paidOf(c) || 0; });
      const bySpent = S.statSrcBy === "chf", srcRows0 = Object.values(srcT).sort((a, b) => bySpent ? b.chf - a.chf || b.n - a.n : b.n - a.n || b.chf - a.chf);
      const srcRows = ordered("src", srcRows0), srcMax = Math.max(1, ...srcRows.map(x => bySpent ? x.chf : x.n));
      const source = srcRows.length ? card("Bought from " + sortBtn("src"), `<span class="seg" role="group"><button type="button" data-srcby="" aria-pressed="${!bySpent}">Most entries</button><button type="button" data-srcby="chf" aria-pressed="${bySpent}">Most spent</button></span>`,
        `<div class="hbars">${(S.statAllSrc ? srcRows : srcRows.slice(0, 10)).map(x => `<button class="hbar" data-pick="${esc("src|" + x.name + "|" + sc)}" title="${esc(x.name)}: ${x.n} · CHF ${fmt2(x.chf)}"><span class="lab">${esc(x.name)}</span><span class="track"><span class="fill" style="width:${((bySpent ? x.chf : x.n) / srcMax * 100).toFixed(1)}%"></span></span><span class="n">${bySpent ? fmt2(x.chf) + `<small>${nf(x.n)}</small>` : nf(x.n) + `<small>CHF ${fmt2(x.chf)}</small>`}</span></button>`).join("")}</div>
        ${srcRows.length > 10 ? `<button class="ghost" id="stAllSrc" type="button">${S.statAllSrc ? "Show fewer" : "Show all " + srcRows.length}</button>` : ""}
        ${noSrc ? note(`<button type="button" class="link" data-pick="miss|source|${sc}">${nf(noSrc)} without “Bought from”</button>.`) : ""}`) : "";
      // wishlist budget
      const lvl = l => selW.filter(c => wishLevel(c) === l), cost = xs => wishCost(xs), fits = selW.filter(c => (wishBudget(c) || {}).ok).length;
      const wrow = (l, xs) => { const k = cost(xs); return xs.length ? `<tr><td>${l}</td><td>${nf(xs.length)}</td><td>${k.n ? fmt2(k.t) : "–"}</td><td class="muted">${k.n < xs.length ? (k.n ? k.n + " priced" : "no prices") : ""}</td></tr>` : ""; };
      const budget = selW.length ? card("Wishlist budget", "CHF, by your price tables", `<div class="tablewrap"><table class="moneytab"><thead><tr><th></th><th>Items</th><th>Cost</th><th></th></tr></thead><tbody>${wrow("★ Must have", lvl("must"))}${wrow("Want", lvl(""))}${wrow("Dream", lvl("dream"))}</tbody></table></div>
        ${note(`${fits ? nf(fits) + " cost no more than your maximum price. " : ""}<button type="button" class="link" id="goWish">Open the wishlist</button>`)}`) : "";
      return head + sw + spent + `<div class="two">${avgCard}${lots}</div><div class="two">${source}${budget}</div>` + settings;
    }

    // ================= Stories =================
    if (tab === "stories") {
      if (scope === "b") return head + `<div class="empty"><h3>Stories are counted for comics</h3><p>Switch to Comics or Both above.</p></div>`;
      if (!idxGet().length) return head + `<div class="empty"><h3>No stories yet</h3><p>Stories come with "Fill from INDUCKS" on a comic.</p></div>`;
      // the year of first publication; without one, the year of your oldest copy with the story (shown lighter: a reprint can be later)
      const copyYear = c => +c.issueYear || yearOf(c.date) || +((/^(\d{4})/.exec(c.issueLabel || "") || [])[1]) || 0;
      const decS = {}, decC = {}; let noFirst = 0, byCopy = 0;
      idxGet().forEach(e => { let y = storyYearOf(e.first), m = decS; if (!(y > 1900)) { const ys = e.items.map(copyYear).filter(v => v > 1900); y = ys.length ? Math.min(...ys) : 0; m = decC; if (y) byCopy++; }
        if (y > 1900) { const d = Math.floor(y / 10) * 10; m[d] = (m[d] || 0) + 1; } else noFirst++; });
      const tot = d => (decS[d] || 0) + (decC[d] || 0), dk = [...new Set(Object.keys(decS).concat(Object.keys(decC)))].map(Number), ds = dk.length ? Array.from({ length: (Math.max(...dk) - Math.min(...dk)) / 10 + 1 }, (_, i) => Math.min(...dk) + i * 10) : [], dm = niceMax(Math.max(1, ...ds.map(tot))), sstep = ds.length <= 8 ? 1 : Math.ceil(ds.length / 8);
      const made = ds.length ? card("When the stories were made", "first published", `${ychart(dm, `<div class="cols">${ds.map((d, i) => `<div class="col" title="${d}s: ${tot(d)}${decC[d] ? " (" + decC[d] + " by your oldest copy)" : ""}"><span class="bar" style="height:${(tot(d) / dm * 100).toFixed(1)}%;${decC[d] ? `background:linear-gradient(to bottom, color-mix(in srgb, var(--accent) 35%, transparent) ${(decC[d] / tot(d) * 100).toFixed(1)}%, var(--accent) ${(decC[d] / tot(d) * 100).toFixed(1)}%)` : ""}"></span><span class="x">${i % sstep ? "" : "'" + String(d).slice(2)}</span></div>`).join("")}</div>`)}${note(`Per decade of the story's first publication anywhere${byCopy ? " · lighter: " + nf(byCopy) + " without a known date, placed by your oldest copy (a reprint can be later)" : ""}${noFirst ? " · " + nf(noFirst) + " without a date (Duckipedia details add it)" : ""}.`)}`) : "";
      const tally = role => { const m = {}; idxGet().forEach(e => e[role].forEach(n => m[n] = (m[n] || 0) + 1)); return ordered("who-" + role, Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de", { numeric: true }))).slice(0, 10); };
      const who = (role, title) => { const top = tally(role), max = Math.max(1, ...top.map(x => x[1])); return card(title + " " + sortBtn("who-" + role), "stories", top.length ? '<div class="hbars">' + top.map(([n, c], i) => `<button class="hbar" data-who="${esc(n)}" data-role="${role}" title="${esc(n)}: ${c} stories"><span class="lab"><span class="rank">${i + 1}</span>${esc(n)}</span><span class="track"><span class="fill" style="width:${(c / max * 100).toFixed(1)}%"></span></span><span class="n">${c}</span></button>`).join("") + '</div>' : note("Not known yet for your stories.")); };
      const pairs = {}; idxGet().forEach(e => [...e.writers].forEach(w => [...e.artists].forEach(a => { if (w !== a) { const k = w + " & " + a; pairs[k] = (pairs[k] || 0) + 1; } })));
      const pl = ordered("pairs", Object.entries(pairs).sort((a, b) => b[1] - a[1])).slice(0, 8), pmax = Math.max(1, ...pl.map(x => x[1]));
      const pairCard = pl.length ? card("Writer and artist pairs " + sortBtn("pairs"), "stories", `<div class="hbars">${pl.map(([k, n]) => `<div class="hbar" title="${esc(k)}: ${n}"><span class="lab">${esc(k)}</span><span class="track"><span class="fill" style="width:${(n / pmax * 100).toFixed(1)}%"></span></span><span class="n">${n}</span></div>`).join("")}</div>`) : "";
      const appear = idxGet().reduce((a, e) => a + e.items.length, 0), rep = idxGet().filter(e => e.items.length > 1).sort((a, b) => b.items.length - a.items.length);
      const repO = ordered("rep", rep);
      const repCard = card("Reprints " + (rep.length > 1 ? sortBtn("rep") : ""), "", `<div class="row" style="gap:24px"><div><div class="v2">${pct(idxGet().length, appear)} %</div><div class="k small muted">unique: ${nf(idxGet().length)} stories in ${nf(appear)} appearances</div></div><div><div class="v2">${nf(rep.length)}</div><div class="k small muted">stories you have more than once</div></div></div>
        ${rep.length ? openList(repO.slice(0, 8).map(e => `<li><button type="button" class="link" data-stq="${esc(storyTitle(e))}">${esc(storyTitle(e) || "Untitled")}</button><span class="muted"> ×${e.items.length}</span></li>`)) : ""}`);
      const idx = idxGet(), hb = (rows, max, fmt) => `<div class="hbars">${rows.map(([l, n, t]) => `<div class="hbar" title="${esc(t || l + ": " + n)}"><span class="lab">${esc(l)}</span><span class="track"><span class="fill" style="width:${(n / Math.max(1, max) * 100).toFixed(1)}%"></span></span><span class="n">${fmt ? fmt(n) : nf(n)}</span></div>`).join("")}</div>`;
      // stories read: a story counts once it's in a comic you marked read (or read without owning it)
      const readS = idx.filter(e => e.items.some(c => c.read && isMine(c))).length, onlyN = idx.filter(e => e.items.every(c => notOwned(c))).length;
      const readCard = card("Stories read", "", `<div class="row" style="gap:24px"><div><div class="v2">${nf(readS)}</div><div class="k small muted">of ${nf(idx.length)} stories · ${pct(readS, idx.length)} %</div></div><div><div class="v2">${nf(idx.length - readS)}</div><div class="k small muted">still to read</div></div>${onlyN ? `<div><div class="v2">${nf(onlyN)}</div><div class="k small muted">only in things you read without owning</div></div>` : ""}</div><div class="meter"><span style="width:${pct(readS, idx.length)}%"></span></div>`);
      // your story ratings, by stars
      const rc = {}; let rN = 0, rT = 0; idx.forEach(e => { const r = +storyRate(e).rating; if (r > 0) { rc[r] = (rc[r] || 0) + 1; rN++; rT += r; } });
      const steps = ordered("stars", [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].filter(r => rc[r]));
      const rateCard = card("Your story ratings " + (steps.length > 1 ? sortBtn("stars") : ""), rN ? nf(rN) + " rated" : "", rN ? hb(steps.map(r => [ratingTxt(r), rc[r]]), Math.max(...steps.map(r => rc[r]))) + note(`Average ★ ${(rT / rN).toFixed(1).replace(".", ",")} · ${nf(Object.values(S.storyRatings).filter(x => x.fav).length)} ♥ favourites.`) : note("Open a story under Stories and tap the stars."));
      // who the stories were made for: the publisher behind the INDUCKS story code's prefix, with its country
      const ORIGIN = [[/^I\b/, "Italian publishers (Mondadori, Disney Italia, Panini) · Italy"], [/^(D|DD)\b/, "Egmont · Denmark"], [/^H\b/, "Sanoma (Donald Duck weekly) · Netherlands"], [/^F\b/, "French publishers (Le Journal de Mickey, Picsou) · France"], [/^B\b/, "Abril · Brazil"], [/^S\b/, "Swedish publishers · Sweden"], [/^(YD|ZD|YM|ZM|YP|ZP|ZT|YT|AR)\b/, "Disney studio & newspaper strips · USA"], [/^(W|US|CB|FC|KJ|QW)\b/, "US comic book publishers (Western, Gladstone …) · USA"]];
      const orig = {}; let noCode = 0; idx.forEach(e => { if (!e.code) { noCode++; return; } const pre = (/^[A-Za-z]+/.exec(e.code) || [""])[0], o = (ORIGIN.find(([re]) => re.test(e.code)) || [0, "Other (" + pre + ")"])[1]; orig[o] = (orig[o] || 0) + 1; });
      const orows = ordered("orig", Object.entries(orig).sort((a, b) => b[1] - a[1])).slice(0, 8);
      const originCard = orows.length ? card("Who the stories were made for " + sortBtn("orig"), "by story code", hb(orows, Math.max(...orows.map(x => x[1]))) + note(`The publisher a story was first made for, from the first letters of its INDUCKS story code (I = Italian publishers, D = Egmont, W = Western …). The artists can come from anywhere: many Egmont stories are drawn in Spain or Chile.${noCode ? " " + nf(noCode) + " without a code." : ""}`)) : "";
      // longest stories (page counts come from INDUCKS with Refresh all comics)
      const withPg = idx.filter(e => e.pages > 0), longest = ordered("long", withPg.slice().sort((a, b) => b.pages - a.pages)).slice(0, 8), pgSum = withPg.reduce((a, e) => a + e.pages, 0);
      const longCard = card((isAsc("long") ? "Shortest stories " : "Longest stories ") + (withPg.length > 1 ? sortBtn("long") : ""), withPg.length ? "pages" : "", withPg.length ? openList(longest.map(e => `<li><button type="button" class="link" data-stq="${esc(storyTitle(e))}">${esc(storyTitle(e) || "Untitled")}</button><span class="muted"> · ${nf(e.pages)} pages</span></li>`)) + note(`${nf(withPg.length)} stories with a page count: ${nf(Math.round(pgSum))} pages, ${(pgSum / withPg.length).toFixed(1).replace(".", ",")} on average.${withPg.length < idx.length ? " The others get one with Series › Tools › Refresh all comics." : ""}`) : note("Page counts come with Series › Tools › Refresh all comics."));
      // writers and artists by your story ratings (at least 2 rated stories)
      const best = role => { const m = {}; idx.forEach(e => { const r = +storyRate(e).rating; if (r > 0) e[role].forEach(n => { const x = m[n] = m[n] || { t: 0, n: 0 }; x.t += r; x.n++; }); }); return Object.entries(m).filter(([, x]) => x.n >= 2).map(([n, x]) => [n, x.t / x.n, x.n]).sort((a, b) => b[1] - a[1] || b[2] - a[2]); };
      const bW = ordered("best", best("writers")).slice(0, 8), bA = ordered("best", best("artists")).slice(0, 8), bl = xs => openList(xs.map(([n, a, k]) => `<li><button type="button" class="link" data-goperson="${xs === bW ? "writers" : "artists"}" data-n="${esc(n)}">${esc(n)}</button> <span class="muted">★ ${a.toFixed(1).replace(".", ",")} · ${k} stories</span></li>`));
      const bestCard = bW.length || bA.length ? card("Best rated creators " + sortBtn("best"), "your story ratings, at least 2", `${bW.length ? `<div class="small"><strong>Writers</strong>${bl(bW)}</div>` : ""}${bA.length ? `<div class="small"><strong>Artists</strong>${bl(bA)}</div>` : ""}`) : "";
      return head + `<div class="two">${readCard}${rateCard}</div><div class="two">${made}${who("chars", "Top characters")}</div><div class="two">${who("writers", "Top writers")}${who("artists", "Top artists")}</div><div class="two">${pairCard}${repCard}</div><div class="two">${originCard}${longCard}</div>${bestCard}` + note("Each story counts once, even if you have it in several comics or languages. Stories from things you read without owning them count too. Tap a name to see the stories.");
    }

    // ================= Reading =================
    const unread = sel.filter(c => !c.read && !c.facsimile), yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    const readYear = sel.filter(c => c.read && /^\d{4}-\d{2}/.test(c.readDate || "") && c.readDate >= yearAgo).length;
    // how long the pile takes: by pages when most unread entries have a page count (a thick novel isn't a 32-page comic), else by items
    const recent = sel.concat(selN).filter(c => c.read && /^\d{4}-\d{2}/.test(c.readDate || "") && c.readDate >= yearAgo);
    const pgPace = recent.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0) / 12, pgLeft = unread.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0);
    const byPages = pgPace > 0 && unread.length && unread.filter(c => parseInt(c.pages, 10) > 0).length / unread.length >= 0.7;
    const pace = byPages ? pgPace : readYear / 12, left = byPages ? pgLeft : unread.length;
    const pile = card("Unread pile", "", `<div class="row" style="gap:24px"><div><div class="v2">${nf(unread.length)}</div><div class="k small muted">unread ${word}</div></div><div><div class="v2">${pace ? (left / pace >= 24 ? nf(Math.round(left / pace / 12)) + " years" : nf(Math.round(left / pace)) + " months") : "–"}</div><div class="k small muted">to read them all at your pace${byPages ? " (by pages)" : ""}</div></div><div><div class="v2">${pace >= 10 ? nf(Math.round(pace)) : pace.toFixed(1)}</div><div class="k small muted">${byPages ? "pages" : "read"} per month (last 12 months)</div></div>${(() => { const pg = unread.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0), noPg = unread.filter(c => !parseInt(c.pages, 10)).length; return pg ? `<div><div class="v2">${nf(pg)}</div><div class="k small muted">pages still to read${noPg ? ` (${nf(noPg)} without a page count)` : ""}</div></div>` : ""; })()}</div>`);
    // average rating per series and per artist
    const rs = {}; sel.filter(c => +c.rating > 0).forEach(c => { const k = isNovel(c) ? (c.seriesName ? "book:" + c.seriesName : "") : seriesKeyOf(c); if (!k) return; const x = rs[k] = rs[k] || { t: 0, n: 0 }; x.t += +c.rating; x.n++; });
    const ra = {}; if (scope !== "b") idxGet().forEach(e => { const r = +storyRate(e).rating; if (r > 0) e.artists.forEach(a => { const x = ra[a] = ra[a] || { t: 0, n: 0 }; x.t += r; x.n++; }); });
    const avgRows = (o, label, all) => ordered("avg", Object.entries(o).filter(([, x]) => x.n >= 2).map(([k, x]) => [label(k), x.t / x.n, x.n]).sort((a, b) => b[1] - a[1])).slice(0, all ? 1e9 : 6);
    const rS = avgRows(rs, seriesTitle, S.statAllAvg), rA = avgRows(ra, k => k, S.statAllAvg), nAvg = Object.values(rs).filter(x => x.n >= 2).length + Object.values(ra).filter(x => x.n >= 2).length;
    const avgCard = rS.length || rA.length ? card("Average ratings " + sortBtn("avg"), "with at least 2 rated", `${rS.length ? `<div class="small"><strong>Series</strong>${openList(rS.map(([n, a, k]) => `<li>${esc(n)} <span class="muted">★ ${a.toFixed(1).replace(".", ",")} · ${k} rated</span></li>`))}</div>` : ""}${rA.length ? `<div class="small"><strong>Artists (story ratings)</strong>${openList(rA.map(([n, a, k]) => `<li>${esc(n)} <span class="muted">★ ${a.toFixed(1).replace(".", ",")} · ${k} stories</span></li>`))}</div>` : ""}${nAvg > rS.length + rA.length || S.statAllAvg ? `<button class="ghost" id="stAllAvg" type="button">${S.statAllAvg ? "Show fewer" : "Show all " + nAvg}</button>` : ""}`) : "";
    return head + readingCard(sel, word, selN) + `<div class="two">${pile}${avgCard}</div>` + ratedCard(sel.concat(selN), scope === "b" ? "books" : "comics");
  },
  bind() {
    document.querySelectorAll("[data-sttab]").forEach(b => b.onclick = () => { S.statTab = b.dataset.sttab; render(); window.scrollTo(0, 0); });
    document.querySelectorAll("[data-sscope]").forEach(b => b.onclick = () => { S.statScope = b.dataset.sscope; renderKeep(); });
    document.querySelectorAll("[data-money]").forEach(b => b.onclick = () => { S.statMoney = b.dataset.money; renderKeep(); });
    document.querySelectorAll("[data-compl]").forEach(b => b.onclick = () => { S.statCompl = b.dataset.compl; renderKeep(); });
    document.querySelectorAll("[data-fg]").forEach(b => b.onclick = () => { S.statFG = b.dataset.fg; renderKeep(); });
    document.querySelectorAll(".highlight[data-gap]").forEach(b => b.onclick = () => { S.gapSeries = b.dataset.gap; S.gapTab = "gaps"; nav("gaps"); });
    document.querySelectorAll("[data-stq]").forEach(b => b.onclick = () => { S.st = Object.assign(S.st || {}, { tab: "all", who: null, q: b.dataset.stq, shown: 100, status: "owned" }); nav("stories"); });
    $("#goFill") && ($("#goFill").onclick = () => { S.serTab = "tools"; S.serEditObj = null; S.serEditBook = null; nav("series"); setTimeout(() => { const r = $("#rfbox"); r && r.scrollIntoView({ block: "start" }); }, 100); });
    $("#goBackup") && ($("#goBackup").onclick = () => nav("backup"));
    $("#goTrade") && ($("#goTrade").onclick = () => { S.filters.q = ""; S.filters.status = "trade"; S.colTab = "comics"; S.col = {}; nav("collection"); });
    $("#goWish") && ($("#goWish").onclick = () => { S.gapTab = "wishlist"; nav("gaps"); });
    document.querySelectorAll("[data-srcby]").forEach(b => b.onclick = () => { S.statSrcBy = b.dataset.srcby; renderKeep(); });
    $("#stAllSrc") && ($("#stAllSrc").onclick = () => { S.statAllSrc = !S.statAllSrc; renderKeep(); });
    $("#stAllAvg") && ($("#stAllAvg").onclick = () => { S.statAllAvg = !S.statAllAvg; renderKeep(); });
    document.querySelectorAll(".hbar[data-who]").forEach(b => b.onclick = () => { S.st = Object.assign(S.st || { q: "", status: "owned", sort: "title", shown: 100 }, { tab: "all", q: "", shown: 100, status: "owned", who: { role: b.dataset.role, name: b.dataset.who } }); nav("stories"); });
    document.querySelectorAll(".hbar[data-g]").forEach(b => b.onclick = () => { S.filters.q = ""; S.filters.status = "owned"; S.shown = 200; S.col = b.dataset.p === BOOK_PUB ? { p: BOOK_PUB, g: BOOK_GROUP } : { p: b.dataset.p, g: b.dataset.g }; nav("collection"); window.scrollTo(0, 0); });
    document.querySelectorAll(".hbar[data-gap]").forEach(b => b.onclick = () => { S.gapSeries = b.dataset.gap; S.gapTab = "gaps"; nav("gaps"); });
    refreshRates();
    document.querySelectorAll("[data-rate]").forEach(inp => inp.onchange = async () => { let v = parseFloat(String(inp.value).replace(",", ".")); if (!(v > 0)) return;
      const k = inp.dataset.rate, usual = (S.rates && !S.rates.manual && S.rates[k]) || RATE_DEFAULT[k];
      if (usual && (v > usual * 3 || v < usual / 3)) {
        const inv = 1 / v, fits = inv > usual / 1.5 && inv < usual * 1.5;
        if (!confirm(`CHF per ${k} is usually about ${usual.toFixed(4)}. You typed ${v}.` + (fits ? ` That looks like ${k} per CHF: use ${inv.toFixed(4)} instead?` : " Keep it anyway?"))) { if (!fits) { inp.value = rateOf(k); return; } }
        else if (fits) v = +inv.toFixed(5);
      } S.rates = Object.assign({}, S.rates, { [inp.dataset.rate]: v, manual: true, date: S.rates && S.rates.date || todayIso() }); await setConfig("rates", S.rates); renderKeep(); });
    $("#rateauto") && ($("#rateauto").onclick = async () => { S.rates = Object.assign({}, S.rates, { manual: false }); S.ratesTried = false; await refreshRates(true); toast(S.rates && !S.rates.manual && S.rates.date ? "ECB rates of " + niceDate(S.rates.date) : "Rates couldn't be fetched"); renderKeep(); });
    document.querySelectorAll("[data-gf2]").forEach(inp => inp.onchange = async () => { const v = parseFloat(String(inp.value).replace(",", ".")); S.gradeFactors = Object.assign({}, S.gradeFactors); if (isNaN(v)) delete S.gradeFactors[inp.dataset.gf2]; else S.gradeFactors[inp.dataset.gf2] = v; await setConfig("gradeFactors", S.gradeFactors); renderKeep(); });
    document.querySelectorAll("#app [data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
    $("#stAllSeries") && ($("#stAllSeries").onclick = () => { S.statAllSeries = !S.statAllSeries; render(); });
    document.querySelectorAll("[data-range]").forEach(b => b.onclick = () => { S.statRange = b.dataset.range; renderKeep(); });
    document.querySelectorAll("[data-readnow]").forEach(b => b.onclick = async () => { const c = S.comics.find(x => x.id === b.dataset.readnow); if (!c) return; try { await saveComic(Object.assign({}, c, { read: true, readDate: todayIso() })); toast("✓ " + (isNovel(c) ? c.title : comicTag(c)) + " marked read"); renderKeep(); } catch (e) { toast(errText(e)); } });
    document.querySelectorAll(".folder[data-gap]").forEach(b => b.onclick = () => { S.gapSeries = b.dataset.gap; S.gapTab = "gaps"; nav("gaps"); });
    document.querySelectorAll("[data-scol]").forEach(b => b.onclick = () => { S.filters.q = ""; S.filters.status = "owned"; S.colSort = "series"; S.col = JSON.parse(b.dataset.scol); S.shown = 200; nav("collection"); });
    document.querySelectorAll("[data-novals]").forEach(b => b.onclick = () => { S.statNoVal = !S.statNoVal; renderKeep(); });
    document.querySelectorAll("[data-priceser]").forEach(b => b.onclick = () => {
      const k = b.dataset.priceser;
      // single books (comic books without a series) have no price ranges: open their list in Collection, where each gets its own value
      if (k === "book:") { S.colTab = "comics"; S.col = { p: BOOK_PUB, g: BOOK_GROUP, s: "book:" }; S.filters.q = ""; nav("collection"); return; }
      if (k.startsWith("book:")) { S.serTab = "books"; S.serEditBook = k.slice(5); S.serEditObj = null; }
      else { const se = seriesById(k); if (!se) return; S.serTab = "comics"; S.serEditBook = null; S.serEditObj = se; S.serPath = { u: se.publisher || "No universe yet", g: se.group || OTHER_GROUP }; S.sect = Object.assign({}, S.sect, { [se.id + "|prices"]: true }); }
      nav("series");
      setTimeout(() => { const d = document.querySelector('[data-sect$="|prices"]'); if (d) { d.open = true; d.scrollIntoView({ block: "start" }); } }, 80);
    });
    document.querySelectorAll("[data-bgap]").forEach(b => b.onclick = () => { S.gapSeries = "book:" + b.dataset.bgap; S.gapTab = "gaps"; nav("gaps"); });
    document.querySelectorAll("[data-sortdir]").forEach(b => b.onclick = e => { e.stopPropagation(); S.statAsc = Object.assign({}, S.statAsc, { [b.dataset.sortdir]: !isAsc(b.dataset.sortdir) }); renderKeep(); });
    $("#stDups") && ($("#stDups").onclick = () => { S.statDups = !S.statDups; renderKeep(); });
    $("#stAllGroups") && ($("#stAllGroups").onclick = () => { S.statAllGroups = !S.statAllGroups; render(); });
    const show = b => { b.parentNode.querySelectorAll(".col.on").forEach(x => x.classList.remove("on")); b.classList.add("on"); $("#decread").textContent = b.dataset.dec + "s: " + Number(b.dataset.n).toLocaleString("de-CH") + (b.dataset.n === "1" ? " comic" : " comics"); };
    document.querySelectorAll(".col[data-dec]").forEach(b => { b.onclick = () => show(b); b.onmouseenter = () => show(b); });
    bindPicks(document.getElementById("app"));
  }
};
// ---- Value over time: one point per month (the month's latest value), kept on this phone in "valueHistory" ----
function historyCard(m) {
  const ym = todayIso().slice(0, 7), h = S.valueHistory || {};
  if (m.valued) { const cur = { v: Math.round(m.value), p: Math.round(m.paid), n: m.n };
    if (!h[ym] || h[ym].v !== cur.v || h[ym].p !== cur.p || h[ym].n !== cur.n) { S.valueHistory = Object.assign({}, h, { [ym]: cur }); setConfig("valueHistory", S.valueHistory).catch(() => {}); } }
  const ks = Object.keys(S.valueHistory || {}).sort(); if (!ks.length) return "";
  const pts = ks.map(k => S.valueHistory[k]), W = 360, H = 150, L = 46, B = 22, max = Math.max(1, ...pts.map(p => Math.max(p.v, p.p || 0))) * 1.1;
  const x = i => ks.length === 1 ? L + (W - L) / 2 : L + i * (W - L - 8) / (ks.length - 1), y = v => H - B - v / max * (H - B - 8);
  const line = key => pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p[key] || 0).toFixed(1)).join(" ");
  const ticks = [0, max / 2 / 1.1, max / 1.1].map(v => `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v).toLocaleString("de-CH")}</text><line x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`).join("");
  const lab = k => { const [yy, mm] = k.split("-"); return mm + "/" + yy.slice(2); }, step = Math.ceil(ks.length / 6);
  const xl = ks.map((k, i) => (i % step || ks.length - 1 - i < step * 0.75) && i !== ks.length - 1 ? "" : `<text x="${x(i)}" y="${H - 6}" text-anchor="${ks.length > 1 && i === ks.length - 1 ? "end" : "middle"}">${lab(k)}</text>`).join("");
  const dots = key => pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[key] || 0)}" r="3" class="${key}"><title>${lab(ks[i])}: CHF ${(p[key] || 0).toLocaleString("de-CH")}</title></circle>`).join("");
  const first = pts[0], last = pts[pts.length - 1], d = last.v - first.v;
  return `<div class="card stack"><div class="cardhead"><h3>Value over time</h3><span class="muted small">CHF, per month</span></div>
    <svg class="vhist" viewBox="0 0 ${W} ${H}" role="img" aria-label="Value per month">${ticks}${xl}<path d="${line("p")}" class="p"/><path d="${line("v")}" class="v"/>${dots("p")}${dots("v")}</svg>
    <div class="row small" style="gap:14px"><span><span class="key v"></span> Value</span><span><span class="key p"></span> Paid</span>${ks.length > 1 ? `<span class="muted">Since ${lab(ks[0])}: ${d >= 0 ? "+" : "−"}CHF ${Math.abs(d).toLocaleString("de-CH")}</span>` : ""}</div>
    <p class="small muted" style="margin:0">${ks.length === 1 ? "The chart starts this month. Each month you open Stats, that month's value is kept, so the line grows by itself." : "Each month's last value when you opened Stats. It changes when you add comics, prices or price tables."}</p></div>`;
}
// ---- Reading: what was marked as read, by month (dates are kept since 31.10.2026) ----
// ---- Favourites and ratings ----
function ratedCard(list, word) {
  const rated = ordered("rated", list.filter(c => +c.rating > 0).sort((a, b) => b.rating - a.rating || String(b.readDate || "").localeCompare(String(a.readDate || ""))));
  const favs = list.filter(c => c.fav).length;
  let stories = [];
  if (word === "comics") {
    const idx = storyIndex("owned");
    stories = ordered("rated", idx.filter(e => +storyRate(e).rating > 0).sort((a, b) => storyRate(b).rating - storyRate(a).rating)).slice(0, 5);
  }
  const sFav = word === "comics" ? Object.values(S.storyRatings).filter(x => x.fav).length : 0;
  if (!rated.length && !favs && !stories.length && !sFav) return "";
  const name = c => c.kind === "book" ? c.title : comicTag(c) + (c.title ? ": " + c.title : "");
  const avg = rated.length ? (rated.reduce((a, c) => a + +c.rating, 0) / rated.length).toFixed(1).replace(".", ",") : "–";
  return `<div class="card stack"><h3>Favourites and ratings ${rated.length > 1 || stories.length > 1 ? sortBtn("rated") : ""}</h3>
    <div class="row" style="gap:24px"><div><div class="v2">${favs}</div><div class="k small muted">favourite ${word}</div></div><div><div class="v2">${rated.length}</div><div class="k small muted">rated · average ★ ${avg}</div></div>${word === "comics" ? `<div><div class="v2">${sFav}</div><div class="k small muted">favourite stories</div></div>` : ""}</div>
    ${rated.length ? `<div class="small"><strong>${isAsc("rated") ? "Lowest" : "Top"} rated ${word}</strong><ol style="margin:4px 0 0;padding-left:20px">${rated.slice(0, 5).map(c => `<li><button class="link" data-open="${esc(c.id)}">${esc(name(c))}</button> <span class="muted">${ratingTxt(c.rating)}${c.fav ? " ♥" : ""}</span></li>`).join("")}</ol></div>` : ""}
    ${stories.length ? `<div class="small"><strong>${isAsc("rated") ? "Lowest" : "Top"} rated stories</strong><ol style="margin:4px 0 0;padding-left:20px">${stories.map(e => `<li>${esc((e.titles[0] || e.code || "").replace(/^\((.*)\)$/, "$1"))} <span class="muted">${ratingTxt(storyRate(e).rating)}${storyRate(e).fav ? " ♥" : ""}</span></li>`).join("")}</ol></div>` : ""}
  </div>`;
}
function readingCard(list, word, extra) {
  extra = extra || [];   // read but not owned: in the reading totals and charts, kept apart in the counts; not in the progress or Up next
  if (!list.length && !extra.length) return "";
  const nf = n => Number(n).toLocaleString("de-CH");
  const readOwn = list.filter(c => c.read), read = readOwn.concat(extra), dated = read.filter(c => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(c.readDate || "")), undated = read.length - dated.length;
  const scope = word === "books" ? "b" : word === "entries" ? "a" : "c", all = (S.statRange || "year") === "all", now = new Date(), year = String(now.getFullYear());
  const per = {}, perPages = {}; dated.forEach(c => { const k = c.readDate.slice(0, 7); per[k] = (per[k] || 0) + 1; perPages[k] = (perPages[k] || 0) + (parseInt(c.pages, 10) || 0); });
  // All time: everything you've read, with or without a read date; This year: what has a read date this year
  const inRange = all ? read : dated.filter(c => c.readDate.startsWith(year)), pages = inRange.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0);
  // months in the period, for an average: All time counts from January 2016 (your wish, 2026-11-20)
  const months = all ? (now.getFullYear() - 2016) * 12 + now.getMonth() + 1 : now.getMonth() + 1;
  // read dates with only a year can't go into a month bar: they count in the totals and in the yearly bars
  const yearOnly = all ? 0 : inRange.filter(c => c.readDate.length === 4).length;
  const avg = inRange.length / Math.max(1, months);
  const w = n => n === 1 ? word.replace(/ies$/, "y").replace(/s$/, "") : word, pct = list.length ? Math.round(readOwn.length / list.length * 100) : 0;
  const inRangeN = inRange.filter(c => notOwned(c)).length;
  const tag = c => c.kind === "book" && isNovel(c) ? (c.title || "Untitled") : comicTag(c);
  const thumb = c => { const cv = coverOf(c); return `<span class="rthumb">${cv ? `<img src="${esc(cv)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`; };
  const last = dated.slice().sort((a, b) => b.readDate.localeCompare(a.readDate)).slice(0, 4);
  // up next: in each series you've been reading, the lowest unread copy after what you read; then unread copies bought most recently
  const num = c => (c.issueSort != null ? +c.issueSort : parseFloat(c.issue)) || 0;
  const key = c => isNovel(c) ? (c.seriesName ? "b:" + c.seriesName : "") : c.seriesId;
  const lastRead = {}; read.forEach(c => { const k = key(c); if (!k) return; const d = c.readDate || "0"; if (!lastRead[k] || d > lastRead[k].d) lastRead[k] = { d, n: num(c) }; });
  const unread = list.filter(c => !c.read && isOwn(c) && !c.facsimile);
  const cont = Object.keys(lastRead).sort((a, b) => lastRead[b].d.localeCompare(lastRead[a].d)).map(k => unread.filter(c => key(c) === k && num(c) > lastRead[k].n).sort((a, b) => num(a) - num(b))[0]).filter(Boolean);
  const fresh = unread.filter(c => !cont.includes(c)).sort((a, b) => String(b.purchaseDate || b.createdAt || "").localeCompare(String(a.purchaseDate || a.createdAt || "")));
  const next = cont.concat(fresh).slice(0, 4);
  return `<div class="card stack reading"><div class="cardhead"><h3>Reading</h3>${rangeSwitch()}</div>
    <div><div class="row between small"><span><strong>${nf(readOwn.length)}</strong> of your ${nf(list.length)} ${w(list.length)} read</span><span class="muted">${pct} %</span></div><div class="meter"><span style="width:${pct}%"></span></div></div>
    <div class="row rstats">
      <div><div class="v2">${nf(inRange.length)}</div><div class="k small muted">read ${all ? "in all" : "in " + year}${extra.length ? ` · ${nf(inRange.length - inRangeN)} owned, ${nf(inRangeN)} not owned` : ""}</div></div>
      <div><div class="v2">${avg >= 10 ? Math.round(avg) : avg.toFixed(avg > 0 && avg < 0.95 ? 2 : 1)}</div><div class="k small muted">per month${all ? " since 2016" : ""}</div></div>
      ${pages ? `<div><div class="v2">${nf(pages)}</div><div class="k small muted">pages</div></div>` : ""}
    </div>
    ${dated.length ? timeBars(per, word + " read", "read", scope) : ""}
    ${pages ? `<div class="small muted">Pages read</div>${timeBars(perPages, "pages read", "", scope)}` : ""}
    ${last.length ? `<div class="small muted">Recently read</div><div class="rlist">${last.map(c => `<button class="ritem" data-open="${esc(c.id)}">${thumb(c)}<span class="rt">${esc(tag(c))}</span><span class="rd muted">${esc(niceDate(c.readDate))}</span></button>`).join("")}</div>` : ""}
    ${next.length ? `<div class="small muted">Up next</div><div class="rlist">${next.map(c => `<div class="ritem">${thumb(c)}<button class="link rt" data-open="${esc(c.id)}">${esc(tag(c))}</button><button type="button" class="ghost tiny" data-readnow="${esc(c.id)}" aria-label="Mark ${esc(tag(c))} read today">✓ Read</button></div>`).join("")}</div>` : ""}
    ${extra.length ? `<p class="small muted" style="margin:0"><button type="button" class="link" data-pick="notowned||${scope}">${nf(extra.length)} read without owning ${extra.length === 1 ? "it" : "them"}</button> (library, e-books …) count in the totals, charts and pages above, not in the progress bar.</p>` : ""}
    <p class="small muted" style="margin:0">${undated ? `<button type="button" class="link" data-pick="readnodate||${scope}">${nf(undated)} marked read without a date</button> count in the progress${all ? " and the All time totals" : ""} but not in the charts. ` : ""}${yearOnly ? `${nf(yearOnly)} read in ${year} without a month count in the total but not in the month bars. ` : ""}Tap a bar to see what you read then.</p></div>`;
}
// ---- Stats for normal books, kept apart from the comics ----
// condition of graded entries; scope "c" comics, "b" books
function conditionCard(list, scope) {
  const graded = list.filter(c => c.grade), word = scope === "b" ? "books" : "comics";
  if (!graded.length) return "";
  const gradeMap = {}; graded.forEach(c => { const g = String(c.grade).split("-")[0]; gradeMap[g] = (gradeMap[g] || 0) + 1; });
  const gradeNames = { 0: "Z0 as new", 1: "Z1 very good", 2: "Z2 good", 3: "Z3 worn", 4: "Z4 poor", 5: "Z5 very poor" };
  return `<div class="card stack"><div class="cardhead"><h3>Condition</h3><span class="muted small">${graded.length} of ${Number(list.length).toLocaleString("de-CH")} graded</span></div>
      <div class="seg-bar" role="img" aria-label="Condition of graded ${word}">${Object.keys(gradeNames).filter(g => gradeMap[g]).map(g => `<span class="g${g}" style="flex:${gradeMap[g]}" title="${gradeNames[g]}: ${gradeMap[g]}"></span>`).join("")}</div>
      <div class="legend2">${Object.keys(gradeNames).filter(g => gradeMap[g]).map(g => `<button type="button" class="legbtn" data-pick="grade|${g}|${scope}"><i class="g${g}"></i>${gradeNames[g]} <b>${gradeMap[g]}</b></button>`).join("")}</div>
      <p class="small muted" style="margin:0">Half grades (Z1-2) count with the better grade. Tap a grade to see those ${word}.</p></div>`;
}
function bookStats(own, wanted, parts) {
  const nf = n => Number(n).toLocaleString("de-CH"), pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const read = own.filter(c => c.read), pagesRead = read.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0);
  const pk = (list, type) => list.map(([n, k]) => [n, k, `${type}|${n}|b`]);
  const authors = pk(tallyOf(own, c => splitPeople(c.author), 10, "authors"), "author"), langs = pk(tallyOf(own, c => [c.lang || "Not set"], 8), "lang");
  const genres = pk(tallyOf(own, c => genresOf(c), 8), "genre"), formats = pk(tallyOf(own, c => [c.format || "Not set"], 8), "fmt");
  // decades of publication
  const dec = {}; own.forEach(c => { const y = yearOf(c.date); if (y > 1400) { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; } });
  const decs = Object.keys(dec).map(Number).sort((a, b) => a - b), dmax = niceMax(Math.max(1, ...Object.values(dec))), bstep = decs.length <= 6 ? 1 : Math.ceil(decs.length / 6);
  const decCard = decs.length ? `<div class="card stack"><div class="cardhead"><h3>When they came out</h3><span class="muted small">books per decade</span></div>
    ${ychart(dmax, `<div class="cols" role="img" aria-label="Books per decade">${decs.map((d, i) => `<button class="col" data-pick="dec|${d}|b" title="${d}s: ${dec[d]} books"><span class="bar book" style="height:${(dec[d] / dmax * 100).toFixed(1)}%"></span><span class="x">${i % bstep ? "" : decs[decs.length - 1] - decs[0] >= 100 ? d : "'" + String(d).slice(2)}</span></button>`).join("")}</div>`)}
    <p class="small muted" style="margin:0">${decs[0]}s to ${decs[decs.length - 1]}s. Tap a bar to see those books.</p></div>` : "";
  // book series: how many volumes you have of the volumes there are
  const sers = {}; own.forEach(c => { if (c.seriesName) (sers[c.seriesName] = sers[c.seriesName] || new Set()).add(String(c.issue || "")); });
  const serRows = Object.keys(sers).map(n => { const tot = +(S.bookSizes || {})[n] || 0, have = [...sers[n]].filter(v => /^\d+$/.test(v) && (!tot || +v <= tot)).length; return { n, have, tot }; }).filter(x => x.tot).sort((a, b) => (b.have / b.tot) - (a.have / a.tot) || a.n.localeCompare(b.n, "de"));
  const unsized = Object.keys(sers).length - serRows.length;
  const pubs = pk(tallyOf(own, c => [c.publisher || "Not set"], 8), "pub");
  const collectCard = `<div class="card stack"><div class="cardhead"><h3>What you collect</h3><span class="muted small">by publisher</span></div>${pickBars(pubs, "book")}</div>`;
  const close = serRows.filter(x => x.have < x.tot).sort((a, b) => (a.tot - a.have) - (b.tot - b.have) || b.have - a.have).slice(0, 6);
  const closeCard = close.length ? `<div class="card stack"><div class="cardhead"><h3>Closest to complete</h3><span class="muted small">fewest missing</span></div>
    <div class="list">${close.map(x => { const w = wanted.filter(c => c.seriesName === x.n).length;
      return `<button class="folder" data-bgap="${esc(x.n)}"><div style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${nf(x.have)} of ${nf(x.tot)} · ${w ? nf(w) + " on wishlist" : "none on wishlist yet"}</div></div><span class="count wanted-count">${nf(x.tot - x.have)}</span><span class="chev" aria-hidden="true">›</span></button>`; }).join("")}</div>
    <p class="small muted" style="margin:0">The number is how many volumes are missing. Tap a series for its gap grid.</p></div>` : "";
  const condCard = conditionCard(own, "b");
  const serCard = Object.keys(sers).length ? `<div class="card stack"><div class="cardhead"><h3>Book series</h3><span class="muted small">${Object.keys(sers).length} series</span></div>
    ${serRows.length ? `<div class="hbars">${serRows.map(x => `<button class="hbar" data-bgap="${esc(x.n)}" title="${esc(x.n)}: ${x.have} of ${x.tot}"><span class="lab">${esc(x.n)}</span><span class="track"><span class="fill book" style="width:${Math.max(1, Math.min(100, x.have / x.tot * 100)).toFixed(1)}%"></span></span><span class="n">${x.have}/${x.tot}</span></button>`).join("")}</div>` : ""}
    <p class="small muted" style="margin:0">Tap a series for its gap grid.${unsized ? ` ${unsized} ${unsized === 1 ? "series has" : "series have"} no number of volumes yet: set it in Gaps under “Volumes in this series”.` : ""}</p></div>` : "";
  if (parts) return { serCard, closeCard, collectCard, decCard, condCard, authorsCard: own.length ? `<div class="card stack"><div class="cardhead"><h3>Top authors ${sortBtn("authors")}</h3><span class="muted small">books</span></div>${authors.length ? pickBars(authors, "book") : '<p class="muted small" style="margin:0">Add authors to your books to see them here.</p>'}</div>` : "" };
  return `<h2 class="sectionhead">Books</h2>
    <div class="hero card">
      <div class="hero-main"><div class="v book">${nf(own.length)}</div><div class="k">${own.length === 1 ? "book" : "books"} you own</div><div class="small muted">novels, non-fiction and other books that aren't comics</div></div>
      <div class="hero-side">
        <div><div class="v2">${nf(wanted.length)}</div><div class="k">on wishlist</div></div>
        <div><div class="v2">${nf(Object.keys(sers).length)}</div><div class="k">series</div></div>
        <div><div class="v2">${nf(new Set(own.map(c => c.author).filter(Boolean)).size)}</div><div class="k">${new Set(own.map(c => c.author).filter(Boolean)).size === 1 ? "author" : "authors"}</div></div>
        <div><div class="v2">${pct(read.length, own.length)} %</div><div class="k">read · ${nf(own.length - read.length)} to go</div><div class="meter"><span style="width:${pct(read.length, own.length)}%"></span></div></div>
        <div><div class="v2">${nf(pagesRead)}</div><div class="k">pages read</div></div>
      </div>
    </div>
    ${readingCard(own, "books")}
    ${ratedCard(own, "books")}
    ${own.length ? `<div class="two">
      <div class="card stack"><div class="cardhead"><h3>Top authors ${sortBtn("authors")}</h3><span class="muted small">books</span></div>${authors.length ? pickBars(authors, "book") : '<p class="muted small" style="margin:0">Add authors to your books to see them here.</p>'}</div>
      <div class="card stack"><div class="cardhead"><h3>Languages</h3><span class="muted small">books</span></div>${pickBars(langs, "book")}
        ${genres.length ? `<div class="cardhead" style="margin-top:8px"><h3>Genres</h3><span class="muted small">books</span></div>${pickBars(genres, "book")}` : ""}</div>
    </div>
    <div class="two">${collectCard}${decCard}</div>
    <div class="two">${serCard}${closeCard}</div>
    <div class="two"><div class="card stack"><div class="cardhead"><h3>Formats</h3><span class="muted small">books</span></div>${pickBars(formats, "book")}</div>${condCard}</div>
    <p class="small muted">Tap any bar to see those books.</p>` : ""}`;
}
