// Dagobert Ducks Archiv – Stories, Backup, Duckipedia and refresh jobs.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- Stories ----
function splitPeople(v) { return String(v || "").split(/[,;&\/]+/).map(x => x.trim()).filter(x => x && x !== "?"); }
function splitChars(v) {
  const t = String(v || "").replace(/Tick,\s*Trick und Track/g, "Tick, Trick und Track".replace(/,/g, "\u0001"));
  const out = []; let depth = 0, cur = "";
  for (const ch of t) { if (ch === "(") depth++; if (ch === ")") depth = Math.max(0, depth - 1); if (ch === "," && !depth) { out.push(cur); cur = ""; } else cur += ch; }
  out.push(cur);
  return out.map(x => x.replace(/\u0001/g, ",").replace(/\s*\([^)]*\)/g, "").trim()).filter(Boolean);
}
const storyCode = v => String(v || "").replace(/\s+/g, " ").trim();
// when INDUCKS details are fetched again (Refresh all comics, Fill from INDUCKS), INDUCKS gives these fields of a story;
// everything else a story has stays: Duckipedia's German title, translator, characters, plot, genre …, and a title you corrected
// yourself (Edit › Stories). Matched by story code (the same code twice = chapters, matched in order), a story without code by place
const INDUCKS_STORY_KEYS = ["title", "code", "writer", "artist", "hero", "pages"];
function keepOwnTitles(old, fresh) {
  old = old || []; if (!old.length) return fresh;
  const byCode = new Map(), used = new Map();
  old.forEach(s => { const k = codeKey(s.code); if (k) (byCode.get(k) || byCode.set(k, []).get(k)).push(s); });
  return fresh.map((s, i) => {
    const k = codeKey(s.code); let o = null;
    if (k && byCode.has(k)) { const list = byCode.get(k), n = used.get(k) || 0; o = list[Math.min(n, list.length - 1)]; used.set(k, n + 1); }
    else if (!k && old[i] && !codeKey(old[i].code)) o = old[i];
    if (!o) return s;
    const out = Object.assign({}, s);
    Object.keys(o).forEach(key => { if (!INDUCKS_STORY_KEYS.includes(key) && o[key] != null && o[key] !== "" && (out[key] == null || out[key] === "")) out[key] = o[key]; });
    if (o.ownTitle && o.title) { out.title = o.title; out.ownTitle = true; }
    return out;
  });
}
const codeKey = v => String(v || "").replace(/\s+/g, "").toLowerCase();
// stories of this comic that are already in another comic you own or read (same INDUCKS story code): [{ s, comics }]
function storiesHadElsewhere(d) {
  const mine = new Map();
  (d.stories || []).forEach(s => { const k = codeKey(s.code); if (k && !mine.has(k)) mine.set(k, { s, comics: [] }); });
  if (!mine.size) return [];
  S.comics.forEach(c => {
    if (c.id === d.id || c.status === "wanted") return;
    const seen = new Set();
    (c.stories || []).forEach(s => { const k = codeKey(s.code), m = mine.get(k); if (m && !seen.has(k)) { seen.add(k); m.comics.push(c); } });
  });
  return [...mine.values()].filter(m => m.comics.length);
}
// the note above the stories: in the form as plain text, on the comic page with buttons to open those comics
function hadElsewhereHtml(d, links) {
  const xs = storiesHadElsewhere(d); if (!xs.length) return "";
  const n = (d.stories || []).length;
  // owned somewhere vs. only read (Read, not owned): said apart, so "you have it" is never said about a library copy
  const ownN = xs.filter(m => m.comics.some(c => isOwn(c))).length, readN = xs.length - ownN;
  const of = k => k === n ? (n === 1 ? "this story" : "all " + n + " stories") : k + " of these " + n + " stories";
  const head = [ownN ? "You already have " + of(ownN) + " in other comics" : "", readN ? (ownN ? "you've read " + readN + " more" : "You've already read " + of(readN)) + " without owning " + (readN === 1 ? "it" : "them") : ""].filter(Boolean).join("; ");
  const where = c => (links ? `<button type="button" class="link" data-hopen="${esc(c.id)}">${esc(comicTag(c))}</button>` : esc(comicTag(c))) + (notOwned(c) ? " (read, not owned)" : "");
  return `<div class="banner hadst small"><b>${head}</b>:<ul>${xs.map(m => `<li>${esc(m.s.title || m.s.dTitle || m.s.code)}: ${m.comics.map(where).join(", ")}</li>`).join("")}</ul></div>`;
}
// a writer's or artist's name anywhere in the app opens their page under Stories
document.addEventListener("click", e => {
  const p = e.target.closest("[data-goperson]"), h = e.target.closest("[data-hopen]");
  if (p) { e.preventDefault(); storiesGo({ who: { role: p.dataset.goperson, name: p.dataset.n }, status: "all" }); }
  else if (h) { e.preventDefault(); S.editing = h.dataset.hopen; S.draft = null; nav("add"); window.scrollTo(0, 0); }
});
// every story once, with the comics it appears in (a reprinted story is one story)
// story ratings are kept per story (INDUCKS story code, or the title when there is no code), in the config store
const storyKey = e => e.code ? "c:" + String(e.code).replace(/\s+/g, "").toLowerCase() : "t:" + norm(e.titles[0] || "");
const storyRate = e => S.storyRatings[storyKey(e)] || {};
async function setStoryRate(key, patch) {
  const cur = Object.assign({}, S.storyRatings[key] || {}, patch);
  if (!cur.fav && !+cur.rating && !+cur.writing && !+cur.art) delete S.storyRatings[key]; else S.storyRatings[key] = cur;
  await setConfig("storyRatings", S.storyRatings);
}
// the title two chapters share: "Zio Paperone e il decino dell'infinito - Capitolo 1 - …" + "… - Capitolo 2 - …"
// -> "Zio Paperone e il decino dell'infinito"; when they share too little, the first title stays
function sharedTitle(a, b) {
  a = String(a || ""); b = String(b || ""); if (!a || !b || a === b) return a || b;
  const dash = s => s.toLowerCase().replace(/[–—]/g, "-");
  const A = dash(a), Bx = dash(b); let n = 0; while (n < A.length && n < Bx.length && A[n] === Bx[n]) n++;
  let s = a.slice(0, n); if (n < a.length && n < b.length && /\S/.test(a[n])) s = s.replace(/\S*$/, "");
  const CH = "teil|part|parte|capitolo|kapitel|chapter|chapitre|episode|episodio|folge|akt|prolog|prologo|erste|zweite|dritte";
  const tail = new RegExp("(?:[\\s\\-–—:,.;(]+|\\b(?:" + CH + ")\\b\\.?|\\b\\d+\\.?)$", "i");
  for (let k = 0; k < 8 && tail.test(s); k++) s = s.replace(tail, "");
  s = s.trim();
  // good only where the title goes on with a separator or a chapter word ("… - Capitolo 1", "… Teil 2", "…: Erster Akt")
  const rest = a.slice(s.length), ok = s.length >= 6 && new RegExp("^\\s*(?:[\\-–—:,(.]|(?:" + CH + ")\\b|\\d)", "i").test(rest);
  if (ok) return s;
  // otherwise the first title, without its chapter mark ("Die rätselhafte Pyramide - Teil 1" -> "Die rätselhafte Pyramide")
  const cut = a.replace(new RegExp("\\s*[\\-–—:,]?\\s*\\b(?:" + CH + ")\\s*\\d+\\b.*$", "i"), "").trim();
  return cut.length >= 6 ? cut : a;
}
// story info from the catalogue (catalogue/story-info.json, 2026-11-21): story series (DoubleDuck …), each story's original
// language and the creators' own country, matched by story code, so comics need no Refresh
let SINFO = null, sinfoTry = 0, sinfoMissing = false;
function loadStoryInfo() {
  loadStoryKinds();
  if (SINFO || Date.now() - sinfoTry < 60000) return; sinfoTry = Date.now();
  fetch("catalogue/story-info.json").then(r => r.ok ? r.json() : null).then(j => {
    if (!j) { if (!sinfoMissing) { sinfoMissing = true; if (S.view === "stories") render(); } return; }
    const ser = new Map(), lang = new Map();
    Object.entries(j.storySeries || {}).forEach(([k, v]) => ser.set(storyCode(k), v));
    Object.entries(j.lang || {}).forEach(([k, v]) => lang.set(storyCode(k), v));
    SINFO = { series: j.series || {}, ser, lang, def: j.langDefault || {}, people: j.people || {} };
    if (S.view === "stories") render(); else if (S.view === "stats" && S.statTab === "stories") renderKeep();
  }).catch(() => {});
}
// open Stories from somewhere else (Stats, a comic's page) with a clean slate: old filters (language rows, I have it,
// Story series, Reprinted/Rated/Unread) would hide what was tapped
function storiesGo(o) {
  S.st = Object.assign(S.st || {}, { tab: "all", who: null, q: "", shown: 100, status: "owned", sub: "stories", olang: "", clang: "", pc: "", chl: "", ownf: "", reprinted: false, rated: false, unread: false }, o);
  nav("stories"); window.scrollTo(0, 0);
}
const _dn = {};
function dispName(type, code) {
  try { return (_dn[type] = _dn[type] || new Intl.DisplayNames(["en"], { type })).of(code) || code; } catch (e) { return code; }
}
function langName(code) {
  code = String(code || "").toLowerCase(); if (!code) return "";
  return { nb: "Norwegian", nn: "Norwegian", no: "Norwegian", "pt-br": "Portuguese", pt: "Portuguese", "es-ar": "Spanish", "zh-tw": "Chinese", "zh-cn": "Chinese" }[code] || dispName("language", code);
}
function countryName(code) {
  const c = String(code || "").toUpperCase(); if (!c) return "";
  return { YU: "Yugoslavia", SU: "Soviet Union", CS: "Czechoslovakia", DD: "East Germany" }[c] || dispName("region", c === "UK" ? "GB" : c);
}
const storySeriesOf = e => (SINFO && e.code && SINFO.ser.get(e.code)) || [];
const seriesNameOf = code => ((SINFO && SINFO.series[code]) || {}).n || code;
// ---- story series kinds and where to find their stories (da-v237) ----
// kind: "cont" continuing story (DoubleDuck), "loose" separate stories in one format (riddles), "setting" only a shared
// setting (PIA); not set works like loose. Your choice is in config storyKinds (and in the backup).
const STORY_KINDS = [["cont", "Continuing story"], ["loose", "Loose series"], ["setting", "Shared setting"]];
// a kind you chose wins; else the pre-set one (catalogue/story-kinds.json, Claude 2026-11-24); "none" = you set Not set
const storyKindOf = code => { const u = (S.storyKinds || {})[code]; return u === "none" ? "" : u || (SKINDS && SKINDS[code]) || ""; };
const storyKindPreset = code => !(S.storyKinds || {})[code] && !!(SKINDS && SKINDS[code]);
let SKINDS = null;
function loadStoryKinds() { if (SKINDS) return; SKINDS = {}; fetch("catalogue/story-kinds.json").then(r => r.ok ? r.json() : null).then(j => { if (j && j.kinds) { SKINDS = j.kinds; if (S.view === "stories") drawStories(); } }).catch(() => {}); }
const storyKindLabel = k => (STORY_KINDS.find(x => x[0] === k) || [, "Not set"])[1];
async function setStoryKind(code, k) {
  S.storyKinds = Object.assign({}, S.storyKinds); if (k) S.storyKinds[code] = k; else if (SKINDS && SKINDS[code]) S.storyKinds[code] = "none"; else delete S.storyKinds[code];
  await setConfig("storyKinds", S.storyKinds).catch(() => {});
}
// every story of a series in the catalogue, in reading order (story codes follow the first printing: I TL 2276-1 before I TL 2301-1)
function seriesParts(code) {
  if (!SINFO) return [];
  if (!SINFO.parts) { const m = new Map(); SINFO.ser.forEach((v, k) => v.forEach(sc => (m.get(sc) || m.set(sc, []).get(sc)).push(k))); m.forEach(v => v.sort((a, b) => a.localeCompare(b, "en", { numeric: true }))); SINFO.parts = m; }
  return SINFO.parts.get(code) || [];
}
// which comics print each series story (catalogue/story-where.json, made from the app's INDUCKS issue lists); loaded only here
let SWHERE = null, swTry = 0;
function loadStoryWhere() {
  if (SWHERE || Date.now() - swTry < 60000) return; swTry = Date.now();
  fetch("catalogue/story-where.json").then(r => r.ok ? r.json() : null).then(j => {
    if (!j) return; const m = new Map(); Object.entries(j.s || {}).forEach(([k, v]) => m.set(storyCode(k), v));
    SWHERE = { pubs: j.pubs || [], s: m }; if (S.view === "stories") drawStories();
  }).catch(() => {});
}
// your stories by code: owned, read (owned or not), on the wishlist
function storyCodeSets() {
  const own = new Set(), read = new Set(), wish = new Set(), pages = new Map();
  S.comics.forEach(c => (c.stories || []).forEach(x => { const k = storyCode(x.code); if (!k) return; if (isOwn(c)) own.add(k); if (c.read && isMine(c)) read.add(k); if (c.status === "wanted") wish.add(k);
    const pg = parseInt(x.pages, 10) || 0; if (pg > (pages.get(k) || 0)) pages.set(k, pg); }));
  return { own, read, wish, pages };
}
// your entries by catalogue file + issue: owned beats read, read beats wishlist
function issueStatusMap() {
  const m = new Map(), rank = { owned: 3, read: 2, wish: 1 };
  S.comics.forEach(c => { if (c.kind === "book") return; const se = seriesById(c.seriesId), e = se && catEntry(se); if (!e) return;
    const k = e.file + "|" + parseIssue(se, c.issueLabel || c.issue).label, v = isOwn(c) ? "owned" : notOwned(c) ? "read" : "wish";
    if (!m.has(k) || rank[v] > rank[m.get(k)]) m.set(k, v); });
  return m;
}
function storySeriesCard(code) {
  const nf = n => Number(n).toLocaleString("de-CH");
  const kind = storyKindOf(code), have = storyCodeSets();
  const chips0 = `<div class="fchips" role="group" aria-label="Kind of story series">${STORY_KINDS.concat([["", "Not set"]]).map(([k, l]) => `<button type="button" class="fchip${kind === k ? " on" : ""}" data-skind="${k}" aria-pressed="${kind === k}">${l}</button>`).join("")}</div>`;
  const preNote = storyKindPreset(code) ? `<p class="small muted" style="margin:0">Kind pre-set by Claude from the series' story titles: tap another one if it's wrong.</p>` : "";
  if (!SWHERE) { loadStoryWhere(); return chips0 + preNote + `<p class="small muted" style="margin:0">Loading the series' stories …</p>`; }
  // INDUCKS also files covers and one-page title pages under a story series: only stories of 2+ pages count as parts
  const all = seriesParts(code), parts = all.filter(k => { const w = SWHERE.s.get(k); return Math.max(w ? w[2] : 0, have.pages.get(k) || 0) >= 2; }), extra = all.length - parts.length;
  const nOwn = parts.filter(k => have.own.has(k)).length, nRead = parts.filter(k => have.read.has(k)).length;
  const prog = parts.length ? (kind === "cont" ? `<strong>${nf(nRead)} of ${nf(parts.length)} parts read</strong> · ${nf(nOwn)} owned` : `<strong>${nf(nOwn)} of ${nf(parts.length)} owned</strong>${nRead ? " · " + nf(nRead) + " read" : ""}`) : "";
  let where = "";
  {
    const st = issueStatusMap(), num = new Map(parts.map((k, i) => [k, i + 1])), comics = new Map(); let nowhere = 0;
    parts.forEach(k => { const w = SWHERE.s.get(k); if (!w) { nowhere++; return; } w[1].forEach(([pi, key]) => { const id = pi + "|" + key; (comics.get(id) || comics.set(id, { pi, key, parts: [] }).get(id)).parts.push(k); }); });
    const pubOf = pi => SWHERE.pubs[pi] || ["", "", "?"], label = x => (x.title || "").slice(0, 60);
    const rows = [...comics.values()].map(x => Object.assign(x, { have: st.get(pubOf(x.pi)[0] + "|" + x.key) || "", miss: x.parts.filter(k => !have.own.has(k)).length }));
    const groups = new Map(); rows.forEach(x => (groups.get(x.pi) || groups.set(x.pi, []).get(x.pi)).push(x));
    const gl = [...groups.entries()].map(([pi, xs]) => ({ pi, xs: xs.sort((a, b) => b.miss - a.miss || String(a.key).localeCompare(String(b.key), "en", { numeric: true })), miss: Math.max(...xs.map(x => x.miss)) }))
      .sort((a, b) => b.miss - a.miss || pubOf(a.pi)[2].localeCompare(pubOf(b.pi)[2], "de", { numeric: true }));
    const partTxt = x => kind === "cont"
      ? (x.parts.length === 1 ? "part " : "parts ") + x.parts.map(k => have.own.has(k) ? nf(num.get(k)) : `<b class="gold">${nf(num.get(k))}</b>`).join(", ")
      : x.parts.slice(0, 3).map(k => { const t = esc(label({ title: (SWHERE.s.get(k) || [""])[0] }) || k); return have.own.has(k) ? t : `<b class="gold">${t}</b>`; }).join(" · ") + (x.parts.length > 3 ? ` · +${x.parts.length - 3}` : "");
    const tag = h => h === "owned" ? '<span class="chip">owned</span>' : h === "read" ? '<span class="chip">read, not owned</span>' : h === "wish" ? '<span class="chip wanted">wishlist</span>' : "";
    // da-v238: one folded line per series (stays open after a Wish), and at first only comics with parts you're missing
    const onlyMiss = !S.stWhereAll, opened = S.stWhereOpen || (S.stWhereOpen = new Set());
    const shownG = gl.map(g => Object.assign({}, g, { show: onlyMiss ? g.xs.filter(x => x.miss) : g.xs, nMiss: g.xs.filter(x => x.miss).length })).filter(g => g.show.length);
    const allOwned = gl.length - shownG.length;
    const body = `<div class="fchips" style="margin-top:6px"><button type="button" class="fchip${onlyMiss ? " on" : ""}" data-swall aria-pressed="${onlyMiss}">Only comics with ${kind === "cont" ? "parts" : "stories"} I'm missing</button></div>`
      + shownG.map(g => `<details class="wheregroup" data-wpi="${g.pi}"${opened.has(code + "|" + g.pi) ? " open" : ""}><summary class="small"><strong>${esc(pubOf(g.pi)[2])}</strong> <span class="muted">· ${nf(g.xs.length)} ${g.xs.length === 1 ? "comic" : "comics"}${g.nMiss ? ` · <b class="gold">${nf(g.nMiss)}</b> with ${kind === "cont" ? "parts" : "stories"} you're missing` : " · nothing missing"}</span></summary>${g.show.map(x =>
      `<div class="whererow small"><span class="wnum">${esc(String(x.key))}</span><span class="wparts">${partTxt(x)}</span>${tag(x.have)}${x.have ? "" : `<button type="button" class="ghost tiny" data-swish="${x.pi}|${esc(String(x.key))}">Wish</button>`}</div>`).join("")}</details>`).join("")
      + (onlyMiss && allOwned ? `<p class="small muted" style="margin:6px 0 0">${nf(allOwned)} more ${allOwned === 1 ? "series has" : "series have"} only comics with ${kind === "cont" ? "parts" : "stories"} you own: switch the chip off to see them.</p>` : "")
      + (!shownG.length ? `<p class="small muted" style="margin:6px 0 0">You own every ${kind === "cont" ? "part" : "story"} printed in these comics. ✓</p>` : "");
    const inner = `<p class="small muted" style="margin:0">${nf(rows.length)} ${rows.length === 1 ? "comic" : "comics"} in the app's ${nf(SWHERE.pubs.length)} INDUCKS series. <b class="gold">Gold</b> = ${kind === "cont" ? "a part" : "a story"} you don't own yet; comics with the most of them come first.${nowhere ? ` ${nf(nowhere)} of ${nf(parts.length)} ${nowhere === 1 ? "is" : "are"} printed only in series the app has no list for.` : ""}${extra ? ` ${nf(extra)} more INDUCKS ${extra === 1 ? "entry isn't" : "entries aren't"} counted: covers, one-page title pages, or stories printed only in series the app has no list for.` : ""}</p>${body}`;
    const listParts = kind === "cont" && parts.length ? `<details><summary>All ${nf(parts.length)} parts</summary><ol class="partlist small">${parts.map(k => { const w = SWHERE.s.get(k), t = (w && w[0]) || k;
      return `<li>${esc(t)} <span class="muted">${have.read.has(k) ? "read" : have.own.has(k) ? "owned" : have.wish.has(k) ? "on the wishlist" : "missing"}</span></li>`; }).join("")}</ol></details>` : "";
    where = listParts + (rows.length ? `<details class="wherecard"${kind === "setting" ? "" : " open"}><summary><strong>Where to find them</strong></summary>${inner}</details>` : `<p class="small muted" style="margin:0">None of these stories is printed in the app's INDUCKS series.</p>`);
  }
  return `${chips0}${preNote}${prog ? `<div class="small">${prog}</div>` : ""}${where}`;
}
// a wish for a comic from a story series' "Where to find them"; its series is added when it isn't one of yours yet
async function wishFromStory(pi, key) {
  const pub = SWHERE && SWHERE.pubs[pi]; if (!pub) return;
  return wishFromCat(pub[0], pub[2], key);
}
// INDUCKS keys an issue "1984/03" (yearly) or "12" (running), as label_for in build_catalogue.py
const catLabel = num => { num = String(num || "").trim(); const m = /^(\d{4})-(\d{1,3})$/.exec(num); return m ? m[1] + "/" + String(+m[2]).padStart(2, "0") : /^\d+$/.test(num) ? String(+num) : num; };
async function wishFromCat(file, pubTitle, key, ic) {
  const entry = S.catalogue && Object.values(S.catalogue.series || {}).find(x => x.file === file);
  if (!entry) { toast("The catalogue isn't loaded yet: try again in a moment"); return; }
  const f = await catalogueFile(entry).catch(() => null);
  if (f && ic && !(f.issues[key] && storyCode(f.issues[key].ic) === storyCode(ic))) { const k2 = Object.keys(f.issues).find(k => storyCode(f.issues[k].ic) === storyCode(ic)); if (k2) key = k2; }
  const hit = f && f.issues[key];
  if (!hit) { toast("INDUCKS has no issue " + key + " in " + pubTitle); return; }
  const pub = [file, entry.code, pubTitle];
  let se = S.series.find(x => { const e = catEntry(x); return e && e.file === pub[0]; }), made = false;
  if (!se) { se = findSeriesByName(entry.series || entry.title) || newSeriesFor(entry.series || entry.title, []); seriesFromCatalogue(se, f, entry); delete se.pending; made = true; await saveSeries(); }
  const p = parseIssue(se, key);
  const d = Object.assign(blankDraft({ seriesId: se.id, seriesName: se.name, issue: key, status: "wanted", wishLevel: "" }), { issueLabel: p.label, issueSort: p.sort, issueYear: p.year || null, issueNum: p.n });
  await saveMany([applyIssueFromCatalogue(d, key, hit)]);
  toast((se.short || se.name) + " " + p.label + " is on your wishlist" + (made ? " (series added)" : ""));
}
function storyOrigLang(e) {
  if (!SINFO || !e.code) return "";
  return langName(SINFO.lang.get(e.code) || SINFO.def[e.code.split(" ")[0]] || "");
}
const personCountry = name => SINFO && SINFO.people[name] ? countryName(SINFO.people[name]) : "";
// the language a comic is printed in: its own Language field, else its series' language
const LANG_BY_CODE = { ch: "German", at: "German", dk: "Danish", nl: "Dutch", fi: "Finnish", fr: "French", br: "Portuguese", es: "Spanish" };
let _clang = new Map();
function comicLangOf(c) {
  if (_clang.has(c.id)) return _clang.get(c.id);
  const se = c.seriesId && seriesById(c.seriesId);
  const l = c.lang || (se && seriesLang(se)) || (se && LANG_BY_CODE[String(se.country || (se.code || "").split("/")[0] || "").toLowerCase()]) || "";
  _clang.set(c.id, l); return l;
}
function storyIndex(status) {
  _clang = new Map();
  const map = new Map();
  S.comics.forEach(c => {
    if (status === "owned" && c.status === "wanted") return;
    if (status === "wanted" && c.status !== "wanted") return;   // Wishlist: only wishes, not read-not-owned entries
    (c.stories || []).forEach((st, i) => {
      if (!st.title && !st.code) return;
      const code = storyCode(st.code);
      let key = code ? "c:" + code : "x:" + c.id + ":" + i;
      // the same code twice in one comic is one story (the user's wish, 2026-11-21): the chapters of a serial
      // ("… - Capitolo 1", "Teil 2") or Oscar the Ostrich over two weeks of strips. Its title is the part the chapter
      // titles share, and the chapters' pages add up.
      if (map.has(key) && map.get(key).items.includes(c)) {
        const e = map.get(key), t = st.ownTitle ? st.title : st.dTitle || st.title;
        if (e.curC === c) {
          // a Duckipedia title on a later chapter (when the first had none) is the whole story's name:
          // "6. Kapitel: Die Zukunft" carries "Die Chroniken des Planeten T" (2026-11-22)
          if (st.dTitle && !st.ownTitle && !e.ownT && !e.firstD && !e.gotD) {
            e.gotD = true;
            if (e.curT >= 0) e.titles[e.curT] = st.dTitle;
            else if (!e.titles.includes(st.dTitle)) { e.titles.unshift(st.dTitle); e.curT = 0; }
          } else if (t && e.curT >= 0 && !e.ownT && !e.gotD) e.titles[e.curT] = sharedTitle(e.titles[e.curT], t);
          if (parseFloat(st.pages) > 0) { e.curPg += parseFloat(st.pages); if (e.curPg > (e.pages || 0)) e.pages = e.curPg; }
        }
        return;
      }
      let e = map.get(key);
      if (!e) { e = { key, code, titles: [], writers: new Set(), artists: new Set(), chars: new Set(), charLang: new Map(), genre: "", plot: "", original: "", first: "", items: [] }; map.set(key, e); }
      const title = st.ownTitle ? st.title : st.dTitle || st.title; e.curC = c; e.curT = -1; e.ownT = !!st.ownTitle; e.firstD = !!st.dTitle; e.gotD = false;
      if (title && !e.titles.includes(title)) { e.titles.push(title); e.curT = e.titles.length - 1; }
      splitPeople(st.writer).forEach(x => e.writers.add(x)); splitPeople(st.artist).forEach(x => e.artists.add(x));
      const cl = comicLangOf(c);
      splitChars(st.characters).concat(st.hero ? [st.hero] : []).forEach(x => { e.chars.add(x); if (cl) (e.charLang.get(x) || e.charLang.set(x, new Set()).get(x)).add(cl); });
      ["genre", "plot", "original", "first"].forEach(k => { if (!e[k] && st[k]) e[k] = st[k]; });
      // pages: the chapters in one comic add up; the story's length is the largest total of any of your comics
      // (a weekly prints a serial in parts, another comic whole: YM 036 = 1 page per Micky Maus issue, 88 in all)
      e.curPg = parseFloat(st.pages) > 0 ? parseFloat(st.pages) : 0; if (e.curPg > (e.pages || 0)) e.pages = e.curPg;
      if (st.plot && !e.plotFrom && c.duckipedia) e.plotFrom = c.duckipedia;
      e.items.push(c);
    });
  });
  return [...map.values()];
}
// a series' short name, or its initials when none is set: "Donald Duck (Taschenbuch)" -> "DD"
function shortTag(se) {
  if (!se) return "";
  if (se.short) return se.short;
  const w = String(se.name || "").replace(/\s*\([^)]*\)\s*$/, "").split(/[\s&+-]+/).filter(x => /^[A-Za-zÄÖÜÅäöüå0-9]/.test(x));
  return w.length > 1 ? w.map(x => /^\d+$/.test(x) ? x : x[0].toUpperCase()).join("").slice(0, 5) : se.name;
}
function comicTag(c) { const se = seriesById(c.seriesId); return (se ? se.short || se.name : c.seriesName || "") + " " + showLabel(c.issueLabel || c.issue || ""); }
// Stories: three sub tabs like Collection and Gaps – All stories, People (writers, artists, characters), My favourites
VIEWS.stories = {
  html() {
    const st = S.st = S.st || {};
    Object.entries({ q: "", tab: "all", role: "writers", who: null, status: "owned", sort: "title", reprinted: false, rated: false, unread: false, shown: 100, sub: "stories", olang: "", clang: "", pc: "", chl: "", ownf: "" }).forEach(([k, v]) => { if (st[k] === undefined) st[k] = v; });
    if (["writers", "artists", "chars"].includes(st.mode)) { st.role = st.mode; st.tab = "people"; } delete st.mode;
    if (st.sort === "fav") { st.sort = "rating"; st.tab = "fav"; }
    loadStoryInfo();
    if (st.status === "inducks" && !(st.tab === "all" && st.sub !== "series" && !st.who)) st.status = "all";   // People, Favourites, story series: your own stories
    const all = storyIndex(st.status === "inducks" ? "all" : st.status);
    const IND = st.status === "inducks" && st.tab === "all" && st.sub !== "series" && !st.who;   // All INDUCKS search (da-v239)
    if (IND) loadInducksSearch();
    const nFav = all.filter(e => storyRate(e).fav).length;
    st._all = all; st._allFor = st.status;   // the search reuses this list instead of rebuilding it on every key
    const tab = (k, label, n) => `<button role="tab" type="button" data-stab="${k}" aria-selected="${st.tab === k}">${label}${n != null ? ` <span class="muted">${n}</span>` : ""}</button>`;
    const chip = (attr, on, label) => `<button type="button" class="fchip${on ? " on" : ""}" ${attr} aria-pressed="${on}">${label}</button>`;
    const inChips = [["owned", "Owned"], ["wanted", "Wishlist"], ["all", "Both"]].concat(st.tab === "all" && st.sub !== "series" && !st.who ? [["inducks", "All INDUCKS"]] : []).map(([k, l]) => chip(`data-stin="${k}"`, st.status === k, l)).join("");
    const filters = st.tab === "people"
      ? `<div class="fchips">${[["writers", "Writers"], ["artists", "Artists"], ["chars", "Characters"]].map(([k, l]) => chip(`data-role="${k}"`, st.role === k, l)).join("")}</div>`
      : `<div class="fchips">${inChips}${st.tab === "all" && !IND && (st.sub !== "series" || st.who) ? chip('data-strep="1"', st.reprinted, "Reprinted") + chip('data-strated="1"', st.rated, "Rated") + chip('data-stunread="1"', st.unread, "Unread") : ""}</div>`;
    // filter rows (one swipe row each, only values you have): original language + language in your comics on All stories and
    // Favourites; the creator's own country on Writers/Artists; the language of your comics on Characters
    const optRow = (label, attr, cur, counts) => {
      const opts = [...counts].filter(([k]) => k).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      if (opts.length < 2 && !cur) return "";
      return `<div class="fchips swipe"><span class="muted small">${label}</span>${chip(`${attr}=""`, !cur, "All")}${opts.map(([k, n]) => chip(`${attr}="${esc(k)}"`, cur === k, `${esc(k)} <span class="muted">${n}</span>`)).join("")}</div>`;
    };
    const tally = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    let fRows = "";
    if (IND) {}
    else if (st.tab === "people") {
      const m = new Map();
      if (st.role === "chars") { const seen = new Map(); all.forEach(e => e.charLang.forEach((ls, n) => ls.forEach(l => { const k = l + "|" + n; if (!seen.has(k)) { seen.set(k, 1); tally(m, l); } }))); fRows = optRow("In my comics", "data-chl", st.chl, m); }
      else { const seen = new Set(); all.forEach(e => e[st.role].forEach(n => { if (!seen.has(n)) { seen.add(n); tally(m, personCountry(n)); } })); fRows = optRow("Country", "data-pc", st.pc, m); }
    } else {
      const mo = new Map(), mc = new Map();
      all.forEach(e => { tally(mo, storyOrigLang(e)); new Set(e.items.map(comicLangOf)).forEach(l => tally(mc, l)); });
      fRows = optRow("Original", "data-olang", st.olang, mo) + optRow("In my comics", "data-clang", st.clang, mc);
      // owned vs. only read (Read, not owned): only when you have such entries and the wishlist isn't the only thing shown
      if (st.status !== "wanted") { const mh = new Map(); all.forEach(e => tally(mh, storyHave(e))); if (mh.get("Read, not owned") || st.ownf) fRows += optRow("I have it", "data-ownf", st.ownf, mh); }
    }
    const subChips = st.tab === "all" && !st.who ? `<div class="fchips">${chip('data-stsub="stories"', st.sub !== "series", "Stories")}${chip('data-stsub="series"', st.sub === "series", "Story series")}</div>` : "";
    const sortSel = st.tab === "all" && st.sub !== "series" && !IND ? `<label class="inline"><span class="l">Sort</span><select id="stsort">${[["title", "Title"], ["comics", "Most reprinted"], ["code", "Story code"], ["rating", "My rating"]].map(([k, l]) => `<option value="${k}"${st.sort === k ? " selected" : ""}>${l}</option>`).join("")}</select></label><button type="button" class="ghost tiny sortdir big" id="stdir" title="Turn the order round" aria-label="${st.desc ? "Reversed order" : "Usual order"}, tap to turn round">${st.desc ? "↑" : "↓"}</button>` : "";
    const head = `<div><h2>Stories</h2><p class="lede hide-phone">Every story in your comics, counted once even when it's reprinted. Tap a story to see where you have it.</p></div>
      <div class="subtabs three" role="tablist" aria-label="Show">${tab("all", "All stories", all.length)}${tab("people", "People")}${tab("fav", "Favourites", nFav)}</div>
      <div class="stack" style="gap:8px">
        <label class="q"><span class="l visually-hidden">Search</span><input id="stq" type="search" value="${esc(st.q)}" placeholder="${st.tab === "people" ? "Name" : st.sub === "series" && st.tab === "all" ? "Story series, e.g. DoubleDuck" : IND ? "Any story: title, code, writer, artist, character" : "Title, code, writer, artist, character, story series"}"></label>
        ${subChips}
        <div class="row between" style="gap:8px">${filters}${sortSel}</div>${fRows}
        ${st.who && st.tab === "all" ? `<div class="row small"><span class="chip">${esc({ writers: "Writer", artists: "Artist", chars: "Character", series: "Story series" }[st.who.role])}: ${esc(st.who.role === "series" ? seriesNameOf(st.who.name) : st.who.name)}</span><button class="ghost" id="stwhox" type="button">Show all stories</button></div>` : ""}
      </div><div id="stres"></div>`;
    return all.length || st.status !== "owned" ? head : head.replace('<div id="stres"></div>', '<div class="empty"><h3>No stories yet</h3><p>Stories come with "Fill from INDUCKS" or Duckipedia details, or you add them on a comic.</p></div>');
  },
  bind() {
    const st = S.st;
    document.querySelectorAll("[data-stab]").forEach(b => b.onclick = () => { if (st.tab === b.dataset.stab) return; st.tab = b.dataset.stab; st.q = ""; st.shown = 100; if (st.tab !== "all") st.who = null; render(); });
    document.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { st.role = b.dataset.role; st.shown = 100; render(); });
    [["stsub", "sub"], ["olang", "olang"], ["clang", "clang"], ["pc", "pc"], ["chl", "chl"], ["ownf", "ownf"]].forEach(([a, k]) => document.querySelectorAll(`[data-${a}]`).forEach(b => b.onclick = () => { st[k] = b.dataset[a]; st.shown = 100; if (k === "sub") st.q = ""; render(); }));
    document.querySelectorAll("[data-stin]").forEach(b => b.onclick = () => { st.status = b.dataset.stin; st.shown = 100; render(); });
    $("[data-strep]") && ($("[data-strep]").onclick = () => { st.reprinted = !st.reprinted; st.shown = 100; render(); });
    $("[data-stunread]") && ($("[data-stunread]").onclick = () => { st.unread = !st.unread; st.shown = 100; render(); });
    $("[data-strated]") && ($("[data-strated]").onclick = () => { st.rated = !st.rated; if (st.rated && st.sort === "title") st.sort = "rating"; st.shown = 100; render(); });
    // search 0.2 s after the last key, so typing or deleting quickly doesn't redraw the list for every letter
    $("#stq").oninput = e => { st.q = e.target.value; st.shown = 100; clearTimeout(st._t); st._t = setTimeout(drawStories, 200); };
    $("#stsort") && ($("#stsort").onchange = e => { st.sort = e.target.value; drawStories(); });
    $("#stdir") && ($("#stdir").onclick = () => { st.desc = !st.desc; render(); });
    $("#stwhox") && ($("#stwhox").onclick = () => { st.who = null; render(); });
    drawStories();
  }
};
const storyTitle = e => (e.titles[0] || e.code || "").replace(/^\((.*)\)$/, "$1");
// one story: cover of the first comic it's in, title, creators; opens to details, rating and the comics
// ---- All INDUCKS search (da-v239): every comic story in INDUCKS (catalogue/story-search.txt, built from the export),
// where it's printed in German, Swedish, English and Italian (catalogue/story-print/NN.json, loaded per story) ----
let ISRCH = null, isrchBusy = false;
function loadInducksSearch() {
  if (ISRCH || isrchBusy) return; isrchBusy = true;
  Promise.all([fetch("catalogue/story-search-meta.json").then(r => r.ok ? r.json() : null), fetch("catalogue/story-search.txt").then(r => r.ok ? r.text() : null)]).then(([m, t]) => {
    if (!m || !t) { ISRCH = { err: true }; isrchBusy = false; if (S.view === "stories") drawStories(); return; }
    const recs = t.split("\n").filter(Boolean).map(l => l.split("\t")), hay = new Array(recs.length);
    const heroTxt = (m.heroes || []).map(h => h.filter(Boolean).join(" ")), ids = v => v ? v.split(",").map(Number) : [];
    let i = 0;
    // the search text is made in pieces so the phone stays responsive (about 150,000 stories)
    const step = () => {
      const end = Math.min(recs.length, i + 8000);
      for (; i < end; i++) { const r = recs[i];
        hay[i] = norm([r[0], r[1], r[2], r[3], r[4], r[5]].concat(ids(r[6]).map(x => m.people[x]), ids(r[7]).map(x => m.people[x]), ids(r[8]).map(x => heroTxt[x])).join(" ")); }
      if (i < recs.length) { ISRCH = { busy: Math.round(i / recs.length * 100) }; if (S.view === "stories") drawStories(); setTimeout(step, 0); }
      else { ISRCH = { meta: m, recs, hay, prints: {} }; isrchBusy = false; if (S.view === "stories") drawStories(); }
    };
    step();
  }).catch(() => { ISRCH = { err: true }; isrchBusy = false; if (S.view === "stories") drawStories(); });
}
const indTitle = r => r[1] || r[2] || r[3] || r[4] || r[5] || r[0];   // German first, then Swedish, English, Italian, original
function drawInducksSearch(box, words) {
  const st = S.st;
  if (!ISRCH || ISRCH.busy != null) { loadInducksSearch(); box.innerHTML = `<p class="muted small" style="margin:8px 0">${ISRCH && ISRCH.busy != null ? `Preparing the search … ${ISRCH.busy} %` : "Loading every INDUCKS story (about 4 MB, only the first time) …"}</p>`; return; }
  if (ISRCH.err) { box.innerHTML = '<div class="empty"><h3>Not available yet</h3><p>The story list comes with the next catalogue update. Try again later.</p></div>'; return; }
  const m = ISRCH.meta;
  if (words.join("").length < 3) { box.innerHTML = `<p class="muted small" style="margin:8px 0">Search all ${ISRCH.recs.length.toLocaleString("de-CH")} comic stories in INDUCKS: type at least 3 letters of a title (German, Swedish, English, Italian or original), a story code, a writer, an artist or a character.</p>`; return; }
  const hits = []; for (let i = 0; i < ISRCH.hay.length; i++) { const h = ISRCH.hay[i]; if (words.every(w => h.includes(w))) hits.push(i); }
  const have = storyCodeSets(), names = v => (v ? v.split(",").map(x => m.people[+x]) : []).filter(Boolean);
  const mark = c => have.own.has(c) ? '<span class="chip">owned</span>' : have.read.has(c) ? '<span class="chip">read</span>' : have.wish.has(c) ? '<span class="chip wanted">wishlist</span>' : "";
  const row = i => { const r = ISRCH.recs[i], w = names(r[6]), a = names(r[7]), by = w.join(", ") === a.join(", ") ? w.join(", ") : [w.length && "W: " + w.join(", "), a.length && "A: " + a.join(", ")].filter(Boolean).join(" · ");
    return `<details class="storyit indstory" data-ind="${i}"><summary><div style="min-width:0;flex:1"><div class="t">${esc(indTitle(r))} ${mark(storyCode(r[0]))}</div><div class="s small muted">${esc(r[0])}${by ? " · " + esc(by) : ""}${r[9] ? " · " + esc(r[9]) + " p." : ""}${r[10] ? " · " + esc(r[10]) : ""}</div></div></summary><div class="stbody small"><p class="muted" style="margin:0">Loading …</p></div></details>`; };
  box.innerHTML = `<p class="muted small" style="margin:8px 0">${hits.length.toLocaleString("de-CH")} ${hits.length === 1 ? "story" : "stories"} in INDUCKS · tap one to see where it's printed</p>` +
    (hits.length ? '<div class="list">' + hits.slice(0, st.shown).map(row).join("") + "</div>" : "") +
    (hits.length > st.shown ? `<div class="row" style="justify-content:center;margin-top:12px"><button id="stmore">Show more (${hits.length - st.shown} left)</button></div>` : "");
  $("#stmore") && ($("#stmore").onclick = () => { st.shown += 100; drawStories(); });
  box.querySelectorAll("details[data-ind]").forEach(d => d.ontoggle = () => { if (d.open && !d.dataset.done) fillInducksStory(d); });
}
async function fillInducksStory(d) {
  const m = ISRCH.meta, r = ISRCH.recs[+d.dataset.ind], code = storyCode(r[0]), body = d.querySelector(".stbody");
  const shard = [...code].reduce((a, ch) => a + ch.charCodeAt(0), 0) % (m.shards || 64);
  if (!ISRCH.prints[shard]) ISRCH.prints[shard] = await fetch(`catalogue/story-print/${String(shard).padStart(2, "0")}.json`).then(x => x.ok ? x.json() : {}).catch(() => ({}));
  const pr = ISRCH.prints[shard][code] || [], st = issueStatusMap(), names = v => (v ? v.split(",").map(x => m.people[+x]) : []).filter(Boolean);
  const heroes = (r[8] ? r[8].split(",") : []).map(x => (m.heroes[+x] || []).find(Boolean)).filter(Boolean);
  const LN = { de: "German", sv: "Swedish", en: "English", it: "Italian" };
  const titles = (m.langs || ["de", "sv", "en", "it"]).map((l, k) => r[1 + k] ? `${LN[l] || l}: ${esc(r[1 + k])}` : "").filter(Boolean);
  const sers = SINFO ? (SINFO.ser.get(code) || []) : [];
  const groups = {}; pr.forEach(([pi, num, year]) => { const p = m.pubs[pi] || ["", "?", ""]; (groups[p[2]] = groups[p[2]] || []).push({ p, num, year }); });
  const tag = h => h === "owned" ? '<span class="chip">owned</span>' : h === "read" ? '<span class="chip">read, not owned</span>' : h === "wish" ? '<span class="chip wanted">wishlist</span>' : "";
  const printed = Object.keys(groups).sort((a, b) => ["de", "sv", "en", "it"].indexOf(a) - ["de", "sv", "en", "it"].indexOf(b)).map(l => `<div class="wheregroup"><div><strong>${esc(LN[l] || l)}</strong> <span class="muted">${groups[l].length}</span></div>${groups[l].map(x => {
      const h = x.p[3] ? st.get(x.p[3] + "|" + catLabel(x.num)) || "" : "";
      return `<div class="whererow"><span class="wparts">${esc(x.p[1])} ${esc(x.num)}${x.year ? ` <span class="muted">(${esc(x.year)})</span>` : ""}</span>${tag(h)}${!h && x.p[3] ? `<button type="button" class="ghost tiny" data-iwish="${esc(x.p[3])}|${esc(catLabel(x.num))}|${esc(x.p[0] + " " + x.num)}|${esc(x.p[1])}">Wish</button>` : ""}</div>`; }).join("")}</div>`).join("");
  const noCat = pr.filter(([pi]) => !(m.pubs[pi] || [])[3]).length;
  body.innerHTML = `${titles.length ? `<div><span class="muted">Titles:</span> ${titles.join(" · ")}</div>` : ""}
    ${r[5] ? `<div><span class="muted">Original title:</span> ${esc(r[5])}</div>` : ""}
    <div><span class="muted">Story code:</span> <a class="mono" href="https://inducks.org/story.php?c=${encodeURIComponent(r[0])}" target="_blank" rel="noopener">${esc(r[0])}</a>${r[10] ? ` · <span class="muted">first printed</span> ${esc(r[10])}` : ""}${r[11] ? ` · ${esc(langName(r[11]))}` : ""}</div>
    ${names(r[6]).length ? `<div><span class="muted">Writer:</span> ${esc(names(r[6]).join(", "))}</div>` : ""}
    ${names(r[7]).length ? `<div><span class="muted">Artist:</span> ${esc(names(r[7]).join(", "))}</div>` : ""}
    ${heroes.length ? `<div><span class="muted">Characters:</span> ${esc(heroes.join(", "))}</div>` : ""}
    ${sers.length ? `<div><span class="muted">Story series:</span> ${sers.map(c => `<button class="link" data-ser="${esc(c)}">${esc(seriesNameOf(c))}</button>`).join(", ")}</div>` : ""}
    <div style="margin-top:6px"><strong>Printed in German, Swedish, English and Italian</strong></div>
    ${printed || '<p class="muted" style="margin:0">Never printed in these four languages.</p>'}
    ${noCat ? `<p class="muted" style="margin:4px 0 0">Comics without a Wish button are in series whose issue list isn't in the catalogue yet.</p>` : ""}`;
  d.dataset.done = "1";
  body.querySelectorAll("[data-iwish]").forEach(b => b.onclick = async e => { e.preventDefault(); b.disabled = true; const [file, key, ic, title] = b.dataset.iwish.split("|");
    try { await wishFromCat(file, title, key, ic); } catch (er) { toast(errText(er)); } d.dataset.done = ""; fillInducksStory(d); });
  body.querySelectorAll("[data-ser]").forEach(b => b.onclick = () => { S.st.who = { role: "series", name: b.dataset.ser }; S.st.sub = "stories"; S.st.status = "all"; S.st.q = ""; S.st.shown = 100; render(); window.scrollTo(0, 0); });
}
function storyRow(e) {
  const people = [[...e.writers].join(", "), [...e.artists].join(", ")];
  const by = people[0] && people[0] === people[1] ? people[0] : [people[0] && "W: " + people[0], people[1] && "A: " + people[1]].filter(Boolean).join(" · ");
  const plotSrc = e.plot && e.plotFrom ? ` <span class="muted">(<a href="${esc(e.plotFrom.url)}" target="_blank" rel="noopener">Duckipedia</a>, GFDL 1.2, <a href="${esc(e.plotFrom.authors)}" target="_blank" rel="noopener">authors</a>)</span>` : "";
  const sr = storyRate(e), sk = storyKey(e), first = e.items.find(c => coverOf(c)), cv = first && coverOf(first);
  return `<details class="storyit"><summary>${cv ? `<span class="sthumb"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('none');this.remove()"></span>` : `<span class="sthumb none"></span>`}<div style="min-width:0;flex:1"><div class="t">${sr.fav ? '<span style="color:#c8102e">♥</span> ' : ""}${esc(storyTitle(e) || "Untitled")}${+sr.rating ? ` <span class="chip rate">${ratingTxt(sr.rating)}</span>` : ""}</div><div class="s">${esc(by || "Creators unknown")}</div></div><span class="chip${e.items.length > 1 ? " trade" : ""}">${e.items.length > 1 ? "×" + e.items.length : esc(comicTag(e.items[0]))}</span></summary>
    <div class="stbody small">
      <div class="row" style="gap:10px;align-items:center">${heartHtml(sr.fav, `data-sfav="${esc(sk)}"`)}<span class="muted" style="min-width:56px">Overall</span>${starsHtml(sr.rating, `data-sk="${esc(sk)}" aria-label="Overall rating"`)}</div>
      <div class="row" style="gap:10px;align-items:center"><span class="heart" style="visibility:hidden" aria-hidden="true">♡</span><span class="muted" style="min-width:56px">Writing</span>${starsHtml(sr.writing, `data-sk="${esc(sk)}" data-sr="writing" aria-label="Writing rating"`)}</div>
      <div class="row" style="gap:10px;align-items:center"><span class="heart" style="visibility:hidden" aria-hidden="true">♡</span><span class="muted" style="min-width:56px">Art</span>${starsHtml(sr.art, `data-sk="${esc(sk)}" data-sr="art" aria-label="Art rating"`)}</div>
      ${e.titles.length > 1 ? `<div><span class="muted">Also titled:</span> ${e.titles.slice(1).map(esc).join(" · ")}</div>` : ""}
      ${e.original ? `<div><span class="muted">Original title:</span> ${esc(e.original)}</div>` : ""}
      ${storySeriesOf(e).length ? `<div><span class="muted">Story series:</span> ${storySeriesOf(e).map(c => `<button class="link" data-ser="${esc(c)}">${esc(seriesNameOf(c))}</button>`).join(", ")}</div>` : ""}
      ${storyOrigLang(e) ? `<div><span class="muted">Original language:</span> ${esc(storyOrigLang(e))}</div>` : ""}
      ${e.code ? `<div><span class="muted">Story code:</span> <a class="mono" href="https://inducks.org/story.php?c=${encodeURIComponent(e.code)}" target="_blank" rel="noopener">${esc(e.code)}</a>${e.first ? ` · <span class="muted">first published</span> ${esc(dateEn(niceDate(e.first)))}` : ""}</div>` : ""}
      ${e.writers.size ? `<div><span class="muted">Writer:</span> ${[...e.writers].map(n => `<button class="link" data-person="writers" data-n="${esc(n)}">${esc(n)}</button>`).join(", ")}</div>` : ""}
      ${e.artists.size ? `<div><span class="muted">Artist:</span> ${[...e.artists].map(n => `<button class="link" data-person="artists" data-n="${esc(n)}">${esc(n)}</button>`).join(", ")}</div>` : ""}
      ${e.chars.size ? `<div><span class="muted">Characters:</span> ${[...e.chars].map(n => `<button class="link" data-person="chars" data-n="${esc(n)}">${esc(n)}</button>`).join(", ")}</div>` : ""}
      ${e.genre ? `<div><span class="muted">Genre:</span> ${esc(storyGenreEn(e.genre))}</div>` : ""}
      ${e.plot ? `<p class="stplot">${esc(e.plot)}${plotSrc}</p>` : ""}
      <div class="row" style="gap:6px">${e.items.map(c => `<button class="chipbtn${c.status === "wanted" ? " wanted" : ""}" data-open="${esc(c.id)}">${esc(comicTag(c))}${c.status === "wanted" ? " · wishlist" : notOwned(c) ? " · read, not owned" : ""}</button>`).join("")}</div>
    </div></details>`;
}
// how you have a story: in a comic you own, or only read (Read, not owned); wishlist-only stories count as neither
// a story counts as read once a comic it's in is marked read (owned or read without owning), as in Stats › Stories read
const storyRead = e => e.items.some(c => c.read && isMine(c));
function storyHave(e) { return e.items.some(c => isOwn(c)) ? "Owned" : e.items.some(c => notOwned(c)) ? "Read, not owned" : ""; }
function drawStories() {
  const box = $("#stres"); if (!box) return;
  const st = S.st, q = norm(st.q), words = q ? q.split(" ") : [];
  if (st.status === "inducks" && st.tab === "all" && st.sub !== "series" && !st.who) { drawInducksSearch(box, words); return; }
  const all = st._all && st._allFor === st.status ? st._all : storyIndex(st.status === "inducks" ? "all" : st.status);
  const more = n => n > st.shown ? `<div class="row" style="justify-content:center;margin-top:12px"><button id="stmore">Show more (${n - st.shown} left)</button></div>` : "";
  const cmpT = (a, b) => storyTitle(a).localeCompare(storyTitle(b), "de", { numeric: true });
  if (st.tab === "people") {
    const role = st.role, counts = new Map();
    all.forEach(e => e[role].forEach(n => {
      if (role === "chars" && st.chl && !(e.charLang.get(n) || new Set()).has(st.chl)) return;
      if (role !== "chars" && st.pc && personCountry(n) !== st.pc) return;
      const x = counts.get(n) || { n, stories: 0, comics: new Set() }; x.stories++;
      e.items.forEach(c => { if (role !== "chars" || !st.chl || comicLangOf(c) === st.chl) x.comics.add(c.id); }); counts.set(n, x);
    }));
    const list = [...counts.values()].filter(x => words.every(w => norm(x.n).includes(w))).sort((a, b) => b.stories - a.stories || a.n.localeCompare(b.n, "de", { numeric: true }));
    const word = { writers: ["writer", "writers"], artists: ["artist", "artists"], chars: ["character", "characters"] }[role];
    box.innerHTML = `<p class="muted small" style="margin:8px 0">${list.length} ${list.length === 1 ? word[0] : word[1]}</p>` +
      (list.length ? '<div class="list">' + list.slice(0, st.shown).map(x => `<button class="folder" data-who="${esc(x.n)}"><div style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${x.stories} ${x.stories === 1 ? "story" : "stories"} · in ${x.comics.size} ${x.comics.size === 1 ? "comic" : "comics"}${role !== "chars" && personCountry(x.n) ? " · " + esc(personCountry(x.n)) : ""}</div></div><span class="count">${x.stories}</span><span class="chev" aria-hidden="true">›</span></button>`).join("") + '</div>' : '<div class="empty"><h3>Nobody found</h3><p>Try another name.</p></div>') + more(list.length);
    box.querySelectorAll("[data-who]").forEach(b => b.onclick = () => { st.who = { role, name: b.dataset.who }; st.tab = "all"; st.q = ""; st.shown = 100; render(); window.scrollTo(0, 0); });
  } else {
    let list = all;
    let person = "";
    if (st.olang) list = list.filter(e => storyOrigLang(e) === st.olang);
    if (st.clang) list = list.filter(e => e.items.some(c => comicLangOf(c) === st.clang));
    if (st.ownf) list = list.filter(e => storyHave(e) === st.ownf);
    if (st.tab === "all" && st.sub === "series" && !st.who) {
      // Story series: every series your stories belong to, with how many stories and comics
      const m = new Map();
      list.forEach(e => storySeriesOf(e).forEach(code => { const x = m.get(code) || { code, n: seriesNameOf(code), stories: 0, comics: new Set() }; x.stories++; e.items.forEach(c => x.comics.add(c.id)); m.set(code, x); }));
      const ser = [...m.values()].filter(x => { const t = norm([x.n, x.code].concat((SINFO.series[x.code] || {}).a || []).join(" ")); return words.every(w => t.includes(w)); })
        .filter(x => !st.skind || (st.skind === "none" ? !storyKindOf(x.code) : storyKindOf(x.code) === st.skind))
        .sort((a, b) => b.stories - a.stories || a.n.localeCompare(b.n, "de", { numeric: true }));
      // filter by kind (da-v237)
      const kchip = (k, l) => `<button type="button" class="fchip${(st.skind || "") === k ? " on" : ""}" data-skf="${k}" aria-pressed="${(st.skind || "") === k}">${l}</button>`;
      const kinds = SINFO ? `<div class="fchips" role="group" aria-label="Kind" style="margin-top:8px">${kchip("", "All kinds")}${STORY_KINDS.map(([k, l]) => kchip(k, l)).join("")}${kchip("none", "Not set")}</div>` : "";
      box.innerHTML = !SINFO ? `<p class="muted small" style="margin:8px 0">${sinfoMissing ? "The story series come with the next catalogue update (INDUCKS couldn't be reached)." : "Loading the story series …"}</p>`
        : kinds + `<p class="muted small" style="margin:8px 0">${ser.length} story ${ser.length === 1 ? "series" : "series"}</p>` + (ser.length ? '<div class="list">' + ser.slice(0, st.shown).map(x => { const al = ((SINFO.series[x.code] || {}).a || []).slice(0, 3).join(" · "); return `<button class="folder" data-ser="${esc(x.code)}"><div style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${storyKindOf(x.code) ? esc(storyKindLabel(storyKindOf(x.code))) + " · " : ""}${x.stories} ${x.stories === 1 ? "story" : "stories"} · in ${x.comics.size} ${x.comics.size === 1 ? "comic" : "comics"}${al ? " · " + esc(al) : ""}</div></div><span class="count">${x.stories}</span><span class="chev" aria-hidden="true">›</span></button>`; }).join("") + '</div>' : '<div class="empty"><h3>No story series found</h3><p>Try another name, or tap All in the rows above.</p></div>') + more(ser.length);
      box.querySelectorAll("[data-ser]").forEach(b => b.onclick = () => { st.who = { role: "series", name: b.dataset.ser }; st.sub = "stories"; st.q = ""; st.shown = 100; render(); window.scrollTo(0, 0); });
      box.querySelectorAll("[data-skf]").forEach(b => b.onclick = () => { st.skind = b.dataset.skf; st.shown = 100; drawStories(); });
      $("#stmore") && ($("#stmore").onclick = () => { st.shown += 200; drawStories(); });
      return;
    }
    if (st.who) {
      list = st.who.role === "series" ? list.filter(e => storySeriesOf(e).includes(st.who.name)) : list.filter(e => e[st.who.role].has(st.who.name));
      // their page: how many stories and comics, which years, and the comics themselves
      const cm = new Map(); list.forEach(e => e.items.forEach(c => cm.set(c.id, c)));
      const cs = [...cm.values()].sort((a, b) => comicTag(a).localeCompare(comicTag(b), "de", { numeric: true }));
      const own = cs.filter(c => isOwn(c)).length, yrs = list.map(e => +String(e.first || "").slice(0, 4)).filter(y => y > 1900).sort((a, b) => a - b);
      const role = { writers: "Writer", artists: "Artist", chars: "Character", series: "Story series" }[st.who.role] + (st.who.role !== "chars" && st.who.role !== "series" && personCountry(st.who.name) ? " · " + personCountry(st.who.name) : "");
      const al = st.who.role === "series" && SINFO ? ((SINFO.series[st.who.name] || {}).a || []).join(" · ") : "";
      person = `<div class="card stack small personcard"><h3 style="margin:0">${esc(st.who.role === "series" ? seriesNameOf(st.who.name) : st.who.name)}</h3>${al ? `<div class="muted">Also called: ${esc(al)}</div>` : ""}
        <div class="muted">${role} · ${list.length} ${list.length === 1 ? "story" : "stories"} in ${cs.length} ${cs.length === 1 ? "comic" : "comics"}${own < cs.length ? " (" + [own + " owned", cs.filter(c => c.status === "wanted").length + " on the wishlist", cs.filter(notOwned).length + " read, not owned"].filter(x => !/^0 /.test(x)).join(", ") + ")" : ""}${yrs.length ? " · first published " + yrs[0] + (yrs[yrs.length - 1] !== yrs[0] ? "–" + yrs[yrs.length - 1] : "") : ""}</div>
        <details><summary>The comics (${cs.length})</summary><div class="row" style="gap:6px;margin-top:6px">${cs.map(c => `<button class="chipbtn${c.status === "wanted" ? " wanted" : ""}" data-open="${esc(c.id)}">${esc(comicTag(c))}</button>`).join("")}</div></details>${st.who.role === "series" ? storySeriesCard(st.who.name) : ""}</div>`;
    }
    // each story's search text is made once per list, not on every key
    if (words.length) list = list.filter(e => { const t = e._q || (e._q = norm([e.titles.join(" "), e.code, e.original, [...e.writers].join(" "), [...e.artists].join(" "), [...e.chars].join(" "), e.items.map(comicTag).join(" "), storySeriesOf(e).map(c => [seriesNameOf(c)].concat((SINFO.series[c] || {}).a || []).join(" ")).join(" ")].join(" "))); return words.every(w => t.includes(w)); });
    let html = "";
    if (st.tab === "fav") {
      // only hearted stories, grouped by your stars (rated stories without a heart: All stories › Rated)
      list = list.filter(e => storyRate(e).fav);
      const groups = new Map();
      list.forEach(e => { const r = +storyRate(e).rating || 0; (groups.get(r) || groups.set(r, []).get(r)).push(e); });
      const parts = [...groups.keys()].sort((a, b) => b - a).map(r => [r ? "♥ " + ratingTxt(r) : "♥ No stars", groups.get(r).sort(cmpT)]);
      let left = st.shown, total = list.length;
      html = `<p class="muted small" style="margin:8px 0">${total} ${total === 1 ? "favourite" : "favourites"} · stories you rated without a heart: All stories › Rated</p>` +
        (total ? parts.map(([h, xs]) => { if (left <= 0) return ""; const shown = xs.slice(0, left); left -= shown.length; return `<h3 class="listhead">${esc(h)} <span class="muted">${xs.length}</span></h3><div class="list">${shown.map(storyRow).join("")}</div>`; }).join("")
          : '<div class="empty"><h3>No favourites yet</h3><p>Open a story under All stories and tap the heart.</p></div>') + more(total);
    } else {
      if (st.reprinted) list = list.filter(e => e.items.length > 1);
      if (st.rated) list = list.filter(e => { const r = storyRate(e); return +r.rating > 0 || +r.writing > 0 || +r.art > 0; });
      if (st.unread) list = list.filter(e => !storyRead(e));
      list = list.slice().sort(st.sort === "rating" ? (a, b) => (+storyRate(b).rating || 0) - (+storyRate(a).rating || 0) || cmpT(a, b) : st.sort === "comics" ? (a, b) => b.items.length - a.items.length || cmpT(a, b) : st.sort === "code" ? (a, b) => (a.code || "~").localeCompare(b.code || "~", "en", { numeric: true }) : cmpT);
      if (st.desc) list.reverse();   // ↑: the order turned round (lowest rating, fewest reprints, Z to A)
      const reprints = list.filter(e => e.items.length > 1).length;
      html = `<p class="muted small" style="margin:8px 0">${list.length} ${list.length === 1 ? "story" : "stories"}${reprints && !st.reprinted ? " · " + reprints + " of them in more than one comic" : ""}</p>` +
        (list.length ? '<div class="list">' + list.slice(0, st.shown).map(storyRow).join("") + '</div>' : '<div class="empty"><h3>No stories match</h3><p>Try another search word, or tap Owned, Wishlist or Both.</p></div>') + more(list.length);
    }
    box.innerHTML = person + html;
    box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
    // story series page (da-v237): its kind, and wishes straight from "Where to find them"
    box.querySelectorAll("[data-skind]").forEach(b => b.onclick = async () => { await setStoryKind(st.who.name, b.dataset.skind); drawStories(); });
    $("[data-swall]") && ($("[data-swall]").onclick = () => { S.stWhereAll = !S.stWhereAll; drawStories(); });
    box.querySelectorAll("details[data-wpi]").forEach(d => d.ontoggle = () => { const k = (st.who || {}).name + "|" + d.dataset.wpi, o = S.stWhereOpen || (S.stWhereOpen = new Set()); if (d.open) o.add(k); else o.delete(k); });
    box.querySelectorAll("[data-swish]").forEach(b => b.onclick = async () => { b.disabled = true; const i = b.dataset.swish.indexOf("|");
      try { await wishFromStory(+b.dataset.swish.slice(0, i), b.dataset.swish.slice(i + 1)); } catch (e) { toast(errText(e)); } drawStories(); });
    box.querySelectorAll("[data-sfav]").forEach(b => b.onclick = async () => {
      const k = b.dataset.sfav, on = !(S.storyRatings[k] || {}).fav;
      b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡";
      try { await setStoryRate(k, { fav: on }); } catch (e) { toast(errText(e)); }
    });
    bindStars(box, async (v, el) => { try { await setStoryRate(el.dataset.sk, { [el.dataset.sr || "rating"]: v }); } catch (e) { toast(errText(e)); } });
    box.querySelectorAll("[data-ser]").forEach(b => b.onclick = () => { st.who = { role: "series", name: b.dataset.ser }; st.tab = "all"; st.sub = "stories"; st.q = ""; st.shown = 100; render(); window.scrollTo(0, 0); });
    box.querySelectorAll("[data-person]").forEach(b => b.onclick = () => { st.who = { role: b.dataset.person, name: b.dataset.n }; st.tab = "all"; st.q = ""; st.shown = 100; render(); window.scrollTo(0, 0); });
  }
  $("#stmore") && ($("#stmore").onclick = () => { st.shown += 200; drawStories(); });
}
// ---- Backup ----
function stampDate(d) { return d ? new Date(d).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }) : ""; }
function daysSince(d) { return d ? Math.floor((Date.now() - new Date(d)) / 864e5) : Infinity; }
function showBackupNote(msg) { const n = $("#bnote"); if (n) { n.textContent = msg; n.hidden = false; } else toast(msg); }
// everything a backup holds: comics, series and every setting (cover pictures and exchange-rate downloads come back by themselves)
function backupData() {
  return { app: "dagobert-archiv", format: 1, exported: new Date().toISOString(), series: S.series, comics: S.comics, storyRatings: S.storyRatings, bookSizes: S.bookSizes, bookSeriesInfo: S.bookMeta, valueRules: S.valueRules, gradeFactors: S.gradeFactors, valueHistory: S.valueHistory, bookSeriesExtra: S.bookSeriesExtra,
    groupKeep: S.groupKeep, priceBatchDone: S.priceBatchDone || [], storyKinds: S.storyKinds || {}, todoHidden: S.todoHidden || [], barcodes: S.barcodes, barcodeYears: S.barcodeYears, recentSeries: S.recentSeries, lastSeries: S.lastSeries, rates: S.rates };
}
// entries changed or added since the last backup
function changedSinceBackup() { const t = S.lastBackup || ""; return S.comics.filter(c => !t || String(c.updatedAt || c.createdAt || "") > t).length; }
// what a backup holds next to what is on this phone, so you can see a restore brings everything back
function backupCompare(b) {
  const n = x => Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.keys(x).length : 0;
  const rows = [
    ["Entries", b.comics, S.comics], ["… of them owned", (b.comics || []).filter(c => c && isOwn(c)), S.comics.filter(c => isOwn(c))],
    ["… on the wishlist", (b.comics || []).filter(c => c && c.status === "wanted"), S.comics.filter(c => c.status === "wanted")],
    ["… read, not owned", (b.comics || []).filter(c => c && notOwned(c)), S.comics.filter(c => notOwned(c))],
    ["Series", b.series, S.series], ["Price ranges", b.valueRules, S.valueRules], ["Own condition factors", b.gradeFactors, S.gradeFactors],
    ["Story ratings", b.storyRatings, S.storyRatings], ["Book series info", b.bookSeriesInfo, S.bookMeta], ["Empty book series", b.bookSeriesExtra, S.bookSeriesExtra],
    ["Volumes per book series", b.bookSizes, S.bookSizes], ["Group choices", b.groupKeep, S.groupKeep], ["Learned barcodes", b.barcodes, S.barcodes], ["Months of value history", b.valueHistory, S.valueHistory]
  ];
  const ratesTxt = b.rates ? (b.rates.manual ? "yes, your own" : "yes") : "no";
  return `<table class="cmp small"><thead><tr><th></th><th>In backup</th><th>On this phone</th></tr></thead><tbody>${rows.map(([k, x, y]) => { const a = n(x), p = n(y); return `<tr${a < p ? ' class="less"' : ""}><td>${k}</td><td>${a.toLocaleString("de-CH")}</td><td>${p.toLocaleString("de-CH")}</td></tr>`; }).join("")}
    <tr><td>Exchange rates</td><td>${ratesTxt}</td><td>${S.rates ? "yes" : "no"}</td></tr></tbody></table>
    <p class="small muted" style="margin:0">Nothing changes until you tap Restore. Restoring adds what's missing and keeps what's on this phone (an entry you changed here after the backup stays as it is)${rows.some(([, x, y]) => n(x) < n(y)) ? "; rows in red have more on the phone than in the backup" : ""}.</p>`;
}
function backupFile(asText) {
  const data = JSON.stringify(backupData());
  const name = "dagobert-backup-" + new Date().toISOString().slice(0, 10) + (asText ? ".txt" : ".json");
  return new File([data], name, { type: asText ? "text/plain" : "application/json" });
}
// data: links work in Chrome and in DuckDuckGo / other WebView browsers, which ignore blob: downloads
function saveToDevice(file) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const a = document.createElement("a");
      a.href = String(r.result).replace(/^data:[^;,]*/, "data:application/octet-stream"); a.download = file.name;
      document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 2000); res();
    };
    r.onerror = () => res();
    r.readAsDataURL(file);
  });
}
// backup as text: compressed and copied to the clipboard, for browsers that can neither share nor download
const TEXT_PREFIX = "DAGOBERT-BACKUP-1:";
async function backupText() {
  const json = JSON.stringify(backupData());
  let bytes = new TextEncoder().encode(json), gz = false;
  if (typeof CompressionStream !== "undefined") {
    bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer()); gz = true;
  }
  let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return TEXT_PREFIX + (gz ? "gz:" : "raw:") + btoa(bin);
}
async function readBackupText(txt) {
  const t = String(txt || "").trim();
  if (!t.startsWith(TEXT_PREFIX)) return t;   // a plain backup file
  const body = t.slice(TEXT_PREFIX.length), gz = body.startsWith("gz:");
  const bin = atob(body.replace(/^(gz|raw):/, "").replace(/\s+/g, ""));
  const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
  if (!gz) return new TextDecoder().decode(bytes);
  return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}
async function markBackedUp() { S.lastBackup = new Date().toISOString(); try { await setConfig("lastBackup", S.lastBackup); } catch (e) {} }
function csvFile() {
  const cols = ["type", "series", "issue", "status", "title", "date", "grade", "copies", "pricePaid", "currency", "value", "purchaseDate", "source", "location", "read", "forTrade", "notes", "author", "publisher", "isbn", "format", "language", "stories", "edition", "rating", "readDate", "valueChecked", "link", "words"];
  const rows = sortComics(S.comics).map(c => { const se = seriesById(c.seriesId); return [c.kind === "book" ? (isNovel(c) ? "book" : "comic book") : "comic", se ? se.name : c.seriesName, c.issueLabel || c.issue, c.status, c.title, c.date, c.grade, c.copies, amtVal(c.pricePaid), c.currency, amtVal(c.value), c.purchaseDate, c.source, c.location, c.read ? "yes" : "no", c.forTrade ? "yes" : "no", c.notes, c.author, c.publisher, c.isbn, c.format, c.lang, (c.stories || []).map(s => [s.title, s.code, s.writer, s.artist].filter(Boolean).join(" | ")).join(" ;; "), c.edition || "", c.rating || "", c.readDate || "", amtVal(c.valueChecked), c.link || "", c.words || ""]; });
  const csv = Papa.unparse({ fields: cols, data: rows });
  return new File(["﻿" + csv], "dagobert-archiv-table-" + new Date().toISOString().slice(0, 10) + ".csv", { type: "text/csv" });
}
// ---- Insurance list: everything you own with condition and value in CHF, as a table or to print / save as PDF ----
function insuranceRows() {
  const gl = g => (GRADES.find(x => x[0] === g) || [, ""])[1];
  return sortComics(S.comics.filter(c => isOwn(c))).map(c => {
    const se = seriesById(c.seriesId), v = valueOf(c), n = c.copies || 1, each = v ? toCHF(v.amount, v.cur) : null;
    return { what: c.kind === "book" && isNovel(c) ? [c.author, c.title].filter(Boolean).join(": ") : comicTag(c) + (c.title ? " – " + c.title : ""), series: se ? se.name : c.seriesName || "",
      grade: gl(c.grade) || "", copies: n, each, total: each == null ? null : each * n, paid: typeof c.pricePaid === "number" ? fmt2(c.pricePaid * n) + " " + (c.currency || "CHF") : "",
      bought: [c.purchaseDate, c.source].filter(Boolean).join(", "), extras: (c.extras || []).map(x => x.what).filter(Boolean).join(", "), how: v ? { checked: "checked", table: "price table", estimate: "estimate" }[v.how] || "" : "" };
  });
}
function insuranceCsv() {
  const rows = insuranceRows(), d = new Date().toISOString().slice(0, 10);
  const csv = Papa.unparse({ fields: ["Item", "Series", "Condition", "Copies", "Value each (CHF)", "Value (CHF)", "Value from", "Price paid", "Bought (date, from)", "Extras"],
    data: rows.map(r => [r.what, r.series, r.grade, r.copies, r.each == null ? "" : r.each.toFixed(2), r.total == null ? "" : r.total.toFixed(2), r.how, r.paid, r.bought, r.extras]) });
  return new File(["\ufeff" + csv], "insurance-list-" + d + ".csv", { type: "text/csv" });
}
function printInsurance() {
  const rows = insuranceRows(), sum = rows.reduce((a, r) => a + (r.total || 0), 0), none = rows.filter(r => r.total == null).length;
  let box = $("#printbox"); if (!box) { box = document.createElement("div"); box.id = "printbox"; document.body.appendChild(box); }
  box.innerHTML = `<h1>Collection – insurance list</h1><p>${esc(stampDate(new Date().toISOString()))} · ${rows.length} entries · total value CHF ${fmt2(sum)}${none ? " (" + none + " without a value)" : ""}</p>
    <table><thead><tr><th>Item</th><th>Condition</th><th>Copies</th><th>Value CHF</th><th>Paid</th><th>Bought</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.what)}${r.extras ? "<br><small>+ " + esc(r.extras) + "</small>" : ""}</td><td>${esc(r.grade)}</td><td>${r.copies}</td><td>${r.total == null ? "–" : fmt2(r.total)}</td><td>${esc(r.paid)}</td><td>${esc(r.bought)}</td></tr>`).join("")}</tbody></table>`;
  document.body.classList.add("printing");
  const done = () => { document.body.classList.remove("printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done); setTimeout(done, 60000);
  window.print();
}
VIEWS.backup = {
  html() {
    const n = S.comics.length, days = daysSince(S.lastBackup);
    const mb = S.usage ? (S.usage / 1048576).toFixed(1) + " MB" : "";
    const canShare = !!(navigator.share && navigator.canShare);
    const status = !n ? "" : days === Infinity ? '<div class="banner warn">You haven\'t made a backup yet. If this phone is lost or reset, the archive goes with it.</div>'
      : days > 14 || changedSinceBackup() >= 25 ? `<div class="banner warn">Your last backup is ${days === 0 ? "from today" : days + (days === 1 ? " day" : " days") + " old"}${changedSinceBackup() ? ", and " + changedSinceBackup() + " entries changed since" : ""}.</div>` : "";
    return `
      <div><h2>Backup</h2><p class="lede">Your archive is stored only on this phone and works without internet. Keep a copy on your PC in case the phone is lost, reset or replaced.</p></div>
      ${status}
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(105px,1fr))">
        <div class="card stat"><div class="v">${n.toLocaleString("de-CH")}</div><div class="k">entries on this phone: ${(k => k.owned + " owned · " + k.wanted + " on wishlist" + (k.read ? " · " + k.read + " read, not owned" : ""))({ owned: S.comics.filter(c => isOwn(c)).length, wanted: S.comics.filter(c => c.status === "wanted").length, read: S.comics.filter(c => notOwned(c)).length })}</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${S.lastBackup ? esc(stampDate(S.lastBackup)) : "Never"}</div><div class="k">last backup</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${S.persisted ? "Protected" : "Not yet"}</div><div class="k">${S.persisted ? "Android won't clear this data on its own" : "requested on first save"}${mb ? " · " + mb + " used" : ""}</div></div>
      </div>
      <div class="card stack"><h3>Make a backup</h3>
        <p class="small muted" style="margin:0">The backup file holds every comic, story and setting. ${canShare ? "“Send backup” lets you pick Google Drive, Gmail or Quick Share to get it to your PC." : ""}</p>
        <div class="row">
          ${canShare ? `<button class="primary" id="bshare"${n ? "" : " disabled"}>Send backup…</button>` : ""}
          <button ${canShare ? "" : 'class="primary" '}id="bsave"${n ? "" : " disabled"}>Save backup to Downloads</button>
          <button id="bcsv"${n ? "" : " disabled"}>Save table for Excel (.csv)</button>
          <button id="binsc"${n ? "" : " disabled"}>Insurance list (.csv)</button><button id="binsp"${n ? "" : " disabled"}>Insurance list: print / PDF</button>
        </div>
        <div class="banner warn" id="bnote" hidden></div>
        <details class="card" style="padding:12px"><summary><strong>Downloads don't work in my browser</strong></summary>
          <div class="stack" style="margin-top:10px">
            <p class="small" style="margin:0">Copy the whole archive as text instead, then paste it into an email to yourself (Gmail) and send it. The text is long (about ${Math.max(1, Math.round(JSON.stringify(S.comics).length / 3 / 1048576 * 10) / 10)} MB): too long for a Google Keep note or a Google Docs document, so “Save backup to Downloads” is safer when it works. To restore, paste that text under Restore.</p>
            <div class="row"><button class="primary" id="bcopy"${n ? "" : " disabled"}>Copy backup as text</button></div>
            <textarea id="bcopybox" class="mono" rows="4" readonly hidden></textarea>
          </div></details></div>
      <div class="card stack"><h3>Getting the file to your Windows PC</h3>
        <div class="small" style="display:grid;gap:8px;max-width:68ch">
          <div><strong>Google Drive:</strong> Send backup, choose Drive, then download it on the PC from drive.google.com.</div>
          <div><strong>Quick Share:</strong> with Google's Quick Share app for Windows installed, Send backup and pick your PC.</div>
          <div><strong>USB cable:</strong> Save backup to Downloads, connect the phone, and copy the file from the phone's Download folder.</div>
        </div></div>
      <div class="card stack"><h3>Restore</h3>
        <p class="small muted" style="margin:0">Load a backup on a new phone or after a reset, or load a converted CLZ file. Nothing is deleted.</p>
        <label class="filepick" for="restore"><span class="btn primary">Choose file…</span><span class="small muted">Look in Downloads. Any file can be picked; the app checks it before loading anything.</span></label>
        <input id="restore" type="file" class="visually-hidden">
        <details><summary class="small"><strong>Restore from copied text</strong></summary>
          <div class="stack" style="margin-top:8px"><textarea id="restoretext" rows="4" placeholder="Paste the text that starts with DAGOBERT-BACKUP"></textarea>
          <div class="row"><button id="restoretextgo">Check pasted text</button></div></div></details>
        <div id="restoreBox"></div></div>`;
  },
  bind() {
    $("#bshare") && ($("#bshare").onclick = async () => {
      // Android browsers only share a few file types; a .txt file with text/plain is the one they accept most widely
      const f = backupFile(true);
      let ok = false;
      try { ok = navigator.canShare({ files: [f] }); } catch (e) { ok = false; }
      if (!ok) { await saveToDevice(f); await markBackedUp(); render(); showBackupNote("This browser can't send files from an app, so the backup was saved to Downloads instead (" + f.name + "). To send it: open the Files app › Downloads, press and hold the file, then tap Share and choose Google Drive, Gmail or Quick Share."); return; }
      try {
        await navigator.share({ files: [f] });
        await markBackedUp(); toast("Backup sent"); render();
      } catch (e) {
        if (e && e.name === "AbortError") return;   // share menu closed without choosing
        await saveToDevice(f); await markBackedUp(); render();
        showBackupNote("Sending didn't work (" + (e && e.name || "error") + "), so the backup was saved to Downloads instead (" + f.name + "). To send it: open the Files app › Downloads, press and hold the file, then tap Share.");
      }
    });
    $("#bsave") && ($("#bsave").onclick = async () => { const f = backupFile(false); await saveToDevice(f); await markBackedUp(); render(); showBackupNote("Saved to Downloads as " + f.name + ". To send it: open the Files app › Downloads, press and hold the file, then tap Share."); });
    $("#bcsv") && ($("#bcsv").onclick = async () => { await saveToDevice(csvFile()); toast("Table saved to Downloads"); });
    $("#binsc") && ($("#binsc").onclick = async () => { await saveToDevice(insuranceCsv()); toast("Insurance list saved to Downloads"); });
    $("#binsp") && ($("#binsp").onclick = () => printInsurance());
    $("#bcopy") && ($("#bcopy").onclick = async () => {
      const btn = $("#bcopy"); btn.disabled = true;
      try {
        const txt = await backupText(), box = $("#bcopybox");
        let copied = false;
        try { await navigator.clipboard.writeText(txt); copied = true; } catch (e) {}
        box.value = txt; box.hidden = false;
        if (!copied) { box.focus(); box.select(); }
        await markBackedUp();
        showBackupNote(copied ? "Backup copied (" + Math.round(txt.length / 1024).toLocaleString("de-CH") + " KB of text). Now write an email to yourself in Gmail, paste it and send it (Keep and Docs can't hold that much)." : "Your browser didn't allow copying automatically. The text is selected in the box: press and hold it, choose Copy, then paste it into an email to yourself in Gmail.");
      } catch (e) { showBackupNote("Copying didn't work (" + (e && e.name || "error") + ")."); }
      btn.disabled = false;
    });
    const restoreFrom = async (raw, clear) => {
      const box = $("#restoreBox");
      let txt = raw; try { txt = await readBackupText(raw); } catch (x) { txt = ""; }
      {
        let b; try { b = JSON.parse(txt); } catch (x) { b = null; }
        if (!b || !["dagobert-archiv", "entenhausen-archive"].includes(b.app) || !Array.isArray(b.comics)) { box.innerHTML = '<div class="banner warn">This isn\'t a Dagobert Ducks Archiv backup. Choose a file made with Save or Send backup, or paste the complete copied text.</div>'; return; }
        const isClz = /^clz/.test(b.source || ""), ids = new Set(b.comics.map(c => c && c.id));
        // a price file (made by Claude): no comics, only price ranges, maybe replacing a series' ranges and setting its years/per year
        const priceOnly = !b.comics.length && Array.isArray(b.valueRules) && b.valueRules.length > 0, replaceFor = new Set(Array.isArray(b.valueRulesReplace) ? b.valueRulesReplace : []);
        const have = new Set(S.comics.map(c => c.id));
        // an entry changed on this phone after the backup was made stays as it is
        const phoneById = new Map(S.comics.map(c => [c.id, c])), newerHere = c => { const p = c && phoneById.get(c.id); return !!(p && String(p.updatedAt || p.createdAt || "") > String(c.updatedAt || c.createdAt || "")); };
        const kept = isClz ? 0 : b.comics.filter(newerHere).length;
        const fresh = isClz ? b.comics.filter(c => c && !have.has(c.id)) : b.comics.filter(c => c && !newerHere(c));
        const known = b.comics.length - fresh.length;
        // only entries from the old in-app CLZ importer qualify; comics from converted files carry clzBatch/seriesGroup
        const oldClz = b.source === "clz-import" ? S.comics.filter(c => c.importedFrom === "CLZ" && !ids.has(c.id) && !c.clzBatch && !c.seriesGroup) : [];
        box.innerHTML = `<div class="confirm" style="display:grid;gap:10px"><span>${priceOnly ? "Add " + b.valueRules.length + " price ranges for " + new Set(b.valueRules.map(r => r.s)).size + " series" + (replaceFor.size ? " (the current ranges of " + replaceFor.size + " of them are replaced)" : "") + "? Your comics stay as they are." : isClz ? (fresh.length ? "Add " + fresh.length + " comics from your CLZ collection?" : "All comics in this file are already in your archive.") + (known && fresh.length ? " " + known + " already in your archive stay as they are." : "") : "Restore " + b.comics.length + (b.comics.length === 1 ? " entry" : " entries") + " from " + esc(stampDate(b.exported)) + "?" + (kept ? " " + kept + (kept === 1 ? " entry was" : " entries were") + " changed on this phone after the backup: " + (kept === 1 ? "it stays" : "they stay") + " as on the phone." : "")}</span>${isClz ? "" : backupCompare(b)}
          ${oldClz.length ? `<label class="check" style="min-height:0"><input id="rmold" type="checkbox" checked> Remove the ${oldClz.length} entries from the earlier CLZ import first</label>` : ""}
          <div class="row"><button class="primary" id="yesrest"${isClz && !fresh.length && !oldClz.length ? " disabled" : ""}>${isClz ? "Add" : "Restore"}</button><button id="norest">Cancel</button></div></div>`;
        $("#norest").onclick = () => { box.innerHTML = ""; clear(); };
        $("#yesrest").onclick = async () => {
          try {
            if (oldClz.length && $("#rmold") && $("#rmold").checked) {
              const gone = oldClz.map(c => c.id);
              await tx("comics", "readwrite", st => { gone.forEach(id => st.delete(id)); });
              S.comics = S.comics.filter(c => !gone.includes(c.id));
            }
            // series: a fresh phone takes the backup's list; otherwise your series stay and the backup adds the ones missing here
            if (Array.isArray(b.series) && b.series.length) { if (!S.seriesSaved) S.series = b.series.map(x => Object.assign({}, x)); else { const ids = new Set(S.series.map(s => s.id)); S.series = S.series.concat(b.series.filter(x => x && x.id && !ids.has(x.id)).map(x => Object.assign({}, x))); } await saveSeries(); }
            if (Array.isArray(b.priceBatchDone)) { S.priceBatchDone = [...new Set((S.priceBatchDone || []).concat(b.priceBatchDone))]; await setConfig("priceBatchDone", S.priceBatchDone); }
            if (Array.isArray(b.bookSeriesExtra)) { const have = new Set((S.bookSeriesExtra || []).map(x => x.name)); S.bookSeriesExtra = (S.bookSeriesExtra || []).concat(b.bookSeriesExtra.filter(x => x && x.name && !have.has(x.name))); await setConfig("bookSeriesExtra", S.bookSeriesExtra); }
            if (replaceFor.size) S.valueRules = (S.valueRules || []).filter(r => !replaceFor.has(r.s));
            if (b.seriesPatch && typeof b.seriesPatch === "object" && !(Array.isArray(b.series) && b.series.length)) { let ch = false; S.series.forEach(se => { const pa = b.seriesPatch[se.id]; if (pa && typeof pa === "object") { ["perYear", "firstYear", "lastYear", "defaultEdition", "issueList", "latest"].forEach(k => { if (k in pa) se[k] = pa[k]; }); ch = true; } }); if (ch) await saveSeries(); }
            if (Array.isArray(b.valueRules)) { const ids = new Set((S.valueRules || []).map(r => r.id)); S.valueRules = (S.valueRules || []).concat(b.valueRules.filter(r => r && !ids.has(r.id))); await setConfig("valueRules", S.valueRules); }
            if (b.gradeFactors && typeof b.gradeFactors === "object") { S.gradeFactors = Object.assign({}, b.gradeFactors, S.gradeFactors); await setConfig("gradeFactors", S.gradeFactors); }
            if (b.valueHistory && typeof b.valueHistory === "object") { S.valueHistory = Object.assign({}, b.valueHistory, S.valueHistory); await setConfig("valueHistory", S.valueHistory); }
            if (b.bookSizes && typeof b.bookSizes === "object") { S.bookSizes = Object.assign({}, S.bookSizes, b.bookSizes); await setConfig("bookSizes", S.bookSizes); }
            if (b.bookSeriesInfo && typeof b.bookSeriesInfo === "object") { S.bookMeta = Object.assign({}, S.bookMeta, b.bookSeriesInfo); await setConfig("bookSeriesInfo", S.bookMeta); }
            if (Array.isArray(b.groupKeep)) { S.groupKeep = [...new Set((S.groupKeep || []).concat(b.groupKeep))]; await setConfig("groupKeep", S.groupKeep); }
            if (b.barcodes && typeof b.barcodes === "object") { S.barcodes = Object.assign({}, b.barcodes, S.barcodes); await setConfig("barcodes", S.barcodes); }
            if (b.barcodeYears && typeof b.barcodeYears === "object") { S.barcodeYears = Object.assign({}, b.barcodeYears, S.barcodeYears); await setConfig("barcodeYears", S.barcodeYears); }
            if (Array.isArray(b.recentSeries) && !(S.recentSeries || []).length) { S.recentSeries = b.recentSeries; await setConfig("recentSeries", S.recentSeries); }
            if (b.rates && (!S.rates || (b.rates.manual && !S.rates.manual))) { S.rates = b.rates; await setConfig("rates", S.rates); }
            if (b.lastSeries && !S.lastSeries) { S.lastSeries = b.lastSeries; await setConfig("lastSeries", S.lastSeries); }
            if (b.storyKinds && typeof b.storyKinds === "object") { S.storyKinds = Object.assign({}, b.storyKinds, S.storyKinds); await setConfig("storyKinds", S.storyKinds); }
            if (Array.isArray(b.todoHidden) && !(S.todoHidden || []).length) { S.todoHidden = b.todoHidden; await setConfig("todoHidden", S.todoHidden); }
            if (b.storyRatings && typeof b.storyRatings === "object") { S.storyRatings = Object.assign({}, S.storyRatings, b.storyRatings); await setConfig("storyRatings", S.storyRatings); }
            const n = await saveMany(fresh, d => { box.innerHTML = `<div class="banner">${isClz ? "Adding" : "Restoring"}… ${d} of ${fresh.length}</div>`; }, true);
            await adoptLooseSeries();
            await refreshStorageInfo(); toast(priceOnly ? "Price ranges added" : (isClz ? "Added " : "Restored ") + n + (n === 1 ? " entry" : " entries")); render();
          } catch (x) { box.innerHTML = '<div class="banner warn">' + esc(errText(x)) + '</div>'; }
        };
      }
    };
    $("#restore").onchange = e => { const file = e.target.files[0]; if (file) file.text().then(t => restoreFrom(t, () => { e.target.value = ""; })); };
    $("#restoretextgo") && ($("#restoretextgo").onclick = () => restoreFrom($("#restoretext").value, () => { $("#restoretext").value = ""; }));
  }
};

// ---- Duckipedia for all German comics ----
// Duckipedia's page names go by INDUCKS code, so give the series the code the catalogue knows
const DK_RULES_DATE = "2026-10-31";
function dkSeries(se) { if (!se) return se; const ce = !se.code && catEntry(se); return ce ? Object.assign({}, se, { code: ce.code }) : se; }
function duckipediaTodo() {
  if (!window.Duckipedia) return [];
  // comics without a page are asked again after 90 days, in case the wiki has added one
  // "no page" answers from before the page rules were widened (31.10.2026) are asked again
  return S.comics.filter(c => c.kind !== "book" && !c.duckipedia && !(c.duckipediaNone && c.duckipediaNone >= DK_RULES_DATE && daysSince(c.duckipediaNone) < 90) && Duckipedia.candidates(dkSeries(seriesById(c.seriesId)), c).length);
}
function refreshDkCard() {
  const box = $("#dkbox"); if (!box || S.view !== "series") return;
  const tmp = document.createElement("div"); tmp.innerHTML = duckipediaBulkCard(); if (!tmp.firstElementChild) return;
  box.replaceWith(tmp.firstElementChild);
  $("#dkall") && ($("#dkall").onclick = () => duckipediaBulk());
  $("#dkstop") && ($("#dkstop").onclick = () => { if (S.dk) S.dk.stop = true; });
}
function duckipediaBulkCard() {
  if (!window.Duckipedia) return "";
  const dk = S.dk, todo = duckipediaTodo().length, have = S.comics.filter(c => c.duckipedia).length;
  if (!todo && !have && !dk) return "";
  return `<div class="card stack" id="dkbox"><h3>Duckipedia</h3>${lastRunText("dk")}
    <p class="small muted" style="margin:0">German comics can get extra details from <a href="https://de.duckipedia.org" target="_blank" rel="noopener">Duckipedia</a>: translator, price, characters, plot and more. They're saved with each comic, so they stay available offline. ${have === 1 ? "1 comic has" : have + " comics have"} them already.${(() => { const sk = [...new Set(S.comics.filter(c => { const se = dkSeries(seriesById(c.seriesId)); return se && ["de/MM", "de/MMM", "de/MC", "ch/MMZ"].includes(se.code); }).map(c => seriesById(c.seriesId).name))]; return sk.length ? " Duckipedia has no pages for single issues of " + sk.join(", ") + ", so those are skipped." : ""; })()}</p>
    ${dk && dk.running ? `<div class="progress"><div style="width:${(dk.done / dk.total * 100).toFixed(1)}%"></div></div><p class="small" style="margin:0">${dk.done} of ${dk.total} checked · ${dk.found} with details · ${dk.none} without a Duckipedia page</p><div class="row"><button id="dkstop">Stop</button></div>`
      : dk && dk.finished ? `<p class="small" style="margin:0">Finished: ${dk.found} comics got details, ${dk.none} have no Duckipedia page${dk.failed ? ", " + dk.failed + " could not be fetched" : ""}.</p>` : ""}
    ${!(dk && dk.running) && todo ? `<div class="row"><button class="primary" id="dkall">Get details for ${todo} German comics</button></div><p class="small muted" style="margin:0">Needs internet. Takes about ${Math.max(1, Math.round(todo * 1.8 / 60))} min; the app asks slowly to be gentle on the volunteer-run wiki.</p>` : ""}
  </div>`;
}
async function duckipediaBulk() {
  const todo = duckipediaTodo();
  S.dk = { running: true, total: todo.length, done: 0, found: 0, none: 0, failed: 0 };
  refreshDkCard();
  for (const c of todo) {
    if (S.dk.stop) break;
    try {
      const res = await Duckipedia.fetchIssue(dkSeries(seriesById(c.seriesId)), c);
      if (res) { await saveComic(Duckipedia.merge(c, res)); S.dk.found++; }
      else { await saveComic(Object.assign({}, c, { duckipediaNone: new Date().toISOString().slice(0, 10) })); S.dk.none++; }
    } catch (e) { S.dk.failed++; if (!navigator.onLine) { toast("No internet. Duckipedia stopped."); break; } }
    S.dk.done++;
    refreshDkCard();
    await sleep(1500);
  }
  S.dk.running = false; S.dk.finished = true;
  refreshDkCard();
  await markRun("dk"); toast("Duckipedia: " + S.dk.found + " comics got details");
}
// ---- Refresh all comics: INDUCKS and Duckipedia details fetched again; their data wins, personal fields stay ----
const fromSources = u => !u || /inducks\.org|outducks\.org|duckipedia\.org/.test(u);   // a cover you pasted yourself is kept
// Duckipedia is asked again only when it's worth it: details older than 30 days, or "no page" older than 90 days
const dkDue = c => !(c.duckipedia && c.duckipedia.fetched && daysSince(c.duckipedia.fetched) < 30) && !(c.duckipediaNone && c.duckipediaNone >= DK_RULES_DATE && daysSince(c.duckipediaNone) < 90);
// one series file's issues by INDUCKS code, made once instead of searching the whole file for every comic
const byIc = file => file._byIc || (file._byIc = new Map(Object.values(file.issues || {}).map(x => [x.ic, x])));
function refreshCard() {
  const r = S.rf, nDe = S.comics.filter(c => c.kind !== "book" && dkDue(c) && Duckipedia.candidates(dkSeries(seriesById(c.seriesId)), c).length).length;
  return `<div class="card stack" id="rfbox"><h3>Refresh all comics</h3>${lastRunText("comics")}
    <p class="small muted" style="margin:0">Fetches INDUCKS and Duckipedia details again for every comic: story lists, titles, dates, pages and covers are replaced with the current data. Condition, prices, notes, ratings, read marks and covers you pasted yourself are kept. INDUCKS comes from the catalogue on this phone; Duckipedia needs internet and takes about ${Math.max(1, Math.round(nDe * 2 / 60))} min for the ${nDe} German comics it asks about (comics checked in the last 30 days, and those without a Duckipedia page checked in the last 90, are skipped). Worth doing every few months.</p>
    ${r && r.running ? `<div class="progress"><div style="width:${(r.done / r.total * 100).toFixed(1)}%"></div></div><p class="small" style="margin:0">${r.done} of ${r.total} · ${r.changed} updated</p><div class="row"><button id="rfstop">Stop</button></div>`
      : `${r && r.finished ? `<p class="small" style="margin:0">${r.stopped ? "Stopped" : "Finished"}: ${r.changed} comics updated${r.failed ? ", Duckipedia failed for " + r.failed : ""}.</p>` : ""}<div class="row"><button id="rfall"${S.db ? "" : " disabled"}>Refresh all comics</button></div>`}
  </div>`;
}
function drawRefresh() { const b = $("#rfbox"); if (b) { b.outerHTML = refreshCard(); bindRefresh(); } }
function bindRefresh() {
  $("#rfall") && ($("#rfall").onclick = () => refreshAll());
  $("#rfstop") && ($("#rfstop").onclick = () => { if (S.rf) S.rf.stop = true; });
}
async function refreshAll() {
  const list = S.comics.filter(c => c.kind !== "book");
  const r = S.rf = { running: true, total: list.length, done: 0, changed: 0, failed: 0 };
  drawRefresh();
  for (const c0 of list) {
    if (r.stop) { r.stopped = true; break; }
    let c = Object.assign({}, c0);
    const se = seriesById(c.seriesId), entry = se && catEntry(se);
    // INDUCKS, from the catalogue on this phone
    if (entry) {
      const file = await catalogueFile(entry).catch(() => null), lab = c.issueLabel || c.issue || "";
      const hit = file && ((c.inducks && byIc(file).get(c.inducks)) || (file.issues || {})[lab]);
      if (hit) {
        if (hit.d) c.date = hit.d; if (hit.t) c.title = hit.t; if (hit.pg) c.pages = hit.pg;
        if (hit.cv && fromSources(c.coverUrl)) c.coverUrl = inducksImg(hit.cv);
        const clean = v => String(v || "").split(", ").filter(n => n && n !== "?").join(", ");
        if ((hit.s || []).length) c.stories = keepOwnTitles(c0.stories, hit.s.map(x => ({ title: x.t || "", code: x.c || "", writer: clean(x.w), artist: clean(x.a), hero: x.h || "", pages: x.p || "" })));
        c.inducks = hit.ic;
      }
    }
    // Duckipedia, German comics only
    if (se && dkDue(c0) && Duckipedia.candidates(dkSeries(se), c).length) {
      try {
        const useCover = fromSources(c.coverUrl) && !(entry && /outducks/.test(c.coverUrl));
        const d = await Duckipedia.fetchIssue(dkSeries(se), c, { noImage: !useCover });
        if (!d) c.duckipediaNone = new Date().toISOString().slice(0, 10);
        if (d) {
          c = Duckipedia.merge(c, d); delete c.duckipediaNone;
          if (d.issue.title) c.title = d.issue.title; if (d.issue.pages) c.pages = d.issue.pages;
          if (d.issue.cover && fromSources(c.coverUrl) && !(entry && /outducks/.test(c.coverUrl))) c.coverUrl = d.issue.cover;
        }
      } catch (e) { r.failed++; if (!navigator.onLine) { toast("No internet: Duckipedia part stopped"); r.stop = true; } }
      await sleep(1200);
    }
    const strip = x => JSON.stringify(Object.assign({}, x, { updatedAt: 0, duckipedia: x.duckipedia && Object.assign({}, x.duckipedia, { fetched: 0 }) }));
    if (strip(c) !== strip(c0)) { try { await saveComic(c); r.changed++; } catch (e) {} }
    r.done++; if (r.done % 5 === 0 || r.done === r.total) drawRefresh();
  }
  r.running = false; r.finished = true; await markRun("comics"); drawRefresh();
  toast("Refresh: " + r.changed + " comics updated");
}
// ---- Refresh all books: every book with an ISBN looked up again; the databases' data wins, series and volume stay ----
function refreshBooksCard() {
  const n = S.comics.filter(c => c.kind === "book" && window.Books && Books.normalize(c.isbn) && bookDue(c)).length, r = S.rb;
  if (!n && !r) return "";
  return `<div class="card stack" id="rbbox"><h3>Refresh all books</h3>${lastRunText("books")}
    <p class="small muted" style="margin:0">Looks up your ${n} books with an ISBN in the Deutsche Nationalbibliothek, LIBRIS, Open Library and Google Books again (books no database knew in the last 90 days are skipped). Title, author, publisher, year, pages, language, translator, genres and cover are replaced with their data; series, volume and everything about your copy stay. Needs internet; takes about ${Math.max(1, Math.round(n * 0.8 / 60))} min.</p>
    ${r && r.running ? `<div class="progress"><div style="width:${(r.done / r.total * 100).toFixed(1)}%"></div></div><p class="small" style="margin:0">${r.done} of ${r.total} · ${r.changed} updated</p><div class="row"><button id="rbstop">Stop</button></div>`
      : `${r && r.finished ? `<p class="small" style="margin:0">${r.stopped ? "Stopped" : "Finished"}: ${r.changed} ${r.changed === 1 ? "book" : "books"} updated${r.none ? ", " + r.none + " not found in any database" : ""}.</p>` : ""}<div class="row"><button id="rball"${S.db ? "" : " disabled"}>Refresh all books</button></div>`}
  </div>`;
}
function drawRefreshBooks() { const b = $("#rbbox"); if (b) { b.outerHTML = refreshBooksCard(); bindRefreshBooks(); } }
function bindRefreshBooks() {
  $("#rball") && ($("#rball").onclick = () => refreshBooks());
  $("#rbstop") && ($("#rbstop").onclick = () => { if (S.rb) S.rb.stop = true; });
}
// a book no database knew is asked again after 90 days
const bookDue = c => !(c.isbnNone && daysSince(c.isbnNone) < 90);
async function refreshBooks() {
  const list = S.comics.filter(c => c.kind === "book" && Books.normalize(c.isbn) && bookDue(c));
  const r = S.rb = { running: true, total: list.length, done: 0, changed: 0, none: 0 };
  drawRefreshBooks();
  // two books at a time: each asks four different databases at once, with a short pause between books
  let i = 0;
  const worker = async () => {
    while (i < list.length && !r.stop) {
      if (!navigator.onLine) { toast("No internet: book refresh stopped"); r.stop = true; break; }
      const c0 = S.comics.find(x => x.id === list[i].id) || list[i]; i++;
      try {
        const res = await Books.lookupIsbn(Books.normalize(c0.isbn), { skipGenre: !!c0.genre });
        if (res.data) {
          const c = Object.assign({}, c0); delete c.isbnNone;
          applyBookData(c, res.data);
          if (c0.genre && !res.data.genre) c.genre = c0.genre;
          c.seriesName = c0.seriesName || c.seriesName; c.issue = c0.issue || c.issue;   // your series and volume stay
          const strip = x => JSON.stringify(Object.assign({}, x, { updatedAt: 0 }));
          if (strip(c) !== strip(c0)) { await saveComic(c); r.changed++; }
        } else { r.none++; if (!res.offline) await saveComic(Object.assign({}, c0, { isbnNone: new Date().toISOString().slice(0, 10) }), true); }
      } catch (e) {}
      r.done++; drawRefreshBooks();
      await sleep(400);
    }
  };
  await Promise.all([worker(), worker()]);
  if (r.stop) r.stopped = true;
  if (!r.stop) { r.country = await fillAuthorCountries().catch(() => 0); }
  r.running = false; r.finished = true; await markRun("books"); drawRefreshBooks();
  toast("Books: " + r.changed + " updated" + (r.country ? ", " + r.country + " countries found" : ""));
}
