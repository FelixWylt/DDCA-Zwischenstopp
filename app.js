
(function () {
"use strict";

// ---------- constants ----------
const DEFAULT_SERIES = [
  { id: "de-LTB",   name: "Lustiges Taschenbuch",  short: "LTB",   group: "Lustiges Taschenbuch", country: "DE", code: "de/LTB",   numbering: "running", latest: 612 },
  { id: "de-LTBSP", name: "LTB Spezial",           short: "LTB Sp", group: "Lustiges Taschenbuch", country: "DE", code: "de/LTBSP", numbering: "running", latest: 125 },
  { id: "de-MM",    name: "Micky Maus Magazin",    short: "MMM",   group: "Micky Maus", country: "DE", code: "de/MM",    numbering: "year", firstYear: 1951, lastYear: 2026, perYear: 52 },
  { id: "it-TL",    name: "Topolino",              short: "TL",    group: "Topolino", country: "IT", code: "it/TL",    numbering: "running", latest: 3700 },
  { id: "se-KA",    name: "Kalle Anka & C:o",      short: "KA",    group: "Kalle Anka", country: "SE", code: "se/KA",    numbering: "year", firstYear: 1948, lastYear: 2026, perYear: 52 },
  { id: "se-KAP",   name: "Kalle Ankas Pocket",    short: "KAP",   group: "Kalle Anka", country: "SE", code: "se/KAP",   numbering: "running", latest: 560 }
];
const OTHER_GROUP = "Other series", BOOK_GROUP = "Books";
const GROUP_RULES = [
  [/^(lustiges taschenbuch|ltb)\b/, "Lustiges Taschenbuch"], [/micky maus/, "Micky Maus"], [/^kalle anka/, "Kalle Anka"],
  [/topolino/, "Topolino"], [/donald duck|entenhausen/, "Donald Duck"], [/^walt disney/, "Walt Disney's"]
];
function guessGroup(name) { const n = String(name || "").toLowerCase(); const r = GROUP_RULES.find(([re]) => re.test(n)); return r ? r[1] : OTHER_GROUP; }
const GRADES = [
  ["0", "Z0 · as new"], ["0-1", "Z0-1"], ["1", "Z1 · very good"], ["1-2", "Z1-2"], ["2", "Z2 · good"],
  ["2-3", "Z2-3"], ["3", "Z3 · worn"], ["3-4", "Z3-4"], ["4", "Z4 · poor"], ["4-5", "Z4-5"], ["5", "Z5 · very poor"]
];
const CURRENCIES = ["CHF", "EUR", "SEK"];
// ---------- state ----------
const S = {
  db: null, dbState: "loading", series: DEFAULT_SERIES.slice(), seriesSaved: false,
  comics: [], view: "collection", filters: { q: "", status: "owned" }, shown: 200, col: {},
  editing: null, draft: null, gapSeries: DEFAULT_SERIES[0].id, catalogue: null, catCache: {},
  confirmDelete: false
};

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
function seriesById(id) { return S.series.find(s => s.id === id); }
function parseIssue(series, raw) {
  const s = String(raw || "").trim();
  if (series && series.numbering === "year") {
    let m = s.match(/(\d{4})\D+(\d{1,3})(?!\d)/);
    const r = !m && s.match(/^\D*(\d{1,3})\D+(\d{4})(?!\d)/);
    if (r) m = [r[0], r[2], r[1]];
    if (m) return { year: +m[1], n: +m[2], sort: +m[1] * 1000 + +m[2], label: m[1] + "/" + String(+m[2]).padStart(2, "0") };
  }
  const m = s.match(/\d+(\.\d+)?/);
  return { n: m ? +m[0] : null, sort: m ? +m[0] : 1e9, label: s };
}
function fmt2(n) { return Number(n).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function money(n, cur) { if (n == null || n === "" || isNaN(n)) return ""; return (cur ? cur + " " : "") + fmt2(n); }
function parseAmt(v) {
  if (v == null || v === "") return "";
  if (typeof v === "number") return isFinite(v) ? Math.round(v * 100) / 100 : "";
  let t = String(v).replace(/[^0-9.,\-]/g, "");
  if (t === "" || t === "-") return "";
  const lc = t.lastIndexOf(","), ld = t.lastIndexOf(".");
  if (lc >= 0 && ld >= 0) t = lc > ld ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");   // 1.234,50 or 1,234.50
  else if (lc >= 0 || ld >= 0) {
    const sep = lc >= 0 ? "," : ".", parts = t.split(sep);
    // a lone separator before exactly 3 digits (1.234 / 1,234) or repeated separators (1.234.567) mean thousands
    const thousands = parts.length > 2 || (parts[1].length === 3 && /[1-9]/.test(parts[0]));
    t = thousands ? parts.join("") : parts[0] + "." + parts[1];
  }
  const n = parseFloat(t);
  return isNaN(n) ? "" : Math.round(n * 100) / 100;
}
function amtVal(v) { const n = parseAmt(v); return n === "" ? (v == null ? "" : String(v)) : n.toFixed(2); }
function bindAmounts() { document.querySelectorAll("input.amt").forEach(el => el.addEventListener("blur", () => { const n = parseAmt(el.value); if (n !== "") el.value = n.toFixed(2); })); }
function errText(e) {
  const n = e && (e.name || e.code);
  if (n === "QuotaExceededError") return "Your phone has no room left for the archive. Free some space and try again.";
  return "Saving failed (" + (n || "error") + "). Try again.";
}
function inducksIssueUrl(series, issue) {
  if (!series || !series.code) return "";
  const p = parseIssue(series, issue);
  if (p.n == null) return "https://inducks.org/publication.php?c=" + encodeURIComponent(series.code);
  let code;
  if (series.numbering === "year" && p.year) code = series.code + p.year + "-" + String(p.n).padStart(2, "0");
  else code = series.code + " " + String(p.n).padStart(3, " ");
  return "https://inducks.org/issue.php?c=" + encodeURIComponent(code).replace(/%20/g, "+");
}

// ---------- data: everything lives in this device's IndexedDB ----------
const DB_NAME = "dagobert-archiv", DB_VER = 1;
function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("comics")) db.createObjectStore("comics", { keyPath: "id" });
      if (!db.objectStoreNames.contains("config")) db.createObjectStore("config", { keyPath: "key" });
    };
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); res(db); };
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error("blocked"));
  });
}
function tx(store, mode, fn) {
  return new Promise((res, rej) => {
    const t = S.db.transaction(store, mode), st = t.objectStore(store);
    let out; const req = fn(st);
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const getConfig = key => tx("config", "readonly", st => st.get(key)).then(r => r ? r.value : undefined);
const setConfig = (key, value) => tx("config", "readwrite", st => st.put({ key, value }));
function newId() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, ""); }

function slug(s) { return norm(s).replace(/ /g, "-").slice(0, 60) || "series"; }
function newSeriesFor(name, issues, group) {
  const used = new Set(S.series.map(s => s.id));
  let id = "x-" + slug(name), k = 2; while (used.has(id)) id = "x-" + slug(name) + "-" + k++;
  const years = (issues || []).map(c => c.issueYear || (/^(\d{4})\//.exec(c.issueLabel || "") || [])[1]).filter(Boolean).map(Number);
  const s = { id, name, short: "", group: group || guessGroup(name), code: "", country: "", numbering: years.length ? "year" : "running", latest: "" };
  if (years.length) { s.firstYear = Math.min(...years); s.lastYear = Math.max(...years); s.perYear = ""; }
  S.series.push(s);
  return s;
}
function findSeriesByName(name) { const n = norm(name); return S.series.find(s => norm(s.name) === n); }
async function adoptLooseSeries() {
  let changed = false;
  S.series.forEach(s => { if (s.group == null) { s.group = guessGroup(s.name); changed = true; } });
  const loose = S.comics.filter(c => c.seriesId === "_other" && c.kind !== "book");
  const byName = {};
  loose.forEach(c => { const n = String(c.seriesName || "Unknown series").trim(); (byName[n] = byName[n] || []).push(c); });
  const updated = [];
  Object.entries(byName).forEach(([name, list]) => {
    const se = findSeriesByName(name) || newSeriesFor(name, list, (list.find(c => c.seriesGroup) || {}).seriesGroup);
    list.forEach(c => updated.push(Object.assign({}, c, { seriesId: se.id, seriesName: se.name })));
  });
  if (updated.length) {
    await tx("comics", "readwrite", st => { updated.forEach(c => st.put(c)); });
    updated.forEach(remember); changed = true;
  }
  if (changed) await saveSeries();
}
async function boot() {
  if (!window.indexedDB) { S.dbState = "none"; render(); return; }
  try {
    S.db = await openDb();
    const list = await getConfig("series");
    if (Array.isArray(list)) { S.series = list.map(x => Object.assign({}, x)); S.seriesSaved = true; }
    S.lastBackup = await getConfig("lastBackup") || null;
    S.comics = await tx("comics", "readonly", st => st.getAll()) || [];
    await adoptLooseSeries();
    S.dbState = "ready";
  } catch (e) { S.dbState = "error"; S.dbError = e; }
  refreshStorageInfo();
  loadCatalogueIndex();
  render();
}
async function refreshStorageInfo() {
  try {
    if (navigator.storage && navigator.storage.persisted) S.persisted = await navigator.storage.persisted();
    if (navigator.storage && navigator.storage.estimate) S.usage = (await navigator.storage.estimate()).usage;
  } catch (e) {}
}
async function askPersist() {
  try { if (navigator.storage && navigator.storage.persist && !S.persisted) S.persisted = await navigator.storage.persist(); } catch (e) {}
}
function stamp(c, keepDates) {
  const body = Object.assign({}, c);
  body.id = body.id || newId(); delete body.k;
  if (!(keepDates && body.updatedAt)) body.updatedAt = new Date().toISOString();
  if (!body.createdAt) body.createdAt = body.updatedAt;
  return body;
}
function remember(saved) {
  const i = S.comics.findIndex(x => x.id === saved.id);
  if (i >= 0) S.comics[i] = saved; else S.comics.push(saved);
}
async function saveComic(c) {
  const body = stamp(c);
  await tx("comics", "readwrite", st => st.put(body));
  remember(body); askPersist();
  return body;
}
async function saveMany(list, onProgress, keepDates) {
  // writes in chunks of 200 per transaction: fast and safe for big imports
  let done = 0;
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200).filter(c => c && typeof c === "object").map(c => stamp(c, keepDates));
    await tx("comics", "readwrite", st => { chunk.forEach(b => st.put(b)); });
    chunk.forEach(remember); done += chunk.length;
    onProgress && onProgress(done);
    await sleep(0);
  }
  askPersist();
  return done;
}
async function deleteComic(id) {
  await tx("comics", "readwrite", st => st.delete(id));
  S.comics = S.comics.filter(x => x.id !== id);
}
async function saveSeries() {
  await setConfig("series", S.series);
  S.seriesSaved = true;
}
async function loadCatalogueIndex() {
  try { const r = await fetch("catalogue/index.json"); if (r.ok) { S.catalogue = await r.json(); render(); } } catch (e) { S.catalogue = null; }
}
async function catalogueLookup(series, issue) {
  if (!S.catalogue || !S.catalogue.series || !S.catalogue.series[series.id]) return null;
  if (!S.catCache[series.id]) {
    const r = await fetch("catalogue/" + S.catalogue.series[series.id].file);
    if (!r.ok) return null;
    S.catCache[series.id] = await r.json();
  }
  const p = parseIssue(series, issue);
  const data = S.catCache[series.id].issues || {};
  return data[p.label] || data[String(p.n)] || null;
}

// ---------- derived ----------
function owned() { return S.comics.filter(c => c.status !== "wanted"); }
function searchText(c) {
  const st = (c.stories || []).map(s => [s.title, s.code, s.writer, s.artist, s.hero].join(" ")).join(" ");
  const se = seriesById(c.seriesId);
  return norm([se ? se.name + " " + se.short : c.seriesName, c.issue, c.title, c.notes, c.location, c.source, c.author, c.publisher, c.isbn, String(c.isbn || "").replace(/\D/g, ""), c.kind === "book" ? "book" : "", st].join(" "));
}
function sortComics(list) {
  const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
  return list.slice().sort((a, b) => ((order[a.seriesId] ?? (a.kind === "book" ? 1000 : 999)) - (order[b.seriesId] ?? (b.kind === "book" ? 1000 : 999))) || String(a.seriesName || "").localeCompare(String(b.seriesName || "")) || (a.issueSort ?? 1e9) - (b.issueSort ?? 1e9) || String(a.title || "").localeCompare(String(b.title || "")));
}

// ---------- routing ----------
function setView(v) { S.view = v; S.confirmDelete = false; render(); window.scrollTo(0, 0); }
function nav(v) {
  // pushState changes the address without firing hashchange/popstate, so the view state is kept
  if (location.hash !== "#" + v) { try { history.pushState({ col: S.col }, "", "#" + v); } catch (e) { S.navLock = true; location.hash = v; } }
  setView(v);
}
document.getElementById("tabs").addEventListener("click", e => {
  const a = e.target.closest("a[data-v]"); if (!a) return;
  if (location.hash === "#" + a.dataset.v) { e.preventDefault(); if (a.dataset.v === "add") { S.editing = null; S.draft = null; } setView(a.dataset.v); }
});
window.addEventListener("hashchange", () => {
  if (S.navLock) { S.navLock = false; return; }
  const v = location.hash.slice(1);
  if (VIEWS[v]) { if (v === "add") { S.editing = null; S.draft = null; } setView(v); }
});

// ---------- render ----------
function render() {
  document.querySelectorAll("#tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.v === S.view ? "page" : "false"));
  const app = $("#app");
  let head = "";
  if (S.dbState === "none") head = '<div class="banner warn">This browser can\'t store data. Open the archive in Chrome on your phone.</div>';
  if (S.dbState === "ready" && S.comics.length && S.view === "collection" && daysSince(S.lastBackup) > 14) head = '<div class="banner warn row between"><span>' + (S.lastBackup ? "Your last backup is " + daysSince(S.lastBackup) + " days old." : "You haven\'t backed up your archive yet.") + '</span><a href="#backup">Make a backup</a></div>';
  if (S.dbState === "error") head = '<div class="banner warn">The archive could not open its data on this phone (' + esc(S.dbError && (S.dbError.name || S.dbError.message) || "error") + '). Close the app fully and open it again.</div>';
  if (S.dbState === "loading") { app.innerHTML = '<div class="empty"><h3>Opening your archive…</h3><p>Loading your comics from this phone.</p></div>'; return; }
  app.innerHTML = '<div class="stack">' + head + VIEWS[S.view].html() + '</div>';
  if (VIEWS[S.view].bind) VIEWS[S.view].bind();
}

const VIEWS = {};

// ---- Collection: groups > series > issues ----
function statusMatch(c) {
  const f = S.filters.status;
  if (f === "owned") return c.status !== "wanted";
  if (f === "wanted") return c.status === "wanted";
  if (f === "trade") return c.status !== "wanted" && (c.forTrade || (c.copies || 1) > 1);
  if (f === "unread") return c.status !== "wanted" && !c.read;
  return true;
}
function groupOf(c) {
  if (c.kind === "book") return BOOK_GROUP;
  const se = seriesById(c.seriesId);
  return se ? (se.group || OTHER_GROUP) : OTHER_GROUP;
}
function seriesKeyOf(c) { return c.kind === "book" ? "book:" + (c.seriesName || "") : (seriesById(c.seriesId) ? c.seriesId : "name:" + (c.seriesName || "")); }
function seriesTitle(key) {
  if (key.startsWith("book:")) return key.slice(5) || "Single books";
  if (key.startsWith("name:")) return key.slice(5) || "Unknown series";
  const se = seriesById(key); return se ? se.name : key;
}
function groupRank(name) { return name === BOOK_GROUP ? 2 : (name === OTHER_GROUP || name === "Other comics") ? 1 : 0; }
function groupCompare(a, b) { return groupRank(a) - groupRank(b) || String(a).localeCompare(String(b), "de"); }
function yearsText(list) {
  const ys = list.map(c => +(String(c.date || "").slice(0, 4)) || c.issueYear).filter(y => y > 1900);
  if (!ys.length) return "";
  const a = Math.min(...ys), b = Math.max(...ys); return a === b ? String(a) : a + "–" + b;
}
function countText(list) {
  const own = list.filter(c => c.status !== "wanted").length, want = list.length - own;
  const parts = [];
  if (own) parts.push(own + (own === 1 ? " comic" : " comics"));
  if (want) parts.push(want + " on wishlist");
  return parts.join(" · ") || "0 comics";
}
function niceDate(d) {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(d || ""));
  if (!m) return String(d || "");
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return m[3] ? +m[3] + " " + M[+m[2] - 1] + " " + m[1] : m[2] ? M[+m[2] - 1] + " " + m[1] : m[1];
}
function itemHtml(c, inSeries) {
  const se = seriesById(c.seriesId);
  const st = (c.stories || []);
  const creators = [...new Set(st.flatMap(s => [s.writer, s.artist]).filter(Boolean))].slice(0, 2).join(", ");
  const isBook = c.kind === "book";
  const sub = isBook ? [c.seriesName, c.author, c.publisher, c.date].filter(Boolean).join(" · ")
    : [c.date, creators].filter(Boolean).join(" · ");
  const chips = [];
  if (c.status === "wanted") chips.push('<span class="chip wanted">Wishlist</span>');
  else {
    if (c.grade) chips.push('<span class="chip">Z' + esc(c.grade) + '</span>');
    if (c.forTrade || (c.copies || 1) > 1) chips.push('<span class="chip trade">' + ((c.copies || 1) > 1 ? "×" + c.copies : "Trade") + '</span>');
    if (c.location) chips.push('<span class="chip">' + esc(c.location) + '</span>');
  }
  const numTxt = isBook ? c.issue : (c.issueLabel || c.issue || "");
  return `<button class="item" data-id="${esc(c.id)}">
    <div class="num${String(numTxt).length > 4 ? " long" : ""}">${isBook && !c.issue ? '<span style="font-size:.9rem">Book</span>' : esc(numTxt || "–")}<small>${isBook ? (c.issue ? "VOL." : "") + " BOOK" : esc(se ? (se.short || "") : (c.seriesName || ""))}</small></div>
    <div style="min-width:0"><div class="t">${esc(c.title || (inSeries && c.date ? niceDate(c.date) : (se ? se.name : c.seriesName)) || "Untitled")}</div><div class="s">${esc((inSeries && !c.title && !isBook ? creators : sub) || (inSeries ? "" : (se ? se.name : c.seriesName || "")))}</div></div>
    <div class="chips">${chips.join("")}</div></button>`;
}
function openCol(col) {
  S.col = col; S.shown = 200;
  try { history.pushState({ col }, "", "#collection"); } catch (e) {}
  render(); window.scrollTo(0, 0);
}
window.addEventListener("popstate", e => {
  if (S.view !== "collection" && location.hash !== "#collection") return;
  S.col = (e.state && e.state.col) || {};
  if (S.view === "collection") render();
});
VIEWS.collection = {
  html() {
    const f = S.filters;
    const head = `
      <div class="row between"><div><h2>Collection</h2><p class="lede hide-phone">Browse by group and series, or search everything at once.</p></div>
      <button class="primary" id="new">Add</button></div>
      <div class="filters two-col">
        <label class="q"><span class="l">Search</span><input id="fq" type="search" placeholder="e.g. Don Rosa, Scarpa, Phantomias, ISBN" value="${esc(f.q)}"></label>
        <label><span class="l">Show</span><select id="fst">
          <option value="owned"${f.status === "owned" ? " selected" : ""}>Owned</option>
          <option value="wanted"${f.status === "wanted" ? " selected" : ""}>Wishlist</option>
          <option value="trade"${f.status === "trade" ? " selected" : ""}>Duplicates for trade</option>
          <option value="unread"${f.status === "unread" ? " selected" : ""}>Unread</option>
          <option value="all"${f.status === "all" ? " selected" : ""}>Everything</option></select></label>
      </div>`;
    if (!S.comics.length) {
      return head + `<div class="empty"><h3>Your archive is empty</h3><p>Add your first comic or book, or load a backup under Backup.</p>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" id="new2">Add comic or book</button><button id="gobk">Go to Backup</button></div></div>`;
    }
    return head + '<div id="results"></div>';
  },
  bind() {
    const go = () => {
      S.editing = null; S.draft = null;
      const c = S.col || {};
      if (c.s && c.s.startsWith("book:")) S.draft = blankDraft({ kind: "book", seriesId: "_book", seriesName: c.s.slice(5) });
      else if (c.s && seriesById(c.s)) S.draft = blankDraft({ seriesId: c.s });
      nav("add");
    };
    $("#new") && ($("#new").onclick = go); $("#new2") && ($("#new2").onclick = go);
    $("#gobk") && ($("#gobk").onclick = () => { nav("backup"); });
    $("#fq").oninput = e => { S.filters.q = e.target.value; S.shown = 200; drawResults(); };
    $("#fst").onchange = e => { S.filters.status = e.target.value; S.shown = 200; drawResults(); };
    drawResults();
  }
};
function drawResults() {
  const box = $("#results"); if (!box) return;
  const q = norm(S.filters.q), col = S.col || {};
  const pool = S.comics.filter(statusMatch);
  const crumbs = parts => '<nav class="crumbs" aria-label="Where you are">' + parts.map((p, i) => i === parts.length - 1
    ? `<span aria-current="page">${esc(p.label)}</span>` : `<button class="crumb" data-col='${esc(JSON.stringify(p.col))}'>${esc(p.label)}</button><span class="sep" aria-hidden="true">›</span>`).join("") + '</nav>';
  const more = total => total > S.shown ? '<div class="row" style="justify-content:center;margin-top:12px"><button id="more">Show more (' + (total - S.shown) + ' left)</button></div>' : "";
  let html = "";
  if (q) {
    const list = sortComics(pool.filter(c => q.split(" ").every(w => searchText(c).includes(w))));
    html = `<p class="muted small" style="margin:0 0 8px">${list.length} ${list.length === 1 ? "match" : "matches"} in all series</p>` +
      (list.length ? '<div class="list">' + list.slice(0, S.shown).map(itemHtml).join("") + '</div>' : '<div class="empty"><h3>Nothing matches</h3><p>Try another search word or change Show.</p></div>') + more(list.length);
  } else if (!col.g) {
    const groups = {};
    pool.forEach(c => { const g = groupOf(c); (groups[g] = groups[g] || []).push(c); });
    const names = Object.keys(groups).sort(groupCompare);
    html = `<p class="muted small" style="margin:0 0 8px">${countText(pool)} in ${names.length} ${names.length === 1 ? "group" : "groups"}</p>` +
      (names.length ? '<div class="list">' + names.map(g => {
        const list = groups[g], nSeries = new Set(list.map(seriesKeyOf)).size;
        return `<button class="folder" data-col='${esc(JSON.stringify({ g }))}'><div style="min-width:0"><div class="t">${esc(g)}</div>
          <div class="s">${nSeries} ${nSeries === 1 ? "series" : "series"} · ${esc(countText(list))}</div></div><span class="count">${list.length}</span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("") + '</div>' : '<div class="empty"><h3>Nothing to show</h3><p>Nothing in your archive fits “Show”. Change it above.</p></div>');
  } else if (!col.s) {
    const inGroup = pool.filter(c => groupOf(c) === col.g);
    const bySeries = {};
    inGroup.forEach(c => { const k = seriesKeyOf(c); (bySeries[k] = bySeries[k] || []).push(c); });
    const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
    const keys = Object.keys(bySeries).sort((a, b) => ((order[a] ?? 999) - (order[b] ?? 999)) || seriesTitle(a).localeCompare(seriesTitle(b)));
    html = crumbs([{ label: "All groups", col: {} }, { label: col.g }]) +
      (keys.length ? '<div class="list">' + keys.map(k => {
        const list = bySeries[k], se = seriesById(k), yrs = yearsText(list);
        return `<button class="folder" data-col='${esc(JSON.stringify({ g: col.g, s: k }))}'><div style="min-width:0"><div class="t">${esc(seriesTitle(k))}${se && se.short ? ` <span class="chip">${esc(se.short)}</span>` : ""}</div>
          <div class="s">${esc([countText(list), yrs].filter(Boolean).join(" · "))}</div></div><span class="count">${list.length}</span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("") + '</div>' : '<div class="empty"><h3>Nothing to show here</h3><p>Nothing in this group fits “Show”. Change it above or go back to all groups.</p></div>');
  } else {
    const list = sortComics(pool.filter(c => groupOf(c) === col.g && seriesKeyOf(c) === col.s));
    let lastYear = null, rows = "";
    const byYear = list.some(c => /^\d{4}\//.test(c.issueLabel || ""));
    list.slice(0, S.shown).forEach(c => {
      if (byYear) {
        const y = (/^(\d{4})\//.exec(c.issueLabel || "") || [])[1] || "Other";
        if (y !== lastYear) { const n = list.filter(x => ((/^(\d{4})\//.exec(x.issueLabel || "") || [])[1] || "Other") === y).length; rows += `<h4 class="yearhead">${esc(y)}<span>${n}</span></h4>`; lastYear = y; }
      }
      rows += itemHtml(c, true);
    });
    html = crumbs([{ label: "All groups", col: {} }, { label: col.g, col: { g: col.g } }, { label: seriesTitle(col.s) }]) +
      `<p class="muted small" style="margin:0 0 8px">${esc(countText(list))}</p>` +
      (list.length ? '<div class="list">' + rows + '</div>' : '<div class="empty"><h3>Nothing to show here</h3><p>Nothing in this series fits “Show”. Change it above.</p></div>') + more(list.length);
  }
  box.innerHTML = html;
  box.querySelectorAll("[data-col]").forEach(b => b.onclick = () => openCol(JSON.parse(b.dataset.col)));
  box.querySelectorAll(".item").forEach(b => b.onclick = () => { S.editing = b.dataset.id; S.draft = null; nav("add"); });
  $("#more") && ($("#more").onclick = () => { S.shown += 300; drawResults(); });
}

function seriesOptions(selected, label) {
  const groups = {};
  S.series.forEach(s => { const g = s.group || OTHER_GROUP; (groups[g] = groups[g] || []).push(s); });
  return Object.keys(groups).sort(groupCompare).map(g =>
    `<optgroup label="${esc(g)}">` + groups[g].map(s => `<option value="${esc(s.id)}"${selected === s.id ? " selected" : ""}>${esc(label(s))}</option>`).join("") + "</optgroup>").join("");
}
// ---- Add / edit ----
function blankDraft(pre) {
  return Object.assign({ kind: "issue", author: "", publisher: "", isbn: "", format: "", lang: "", status: "owned", seriesId: S.series[0] ? S.series[0].id : "_other", seriesName: "", issue: "", title: "", date: "", pages: "",
    stories: [], grade: "", copies: 1, pricePaid: "", currency: "CHF", purchaseDate: "", source: "", value: "", location: "",
    read: false, forTrade: false, notes: "", coverUrl: "" }, pre || {});
}
VIEWS.add = {
  html() {
    if (!S.draft) {
      const c = S.editing && S.comics.find(x => x.id === S.editing);
      S.draft = c ? JSON.parse(JSON.stringify(c)) : blankDraft();
      if (!S.draft.stories) S.draft.stories = [];
    }
    const d = S.draft, editing = !!d.id, isBook = d.kind === "book";
    const se = isBook ? null : seriesById(d.seriesId);
    const sopts = seriesOptions(d.seriesId, s => s.name + (s.country ? " (" + s.country + ")" : "")) + `<option value="_other"${!se ? " selected" : ""}>New series…</option>`;
    const hint = se && se.numbering === "year" ? "Year/number, e.g. 1985/12 or 1985/?" : "Number, e.g. 474";
    const catReady = se && S.catalogue && S.catalogue.series && S.catalogue.series[se.id];
    const link = se && d.issue ? inducksIssueUrl(se, d.issue) : (se ? "https://inducks.org/publication.php?c=" + encodeURIComponent(se.code) : "");
    const grades = '<option value="">Not graded</option>' + GRADES.map(([v, l]) => `<option value="${v}"${d.grade === v ? " selected" : ""}>${l}</option>`).join("");
    const curs = CURRENCIES.map(c => `<option${d.currency === c ? " selected" : ""}>${c}</option>`).join("");
    const stories = d.stories.map((s, i) => `<div class="story" data-i="${i}">
        <label class="st-title"><span class="l">Story title</span><input data-sf="title" value="${esc(s.title)}"></label>
        <label><span class="l">Story code</span><input data-sf="code" class="mono" placeholder="I TL 1234-A" value="${esc(s.code)}"></label>
        <label><span class="l">Writer</span><input data-sf="writer" value="${esc(s.writer)}"></label>
        <label><span class="l">Artist</span><input data-sf="artist" value="${esc(s.artist)}"></label>
        <label><span class="l">Main character</span><input data-sf="hero" list="heroes" value="${esc(s.hero)}"></label>
        <button class="ghost danger" data-del="${i}" aria-label="Remove story" title="Remove story">✕</button></div>`).join("");
    return `
      <div class="row between"><div><h2>${editing ? (isBook ? "Edit book" : "Edit comic") : "Add to archive"}</h2>
      <p class="lede">${editing ? "Change any detail and save." : isBook ? "Fill in what you know about the book. Only the title is needed." : "Pick the series and issue, then fill in your copy's details. Fields left empty are fine."}</p></div>
      ${editing ? '<button id="cancel">Back to collection</button>' : ""}</div>
      <div class="card stack">
        <div class="row between">
          <div class="seg" role="group" aria-label="Type"><button type="button" data-kind="issue" aria-pressed="${!isBook}">Comic issue</button><button type="button" data-kind="book" aria-pressed="${isBook}">Book</button></div>
          <div class="seg" role="group" aria-label="Status"><button type="button" data-st="owned" aria-pressed="${d.status !== "wanted"}">I own it</button><button type="button" data-st="wanted" aria-pressed="${d.status === "wanted"}">Wishlist</button></div></div>
${isBook ? `
        <div class="grid-form">
          <label class="wide"><span class="l">Book title</span><input id="f-title" value="${esc(d.title)}" placeholder="e.g. Carl Barks: Die Ducks"></label>
          <label class="wide"><span class="l">Author or editor</span><input id="f-author" value="${esc(d.author)}" placeholder="e.g. Carl Barks, Don Rosa"></label>
          <label><span class="l">Book series</span><input id="f-seriesName" list="bookseries" value="${esc(d.seriesName)}" placeholder="e.g. Carl Barks Collection"></label>
          <label><span class="l">Volume</span><input id="f-issue" value="${esc(d.issue)}" placeholder="e.g. 12"></label>
          <label><span class="l">Publisher</span><input id="f-publisher" list="publishers" value="${esc(d.publisher)}" placeholder="e.g. Egmont Comic Collection"></label>
          <label><span class="l">Year</span><input id="f-date" inputmode="numeric" value="${esc(d.date)}" placeholder="2005"></label>
          <label><span class="l">ISBN</span><input id="f-isbn" class="mono" inputmode="numeric" value="${esc(d.isbn)}" placeholder="978-3-…"></label>
          <label><span class="l">Format</span><select id="f-format">${["", "Hardcover", "Softcover", "Paperback", "Box set", "Other"].map(v => `<option value="${v}"${d.format === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Language</span><select id="f-lang">${["", "German", "Italian", "Swedish", "English", "Other"].map(v => `<option value="${v}"${d.lang === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Pages</span><input id="f-pages" inputmode="numeric" value="${esc(d.pages)}"></label>
          <label class="wide"><span class="l">Cover image URL</span><input id="f-coverUrl" value="${esc(d.coverUrl)}" placeholder="Link to a cover image (optional)"></label>
        </div>
        <datalist id="bookseries">${[...new Set(S.comics.filter(c => c.kind === "book" && c.seriesName).map(c => c.seriesName))].sort().map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
        <datalist id="publishers">${[...new Set(["Egmont Ehapa", "Egmont Comic Collection", "Panini", "Giunti", "Mondadori", "Egmont Kärnan", "Fantagraphics"].concat(S.comics.map(c => c.publisher).filter(Boolean)))].map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
` : `
        <div class="lookup">
          <label><span class="l">Series</span><select id="f-series">${sopts}</select></label>
          <label><span class="l">Issue</span><input id="f-issue" placeholder="${esc(hint)}" value="${esc(d.issue)}"></label>
          <button id="lookup" ${catReady ? "" : "disabled"}>Fill from INDUCKS</button>
        </div>
        ${!se ? `<label><span class="l">New series name</span><input id="f-seriesName" value="${esc(d.seriesName)}" placeholder="e.g. Donald Duck Extra"></label>` : ""}
        <p class="small muted" style="margin:0">${catReady ? "Fills in title, date and stories from the INDUCKS catalogue." : "The INDUCKS catalogue isn't loaded yet, so auto-fill is off for now."}
          <span id="ilink">${link ? ` <a href="${esc(link)}" target="_blank" rel="noopener">Open this ${d.issue ? "issue" : "series"} on INDUCKS</a>` : ""}</span></p>
        <div class="grid-form">
          <label class="wide"><span class="l">Issue title</span><input id="f-title" value="${esc(d.title)}" placeholder="e.g. Der Schatz des Goldenen Helms"></label>
          <label><span class="l">Publication date</span><input id="f-date" value="${esc(d.date)}" placeholder="2015-03"></label>
          <label><span class="l">Pages</span><input id="f-pages" inputmode="numeric" value="${esc(d.pages)}"></label>
          <label class="wide"><span class="l">Cover image URL</span><input id="f-coverUrl" value="${esc(d.coverUrl)}" placeholder="Link to a cover scan (optional)"></label>
        </div>
`}
      </div>
      <div class="card stack">
        <div class="row between"><h3>Stories</h3><button id="addstory">Add story</button></div>
        ${d.stories.length ? '<div class="stories">' + stories + '</div>' : '<p class="muted small" style="margin:0">No stories listed yet. Add them so you can search by story, writer or artist later.</p>'}
        <datalist id="heroes"><option>Donald Duck</option><option>Micky Maus / Topolino</option><option>Dagobert / Zio Paperone / Joakim</option><option>Phantomias / Paperinik</option><option>Daniel Düsentrieb / Archimede</option><option>Goofy / Pippo / Långben</option><option>Gustav Gans / Gastone / Alexander Lukas</option><option>Die Panzerknacker / Bassotti / Björnligan</option><option>Tick, Trick und Track</option></datalist>
      </div>
      ${d.status === "wanted" ? `
      <div class="card stack"><h3>Wishlist notes</h3>
        <div class="grid-form"><label><span class="l">Maximum price</span><input id="f-pricePaid" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.pricePaid))}"></label>
        <label><span class="l">Currency</span><select id="f-currency">${curs}</select></label>
        <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label></div></div>` : `
      <div class="card stack"><h3>Your copy</h3>
        <div class="grid-form">
          <label><span class="l">Condition</span><select id="f-grade">${grades}</select></label>
          <label><span class="l">Copies</span><input id="f-copies" type="number" min="1" value="${esc(d.copies || 1)}"></label>
          <label><span class="l">Storage location</span><input id="f-location" value="${esc(d.location)}" placeholder="Box 3, shelf B"></label>
          <label><span class="l">Price paid</span><input id="f-pricePaid" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.pricePaid))}"></label>
          <label><span class="l">Currency</span><select id="f-currency">${curs}</select></label>
          <label><span class="l">Estimated value</span><input id="f-value" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.value))}"></label>
          <label><span class="l">Purchase date</span><input id="f-purchaseDate" type="date" value="${esc(d.purchaseDate)}"></label>
          <label><span class="l">Bought from</span><input id="f-source" value="${esc(d.source)}" placeholder="Comic-Börse Zürich, Ricardo…"></label>
          <label class="check"><input id="f-read" type="checkbox"${d.read ? " checked" : ""}> Read</label>
          <label class="check"><input id="f-forTrade" type="checkbox"${d.forTrade ? " checked" : ""}> Available for trade</label>
          <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label>
        </div></div>`}
      <div class="row">
        <button class="primary" id="save"${S.db ? "" : " disabled"}>${editing ? "Save changes" : "Save to archive"}</button>
        ${!editing ? '<button id="saveNext"' + (S.db ? "" : " disabled") + '>' + (isBook ? "Save and add next volume" : "Save and add next issue") + '</button>' : ""}
        ${editing ? '<button class="danger" id="del">Delete</button>' : ""}
      </div>
      <div id="confirmBox"></div>`;
  },
  bind() {
    const d = S.draft;
    bindAmounts();
    const grab = () => {
      ["issue", "title", "date", "pages", "coverUrl", "grade", "copies", "location", "pricePaid", "currency", "value", "purchaseDate", "source", "notes", "seriesName", "author", "publisher", "isbn", "format", "lang"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.value; });
      ["read", "forTrade"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.checked; });
      document.querySelectorAll(".story").forEach(row => { const s = d.stories[+row.dataset.i]; row.querySelectorAll("[data-sf]").forEach(inp => s[inp.dataset.sf] = inp.value); });
    };
    $("#cancel") && ($("#cancel").onclick = () => { S.draft = null; S.editing = null; nav("collection"); });
    document.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { grab(); d.status = b.dataset.st; render(); });
    document.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => {
      grab(); if (d.kind === b.dataset.kind) return;
      d.kind = b.dataset.kind;
      if (d.kind === "book") { d.seriesId = "_book"; if (seriesById(d.seriesName) || S.series.some(x => x.name === d.seriesName)) d.seriesName = ""; }
      else if (!seriesById(d.seriesId)) { d.seriesId = S.series[0] ? S.series[0].id : "_other"; d.seriesName = ""; }
      render();
    });
    $("#f-series") && ($("#f-series").onchange = e => { grab(); d.seriesId = e.target.value; render(); });
    $("#f-issue").oninput = e => {
      d.issue = e.target.value;
      const se = seriesById(d.seriesId), l = $("#ilink");
      if (se && l) l.innerHTML = ` <a href="${esc(d.issue ? inducksIssueUrl(se, d.issue) : "https://inducks.org/publication.php?c=" + encodeURIComponent(se.code))}" target="_blank" rel="noopener">Open this ${d.issue ? "issue" : "series"} on INDUCKS</a>`;
    };
    $("#addstory").onclick = () => { grab(); d.stories.push({ title: "", code: "", writer: "", artist: "", hero: "" }); render(); const rows = document.querySelectorAll(".story input"); rows.length && rows[rows.length - 5].focus(); };
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { grab(); d.stories.splice(+b.dataset.del, 1); render(); });
    $("#lookup") && ($("#lookup").onclick = async () => {
      grab(); const se = seriesById(d.seriesId); if (!se) return;
      const hit = await catalogueLookup(se, d.issue);
      if (!hit) { toast("Issue not found in the catalogue"); return; }
      d.title = d.title || hit.title || ""; d.date = hit.date || d.date; d.pages = hit.pages || d.pages; d.coverUrl = d.coverUrl || hit.cover || "";
      d.stories = (hit.stories || []).map(s => ({ title: s.title || "", code: s.code || "", writer: s.writer || "", artist: s.artist || "", hero: s.hero || "" }));
      d.inducks = hit.issuecode || ""; render(); toast("Filled from INDUCKS");
    });
    const doSave = async (next) => {
      grab();
      if (d.kind === "book") return saveBook(next);
      const se = seriesById(d.seriesId);
      d.issue = String(d.issue || ""); d.seriesName = String(d.seriesName || "");
      if (!d.issue.trim() && se && se.numbering === "year") { toast("Enter an issue number first"); $("#f-issue").focus(); return; }
      if (!se && !d.seriesName.trim()) { toast("Enter the series name"); return; }
      const p = parseIssue(se, d.issue);
      const yearOnly = /^\s*(\d{4})\s*\/\s*\?\s*$/.exec(d.issue);
      if (yearOnly) { p.year = +yearOnly[1]; p.label = yearOnly[1] + "/?"; p.n = null; p.sort = p.year * 1000 + (d.date && d.date.length >= 7 ? (+d.date.slice(5, 7) - 1) * 4.3 : 0); }
      if (se && se.numbering === "year" && !p.year && d.issue.trim()) { toast("For " + se.short + " enter year and number, e.g. 1985/12, or 1985/? if you don't know the number"); $("#f-issue").focus(); return; }
      let target = se;
      if (!target) { target = findSeriesByName(d.seriesName.trim()) || newSeriesFor(d.seriesName.trim(), []); try { await saveSeries(); } catch (e) { toast(errText(e)); return; } }
      const c = Object.assign({}, d, {
        seriesId: target.id, seriesName: target.name, issueLabel: p.label, issueSort: p.sort,
        issueYear: p.year || null, issueNum: p.n, copies: Math.max(1, parseInt(d.copies, 10) || 1),
        pricePaid: parseAmt(d.pricePaid),
        value: parseAmt(d.value),
        stories: d.stories.filter(s => s.title || s.code || s.writer || s.artist || s.hero)
      });
      
      const btns = document.querySelectorAll("#save, #saveNext"); btns.forEach(b => b.disabled = true);
      try {
        const saved = await saveComic(c);
        toast(c.status === "wanted" ? "Added to wishlist" : "Saved to archive");
        if (next) {
          const per = se ? (+se.perYear || 52) : 52;
          const nextIssue = se && se.numbering === "year" && p.year ? (p.n >= per ? (p.year + 1) + "/01" : p.year + "/" + String(p.n + 1).padStart(2, "0")) : (p.n != null ? String(p.n + 1) : "");
          S.editing = null;
          S.draft = blankDraft({ seriesId: c.seriesId, seriesName: c.seriesName, status: c.status, issue: nextIssue, currency: c.currency, source: c.source, purchaseDate: c.purchaseDate, location: c.location });
          render(); $("#f-title") && $("#f-title").focus();
        } else { S.draft = null; S.editing = null; S.col = { g: groupOf(saved), s: seriesKeyOf(saved) }; S.filters.q = ""; S.filters.status = saved.status === "wanted" ? "wanted" : "owned"; nav("collection"); }
      } catch (e) { toast(errText(e)); btns.forEach(b => b.disabled = false); }
    };
    const saveBook = async (next) => {
      ["title", "issue", "seriesName", "isbn"].forEach(k => d[k] = String(d[k] || ""));
      if (!d.title.trim()) { toast("Enter the book title first"); $("#f-title").focus(); return; }
      const vol = d.issue.trim(), vm = vol.match(/\d+(\.\d+)?/);
      const c = Object.assign({}, d, {
        kind: "book", seriesId: "_book", seriesName: d.seriesName.trim(), title: d.title.trim(), issue: vol, issueLabel: vol,
        issueSort: vm ? +vm[0] : 1e9, issueYear: null, issueNum: vm ? +vm[0] : null, copies: Math.max(1, parseInt(d.copies, 10) || 1),
        isbn: d.isbn.trim(), pricePaid: parseAmt(d.pricePaid), value: parseAmt(d.value),
        stories: d.stories.filter(s => s.title || s.code || s.writer || s.artist || s.hero)
      });
      const btns = document.querySelectorAll("#save, #saveNext"); btns.forEach(b => b.disabled = true);
      try {
        const saved = await saveComic(c);
        toast(c.status === "wanted" ? "Book added to wishlist" : "Book saved");
        if (next) {
          S.editing = null;
          S.draft = blankDraft({ kind: "book", seriesId: "_book", seriesName: c.seriesName, issue: vm ? String(+vm[0] + 1) : "", author: c.author, publisher: c.publisher, format: c.format, lang: c.lang, status: c.status, currency: c.currency, source: c.source, purchaseDate: c.purchaseDate, location: c.location });
          render(); $("#f-title") && $("#f-title").focus();
        } else { S.draft = null; S.editing = null; S.col = { g: BOOK_GROUP, s: seriesKeyOf(saved) }; S.filters.q = ""; S.filters.status = saved.status === "wanted" ? "wanted" : "owned"; nav("collection"); }
      } catch (e) { toast(errText(e)); btns.forEach(b => b.disabled = false); }
    };
    $("#save").onclick = () => doSave(false);
    $("#saveNext") && ($("#saveNext").onclick = () => doSave(true));
    $("#del") && ($("#del").onclick = () => {
      $("#confirmBox").innerHTML = '<div class="confirm"><span>Delete this ' + (d.kind === "book" ? "book" : "comic") + ' from your archive? This can\'t be undone.</span><button class="danger" id="yesdel">Delete</button><button id="nodel">Keep it</button></div>';
      $("#nodel").onclick = () => $("#confirmBox").innerHTML = "";
      $("#yesdel").onclick = async () => { try { await deleteComic(d.id); toast("Deleted"); S.draft = null; S.editing = null; nav("collection"); } catch (e) { toast(errText(e)); } };
    });
  }
};

