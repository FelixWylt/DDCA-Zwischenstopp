// Dagobert Ducks Archiv – Collection tab, books sub tab, series picker, comic view.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- Collection: groups > series > issues ----
// "LTB – Lustiges Taschenbuch: 12, 45 (2 spare), 101–103": your duplicates for trade, by series
function tradeText() {
  const list = sortComics(S.comics.filter(c => c.status !== "wanted" && !isNovel(c) && (c.forTrade || (c.copies || 1) > 1)));
  const groups = new Map(); list.forEach(c => { const k = seriesKeyOf(c); (groups.get(k) || groups.set(k, []).get(k)).push(c); });
  const lines = [];
  groups.forEach((cs, k) => {
    const se = seriesById(k), name = se ? (se.short ? se.short + " – " + se.name : se.name) : seriesTitle(k);
    lines.push(name + ": " + cs.map(c => { const lab = showLabel(c.issueLabel || c.issue || "") || c.title || "?", spare = (c.copies || 1) - (c.forTrade ? 0 : 1); return lab + (spare > 1 ? " (" + spare + " spare)" : "") + (c.grade ? " Z" + c.grade : ""); }).join(", "));
  });
  return "My duplicates for trade (" + list.length + ")\n" + lines.join("\n");
}
function statusMatch(c) {
  const f = S.filters.status;
  if (f === "owned") return c.status !== "wanted";
  if (f === "wanted") return c.status === "wanted";
  if (f === "trade") return c.status !== "wanted" && (c.forTrade || (c.copies || 1) > 1);
  if (f === "unread") return c.status !== "wanted" && !c.read;
  if (f === "fav") return c.status !== "wanted" && !!c.fav;
  if (f === "rated") return c.status !== "wanted" && +c.rating > 0;
  if (f === "special") return !!c.special;
  return true;
}
function publisherOf(c) {
  if (c.kind === "book") return isNovel(c) ? NOVEL_PUB : BOOK_PUB;
  const se = seriesById(c.seriesId);
  return se ? (se.publisher || OTHER_PUB) : OTHER_PUB;
}
function pubRank(name) { return name === DISNEY ? 0 : name === NOVEL_PUB ? 4 : name === BOOK_PUB ? 3 : name === OTHER_PUB ? 2 : 1; }
function pubCompare(a, b) { return pubRank(a) - pubRank(b) || String(a).localeCompare(String(b), "de", { numeric: true }); }
function groupOf(c) {
  if (c.kind === "book") return BOOK_GROUP;
  const se = seriesById(c.seriesId);
  return se ? (se.group || OTHER_GROUP) : OTHER_GROUP;
}
// a series of one volume (Der Stammbaum der Ducks, Micky Holmes & Donald Watson): shown under "Single comics".
// Automatic when INDUCKS lists one issue; Series › "Single comic" can say yes or no
function isSingleSeries(se) { if (!se) return false; if (se.single === "yes") return true; if (se.single === "no") return false; const e = catEntry(se); return !!(e && e.issues === 1); }
function seriesKeyOf(c) { return c.kind === "book" ? "book:" + (c.seriesName || "") : (seriesById(c.seriesId) ? c.seriesId : "name:" + (c.seriesName || "")); }
function seriesTitle(key) {
  if (key.startsWith("book:")) return key.slice(5) || "Single books";
  if (key.startsWith("name:")) return key.slice(5) || "Unknown series";
  const se = seriesById(key); return se ? seriesLabel(se) : key;
}
// "Spider-Man (German)" when two series share a name
function seriesLabel(se) {
  const same = n => String(n || "").trim().toLowerCase();
  // series of the same name in another language: "Donald Duck & Co (German)"
  if (S.series.some(x => x !== se && same(x.name) === same(se.name))) { const l = seriesLang(se); if (l && S.series.some(x => x !== se && same(x.name) === same(se.name) && seriesLang(x) !== l)) return se.name + " (" + l + ")"; }
  // several runs of one title (Walt Disney's Serier 1954–1977, 1990–1992, 1996–2001): the name with the years
  const base = n => norm(String(n || "").replace(/\s*\([^)]*\)\s*$/, ""));
  if (!S.series.some(x => x !== se && base(x.name) && base(x.name) === base(se.name))) return se.name;
  const y = seriesYears(se); return y ? String(se.name).replace(/\s*\([^)]*\)\s*$/, "") + " (" + y + ")" : se.name;
}
// the years a series ran: its own years, else INDUCKS', else those of your comics in it
function seriesYears(se) {
  let a = +se.firstYear || 0, b = +se.lastYear || 0;
  if (!a) { const p = (S.inducksDir || []).find(x => x[0] === se.code); if (p) { a = +p[3]; b = +p[4]; } }
  if (!a) { const ys = S.comics.filter(c => c.seriesId === se.id).map(c => c.issueYear || +String(c.date || "").slice(0, 4)).filter(y => y > 1900); if (ys.length) { a = Math.min(...ys); b = Math.max(...ys); } }
  return a ? (b && b !== a ? a + "–" + b : String(a)) : "";
}
function groupRank(name) { return name === BOOK_GROUP ? 2 : (name === OTHER_GROUP || name === "Other comics") ? 1 : 0; }
function groupCompare(a, b) { return groupRank(a) - groupRank(b) || String(a).localeCompare(String(b), "de", { numeric: true }); }
function yearsText(list) {
  const ys = list.map(c => +(String(c.date || "").slice(0, 4)) || c.issueYear).filter(y => y > 1900);
  if (!ys.length) return "";
  const a = Math.min(...ys), b = Math.max(...ys); return a === b ? String(a) : a + "–" + b;
}
function countText(list) {
  const own = list.filter(c => c.status !== "wanted").length, want = list.length - own;
  const nov = list.filter(c => c.status !== "wanted" && isNovel(c)).length, com = own - nov;
  const parts = [];
  if (com) parts.push(com + (com === 1 ? " comic" : " comics"));
  if (nov) parts.push(nov + (nov === 1 ? " book" : " books"));
  if (want) parts.push(want + " on wishlist");
  return parts.join(" · ") || (list.length && list.every(isNovel) ? "0 books" : "0 comics");
}
// dates are stored as 2021-05-25 / 2021-05 / 2021 and shown the German way: 25.05.2021 / 05.2021 / 2021
function niceDate(d) {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(d || ""));
  if (!m) return String(d || "");
  return m[3] ? m[3] + "." + m[2] + "." + m[1] : m[2] ? m[2] + "." + m[1] : m[1];
}
// reads 25.5.2021, 25.05.21, 5.2021, 05/2021, 2021-05-25 or 2021; anything else stays as typed
function isoDate(v) {
  const t = String(v || "").trim(); if (!t) return "";
  let m = /^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2}|\d{4})$/.exec(t);
  if (m) { const y = m[3].length === 2 ? (+m[3] > 40 ? 1900 : 2000) + +m[3] : +m[3]; if (+m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  m = /^(\d{1,2})\s*[.\/]\s*(\d{4})$/.exec(t);
  if (m && +m[1] >= 1 && +m[1] <= 12) return m[2] + "-" + m[1].padStart(2, "0");
  m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(t);
  if (m) return m[1] + "-" + m[2].padStart(2, "0") + (m[3] ? "-" + m[3].padStart(2, "0") : "");
  return t;
}
function todayIso() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
// INDUCKS-style labels shown the readable way: 2017-23-24 -> 2017/23-24, 1984-19A -> 1984/19A
const showLabel = l => String(l).replace(/^(\d{4})-(\d{1,3}(?:-\d{1,3}|[A-Z]))$/, "$1/$2");
function itemHtml(c, inSeries) {
  const se = seriesById(c.seriesId);
  const st = (c.stories || []);
  const creators = [...new Set(st.flatMap(s => [s.writer, s.artist]).filter(Boolean))].slice(0, 2).join(", ");
  const isBook = c.kind === "book";
  const sub = isBook ? [c.seriesName, c.author, c.publisher, c.date].filter(Boolean).join(" · ")
    : [niceDate(c.date), creators].filter(Boolean).join(" · ");
  const chips = [];
  if (c.status === "wanted") chips.push('<span class="chip wanted">Wishlist</span>');
  else {
    if (c.grade) chips.push('<span class="chip">Z' + esc(c.grade) + '</span>');
    if (c.forTrade || (c.copies || 1) > 1) chips.push('<span class="chip trade">' + ((c.copies || 1) > 1 ? c.copies + "×" : "Trade") + '</span>');
    if (c.location) chips.push('<span class="chip">' + esc(c.location) + '</span>');
  }
  if (c.fav && c.status !== "wanted") chips.unshift('<span class="chip fav" title="Favourite">♥</span>');
  if (+c.rating && c.status !== "wanted") chips.unshift('<span class="chip rate">' + ratingTxt(c.rating) + '</span>');
  if (c.special) chips.push('<span class="chip special" title="' + esc(c.special) + '">Special</span>');
  if ((c.extras || []).length && c.status !== "wanted") chips.push('<span class="chip special" title="' + esc(c.extras.map(x => x.what).join(", ")) + '">+ ' + esc(c.extras.length === 1 ? c.extras[0].what || "Extra" : c.extras.length + " extras") + '</span>');
  if (c.facsimile) chips.push('<span class="chip">Facsimile</span>');
  if (c.kind !== "book" && c.format === "Hardcover") chips.push('<span class="chip">HC</span>');
  if (c.lotId && c.status !== "wanted") chips.push('<span class="chip" title="Bought as part of a lot">Lot</span>');
  const numTxt = isBook ? c.issue : showLabel(c.issueLabel || c.issue || "");
  if (isNovel(c)) {   // a book: its cover (or its initial), then title, author and year
    const sub2 = [inSeries ? "" : c.seriesName && c.seriesName + (c.issue ? " " + c.issue : ""), c.author, c.date, c.lang].filter(Boolean).join(" · ");
    if (c.read && c.status !== "wanted") chips.push('<span class="chip">Read</span>');
    return `<button class="item book" data-id="${esc(c.id)}">
      <div class="bookthumb"${coverOf(c) ? ` data-zoom="${esc(c.id)}"` : ""}>${inSeries && c.issue ? `<span class="vol">${esc(c.issue)}</span>` : ""}${coverOf(c) ? `<img src="${esc(coverOf(c))}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="ini">${esc((c.title || "?").trim()[0] || "?")}</span></div>
      <div style="min-width:0"><div class="t">${esc(c.title || "Untitled")}</div><div class="s">${esc(sub2)}</div></div>
      <div class="chips">${chips.join("")}</div></button>`;
  }
  const cv = !isBook && coverOf(c);
  return `<button class="item${cv ? " withcover" : ""}" data-id="${esc(c.id)}">
    ${cv ? `<div class="cthumb" data-zoom="${esc(c.id)}"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()"></div>` : ""}<div class="num${String(numTxt).length > 8 ? " long xlong" : String(numTxt).length > 4 ? " long" : ""}">${isBook && !c.issue ? '<span style="font-size:.9rem">Book</span>' : esc(numTxt || "–")}<small>${isBook ? (c.issue ? "VOL." : "") + " BOOK" : esc(se ? (se.short || "") : (c.seriesName || ""))}</small></div>
    <div style="min-width:0"><div class="t">${esc(c.title || (inSeries && c.date ? niceDate(c.date) : (se ? se.name : c.seriesName)) || "Untitled")}</div><div class="s">${esc((inSeries && !c.title && !isBook ? creators : sub) || (inSeries || !c.title ? "" : (se ? se.name : c.seriesName || "")))}</div></div>
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
    if (S.colTab == null) { try { S.colTab = localStorage.getItem("da-coltab") || "comics"; } catch (e) { S.colTab = "comics"; } }
    if (S.col && S.col.p) S.colTab = S.col.p === NOVEL_PUB ? "books" : "comics";
    const head = `
      <div class="row between"><div><h2>Collection</h2><p class="lede hide-phone">Browse by universe, group and series, or search everything at once.</p></div>
      <button class="primary" id="new">Add</button></div>
      <div class="subtabs" role="tablist" aria-label="Show">
        <button role="tab" type="button" data-ctab="comics" aria-selected="${(S.colTab || "comics") === "comics"}">Comics <span class="muted" id="ctc">${S.comics.filter(c => !isNovel(c) && statusMatch(c)).length}</span></button>
        <button role="tab" type="button" data-ctab="books" aria-selected="${S.colTab === "books"}">Books <span class="muted" id="ctb">${S.comics.filter(c => isNovel(c) && statusMatch(c)).length}</span></button>
      </div>
      <div class="filters two-col">
        <label class="q"><span class="l">Search</span><input id="fq" type="search" placeholder="${S.colTab === "books" ? "Title, author, ISBN" : "e.g. Don Rosa, Scarpa, Phantomias, ISBN"}" value="${esc(f.q)}"></label>
        <label><span class="l">Show</span><select id="fst">
          <option value="owned"${f.status === "owned" ? " selected" : ""}>Owned</option>
          <option value="wanted"${f.status === "wanted" ? " selected" : ""}>Wishlist</option>
          <option value="trade"${f.status === "trade" ? " selected" : ""}>Duplicates for trade</option>
          <option value="unread"${f.status === "unread" ? " selected" : ""}>Unread</option>
          <option value="fav"${f.status === "fav" ? " selected" : ""}>Favourites</option>
          <option value="rated"${f.status === "rated" ? " selected" : ""}>Rated</option>
          <option value="special"${f.status === "special" ? " selected" : ""}>Special copies</option>
          <option value="all"${f.status === "all" ? " selected" : ""}>Everything</option></select></label>
      </div>
      <div class="row sortrow">
        <label class="inline"><span class="l">Sort</span><select id="fsort">${[["series", "Series order"], ["value", "Value (highest first)"], ["rating", "My rating"], ["bought", "Purchase date (newest)"], ["added", "Date added (newest)"]].map(([k, l]) => `<option value="${k}"${(S.colSort || "series") === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>
        <div class="seg small" role="group" aria-label="View"><button type="button" data-cview="list" aria-pressed="${colView() === "list"}">List</button><button type="button" data-cview="grid" aria-pressed="${colView() === "grid"}">Covers</button></div>
      </div>` + coverBar();
    if (!S.comics.length) {
      return head + `<div class="empty"><h3>Your archive is empty</h3><p>Add your first comic or book, or load a backup under Backup.</p>
        <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" id="new2">Add comic or book</button><button id="gobk">Go to Backup</button></div></div>`;
    }
    return head + '<div id="results"></div>';
  },
  bind() {
    document.querySelectorAll("[data-ctab]").forEach(b => b.onclick = () => {
      if ((S.colTab || "comics") === b.dataset.ctab) { S.col = {}; render(); return; }
      S.colTab = b.dataset.ctab; S.col = {}; S.shown = 200; S.filters.q = "";
      try { localStorage.setItem("da-coltab", S.colTab); } catch (e) {}
      render();
    });
    const go = () => {
      S.editing = null; S.draft = null;
      const c = S.col || {};
      if (S.colTab === "books") { S.draft = blankDraft({ kind: "book", bookType: "book", seriesId: "_book", seriesName: c.s && c.s.startsWith("book:") ? c.s.slice(5) : "" }); nav("add"); return; }
      if (c.s && c.s.startsWith("book:")) S.draft = blankDraft({ kind: "book", seriesId: "_book", seriesName: c.s.slice(5) });
      else if (c.s && seriesById(c.s)) S.draft = blankDraft({ seriesId: c.s });
      nav("add");
    };
    $("#new") && ($("#new").onclick = go); $("#new2") && ($("#new2").onclick = go);
    $("#gobk") && ($("#gobk").onclick = () => { nav("backup"); });
    bindBackupNag();
    $("#fq").oninput = e => { S.filters.q = e.target.value; S.shown = 200; drawResults(); };
    $("#getcv") && ($("#getcv").onclick = () => { fetchAllCovers(); const b = $("#getcv"); if (b) { b.textContent = "Stop"; b.onclick = () => { if (S.cv) S.cv.stop = true; }; } });
    $("#fst").onchange = e => { S.filters.status = e.target.value; S.shown = 200; drawResults(); };
    $("#fsort").onchange = e => { S.colSort = e.target.value; S.shown = 200; drawResults(); };
    document.querySelectorAll("[data-cview]").forEach(b => b.onclick = () => {
      S.colView = b.dataset.cview; try { localStorage.setItem("da-colview", S.colView); } catch (e) {}
      document.querySelectorAll("[data-cview]").forEach(x => x.setAttribute("aria-pressed", x === b)); drawResults();
    });
    drawResults();
  }
};
// a book series shown like a comic series in "About this series"
function bookAboutObj(key) {
  if (!String(key || "").startsWith("book:")) return null;
  const n = key.slice(5), m = bookInfo(n), size = (S.bookSizes || {})[n];
  return { about: m.about, aboutSrc: m.aboutSrc, srcName: "Wikipedia", srcLic: "CC BY-SA", pubHouse: [m.author, m.publisher].filter(Boolean).join(" · "), format: m.genres, latestTxt: [m.years, size ? size + " volumes" : ""].filter(Boolean).join(" · ") };
}
// the series' description and facts (filled from INDUCKS / Duckipedia in Series), above its issues
function seriesAbout(se) {
  if (!se || !(se.about || se.pubHouse || se.format)) return "";
  const yrs = se.latestTxt != null ? se.latestTxt : se.numbering === "year" ? [se.firstYear, se.lastYear].filter(Boolean).join("–") : se.latest ? (se.first > 1 ? "issues " + se.first + "–" : "to issue ") + se.latest : "";
  const facts = [esc(se.pubHouse || ""), esc(se.format || ""), esc(yrs), se.code && `<a href="https://inducks.org/publication.php?c=${encodeURIComponent(se.code)}" target="_blank" rel="noopener">INDUCKS ${esc(se.code)}</a>`];
  return `<details class="card serabout"${S.aboutOpen ? " open" : ""}><summary><strong>About this series</strong></summary>
    ${se.about ? `<p style="margin:8px 0 6px">${esc(se.about)}</p>` : ""}
    <p class="small muted" style="margin:0">${facts.filter(Boolean).join(" · ")}${se.aboutSrc ? ` · Text: <a href="${esc(se.aboutSrc)}" target="_blank" rel="noopener">${se.srcName || "Duckipedia"}</a> (${se.srcLic || "GFDL 1.2"})` : ""}</p></details>`;
}
// ---- Books sub tab: browse by series, author, genre or title ----
const lastNameOf = a => { const n = String(a || "").trim(); return n ? (n.split(" ").pop() + " " + n) : "~"; };
function bookView() { if (S.bookView == null) { try { S.bookView = localStorage.getItem("da-bookview") || "series"; } catch (e) { S.bookView = "series"; } } return S.bookView; }
function booksBrowse(pool, col, crumbs, more) {
  const de = (a, b) => String(a).localeCompare(String(b), "de", { numeric: true });
  const firstAuthor = c => splitPeople(c.author)[0] || "";
  const genresOf = c => String(c.genre || "").split(",").map(x => x.trim()).filter(Boolean);
  const bySeriesVol = (a, b) => de(a.seriesName || "~", b.seriesName || "~") || (a.issueSort ?? 1e9) - (b.issueSort ?? 1e9) || de(a.date || "", b.date || "") || de(a.title || "", b.title || "");
  const folder = (target, t, sub, n) => `<button class="folder" data-col='${esc(JSON.stringify(Object.assign({ p: NOVEL_PUB }, target)))}'><div style="min-width:0"><div class="t">${esc(t)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}</div><span class="count">${n}</span><span class="chev" aria-hidden="true">›</span></button>`;
  const back = label => crumbs([{ label: "All books", col: {} }, { label }]);
  const total = `<p class="muted small" style="margin:0 0 8px">${countText(pool)}</p>`;
  if (!pool.length) return `<div class="empty"><h3>${S.filters.status === "wanted" ? "No books on your wishlist" : "No books yet"}</h3><p>Add a book with its ISBN or by scanning the barcode.</p><div class="row" style="justify-content:center;margin-top:12px"><button class="primary" id="newbook">Add a book</button></div></div>`;
  // one author's books, one genre's books, or the single books
  if (col.a != null) { const list = pool.filter(c => firstAuthor(c) === col.a).sort(bySeriesVol); return back(col.a || "Unknown author") + `<p class="muted small" style="margin:0 0 8px">${esc([countText(list), valueTag(list)].filter(Boolean).join(" · "))}</p>` + entriesHtml(list.slice(0, S.shown)) + more(list.length); }
  if (col.gen != null) { const list = pool.filter(c => col.gen ? genresOf(c).includes(col.gen) : !genresOf(c).length).sort((a, b) => de(lastNameOf(firstAuthor(a)), lastNameOf(firstAuthor(b))) || bySeriesVol(a, b)); return back(col.gen || "No genre") + `<p class="muted small" style="margin:0 0 8px">${esc(countText(list))}</p>` + entriesHtml(list.slice(0, S.shown)) + more(list.length); }
  const v = bookView();
  const chip = (k, l) => `<button type="button" class="fchip${v === k ? " on" : ""}" data-bview="${k}" aria-pressed="${v === k}">${l}</button>`;
  const chips = `<div class="fchips bookviews">${chip("series", "Series")}${chip("authors", "Authors")}${chip("genres", "Genres")}${chip("az", "A–Z")}</div>`;
  if (v === "authors") {
    const m = new Map(); pool.forEach(c => { const a = firstAuthor(c); (m.get(a) || m.set(a, []).get(a)).push(c); });
    const keys = [...m.keys()].sort((a, b) => de(lastNameOf(a), lastNameOf(b)));
    let letter = "", rows = "";
    keys.forEach(a => { const L = (a ? a.split(" ").pop()[0] : "–").toUpperCase(); if (L !== letter) { rows += `<h4 class="yearhead">${esc(L)}</h4>`; letter = L; } const list = m.get(a), ser = [...new Set(list.map(c => c.seriesName).filter(Boolean))]; rows += folder({ a }, a || "Unknown author", [ser.length ? ser.join(", ") : "", countText(list)].filter(Boolean).join(" · "), list.length); });
    return chips + total + `<div class="list">${rows}</div>`;
  }
  if (v === "genres") {
    const m = new Map(); pool.forEach(c => { const gs = genresOf(c); (gs.length ? gs : [""]).forEach(g => (m.get(g) || m.set(g, []).get(g)).push(c)); });
    const keys = [...m.keys()].sort((a, b) => (a === "") - (b === "") || m.get(b).length - m.get(a).length || de(a, b));
    return chips + total + `<p class="small muted" style="margin:0 0 8px">A book with several genres is in each of them.</p><div class="list">${keys.map(g => folder({ gen: g }, g || "No genre", countText(m.get(g)), m.get(g).length)).join("")}</div>`;
  }
  if (v === "az") {
    const list = pool.slice().sort((a, b) => de(String(a.title || "").replace(/^(der|die|das|the|a|an|le|la|il|en|ett|den|det)\s+/i, ""), String(b.title || "").replace(/^(der|die|das|the|a|an|le|la|il|en|ett|den|det)\s+/i, "")));
    let letter = ""; const rows = [];
    list.slice(0, S.shown).forEach(c => { const L = (String(c.title || "?").replace(/^(der|die|das|the|a|an|le|la|il|en|ett|den|det)\s+/i, "")[0] || "?").toUpperCase(); if (L !== letter) { rows.push(`<h4 class="yearhead">${esc(L)}</h4>`); letter = L; } rows.push(c); });
    return chips + total + entriesHtml(rows) + more(list.length);
  }
  // Series: book series as folders, then the single books under their author's name
  const bySeries = {}, singles = [];
  pool.forEach(c => { if (c.seriesName) (bySeries[c.seriesName] = bySeries[c.seriesName] || []).push(c); else singles.push(c); });
  const names = Object.keys(bySeries).sort(de);
  const sorted = singles.slice().sort((a, b) => de(lastNameOf(firstAuthor(a)), lastNameOf(firstAuthor(b))) || de(a.date || "", b.date || "") || de(a.title || "", b.title || ""));
  let lastA = null; const rows = [];
  sorted.slice(0, S.shown).forEach(c => { const a = firstAuthor(c); if (a !== lastA) { rows.push(`<h4 class="yearhead">${esc(a || "Unknown author")}</h4>`); lastA = a; } rows.push(c); });
  return chips + total + (names.length ? '<h3 class="listhead">Book series</h3><div class="list">' + names.map(n => folder({ g: BOOK_GROUP, s: "book:" + n }, n, [firstAuthor(bySeries[n][0]), countText(bySeries[n]), valueTag(bySeries[n])].filter(Boolean).join(" · "), bySeries[n].length)).join("") + "</div>" : "") +
    (sorted.length ? `<h3 class="listhead">Single books <span class="muted">${sorted.length}</span></h3>` + entriesHtml(rows) + more(sorted.length) : "");
}
// List or Covers, remembered on this phone
function colView() { if (S.colView == null) { try { S.colView = localStorage.getItem("da-colview") || "list"; } catch (e) { S.colView = "list"; } } return S.colView; }
// a cover tile for the Covers view: the picture with series and number; a plain tile when there is no picture
function tileHtml(c) {
  const se = seriesById(c.seriesId), cv = coverOf(c), bk = c.kind === "book";
  const tag = bk ? (c.issue ? c.issue : "") : showLabel(c.issueLabel || c.issue || "");
  const ser = bk ? (c.seriesName || "") : se ? shortTag(se) : c.seriesName || "";
  return `<button class="tile${c.status === "wanted" ? " wanted" : ""}" data-id="${esc(c.id)}" aria-label="${esc([ser, tag, c.title].filter(Boolean).join(" "))}">
    ${cv ? `<img src="${esc(cv)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="tph"><b>${esc(ser || (bk ? "Book" : ""))}</b>${esc(bk && !tag ? (c.title || "") : "")}</span>`}
    <span class="tnum">${esc([ser, tag].filter(Boolean).join(" ") || c.title || "")}</span>${(c.fav || +c.rating) && c.status !== "wanted" ? `<span class="tfav">${c.fav ? "♥" : ""}${+c.rating ? " " + ratingTxt(c.rating) : ""}</span>` : ""}</button>`;
}
// a list of comics as rows or as covers; heads (years) go between them in both views
// the same issue owned as separate entries (other condition, seller …): one row with "2×"
const copyKey = c => c.status === "wanted" ? "" : seriesKeyOf(c) + "|" + (c.kind === "book" ? (c.title || "") + "|" + (c.issue || "") : (c.issueLabel || c.issue || "")) ;
function entriesHtml(list, inSeries, note) {
  const grid = colView() === "grid";
  const byKey = new Map(); list.forEach(x => { if (typeof x === "string") return; const k = copyKey(x); if (k && !k.endsWith("|")) (byKey.get(k) || byKey.set(k, []).get(k)).push(x); });
  const done = new Set();
  list = list.filter(x => { if (typeof x === "string") return true; const k = copyKey(x), g = byKey.get(k); if (!g || g.length < 2) return true; if (done.has(k)) return false; done.add(k); return true; });
  const multi = c => { const g = byKey.get(copyKey(c)); return g && g.length > 1 ? g : null; };
  const mark = (html, c) => { const g = multi(c); if (!g) return html; const n = g.reduce((a, x) => a + (x.copies || 1), 0);
    return html.replace(`data-id="${esc(c.id)}"`, `data-id="${esc(c.id)}" data-copies="${esc(g.map(x => x.id).join(","))}"`)
      .replace(/<span class="chip">Z[^<]*<\/span>/, "").replace(/<span class="chip trade">\d+×<\/span>/, "")
      .replace(/<div class="chips">/, `<div class="chips"><span class="chip trade" title="Separate copies">${n}×</span>${(gs => gs.length ? `<span class="chip">${esc(gs.join(" / "))}</span>` : "")(g.map(x => x.grade ? "Z" + x.grade : "").filter(Boolean))}`)
      .replace(/(<button class="tile[^>]*>)/, `$1<span class="tilecopies">${n}×</span>`); };
  const one = c => grid ? tileHtml(c) : note ? itemHtml(c, inSeries).replace('<div class="chips">', '<div class="chips">' + (note(c) ? `<span class="chip sortv">${esc(note(c))}</span>` : "")) : itemHtml(c, inSeries);
  return `<div class="${grid ? "cgrid" : "list"}">` + list.map(x => typeof x === "string" ? x : mark(one(x), x)).join("") + "</div>";
}
// Sort other than series order: everything in the place you are, as one list
const COL_SORTS = {
  value: { key: c => { const v = valueOf(c); return v ? toCHF(v.amount, v.cur) : null; }, note: c => { const v = valueOf(c); return v ? money(v.amount, v.cur) : ""; }, label: "value" },
  rating: { key: c => +c.rating ? +c.rating + (c.fav ? 0.01 : 0) : c.fav ? 0.001 : null, note: c => [c.fav ? "♥" : "", +c.rating ? ratingTxt(c.rating) : ""].filter(Boolean).join(" "), label: "your rating" },
  bought: { key: c => c.purchaseDate || null, note: c => c.purchaseDate ? niceDate(c.purchaseDate) : "", label: "purchase date" },
  added: { key: c => c.createdAt || null, note: c => c.createdAt ? stampDate(c.createdAt) : "", label: "date added" }
};
function drawResults() {
  const box = $("#results"); if (!box) return;
  const q = norm(S.filters.q), col = S.col || {};
  // the place you are decides the sub tab (e.g. after saving a book)
  if (col.p) S.colTab = col.p === NOVEL_PUB ? "books" : "comics";
  if (col.pick) S.colTab = String(col.pick).endsWith("|b") ? "books" : "comics";
  const books = S.colTab === "books";
  const pool = S.comics.filter(c => statusMatch(c) && isNovel(c) === books);
  $("#ctc") && ($("#ctc").textContent = S.comics.filter(c => !isNovel(c) && statusMatch(c)).length);
  $("#ctb") && ($("#ctb").textContent = S.comics.filter(c => isNovel(c) && statusMatch(c)).length);
  const crumbs = parts => '<nav class="crumbs" aria-label="Where you are">' + parts.map((p, i) => i === parts.length - 1
    ? `<span aria-current="page">${esc(p.label)}</span>` : `<button class="crumb" data-col='${esc(JSON.stringify(p.col))}'>${esc(p.label)}</button><span class="sep" aria-hidden="true">›</span>`).join("") + '</nav>';
  const more = total => total > S.shown ? '<div class="row" style="justify-content:center;margin-top:12px"><button id="more">Show more (' + (total - S.shown) + ' left)</button></div>' : "";
  let html = "";
  const srt = COL_SORTS[S.colSort];
  if (col.pick) {
    const pk = pickInfo(col.pick);
    let list = S.comics.filter(c => pk.test(c));
    if (q) list = list.filter(c => q.split(" ").every(w => searchText(c).includes(w)));
    list = sortComics(list);
    html = crumbs([{ label: "All", col: {} }, { label: "From Stats" }]) + `<p class="muted small" style="margin:0 0 8px">${list.length} ${esc(pk.label)} · ${esc(valueTag(list) || "")} <button class="link" id="pickback" type="button">Back to Stats</button></p>` +
      (list.length ? entriesHtml(list.slice(0, S.shown)) : '<div class="empty"><h3>Nothing left here</h3><p>Everything in this list has been filled in.</p></div>') + more(list.length);
  } else if (srt) {
    let list = pool.filter(c => (!col.p || publisherOf(c) === col.p) && (!col.g || groupOf(c) === col.g) && (!col.s || seriesKeyOf(c) === col.s)
      && (col.a == null || (splitPeople(c.author)[0] || "") === col.a) && (col.gen == null || (col.gen ? String(c.genre || "").split(",").map(x => x.trim()).includes(col.gen) : !c.genre)));
    if (q) list = list.filter(c => q.split(" ").every(w => searchText(c).includes(w)));
    const withKey = list.filter(c => srt.key(c) != null), without = list.length - withKey.length;
    const ordered = sortComics(withKey).sort((a, b) => { const x = srt.key(a), y = srt.key(b); return x < y ? 1 : x > y ? -1 : 0; });
    const where = col.a != null ? col.a || "Unknown author" : col.gen != null ? col.gen || "No genre" : col.s ? seriesTitle(col.s) : col.g ? col.g : col.p ? col.p : books ? "all books" : "all comics";
    html = (col.p ? crumbs([{ label: "All", col: {} }, { label: where }]) : "") +
      `<p class="muted small" style="margin:0 0 8px">${ordered.length} ${ordered.length === 1 ? "entry" : "entries"} in ${esc(where)}, by ${srt.label}${without ? ` · ${without} without ${srt.label} not shown` : ""} · <button class="link" id="sortoff" type="button">Series order</button></p>` +
      (ordered.length ? entriesHtml(ordered.slice(0, S.shown), false, srt.note) : '<div class="empty"><h3>Nothing to sort here</h3><p>None of these entries has a ' + esc(srt.label) + ' yet.</p></div>') + more(ordered.length);
  } else if (q) {
    const list = sortComics(pool.filter(c => q.split(" ").every(w => searchText(c).includes(w))));
    html = `<p class="muted small" style="margin:0 0 8px">${list.length} ${list.length === 1 ? "match" : "matches"} in ${books ? "your books" : "all series"}</p>` +
      (list.length ? entriesHtml(list.slice(0, S.shown)) : '<div class="empty"><h3>Nothing matches</h3><p>Try another search word or change Show.</p></div>') + more(list.length);
  } else if (books && !col.s) {
    html = booksBrowse(pool, col, crumbs, more);
  } else if (!col.p) {
    const pubs = {};
    pool.forEach(c => { const p = publisherOf(c); (pubs[p] = pubs[p] || []).push(c); });
    const names = Object.keys(pubs).sort(pubCompare);
    html = (S.arrangeLater || books ? "" : arrangeCard()) + `<p class="muted small" style="margin:0 0 8px">${countText(pool)}</p>` +
      (names.length ? '<div class="list">' + names.map(p => {
        const list = pubs[p], nGroups = new Set(list.map(groupOf)).size, nSeries = new Set(list.map(seriesKeyOf)).size;
        const target = isBookUni(p) ? { p, g: BOOK_GROUP } : { p };
        const sub = isBookUni(p) ? `${nSeries} ${nSeries === 1 ? "series" : "series"}` : `${nGroups} ${nGroups === 1 ? "group" : "groups"} · ${nSeries} series`;
        return `<button class="folder pub" data-col='${esc(JSON.stringify(target))}'><div style="min-width:0"><div class="t">${esc(p)}</div>
          <div class="s">${sub} · ${esc([countText(list), valueTag(list)].filter(Boolean).join(" · "))}</div></div><span class="count">${list.length}</span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("") + '</div>' : '<div class="empty"><h3>Nothing to show</h3><p>Nothing in your archive fits “Show”. Change it above.</p></div>');
  } else if (!col.g) {
    const inPub = pool.filter(c => publisherOf(c) === col.p);
    const groups = {};
    inPub.forEach(c => { const g = groupOf(c); (groups[g] = groups[g] || []).push(c); });
    const names = Object.keys(groups).sort(groupCompare);
    html = crumbs([{ label: "All", col: {} }, { label: col.p }]) +
      (names.length ? '<div class="list">' + names.map(g => {
        const list = groups[g], nSeries = new Set(list.map(seriesKeyOf)).size;
        return `<button class="folder" data-col='${esc(JSON.stringify({ p: col.p, g }))}'><div style="min-width:0"><div class="t">${esc(g)}</div>
          <div class="s">${nSeries} series · ${esc([countText(list), valueTag(list)].filter(Boolean).join(" · "))}</div></div><span class="count">${list.length}</span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("") + '</div>' : '<div class="empty"><h3>Nothing to show here</h3><p>Nothing here fits “Show”. Change it above.</p></div>');
  } else if (!col.s) {
    const inGroup = pool.filter(c => publisherOf(c) === col.p && groupOf(c) === col.g);
    const bySeries = {};
    inGroup.forEach(c => { const k = seriesKeyOf(c); (bySeries[k] = bySeries[k] || []).push(c); });
    const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
    const allKeys = Object.keys(bySeries).sort((a, b) => ((order[a] ?? 999) - (order[b] ?? 999)) || seriesTitle(a).localeCompare(seriesTitle(b), "de", { numeric: true }));
    const singleKeys = allKeys.filter(k => isSingleSeries(seriesById(k))), keys = allKeys.filter(k => !singleKeys.includes(k));
    const singles = singleKeys.flatMap(k => bySeries[k]).sort((a, b) => seriesTitle(seriesKeyOf(a)).localeCompare(seriesTitle(seriesKeyOf(b)), "de", { numeric: true }));
    const trail = isBookUni(col.p) ? [{ label: "All", col: {} }, { label: col.p }] : [{ label: "All", col: {} }, { label: col.p, col: { p: col.p } }, { label: col.g }];
    html = crumbs(trail) +
      (keys.length ? '<div class="list">' + keys.map(k => {
        const list = bySeries[k], se = seriesById(k), yrs = yearsText(list);
        return `<button class="folder" data-col='${esc(JSON.stringify({ p: col.p, g: col.g, s: k }))}'><div style="min-width:0"><div class="t">${esc(seriesTitle(k))}${se && se.short ? ` <span class="chip">${esc(se.short)}</span>` : ""}</div>
          <div class="s">${esc([countText(list), yrs, valueTag(list)].filter(Boolean).join(" · "))}</div></div><span class="count">${list.length}</span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("") + '</div>' : singles.length ? "" : '<div class="empty"><h3>Nothing to show here</h3><p>Nothing in this group fits “Show”. Change it above.</p></div>') +
      (singles.length ? `<h3 class="listhead">Single comics <span class="muted">${singles.length}</span></h3>` + entriesHtml(singles) : "");
  } else {
    const list = sortComics(pool.filter(c => publisherOf(c) === col.p && groupOf(c) === col.g && seriesKeyOf(c) === col.s));
    let lastYear = null; const rows = [];
    const byYear = list.some(c => /^\d{4}\//.test(c.issueLabel || ""));
    list.slice(0, S.shown).forEach(c => {
      if (byYear) {
        const y = (/^(\d{4})[\/-]/.exec(c.issueLabel || "") || [])[1] || "Other";
        if (y !== lastYear) { const n = list.filter(x => ((/^(\d{4})[\/-]/.exec(x.issueLabel || "") || [])[1] || "Other") === y).length; rows.push(`<h4 class="yearhead">${esc(y)}<span>${n}</span></h4>`); lastYear = y; }
      }
      rows.push(c);
    });
    const trail = col.p === NOVEL_PUB ? [{ label: "All books", col: {} }, { label: seriesTitle(col.s) }]
      : isBookUni(col.p)
      ? [{ label: "All", col: {} }, { label: col.p, col: { p: col.p, g: col.g } }, { label: seriesTitle(col.s) }]
      : [{ label: "All", col: {} }, { label: col.p, col: { p: col.p } }, { label: col.g, col: { p: col.p, g: col.g } }, { label: seriesTitle(col.s) }];
    html = crumbs(trail) + seriesAbout(seriesById(col.s) || bookAboutObj(col.s)) +
      `<p class="muted small" style="margin:0 0 8px">${esc([countText(list), valueTag(list)].filter(Boolean).join(" · "))}</p>` +
      (list.length ? entriesHtml(rows, true) : '<div class="empty"><h3>Nothing to show here</h3><p>Nothing in this series fits “Show”. Change it above.</p></div>') + more(list.length);
  }
  if (S.filters.status === "trade" && !books) html = `<div class="row" style="gap:8px;margin:0 0 8px"><button type="button" id="tradecopy">Copy trade list</button><span class="small muted">for swapping: series and numbers, spare copies marked</span></div><textarea id="tradebox" class="mono" rows="5" readonly hidden></textarea>` + html;
  box.innerHTML = html;
  $("#tradecopy") && ($("#tradecopy").onclick = async () => {
    const txt = tradeText(), tb = $("#tradebox");
    try { await navigator.clipboard.writeText(txt); toast("Trade list copied"); } catch (e) { tb.value = txt; tb.hidden = false; tb.select(); toast("Press and hold the text, then Copy."); }
  });
  box.querySelectorAll("[data-col]").forEach(b => b.onclick = () => openCol(JSON.parse(b.dataset.col)));
  const ab = box.querySelector(".serabout"); if (ab) ab.ontoggle = () => { S.aboutOpen = ab.open; };
  box.querySelectorAll(".item, .tile").forEach(b => b.onclick = () => {
    const ids = (b.dataset.copies || "").split(",").filter(Boolean);
    if (ids.length < 2) { S.editing = b.dataset.id; S.draft = null; nav("add"); return; }
    // which copy? each with what tells them apart
    const rows = ids.map((id, i) => { const c = S.comics.find(x => x.id === id); if (!c) return "";
      const bits = [c.grade ? "Z" + c.grade : "", typeof c.pricePaid === "number" ? money(c.pricePaid, c.currency) : "", c.source, c.purchaseDate ? niceDate(c.purchaseDate) : "", (c.copies || 1) > 1 ? "×" + c.copies : "", c.notes].filter(Boolean).join(" · ");
      return `<button class="item" type="button" data-pickcopy="${esc(id)}" style="grid-template-columns:1fr"><div style="min-width:0"><div class="t">Copy ${i + 1}</div><div class="s">${esc(bits || "no details yet")}</div></div></button>`; }).join("");
    if (!$("#cellpick")) { const pick = document.createElement("div"); pick.id = "cellpick"; box.appendChild(pick); }
    sheetOpen(`<h3 style="margin:0 0 8px">Which copy?</h3><div class="list">${rows}</div><button class="ghost" type="button" id="copyx" style="margin-top:8px">Cancel</button>`);
    document.querySelectorAll("[data-pickcopy]").forEach(x => x.onclick = () => { sheetClose(); S.editing = x.dataset.pickcopy; S.draft = null; nav("add"); });
    $("#copyx").onclick = sheetClose;
  });
  box.querySelectorAll("[data-bview]").forEach(b => b.onclick = () => { S.bookView = b.dataset.bview; try { localStorage.setItem("da-bookview", S.bookView); } catch (e) {} S.shown = 200; drawResults(); });
  $("#pickback") && ($("#pickback").onclick = () => nav("stats"));
  $("#sortoff") && ($("#sortoff").onclick = () => { S.colSort = "series"; const sel = $("#fsort"); if (sel) sel.value = "series"; drawResults(); });
  $("#more") && ($("#more").onclick = () => { S.shown += 300; drawResults(); });
  $("#newbook") && ($("#newbook").onclick = () => { S.editing = null; S.draft = blankDraft({ kind: "book", bookType: "book", seriesId: "_book" }); nav("add"); });
  bindArrangeCard();
}

function seriesOptions(selected, label) {
  const groups = {};
  S.series.forEach(s => { const g = (s.publisher || OTHER_PUB) + " · " + (s.group || OTHER_GROUP); (groups[g] = groups[g] || []).push(s); });
  const key = k => { const [p, g] = k.split(" · "); return [p, g]; };
  return Object.keys(groups).sort((a, b) => pubCompare(key(a)[0], key(b)[0]) || groupCompare(key(a)[1], key(b)[1])).map(g =>
    `<optgroup label="${esc(g)}">` + groups[g].map(s => `<option value="${esc(s.id)}"${selected === s.id ? " selected" : ""}>${esc(label(s))}</option>`).join("") + "</optgroup>").join("");
}
// ---- series picker: a searchable full-screen list instead of a long drop-down ----
function pickerItems(opts) {
  const cnt = {}; S.comics.forEach(c => { const k = c.kind === "book" ? "book:" + (c.seriesName || "") : c.seriesId; cnt[k] = (cnt[k] || 0) + 1; });
  const items = S.series.filter(s => !(opts.noSingles && isSingleSeries(s))).map(s => ({ key: s.id, label: seriesLabel(s), short: s.short || "", group: (s.publisher || OTHER_PUB) + " · " + (s.group || OTHER_GROUP), uni: s.publisher || OTHER_PUB, code: (catEntry(s) || {}).code || s.code || "", n: cnt[s.id] || 0 }));
  if (opts.books) { const names = {}; (S.bookSeriesExtra || []).forEach(x => { names[x.name] = !!x.novel; }); S.comics.forEach(c => { if (c.kind === "book" && c.seriesName) names[c.seriesName] = isNovel(c); }); Object.keys(names).forEach(n => items.push({ key: "book:" + n, label: n, short: "", group: names[n] ? "Book series" : "Book series (comic books)", uni: "Book series", code: "", n: cnt["book:" + n] || 0 })); }
  return items;
}
function seriesKeyLabel(key) {
  if (!key) return "Choose a series";
  if (key === "_other") return "New series…";
  if (key.startsWith("book:")) return key.slice(5);
  const se = seriesById(key); return se ? seriesLabel(se) : "Choose a series";
}
function rememberSeries(key) {
  if (!key || key === "_other") return;
  S.recentSeries = [key].concat((S.recentSeries || []).filter(k => k !== key)).slice(0, 6);
  setConfig("recentSeries", S.recentSeries).catch(() => {});
}
// opts: { current, allowNew, books, onlyMine, title }; resolves to the chosen key or null
function pickSeries(opts) {
  return new Promise(resolve => {
    const all = pickerItems(opts), byKey = Object.fromEntries(all.map(x => [x.key, x]));
    let onlyMine = !!opts.onlyMine;
    const box = document.createElement("div"); box.className = "picker"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", opts.title || "Choose a series");
    box.innerHTML = `<div class="pk-head"><strong>${esc(opts.title || "Choose a series")}</strong><button class="ghost" type="button" data-x>Close</button></div>
      <input type="search" class="pk-q" placeholder="Type to search: name, short name, group or code" autocomplete="off">
      ${opts.books !== undefined || opts.onlyMine !== undefined ? `<label class="check pk-mine" style="min-height:0"><input type="checkbox"${onlyMine ? " checked" : ""}> Only series I have comics in</label>` : ""}
      <div class="pk-list"></div>`;
    document.body.appendChild(box); document.body.classList.add("noscroll");
    const list = box.querySelector(".pk-list"), q = box.querySelector(".pk-q");
    const close = v => { box.remove(); document.body.classList.remove("noscroll"); if (v) rememberSeries(v); resolve(v || null); };
    const row = x => `<button type="button" class="pk-item${x.key === opts.current ? " on" : ""}" data-k="${esc(x.key)}"><span class="t">${esc(x.label)}${x.short ? ` <span class="chip">${esc(x.short)}</span>` : ""}</span><span class="s">${esc([x.group.replace(/^Disney · /, ""), x.code].filter(Boolean).join(" · "))}</span><span class="n">${x.n || ""}</span></button>`;
    const draw = () => {
      const words = norm(q.value).split(" ").filter(Boolean);
      const pool = all.filter(x => !onlyMine || x.n || x.key === opts.current);
      let html = "";
      if (words.length) {
        const hits = pool.filter(x => { const t = norm([x.label, x.short, x.group, x.code].join(" ")); return words.every(w => t.includes(w)); })
          .sort((a, b) => (norm(a.short) === words.join(" ") ? -1 : 0) - (norm(b.short) === words.join(" ") ? -1 : 0) || b.n - a.n || a.label.localeCompare(b.label, "de", { numeric: true }));
        html = hits.length ? hits.map(row).join("") : '<p class="muted small" style="padding:12px">No series matches. Try fewer letters.</p>';
      } else {
        const recent = (S.recentSeries || []).map(k => byKey[k]).filter(x => x && pool.includes(x));
        if (opts.allowNew) html += '<button type="button" class="pk-item pk-new" data-k="_other"><span class="t">+ New series…</span></button>';
        if (recent.length) html += '<h4 class="pk-h">Recently used</h4>' + recent.map(row).join("");
        const unis = {}; pool.forEach(x => { (unis[x.uni] = unis[x.uni] || {}); (unis[x.uni][x.group] = unis[x.uni][x.group] || []).push(x); });
        Object.keys(unis).sort((a, b) => a === "Book series" ? 1 : b === "Book series" ? -1 : pubCompare(a, b)).forEach(u => {
          const groups = unis[u], n = Object.values(groups).reduce((a, l) => a + l.length, 0), open = Object.values(groups).some(l => l.some(x => x.key === opts.current));
          html += `<details class="pk-uni"${open ? " open" : ""}><summary><span>${esc(u)}</span><span class="muted small">${n}</span></summary>` +
            Object.keys(groups).sort(groupCompare).map(g => `${Object.keys(groups).length > 1 || g.split(" · ")[1] !== u ? `<h4 class="pk-h">${esc(g.split(" · ").slice(1).join(" · ") || g)}</h4>` : ""}` + groups[g].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "de", { numeric: true })).map(row).join("")).join("") + "</details>";
        });
      }
      list.innerHTML = html;
      list.querySelectorAll("[data-k]").forEach(b => b.onclick = () => close(b.dataset.k));
    };
    q.oninput = draw;
    box.querySelector("[data-x]").onclick = () => close(null);
    const mine = box.querySelector(".pk-mine input"); if (mine) mine.onchange = () => { onlyMine = mine.checked; draw(); };
    box.addEventListener("keydown", e => { if (e.key === "Escape") close(null); if (e.key === "Enter") { const f = list.querySelector("[data-k]"); if (f && q.value) close(f.dataset.k); } });
    draw(); setTimeout(() => q.focus(), 50);
    const cur = list.querySelector(".pk-item.on"); if (cur) cur.scrollIntoView({ block: "center" });
  });
}
// series button with ‹ › to step through the series you have comics in
function gapOrder() {
  const has = new Set(S.comics.map(c => c.kind === "book" ? "book:" + (c.seriesName || "") : c.seriesId));
  return pickerItems({ books: true }).filter(x => has.has(x.key) && x.key !== "book:").map(x => x.key);
}
function gapPicker(cur) {
  return `<div class="gappick" style="flex:1 1 260px"><span class="l">Series</span><div class="row" style="gap:6px;flex-wrap:nowrap">
    <button type="button" class="ghost stepbtn" id="gsPrev" aria-label="Previous series">‹</button>
    <button type="button" class="pickbtn" id="gsBtn"><span>${esc(seriesKeyLabel(cur))}</span><span class="chev" aria-hidden="true">▾</span></button>
    <button type="button" class="ghost stepbtn" id="gsNext" aria-label="Next series">›</button></div></div>`;
}
function bindGapPicker() {
  const go = k => { if (k) { S.gapSeries = k; rememberSeries(k); render(); } };
  $("#gsBtn") && ($("#gsBtn").onclick = async () => go(await pickSeries({ current: S.gapSeries, books: true, onlyMine: true, noSingles: true, title: "Gap grid for" })));
  const step = dir => { const o = gapOrder(); if (!o.length) return; const i = o.indexOf(S.gapSeries); go(o[(i < 0 ? 0 : i + dir + o.length) % o.length]); };
  $("#gsPrev") && ($("#gsPrev").onclick = () => step(-1));
  $("#gsNext") && ($("#gsNext").onclick = () => step(1));
}
function bookSeriesOptions(selected) {
  const names = {}; S.comics.forEach(c => { if (c.kind === "book" && c.seriesName) names[c.seriesName] = isNovel(c); });
  const keys = Object.keys(names).sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
  return keys.length ? '<optgroup label="Book series">' + keys.map(n => `<option value="${esc("book:" + n)}"${selected === "book:" + n ? " selected" : ""}>${esc(n)}${names[n] ? "" : " (comic books)"}</option>`).join("") + "</optgroup>" : "";
}
// gap grid for a book series: volumes 1..n
function bookGapsHtml() {
  const name = S.gapSeries.slice(5), mine = S.comics.filter(c => c.kind === "book" && c.seriesName === name);
  // whole volumes and in-between ones like 0.5 (a novella before volume 1)
  const vol = c => { const m = /^\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*$/.exec(String(c.issue || "")); return m ? +m[1].replace(",", ".") : null; };
  const own = new Map(), want = new Map();
  mine.forEach(c => { const v = vol(c); if (v != null) (c.status === "wanted" ? want : own).set(v, c); });
  const sizes = S.bookSizes || {}, maxHave = Math.floor(Math.max(0, ...mine.map(c => vol(c) || 0))), size = Math.max(+sizes[name] || 0, maxHave);
  const extraVols = [...new Set([...own.keys(), ...want.keys()].filter(v => !Number.isInteger(v) || v === 0))];
  const squares = [...new Set([...Array(size).keys()].map(i => i + 1).concat(extraVols))].sort((x, y) => x - y);
  let cells = "";
  for (const n of squares) {
    const o = own.get(n), w = want.get(n);
    cells += `<button class="cell${Number.isInteger(n) ? "" : " half"} ${o && w ? "owned conflict" : o ? "owned" : w && wishLevel(w) ? "wanted wl-" + wishLevel(w) : w ? "wanted" : ""}" data-vol="${n}" data-id="${esc((o || w || {}).id || "")}" title="${esc(name + " " + n + (o ? " · owned" : w ? " · on wishlist" : " · missing"))}">${n}</button>`;
  }
  const noVol = mine.filter(c => vol(c) == null);
  const ownCount = [...own.keys()].length, wantCount = [...want.keys()].filter(k => !own.has(k)).length;
  const wl = sortComics(S.comics.filter(c => c.status === "wanted"));
  return gapTabs() + gapHead(ownCount, wantCount, squares.length, { read: false, legend: '<span><i style="background:var(--owned)"></i>Owned</span><span><i style="background:var(--wanted-soft);box-shadow:inset 0 0 0 1.5px var(--wanted)"></i>Wishlist</span><span><i style="background:var(--cell)"></i>Missing</span>' }) + `
    <div class="row" style="align-items:end;gap:8px"><label style="max-width:220px"><span class="l">Volumes in this series</span><input id="bsize" type="number" min="1" inputmode="numeric" value="${esc(sizes[name] || "")}" placeholder="${maxHave || "e.g. 7"}"></label><button id="bsizego" type="button">Save</button></div>
    ${noVol.length ? `<p class="small muted" style="margin:0">${noVol.length} ${noVol.length === 1 ? "book has" : "books have"} no volume number, so ${noVol.length === 1 ? "it isn't" : "they aren't"} in the grid: ${noVol.map(c => esc(c.title)).join(", ")}.</p>` : ""}
    ${seriesAbout(bookAboutObj("book:" + name))}
    <div id="cellpick"></div>
    ${size ? `<div class="${gridClass(true)}" id="gridbox"><div class="cells">${cells}</div></div>` : '<p class="muted small" style="margin:0">Give the volume numbers on your books, or enter how many volumes the series has.</p>'}`;
}
function bindBookGaps() {
  const name = S.gapSeries.slice(5), mine = S.comics.filter(c => c.kind === "book" && c.seriesName === name);
  const extra = (S.bookSeriesExtra || []).find(x => x.name === name);
  const proto = mine[0] || { bookType: extra && extra.novel ? "book" : "" };
  bindGapTabs(); bindGapHead(); bindGapPicker();
  $("#bsizego").onclick = async () => { S.bookSizes = Object.assign({}, S.bookSizes, { [name]: parseInt($("#bsize").value, 10) || "" }); await setConfig("bookSizes", S.bookSizes); toast("Saved"); render(); };
  document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
  document.querySelectorAll("details.wishseries").forEach(d => d.ontoggle = () => { S.wishOpen = S.wishOpen || {}; S.wishOpen[d.dataset.wk] = d.open; });
  document.querySelectorAll(".cell[data-vol]").forEach(b => b.onclick = () => {
    if (b.dataset.id) { S.editing = b.dataset.id; S.draft = null; nav("add"); return; }
    const v = b.dataset.vol, base = { kind: "book", bookType: proto.bookType || "", seriesId: "_book", seriesName: name, issue: v, author: proto.author || "", publisher: proto.publisher || "", lang: proto.lang || "" };
    const box = $("#cellpick");
    sheetOpen(`<div class="confirm"><strong>${esc(name)} ${esc(v)}</strong><button class="primary" id="cpOwn">I own it…</button><button id="cpWant">Add to wishlist…</button><button class="ghost" id="cpX">Cancel</button></div>`);
    $("#cpX").onclick = sheetClose;
    $("#cpOwn").onclick = () => { S.editing = null; S.draft = blankDraft(base); nav("add"); };
    $("#cpWant").onclick = () => { S.editing = null; S.draft = blankDraft(Object.assign(base, { status: "wanted" })); nav("add"); };
  });
}
function duckipediaCard(c) {
  const dk = c.duckipedia, i = dk.issue || {};
  const facts = [["Title", i.title], ["Released", i.date], ["Price", i.price], ["Editor-in-chief", i.editor], ["Translation", i.translator], ["Pages", i.pages], ["ISBN", i.isbn], ["Notes", i.notes]].filter(x => x[1]);
  return `<div class="card stack dkcard"><div class="row between"><h3>Issue details from Duckipedia</h3><span class="small muted">${esc(dk.fetched || "")}</span></div>
    ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
    <p class="small muted" style="margin:0">Text (also the story details and plots) from <a href="${esc(dk.url)}" target="_blank" rel="noopener">Duckipedia: ${esc(dk.page)}</a>, under the GNU Free Documentation License 1.2. <a href="${esc(dk.authors)}" target="_blank" rel="noopener">List of authors</a>.</p></div>`;
}
// one story with INDUCKS (title, code, writer, artist) and Duckipedia (German title, original, translator, characters, plot) together
function storyView(s) {
  const by = [s.writer && s.writer === s.artist ? "Writer and artist: " + s.writer : s.writer && "Writer: " + s.writer, s.artist && s.artist !== s.writer ? "Artist: " + s.artist : "", s.hero].filter(Boolean).join(" · ");
  const more = [s.original && "Original: " + s.original, s.translator && "Translation: " + s.translator, s.genre, s.first && "First published " + s.first, s.firstDe && "First in German: " + s.firstDe, s.reprintFrom && "Reprinted from " + s.reprintFrom, s.reprintedIn && "Reprinted in " + s.reprintedIn].filter(Boolean).join(" · ");
  const other = s.dTitle && norm(s.dTitle) !== norm(s.title) ? s.dTitle : "";
  return `<div class="dkstory"><div class="t">${esc(s.title || s.dTitle || "Untitled")}${s.code ? ` <a class="mono muted small" href="https://inducks.org/story.php?c=${encodeURIComponent(s.code)}" target="_blank" rel="noopener">${esc(s.code)}</a>` : ""}</div>
    ${other ? `<div class="s">Duckipedia title: ${esc(other)}</div>` : ""}${by ? `<div class="s">${esc(by)}</div>` : ""}${more ? `<div class="s">${esc(more)}</div>` : ""}
    ${s.characters ? `<div class="s">Characters: ${esc(s.characters)}</div>` : ""}
    ${s.plot ? `<details><summary class="small">Plot</summary><p class="small" style="white-space:pre-line">${esc(s.plot)}</p></details>` : ""}</div>`;
}

