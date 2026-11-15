// Dagobert Ducks Archiv – Series tab, INDUCKS fill, arrangement, book series.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- fill a series' details from INDUCKS (offline catalogue) and Duckipedia (German series, needs internet) ----
async function fillSeriesInfo(se) {
  const got = [], set = (k, v, label) => { if (v && !se[k]) { se[k] = v; if (!got.includes(label)) got.push(label); } };
  if (!S.inducksDir) { try { const r = await fetch("catalogue/directory.json"); if (r.ok) S.inducksDir = (await r.json()).publications || []; } catch (e) {} }
  let p = se.code && (S.inducksDir || []).find(x => x[0] === se.code);
  if (!p) {   // without a code, only an exact name match counts (no guessing: "Kalle Anka" is not "Kalle Anka & C:o")
    const exact = exactInducks(se);
    if (exact.length === 1) p = exact[0];
    else if (!exact.length) { const near = nearInducks(se); if (near.length === 1) p = near[0]; }
  }
  const badCode = se.code && S.inducksDir && /^(de|ch|at|se|it|us|uk)\//.test(se.code) && !S.inducksDir.some(x => x[0] === se.code);
  if (badCode && p) { got.push("INDUCKS code corrected from " + se.code + " to " + p[0]); se.code = p[0]; }
  else if (badCode) got.warn = "INDUCKS has no publication with the code " + se.code + ": check it on inducks.org";
  const entry = catEntry(se) || (p && catEntry({ name: se.name, code: p[0] }));
  if (p) {
    set("code", p[0], "INDUCKS code"); set("name", p[1], "name");
    set("short", p[0].split("/")[1] || "", "short name");   // de/MMS -> MMS
    set("country", p[0].split("/")[0].toUpperCase(), "country");
    set("pubHouse", p[5] || PUBLISHER_FALLBACK[p[0]] || "", "publisher"); set("format", p[6] || "", "format");
    // INDUCKS lists Disney publications: a series still without universe and group ("Other") gets Disney and its usual group
    if ((!se.publisher || se.publisher === OTHER_PUB) && (!se.group || se.group === OTHER_GROUP)) {
      const a = arrangeSeries(Object.assign({}, se, { publisher: DISNEY, group: "" }));
      se.publisher = a.publisher; se.group = a.group; got.push("universe and group");
    }
  }
  if (entry) {
    const before = JSON.stringify([se.numbering, se.firstYear, se.lastYear, se.latest, se.first]);
    const file = await catalogueFile(entry).catch(() => null);
    if (file) {
      seriesFromCatalogue(se, file, entry);
      // keep the latest issue up to date, not only when it was empty
      if (se.numbering === "year") { const ys = Object.keys(file.issues || {}).map(l => +(/^(\d{4})\//.exec(l) || [])[1]).filter(Boolean); if (ys.length && Math.max(...ys) > (se.lastYear || 0)) se.lastYear = Math.max(...ys); if (ys.length && (!se.firstYear || Math.min(...ys) < +se.firstYear)) se.firstYear = Math.min(...ys); }
      else { const ns = Object.keys(file.issues || {}).filter(l => /^\d+$/.test(l)).map(Number); if (ns.length && Math.max(...ns) > (se.latest || 0)) se.latest = Math.max(...ns); }
    }
    if (JSON.stringify([se.numbering, se.firstYear, se.lastYear, se.latest, se.first]) !== before) got.push(se.numbering === "year" ? "years" : se.first > 1 ? "first and latest issue" : "latest issue");
  } else if (p && se.numbering === "year") {
    if (!se.firstYear && p[3]) { se.firstYear = p[3]; got.push("years"); } if (p[4] && p[4] > (se.lastYear || 0)) { se.lastYear = p[4]; if (!got.includes("years")) got.push("years"); }
  } else if (p && !se.latest && p[2]) { se.latest = p[2]; got.push("latest issue"); }
  if (seriesLang(se) === "German" && (se.publisher || DISNEY) === DISNEY && typeof Duckipedia !== "undefined") {
    try {
      // by name first; a short name (MMS) can lead to another series (Micky Maus SPEZIAL!), so a page found
      // through it only counts when its title fits the series' name
      const short = se.short && /^[A-Z]/.test(se.short) ? se.short : "";
      let d = await Duckipedia.fetchSeries([se.name, p && p[1]]);
      // a Sonderheft, Spezial or Extra often has no page of its own on Duckipedia, but is part of its main series' page
      // ("MEGA Micky Maus Sonderheft" is on the page "MEGA Micky Maus")
      if (!d) { const main = [se.name, p && p[1]].filter(Boolean).map(mainSeriesName).filter(Boolean); if (main.length) { const m = await Duckipedia.fetchSeries(main); if (m && (m.publisher || m.years || m.schedule)) d = m; } }   // only a publication's page (with publisher or years), not a character's
      if (!d && short) { const viaShort = await Duckipedia.fetchSeries([short]); if (viaShort && pageFits(viaShort.page, se, p)) d = viaShort; }
      if (d) {
        set("about", d.description, "description");
        if (d.description && !se.aboutSrc) se.aboutSrc = d.url;
        set("pubHouse", d.publisher, "publisher"); set("format", [d.size, d.pages && d.pages + " pages"].filter(Boolean).join(", "), "format");
      }
    } catch (e) { got.warn = "Duckipedia couldn't be reached"; }
  }
  // other languages: a short description from Wikipedia in the series' language (Kalle Anka & C:o, Topolino …)
  if (!se.about && seriesLang(se) !== "German" && (se.publisher || DISNEY) === DISNEY) {
    const wl = { Swedish: "sv", Italian: "it", Norwegian: "no", English: "en", Danish: "da", French: "fr" }[seriesLang(se)] || "en";
    for (const t of [se.name, p && p[1]].filter(Boolean)) {
      try {
        const r = await fetchWithin(`https://${wl}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(String(t).replace(/ /g, "_"))}`, 10000);
        if (!r.ok) continue; const j = await r.json();
        // not an article about a character ("Stål-Kalle Pocket" leads to the article on Stål-Kalle, a "seriefigur")
        const character = /figur|karakt[äe]r|character|personaggio|personnage|skikkelse/i.test(j.description || "") || /^\S+(\s\S+)?\s(är|er|è|est|is)\s(en|ett|un|una|a|an)\s(fiktiv|tecknad|seriefigur|personaggio|fictional|cartoon)/i.test(j.extract);
        if (j.type === "standard" && j.extract && !character && pageFits(j.title || t, se, p) && /disney|kalle|anka|topolino|paperino|serie|tidning|fumetto|comic/i.test(j.extract)) { se.about = j.extract.slice(0, 700); se.aboutSrc = (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""; se.srcName = "Wikipedia"; se.srcLic = "CC BY-SA"; got.push("description"); break; }
      } catch (e) {}
    }
  }
  return got;
}
// ---- INDUCKS status of a series: in the offline catalogue, only on INDUCKS, or not found ----
function inducksCandidates(se) {
  const dir = S.inducksDir; if (!dir) return []; const dn = dirNorm();
  const n = norm(String(se.name).replace(/\s*\([^)]*\)\s*$/, "")), lang = seriesLang(se);
  const cc = { German: ["de", "ch", "at"], Swedish: ["se"], Italian: ["it"], Norwegian: ["no"], Danish: ["dk"], English: ["us", "uk"] }[lang] || null;
  const l = loose(n);
  return dir.filter((p, i) => (!cc || cc.includes(p[0].split("/")[0])) && (dn[i] === n || dn[i].replace(/\s+\d+$/, "") === n || (n.length > 8 && dn[i].includes(n)) || (l.length >= 8 && S.dirLoose[i] === l)))
    .sort((a, b) => b[2] - a[2]).slice(0, 3);
}
// "Add to catalogue": a ready-filled request on the app's GitHub repository; a GitHub job adds the series and rebuilds the catalogue
const APP_REPO = "FelixWylt/DDCA-Zwischenstopp";
function catalogueRequestUrl(code, name) {
  const body = "Series: " + name + "\nINDUCKS: https://inducks.org/publication.php?c=" + encodeURIComponent(code) + "\n\nSent from Dagobert Ducks Archiv. Just tap Submit.";
  return `https://github.com/${APP_REPO}/issues/new?title=${encodeURIComponent("Add to catalogue: " + code)}&body=${encodeURIComponent(body)}`;
}
// INDUCKS publications with exactly this series' name, in its country (searched in the whole directory, not just the top hits)
// a web request that gives up after ms milliseconds (some sites never answer)
// "MEGA Micky Maus Sonderheft" -> "MEGA Micky Maus"; "" when the name has no such ending
function mainSeriesName(n) {
  const m = /^(.{4,}?)\s*[-–:(]?\s*\b(sonderhefte?|sonderb(?:a|ä)nde?|sonderausgabe|sonderedition|spezial|special|extra|sammelb(?:a|ä)nde?)\b\)?\s*$/i.exec(String(n || "").trim());
  return m ? m[1].trim() : "";
}
// does a Duckipedia page title fit a series? "Lustiges Taschenbuch" fits LTB; "Micky Maus SPEZIAL!" doesn't fit MEGA Micky Maus Sonderheft
function pageFits(title, se, p) {
  const words = t => norm(t).split(" ").filter(w => w.length > 2 && !["der", "die", "das", "und", "von", "the", "and"].includes(w));
  const like = (a, b) => { const wa = words(a), nb = " " + norm(b) + " "; return wa.length > 0 && wa.every(w => nb.includes(" " + w + " ")); };
  return [se.name, p && p[1]].filter(Boolean).some(n => like(title, n) || like(n, title));
}
async function fetchWithin(url, ms, opt) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, Object.assign({}, opt, { signal: ac.signal })); } finally { clearTimeout(t); }
}
// the directory's names, simplified once (comparing 2,774 names for every series on every redraw was slow on the phone)
function dirNorm() {
  const dir = S.inducksDir || [];
  if (S.dirNormOf !== dir) { S.dirNormOf = dir; S.dirNorm = dir.map(p => norm(p[1])); S.dirLoose = S.dirNorm.map(loose); }
  return S.dirNorm;
}
// singular and plural count as the same name: "Sonderhefte" = "Sonderheft", "Taschenbücher" ≈ "Taschenbuch"
const loose = n => n.replace(/ü/g, "u").split(" ").map(w => w.length > 4 ? w.replace(/(en|er|e|n|s)$/, "") : w).join(" ");
function nearInducks(se) {
  const dir = S.inducksDir || [], dn = dirNorm(), l = loose(norm(String(se.name).replace(/\s*\([^)]*\)\s*$/, ""))), lang = seriesLang(se);
  const cc = { German: ["de", "ch", "at"], Swedish: ["se"], Italian: ["it"], Norwegian: ["no"], Danish: ["dk"], English: ["us", "uk"] }[lang] || null;
  return l.length < 8 ? [] : dir.filter((p, i) => (!cc || cc.includes(p[0].split("/")[0])) && S.dirLoose[i] === l);
}
function exactInducks(se) {
  const dir = S.inducksDir || [], dn = dirNorm(), n = norm(String(se.name).replace(/\s*\([^)]*\)\s*$/, "")), lang = seriesLang(se);
  const cc = { German: ["de", "ch", "at"], Swedish: ["se"], Italian: ["it"], Norwegian: ["no"], Danish: ["dk"], English: ["us", "uk"] }[lang] || null;
  return dir.filter((p, i) => (!cc || cc.includes(p[0].split("/")[0])) && dn[i] === n);
}
// Disney series that are on INDUCKS but not in the offline catalogue: by their code, or else by an exact name match only
function missingFromCatalogue() {
  if (!S.inducksDir || !S.catalogue) return { add: [], unsure: [] };
  const add = [], unsure = [];
  S.series.forEach(se => {
    if ((se.publisher || DISNEY) !== DISNEY || catEntry(se)) return;
    let p = se.code && S.inducksDir.find(x => x[0] === se.code);
    if (!p) { const ex = exactInducks(se); if (ex.length === 1) p = ex[0]; else if (!ex.length) { const nr = nearInducks(se); if (nr.length === 1) p = nr[0]; } }
    if (p) { if (!add.some(x => x.code === p[0])) add.push({ code: p[0], name: se.name }); }
    else if (inducksCandidates(se).length) unsure.push(se.name);
  });
  return { add, unsure };
}
function catalogueRequestAllUrl(list) {
  const body = list.map(x => x.code + " = " + x.name).join("\n") + "\n\nSent from Dagobert Ducks Archiv. Just tap Submit.";
  return `https://github.com/${APP_REPO}/issues/new?title=${encodeURIComponent("Add to catalogue: " + list.length + " series")}&body=${encodeURIComponent(body)}`;
}
function missingCatalogueCard() {
  if (!S.inducksDir) { loadInducksDir(); return ""; }
  const m = missingFromCatalogue();
  if (!m.add.length && !m.unsure.length) return "";
  return `<div class="card stack"><h3>Series missing from the INDUCKS catalogue</h3>
    ${m.add.length ? `<p class="small" style="margin:0">${m.add.length} of your Disney series ${m.add.length === 1 ? "is" : "are"} on INDUCKS but not in the offline catalogue: ${m.add.map(x => esc(x.name) + ` <span class="mono muted">${esc(x.code)}</span>`).join(", ")}.</p>
      <div class="row"><a class="btnlink" style="margin:0;padding:8px 14px" href="${catalogueRequestAllUrl(m.add)}" target="_blank" rel="noopener">Add all ${m.add.length} to the catalogue</a></div>
      <p class="small muted" style="margin:0">Opens one ready-filled request on GitHub; tap Submit (you need to be signed in). The catalogue is rebuilt once, in about 5–10 minutes, then the app offers an update.</p>` : ""}
    ${m.unsure.length ? `<p class="small muted" style="margin:0">Not sure which INDUCKS publication these are, so they aren't included: ${m.unsure.map(esc).join(", ")}. Enter their INDUCKS code in the series, or use Fill from INDUCKS.</p>` : ""}</div>`;
}
function inducksNote(se) {
  if (se.publisher && se.publisher !== DISNEY) return "";
  const ce = catEntry(se);
  if (ce) return `In the offline INDUCKS catalogue as <a href="https://inducks.org/publication.php?c=${encodeURIComponent(ce.code)}" target="_blank" rel="noopener">${esc(ce.code)}</a> “${esc(ce.title)}”, ${Number(ce.issues).toLocaleString("de-CH")} issues.`;
  if (!S.inducksDir) { loadInducksDir(); return "Checking INDUCKS…"; }
  const c = inducksCandidates(se);
  if (!c.length) return "Not found on INDUCKS under this name. If you know its INDUCKS code, enter it above.";
  return "On INDUCKS, but not in your offline catalogue yet: " + c.map(p => `<a href="https://inducks.org/publication.php?c=${encodeURIComponent(p[0])}" target="_blank" rel="noopener">${esc(p[0])}</a> “${esc(p[1])}” (${p[2]} issues${p[3] ? ", " + p[3] + (p[4] && p[4] !== p[3] ? "–" + p[4] : "") : ""}) <a class="btnlink" href="${catalogueRequestUrl(p[0], se.name || p[1])}" target="_blank" rel="noopener">Add to catalogue</a>`).join("; ") +
    ". Tap “Add to catalogue”, then Submit on GitHub (you need to be signed in). The catalogue is rebuilt in about 5 minutes; then the app offers an update.";
}
async function loadInducksDir() {
  if (S.inducksDirLoading) return; S.inducksDirLoading = true;
  try { const r = await fetch("catalogue/directory.json"); if (r.ok) { S.inducksDir = (await r.json()).publications || []; { const mc = $("#misscat"); if (mc) mc.innerHTML = missingCatalogueCard(); } document.querySelectorAll(".inducksnote[data-ni]").forEach(el => { const se = S.series[+el.dataset.ni]; if (se) el.innerHTML = inducksNote(se); }); } } catch (e) {}
}
// ---- one-time rearrangement: universe › country/format ----
// ---- group check: Disney series whose group differs from the arrangement rules; you pick which ones to move ----
function groupCheckCard() {
  if (!arrangedInUse()) return "";
  const diff = S.series.filter(se => se.id && (se.publisher || DISNEY) === DISNEY && arrangeSeries(se).group !== se.group && !(S.groupKeep || []).includes(se.id));
  if (!diff.length) return "";
  return `<div class="card stack" id="gcbox"><h3>Check series groups</h3>
    <p class="small muted" style="margin:0">These ${diff.length} Disney series aren't in the group the rules suggest. Tick the ones to move; unticked ones stay where they are and aren't suggested again.</p>
    <div class="stack" style="gap:6px">${diff.map(se => `<label class="check" style="min-height:0"><input type="checkbox" data-gc="${esc(se.id)}" checked> <span><strong>${esc(se.name)}</strong><br><span class="small muted">${esc(se.group || "no group")} → ${esc(arrangeSeries(se).group)}</span></span></label>`).join("")}</div>
    <div class="row"><button class="primary" id="gcgo" type="button">Apply</button></div></div>`;
}
function bindGroupCheck() {
  $("#gcgo") && ($("#gcgo").onclick = async () => {
    const keep = (S.groupKeep || []).slice(); let moved = 0;
    document.querySelectorAll("[data-gc]").forEach(b => { const se = seriesById(b.dataset.gc); if (!se) return; if (b.checked) { se.group = arrangeSeries(se).group; moved++; } else keep.push(se.id); });
    S.groupKeep = keep; await setConfig("groupKeep", keep);
    try { await saveSeries(); S.col = {}; toast(moved + (moved === 1 ? " series moved" : " series moved")); render(); } catch (e) { toast(errText(e)); }
  });
}
function arrangeCard() {
  const pending = arrangePending();
  if (!pending.length) return "";
  const used = id => S.comics.filter(c => c.seriesId === id).length;
  const plan = S.series.map(se => ({ se, to: pending.includes(se) ? arrangeSeries(se) : { publisher: se.publisher || OTHER_PUB, group: se.group || OTHER_GROUP } }));
  const tree = {};
  plan.forEach(({ se, to }) => { ((tree[to.publisher] = tree[to.publisher] || {})[to.group] = tree[to.publisher][to.group] || []).push(se); });
  const preview = Object.keys(tree).sort(pubCompare).map(u => `<div class="arr-u"><strong>${esc(u)}</strong>` + Object.keys(tree[u]).sort(groupCompare).map(g =>
    `<div class="arr-g">${esc(g)} <span class="muted">· ${tree[u][g].map(se => esc(seriesLabel(se))).join(", ")}</span></div>`).join("") + '</div>').join("");
  const typo = S.series.find(se => /^Lusties Taschenbuch/i.test(se.name) && !/\+\s*$/.test(se.name));
  const empty = S.series.filter(se => !used(se.id) && !DEFAULT_SERIES.some(d => d.id === se.id));
  return `<div class="card stack" id="arrbox"><h3>New arrangement for your series</h3>
    <p class="small" style="margin:0">Top level becomes the <strong>universe</strong> (Disney, Franco-Belgian, Marvel, DC, Swedish comics, Other). Disney series are grouped by <strong>country and format</strong>; the others stay grouped by character. ${pending.length} series move. Your comics, numbers and wishlist don't change, and you can still edit any group below.</p>
    <details><summary class="small">Show the new arrangement</summary><div class="arr-preview small">${preview}</div></details>
    ${typo ? `<label class="check" style="min-height:0"><input id="arrTypo" type="checkbox" checked> Correct the spelling “${esc(typo.name)}” to “${esc(typo.name.replace(/^Lusties/i, "Lustiges"))}” (it stays its own series)</label>` : ""}
    ${empty.length ? `<label class="check" style="min-height:0"><input id="arrEmpty" type="checkbox"> Remove ${empty.length === 1 ? "1 series" : empty.length + " series"} without any comics: ${empty.map(se => esc(se.name)).join(", ")}</label>` : ""}
    <div class="row"><button class="primary" id="arrGo"${S.db ? "" : " disabled"}>Rearrange</button>${S.view === "collection" ? '<button class="ghost" id="arrLater">Not now</button>' : ""}</div></div>`;
}
function bindArrangeCard() {
  const go = $("#arrGo"); if (!go) return;
  $("#arrLater") && ($("#arrLater").onclick = () => { S.arrangeLater = true; $("#arrbox").remove(); });
  go.onclick = async () => {
    go.disabled = true;
    try {
      const pending = arrangePending(), renamed = [];
      pending.forEach(se => Object.assign(se, arrangeSeries(se)));
      if ($("#arrTypo") && $("#arrTypo").checked) S.series.forEach(se => { if (/^Lusties Taschenbuch/i.test(se.name)) { se.name = se.name.replace(/^Lusties/i, "Lustiges"); renamed.push(se); } });
      if ($("#arrEmpty") && $("#arrEmpty").checked) S.series = S.series.filter(se => S.comics.some(c => c.seriesId === se.id) || DEFAULT_SERIES.some(d => d.id === se.id));
      const n = id => S.comics.filter(c => c.seriesId === id).length;
      S.series.sort((a, b) => pubCompare(a.publisher, b.publisher) || groupCompare(a.group, b.group) || n(b.id) - n(a.id) || a.name.localeCompare(b.name, "de", { numeric: true }));
      await saveSeries();
      const fix = S.comics.filter(c => renamed.some(se => se.id === c.seriesId)).map(c => Object.assign({}, c, { seriesName: seriesById(c.seriesId).name }));
      if (fix.length) await saveMany(fix, null, true);
      S.col = {}; toast(pending.length + " series rearranged"); render();
    } catch (e) { toast(errText(e)); go.disabled = false; }
  };
}
// ---- book series (kept as a name on each book) in the Series tab: rename, volumes, info from Wikidata / Wikipedia ----
const bookInfo = n => (S.bookMeta || {})[n] || {};
// ---- Series tab: back path, lists and the book series page ----
function serCrumbs(items, current) {
  return `<nav class="crumbs" aria-label="Path">${items.map(([label, path]) => `<button type="button" class="crumb" data-scr='${esc(JSON.stringify(path))}'>${esc(label)}</button><span class="sep">›</span>`).join("")}<span aria-current="page">${esc(current)}</span></nav>`;
}
function bookSeriesNames() {
  const set = new Set((S.bookSeriesExtra || []).map(x => x.name).filter(Boolean));
  S.comics.forEach(c => { if (c.kind === "book" && c.seriesName) set.add(c.seriesName); });
  return [...set].sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
}
function serListHtml(tab) {
  const q = norm(S.serFind || ""), words = q ? q.split(" ") : [];
  const folder = (attr, title, sub, count, cls) => `<button type="button" class="folder${cls ? " " + cls : ""}" ${attr}><div style="min-width:0"><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}</div><span class="count">${count}</span><span class="chev" aria-hidden="true">›</span></button>`;
  if (tab === "books") {
    const names = bookSeriesNames(), by = {}; S.comics.forEach(c => { if (c.kind === "book" && c.seriesName) (by[c.seriesName] = by[c.seriesName] || []).push(c); });
    const novel = n => (by[n] || []).length ? by[n].some(isNovel) : !!((S.bookSeriesExtra || []).find(x => x.name === n) || {}).novel;
    const row = n => { const bs = by[n] || [], own = bs.filter(c => c.status !== "wanted").length, want = bs.length - own, m = bookInfo(n), size = (S.bookSizes || {})[n] || "";
      const authors = m.author || [...new Set(bs.map(c => splitPeople(c.author)[0]).filter(Boolean))].slice(0, 2).join(", ");
      return { n, find: norm([n, authors].join(" ")), html: folder(`data-sbook="${esc(n)}"`, n, [authors, want ? want + " wanted" : "", size ? size + " volumes" : ""].filter(Boolean).join(" · "), own) }; };
    const rows = names.map(row).filter(r => words.every(w => r.find.includes(w)));
    if (!rows.length) return `<p class="muted small" style="margin:0">${names.length ? "No book series matches." : "No book series yet. Books get one when you fill in Series on a book, or add one here."}</p>`;
    const nov = rows.filter(r => novel(r.n)), cb = rows.filter(r => !novel(r.n));
    return `<div class="list">${nov.length ? `<h4 class="sghead">Books</h4>` + nov.map(r => r.html).join("") : ""}${cb.length ? `<h4 class="sghead">Comic books</h4>` + cb.map(r => r.html).join("") : ""}</div>`;
  }
  const used = {}; S.comics.forEach(c => { used[c.seriesId] = (used[c.seriesId] || 0) + 1; });
  const uOf = s => s.publisher || "No universe yet", gOf = s => s.group || OTHER_GROUP;
  const row = (s, where) => { const i = S.series.indexOf(s), ce = catEntry(s);
    const sub = [where, s.short, s.numbering === "year" ? (s.firstYear || "?") + "–" + (s.lastYear || "?") : s.latest ? (s.first > 1 ? s.first + "–" : "to ") + s.latest : "", ce ? "INDUCKS ✓" : ""].filter(Boolean).join(" · ");
    return folder(`data-sopen="${i}"`, seriesLabel(s) || s.name || "New series", sub, used[s.id] || 0); };
  if (words.length) {
    const hits = S.series.filter(s => words.every(w => norm([s.name, s.short, s.group, uOf(s), s.code].join(" ")).includes(w)));
    return hits.length ? `<p class="small muted" style="margin:0 0 6px">${hits.length} found</p><div class="list">${hits.map(s => row(s, uOf(s) === DISNEY ? gOf(s) : uOf(s) + " › " + gOf(s))).join("")}</div>` : '<p class="muted small" style="margin:0">No series matches.</p>';
  }
  const path = S.serPath || {};
  const inU = S.series.filter(s => uOf(s) === path.u), groups = [...new Set(inU.map(gOf))].sort(groupCompare);
  const g = path.g || (path.u && groups.length === 1 ? groups[0] : null);   // a universe with one group shows its series at once
  if (path.u && inU.length && g) {
    const list = inU.filter(s => gOf(s) === g);
    return serCrumbs(groups.length > 1 ? [["All", {}], [path.u, { u: path.u }]] : [["All", {}]], groups.length > 1 ? g : path.u) + `<div class="list">${list.map(s => row(s, "")).join("") || '<p class="muted small">No series here.</p>'}</div>`;
  }
  if (path.u && inU.length) {
    return serCrumbs([["All", {}]], path.u) + `<div class="list">${groups.map(gr => { const l = inU.filter(s => gOf(s) === gr); return folder(`data-sg="${esc(gr)}"`, gr, l.length + (l.length === 1 ? " series" : " series"), l.reduce((a, s) => a + (used[s.id] || 0), 0)); }).join("")}</div>`;
  }
  const us = [...new Set(S.series.map(uOf))].sort(pubCompare);
  return `<div class="list">${us.map(u => { const l = S.series.filter(s => uOf(s) === u); return folder(`data-su="${esc(u)}"`, u, l.length + " series", l.reduce((a, s) => a + (used[s.id] || 0), 0), "pub"); }).join("")}</div><p class="small muted" style="margin:6px 0 0">The number is how many comics you have entered.</p>`;
}
function bookSeriesPage(n, sect) {
  const bs = S.comics.filter(c => c.kind === "book" && c.seriesName === n), own = bs.filter(c => c.status !== "wanted").length, k = "book:" + n, m = bookInfo(n);
  const size = (S.bookSizes || {})[n] || "";
  const f = (key, label, ph) => `<label><span class="l">${label}</span><input data-bk="${key}" value="${esc(m[key] || "")}" placeholder="${esc(ph || "")}"></label>`;
  return `<div class="row between" style="align-items:baseline"><h3 style="margin:0">${esc(n)}</h3><span class="muted small">${own} ${own === 1 ? "book" : "books"}${bs.length > own ? " · " + (bs.length - own) + " wanted" : ""}</span></div>
    <div class="bookrow" data-old="${esc(n)}">
    ${sect(k, "details", "Details", [m.author, size ? size + " volumes" : "", m.years].filter(Boolean).join(" · "), `<div class="sform">
      <label class="sr-name"><span class="l">Name</span><input data-bk="name" value="${esc(n)}"></label>
      <label><span class="l">Volumes in the series</span><input data-bk="size" type="number" min="1" inputmode="numeric" value="${esc(size)}" placeholder="${Math.max(0, ...bs.map(c => parseInt(c.issue, 10) || 0)) || ""}"></label>
      ${f("author", "Author")}${f("publisher", "Publisher")}${f("years", "Years", "2010–2012")}${f("genres", "Genres", "Fantasy, Adventure")}
      <div class="wide small muted">Renaming changes it on all ${bs.length} ${bs.length === 1 ? "book" : "books"}.</div></div>`, true)}
    ${sect(k, "about", "Description", m.about ? m.about.slice(0, 40) + "…" : "empty", `<div class="sform">
      <label class="wide"><span class="l">About this series</span><textarea data-bk="about" rows="4">${esc(m.about || "")}</textarea></label>
      ${m.aboutSrc ? `<div class="wide small muted">Text from <a href="${esc(m.aboutSrc)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA)${m.wikidata ? ` · <a href="https://www.wikidata.org/wiki/${esc(m.wikidata)}" target="_blank" rel="noopener">Wikidata</a>` : ""}</div>` : ""}</div>`, false)}
    ${sect(k, "prices", "Price ranges", (rs => rs.length ? rs.length + (rs.length === 1 ? " range" : " ranges") : "none yet")((S.valueRules || []).filter(r => r.s === k && typeof r.price === "number")), `<div class="sform">${valueRulesHtml(k)}</div>`, false)}
    </div>
    <div class="row" style="margin-top:10px"><button type="button" data-bkfill="${esc(n)}">Fill from Wikidata and Wikipedia</button><button type="button" class="ghost" data-bkgap="${esc(n)}">Open gap grid</button>${bs.length ? "" : `<button type="button" class="ghost danger" data-bkrm="${esc(n)}">Remove series</button>`}</div>`;
}
// ---- Wikidata (facts) and Wikipedia (description) for a book series; empty fields only, then your own books fill the rest ----
const WD = "https://www.wikidata.org/w/api.php";
async function wdGet(params) {
  const r = await fetchWithin(WD + "?" + new URLSearchParams(Object.assign({ format: "json", origin: "*" }, params)), 12000, { headers: { "Api-User-Agent": "DagobertDucksArchiv/1.0 (personal collection app)" } });
  if (!r.ok) throw new Error("Wikidata answered " + r.status); return r.json();
}
async function findSeriesEntity(name, author) {
  const tries = [];
  for (const q of [name, /^(the|die|der|das) /i.test(name) ? "" : "The " + name]) for (const lang of ["en", "de", "sv"]) if (q) tries.push([q, lang]);
  const seen = new Set();
  const answers = await Promise.all(tries.map(([q, lang]) => wdGet({ action: "wbsearchentities", search: q, language: lang, uselang: "en", limit: "7", type: "item" }).catch(e => ({ failed: e }))));
  if (answers.every(j => j.failed)) throw answers[0].failed;
  for (const j of answers) {
    const hits = (j.search || []).filter(x => !seen.has(x.id)); hits.forEach(x => seen.add(x.id));
    const series = hits.filter(x => /\b(series|serie|reihe|trilogy|trilogie|saga|cycle|zyklus)\b/i.test(x.description || ""));
    const sur = String(author || "").split(/\s+/).pop();
    const best = (sur && series.find(x => norm(x.description).includes(norm(sur)))) || series[0];
    if (best) return best.id;
  }
  return null;
}
async function wikiSummary(sitelinks) {
  for (const w of ["enwiki", "dewiki", "svwiki"]) {
    const t = sitelinks && sitelinks[w] && sitelinks[w].title; if (!t) continue;
    try {
      const r = await fetchWithin(`https://${w.slice(0, 2)}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}`, 10000);
      if (r.ok) { const j = await r.json(); if (j.extract) return { text: j.extract.slice(0, 700), url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || `https://${w.slice(0, 2)}.wikipedia.org/wiki/${encodeURIComponent(t)}` }; }
    } catch (e) {}
  }
  return null;
}
async function fillBookSeries(name, quick) {
  const bs = S.comics.filter(c => c.kind === "book" && c.seriesName === name);
  const m = Object.assign({}, bookInfo(name)), got = [];
  // Fill all: a series asked in the last 30 days only gets what your own books tell (no internet); its own Fill button always asks
  const recent = quick && m.asked && (Date.now() - Date.parse(m.asked)) < 30 * 864e5;
  const langs = bs.map(c => c.lang).filter(Boolean), lang = langs.sort((a, b) => langs.filter(x => x === b).length - langs.filter(x => x === a).length)[0] || "";
  // the library count runs at the same time as the Wikidata questions
  const libAsk = recent || !(window.Books && Books.seriesVolumes) ? Promise.resolve(0) : Books.seriesVolumes(name, lang).catch(() => 0);
  const set = (k, v, label) => { if (v && !m[k]) { m[k] = v; got.push(label); } };
  const ownAuthor = [...new Set(bs.map(c => splitPeople(c.author)[0]).filter(Boolean))].slice(0, 2).join(", ");
  let wdVols = 0;
  // a series Wikidata didn't know is asked again after 30 days, not on every run
  const missRecent = !m.wikidata && m.wdMiss && (Date.now() - Date.parse(m.wdMiss)) < 30 * 864e5;
  if (!recent && !missRecent) try {
    const id = m.wikidata || await findSeriesEntity(name, ownAuthor);
    if (!id) m.wdMiss = todayIso();
    if (id) {
      m.wikidata = id;
      const e = Object.values((await wdGet({ action: "wbgetentities", ids: id, props: "claims|sitelinks" })).entities || {})[0] || {};
      const cl = p => ((e.claims || {})[p] || []).map(c => (c.mainsnak || {}).datavalue && c.mainsnak.datavalue.value).filter(Boolean);
      const ids = p => cl(p).map(v => v.id).filter(Boolean);
      const want = [...ids("P50"), ...ids("P123"), ...ids("P136")];
      const labels = {};
      if (want.length) { const j = await wdGet({ action: "wbgetentities", ids: [...new Set(want)].slice(0, 40).join("|"), props: "labels", languages: "en|de|sv" }); Object.values(j.entities || {}).forEach(x => { const l = x.labels || {}; labels[x.id] = (l.en || l.de || l.sv || {}).value || ""; }); }
      const lab = p => ids(p).map(x => labels[x]).filter(Boolean);
      // only the right series counts: its author must be the author of your books ("Legend" by Marie Lu, not something else called Legend)
      const sur = norm(String(ownAuthor.split(",")[0] || "").split(" ").pop());
      if (sur && !lab("P50").some(a => norm(a).includes(sur))) {
        if (m.wikidata === id) { ["wikidata", "about", "aboutSrc", "years", "genres", "publisher"].forEach(k => delete m[k]); got.push("wrong Wikidata match removed"); }
        throw { skip: true };
      }
      if (!sur) {   // books without an author: too unsure to match; an earlier match is removed
        if (m.wikidata === id) { ["wikidata", "about", "aboutSrc", "years", "genres", "publisher"].forEach(k => delete m[k]); got.push("unsure Wikidata match removed"); }
        throw { skip: true };
      }
      set("author", lab("P50").slice(0, 2).join(", "), "author");
      set("publisher", lab("P123").slice(0, 2).join(", "), "publisher");
      set("genres", window.Books && Books.oneGenre ? Books.oneGenre(lab("P136").join(", ")) : lab("P136").slice(0, 3).join(", "), "genres");
      const yr = p => cl(p).map(v => +(String(v.time || "").match(/^\+?(\d{4})/) || [])[1]).filter(Boolean);
      const y0 = Math.min(...yr("P580"), ...yr("P577")), y1 = Math.max(...yr("P582"), ...yr("P577"));
      if (isFinite(y0)) set("years", y0 + (isFinite(y1) && y1 > y0 ? "–" + y1 : ""), "years");
      const parts = (cl("P2635")[0] || {}).amount;   // number of parts (P1113 is episodes of a TV series)
      wdVols = parts ? Math.round(+parts) : ids("P527").length;
      if (!m.about) { const w = await wikiSummary(e.sitelinks); if (w) { m.about = w.text; m.aboutSrc = w.url; got.push("description"); } }
    }
  } catch (e) { if (!(e && e.skip)) got.warn = "Wikidata couldn't be reached"; }
  // number of volumes: the national library of your books' language knows the translated edition (Spejarens lärling: 18),
  // Wikidata only the original series; a count only ever goes up, so one you set higher yourself stays
  const libVols = await libAsk;
  if (!recent) m.asked = todayIso();
  const vols = libVols || wdVols, have = +(S.bookSizes || {})[name] || 0, ownMax = Math.max(0, ...bs.map(c => parseInt(c.issue, 10) || 0));
  const best = Math.max(vols, ownMax);
  // a count the app filled in itself may be corrected either way; one you set yourself only goes up
  const auto = m.volAuto != null ? +m.volAuto === have : !!(bookInfo(name) || {}).wikidata;
  if (best && (best > have || (!recent && auto && best !== have))) { S.bookSizes = Object.assign({}, S.bookSizes, { [name]: best }); await setConfig("bookSizes", S.bookSizes); m.volAuto = best; got.push("volumes (" + best + (libVols ? ", from the " + (lang === "German" ? "German" : lang === "Swedish" ? "Swedish" : "national") + " library" : "") + ")"); }
  else if (!recent && auto && !best && have) { const sz = Object.assign({}, S.bookSizes); delete sz[name]; S.bookSizes = sz; await setConfig("bookSizes", sz); delete m.volAuto; got.push("unsure volume count removed"); }
  // what the databases don't know comes from your own books
  set("author", ownAuthor, "author");
  set("publisher", [...new Set(bs.map(c => c.publisher).filter(Boolean))].slice(0, 2).join(", "), "publisher");
  const ys = bs.map(c => +(String(c.date || "").match(/(\d{4})/) || [])[1]).filter(Boolean);
  if (ys.length) set("years", Math.min(...ys) + (Math.max(...ys) > Math.min(...ys) ? "–" + Math.max(...ys) : ""), "years");
  if (window.Books && Books.oneGenre) set("genres", Books.oneGenre(bs.map(c => c.genre).filter(Boolean).join(", ")), "genres");
  S.bookMeta = Object.assign({}, S.bookMeta, { [name]: m });
  await setConfig("bookSeriesInfo", S.bookMeta);
  return got;
}
// ---- series with nothing in them: no owned and no wanted comics or books ----
function emptySeries() {
  const ids = new Set(S.comics.map(c => c.seriesId)), books = new Set(S.comics.filter(c => c.kind === "book" && c.seriesName).map(c => c.seriesName));
  return { comics: S.series.filter(s => s.id && !ids.has(s.id)), books: (S.bookSeriesExtra || []).filter(x => x.name && !books.has(x.name)) };
}
function emptySeriesCard() {
  const e = emptySeries(), n = e.comics.length + e.books.length;
  if (!n) return "";
  const names = e.comics.map(s => seriesLabel(s) || s.name).concat(e.books.map(x => x.name + " (books)"));
  return `<div class="card stack" id="emptyser"><h3>Empty series</h3>
    <p class="small muted" style="margin:0">${n} ${n === 1 ? "series has" : "series have"} nothing in it: no comics or books, owned or on the wishlist.</p>
    ${S.emptyAsk ? `<div class="confirm stack" style="gap:8px"><strong>Delete ${n === 1 ? "this series" : "these " + n + " series"}?</strong>
        <div class="small" style="max-height:220px;overflow:auto">${names.map(esc).join("<br>")}</div>
        <p class="small muted" style="margin:0">Their price ranges go too. A backup brings them back (More › Backup › Restore).</p>
        <div class="row"><button type="button" class="danger" id="emptygo">Delete ${n === 1 ? "it" : "all " + n}</button><button type="button" class="ghost" id="emptyno">Cancel</button></div></div>`
      : `<div class="row"><button type="button" id="emptyask">Delete empty series</button></div>`}</div>`;
}
async function deleteEmptySeries() {
  const e = emptySeries(), ids = new Set(e.comics.map(s => s.id)), names = new Set(e.books.map(x => x.name));
  const keys = new Set([...ids].concat([...names].map(n => "book:" + n)));
  S.series = S.series.filter(s => !ids.has(s.id));
  S.bookSeriesExtra = (S.bookSeriesExtra || []).filter(x => !names.has(x.name));
  S.valueRules = (S.valueRules || []).filter(r => !keys.has(r.s));
  const sizes = Object.assign({}, S.bookSizes || {}), meta = Object.assign({}, S.bookMeta || {}); names.forEach(n => { delete sizes[n]; delete meta[n]; });
  S.bookSizes = sizes; S.bookMeta = meta;
  await saveSeries(); await setConfig("bookSeriesExtra", S.bookSeriesExtra); await setConfig("valueRules", S.valueRules);
  await setConfig("bookSizes", sizes); await setConfig("bookSeriesInfo", meta);
  return ids.size + names.size;
}
// saves renamed book series and volume counts (called by "Save series")
async function saveBookSeries() {
  const sizes = Object.assign({}, S.bookSizes || {}), meta = Object.assign({}, S.bookMeta || {}), fix = [];
  let changed = false;
  document.querySelectorAll(".bookrow").forEach(row => {
    const old = row.dataset.old, name = row.querySelector('[data-bk="name"]').value.trim(), size = parseInt(row.querySelector('[data-bk="size"]').value, 10) || "";
    const to = name || old;
    if (to !== old) {
      S.comics.filter(c => c.kind === "book" && c.seriesName === old).forEach(c => fix.push(Object.assign({}, c, { seriesName: to })));
      if (sizes[old] && !sizes[to]) sizes[to] = sizes[old]; delete sizes[old];
      if (S.gapSeries === "book:" + old) S.gapSeries = "book:" + to;
      if (meta[old]) { meta[to] = meta[to] || meta[old]; delete meta[old]; }
      (S.bookSeriesExtra || []).forEach(x => { if (x.name === old) x.name = to; }); setConfig("bookSeriesExtra", S.bookSeriesExtra || []).catch(() => {});
      (S.valueRules || []).forEach(r => { if (r.s === "book:" + old) r.s = "book:" + to; }); setConfig("valueRules", S.valueRules || []).catch(() => {});
      changed = true;
    }
    if ((sizes[to] || "") !== size) { if (size) sizes[to] = size; else delete sizes[to]; changed = true; }
    const m = Object.assign({}, meta[to] || {});
    row.querySelectorAll("[data-bk]").forEach(inp => { const k = inp.dataset.bk; if (!["name", "size"].includes(k)) m[k] = inp.value.trim(); });
    meta[to] = m;
  });
  S.bookMeta = meta; await setConfig("bookSeriesInfo", meta);
  if (fix.length) await saveMany(fix, null, true);
  if (changed) { S.bookSizes = sizes; await setConfig("bookSizes", sizes); }
  return changed;
}
// ---- Series ----
VIEWS.series = {
  html() {
    const used = {}; S.comics.forEach(c => { used[c.seriesId] = (used[c.seriesId] || 0) + 1; });
    S.serOpen = S.serOpen || {};
    // ---- one series on its own page: folded sections Details, Description, Price ranges ----
    const sect = (key, name, title, meta, body, openDef) => { const k = key + "|" + name, open = S.sect && k in S.sect ? S.sect[k] : openDef;
      return `<details class="sitem sect" data-sect="${esc(k)}"${open ? " open" : ""}><summary><span class="t">${title}</span><span class="muted small">${esc(meta)}</span></summary>${body}</details>`; };
    const priceMeta = key => { const rs = (S.valueRules || []).filter(r => r.s === key && typeof r.price === "number"); if (!rs.length) return "none yet";
      const ps = rs.map(r => r.price), cur = [...new Set(rs.map(r => r.cur || "CHF"))].join("/"), b = rs.map(r => rangeBound(key, r.from)).filter(x => !isNaN(x)), e = rs.map(r => rangeBound(key, r.to, true)).filter(x => !isNaN(x));
      const span = b.length && e.length ? " · " + boundText(key, Math.min(...b)) + "–" + boundText(key, Math.max(...e), true) : "";
      return rs.length + (rs.length === 1 ? " range" : " ranges") + span + " · " + fmt2(Math.min(...ps)).replace(/\.00$/, "") + (ps.length > 1 ? "–" + fmt2(Math.max(...ps)).replace(/\.00$/, "") : "") + " " + cur; };
    const fields = (s, i) => { const key = s.id || "new";
      return sect(key, "details", "Details", [s.short, s.code, s.numbering === "year" ? (s.firstYear || "?") + "–" + (s.lastYear || "?") : s.latest ? (s.first > 1 ? s.first + "–" : "to ") + s.latest : ""].filter(Boolean).join(" · "), `<div class="seriesrow" data-i="${i}">
      <label class="sr-name"><span class="l">Name</span><input data-k="name" value="${esc(s.name)}"></label>
      <label><span class="l">Universe</span><input data-k="publisher" list="publist" value="${esc(s.publisher || "")}" placeholder="${DISNEY}"></label>
      <label><span class="l">Group</span><input data-k="group" list="grouplist" value="${esc(s.group || "")}" placeholder="${OTHER_GROUP}"></label>
      <p class="small muted wide" style="margin:0"><strong>Universe</strong> = who owns the characters, not the language of the edition: Swedish Spider-Man is Marvel, Blixt Gordon is King Features (Flash Gordon). <strong>Group</strong> = for Disney the country and format (e.g. Italia, Sverige – Pocket), otherwise the character (Flash Gordon, Spider-Man).</p>
      <label><span class="l">Short</span><input data-k="short" value="${esc(s.short)}"></label>
      <label><span class="l">INDUCKS code</span><input data-k="code" class="mono" value="${esc(s.code)}" placeholder="de/LTB"></label>
      <div class="wide small inducksnote" data-ni="${i}">${inducksNote(s)}</div>
      <label><span class="l">Country</span><input data-k="country" value="${esc(s.country)}" maxlength="3"></label>
      <label><span class="l">Single comic</span><select data-k="single"><option value=""${!s.single ? " selected" : ""}>Automatic${isSingleSeries(Object.assign({}, s, { single: "" })) ? " (yes: one volume in INDUCKS)" : ""}</option><option value="yes"${s.single === "yes" ? " selected" : ""}>Yes: list under Single comics</option><option value="no"${s.single === "no" ? " selected" : ""}>No: own folder</option></select></label>
      <label><span class="l">Numbering</span><select data-k="numbering"><option value="running"${s.numbering !== "year" ? " selected" : ""}>Running number</option><option value="year"${s.numbering === "year" ? " selected" : ""}>Per year</option></select></label>
      ${s.numbering === "year"
        ? `<label><span class="l">Years</span><input data-k="years" value="${esc(s.firstYear || s.lastYear ? (s.firstYear || "") + "–" + (s.lastYear || "") : "")}" placeholder="1951–2026"></label><label><span class="l">Per year</span><input data-k="perYear" placeholder="52, or 1978-1983: 12, 1984-: 24" value="${esc(s.perYear || "")}"></label>`
        : `<label><span class="l">First issue</span><input data-k="first" type="number" min="1" placeholder="1" value="${esc(s.first || "")}"></label><label><span class="l">Latest issue</span><input data-k="latest" type="number" min="1" value="${esc(s.latest || "")}"></label>`}
      <label><span class="l">Publisher</span><input data-k="pubHouse" value="${esc(s.pubHouse || "")}" placeholder="Egmont Ehapa"></label>
      <label><span class="l">Format</span><input data-k="format" value="${esc(s.format || "")}" placeholder="12,5×19,0 cm"></label></div>`, true)
      + sect(key, "about", "Description", s.about ? s.about.slice(0, 40) + "…" : "empty", `<div class="seriesrow" data-i="${i}">
      <label class="wide"><span class="l">About this series</span><textarea data-k="about" rows="4">${esc(s.about || "")}</textarea></label>
      ${s.aboutSrc ? (t => `<div class="wide small muted">Text from <a href="${esc(s.aboutSrc)}" target="_blank" rel="noopener">Duckipedia</a>${t && norm(t) !== norm(s.name) ? ` page “${esc(t)}”` : ""} (GNU FDL 1.2)</div>`)((() => { try { return decodeURIComponent((/duckipedia\.org\/(.+)$/.exec(s.aboutSrc) || [])[1] || "").replace(/_/g, " "); } catch (e) { return ""; } })()) : ""}</div>`, false)
      + (s.id ? sect(key, "prices", "Price ranges", priceMeta(s.id), `<div class="sform">${valueRulesHtml(s.id)}</div>`, false) : "")
      + `<div class="row" style="margin-top:10px"><button type="button" data-fillser="${i}">Fill from INDUCKS${(s.publisher || DISNEY) === DISNEY ? " and Duckipedia" : ""}</button>${s.id ? `<button type="button" class="ghost" data-sgap="${esc(s.id)}">Open gap grid</button>` : ""}<button class="ghost danger" data-rm="${i}" type="button">Remove series</button></div>`; };
    // ---- the lists: Universe › Group › Series, like Collection ----
    const tab = S.serTab === "tools" ? "tools" : S.serTab === "books" ? "books" : "comics";
    const bookNames = bookSeriesNames();
    const tabs = `<h2 style="margin:0">Series</h2><div class="subtabs" role="tablist" aria-label="Show"><button role="tab" type="button" data-stab="comics" aria-selected="${tab === "comics"}">Comic series <span class="muted">${S.series.length}</span></button><button role="tab" type="button" data-stab="books" aria-selected="${tab === "books"}">Book series <span class="muted">${bookNames.length}</span></button><button role="tab" type="button" data-stab="tools" aria-selected="${tab === "tools"}">Tools</button></div>`;
    const datalists = `<datalist id="publist">${[...new Set([DISNEY, "Franco-Belgian", "Marvel", "DC", "King Features", "Swedish comics", OTHER_PUB].concat(S.series.map(s => s.publisher).filter(Boolean)))].sort(pubCompare).map(p => `<option>${esc(p)}</option>`).join("")}</datalist>
        <datalist id="grouplist">${[...new Set(S.series.map(s => s.group).filter(Boolean))].sort().map(g => `<option>${esc(g)}</option>`).join("")}</datalist>`;
    const editIdx = S.serEditObj ? S.series.indexOf(S.serEditObj) : -1;
    if (tab === "comics" && editIdx >= 0) {
      const s = S.series[editIdx], u = s.publisher || "No universe yet", g = s.group || OTHER_GROUP;
      return tabs + serCrumbs([["All", {}], [u, { u }], [g, { u, g }]], seriesLabel(s) || "New series") + `<div class="card stack seriespage">
        <div class="row between" style="align-items:baseline"><h3 style="margin:0">${esc(s.name || "New series")}</h3><span class="muted small">${(c => c === 1 ? "1 comic" : c + " comics")(S.comics.filter(c => c.seriesId === s.id).length)}${catEntry(s) ? " · INDUCKS ✓" : ""}</span></div>
        ${fields(s, editIdx)}${datalists}
        <div class="row savebar"><button class="primary" id="saveser"${S.db ? "" : " disabled"}>Save series</button></div></div>`;
    }
    if (tab === "books" && S.serEditBook && bookNames.includes(S.serEditBook)) {
      const n = S.serEditBook;
      return tabs + serCrumbs([["All book series", {}]], n) + `<div class="card stack seriespage">${bookSeriesPage(n, sect)}
        <div class="row savebar"><button class="primary" id="saveser"${S.db ? "" : " disabled"}>Save series</button></div></div>`;
    }
    if (tab === "tools") return tabs + `
      <p class="small muted" style="margin:0">Bulk jobs for all your series and comics. The ones that need internet say so.</p>
      <div class="card stack"><h3>Fill all series</h3>
        <p class="small muted" style="margin:0">Fills empty details of every Disney series at once: INDUCKS code, country, years, latest issue, publisher and format from INDUCKS, plus a short description from Duckipedia for German series. Book series get author, publisher, years, genres, number of volumes and a description from Wikidata and Wikipedia. What you've entered yourself is kept. Needs internet for Duckipedia; takes about a second per series.</p>
        <div class="row" style="align-items:center"><button id="fillall"${S.db ? "" : " disabled"}>${S.fillAll && S.fillAll.running ? "Stop" : "Fill all series"}</button><span class="small muted" id="fillprog">${S.fillAll && !S.fillAll.running ? esc(S.fillAll.msg) : ""}</span></div></div>
      ${priceBatchCard()}
      ${emptySeriesCard()}
      ${(st => st.length ? `<div class="card stack"><h3>Books that belong to a comic series</h3><p class="small muted" style="margin:0">These are saved as books, but their book series has the name of one of your comic series, so gap grid and stats can't count them as issues.</p>
        <div class="list">${st.map(({ c, se }) => `<div class="small">${esc(c.title || "Untitled")} · book series “${esc(c.seriesName)}” ${esc(c.issue || "")} → <strong>${esc(se.short || se.name)} ${esc(c.issue || "")}</strong></div>`).join("")}</div>
        <div class="row"><button type="button" class="primary" id="moveallstray">Move ${st.length === 1 ? "it" : "all " + st.length}</button></div></div>` : "")(strayBooks())}
      <div id="misscat">${missingCatalogueCard()}</div>
      ${duckipediaBulkCard()}
      ${refreshCard()}
      ${refreshBooksCard()}
      <div class="card stack"><h3>INDUCKS catalogue</h3>
        ${S.catalogue ? `<p class="small muted" style="margin:0">Catalogue from ${esc(niceDate(String(S.catalogue.built || "").slice(0, 10)))} for ${Object.keys(S.catalogue.series || {}).length} series, stored on this phone.</p>
          <details class="small"><summary>Series in the catalogue</summary><div class="tablewrap"><table><thead><tr><th>Series</th><th>INDUCKS</th><th>Issues</th></tr></thead><tbody>${Object.values(S.catalogue.series || {}).map(x => `<tr><td>${esc(x.series)}</td><td class="mono">${esc(x.code)}</td><td>${(x.issues || 0).toLocaleString("de-CH")}</td></tr>`).join("")}</tbody></table></div></details>
          <div class="row"><button class="primary" id="gomatch">Match my comics with INDUCKS</button></div>
          <p class="small muted" style="margin:0">Story data from <a href="https://inducks.org" target="_blank" rel="noopener">I.N.D.U.C.K.S.</a>, used under the Inducks licence. Thanks to its indexers.</p>`
          : `<p class="small muted" style="margin:0">Not loaded yet. Once it is, Add fills in titles, dates and full story lists from INDUCKS.</p>`}</div>`;
    if (tab === "books") return tabs + `<div class="card stack">
        <label><span class="l">Find a book series</span><input id="serfind" type="search" placeholder="Name or author" value="${esc(S.serFind || "")}"></label>
        <div id="serlist">${serListHtml("books")}</div>
        <div id="newbook"></div>
        <div class="row"><button id="addbookser" type="button">Add book series</button></div></div>`;
    return tabs + `
      ${arrangeCard()}
      ${groupCheckCard()}
      ${S.seriesSaved ? "" : '<div class="banner">These are the starting series. Save once to keep your own version.</div>'}
      <div class="card stack">
        <label><span class="l">Find a series</span><input id="serfind" type="search" placeholder="Name, short name, group or INDUCKS code" value="${esc(S.serFind || "")}"></label>
        <div id="serlist">${serListHtml("comics")}</div>
        <div class="row"><button id="addser">Add series</button></div></div>
      <p class="small muted">Universe and group decide where a series appears under Collection; the publisher is saved with each comic, since it changes over the years. The gap grid and completion stats use the latest issue, or the years and issues per year for weekly titles.</p>
`;
  },
  bind() {
    document.querySelectorAll("[data-stab]").forEach(b => b.onclick = async () => {
      const t = b.dataset.stab, cur = S.serTab === "tools" ? "tools" : S.serTab === "books" ? "books" : "comics";
      if (t === cur) { await go(() => { S.serPath = {}; }); return; }   // tapping the open tab goes back to its start
      try { grab(); } catch (e) {} S.serTab = t; render(); window.scrollTo(0, 0); });
    const grab = () => document.querySelectorAll(".seriesrow:not(.bookrow)").forEach(row => {
      const s = S.series[+row.dataset.i];
      row.querySelectorAll("[data-k]").forEach(inp => {
        const k = inp.dataset.k, v = inp.value.trim();
        if (k === "years") { const m = v.match(/(\d{4})\D+(\d{4})/); if (m) { s.firstYear = +m[1]; s.lastYear = +m[2]; } }
        else if (k === "latest" || k === "first") s[k] = parseInt(v, 10) || "";
        else if (k === "perYear") s[k] = /^\s*\d+\s*$/.test(v) ? parseInt(v, 10) : v.trim();
        else s[k] = v;
      });
      if (!s.id) { const base = (s.code || s.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "s" + Date.now(); let id = base, k = 2; while (S.series.some(x => x !== s && x.id === id)) id = base + "-" + k++; s.id = id; }
    });
    document.querySelectorAll('[data-k="numbering"]').forEach(sel => sel.onchange = () => { grab(); const s = S.series[+sel.closest(".seriesrow").dataset.i]; if (s.numbering === "year") { s.firstYear = s.firstYear || 1950; s.lastYear = s.lastYear || new Date().getFullYear(); s.perYear = s.perYear || 52; } render(); });
    $("#gomatch") && ($("#gomatch").onclick = () => { S.matchRun = null; nav("match"); });
    bindArrangeCard(); bindGroupCheck();
    document.querySelectorAll("details[data-sect]").forEach(el => el.ontoggle = () => { S.sect = S.sect || {}; S.sect[el.dataset.sect] = el.open; });
    // leaving a series page keeps what was typed: it is saved (a new series without a name is dropped)
    const leave = async () => {
      if (!document.querySelector(".seriespage")) return;
      try { grab(); } catch (e) {}
      S.series = S.series.filter(s => s.name || s !== S.serEditObj);
      if (S.series.some(s => !s.name)) return;
      try { S.series.forEach(s => { if (!s.group) s.group = OTHER_GROUP; if (!s.publisher) s.publisher = OTHER_PUB; }); await saveBookSeries(); await saveSeries(); } catch (e) { toast(errText(e)); }
    };
    const go = async change => { await leave(); change(); S.serEditObj = null; S.serEditBook = null; render(); window.scrollTo(0, 0); };
    const bindList = () => {
      document.querySelectorAll("[data-scr]").forEach(b => b.onclick = () => go(() => { S.serPath = JSON.parse(b.dataset.scr); }));
      document.querySelectorAll("[data-su]").forEach(b => b.onclick = () => go(() => { S.serPath = { u: b.dataset.su }; }));
      document.querySelectorAll("[data-sg]").forEach(b => b.onclick = () => go(() => { S.serPath = { u: (S.serPath || {}).u, g: b.dataset.sg }; }));
      document.querySelectorAll("[data-sopen]").forEach(b => b.onclick = () => { const s = S.series[+b.dataset.sopen]; S.serPath = { u: s.publisher || "No universe yet", g: s.group || OTHER_GROUP }; S.serEditObj = s; render(); window.scrollTo(0, 0); });
      document.querySelectorAll("[data-sbook]").forEach(b => b.onclick = () => { S.serEditBook = b.dataset.sbook; render(); window.scrollTo(0, 0); });
    };
    bindList();
    $("#serfind") && ($("#serfind").oninput = e => { S.serFind = e.target.value; $("#serlist").innerHTML = serListHtml(S.serTab === "books" ? "books" : "comics"); bindList(); });
    document.querySelectorAll("[data-sgap]").forEach(b => b.onclick = async () => { await leave(); S.gapSeries = b.dataset.sgap; S.gapTab = "gaps"; nav("gaps"); });
    $("#dkall") && ($("#dkall").onclick = () => duckipediaBulk());
    $("#pbatch") && ($("#pbatch").onclick = async () => { $("#pbatch").disabled = true; try { const r = await applyPriceBatch(); toast("Added " + r.ranges + " price ranges for " + r.series + " series"); } catch (e) { toast(errText(e)); } render(); });
    bindValueRules();
    document.querySelectorAll("[data-bkfill]").forEach(b => b.onclick = async () => {
      grab(); try { await saveBookSeries(); } catch (e) {}   // keep what was typed
      b.disabled = true; b.textContent = "Looking up…";
      const got = await fillBookSeries(b.dataset.bkfill);
      toast((got.length ? "Filled in: " + got.join(", ") : "Nothing new found") + (got.warn ? ". " + got.warn : ""));
      renderKeep();
    });
    document.querySelectorAll("[data-bkgap]").forEach(b => b.onclick = async () => { await leave(); S.gapSeries = "book:" + b.dataset.bkgap; S.gapTab = "gaps"; nav("gaps"); });
    bindRefresh(); bindRefreshBooks();
    $("#moveallstray") && ($("#moveallstray").onclick = async () => { try { const n = await moveStrays(strayBooks()); toast(n + (n === 1 ? " copy moved" : " copies moved")); renderKeep(); } catch (e) { toast(errText(e)); } });
    $("#emptyask") && ($("#emptyask").onclick = () => { S.emptyAsk = true; renderKeep(); });
    $("#emptyno") && ($("#emptyno").onclick = () => { S.emptyAsk = false; renderKeep(); });
    $("#emptygo") && ($("#emptygo").onclick = async () => { S.emptyAsk = false; try { const n = await deleteEmptySeries(); toast(n + (n === 1 ? " empty series deleted" : " empty series deleted")); } catch (e) { toast(errText(e)); } renderKeep(); });
    $("#fillall") && ($("#fillall").onclick = async () => {
      if (S.fillAll && S.fillAll.running) { S.fillAll.stop = true; return; }
      grab();
      const run = S.fillAll = { running: true, stop: false, msg: "" }, btn = $("#fillall"), prog = $("#fillprog");
      btn.textContent = "Stop";
      const list = S.series.filter(se => (se.publisher || DISNEY) === DISNEY && (se.name || se.code));
      const books = [...new Set(S.comics.filter(c => c.kind === "book" && c.seriesName).map(c => c.seriesName).concat((S.bookSeriesExtra || []).map(x => x.name).filter(Boolean)))];
      let changed = 0, warn = "";
      for (let k = 0; k < list.length && !run.stop; k++) {
        if (prog && prog.isConnected) prog.textContent = `${k + 1} of ${list.length}: ${list[k].name}`;
        const got = await fillSeriesInfo(list[k]).catch(() => []);
        if (got.length) changed++; if (got.warn) warn = got.warn;
      }
      for (let k = 0; k < books.length && !run.stop; k++) {
        if (prog && prog.isConnected) prog.textContent = `Book series ${k + 1} of ${books.length}: ${books[k]}`;
        const got = await fillBookSeries(books[k], true).catch(() => []);
        if (got.length) changed++; if (got.warn) warn = got.warn;
      }
      try { if (changed) await saveSeries(); } catch (e) { warn = errText(e); }
      run.running = false;
      run.msg = (run.stop ? "Stopped. " : "Done. ") + changed + (changed === 1 ? " series got" : " series got") + " new details" + (warn ? ". " + warn : ".");
      toast(run.msg); if (S.view === "series") renderKeep();
    });
    document.querySelectorAll("[data-fillser]").forEach(b => b.onclick = async () => {
      grab(); const se = S.series[+b.dataset.fillser];
      if (!se.name && !se.code) { toast("Give the series a name or INDUCKS code first"); return; }
      b.disabled = true; b.textContent = "Looking up…";
      const got = await fillSeriesInfo(se);
      if (!se.id) { const base = (se.code || se.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "s" + Date.now(); let id = base, k = 2; while (S.series.some(x => x !== se && x.id === id)) id = base + "-" + k++; se.id = id; }
      try { if (got.length) await saveSeries(); } catch (e) { toast(errText(e)); }
      toast((got.length ? "Filled in: " + got.join(", ") : "Nothing new found for this series") + (got.warn ? ". " + got.warn : ""));
      render();
    });
    $("#dkstop") && ($("#dkstop").onclick = () => { if (S.dk) S.dk.stop = true; });
    if ($("#addbookser")) $("#addbookser").onclick = () => {
      const box = $("#newbook");
      box.innerHTML = `<div class="confirm" style="display:grid;gap:8px"><label><span class="l">Name of the book series</span><input id="nbname" placeholder="e.g. Harry Potter, Carl Barks Collection"></label>
        <div class="seg" role="group" aria-label="Kind"><button type="button" data-nbk="1" aria-pressed="true">Books</button><button type="button" data-nbk="0" aria-pressed="false">Comic books</button></div>
        <div class="row"><button class="primary" id="nbgo" type="button">Create</button><button class="ghost" id="nbx" type="button">Cancel</button></div></div>`;
      let novel = true;
      box.querySelectorAll("[data-nbk]").forEach(b => b.onclick = () => { novel = b.dataset.nbk === "1"; box.querySelectorAll("[data-nbk]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
      $("#nbx").onclick = () => box.innerHTML = "";
      $("#nbgo").onclick = async () => {
        const name = $("#nbname").value.trim(); if (!name) { toast("Give the series a name"); return; }
        const exists = (S.bookSeriesExtra || []).some(x => x.name === name) || S.comics.some(c => c.kind === "book" && c.seriesName === name);
        if (exists) { toast(name + " already exists"); return; }
        grab(); S.bookSeriesExtra = (S.bookSeriesExtra || []).concat([{ name, novel }]);
        await setConfig("bookSeriesExtra", S.bookSeriesExtra);
        S.serEditBook = name;
        toast(name + " created. Add its number of volumes, then Fill from Wikidata."); render();
      };
      setTimeout(() => $("#nbname").focus(), 50);
    };
    document.querySelectorAll("[data-bkrm]").forEach(b => b.onclick = async () => {
      S.bookSeriesExtra = (S.bookSeriesExtra || []).filter(x => x.name !== b.dataset.bkrm); await setConfig("bookSeriesExtra", S.bookSeriesExtra);
      toast(b.dataset.bkrm + " removed"); S.serEditBook = null; render();
    });
    if ($("#addser")) $("#addser").onclick = () => {
      const s = { id: "", name: "", short: "", publisher: (S.serPath || {}).u || "", group: (S.serPath || {}).g || "", code: "", country: "", numbering: "running", latest: "" };
      if (s.publisher === "No universe yet") s.publisher = "";
      S.series.push(s); S.serFind = ""; S.serEditObj = s; S.sect = Object.assign({}, S.sect, { "new|details": true }); render(); window.scrollTo(0, 0);
      const inp = document.querySelector('.seriespage [data-k="name"]'); if (inp) inp.focus();
    };
    document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
      grab(); const s = S.series[+b.dataset.rm];
      const used = S.comics.filter(c => c.seriesId === s.id).length;
      if (used) { toast(used + " comics are in this series. Move or delete them first."); return; }
      S.series.splice(+b.dataset.rm, 1); S.serEditObj = null;
      if (s.id) { (async () => { try { await saveSeries(); toast((s.name || "Series") + " removed"); } catch (e) { toast(errText(e)); } })(); }
      render(); window.scrollTo(0, 0);
    });
    if ($("#saveser")) $("#saveser").onclick = async () => {
      grab();
      if (S.series.some(s => !s.name)) { toast("Every series needs a name"); return; }
      S.series.forEach(s => { if (!s.group) s.group = OTHER_GROUP; if (!s.publisher) s.publisher = OTHER_PUB; });
      S.series.sort((a, b) => pubCompare(a.publisher, b.publisher) || groupCompare(a.group, b.group));
      const ids = S.series.map(s => s.id); if (new Set(ids).size !== ids.length) { toast("Two series have the same INDUCKS code"); return; }
      const btn = $("#saveser"); btn.disabled = true; btn.textContent = "Saving…";
      const renamed = document.querySelector('.bookrow [data-bk="name"]'); if (renamed && renamed.value.trim()) S.serEditBook = renamed.value.trim();
      try { await saveBookSeries(); await saveSeries(); toast("Series saved"); } catch (e) { toast(errText(e)); }
      requestAnimationFrame(() => setTimeout(render, 0));   // let the message show before the page is redrawn
    };
  }
};

// Series › Tools: price lists Claude has prepared (catalogue/restore-batch.json), added with one tap
function priceBatchCard() {
  const w = priceBatchWaiting(); if (!w.length) return "";
  const what = e => { const n = priceBatchRules(e).length, p = Object.keys(e.patch || {}).map(k => ({ perYear: "Per year", firstYear: "Years", lastYear: "Years", defaultEdition: "the default edition" })[k]).filter((x, i, a) => x && a.indexOf(x) === i);
    return n + " price " + (n === 1 ? "range" : "ranges") + (e.replace ? ", replaces its current ranges" : "") + (p.length ? "; also sets " + p.join(" and ") : ""); };
  return `<div class="card stack"><h3>Price lists waiting</h3>
    <p class="small muted" style="margin:0">Price ranges Claude has prepared for your series (from Comicguide, Seriekatalogen or sales). Nothing changes until you tap Add all.</p>
    <ul class="small" style="margin:0;padding-left:18px">${w.map(e => `<li><strong>${esc(seriesById(e.id).name)}</strong>: ${esc(what(e))}</li>`).join("")}</ul>
    <div class="row"><button type="button" class="primary" id="pbatch"${S.db ? "" : " disabled"}>Add all</button></div></div>`;
}