// ---- Gaps & wishlist ----
VIEWS.gaps = {
  html() {
    const se = seriesById(S.gapSeries) || S.series[0];
    if (!se) return '<h2>Gaps &amp; wishlist</h2><div class="empty"><h3>No series set up</h3><p>Add your series under the Series tab first.</p></div>';
    const mine = S.comics.filter(c => c.seriesId === se.id);
    const own = new Map(), want = new Map();
    mine.forEach(c => { (c.status === "wanted" ? want : own).set(c.issueLabel || c.issue, c); });
    const opts = seriesOptions(se.id, s => s.name);
    let grid = "", total = 0;
    const cell = (label, txt) => {
      const o = own.get(label), w = want.get(label);
      const cls = o ? "owned" : w ? "wanted" : "";
      return `<button class="cell ${cls}" data-issue="${esc(label)}" data-id="${esc((o || w || {}).id || "")}" title="${esc(se.short + " " + label + (o ? " · owned" : w ? " · on wishlist" : " · missing"))}">${esc(txt)}</button>`;
    };
    if (se.numbering === "year") {
      const y0 = +se.firstYear || 1950, y1 = +se.lastYear || new Date().getFullYear(), per = +se.perYear || 52;
      const unknown = mine.filter(c => /\?/.test(c.issueLabel || "")).length;
      const years = [];
      for (let y = y1; y >= y0; y--) years.push(y);
      total = years.length * per;
      grid = years.map(y => {
        let cells = ""; for (let n = 1; n <= per; n++) cells += cell(y + "/" + String(n).padStart(2, "0"), n);
        const cnt = [...own.keys()].filter(k => String(k).startsWith(y + "/")).length;
        return `<div class="yearrow"><div class="y">${y}<div class="muted small">${cnt}</div></div><div class="cells">${cells}</div></div>`;
      }).join("");
      grid = '<div class="stack" style="gap:10px">' + grid + '</div>';
    } else {
      const max = +se.latest || Math.max(10, ...mine.map(c => c.issueNum || 0)); total = max; let cells = "";
      for (let n = 1; n <= max; n++) cells += cell(String(n), n);
      grid = '<div class="cells">' + cells + '</div>';
    }
    const ownCount = own.size, wantCount = want.size;
    const wl = sortComics(S.comics.filter(c => c.status === "wanted"));
    return `
      <div><h2>Gaps &amp; wishlist</h2><p class="lede">Every issue of a series at a glance. Tap a missing number to add it as owned or put it on your wishlist.</p></div>
      <div class="card stack">
        <div class="row between">
          <label style="flex:1 1 220px"><span class="l">Series</span><select id="gs">${opts}</select></label>
          <div class="row small"><span class="chip owned">${ownCount} owned</span><span class="chip wanted">${wantCount} wanted</span><span class="chip">${Math.max(0, total - ownCount)} missing</span></div>
        </div>
        <div class="legend"><span><i style="background:var(--owned)"></i>Owned</span><span><i style="background:var(--wanted-soft);box-shadow:inset 0 0 0 1.5px var(--wanted)"></i>Wishlist</span><span><i style="background:var(--cell)"></i>Missing</span>
        <span>${se.numbering === "year" ? `Grid covers ${esc(se.firstYear || "?")}–${esc(se.lastYear || "?")}, ${esc(se.perYear || 52)} issues a year` : `Grid runs to issue ${esc(se.latest || "you own with the highest number")}`}. Adjust this under Series.</span></div>
        ${mine.some(c => /\?/.test(c.issueLabel || "")) ? `<p class="small muted" style="margin:0">${mine.filter(c => /\?/.test(c.issueLabel || "")).length} issues with an unknown number aren't shown in the grid.</p>` : ""}
        <div id="cellpick"></div>
        <div style="max-height:62vh;overflow:auto;padding-right:2px">${grid}</div>
      </div>
      <div class="stack"><h3>Full wishlist</h3>
        ${wl.length ? '<div class="list">' + wl.map(c => { const s = seriesById(c.seriesId), bk = c.kind === "book"; return `<button class="item" data-open="${esc(c.id)}"><div class="num${String(c.issueLabel || c.issue || "").length > 4 ? " long" : ""}">${bk && !c.issue ? '<span style="font-size:.9rem">Book</span>' : esc(c.issueLabel || c.issue || "–")}<small>${bk ? "BOOK" : esc(s ? s.short : c.seriesName)}</small></div><div style="min-width:0"><div class="t">${esc(c.title || (s ? s.name : c.seriesName))}</div><div class="s">${esc([c.pricePaid !== "" && c.pricePaid != null ? "Max " + money(c.pricePaid, c.currency) : "", c.notes].filter(Boolean).join(" · ") || (s ? s.name : c.seriesName))}</div></div><div class="chips"><span class="chip wanted">Wishlist</span></div></button>`; }).join("") + '</div>'
          : '<div class="empty"><h3>Your wishlist is empty</h3><p>Tap a grey number in the grid above to add an issue you\'re looking for.</p></div>'}
      </div>`;
  },
  bind() {
    $("#gs") && ($("#gs").onchange = e => { S.gapSeries = e.target.value; render(); });
    const open = id => { S.editing = id; S.draft = null; nav("add"); };
    document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => open(b.dataset.open));
    document.querySelectorAll(".cell").forEach(b => b.onclick = () => {
      if (b.dataset.id) { open(b.dataset.id); return; }
      const se = seriesById(S.gapSeries) || S.series[0], label = b.dataset.issue;
      const box = $("#cellpick");
      box.innerHTML = `<div class="confirm"><strong>${esc(se.short)} ${esc(label)}</strong><button class="primary" id="cpOwn">I own it…</button><button id="cpWant">Add to wishlist</button><button class="ghost" id="cpX">Cancel</button></div>`;
      $("#cpX").onclick = () => box.innerHTML = "";
      $("#cpOwn").onclick = () => { S.editing = null; S.draft = blankDraft({ seriesId: se.id, issue: label }); nav("add"); };
      $("#cpWant").onclick = async () => {
        
        const p = parseIssue(se, label);
        try { await saveComic(Object.assign(blankDraft({ seriesId: se.id, seriesName: se.name, issue: label, status: "wanted" }), { issueLabel: p.label, issueSort: p.sort, issueYear: p.year || null, issueNum: p.n })); toast(se.short + " " + label + " added to wishlist"); render(); }
        catch (e) { toast(errText(e)); }
      };
    });
  }
};

// ---- Stats ----
VIEWS.stats = {
  html() {
    const own = owned(), wanted = S.comics.filter(c => c.status === "wanted");
    if (!S.comics.length) return '<h2>Stats</h2><div class="empty"><h3>No stats yet</h3><p>Stats appear here once you\'ve added or imported comics.</p></div>';
    const copies = own.reduce((a, c) => a + (c.copies || 1), 0);
    const sums = {}, vals = {};
    own.forEach(c => { const cur = c.currency || "CHF"; if (typeof c.pricePaid === "number") sums[cur] = (sums[cur] || 0) + c.pricePaid * (c.copies || 1); if (typeof c.value === "number") vals[cur] = (vals[cur] || 0) + c.value * (c.copies || 1); });
    const fmtMap = m => Object.keys(m).length ? Object.entries(m).map(([k, v]) => k + " " + fmt2(v)).join(" · ") : "–";
    const unread = own.filter(c => !c.read).length, trade = own.filter(c => c.forTrade || (c.copies || 1) > 1).length;
    const perSeries = S.series.filter(s => s.numbering === "year" ? (+s.firstYear && +s.lastYear && +s.perYear) : +s.latest).map(s => {
      const mine = own.filter(c => c.seriesId === s.id);
      const n = new Set(mine.filter(c => !/\?/.test(c.issueLabel || "")).map(c => c.issueLabel)).size + mine.filter(c => /\?/.test(c.issueLabel || "")).length;
      const tot = s.numbering === "year" ? Math.max(0, ((+s.lastYear || 0) - (+s.firstYear || 0) + 1) * (+s.perYear || 52)) || 0 : (+s.latest || 0);
      return { s, n, tot };
    });
    const sized = new Set(perSeries.map(x => x.s.id));
    const others = own.filter(c => !sized.has(c.seriesId) && c.kind !== "book").length;
    const books = own.filter(c => c.kind === "book").length;
    const creators = {};
    own.forEach(c => (c.stories || []).forEach(st => [st.writer, st.artist].forEach(p => { if (p) p.split(/[,;&\/]+/).map(x => x.trim()).filter(Boolean).forEach(x => creators[x] = (creators[x] || 0) + 1); })));
    const top = Object.entries(creators).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topMax = top.length ? top[0][1] : 1;
    return `
      <div><h2>Stats</h2><p class="lede">Your collection by the numbers. Values are summed per currency, not converted.</p></div>
      <div class="stats">
        <div class="card stat"><div class="v">${own.length.toLocaleString("de-CH")}</div><div class="k">${books ? "owned · " + books + " of them books" : "issues owned"}${copies > own.length ? " · " + copies + " copies" : ""}</div></div>
        <div class="card stat"><div class="v">${wanted.length.toLocaleString("de-CH")}</div><div class="k">on wishlist</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${esc(fmtMap(sums))}</div><div class="k">paid in total</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${esc(fmtMap(vals))}</div><div class="k">estimated value</div></div>
        <div class="card stat"><div class="v">${unread}</div><div class="k">unread</div></div>
        <div class="card stat"><div class="v">${trade}</div><div class="k">for trade or duplicate</div></div>
      </div>
      <div class="two">
        <div class="card stack"><h3>Completion per series</h3><div class="bars">
          ${perSeries.map(({ s, n, tot }) => `<div class="bar"><div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name)}</div><div class="track"><div class="fill" style="width:${tot ? Math.min(100, n / tot * 100).toFixed(1) : 0}%"></div></div><div class="n">${n} / ${tot}</div></div>`).join("")}
          ${others ? `<p class="small muted" style="margin:0">${others} more in series without a set size. Set the latest issue under Series to include them.</p>` : ""}
        </div></div>
        <div class="card stack"><h3>Most-collected creators</h3><p class="small muted" style="margin:0">Counts each comic or story a writer or artist is credited on.</p>
          ${top.length ? '<div class="bars">' + top.map(([n, c]) => `<div class="bar"><div style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(n)}</div><div class="track"><div class="fill" style="width:${(c / topMax * 100).toFixed(1)}%;background:var(--owned)"></div></div><div class="n">${c} ${c === 1 ? "credit" : "credits"}</div></div>`).join("") + '</div>'
            : '<p class="muted small" style="margin:0">Add stories with writers and artists to your comics to see who you collect most.</p>'}
        </div>
      </div>`;
  }
};
// ---- Backup ----
function stampDate(d) { return d ? new Date(d).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }) : ""; }
function daysSince(d) { return d ? Math.floor((Date.now() - new Date(d)) / 864e5) : Infinity; }
function backupFile(asText) {
  const data = JSON.stringify({ app: "dagobert-archiv", format: 1, exported: new Date().toISOString(), series: S.series, comics: S.comics });
  const name = "dagobert-archiv-backup-" + new Date().toISOString().slice(0, 10) + (asText ? ".json.txt" : ".json");
  return new File([data], name, { type: asText ? "text/plain" : "application/json" });
}
function saveToDevice(file) {
  const url = URL.createObjectURL(file), a = document.createElement("a");
  a.href = url; a.download = file.name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}
async function markBackedUp() { S.lastBackup = new Date().toISOString(); try { await setConfig("lastBackup", S.lastBackup); } catch (e) {} }
function csvFile() {
  const cols = ["type", "series", "issue", "status", "title", "date", "grade", "copies", "pricePaid", "currency", "value", "purchaseDate", "source", "location", "read", "forTrade", "notes", "author", "publisher", "isbn", "format", "language", "stories"];
  const rows = sortComics(S.comics).map(c => { const se = seriesById(c.seriesId); return [c.kind === "book" ? "book" : "comic", se ? se.name : c.seriesName, c.issueLabel || c.issue, c.status, c.title, c.date, c.grade, c.copies, amtVal(c.pricePaid), c.currency, amtVal(c.value), c.purchaseDate, c.source, c.location, c.read ? "yes" : "no", c.forTrade ? "yes" : "no", c.notes, c.author, c.publisher, c.isbn, c.format, c.lang, (c.stories || []).map(s => [s.title, s.code, s.writer, s.artist].filter(Boolean).join(" | ")).join(" ;; ")]; });
  const csv = Papa.unparse({ fields: cols, data: rows });
  return new File(["﻿" + csv], "dagobert-archiv-table-" + new Date().toISOString().slice(0, 10) + ".csv", { type: "text/csv" });
}
VIEWS.backup = {
  html() {
    const n = S.comics.length, days = daysSince(S.lastBackup);
    const mb = S.usage ? (S.usage / 1048576).toFixed(1) + " MB" : "";
    const canShare = !!(navigator.share && navigator.canShare);
    const status = !n ? "" : days === Infinity ? '<div class="banner warn">You haven\'t made a backup yet. If this phone is lost or reset, the archive goes with it.</div>'
      : days > 14 ? `<div class="banner warn">Your last backup is ${days} days old.</div>` : "";
    return `
      <div><h2>Backup</h2><p class="lede">Your archive is stored only on this phone and works without internet. Keep a copy on your PC in case the phone is lost, reset or replaced.</p></div>
      ${status}
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(105px,1fr))">
        <div class="card stat"><div class="v">${n.toLocaleString("de-CH")}</div><div class="k">entries on this phone</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${S.lastBackup ? esc(stampDate(S.lastBackup)) : "Never"}</div><div class="k">last backup</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${S.persisted ? "Protected" : "Not yet"}</div><div class="k">${S.persisted ? "Android won't clear this data on its own" : "requested on first save"}${mb ? " · " + mb + " used" : ""}</div></div>
      </div>
      <div class="card stack"><h3>Make a backup</h3>
        <p class="small muted" style="margin:0">The backup file holds every comic, story and setting. ${canShare ? "“Send backup” lets you pick Google Drive, Gmail or Quick Share to get it to your PC." : ""}</p>
        <div class="row">
          ${canShare ? `<button class="primary" id="bshare"${n ? "" : " disabled"}>Send backup…</button>` : ""}
          <button ${canShare ? "" : 'class="primary" '}id="bsave"${n ? "" : " disabled"}>Save backup to Downloads</button>
          <button id="bcsv"${n ? "" : " disabled"}>Save table for Excel (.csv)</button>
        </div></div>
      <div class="card stack"><h3>Getting the file to your Windows PC</h3>
        <div class="small" style="display:grid;gap:8px;max-width:68ch">
          <div><strong>Google Drive:</strong> Send backup, choose Drive, then download it on the PC from drive.google.com.</div>
          <div><strong>Quick Share:</strong> with Google's Quick Share app for Windows installed, Send backup and pick your PC.</div>
          <div><strong>USB cable:</strong> Save backup to Downloads, connect the phone, and copy the file from the phone's Download folder.</div>
        </div></div>
      <div class="card stack"><h3>Restore</h3>
        <p class="small muted" style="margin:0">Use this on a new phone, after a reset, or to bring over the test version from claude.ai. Restoring updates matching comics and adds the rest. Nothing is deleted.</p>
        <label style="max-width:420px"><span class="l">Backup file</span><input id="restore" type="file" accept=".json,.txt,application/json,text/plain"></label>
        <div id="restoreBox"></div></div>`;
  },
  bind() {
    $("#bshare") && ($("#bshare").onclick = async () => {
      let f = backupFile(false);
      if (!navigator.canShare({ files: [f] })) f = backupFile(true);
      if (!navigator.canShare({ files: [f] })) { toast("Sharing files isn't supported here. Use Save backup to Downloads."); return; }
      try { await navigator.share({ files: [f], title: "Dagobert Ducks Archiv backup" }); await markBackedUp(); toast("Backup sent"); render(); }
      catch (e) { if (e && e.name !== "AbortError") toast("Sending didn't work. Use Save backup to Downloads."); }
    });
    $("#bsave") && ($("#bsave").onclick = async () => { saveToDevice(backupFile(false)); await markBackedUp(); toast("Backup saved to Downloads"); render(); });
    $("#bcsv") && ($("#bcsv").onclick = () => { saveToDevice(csvFile()); toast("Table saved to Downloads"); });
    $("#restore").onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const box = $("#restoreBox");
      file.text().then(txt => {
        let b; try { b = JSON.parse(txt); } catch (x) { b = null; }
        if (!b || !["dagobert-archiv", "entenhausen-archive"].includes(b.app) || !Array.isArray(b.comics)) { box.innerHTML = '<div class="banner warn">This file isn\'t a Dagobert Ducks Archiv backup. Choose a file made with Save or Send backup.</div>'; return; }
        const isClz = /^clz/.test(b.source || ""), ids = new Set(b.comics.map(c => c && c.id));
        const have = new Set(S.comics.map(c => c.id));
        const fresh = isClz ? b.comics.filter(c => c && !have.has(c.id)) : b.comics;
        const known = b.comics.length - fresh.length;
        // only entries from the old in-app CLZ importer qualify; comics from converted files carry clzBatch/seriesGroup
        const oldClz = b.source === "clz-import" ? S.comics.filter(c => c.importedFrom === "CLZ" && !ids.has(c.id) && !c.clzBatch && !c.seriesGroup) : [];
        box.innerHTML = `<div class="confirm" style="display:grid;gap:10px"><span>${isClz ? (fresh.length ? "Add " + fresh.length + " comics from your CLZ collection?" : "All comics in this file are already in your archive.") + (known && fresh.length ? " " + known + " already in your archive stay as they are." : "") : "Restore " + b.comics.length + " entries from " + esc(stampDate(b.exported)) + "?"}</span>
          ${oldClz.length ? `<label class="check" style="min-height:0"><input id="rmold" type="checkbox" checked> Remove the ${oldClz.length} entries from the earlier CLZ import first</label>` : ""}
          <div class="row"><button class="primary" id="yesrest"${isClz && !fresh.length && !oldClz.length ? " disabled" : ""}>${isClz ? "Add" : "Restore"}</button><button id="norest">Cancel</button></div></div>`;
        $("#norest").onclick = () => { box.innerHTML = ""; e.target.value = ""; };
        $("#yesrest").onclick = async () => {
          try {
            if (oldClz.length && $("#rmold") && $("#rmold").checked) {
              const gone = oldClz.map(c => c.id);
              await tx("comics", "readwrite", st => { gone.forEach(id => st.delete(id)); });
              S.comics = S.comics.filter(c => !gone.includes(c.id));
            }
            if (Array.isArray(b.series) && b.series.length) { S.series = b.series; await saveSeries(); }
            const n = await saveMany(fresh, d => { box.innerHTML = `<div class="banner">${isClz ? "Adding" : "Restoring"}… ${d} of ${fresh.length}</div>`; }, true);
            await adoptLooseSeries();
            await refreshStorageInfo(); toast((isClz ? "Added " : "Restored ") + n + " entries"); render();
          } catch (x) { box.innerHTML = '<div class="banner warn">' + esc(errText(x)) + '</div>'; }
        };
      });
    };
  }
};

// ---- Series ----
VIEWS.series = {
  html() {
    const rows = S.series.map((s, i) => `<div class="seriesrow" data-i="${i}">
      <label class="sr-name"><span class="l">Name</span><input data-k="name" value="${esc(s.name)}"></label>
      <label><span class="l">Group</span><input data-k="group" list="grouplist" value="${esc(s.group || "")}" placeholder="${OTHER_GROUP}"></label>
      <label><span class="l">Short</span><input data-k="short" value="${esc(s.short)}"></label>
      <label><span class="l">INDUCKS code</span><input data-k="code" class="mono" value="${esc(s.code)}" placeholder="de/LTB"></label>
      <label><span class="l">Country</span><input data-k="country" value="${esc(s.country)}" maxlength="3"></label>
      <label><span class="l">Numbering</span><select data-k="numbering"><option value="running"${s.numbering !== "year" ? " selected" : ""}>Running number</option><option value="year"${s.numbering === "year" ? " selected" : ""}>Per year</option></select></label>
      ${s.numbering === "year"
        ? `<label><span class="l">Years</span><input data-k="years" value="${esc(s.firstYear || s.lastYear ? (s.firstYear || "") + "–" + (s.lastYear || "") : "")}" placeholder="1951–2026"></label><label><span class="l">Per year</span><input data-k="perYear" type="number" min="1" placeholder="e.g. 52" value="${esc(s.perYear || "")}"></label>`
        : `<label><span class="l">Latest issue</span><input data-k="latest" type="number" min="1" value="${esc(s.latest || "")}"></label><span></span>`}
      <button class="ghost danger" data-rm="${i}" title="Remove series" aria-label="Remove series">✕</button></div>`).join("");
    return `
      <div><h2>Series</h2><p class="lede">The series you collect. The group decides where a series appears under Collection. The gap grid and completion stats use the latest issue, or the years and issues per year for weekly titles.</p></div>
      ${S.seriesSaved ? "" : '<div class="banner">These are the starting series. Save once to keep your own version.</div>'}
      <div class="card stack"><div class="serieslist">${rows}</div>
        <datalist id="grouplist">${[...new Set(S.series.map(s => s.group).filter(Boolean))].sort().map(g => `<option>${esc(g)}</option>`).join("")}</datalist>
        <div class="row"><button id="addser">Add series</button><button class="primary" id="saveser"${S.db ? "" : " disabled"}>Save series</button></div></div>
      <div class="card stack"><h3>INDUCKS catalogue</h3>
        <p class="small muted" style="margin:0">${S.catalogue ? "Loaded for " + Object.keys(S.catalogue.series || {}).length + " series" + (S.catalogue.built ? ", built " + esc(S.catalogue.built) : "") + ". Data from INDUCKS (inducks.org)." : "Not loaded yet. Once it is, Add comic fills in titles, dates and full story lists from INDUCKS."}</p></div>`;
  },
  bind() {
    const grab = () => document.querySelectorAll(".seriesrow").forEach(row => {
      const s = S.series[+row.dataset.i];
      row.querySelectorAll("[data-k]").forEach(inp => {
        const k = inp.dataset.k, v = inp.value.trim();
        if (k === "years") { const m = v.match(/(\d{4})\D+(\d{4})/); if (m) { s.firstYear = +m[1]; s.lastYear = +m[2]; } }
        else if (k === "latest" || k === "perYear") s[k] = parseInt(v, 10) || "";
        else s[k] = v;
      });
      if (!s.id) { const base = (s.code || s.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "s" + Date.now(); let id = base, k = 2; while (S.series.some(x => x !== s && x.id === id)) id = base + "-" + k++; s.id = id; }
    });
    document.querySelectorAll('[data-k="numbering"]').forEach(sel => sel.onchange = () => { grab(); const s = S.series[+sel.closest(".seriesrow").dataset.i]; if (s.numbering === "year") { s.firstYear = s.firstYear || 1950; s.lastYear = s.lastYear || new Date().getFullYear(); s.perYear = s.perYear || 52; } render(); });
    $("#addser").onclick = () => { grab(); S.series.push({ id: "", name: "", short: "", group: "", code: "", country: "", numbering: "running", latest: "" }); render(); const ins = document.querySelectorAll('.seriesrow [data-k="name"]'); ins[ins.length - 1].focus(); };
    document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
      grab(); const s = S.series[+b.dataset.rm];
      const used = S.comics.filter(c => c.seriesId === s.id).length;
      if (used) { toast(used + " comics are in this series. Move or delete them first."); return; }
      S.series.splice(+b.dataset.rm, 1); render();
    });
    $("#saveser").onclick = async () => {
      grab();
      if (S.series.some(s => !s.name)) { toast("Every series needs a name"); return; }
      S.series.forEach(s => { if (!s.group) s.group = OTHER_GROUP; });
      S.series.sort((a, b) => groupCompare(a.group, b.group));
      const ids = S.series.map(s => s.id); if (new Set(ids).size !== ids.length) { toast("Two series have the same INDUCKS code"); return; }
      try { await saveSeries(); toast("Series saved"); render(); } catch (e) { toast(errText(e)); }
    };
  }
};

// ---------- start ----------
const start = location.hash.slice(1);
if (VIEWS[start]) S.view = start;
render();
boot();

// offline support: the service worker keeps the app itself on this phone
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").then(reg => {
    const offer = w => { const u = $("#update"); u.hidden = false; $("#reload").onclick = () => w.postMessage("activate"); };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch(() => {});
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  });
}
})();
