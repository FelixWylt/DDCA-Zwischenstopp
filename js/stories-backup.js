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
  if (p) { e.preventDefault(); S.st = Object.assign(S.st || {}, { tab: "all", who: { role: p.dataset.goperson, name: p.dataset.n }, q: "", shown: 100, status: "all" }); nav("stories"); window.scrollTo(0, 0); }
  else if (h) { e.preventDefault(); S.editing = h.dataset.hopen; S.draft = null; nav("add"); window.scrollTo(0, 0); }
});
// every story once, with the comics it appears in (a reprinted story is one story)
// story ratings are kept per story (INDUCKS story code, or the title when there is no code), in the config store
const storyKey = e => e.code ? "c:" + String(e.code).replace(/\s+/g, "").toLowerCase() : "t:" + norm(e.titles[0] || "");
const storyRate = e => S.storyRatings[storyKey(e)] || {};
async function setStoryRate(key, patch) {
  const cur = Object.assign({}, S.storyRatings[key] || {}, patch);
  if (!cur.fav && !+cur.rating) delete S.storyRatings[key]; else S.storyRatings[key] = cur;
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
  if (SINFO || Date.now() - sinfoTry < 60000) return; sinfoTry = Date.now();
  fetch("catalogue/story-info.json").then(r => r.ok ? r.json() : null).then(j => {
    if (!j) { if (!sinfoMissing) { sinfoMissing = true; if (S.view === "stories") render(); } return; }
    const ser = new Map(), lang = new Map();
    Object.entries(j.storySeries || {}).forEach(([k, v]) => ser.set(storyCode(k), v));
    Object.entries(j.lang || {}).forEach(([k, v]) => lang.set(storyCode(k), v));
    SINFO = { series: j.series || {}, ser, lang, def: j.langDefault || {}, people: j.people || {} };
    if (S.view === "stories") render();
  }).catch(() => {});
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
    if (status === "wanted" && isOwn(c)) return;
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
          if (t && e.curT >= 0 && !e.ownT) e.titles[e.curT] = sharedTitle(e.titles[e.curT], t);
          if (e.pgFrom === c && parseFloat(st.pages) > 0) e.pages = (e.pages || 0) + parseFloat(st.pages);
        }
        return;
      }
      let e = map.get(key);
      if (!e) { e = { key, code, titles: [], writers: new Set(), artists: new Set(), chars: new Set(), charLang: new Map(), genre: "", plot: "", original: "", first: "", items: [] }; map.set(key, e); }
      const title = st.ownTitle ? st.title : st.dTitle || st.title; e.curC = c; e.curT = -1; e.ownT = !!st.ownTitle;
      if (title && !e.titles.includes(title)) { e.titles.push(title); e.curT = e.titles.length - 1; }
      splitPeople(st.writer).forEach(x => e.writers.add(x)); splitPeople(st.artist).forEach(x => e.artists.add(x));
      const cl = comicLangOf(c);
      splitChars(st.characters).concat(st.hero ? [st.hero] : []).forEach(x => { e.chars.add(x); if (cl) (e.charLang.get(x) || e.charLang.set(x, new Set()).get(x)).add(cl); });
      ["genre", "plot", "original", "first"].forEach(k => { if (!e[k] && st[k]) e[k] = st[k]; });
      if (!e.pages && parseFloat(st.pages) > 0) { e.pages = parseFloat(st.pages); e.pgFrom = c; }
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
    Object.entries({ q: "", tab: "all", role: "writers", who: null, status: "owned", sort: "title", reprinted: false, rated: false, shown: 100, sub: "stories", olang: "", clang: "", pc: "", chl: "", ownf: "" }).forEach(([k, v]) => { if (st[k] === undefined) st[k] = v; });
    if (["writers", "artists", "chars"].includes(st.mode)) { st.role = st.mode; st.tab = "people"; } delete st.mode;
    if (st.sort === "fav") { st.sort = "rating"; st.tab = "fav"; }
    loadStoryInfo();
    const all = storyIndex(st.status);
    const nFav = all.filter(e => storyRate(e).fav).length;
    st._all = all; st._allFor = st.status;   // the search reuses this list instead of rebuilding it on every key
    const tab = (k, label, n) => `<button role="tab" type="button" data-stab="${k}" aria-selected="${st.tab === k}">${label}${n != null ? ` <span class="muted">${n}</span>` : ""}</button>`;
    const chip = (attr, on, label) => `<button type="button" class="fchip${on ? " on" : ""}" ${attr} aria-pressed="${on}">${label}</button>`;
    const inChips = [["owned", "Owned"], ["wanted", "Wishlist"], ["all", "Both"]].map(([k, l]) => chip(`data-stin="${k}"`, st.status === k, l)).join("");
    const filters = st.tab === "people"
      ? `<div class="fchips">${[["writers", "Writers"], ["artists", "Artists"], ["chars", "Characters"]].map(([k, l]) => chip(`data-role="${k}"`, st.role === k, l)).join("")}</div>`
      : `<div class="fchips">${inChips}${st.tab === "all" && (st.sub !== "series" || st.who) ? chip('data-strep="1"', st.reprinted, "Reprinted") + chip('data-strated="1"', st.rated, "Rated") : ""}</div>`;
    // filter rows (one swipe row each, only values you have): original language + language in your comics on All stories and
    // Favourites; the creator's own country on Writers/Artists; the language of your comics on Characters
    const optRow = (label, attr, cur, counts) => {
      const opts = [...counts].filter(([k]) => k).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      if (opts.length < 2 && !cur) return "";
      return `<div class="fchips swipe"><span class="muted small">${label}</span>${chip(`${attr}=""`, !cur, "All")}${opts.map(([k, n]) => chip(`${attr}="${esc(k)}"`, cur === k, `${esc(k)} <span class="muted">${n}</span>`)).join("")}</div>`;
    };
    const tally = (m, k) => m.set(k, (m.get(k) || 0) + 1);
    let fRows = "";
    if (st.tab === "people") {
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
    const sortSel = st.tab === "all" && st.sub !== "series" ? `<label class="inline"><span class="l">Sort</span><select id="stsort">${[["title", "Title"], ["comics", "Most reprinted"], ["code", "Story code"], ["rating", "My rating"]].map(([k, l]) => `<option value="${k}"${st.sort === k ? " selected" : ""}>${l}</option>`).join("")}</select></label><button type="button" class="ghost tiny sortdir" id="stdir" title="Turn the order round" aria-label="${st.desc ? "Reversed order" : "Usual order"}, tap to turn round">${st.desc ? "↑" : "↓"}</button>` : "";
    const head = `<div><h2>Stories</h2><p class="lede hide-phone">Every story in your comics, counted once even when it's reprinted. Tap a story to see where you have it.</p></div>
      <div class="subtabs three" role="tablist" aria-label="Show">${tab("all", "All stories", all.length)}${tab("people", "People")}${tab("fav", "Favourites", nFav)}</div>
      <div class="stack" style="gap:8px">
        <label class="q"><span class="l visually-hidden">Search</span><input id="stq" type="search" value="${esc(st.q)}" placeholder="${st.tab === "people" ? "Name" : st.sub === "series" && st.tab === "all" ? "Story series, e.g. DoubleDuck" : "Title, code, writer, artist, character, story series"}"></label>
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
function storyRow(e) {
  const people = [[...e.writers].join(", "), [...e.artists].join(", ")];
  const by = people[0] && people[0] === people[1] ? people[0] : [people[0] && "W: " + people[0], people[1] && "A: " + people[1]].filter(Boolean).join(" · ");
  const plotSrc = e.plot && e.plotFrom ? ` <span class="muted">(<a href="${esc(e.plotFrom.url)}" target="_blank" rel="noopener">Duckipedia</a>, GFDL 1.2, <a href="${esc(e.plotFrom.authors)}" target="_blank" rel="noopener">authors</a>)</span>` : "";
  const sr = storyRate(e), sk = storyKey(e), first = e.items.find(c => coverOf(c)), cv = first && coverOf(first);
  return `<details class="storyit"><summary>${cv ? `<span class="sthumb"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('none');this.remove()"></span>` : `<span class="sthumb none"></span>`}<div style="min-width:0;flex:1"><div class="t">${sr.fav ? '<span style="color:#c8102e">♥</span> ' : ""}${esc(storyTitle(e) || "Untitled")}${+sr.rating ? ` <span class="chip rate">${ratingTxt(sr.rating)}</span>` : ""}</div><div class="s">${esc(by || "Creators unknown")}</div></div><span class="chip${e.items.length > 1 ? " trade" : ""}">${e.items.length > 1 ? "×" + e.items.length : esc(comicTag(e.items[0]))}</span></summary>
    <div class="stbody small">
      <div class="row" style="gap:10px;align-items:center">${heartHtml(sr.fav, `data-sfav="${esc(sk)}"`)}${starsHtml(sr.rating, `data-sk="${esc(sk)}"`)}</div>
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
function storyHave(e) { return e.items.some(c => isOwn(c)) ? "Owned" : e.items.some(c => notOwned(c)) ? "Read, not owned" : ""; }
function drawStories() {
  const box = $("#stres"); if (!box) return;
  const st = S.st, q = norm(st.q), words = q ? q.split(" ") : [];
  const all = st._all && st._allFor === st.status ? st._all : storyIndex(st.status);
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
        .sort((a, b) => b.stories - a.stories || a.n.localeCompare(b.n, "de", { numeric: true }));
      box.innerHTML = !SINFO ? `<p class="muted small" style="margin:8px 0">${sinfoMissing ? "The story series come with the next catalogue update (INDUCKS couldn't be reached)." : "Loading the story series …"}</p>`
        : `<p class="muted small" style="margin:8px 0">${ser.length} story ${ser.length === 1 ? "series" : "series"}</p>` + (ser.length ? '<div class="list">' + ser.slice(0, st.shown).map(x => { const al = ((SINFO.series[x.code] || {}).a || []).slice(0, 3).join(" · "); return `<button class="folder" data-ser="${esc(x.code)}"><div style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${x.stories} ${x.stories === 1 ? "story" : "stories"} · in ${x.comics.size} ${x.comics.size === 1 ? "comic" : "comics"}${al ? " · " + esc(al) : ""}</div></div><span class="count">${x.stories}</span><span class="chev" aria-hidden="true">›</span></button>`; }).join("") + '</div>' : '<div class="empty"><h3>No story series found</h3><p>Try another name, or tap All in the rows above.</p></div>') + more(ser.length);
      box.querySelectorAll("[data-ser]").forEach(b => b.onclick = () => { st.who = { role: "series", name: b.dataset.ser }; st.sub = "stories"; st.q = ""; st.shown = 100; render(); window.scrollTo(0, 0); });
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
        <details><summary>The comics (${cs.length})</summary><div class="row" style="gap:6px;margin-top:6px">${cs.map(c => `<button class="chipbtn${c.status === "wanted" ? " wanted" : ""}" data-open="${esc(c.id)}">${esc(comicTag(c))}</button>`).join("")}</div></details></div>`;
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
      if (st.rated) list = list.filter(e => +storyRate(e).rating > 0);
      list = list.slice().sort(st.sort === "rating" ? (a, b) => (+storyRate(b).rating || 0) - (+storyRate(a).rating || 0) || cmpT(a, b) : st.sort === "comics" ? (a, b) => b.items.length - a.items.length || cmpT(a, b) : st.sort === "code" ? (a, b) => (a.code || "~").localeCompare(b.code || "~") : cmpT);
      if (st.desc) list.reverse();   // ↑: the order turned round (lowest rating, fewest reprints, Z to A)
      const reprints = list.filter(e => e.items.length > 1).length;
      html = `<p class="muted small" style="margin:8px 0">${list.length} ${list.length === 1 ? "story" : "stories"}${reprints && !st.reprinted ? " · " + reprints + " of them in more than one comic" : ""}</p>` +
        (list.length ? '<div class="list">' + list.slice(0, st.shown).map(storyRow).join("") + '</div>' : '<div class="empty"><h3>No stories match</h3><p>Try another search word, or tap Owned, Wishlist or Both.</p></div>') + more(list.length);
    }
    box.innerHTML = person + html;
    box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
    box.querySelectorAll("[data-sfav]").forEach(b => b.onclick = async () => {
      const k = b.dataset.sfav, on = !(S.storyRatings[k] || {}).fav;
      b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡";
      try { await setStoryRate(k, { fav: on }); } catch (e) { toast(errText(e)); }
    });
    bindStars(box, async (v, el) => { try { await setStoryRate(el.dataset.sk, { rating: v }); } catch (e) { toast(errText(e)); } });
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
    groupKeep: S.groupKeep, barcodes: S.barcodes, barcodeYears: S.barcodeYears, recentSeries: S.recentSeries, lastSeries: S.lastSeries, rates: S.rates };
}
// entries changed or added since the last backup
function changedSinceBackup() { const t = S.lastBackup || ""; return S.comics.filter(c => !t || String(c.updatedAt || c.createdAt || "") > t).length; }
// what a backup holds next to what is on this phone, so you can see a restore brings everything back
function backupCompare(b) {
  const n = x => Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.keys(x).length : 0;
  const rows = [
    ["Entries", b.comics, S.comics], ["… of them owned", (b.comics || []).filter(c => c && isOwn(c)), S.comics.filter(c => isOwn(c))],
    ["… on the wishlist", (b.comics || []).filter(c => c && c.status === "wanted"), S.comics.filter(c => c.status === "wanted")],
    ["Series", b.series, S.series], ["Price ranges", b.valueRules, S.valueRules], ["Own condition factors", b.gradeFactors, S.gradeFactors],
    ["Story ratings", b.storyRatings, S.storyRatings], ["Book series info", b.bookSeriesInfo, S.bookMeta], ["Empty book series", b.bookSeriesExtra, S.bookSeriesExtra],
    ["Volumes per book series", b.bookSizes, S.bookSizes], ["Group choices", b.groupKeep, S.groupKeep], ["Learned barcodes", b.barcodes, S.barcodes], ["Months of value history", b.valueHistory, S.valueHistory]
  ];
  const ratesTxt = b.rates ? (b.rates.manual ? "yes, your own" : "yes") : "no";
  return `<table class="cmp small"><thead><tr><th></th><th>In backup</th><th>On this phone</th></tr></thead><tbody>${rows.map(([k, x, y]) => { const a = n(x), p = n(y); return `<tr${a < p ? ' class="less"' : ""}><td>${k}</td><td>${a.toLocaleString("de-CH")}</td><td>${p.toLocaleString("de-CH")}</td></tr>`; }).join("")}
    <tr><td>Exchange rates</td><td>${ratesTxt}</td><td>${S.rates ? "yes" : "no"}</td></tr></tbody></table>
    <p class="small muted" style="margin:0">Nothing changes until you tap Restore. Restoring adds what's missing and keeps what's on this phone${rows.some(([, x, y]) => n(x) < n(y)) ? "; rows in red have more on the phone than in the backup" : ""}.</p>`;
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
  const cols = ["type", "series", "issue", "status", "title", "date", "grade", "copies", "pricePaid", "currency", "value", "purchaseDate", "source", "location", "read", "forTrade", "notes", "author", "publisher", "isbn", "format", "language", "stories"];
  const rows = sortComics(S.comics).map(c => { const se = seriesById(c.seriesId); return [c.kind === "book" ? (isNovel(c) ? "book" : "comic book") : "comic", se ? se.name : c.seriesName, c.issueLabel || c.issue, c.status, c.title, c.date, c.grade, c.copies, amtVal(c.pricePaid), c.currency, amtVal(c.value), c.purchaseDate, c.source, c.location, c.read ? "yes" : "no", c.forTrade ? "yes" : "no", c.notes, c.author, c.publisher, c.isbn, c.format, c.lang, (c.stories || []).map(s => [s.title, s.code, s.writer, s.artist].filter(Boolean).join(" | ")).join(" ;; ")]; });
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
        <div class="card stat"><div class="v">${n.toLocaleString("de-CH")}</div><div class="k">entries on this phone: ${(k => k.owned + " owned · " + k.wanted + " on wishlist")({ owned: S.comics.filter(c => isOwn(c)).length, wanted: S.comics.filter(c => c.status === "wanted").length })}</div></div>
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
            <p class="small" style="margin:0">Copy the whole archive as text instead, then paste it into an email to yourself (Gmail), a Google Keep note or a Google Docs document. To restore, paste that text under Restore.</p>
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
        showBackupNote(copied ? "Backup copied (" + Math.round(txt.length / 1024) + " KB of text). Now open Gmail, Keep or Docs and paste it." : "Your browser didn't allow copying automatically. The text is selected in the box: press and hold it, choose Copy, then paste it into Gmail, Keep or Docs.");
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
        const fresh = isClz ? b.comics.filter(c => c && !have.has(c.id)) : b.comics;
        const known = b.comics.length - fresh.length;
        // only entries from the old in-app CLZ importer qualify; comics from converted files carry clzBatch/seriesGroup
        const oldClz = b.source === "clz-import" ? S.comics.filter(c => c.importedFrom === "CLZ" && !ids.has(c.id) && !c.clzBatch && !c.seriesGroup) : [];
        box.innerHTML = `<div class="confirm" style="display:grid;gap:10px"><span>${priceOnly ? "Add " + b.valueRules.length + " price ranges for " + new Set(b.valueRules.map(r => r.s)).size + " series" + (replaceFor.size ? " (the current ranges of " + replaceFor.size + " of them are replaced)" : "") + "? Your comics stay as they are." : isClz ? (fresh.length ? "Add " + fresh.length + " comics from your CLZ collection?" : "All comics in this file are already in your archive.") + (known && fresh.length ? " " + known + " already in your archive stay as they are." : "") : "Restore " + b.comics.length + (b.comics.length === 1 ? " entry" : " entries") + " from " + esc(stampDate(b.exported)) + "?"}</span>${isClz ? "" : backupCompare(b)}
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
            if (Array.isArray(b.series) && b.series.length) { S.series = b.series; await saveSeries(); }
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
  return `<div class="card stack" id="dkbox"><h3>Duckipedia</h3>
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
  toast("Duckipedia: " + S.dk.found + " comics got details");
}
// ---- Refresh all comics: INDUCKS and Duckipedia details fetched again; their data wins, personal fields stay ----
const fromSources = u => !u || /inducks\.org|outducks\.org|duckipedia\.org/.test(u);   // a cover you pasted yourself is kept
// Duckipedia is asked again only when it's worth it: details older than 30 days, or "no page" older than 90 days
const dkDue = c => !(c.duckipedia && c.duckipedia.fetched && daysSince(c.duckipedia.fetched) < 30) && !(c.duckipediaNone && c.duckipediaNone >= DK_RULES_DATE && daysSince(c.duckipediaNone) < 90);
// one series file's issues by INDUCKS code, made once instead of searching the whole file for every comic
const byIc = file => file._byIc || (file._byIc = new Map(Object.values(file.issues || {}).map(x => [x.ic, x])));
function refreshCard() {
  const r = S.rf, nDe = S.comics.filter(c => c.kind !== "book" && dkDue(c) && Duckipedia.candidates(dkSeries(seriesById(c.seriesId)), c).length).length;
  return `<div class="card stack" id="rfbox"><h3>Refresh all comics</h3>
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
  r.running = false; r.finished = true; drawRefresh();
  toast("Refresh: " + r.changed + " comics updated");
}
// ---- Refresh all books: every book with an ISBN looked up again; the databases' data wins, series and volume stay ----
function refreshBooksCard() {
  const n = S.comics.filter(c => c.kind === "book" && window.Books && Books.normalize(c.isbn) && bookDue(c)).length, r = S.rb;
  if (!n && !r) return "";
  return `<div class="card stack" id="rbbox"><h3>Refresh all books</h3>
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
  r.running = false; r.finished = true; drawRefreshBooks();
  toast("Books: " + r.changed + " updated" + (r.country ? ", " + r.country + " countries found" : ""));
}