// ---- a comic or book to look at, without editing: everything known about it, with Edit for changes ----
function detailHtml(c) {
  const isBook = c.kind === "book", se = isBook ? null : seriesById(c.seriesId);
  const row = (k, v) => v || v === 0 ? `<dt>${esc(k)}</dt><dd>${v}</dd>` : "";
  const t = esc;
  const head = isBook ? c.title || "Untitled" : comicTag(c);
  const grade = (GRADES.find(g => g[0] === c.grade) || [])[1];
  const v = valueOf(c), lot = c.lotId ? lotInfo(c.lotId) : null;
  const facts = isBook ? [
      row("Series", t([c.seriesName, c.issue && "vol. " + c.issue].filter(Boolean).join(" "))), row("Author", t(c.author)), row("Translator", t(c.translator)), row("Original title", t(c.originalTitle)),
      row("Publisher", t(c.publisher)), row("Year", t(c.date)), row("Pages", t(c.pages)), row("Format", t(c.format)), row("Language", t(c.lang)), row("Genres", t(c.genre)), row("ISBN", t(c.isbn))]
    : [row("Series", t(se ? se.name : c.seriesName)), row("Issue", t(showLabel(c.issueLabel || c.issue || ""))), row("Title", t(c.title)), row("Released", t(niceDate(c.date))), row("Pages", t(c.pages)), row("Format", t(c.format)), row("Edition", t(c.edition)), row("Genres", t(c.genre || storyGenres(c))),
      row("INDUCKS", c.inducks ? `<a href="https://inducks.org/issue.php?c=${encodeURIComponent(c.inducks).replace(/%20/g, "+")}" target="_blank" rel="noopener">${t(c.inducks)}</a>` : ""), row("Facsimile", c.facsimile ? "yes, reprint" : "")];
  const copy = c.status === "wanted"
    ? [row("Wishlist", (WISH_LEVELS.find(([k]) => k === wishLevel(c)) || [, "Want"])[1]), row("Maximum price", t(money(c.pricePaid, c.currency))), row("Notes", t(c.notes))]
    : [row("Condition", t(grade)), row("Copies", (c.copies || 1) > 1 ? c.copies : ""), row("Location", t(c.location)),
      row("Paid", t(money(c.pricePaid, c.currency)) + (lot ? ` <span class="muted">(lot of ${lot.members.length}, ${t(money(lot.total, lot.currency))})</span>` : "")),
      row("Bought", t([niceDate(c.purchaseDate), c.source].filter(Boolean).join(" · "))), row("Read", c.read ? "yes" + (c.readDate ? ", " + t(niceDate(c.readDate)) : "") : "not yet"),
      row("For trade", c.forTrade ? "yes" : ""), row("Value", v ? t(money(v.amount * (c.copies || 1), v.cur)) + ` <span class="muted">(${v.how === "checked" ? "checked price" : v.how === "table" ? "price table" : "own estimate"})</span>` : ""),
      row("Special", t(c.special)), row("Extras", (c.extras || []).length ? c.extras.map(x => esc(x.what || "Extra") + (typeof x.value === "number" ? " (" + esc(money(x.value, x.cur || "CHF")) + ")" : "")).join("<br>") : ""), row("Notes", t(c.notes))];
  const cv = coverOf(c);
  return `<div class="row between"><div><h2 style="margin:0">${t(head)}</h2>${!isBook && c.title ? "" : ""}<p class="lede" style="margin:4px 0 0">${t(isBook ? [c.author, c.date].filter(Boolean).join(" · ") : [c.title, niceDate(c.date)].filter(Boolean).join(" · "))}</p></div>
      <span class="row" style="gap:6px"><button id="vback" type="button">Back</button><button id="vedit" class="primary" type="button">Edit</button></span></div>
    <div class="card stack detail">
      <div class="detailtop">${cv ? `<img class="cover" data-zoom="${t(c.id)}" src="${t(cv)}" alt="Cover, tap to enlarge" onerror="this.remove()">` : ""}
        <dl class="facts">${facts.join("")}</dl></div>
      ${c.status !== "wanted" ? `<div class="row" style="gap:10px;align-items:center">${heartHtml(c.fav, 'id="v-fav"')}${starsHtml(c.rating, 'id="v-rating"')}<span class="small muted">saved straight away</span></div>` : ""}
    </div>
    <div class="card stack"><h3>${c.status === "wanted" ? "On your wishlist" : "Your copy"}</h3><dl class="facts">${copy.join("")}</dl></div>
    ${(c.stories || []).length ? `<div class="card stack"><h3>Stories <span class="muted small">${c.stories.length}</span></h3><div class="stories">${c.stories.map(storyView).join("")}</div></div>` : ""}
    ${c.duckipedia ? duckipediaCard(c) : ""}`;
}
function bindDetail(c) {
  $("#vback").onclick = () => goBack();
  $("#vedit").onclick = () => { S.viewMode = false; renderKeep(); window.scrollTo(0, 0); };
  const save = async patch => { try { const saved = await saveComic(Object.assign({}, S.comics.find(x => x.id === c.id) || c, patch)); S.draft = JSON.parse(JSON.stringify(saved)); } catch (e) { toast(errText(e)); } };
  $("#v-fav") && ($("#v-fav").onclick = e => { const on = !e.currentTarget.classList.contains("on"); e.currentTarget.classList.toggle("on", on); e.currentTarget.textContent = on ? "♥" : "♡"; save({ fav: on }); });
  bindStars($("#app"), v => save({ rating: v }));
}
