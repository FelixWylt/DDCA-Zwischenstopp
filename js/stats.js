// Dagobert Ducks Archiv – Stats, reading, favourites, book stats.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- Stats ----
// ---- lists opened from Stats: "lang:German:c" = comics in German; scope c comics, b books, a everything ----
const genresOf = c => String(c.genre || "").split(/\s*[,;\/]\s*/).map(x => x.trim()).filter(Boolean);
function langOfEntry(c) { return c.lang || (c.kind !== "book" ? seriesLang(seriesById(c.seriesId) || {}) : "") || "Not set"; }
const yearOf = d => +(String(d || "").slice(0, 4)) || 0;
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
    readnodate: [c => c.read && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(c.readDate || ""), "read, without a read date"]
  }[type] || [() => false, "?"];
  return { test: c => c.status !== "wanted" && inScope(c) && T[0](c), label: T[1], scope };
}
function openPick(pick) { S.filters.q = ""; S.filters.status = "owned"; S.colSort = "series"; S.colTab = String(pick).endsWith("|b") ? "books" : "comics"; S.col = { pick }; S.shown = 200; nav("collection"); try { history.replaceState({ col: S.col }, "", "#collection"); } catch (e) {} }
function bindPicks(root) { (root || document).querySelectorAll("[data-pick]").forEach(b => b.onclick = e => { e.stopPropagation(); openPick(b.dataset.pick); }); }
// horizontal bars that open their list: [label, count, pick]
function pickBars(list, cls) {
  const max = Math.max(1, ...list.map(x => x[1]));
  return '<div class="hbars">' + list.map(([n, c, pick]) => `<button class="hbar" ${pick ? `data-pick="${esc(pick)}"` : ""} title="${esc(n)}: ${c}"><span class="lab">${esc(n)}</span><span class="track"><span class="fill ${cls || ""}" style="width:${(c / max * 100).toFixed(1)}%"></span></span><span class="n">${Number(c).toLocaleString("de-CH")}</span></button>`).join("") + "</div>";
}
const tallyOf = (list, f, n) => { const m = {}; list.forEach(c => f(c).forEach(x => { if (x) m[x] = (m[x] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de", { numeric: true })).slice(0, n || 99); };
// This year / All time, for the over-time cards
function rangeSwitch() { const r = S.statRange || "year"; return `<div class="seg small" role="group" aria-label="Period"><button type="button" data-range="year" aria-pressed="${r === "year"}">This year</button><button type="button" data-range="all" aria-pressed="${r === "all"}">All time</button></div>`; }
// bars over time: months of this year, or years
function timeBars(per, word, pickType, scope, unitFmt) {
  const now = new Date(), M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let keys;
  if ((S.statRange || "year") === "year") keys = Array.from({ length: 12 }, (_, i) => now.getFullYear() + "-" + String(i + 1).padStart(2, "0"));
  else { const ys = Object.keys(per).map(k => +k.slice(0, 4)).filter(Boolean); const lo = Math.min(now.getFullYear(), ...ys); keys = []; for (let y = Math.max(lo, now.getFullYear() - 29); y <= now.getFullYear(); y++) keys.push(String(y)); }
  const val = k => Object.keys(per).filter(x => x.startsWith(k)).reduce((a, x) => a + per[x], 0);
  const max = Math.max(1, ...keys.map(val)), f = unitFmt || (n => Number(n).toLocaleString("de-CH"));
  const lab = k => k.length === 7 ? M[+k.slice(5) - 1] : "'" + k.slice(2);
  return `<div class="cols short" role="img" aria-label="${esc(word)}">${keys.map(k => `<button class="col${val(k) ? "" : " zero"}" ${pickType && val(k) ? `data-pick="${esc(pickType + "|" + k + "|" + scope)}"` : ""} title="${esc((k.length === 7 ? M[+k.slice(5) - 1] + " " + k.slice(0, 4) : k) + ": " + f(val(k)))}"><span class="bar" style="height:${(val(k) / max * 100).toFixed(1)}%"></span><span class="x">${lab(k)}</span></button>`).join("")}</div>`;
}
VIEWS.stats = {
  html() {
    // comics and normal books are counted separately
    const own = owned().filter(c => !isNovel(c)), wanted = S.comics.filter(c => c.status === "wanted" && !isNovel(c));
    const novels = owned().filter(isNovel), novelsWanted = S.comics.filter(c => c.status === "wanted" && isNovel(c));
    if (!S.comics.length) return '<h2>Stats</h2><div class="empty"><h3>No stats yet</h3><p>Stats appear here once you\'ve added comics.</p></div>';
    const nf = n => Number(n).toLocaleString("de-CH");
    const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
    const books = own.filter(c => c.kind === "book").length, issues = own.length - books;
    const copies = own.reduce((a, c) => a + (c.copies || 1), 0);
    const read = own.filter(c => c.read).length;
    const idx = storyIndex("owned");
    const seriesOwned = new Set(own.filter(c => c.kind !== "book").map(c => c.seriesId)).size;

    // 1. what the collection is made of: universe › group, biggest first
    const groups = {};
    own.forEach(c => { const p = publisherOf(c), g = groupOf(c), k = p + "\u0001" + g; (groups[k] = groups[k] || { p, g, n: 0 }).n++; });
    const gl = Object.values(groups).sort((a, b) => b.n - a.n), gmax = gl.length ? gl[0].n : 1;
    const groupLabel = x => x.p === DISNEY ? x.g : x.p === BOOK_PUB ? BOOK_PUB : x.p + " · " + x.g;
    const gShown = S.statAllGroups ? gl : gl.slice(0, 8);
    const comp = `<div class="card stack"><div class="cardhead"><h3>What you collect</h3><span class="muted small">${gl.length} groups</span></div>
      <div class="hbars">${gShown.map(x => `<button class="hbar" data-p="${esc(x.p)}" data-g="${esc(x.g)}" title="${esc(groupLabel(x))}: ${x.n} comics"><span class="lab">${esc(groupLabel(x))}</span><span class="track"><span class="fill" style="width:${(x.n / gmax * 100).toFixed(1)}%"></span></span><span class="n">${nf(x.n)}</span></button>`).join("")}</div>
      ${gl.length > 8 ? `<button class="ghost" id="stAllGroups" type="button">${S.statAllGroups ? "Show fewer" : "Show all " + gl.length + " groups"}</button>` : ""}
      <p class="small muted" style="margin:0">Tap a group to open it in Collection.</p></div>`;

    // 2. when your comics came out, per decade
    const dec = {}; let undated = 0;
    own.forEach(c => { const y = +(String(c.date || "").slice(0, 4)) || c.issueYear; if (y > 1900) { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; } else undated++; });
    const dks = Object.keys(dec).map(Number).sort((a, b) => a - b);
    const decs = dks.length ? Array.from({ length: (dks[dks.length - 1] - dks[0]) / 10 + 1 }, (_, i) => dks[0] + i * 10) : [];
    const dmax = Math.max(1, ...Object.values(dec)), peak = decs.reduce((a, d) => (dec[d] || 0) > (dec[a] || 0) ? d : a, decs[0]);
    const years = decs.length ? `<div class="card stack"><div class="cardhead"><h3>When they came out</h3><span class="muted small" id="decread">${peak}s: ${nf(dec[peak] || 0)} comics</span></div>
      <div class="cols" role="img" aria-label="Comics per decade">${decs.map(d => `<button class="col${d === peak ? " on" : ""}" data-dec="${d}" data-n="${dec[d] || 0}"${dec[d] ? ` data-pick="dec|${d}|c"` : ""} title="${d}s: ${dec[d] || 0} comics"><span class="bar" style="height:${((dec[d] || 0) / dmax * 100).toFixed(1)}%"></span><span class="x">${String(d).slice(2)}</span></button>`).join("")}</div>
      <p class="small muted" style="margin:0">Per decade of publication${undated ? " · " + undated + " without a date" : ""}. Tap a bar to see those comics.</p></div>` : "";

    // 3. completion of series with a known size
    const perSeries = S.series.map(s => {
      const ce = catEntry(s), gridN = s.numbering === "year" ? yearGridTotal(s) : null, catN = gridN || (ce && +ce.issues) || 0;
      if (s.numbering === "year" && ce && gridN == null && !S.catCache[ce.file] && !(S.statCat || {})[ce.file]) { S.statCat = Object.assign({}, S.statCat, { [ce.file]: 1 }); catalogueFile(ce).then(() => { if (S.view === "stats") renderKeep(); }).catch(() => {}); }
      const mine = own.filter(c => c.seriesId === s.id && c.kind !== "book"), zero = zeroSquares(s, ce && S.catCache[ce.file], S.comics.filter(c => c.seriesId === s.id));
      const tot = s.numbering === "year" ? (catN || Math.max(0, ((+s.lastYear || 0) - (+s.firstYear || 0) + 1) * (+s.perYear || 0))) : Math.max(0, (+s.latest || 0) - Math.max(1, +s.first || 1) + 1) + (zero.has("run") ? 1 : 0);
      // count the squares the gap grid shows as owned, so both screens agree
      const inGrid = k => { const m = /^(\d{4})\/(\d{2,3})$/.exec(k); if (m && +m[2] === 0) return zero.has(m[1]); if (/^\d{4}X\d{2,3}$/.test(k)) return !!catN;   // extras (7½) have squares
        if (splitLabel(ce && S.catCache[ce.file], k)) return true;                  // 1967-02B has its own square if (/^0+$/.test(k)) return zero.has("run");
        return s.numbering === "year" ? !!m && +m[2] >= 1 && (catN ? true : +m[1] >= +s.firstYear && +m[1] <= +s.lastYear && +m[2] <= Math.max(+s.perYear || 0, 1)) : /^\d+$/.test(k) && +k >= Math.max(1, +s.first || 1) && +k <= +s.latest; };
      const n = new Set(mine.filter(c => !c.facsimile).flatMap(c => issueSquares(c.issueLabel || c.issue)).filter(inGrid)).size;
      return { s, n, tot };
    }).filter(x => x.tot && x.n).sort((a, b) => b.n - a.n);
    const sized = new Set(perSeries.map(x => x.s.id));
    const unsized = new Set(own.filter(c => c.kind !== "book" && !sized.has(c.seriesId)).map(c => c.seriesId)).size;
    const completion = perSeries.length ? `<div class="card stack"><div class="cardhead"><h3>How complete</h3><span class="muted small">${perSeries.length} series with a known size</span></div>
      <div class="hbars">${(S.statAllSeries ? perSeries : perSeries.slice(0, 8)).map(({ s, n, tot }) => `<button class="hbar" data-gap="${esc(s.id)}" title="${esc(s.name)}: ${n} of ${tot}"><span class="lab">${esc(seriesLabel(s))}</span><span class="track"><span class="fill owned" style="width:${Math.max(1, Math.min(100, n / tot * 100)).toFixed(1)}%"></span></span><span class="n">${pct(n, tot)} %<small>${nf(n)} / ${nf(tot)}</small></span></button>`).join("")}</div>
      ${perSeries.length > 8 ? `<button class="ghost" id="stAllSeries" type="button">${S.statAllSeries ? "Show fewer" : "Show all " + perSeries.length + " series"}</button>` : ""}
      <p class="small muted" style="margin:0">Biggest first. Tap a series for its gap grid.${unsized ? " " + unsized + " more series have no size yet; set the latest issue under Series to include them." : ""}</p></div>` : "";

    // 4. writers and artists, each story counted once
    const tally = role => { const m = {}; idx.forEach(e => e[role].forEach(n => m[n] = (m[n] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de", { numeric: true })).slice(0, 10); };
    const creatorCard = (role, title) => {
      const top = tally(role), max = top.length ? top[0][1] : 1;
      return `<div class="card stack"><div class="cardhead"><h3>${title}</h3><span class="muted small">stories</span></div>
        ${top.length ? '<div class="hbars">' + top.map(([n, c], i) => `<button class="hbar" data-who="${esc(n)}" data-role="${role}" title="${esc(n)}: ${c} stories"><span class="lab"><span class="rank">${i + 1}</span>${esc(n)}</span><span class="track"><span class="fill" style="width:${(c / max * 100).toFixed(1)}%"></span></span><span class="n">${c}</span></button>`).join("") + '</div>'
          : '<p class="muted small" style="margin:0">Add stories with ' + role + ' to your comics to see who you collect most.</p>'}</div>`;
    };

    // 5. condition and money, only when there's data
    const condition = conditionCard(own, "c");
    // Money: comics and books, each and together, in CHF; amounts per currency below
    const moneyOf = list => { const r = { paid: 0, value: 0, paidValued: 0, priced: 0, valued: 0, n: list.length, sums: {}, vals: {} };
      list.forEach(c => { const n = c.copies || 1, cur = c.currency || "CHF", v = valueOf(c);
        if (typeof c.pricePaid === "number") { r.priced++; r.paid += toCHF(c.pricePaid * n, cur); r.sums[cur] = (r.sums[cur] || 0) + c.pricePaid * n; if (v) r.paidValued += toCHF(c.pricePaid * n, cur); }
        if (v) { r.valued++; r.value += toCHF(v.amount * n, v.cur); r.vals[v.cur] = (r.vals[v.cur] || 0) + v.amount * n; } });
      return r; };
    const mC = moneyOf(own), mB = moneyOf(novels), mAll = moneyOf(own.concat(novels));
    const mRow = (label, m, strong) => { const d = m.value - m.paidValued, w = x => strong ? `<strong>${x}</strong>` : x;
      return `<tr><td>${w(label)}</td><td>${w(fmt2(m.value))}</td><td>${w(fmt2(m.paid))}</td><td>${m.paidValued ? w((d >= 0 ? "+" : "−") + fmt2(Math.abs(d))) : "–"}</td></tr>`; };
    const curRows = Object.keys(Object.assign({}, mAll.sums, mAll.vals)).sort();
    const money = mAll.priced || mAll.valued ? `<div class="card stack"><div class="cardhead"><h3>Whole collection</h3><span class="muted small">comics and books, in CHF</span></div>
      <div class="row" style="gap:24px;flex-wrap:wrap"><div><div class="v2">CHF ${fmt2(mAll.value)}</div><div class="k small muted">value of ${nf(mAll.valued)} of ${nf(mAll.n)}</div></div><div><div class="v2">CHF ${fmt2(mAll.paid)}</div><div class="k small muted">paid for ${nf(mAll.priced)} of ${nf(mAll.n)}</div></div></div>
      <div class="tablewrap"><table class="moneytab"><thead><tr><th></th><th>Value</th><th>Paid</th><th>Gain</th></tr></thead><tbody>${mRow("Comics", mC)}${mRow("Books", mB)}${mRow("Together", mAll, true)}</tbody></table></div>
      <p class="small muted" style="margin:0">Comics include comic books. Gain is value minus price paid, for entries that have both.</p>
      ${curRows.length > 1 || (curRows[0] && curRows[0] !== "CHF") ? `<details class="small"><summary>Per currency</summary><p class="muted" style="margin:4px 0">Each row: the entries whose value or price is in that currency, in that currency (not a conversion). ≈ CHF converts them.</p><div class="tablewrap"><table class="moneytab"><thead><tr><th>In</th><th>Value</th><th>≈ CHF</th><th>Paid</th><th>≈ CHF</th></tr></thead><tbody>${curRows.map(k => { const cv = x => x == null ? "–" : k === "CHF" ? "–" : fmt2(toCHF(x, k)); return `<tr><td>${k}</td><td>${mAll.vals[k] != null ? fmt2(mAll.vals[k]) : "–"}</td><td>${cv(mAll.vals[k])}</td><td>${mAll.sums[k] != null ? fmt2(mAll.sums[k]) : "–"}</td><td>${cv(mAll.sums[k])}</td></tr>`; }).join("")}</tbody></table></div></details>` : ""}</div>` : "";

    // ---- Overview: everything together ----
    const all = owned(), wantAll = S.comics.filter(c => c.status === "wanted");
    const now = new Date(), ymNow = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"), yNow = String(now.getFullYear());
    const valAll = valueChf(all), readAll = all.filter(c => c.read).length;
    const spentIn = (list, prefix) => list.filter(c => typeof c.pricePaid === "number" && boughtOn(c).startsWith(prefix)).reduce((a, c) => a + toCHF(c.pricePaid * (c.copies || 1), c.currency), 0);
    const enteredM = all.filter(c => enteredOn(c).startsWith(ymNow)).length;
    const addedM = all.filter(c => boughtOn(c).startsWith(ymNow)).length, readM = all.filter(c => String(c.readDate || "").startsWith(ymNow)).length, spentM = spentIn(all, ymNow);
    const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const ovHero = `<div class="hero card">
        <div class="hero-main"><div class="v">${nf(all.length)}</div><div class="k">entries you own</div>
          <div class="small muted">${nf(own.length)} comics · ${nf(novels.length)} ${novels.length === 1 ? "book" : "books"}</div></div>
        <div class="hero-side">
          <div><div class="v2">${valAll != null ? "≈ " + Math.round(valAll).toLocaleString("de-CH") : "–"}</div><div class="k">CHF value</div></div>
          <div><div class="v2">${nf(wantAll.length)}</div><div class="k">on wishlist</div></div>
          <div><div class="v2">${nf(idx.length)}</div><div class="k">stories</div></div>
          <div><div class="v2">${pct(readAll, all.length)} %</div><div class="k">read · ${nf(all.length - readAll)} to go</div><div class="meter"><span style="width:${pct(readAll, all.length)}%"></span></div></div>
          <div><div class="v2">${nf(all.filter(c => c.read).reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0))}</div><div class="k">pages read</div></div>
        </div></div>`;
    const ovMonth = `<div class="card stack"><div class="cardhead"><h3>This month</h3><span class="muted small">${M[now.getMonth()]} ${yNow}</span></div>
      <div class="row monthrow">
        <button type="button" class="stat3"${addedM ? ` data-pick="added|${ymNow}|a"` : ""}><span class="v2">${nf(addedM)}</span><span class="k small muted">bought</span></button>
        <button type="button" class="stat3"${enteredM ? ` data-pick="entered|${ymNow}|a"` : ""}><span class="v2">${nf(enteredM)}</span><span class="k small muted">entered</span></button>
        <button type="button" class="stat3"${readM ? ` data-pick="read|${ymNow}|a"` : ""}><span class="v2">${nf(readM)}</span><span class="k small muted">read</span></button>
        <div class="stat3"><span class="v2">CHF ${fmt2(spentM)}</span><span class="k small muted">spent</span></div>
      </div></div>`;
    // collection over time: by purchase date only; entries without one are counted separately, not guessed
    const perAdded = {}, perSpent = {}; let noDate = 0;
    all.forEach(c => { const d = boughtOn(c).slice(0, 7); if (!d) { noDate++; return; } perAdded[d] = (perAdded[d] || 0) + 1; if (typeof c.pricePaid === "number") perSpent[d] = (perSpent[d] || 0) + toCHF(c.pricePaid * (c.copies || 1), c.currency); });
    const inRange = per => Object.keys(per).filter(k => (S.statRange || "year") === "all" || k.startsWith(yNow)).reduce((a, k) => a + per[k], 0);
    const yearOnly = (S.statRange || "year") === "year" ? (perAdded[yNow] || 0) : 0;
    const ovTime = `<div class="card stack"><div class="cardhead"><h3>Collection over time</h3>${rangeSwitch()}</div>
      <div class="small"><strong>${nf(inRange(perAdded))}</strong> <span class="muted">bought ${(S.statRange || "year") === "year" ? "in " + yNow : "in all"}${yearOnly ? " (" + yearOnly + " with only the year, not in a month)" : ""}</span></div>
      ${timeBars(perAdded, "entries bought", "added", "a")}
      <div class="small" style="margin-top:6px"><strong>CHF ${fmt2(inRange(perSpent))}</strong> <span class="muted">spent ${(S.statRange || "year") === "year" ? "in " + yNow : "in all"}</span></div>
      ${timeBars(perSpent, "CHF spent", "", "a", n => "CHF " + fmt2(n))}
      <p class="small muted" style="margin:0">By purchase date. ${noDate ? `<button type="button" class="link" data-pick="miss|date|a">${nf(noDate)} ${noDate === 1 ? "entry has" : "entries have"} none</button> and ${noDate === 1 ? "isn't" : "aren't"} shown. ` : ""}Tap a bar in the upper chart to see what was bought then.</p></div>`;
    // where you buy: entries and money per shop or seller (same name in other spelling of case counts together)
    const srcT = {}; let noSrc = 0;
    all.forEach(c => { const v = String(c.source || "").trim(); if (!v) { noSrc++; return; } const k = v.toLowerCase(), t = srcT[k] = srcT[k] || { name: v, n: 0, chf: 0 };
      t.n++; if (typeof c.pricePaid === "number") t.chf += toCHF(c.pricePaid * (c.copies || 1), c.currency); });
    const bySpent = S.statSrcBy === "chf", srcRows = Object.values(srcT).sort((a, b) => bySpent ? b.chf - a.chf || b.n - a.n : b.n - a.n || b.chf - a.chf);
    const srcShown = S.statAllSrc ? srcRows : srcRows.slice(0, 10), srcMax = Math.max(1, ...srcRows.map(x => bySpent ? x.chf : x.n));
    const ovSource = srcRows.length ? `<div class="card stack"><div class="cardhead"><h3>Bought from</h3><div class="seg" role="group" aria-label="Sort"><button type="button" data-srcby="" aria-pressed="${!bySpent}">Most entries</button><button type="button" data-srcby="chf" aria-pressed="${bySpent}">Most spent</button></div></div>
      <div class="hbars">${srcShown.map(x => `<button class="hbar" data-pick="${esc("src|" + x.name + "|a")}" title="${esc(x.name)}: ${x.n} · CHF ${fmt2(x.chf)}"><span class="lab">${esc(x.name)}</span><span class="track"><span class="fill" style="width:${((bySpent ? x.chf : x.n) / srcMax * 100).toFixed(1)}%"></span></span><span class="n">${bySpent ? fmt2(x.chf) + `<small>${nf(x.n)} ${x.n === 1 ? "entry" : "entries"}</small>` : nf(x.n) + `<small>CHF ${fmt2(x.chf)}</small>`}</span></button>`).join("")}</div>
      ${srcRows.length > 10 ? `<button class="ghost" id="stAllSrc" type="button">${S.statAllSrc ? "Show fewer" : "Show all " + srcRows.length}</button>` : ""}
      <p class="small muted" style="margin:0">Comics and books you own, money in CHF. Tap a line to see what you bought there.${noSrc ? ` <button type="button" class="link" data-pick="miss|source|a">${nf(noSrc)} ${noSrc === 1 ? "entry has" : "entries have"} no “Bought from”</button>.` : ""}</p></div>` : "";
    // what is still missing, so values and reading stats can be trusted
    const missRows = [["Condition", "grade", "c"], ["Price paid", "price", "a"], ["Purchase date", "date", "a"], ["Cover picture", "cover", "a"], ["Genre", "genre", "a"], ["Pages (books)", "pages", "b"]]
      .map(([l, k, sc]) => { const pk = `miss|${k}|${sc}`, n = all.filter(pickInfo(pk).test).length; return [l, n, pk]; }).filter(x => x[1]);
    const ovMissing = missRows.length ? `<div class="card stack"><div class="cardhead"><h3>Please complete</h3><span class="muted small">entries without …</span></div>
      ${pickBars(missRows, "warn")}<p class="small muted" style="margin:0">Tap a line to see those entries, then open each one and fill in what's missing. Comics bought in a lot don't need their own price.</p></div>` : "";

    // ---- Comics: closest to complete, genres and languages ----
    const wishIn = sid => S.comics.filter(c => c.status === "wanted" && c.seriesId === sid);
    const close = perSeries.map(x => Object.assign({ miss: x.tot - x.n }, x)).filter(x => x.miss > 0 && x.n / x.tot >= 0.25).sort((a, b) => a.miss - b.miss || b.n - a.n).slice(0, 8);
    const closeCard = close.length ? `<div class="card stack"><div class="cardhead"><h3>Closest to complete</h3><span class="muted small">fewest missing</span></div>
      <div class="list">${close.map(({ s, n, tot, miss }) => { const w = wishIn(s.id), fit = w.filter(c => (wishBudget(c) || {}).ok).length;
        return `<button class="folder" data-gap="${esc(s.id)}"><div style="min-width:0"><div class="t">${esc(seriesLabel(s))}</div><div class="s">${nf(n)} of ${nf(tot)} · ${w.length ? nf(w.length) + " on wishlist" + (fit ? ", " + fit + " within budget" : "") : "none on wishlist yet"}</div></div><span class="count wanted-count">${nf(miss)}</span><span class="chev" aria-hidden="true">›</span></button>`; }).join("")}</div>
      <p class="small muted" style="margin:0">The number is how many issues are missing. Tap a series for its gap grid.</p></div>` : "";
    const cGenres = tallyOf(own, c => genresOf(c).length ? genresOf(c) : storyGenres(c) ? storyGenres(c).split(", ") : [], 8).map(([n, k]) => [n, k, `genre|${n}|c`]);
    const cLangs = tallyOf(own, c => [langOfEntry(c)], 8).map(([n, k]) => [n, k, `lang|${n}|c`]);
    const glCard = `<div class="card stack"><div class="cardhead"><h3>Languages</h3><span class="muted small">comics</span></div>${pickBars(cLangs)}
      <div class="cardhead" style="margin-top:8px"><h3>Genres</h3><span class="muted small">comics</span></div>${cGenres.length ? pickBars(cGenres) : '<p class="muted small" style="margin:0">Comics get genres from their stories (Duckipedia), or type them in a comic\'s Genres field.</p>'}</div>`;

    // ---- Value: value per series ----
    const bySer = {}; all.forEach(c => { const k = isNovel(c) ? (c.seriesName ? "book:" + c.seriesName : "") : seriesKeyOf(c); if (k) (bySer[k] = bySer[k] || []).push(c); });
    const serVals = Object.keys(bySer).map(k => ({ k, v: valueChf(bySer[k]), list: bySer[k] })), noVal = serVals.filter(x => x.v == null).length;
    const topSer = serVals.filter(x => x.v != null).sort((a, b) => b.v - a.v).slice(0, 10), tmax = topSer.length ? topSer[0].v : 1;
    const serCard = topSer.length || noVal ? `<div class="card stack"><div class="cardhead"><h3>Value per series</h3><span class="muted small">CHF</span></div>
      ${topSer.length ? `<div class="hbars">${topSer.map(x => { const c0 = x.list[0], col = isNovel(c0) ? { p: NOVEL_PUB, g: BOOK_GROUP, s: x.k } : { p: publisherOf(c0), g: groupOf(c0), s: x.k }; return `<button class="hbar" data-scol='${esc(JSON.stringify(col))}' title="${esc(seriesTitle(x.k))}: CHF ${fmt2(x.v)}"><span class="lab">${esc(seriesTitle(x.k))}</span><span class="track"><span class="fill" style="width:${(x.v / tmax * 100).toFixed(1)}%"></span></span><span class="n">${Math.round(x.v).toLocaleString("de-CH")}</span></button>`; }).join("")}</div>` : ""}
      ${noVal ? `<div class="row small" style="gap:8px;align-items:center"><span class="muted">${noVal} ${noVal === 1 ? "series has" : "series have"} no value yet.</span><button type="button" class="link" id="goPrices">Add price tables in Series</button></div>` : ""}</div>` : "";

    const tab = S.statTab || "overview";
    const tabs = `<h2 style="margin:0">Stats</h2><div class="subtabs four" role="tablist" aria-label="Show"><button role="tab" type="button" data-sttab="overview" aria-selected="${tab === "overview"}">Overview</button><button role="tab" type="button" data-sttab="comics" aria-selected="${tab === "comics"}">Comics</button><button role="tab" type="button" data-sttab="books" aria-selected="${tab === "books"}">Books</button><button role="tab" type="button" data-sttab="value" aria-selected="${tab === "value"}">Value</button></div>`;
    if (tab === "books") return tabs + (novels.length || novelsWanted.length ? bookStats(novels, novelsWanted).replace('<h2 class="sectionhead">Books</h2>', "") : '<div class="empty"><h3>No books yet</h3><p>Books you add show up here.</p></div>');
    if (tab === "overview") return tabs + ovHero + ovMonth + ovTime + ovSource + ovMissing;
    if (tab === "value") return tabs + `${money}${historyCard(mAll)}${serCard}${valueCard(own, "Comics & comic books")}${valueCard(novels, "Books")}<div class="card stack"><h3>Settings for values</h3>${valueSettingsHtml()}</div>`;
    return tabs + `
      <div class="hero card">
        <div class="hero-main"><div class="v">${nf(own.length)}</div><div class="k">comics you own</div>
          <div class="small muted">${nf(issues)} issues · ${books} comic ${books === 1 ? "book" : "books"}${copies > own.length ? " · " + nf(copies) + " copies with duplicates" : ""}</div></div>
        <div class="hero-side">
          <div><div class="v2">${nf(wanted.length)}</div><div class="k">on wishlist</div></div>
          <div><div class="v2">${nf(seriesOwned)}</div><div class="k">series</div></div>
          <div><div class="v2">${nf(idx.length)}</div><div class="k">stories</div></div>
          <div><div class="v2">${pct(read, own.length)} %</div><div class="k">read · ${nf(own.length - read)} to go</div><div class="meter"><span style="width:${pct(read, own.length)}%"></span></div></div>
          <div><div class="v2">${nf(own.filter(c => c.read).reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0))}</div><div class="k">pages read</div></div>
        </div>
      </div>
      <div class="two">${comp}${years}</div>
      <div class="two">${completion}${closeCard}</div>
      <div class="two">${glCard}<div class="card stack"><div class="cardhead"><h3>Formats</h3><span class="muted small">comics</span></div>${pickBars(tallyOf(own, c => [c.format || "Not set"], 8).map(([n, k]) => [n, k, `fmt|${n}|c`]))}</div></div>
      <div class="two">${creatorCard("writers", "Top writers")}${creatorCard("artists", "Top artists")}</div>
      ${readingCard(own, "comics")}
      ${ratedCard(own, "comics")}
      ${condition ? `<div class="two">${condition}</div>` : ""}
      <p class="small muted">Writers and artists: each story counts once, even if you have it in several comics or languages. Tap a name to see the stories.</p>`;
  },
  bind() {
    document.querySelectorAll("[data-sttab]").forEach(b => b.onclick = () => { S.statTab = b.dataset.sttab; render(); window.scrollTo(0, 0); });
    document.querySelectorAll("[data-srcby]").forEach(b => b.onclick = () => { S.statSrcBy = b.dataset.srcby; renderKeep(); });
    $("#stAllSrc") && ($("#stAllSrc").onclick = () => { S.statAllSrc = !S.statAllSrc; renderKeep(); });
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
    $("#goPrices") && ($("#goPrices").onclick = () => nav("series"));
    document.querySelectorAll("[data-bgap]").forEach(b => b.onclick = () => { S.gapSeries = "book:" + b.dataset.bgap; S.gapTab = "gaps"; nav("gaps"); });
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
  const xl = ks.map((k, i) => i % step && i !== ks.length - 1 ? "" : `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${lab(k)}</text>`).join("");
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
  const rated = list.filter(c => +c.rating > 0).sort((a, b) => b.rating - a.rating || String(b.readDate || "").localeCompare(String(a.readDate || "")));
  const favs = list.filter(c => c.fav).length;
  let stories = [];
  if (word === "comics") {
    const idx = storyIndex("owned");
    stories = idx.filter(e => +storyRate(e).rating > 0).sort((a, b) => storyRate(b).rating - storyRate(a).rating).slice(0, 5);
  }
  const sFav = word === "comics" ? Object.values(S.storyRatings).filter(x => x.fav).length : 0;
  if (!rated.length && !favs && !stories.length && !sFav) return "";
  const name = c => c.kind === "book" ? c.title : comicTag(c) + (c.title ? ": " + c.title : "");
  const avg = rated.length ? (rated.reduce((a, c) => a + +c.rating, 0) / rated.length).toFixed(1).replace(".", ",") : "–";
  return `<div class="card stack"><h3>Favourites and ratings</h3>
    <div class="row" style="gap:24px"><div><div class="v2">${favs}</div><div class="k small muted">favourite ${word}</div></div><div><div class="v2">${rated.length}</div><div class="k small muted">rated · average ★ ${avg}</div></div>${word === "comics" ? `<div><div class="v2">${sFav}</div><div class="k small muted">favourite stories</div></div>` : ""}</div>
    ${rated.length ? `<div class="small"><strong>Top rated ${word}</strong><ol style="margin:4px 0 0;padding-left:20px">${rated.slice(0, 5).map(c => `<li><button class="link" data-open="${esc(c.id)}">${esc(name(c))}</button> <span class="muted">${ratingTxt(c.rating)}${c.fav ? " ♥" : ""}</span></li>`).join("")}</ol></div>` : ""}
    ${stories.length ? `<div class="small"><strong>Top rated stories</strong><ol style="margin:4px 0 0;padding-left:20px">${stories.map(e => `<li>${esc((e.titles[0] || e.code || "").replace(/^\((.*)\)$/, "$1"))} <span class="muted">${ratingTxt(storyRate(e).rating)}${storyRate(e).fav ? " ♥" : ""}</span></li>`).join("")}</ol></div>` : ""}
  </div>`;
}
function readingCard(list, word) {
  if (!list.length) return "";
  const nf = n => Number(n).toLocaleString("de-CH");
  const read = list.filter(c => c.read), dated = read.filter(c => /^\d{4}(-\d{2}(-\d{2})?)?$/.test(c.readDate || "")), undated = read.length - dated.length;
  const scope = word === "books" ? "b" : "c", all = (S.statRange || "year") === "all", now = new Date(), year = String(now.getFullYear());
  const per = {}, perPages = {}; dated.forEach(c => { const k = c.readDate.slice(0, 7); per[k] = (per[k] || 0) + 1; perPages[k] = (perPages[k] || 0) + (parseInt(c.pages, 10) || 0); });
  const inRange = dated.filter(c => all || c.readDate.startsWith(year)), pages = inRange.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0);
  // months in the period, for an average
  const first = dated.map(c => c.readDate).sort()[0] || "";
  const months = all ? (first ? (now.getFullYear() - +first.slice(0, 4)) * 12 + now.getMonth() - ((+first.slice(5, 7) || 1) - 1) + 1 : 1) : now.getMonth() + 1;
  // read dates with only a year can't go into a month bar: they count in the totals and in the yearly bars
  const yearOnly = all ? 0 : inRange.filter(c => c.readDate.length === 4).length;
  const avg = inRange.length / Math.max(1, months);
  const w = n => n === 1 ? word.replace(/s$/, "") : word, pct = list.length ? Math.round(read.length / list.length * 100) : 0;
  const tag = c => c.kind === "book" && isNovel(c) ? (c.title || "Untitled") : comicTag(c);
  const thumb = c => { const cv = coverOf(c); return `<span class="rthumb">${cv ? `<img src="${esc(cv)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`; };
  const last = dated.slice().sort((a, b) => b.readDate.localeCompare(a.readDate)).slice(0, 4);
  // up next: in each series you've been reading, the lowest unread copy after what you read; then unread copies bought most recently
  const num = c => (c.issueSort != null ? +c.issueSort : parseFloat(c.issue)) || 0;
  const key = c => isNovel(c) ? (c.seriesName ? "b:" + c.seriesName : "") : c.seriesId;
  const lastRead = {}; read.forEach(c => { const k = key(c); if (!k) return; const d = c.readDate || "0"; if (!lastRead[k] || d > lastRead[k].d) lastRead[k] = { d, n: num(c) }; });
  const unread = list.filter(c => !c.read && c.status !== "wanted" && !c.facsimile);
  const cont = Object.keys(lastRead).sort((a, b) => lastRead[b].d.localeCompare(lastRead[a].d)).map(k => unread.filter(c => key(c) === k && num(c) > lastRead[k].n).sort((a, b) => num(a) - num(b))[0]).filter(Boolean);
  const fresh = unread.filter(c => !cont.includes(c)).sort((a, b) => String(b.purchaseDate || b.createdAt || "").localeCompare(String(a.purchaseDate || a.createdAt || "")));
  const next = cont.concat(fresh).slice(0, 4);
  return `<div class="card stack reading"><div class="cardhead"><h3>Reading</h3>${rangeSwitch()}</div>
    <div><div class="row between small"><span><strong>${nf(read.length)}</strong> of ${nf(list.length)} ${w(list.length)} read</span><span class="muted">${pct} %</span></div><div class="meter"><span style="width:${pct}%"></span></div></div>
    <div class="row rstats">
      <div><div class="v2">${nf(inRange.length)}</div><div class="k small muted">read ${all ? "in all" : "in " + year}</div></div>
      <div><div class="v2">${avg >= 10 ? Math.round(avg) : avg.toFixed(1)}</div><div class="k small muted">per month</div></div>
      ${pages ? `<div><div class="v2">${nf(pages)}</div><div class="k small muted">pages</div></div>` : ""}
    </div>
    ${dated.length ? timeBars(per, word + " read", "read", scope) : ""}
    ${pages ? `<div class="small muted">Pages read</div>${timeBars(perPages, "pages read", "", scope)}` : ""}
    ${last.length ? `<div class="small muted">Recently read</div><div class="rlist">${last.map(c => `<button class="ritem" data-open="${esc(c.id)}">${thumb(c)}<span class="rt">${esc(tag(c))}</span><span class="rd muted">${esc(niceDate(c.readDate))}</span></button>`).join("")}</div>` : ""}
    ${next.length ? `<div class="small muted">Up next</div><div class="rlist">${next.map(c => `<div class="ritem">${thumb(c)}<button class="link rt" data-open="${esc(c.id)}">${esc(tag(c))}</button><button type="button" class="ghost tiny" data-readnow="${esc(c.id)}" aria-label="Mark ${esc(tag(c))} read today">✓ Read</button></div>`).join("")}</div>` : ""}
    <p class="small muted" style="margin:0">${undated ? `<button type="button" class="link" data-pick="readnodate||${scope}">${nf(undated)} marked read without a date</button> count in the progress but not in the charts. ` : ""}${yearOnly ? `${nf(yearOnly)} read in ${year} without a month count in the total but not in the month bars. ` : ""}Tap a bar to see what you read then.</p></div>`;
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
function bookStats(own, wanted) {
  const nf = n => Number(n).toLocaleString("de-CH"), pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const read = own.filter(c => c.read), pagesRead = read.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0);
  const pk = (list, type) => list.map(([n, k]) => [n, k, `${type}|${n}|b`]);
  const authors = pk(tallyOf(own, c => splitPeople(c.author), 10), "author"), langs = pk(tallyOf(own, c => [c.lang || "Not set"], 8), "lang");
  const genres = pk(tallyOf(own, c => genresOf(c), 8), "genre"), formats = pk(tallyOf(own, c => [c.format || "Not set"], 8), "fmt");
  // decades of publication
  const dec = {}; own.forEach(c => { const y = yearOf(c.date); if (y > 1400) { const d = Math.floor(y / 10) * 10; dec[d] = (dec[d] || 0) + 1; } });
  const decs = Object.keys(dec).map(Number).sort((a, b) => a - b), dmax = Math.max(1, ...Object.values(dec));
  const decCard = decs.length ? `<div class="card stack"><div class="cardhead"><h3>When they came out</h3><span class="muted small">books per decade</span></div>
    <div class="cols" role="img" aria-label="Books per decade">${decs.map(d => `<button class="col" data-pick="dec|${d}|b" title="${d}s: ${dec[d]} books"><span class="bar book" style="height:${(dec[d] / dmax * 100).toFixed(1)}%"></span><span class="x">${decs[decs.length - 1] - decs[0] >= 100 ? d : String(d).slice(2)}</span></button>`).join("")}</div>
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
      <div class="card stack"><div class="cardhead"><h3>Top authors</h3><span class="muted small">books</span></div>${authors.length ? pickBars(authors, "book") : '<p class="muted small" style="margin:0">Add authors to your books to see them here.</p>'}</div>
      <div class="card stack"><div class="cardhead"><h3>Languages</h3><span class="muted small">books</span></div>${pickBars(langs, "book")}
        ${genres.length ? `<div class="cardhead" style="margin-top:8px"><h3>Genres</h3><span class="muted small">books</span></div>${pickBars(genres, "book")}` : ""}</div>
    </div>
    <div class="two">${collectCard}${decCard}</div>
    <div class="two">${serCard}${closeCard}</div>
    <div class="two"><div class="card stack"><div class="cardhead"><h3>Formats</h3><span class="muted small">books</span></div>${pickBars(formats, "book")}</div>${condCard}</div>
    <p class="small muted">Tap any bar to see those books.</p>` : ""}`;
}
