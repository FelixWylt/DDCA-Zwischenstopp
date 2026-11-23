// Dagobert Ducks Archiv – Gaps and wishlist.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- Gaps & wishlist: phone-first layout ----
function gapTabs() {
  const nw = S.comics.filter(c => c.status === "wanted").length, t = S.gapTab || "gaps";
  return `<h2 style="margin:0">Gaps &amp; wishlist</h2>
    <div class="subtabs" role="tablist" aria-label="Show">
      <button role="tab" type="button" data-gtab="gaps" aria-selected="${t === "gaps"}">Gaps</button>
      <button role="tab" type="button" data-gtab="wishlist" aria-selected="${t === "wishlist"}">Wishlist <span class="muted">${nw}</span></button></div>`;
}
function bindGapTabs() {
  document.querySelectorAll("[data-gtab]").forEach(b => b.onclick = () => { S.gapTab = b.dataset.gtab; render(); window.scrollTo(0, 0); });
}
// header of the grid: series, progress, filter chips (all / missing / wishlist / unread) and reading mode
function gapHead(owned, wanted, total, info) {
  const pct = total ? Math.round(owned / total * 100) : 0, f = S.gapFilter || "all", gkey = info.cur || S.gapSeries;
  // complete only when the series' end is known (Latest issue, years or INDUCKS; a book series' number of volumes), else the grid just stops at your highest number
  const gse = seriesById(gkey), known = gapIsBook(gkey) ? parseInt((S.bookSizes || {})[gkey.slice(5)], 10) > 0 : !!gse && (gse.numbering === "year" ? !!(catEntry(gse) || gse.lastYear || gse.issueList) : +gse.latest > 0);
  const done = known && total > 0 && owned >= total && !isSingleSeries(gse);   // a single comic book gets no Complete label
  markComplete(gkey, done);   // remembered for the gold "Complete" label in Collection and Stats
  if (S.moveFor !== gkey) { S.moveSel = new Set(); S.moveFor = gkey; }
  const chip = (k, label) => `<button type="button" class="fchip${f === k ? " on" : ""}" data-gf="${k}" aria-pressed="${f === k}">${label}</button>`;
  return `<div class="card stack gaphead">
      ${gapPicker(info.cur || S.gapSeries)}
      <div><div class="row between small"><span><strong>${owned}</strong> of ${total} owned · ${pct}%${done ? ' <span class="chip complete">Complete</span>' : ""}</span><span class="muted">${wanted} wanted · ${Math.max(0, total - owned)} missing</span></div>
        <div class="meter" style="margin-top:4px"><span style="width:${pct}%"></span></div></div>
      <div class="fchips">${chip("all", "All")}${chip("missing", "Missing")}${chip("wanted", "Wishlist")}${info.read === false ? "" : chip("unread", "Unread")}
        ${info.read === false ? "" : `<button type="button" class="fchip readchip${S.readMode ? " on" : ""}" id="readmode" aria-pressed="${!!S.readMode}">✓ Mark read</button>`}
        <button type="button" class="fchip readchip${S.moveMode ? " on" : ""}" id="movemode" aria-pressed="${!!S.moveMode}">Move</button>
        ${info.editions ? `<button type="button" class="fchip readchip${S.edMode ? " on" : ""}" id="edmode" aria-pressed="${!!S.edMode}">Edition</button>` : ""}
        <button type="button" class="fchip" id="copymiss" data-name="${esc((s => s ? s.short || s.name : String(info.cur || S.gapSeries || "").replace(/^book:/, ""))(seriesById(info.cur || S.gapSeries)))}">Copy missing numbers</button>
        <button type="button" class="fchip" id="wishall">Wish all missing</button>
        ${gapWishesOf(info.cur || S.gapSeries).some(c => wishLevel(c) !== "must") ? `<button type="button" class="fchip" id="unwishall">Remove all wishes</button>` : ""}
        <details class="ginfo"><summary aria-label="What the colours mean">ⓘ</summary><div class="legend small">${info.legend}</div></details></div>
      ${S.readMode ? '<p class="small muted" style="margin:0">Reading mode: tap an owned issue to mark it read today; tap again to undo.</p>' : ""}
      ${S.moveMode ? `<div class="row movebar" style="align-items:center;gap:8px;flex-wrap:wrap"><span class="small">Move mode: tap squares (or entries in the list under the grid). <strong id="movecount">${S.moveSel.size}</strong> selected</span><button type="button" class="primary" id="movego">Move to…</button><button type="button" class="ghost" id="moveclr">Clear</button></div>` : ""}
      ${S.edMode && info.editions ? `<p class="small muted" style="margin:0">Edition mode: tap an owned issue to choose its edition. Unmarked squares count as ${esc(info.defEd || "the price table's general prices")}; small letters show other editions (${esc(info.editions.map(e => editionMark(e) + " = " + e).join(", "))}).</p>` : ""}
    </div>`;
}
function bindGapHead() {
  document.querySelectorAll("[data-gf]").forEach(b => b.onclick = () => { S.gapFilter = b.dataset.gf; const g = $("#gridbox"); if (g) g.className = gridClass(!$("#readmode")); document.querySelectorAll("[data-gf]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); }); });
  $("#readmode") && ($("#readmode").onclick = () => { S.readMode = !S.readMode; if (S.readMode) { S.edMode = false; S.moveMode = false; } renderKeep(); });
  $("#edmode") && ($("#edmode").onclick = () => { S.edMode = !S.edMode; if (S.edMode) { S.readMode = false; S.moveMode = false; } renderKeep(); });
  $("#movemode") && ($("#movemode").onclick = () => { S.moveMode = !S.moveMode; if (S.moveMode) { S.readMode = false; S.edMode = false; } else S.moveSel = new Set(); renderKeep(); });
  bindMoveMode();
  bindWholeSeriesWishes();
  // the squares you don't own, as text: runs of numbers shortened (12–15), yearly series by year (1985: 3, 7–9)
  $("#copymiss") && ($("#copymiss").onclick = async () => {
    const labs = [...document.querySelectorAll("#gridbox .cell[data-issue]")].filter(b => !b.classList.contains("owned")).map(b => b.dataset.issue);
    if (!labs.length) { toast("Nothing missing here"); return; }
    const byYear = new Map(); labs.forEach(l => { const m = /^(\d{4})\/(\d{1,3})$/.exec(l), y = m ? m[1] : ""; (byYear.get(y) || byYear.set(y, []).get(y)).push(m ? String(+m[2]) : l); });
    const runs = ns => { const out = []; let a = null, b = null; const flush = () => { if (a != null) out.push(a === b ? String(a) : a + "–" + b); a = b = null; };
      ns.forEach(x => { if (/^\d+$/.test(x) && a != null && +x === b + 1) { b = +x; return; } flush(); if (/^\d+$/.test(x)) { a = b = +x; } else out.push(x); }); flush(); return out.join(", "); };
    const txt = "Missing in " + $("#copymiss").dataset.name + " (" + labs.length + "):\n" + [...byYear].map(([y, ns]) => (y ? y + ": " : "") + runs(ns)).join("\n");
    try { await navigator.clipboard.writeText(txt); toast(labs.length + " missing numbers copied"); } catch (e) { sheetOpen(`<textarea class="mono" rows="8" style="width:100%">${esc(txt)}</textarea><p class="small muted">Press and hold the text, then Copy.</p>`); }
  });
}
// ---- whole-series wishes (da-v233): every empty square onto the wishlist at once, or all Want/Dream wishes off again ----
const gapIsBook = key => String(key || "").startsWith("book:");
function gapWishesOf(key) { return S.comics.filter(c => c.status === "wanted" && (gapIsBook(key) ? c.kind === "book" && c.seriesName === key.slice(5) : c.seriesId === key)); }
function gapWishDraft(key, label, lv) {   // one wish, like a single "Add to wishlist" tap on that square
  if (gapIsBook(key)) {
    const name = key.slice(5), mine = S.comics.filter(c => c.kind === "book" && c.seriesName === name), extra = (S.bookSeriesExtra || []).find(x => x.name === name), proto = mine[0] || { bookType: extra && extra.novel ? "book" : "" };
    return blankDraft({ kind: "book", bookType: proto.bookType || "", seriesId: "_book", seriesName: name, issue: label, author: proto.author || "", publisher: proto.publisher || "", lang: proto.lang || "", status: "wanted", wishLevel: lv });
  }
  const se = seriesById(key), p = parseIssue(se, label);
  return Object.assign(blankDraft({ seriesId: se.id, seriesName: se.name, issue: label, status: "wanted", wishLevel: lv }), { issueLabel: p.label, issueSort: p.sort, issueYear: p.year || null, issueNum: p.n });
}
// where a square sits, for From–To: volume or running number; yearly series year·1000 + number, a bare year = the whole year
function gapPos(key, label) {
  if (gapIsBook(key)) return parseFloat(String(label).replace(",", "."));
  const p = parseIssue(seriesById(key), label); return typeof p.sort === "number" && !isNaN(p.sort) ? p.sort : parseFloat(label);
}
function gapBound(key, txt, end) {
  const s = String(txt || "").trim(); if (!s) return end ? Infinity : -Infinity;
  const se = !gapIsBook(key) && seriesById(key);
  if (se && se.numbering === "year" && /^\d{4}$/.test(s)) return +s * 1000 + (end ? 999 : 0);
  const v = gapPos(key, s); return isNaN(v) ? (end ? Infinity : -Infinity) : v;
}
// ---- Move mode (da-v234): pick squares, then move their entries to another series ----
const moveIdsOf = el => (el.dataset.ids || el.dataset.id || el.dataset.open || "").split(",").filter(Boolean);
function moveToggle(el) {
  const ids = moveIdsOf(el); if (!ids.length) { toast("Nothing in this square to move"); return; }
  const on = !ids.every(id => S.moveSel.has(id)); ids.forEach(id => on ? S.moveSel.add(id) : S.moveSel.delete(id));
  el.classList.toggle("msel", on); const n = $("#movecount"); if (n) n.textContent = S.moveSel.size;
}
function bindMoveMode() {
  if (!S.moveMode) return;
  document.querySelectorAll("#gridbox .cell, .offgrid [data-open]").forEach(el => { const ids = moveIdsOf(el); if (ids.length && ids.every(id => S.moveSel.has(id))) el.classList.add("msel"); });
  $("#moveclr") && ($("#moveclr").onclick = () => { S.moveSel = new Set(); document.querySelectorAll(".msel").forEach(x => x.classList.remove("msel")); $("#movecount").textContent = 0; });
  $("#movego") && ($("#movego").onclick = async () => {
    const list = S.comics.filter(c => S.moveSel.has(c.id)); if (!list.length) { toast("Tap the squares to move first"); return; }
    const from = S.gapSeries, key = await pickSeries({ books: true, exclude: from, title: "Move " + list.length + (list.length === 1 ? " entry" : " entries") + " to" });
    if (!key || key === "_other" || key === from) return;
    try { const n = await moveEntries(list, key); S.moveSel = new Set(); S.moveMode = false; toast(n + (n === 1 ? " entry" : " entries") + " moved to " + seriesKeyLabel(key)); renderKeep(); } catch (e) { toast(errText(e)); }
  });
}
function bindWholeSeriesWishes() {
  const key = S.gapSeries, se = seriesById(key), name = se ? se.short || se.name : String(key || "").replace(/^book:/, "");
  $("#wishall") && ($("#wishall").onclick = () => {
    const labels = [...document.querySelectorAll("#gridbox .cell[data-issue], #gridbox .cell[data-vol]")].filter(b => !["owned", "wanted", "readno"].some(k => b.classList.contains(k))).map(b => b.dataset.issue || b.dataset.vol);
    if (!labels.length) { toast("Nothing missing here"); return; }
    let lv = "";   // Want (the user's wish)
    sheetOpen(`<div class="confirm"><strong>Wish all missing: ${esc(name)}</strong>
      <div class="row" style="gap:8px"><label><span class="l">From</span><input id="wfrom" placeholder="${esc(labels[0])}"></label><label><span class="l">To</span><input id="wto" placeholder="${esc(labels[labels.length - 1])}"></label></div>
      <div class="seg" role="group" aria-label="How much you want them">${WISH_LEVELS.map(([k, l]) => `<button type="button" data-wal="${k}" aria-pressed="${k === lv}">${k === "must" ? "★ " : ""}${l}</button>`).join("")}</div>
      <p class="small" id="wsum" style="margin:0"></p>
      <button class="primary" id="wgo">Add</button><button class="ghost" id="cpX">Cancel</button></div>`);
    const pick = () => { const a = gapBound(key, $("#wfrom").value, false), b = gapBound(key, $("#wto").value, true); return labels.filter(l => { const v = gapPos(key, l); return isNaN(v) || (v >= a && v <= b); }); };
    const sum = () => {
      const ls = pick(), cost = wishCost(ls.map(l => gapWishDraft(key, l, lv)));
      $("#wsum").innerHTML = ls.length ? `Adds <strong>${ls.length}</strong> ${ls.length === 1 ? "wish" : "wishes"}${ls.length > 1 ? " (" + esc(ls[0]) + " to " + esc(ls[ls.length - 1]) + ")" : ""}.${cost.n ? ` About <strong>${esc(money(Math.round(cost.t), "CHF"))}</strong>${cost.n < ls.length ? " for the " + cost.n + " with a price range" : ""}.` : " No price ranges for these yet."}${ls.length > 100 ? " <strong>That's a lot of wishes.</strong>" : ""}` : "No missing number in that range.";
      $("#wgo").disabled = !ls.length; $("#wgo").textContent = ls.length ? "Add " + ls.length + (ls.length === 1 ? " wish" : " wishes") : "Add";
    };
    $("#wfrom").oninput = sum; $("#wto").oninput = sum; sum();
    document.querySelectorAll("[data-wal]").forEach(b => b.onclick = () => { lv = b.dataset.wal; document.querySelectorAll("[data-wal]").forEach(x => x.setAttribute("aria-pressed", x === b)); sum(); });
    $("#cpX").onclick = sheetClose;
    $("#wgo").onclick = async () => {
      const ls = pick(); if (!ls.length) return; $("#wgo").disabled = true;
      try { await saveMany(ls.map(l => gapWishDraft(key, l, lv))); sheetClose(); toast(ls.length + (ls.length === 1 ? " wish" : " wishes") + " added"); renderKeep(); } catch (e) { toast(errText(e)); }
    };
  });
  $("#unwishall") && ($("#unwishall").onclick = () => {
    const all = gapWishesOf(key), gone = all.filter(c => wishLevel(c) !== "must"), keep = all.length - gone.length;
    sheetOpen(`<div class="confirm"><strong>Remove ${gone.length} ${gone.length === 1 ? "wish" : "wishes"} in ${esc(name)}?</strong>
      <p class="small" style="margin:0">Want and Dream wishes go${keep ? `; your ${keep} ★ Must have ${keep === 1 ? "wish stays" : "wishes stay"}` : ""}. Notes written on them go too. Owned and read entries stay.</p>
      <button class="danger" id="uwgo">Remove ${gone.length}</button><button class="ghost" id="cpX">Cancel</button></div>`);
    $("#cpX").onclick = sheetClose;
    $("#uwgo").onclick = async () => { $("#uwgo").disabled = true; try { for (const c of gone) await deleteComic(c.id); sheetClose(); toast(gone.length + (gone.length === 1 ? " wish" : " wishes") + " removed"); renderKeep(); } catch (e) { toast(errText(e)); } };
  });
}
const gridClass = noRead => [S.readMode && !noRead ? "readmode" : "", "gf-" + (noRead && S.gapFilter === "unread" ? "all" : S.gapFilter || "all")].join(" ");
// the choice for a tapped number slides up from the bottom of the screen
function sheetClose() { const b = $("#cellpick"); if (b) b.innerHTML = ""; }
function sheetOpen(html) { const b = $("#cellpick"); b.innerHTML = `<div class="sheetbg" id="sheetbg"></div><div class="sheet" role="dialog">${html}</div>`; $("#sheetbg").onclick = sheetClose; }
// ---- Wishlist sub tab ----
// a wish whose estimated value (price table × condition) is at or below your maximum price
function wishBudget(c) {
  if (typeof c.pricePaid !== "number") return null;
  const v = valueOf(c); if (!v) return null;
  const est = toCHF(v.amount, v.cur), max = toCHF(c.pricePaid, c.currency);
  return { est, max, ok: est <= max + 0.005, v };
}
// how much a wishlist entry is wanted: "must" (Must have), "" (Want, the default), "dream" (Dream: wishful thinking)
const WISH_LEVELS = [["must", "Must have"], ["", "Want"], ["dream", "Dream"]];
const wishLevel = c => c.wishLevel === "must" || c.wishLevel === "dream" ? c.wishLevel : "";
const wishRank = c => ({ must: 0, "": 1, dream: 2 })[wishLevel(c)];
function wishCost(list) { let t = 0, n = 0; list.forEach(c => { const v = valueOf(c); if (v) { t += toCHF(v.amount * (c.copies || 1), v.cur); n++; } }); return { t, n }; }
function wishlistView() {
  // comics and books apart: one chip each
  const every = sortComics(S.comics.filter(c => c.status === "wanted")), wc = every.filter(c => !isNovel(c)), wb = every.filter(c => isNovel(c));
  if (!S.wishKind) S.wishKind = wc.length || !wb.length ? "comics" : "books";
  if (S.wishKind === "comics" && !wc.length && wb.length) S.wishKind = "books";
  if (S.wishKind === "books" && !wb.length && wc.length) S.wishKind = "comics";
  const all = S.wishKind === "books" ? wb : wc;
  if (S.fair === undefined) { try { S.fair = localStorage.getItem("ddaFair") === "1"; } catch (e) { S.fair = false; } }
  const kindChips = wb.length && wc.length ? `<div class="subtabs" role="tablist" aria-label="Wishlist"><button role="tab" type="button" data-wkind="comics" aria-selected="${S.wishKind === "comics"}">Comics <span class="muted">${wc.length}</span></button><button role="tab" type="button" data-wkind="books" aria-selected="${S.wishKind === "books"}">Books <span class="muted">${wb.length}</span></button></div>` : "";
  const fits = all.filter(c => (wishBudget(c) || {}).ok);
  const byLv = lv => all.filter(c => wishLevel(c) === lv), musts = byLv("must"), dreams = byLv("dream");
  const counts = { budget: fits.length, nodream: all.length - dreams.length, must: musts.length, want: byLv("").length, dream: dreams.length };
  if (S.wishFilter && S.wishFilter !== "all" && !counts[S.wishFilter]) S.wishFilter = "all";
  const wl = (S.wishFilter === "budget" ? fits : S.wishFilter === "nodream" ? all.filter(c => wishLevel(c) !== "dream") : S.wishFilter === "must" ? musts : S.wishFilter === "want" ? byLv("") : S.wishFilter === "dream" ? dreams : all)
    .slice().sort((a, b) => wishRank(a) - wishRank(b));   // Must have first, Dream last (sortComics' order otherwise)
  const real = wishCost(all.filter(c => wishLevel(c) !== "dream")), dream = wishCost(dreams);
  const costLine = real.n || dream.n ? `<p class="small" style="margin:0"><strong>Cost ≈ ${money(real.t, "CHF")}</strong> for Must have and Want${real.n < all.length - dreams.length ? ` (${real.n} of ${all.length - dreams.length} have a price)` : ""}${dreams.length ? ` · Dream ≈ ${money(dream.t, "CHF")}${dream.n < dreams.length ? ` (${dream.n} of ${dreams.length} priced)` : ""}` : ""}</p>` : "";
  if (S.fair && all.length) return gapTabs() + kindChips + `<div class="fairbar"><input id="fairq" type="search" enterkeyhint="search" value="${esc(S.fairQ || "")}" placeholder="Number or series"><button type="button" id="fairoff">Leave fair mode</button></div>
      <p class="small muted" style="margin:0">Fair mode: big rows, everything on one list, Must have first. “I bought it” asks what you paid and where.</p><div id="fairres"></div><datalist id="gotsrc">${gotSources()}</datalist>`;
  const chip = (k, label) => `<button type="button" class="fchip${(S.wishFilter || "all") === k ? " on" : ""}" data-wf="${k}" aria-pressed="${(S.wishFilter || "all") === k}">${label}</button>`;
  return gapTabs() + kindChips + (all.length ? `<div class="row between wishhead"><div class="fchips">${chip("all", "All " + all.length)}${musts.length || dreams.length ? (musts.length ? chip("must", "★ Must have " + musts.length) : "") + (counts.want ? chip("want", "Want " + counts.want) : "") + (dreams.length ? chip("dream", "Dream " + dreams.length) : "") + (dreams.length ? chip("nodream", "Without Dream " + counts.nodream) : "") : ""}${fits.length ? chip("budget", "Within budget " + fits.length) : ""}</div><div class="row" style="gap:6px;flex-wrap:wrap">${wb.length && wc.length ? `<button type="button" data-wcopy="comics">Copy comics</button><button type="button" data-wcopy="books">Copy books</button><button type="button" data-wcopy="">Copy both</button>` : `<button type="button" data-wcopy="">Copy list for comic fair</button>`}${dreams.length ? `<button type="button" data-wcopy="" data-nodream="1">Copy without Dream</button>` : ""}<button type="button" id="fairon" class="primary">Fair mode</button></div></div><datalist id="gotsrc">${gotSources()}</datalist>
      <textarea id="wcopybox" class="mono" rows="6" readonly hidden></textarea>
      ${costLine}
      <p class="small muted" style="margin:0">${wl.length} ${S.wishKind === "books" ? (wl.length === 1 ? "book" : "books") : (wl.length === 1 ? "issue" : "issues")} ${S.wishFilter === "budget" ? "worth no more than your maximum price (by your price table)" : "wanted"}. Tap “Got it” when you buy one: enter what you paid and where, and it moves to your collection with today's date. At a comic fair, “Fair mode” shows bigger rows with a search.</p>` + wishlistBySeries(wl)
    : '<div class="empty"><h3>Your wishlist is empty</h3><p>In Gaps, tap a grey number to put it on your wishlist.</p></div>') + '<div id="cellpick"></div>';
}
// the wishlist as short text for a comic fair: "LTB: 12, 45, 101–103 (max CHF 8)"
function wishlistText(kind, noDream) {
  const every = sortComics(S.comics.filter(c => c.status === "wanted" && !(noDream && wishLevel(c) === "dream"))), wl = (kind === "books" ? [] : every.filter(c => !isNovel(c))).concat(kind === "comics" ? [] : every.filter(c => isNovel(c))), groups = new Map();
  wl.forEach(c => { const k = seriesKeyOf(c); (groups.get(k) || groups.set(k, []).get(k)).push(c); });
  const lines = [];
  groups.forEach((list, k) => {
    const se = seriesById(k), yearly = se && se.numbering === "year";
    const maxOf = c => [wishLevel(c) === "must" ? "★" : "", typeof c.pricePaid === "number" ? "max " + money(c.pricePaid, c.currency || "CHF") : ""].filter(Boolean).join(" ");   // ★ = Must have
    const parts = []; let run = null;
    const flush = () => { if (run) { parts.push(run.a === run.b ? run.la : run.la + "–" + run.lb.replace(/^\d{4}\//, "")); if (run.max) parts[parts.length - 1] += " (" + run.max + ")"; run = null; } };
    list.forEach(c => {
      const lab = showLabel(c.issueLabel || c.issue || "") || c.title || "?", n = c.issueSort, max = maxOf(c);
      const y = yearly ? Math.floor((n || 0) / 1000) : 0;
      if (run && Number.isInteger(n) && n === run.b + 1 && max === run.max && (!yearly || y === run.y)) { run.b = n; run.lb = lab; return; }
      flush();
      if (Number.isInteger(n)) run = { a: n, b: n, la: lab, lb: lab, max, y }; else { parts.push(lab + (max ? " (" + max + ")" : "")); }
    });
    flush();
    const name = c0 => c0.kind === "book" ? (c0.seriesName || "Books") : se ? (se.short ? se.short + " – " + se.name : se.name) : c0.seriesName || "";
    if (isNovel(list[0]) && !groups._bk) { groups._bk = true; lines.push("", "Books:"); }
    if (list[0].kind === "book" && !list[0].seriesName) list.forEach(c => lines.push("Book: " + [c.title, c.author].filter(Boolean).join(" – ") + (maxOf(c) ? " (" + maxOf(c) + ")" : "")));
    else lines.push(name(list[0]) + ": " + parts.join(", "));
  });
  if (kind && lines[0] === "" && lines[1] === "Books:") lines.splice(0, 2);   // books only: no extra heading
  return (kind === "comics" ? "My comics wishlist (" : kind === "books" ? "My books wishlist (" : "My wishlist (") + wl.length + ")" + (wl.some(c => wishLevel(c) === "must") ? " · ★ = must have" : "") + "\n" + lines.join("\n");
}
function bindWishlist() {
  bindGapTabs();
  document.querySelectorAll("[data-wf]").forEach(b => b.onclick = () => { S.wishFilter = b.dataset.wf; renderKeep(); });
  document.querySelectorAll("[data-wkind]").forEach(b => b.onclick = () => { S.wishKind = b.dataset.wkind; S.wishFilter = "all"; renderKeep(); });
  document.querySelectorAll("[data-wcopy]").forEach(b => b.onclick = async () => {
    const k = b.dataset.wcopy, txt = wishlistText(k, !!b.dataset.nodream), box = $("#wcopybox");
    try { await navigator.clipboard.writeText(txt); toast((k === "comics" ? "Comics wishlist" : k === "books" ? "Books wishlist" : "Wishlist") + " copied. Paste it into Keep or a message."); }
    catch (e) { box.value = txt; box.hidden = false; box.focus(); box.select(); toast("Press and hold the selected text, then Copy."); }
  });
  document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
  document.querySelectorAll("details.wishseries").forEach(d => d.ontoggle = () => { S.wishOpen = S.wishOpen || {}; S.wishOpen[d.dataset.wk] = d.open; });
  // the row keeps its place until you leave the list, so you can change several in a row without searching
  document.querySelectorAll("[data-wlset]").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    const c = S.comics.find(x => x.id === b.dataset.wlset); if (!c || wishLevel(c) === b.dataset.lv) return;
    try {
      await saveComic(Object.assign({}, c, { wishLevel: b.dataset.lv }), true);
      b.parentNode.querySelectorAll("[data-wlset]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const kind = S.wishKind === "books", all = S.comics.filter(x => x.status === "wanted" && isNovel(x) === kind), lv = l => all.filter(x => wishLevel(x) === l).length;
      const lab = { all: "All " + all.length, must: "★ Must have " + lv("must"), want: "Want " + lv(""), dream: "Dream " + lv("dream"), nodream: "Without Dream " + (all.length - lv("dream")) };
      document.querySelectorAll("[data-wf]").forEach(x => { if (lab[x.dataset.wf]) x.textContent = lab[x.dataset.wf]; });
    } catch (x) { toast(errText(x)); }
  });
  bindGot(document);
  const setFair = on => { S.fair = on; try { localStorage.setItem("ddaFair", on ? "1" : "0"); } catch (e) {} render(); window.scrollTo(0, 0); };
  $("#fairon") && ($("#fairon").onclick = () => setFair(true));
  $("#fairoff") && ($("#fairoff").onclick = () => setFair(false));
  if ($("#fairq")) { $("#fairq").oninput = e => { S.fairQ = e.target.value; drawFair(); }; drawFair(); }
}
// ---- "I bought it": asks what you paid and where (both may stay empty), then moves a wish or a Read-not-owned entry to your collection ----
function gotSources() { const m = {}; S.comics.forEach(c => { const s = String(c.source || "").trim(); if (s) m[s] = (m[s] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([s]) => `<option value="${esc(s)}">`).join(""); }
function gotPrefs() { try { return JSON.parse(localStorage.getItem("ddaGot") || "{}"); } catch (e) { return {}; } }
function bindGot(root) {
  root.querySelectorAll("[data-got]").forEach(b => b.onclick = e => {
    e.stopPropagation();
    const c = S.comics.find(x => x.id === b.dataset.got); if (!c) return;
    const row = b.closest(".wishrow, .fairrow, .gotrow"), old = row.querySelector(".gotform"); if (old) { old.remove(); return; }
    const pr = gotPrefs(), cur = pr.cur || c.currency || "CHF";
    const f = document.createElement("div"); f.className = "gotform";
    f.innerHTML = `<label><span class="l">Price paid</span><input data-gp inputmode="decimal" placeholder="e.g. 5"></label>
      <label><span class="l">Currency</span><select data-gc>${CURRENCIES.map(k => `<option${k === cur ? " selected" : ""}>${k}</option>`).join("")}</select></label>
      <label class="wide"><span class="l">Bought from</span><input data-gs list="gotsrc" value="${esc(pr.src || "")}" placeholder="Stand, shop or seller"></label>
      ${c.kind === "book" && isNovel(c) ? "" : `<div class="wide"><span class="l">Condition (can stay empty)</span><div class="row" style="gap:4px;flex-wrap:wrap">${GRADES.filter(([k]) => !k.includes("-")).map(([k, t]) => `<button type="button" class="fchip${String(c.grade || "") === k ? " on" : ""}" data-gz="${k}" title="${esc(t)}">Z${k}</button>`).join("")}</div></div>`}
      <div class="row wide" style="gap:6px"><button type="button" class="primary" data-gsave>Save to collection</button><button type="button" class="ghost" data-gx>Cancel</button></div>`;
    row.appendChild(f); f.querySelector("[data-gp]").focus();
    let grade = String(c.grade || "");
    f.querySelectorAll("[data-gz]").forEach(z => z.onclick = ev => { ev.stopPropagation(); grade = grade === z.dataset.gz ? "" : z.dataset.gz; f.querySelectorAll("[data-gz]").forEach(x => x.classList.toggle("on", x.dataset.gz === grade)); });
    f.querySelector("[data-gx]").onclick = ev => { ev.stopPropagation(); f.remove(); };
    f.querySelector("[data-gsave]").onclick = async ev => {
      ev.stopPropagation();
      const paid = parseAmt(f.querySelector("[data-gp]").value), cu = f.querySelector("[data-gc]").value, src = f.querySelector("[data-gs]").value.trim();
      try { localStorage.setItem("ddaGot", JSON.stringify({ cur: cu, src })); } catch (x) {}
      try {
        // the wishlist's maximum price isn't the price paid, so it is replaced by what you enter (or cleared).
        // A wish counts as a fulfilled wish; a Read-not-owned entry keeps its read date and ratings, "Read from" gives way to the seller.
        const base = S.comics.find(x => x.id === c.id) || c, fromWish = base.status === "wanted";
        const body = Object.assign({}, base, { status: "owned", pricePaid: typeof paid === "number" ? paid : "", currency: cu, source: src || (fromWish ? base.source || "" : ""), purchaseDate: todayIso(), copies: base.copies || 1, wishLevel: "", grade });
        if (fromWish) body.wasWish = true;
        // a wish made with "Want to own it": the read-only entry's read date, rating, heart and link come along, then it goes
        const rd = fromWish && base.fromRead ? S.comics.find(x => x.id === base.fromRead && notOwned(x)) : null;
        if (rd) ["read", "readDate", "rating", "fav", "coverRating", "link", "words"].forEach(k => { if (rd[k] !== undefined && rd[k] !== "" && (body[k] === undefined || body[k] === "" || body[k] === false || body[k] === null)) body[k] = rd[k]; });
        delete body.fromRead;
        const saved = await saveComic(body); if (rd) await deleteComic(rd.id);
        if (S.draft && S.draft.id === c.id) S.draft = JSON.parse(JSON.stringify(saved));
        toast("✓ " + (base.kind === "book" && base.title ? base.title : comicTag(base)) + " moved to your collection" + (typeof paid === "number" ? " (" + money(paid, cu) + ")" : "")); renderKeep();
      } catch (x) { toast(errText(x)); }
    };
  });
}
// ---- Fair mode: one flat list with big rows and a search by number or series ----
function drawFair() {
  const box = $("#fairres"); if (!box) return;
  const kind = S.wishKind === "books", words = norm(S.fairQ || "").split(" ").filter(Boolean);
  const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
  let list = sortComics(S.comics.filter(c => c.status === "wanted" && isNovel(c) === kind));
  if (words.length) list = list.filter(c => { const s = seriesById(c.seriesId), lab = norm(String(c.issueLabel || c.issue || "")), t = norm([s && s.short, s && s.name, c.seriesName, c.title, c.author].filter(Boolean).join(" "));
    return words.every(w => /^\d/.test(w) ? lab === w || lab.startsWith(w) || lab.split(/[^0-9a-z]+/).includes(w) : t.includes(w)); });
  list = list.slice().sort((a, b) => wishRank(a) - wishRank(b) || ((order[a.seriesId] ?? 999) - (order[b.seriesId] ?? 999)));
  box.innerHTML = list.length ? '<div class="list">' + list.slice(0, 150).map(c => {
    const s = seriesById(c.seriesId), bud = wishBudget(c), v = bud ? bud.v : valueOf(c);
    const sub = [wishLevel(c) === "must" ? "★ Must have" : wishLevel(c) === "dream" ? "Dream" : "", typeof c.pricePaid === "number" ? "Max " + money(c.pricePaid, c.currency) : "", v ? "worth ≈ " + money(v.amount, v.cur) : "", c.notes].filter(Boolean).join(" · ");
    return `<div class="fairrow${wishLevel(c) === "must" ? " must" : ""}"><div class="fnum"><small>${esc(isNovel(c) ? "Book" : s ? s.short || s.name : c.seriesName)}</small>${esc(c.issueLabel || c.issue || "")}</div>
      <div class="fmid"><div class="t">${esc(c.title || (s ? s.name : c.seriesName) || "")}</div><div class="s">${esc(sub)}</div></div><button class="gotit" type="button" data-got="${esc(c.id)}">I bought it</button></div>`;
  }).join("") + "</div>" + (list.length > 150 ? `<p class="small muted">${list.length - 150} more: type a number or series to narrow it down.</p>` : "")
    : '<div class="empty"><h3>Not on your wishlist</h3><p>Nothing matches. Check the number, or type only the series.</p></div>';
  bindGot(box);
}
function wishItem(c) {
  const s = seriesById(c.seriesId), bk = c.kind === "book", cv = coverOf(c);
  const bud = wishBudget(c), v = bud ? bud.v : valueOf(c);
  const sub = [wishLevel(c) === "must" ? "★ Must have" : wishLevel(c) === "dream" ? "Dream" : "", c.pricePaid !== "" && c.pricePaid != null ? "Max " + money(c.pricePaid, c.currency) : "", v ? "worth ≈ " + money(v.amount, v.cur) : "", c.notes].filter(Boolean).join(" · ") || niceDate(c.date) || "";
  return `<div class="item wishrow">${cv ? `<div class="cthumb" data-zoom="${esc(c.id)}"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()"></div>` : ""}
    <button class="wishmain" data-open="${esc(c.id)}"><div class="num${String(c.issueLabel || c.issue || "").length > 4 ? " long" : ""}">${bk && !c.issue ? '<span style="font-size:.9rem">Book</span>' : esc(c.issueLabel || c.issue || "–")}<small>${bk ? "BOOK" : esc(s ? s.short : c.seriesName)}</small></div>
      <div style="min-width:0"><div class="t">${esc(c.title || (s ? s.name : c.seriesName))}${bud && bud.ok ? ' <span class="chip budget">Within budget</span>' : ""}</div><div class="s">${esc(sub)}</div></div></button>
    <button class="gotit" type="button" data-got="${esc(c.id)}">I bought it</button>
    <div class="seg small wlseg" role="group" aria-label="How much you want it">${WISH_LEVELS.map(([k, l]) => `<button type="button" data-wlset="${esc(c.id)}" data-lv="${k}" aria-pressed="${wishLevel(c) === k}">${k === "must" ? "★ " + l : l}</button>`).join("")}</div></div>`;
}
function wishlistBySeries(wl) {
  const groups = {};
  wl.forEach(c => { const k = seriesKeyOf(c); (groups[k] = groups[k] || []).push(c); });
  const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
  const keys = Object.keys(groups).sort((a, b) => ((order[a] ?? 999) - (order[b] ?? 999)) || seriesTitle(a).localeCompare(seriesTitle(b), "de", { numeric: true }));
  S.wishOpen = S.wishOpen || {};
  return '<div class="list">' + keys.map(k => {
    const list = groups[k].slice().sort((a, b) => wishRank(a) - wishRank(b)), se = seriesById(k), max = list.filter(c => typeof c.pricePaid === "number");
    const sub = [list.length + (list.every(c => c.kind === "book") ? (list.length === 1 ? " volume wanted" : " volumes wanted") : (list.length === 1 ? " issue wanted" : " issues wanted")), se ? se.publisher : "", max.length ? "budget " + money(max.reduce((a, c) => a + c.pricePaid, 0), max[0].currency) : ""].filter(Boolean).join(" · ");
    return `<details class="wishseries" data-wk="${esc(k)}"${S.wishOpen[k] ? " open" : ""}><summary class="folder"><div style="min-width:0"><div class="t">${esc(seriesTitle(k))}${se && se.short ? ` <span class="chip">${esc(se.short)}</span>` : ""}</div><div class="s">${esc(sub)}</div></div><span class="count wanted-count">${list.length}</span><span class="chev" aria-hidden="true">›</span></summary>
      <div class="list" style="margin-top:8px">${list.map(wishItem).join("")}</div></details>`;
  }).join("") + '</div>';
}
// ---- Gaps & wishlist ----
VIEWS.gaps = {
  html() {
    if (S.gapTab === "wishlist") return wishlistView();
    if (String(S.gapSeries || "").startsWith("book:") && (S.comics.some(c => c.kind === "book" && c.seriesName === S.gapSeries.slice(5)) || (S.bookSeriesExtra || []).some(x => x.name === S.gapSeries.slice(5)))) return bookGapsHtml();
    const se = seriesById(S.gapSeries) || S.series[0];
    if (!se) return '<h2>Gaps &amp; wishlist</h2><div class="empty"><h3>No series set up</h3><p>Add your series under the Series tab first.</p></div>';
    const mine = S.comics.filter(c => c.seriesId === se.id);
    const own = new Map(), want = new Map();
    // a double issue like 2012-13-14 fills both of its numbers
    const catSq = gridCat(se);
    const covered = lab => { const f = fusedSquare(catSq, lab); return f ? [f] : splitLabel(catSq, lab) ? [lab] : issueSquares(lab); };   // 1967-02B has its own square; a double issue one wide square
    const inSquare = new Map();   // square -> every comic in it (variants, double issues)
    // read without owning it: the square stays missing, with a dashed edge and a ✓ (read, not owned)
    const readNo = new Map(); mine.forEach(c => { if (notOwned(c)) covered(c.issueLabel || c.issue).forEach(k => readNo.set(k, c)); });
    mine.forEach(c => { if (c.facsimile || notOwned(c)) return; covered(c.issueLabel || c.issue).forEach(k => { (c.status === "wanted" ? want : own).set(k, c); (inSquare.get(k) || inSquare.set(k, []).get(k)).push(c); }); });
    // owned and wished at once: the same comic both ways (546A owned with 546B wished is fine)
    const live = mine.filter(c => !c.facsimile), clash = new Set();
    live.forEach(a => { if (a.status === "wanted" || notOwned(a)) return; live.forEach(b => { if (b.status === "wanted" && sameSlot(a.issueLabel || a.issue, b.issueLabel || b.issue)) { clash.add(a.id); clash.add(b.id); } }); });
    const clashSq = new Set(live.filter(c => clash.has(c.id)).flatMap(c => covered(c.issueLabel || c.issue)));
    const opts = seriesOptions(se.id, s => s.name) + bookSeriesOptions("");
    let grid = "", total = 0, ownIn = 0, wantIn = 0;
    const tag = shortTag(se);
    const gridLabels = new Set();
    const defEd = defaultEditionOf(se.id);
    const cell = (label, txt) => {
      gridLabels.add(label);
      const o = own.get(label), w = want.get(label);
      if (o) ownIn++; else if (w) wantIn++;
      const all = inSquare.get(label) || [];
      const vars = all.filter(c => variantOf(c.issueLabel || c.issue));
      const cls = (clashSq.has(label) ? "owned conflict" : o ? "owned" : w ? "wanted" + (wishLevel(w) ? " wl-" + wishLevel(w) : "") : "") + (o && w && !clashSq.has(label) ? " alsowant" : "") + (all.some(c => isOwn(c)) && all.filter(c => isOwn(c)).every(c => c.read) ? " read" : "") + (!o && readNo.has(label) ? " readno read" : "");
      const vtxt = vars.length && !splitLabel(catSq, label) ? `<sup>${esc([...new Set(vars.filter(c => !o || isOwn(c)).map(c => variantOf(c.issueLabel || c.issue)))].sort().join(""))}</sup>` : "";
      const info = (all.length ? all.map(c => (c.issueLabel || c.issue) + (c.status === "wanted" ? " on wishlist" : " owned")).join(", ") : "missing") + (!o && readNo.has(label) ? " · read, not owned" : "");
      const eds = [...new Set(all.filter(c => isOwn(c) && c.edition && editionKey(c.edition) !== editionKey(defEd)).map(c => editionMark(c.edition)))];
      const etxt = eds.length ? `<span class="edb">${esc(eds.join(" "))}</span>` : "";
      return `<button class="cell ${cls}${eds.length ? " hased" : ""}" data-issue="${esc(label)}" data-id="${esc(all.length === 1 ? all[0].id : "")}" data-ids="${esc(all.map(c => c.id).join(","))}" title="${esc(tag + " " + label + " · " + info + (eds.length ? " · " + all.filter(c => c.edition).map(c => c.edition).join(", ") : ""))}">${esc(txt)}${vtxt}${etxt}</button>`;
    };
    const ent0 = catEntry(se), cat0 = gridCat(se), perY = {};
    const perYSet = {};
    if (cat0) Object.keys(cat0.issues || {}).forEach(k => { const m = /^(\d{4})\/(\d{1,3})$/.exec(k); if (m) { perY[m[1]] = Math.max(perY[m[1]] || 0, +m[2]); (perYSet[m[1]] = perYSet[m[1]] || new Set()).add(+m[2]); } });
    // a year INDUCKS lists without a number (Farbror Joakims liv: 1997, 2017, 2019, 2022) is one issue that year, square label = the year
    const yearOnly = new Set(); if (cat0) Object.keys(cat0.issues || {}).forEach(k => { if (/^(19|20)\d\d$/.test(k) && !perY[k]) { yearOnly.add(+k); perY[k] = 1; (perYSet[k] = new Set()).add(1); } });
    // a year where INDUCKS lists only a few scattered numbers (Mega Micky Maus 2017: only 5/2017) shows just those, plus your own
    const sparse = y => perYSet[y] && ((cat0 && cat0.own) || LISTED_ONLY.has(se.code) || perYSet[y].size * 2 < perY[y]);   // an own list (91:an) shows exactly its numbers
    const yearNums = (y, py) => { if (!sparse(y)) { const st = yearStart(perYSet, mine, y); return Array.from({ length: Math.max(0, py - st + 1) }, (_, i) => i + st); } const set = new Set(perYSet[y]); mine.forEach(c => { const m = /^(\d{4})\/(\d{1,3})$/.exec(c.issueLabel || ""); if (m && +m[1] === y) set.add(+m[2]); }); return [...set].sort((a, b) => a - b); };
    const catYears = Object.keys(perY).map(Number), catLast = catYears.length ? Math.max(...catYears) : 0;
    const zero = zeroSquares(se, cat0, mine);
    if (se.numbering === "year") {
      const ownYears = mine.map(c => c.issueYear || +((/^(\d{4})\//.exec(c.issueLabel || "") || [])[1]) || 0).filter(Boolean);
      const ownMax = Math.max(0, ...mine.map(c => +((/^\d{4}\/(\d{1,3})$/.exec(c.issueLabel || "") || [])[1]) || 0));
      const y0 = Math.min(+se.firstYear || 1950, ...ownYears, ...(catYears.length ? [Math.min(...catYears)] : [])), y1 = Math.max(+se.lastYear || new Date().getFullYear(), ...ownYears), per = Math.max(+se.perYear || 52, ownMax);
      const unknown = mine.filter(c => /\?/.test(c.issueLabel || "")).length;
      const years = [];
      for (let y = y1; y >= y0; y--) years.push(y);
      // with the INDUCKS catalogue, each year shows only the numbers that came out (KA 1948: 1–4)
      const perFor = y => {
        if (!cat0 || y > catLast) return perYearFor(se, y, mine);
        const owned = mine.filter(c => isOwn(c) && (c.issueLabel || "").startsWith(y + "/")).map(c => parseInt((c.issueLabel || "").slice(5), 10) || 0);
        return Math.max(perY[y] || 0, ...owned);   // an owned issue always gets its square
      };
      // the Nullnummer comes first in its year
      // extras (7½) sit right after their number
      const numsOf = y => { const py = perFor(y), sp = yearSplits(cat0, y);
        let nums = (py ? yearNums(y, py).filter(n => n > 0) : []).flatMap(n => sp[n] ? sp[n].map(L => n + (L.charCodeAt(0) - 64) / 100) : [n]);
        nums = nums.concat(yearExtras(cat0, mine, y).map(n => n + 0.5));
        const dbl = catDoubles(cat0)[y] || {};   // a double issue: one wide square (marked as n + 0.9) instead of its numbers
        if (Object.keys(dbl).length) nums = nums.filter(n => !Object.keys(dbl).some(a => Math.floor(n) >= +a && Math.floor(n) <= dbl[a])).concat(Object.keys(dbl).map(a => +a + 0.9));
        nums.sort((a, b) => a - b); return zero.has(String(y)) ? [0].concat(nums) : nums; };
      const labOf = (y, n) => { if (Number.isInteger(n)) return yearOnly.has(y) && n === 1 ? String(y) : y + "/" + String(n).padStart(2, "0"); const b = Math.floor(n), f = Math.round((n - b) * 100);
        if (f === 90) return fusedKey(y, b, (catDoubles(cat0)[y] || {})[b]);
        return f === 50 ? y + "X" + String(b).padStart(2, "0") : y + "-" + String(b).padStart(2, "0") + String.fromCharCode(64 + f); };
      const txtOf = n => { if (Number.isInteger(n)) return se.code === "se/B" ? n + "B" : n; const b = Math.floor(n), f = Math.round((n - b) * 100); return b + (f === 50 ? "½" : String.fromCharCode(64 + f)); };
      total = years.reduce((a, y) => a + numsOf(y).length, 0);
      grid = years.map(y => {
        const nums = numsOf(y); if (!nums.length) return ""; let cells = ""; nums.forEach(n => { const f = Math.round((n - Math.floor(n)) * 100) === 90; cells += f ? cell(labOf(y, n), Math.floor(n) + "-" + (catDoubles(cat0)[y] || {})[Math.floor(n)]).replace('class="cell ', 'class="cell wide ') : cell(labOf(y, n), yearOnly.has(y) && n === 1 ? y : txtOf(n)); });
        const cnt = nums.filter(n => own.has(labOf(y, n))).length;
        return `<div class="yearrow"><div class="y">${y}<div class="muted small">${cnt} of ${nums.length}</div></div><div class="cells">${cells}</div></div>`;
      }).join("");
      grid = '<div class="stack" style="gap:10px">' + grid + '</div>';
    } else {
      const highest = Math.max(0, ...mine.filter(c => /^\d+$/.test(c.issueLabel || "")).map(c => +c.issueLabel));
      const first = Math.max(1, +se.first || 1), max = Math.max(+se.latest || first + 9, highest);
      total = max - first + 1 + (zero.has("run") ? 1 : 0); let cells = "";
      if (zero.has("run")) cells += cell("0", 0);
      for (let n = first; n <= max; n++) cells += cell(String(n), n);
      grid = '<div class="cells">' + cells + '</div>';
    }
    // every comic of this series the grid can't show, with the reason
    const firstOf = new Map();
    const notInGrid = [];
    const both = new Set([...clashSq].filter(k => gridLabels.has(k)));
    mine.forEach(c => {
      const lab = c.issueLabel || c.issue || "";
      if (c.facsimile) { notInGrid.push({ c, why: "Facsimile or reprint of " + lab + ", so the square shows only the original." }); return; }
      if (clash.has(c.id) && covered(lab).some(k => gridLabels.has(k))) { notInGrid.push({ c, why: c.status === "wanted" ? "Also owned: if you have it, delete this wishlist entry." : "Also on your wishlist: if you don't have it, delete this entry; if you do, delete the wishlist one.", conflict: true }); return; }
      if (covered(lab).length > 1 && covered(lab).every(k => gridLabels.has(k))) return;   // double issue, shown in both squares
      if (variantOf(lab) && covered(lab).every(k => gridLabels.has(k))) return;              // variant, shown in its number's square
      if (gridLabels.has(lab) && !firstOf.has(lab + c.status)) { firstOf.set(lab + c.status, c); return; }
      const sup = /^(\d{4})X(\d{1,3})$/.exec(lab);
      const why = /^T\d+$/.test(lab) ? "Test issue (Testausgabe), outside the numbered run."
        : sup ? "Supplement (extra booklet) from " + sup[1] + ", not a numbered issue."
        : /\?/.test(lab) ? "Number unknown. Edit it, or match it under Series › INDUCKS."
        : gridLabels.has(lab) ? "Second entry with the same number" + ((c.copies || 1) > 1 ? "" : ". Use “Copies” instead, or delete one.")
        : (() => { const m = /^(\d{4})\/(\d{1,3})$/.exec(lab); return m && cat0 && perY[m[1]] && +m[2] > perY[m[1]]; })() ? "INDUCKS lists only " + lab.slice(0, 4) + "/01–" + lab.slice(0, 4) + "/" + String(perY[lab.slice(0, 4)]).padStart(2, "0") + " for that year. Check the number, or delete this entry."
        : se.numbering !== "year" && /^\d+$/.test(lab) && +se.first > 1 && +lab < +se.first ? "Lower than the first issue (" + se.first + "). Change “First issue” under Series if the series starts earlier."
        : !lab ? "No issue number" : "Number “" + lab + "” doesn't fit this series' numbering" + (se.numbering === "year" ? " (year/number, e.g. 1985/12)." : ".");
      notInGrid.push({ c, why });
    });
    // numbers INDUCKS only knows as variants (LTB 546 is 546A or 546B): ask which one
    const entry = catEntry(se), cat = gridCat(se);
    if (entry && !cat && !S.catLoading) { S.catLoading = true; catalogueFile(entry).then(() => { S.catLoading = false; if (S.view === "gaps") render(); }).catch(() => { S.catLoading = false; }); }
    if (cat) mine.forEach(c => {
      const lab = c.issueLabel || c.issue || "";
      if (c.facsimile || variantOf(lab) || (cat.issues || {})[lab] || /\?/.test(lab)) return;
      const vars = Object.keys(cat.issues || {}).filter(k => variantOf(k) && sameSlot(k, lab));
      if (vars.length && !notInGrid.some(x => x.c === c)) notInGrid.push({ c, hint: true, why: "INDUCKS lists this number only as variants " + vars.join(", ") + ". Open it and add the letter, e.g. " + vars[0] + "." });
    });
    const ownCount = ownIn, wantCount = wantIn;
    const wl = sortComics(S.comics.filter(c => c.status === "wanted"));
    if ((S.gapTab || "gaps") === "wishlist") return wishlistView();
    const edList = seriesEditions(se.id);
    return gapTabs() + gapHead(ownCount, wantCount, total, { cur: se.id, editions: edList.length ? edList : null, defEd, legend: `<span><i style="background:var(--owned)"></i>Owned</span><span><i style="background:var(--wanted-soft);box-shadow:inset 0 0 0 1.5px var(--wanted)"></i>Wishlist</span><span><i style="background:var(--cell)"></i>Missing</span><span><i style="background:var(--cell);outline:1.5px dashed var(--owned);outline-offset:-2px"></i>Read, not owned</span><span>Small letters: variants, e.g. 546<sup>AB</sup></span>
        <span>${se.numbering === "year" ? `Grid covers ${esc(se.firstYear || "?")}–${esc(se.lastYear || "?")}, ${cat0 ? (cat0.own ? "with the issues in its issue list (Seriekatalogen)" : "with the issues INDUCKS lists for each year") : (perYearParts(se).parts.length ? "issues a year as set (" + esc(se.perYear) + ")" : esc(perYearOf(se, 0) || 52) + " issues a year")}` : `Grid runs ${+se.first > 1 ? "from issue " + esc(se.first) + " " : ""}to issue ${esc(se.latest || "you own with the highest number")}`}. Adjust this under Series.</span>` }) + `
      ${notInGrid.length ? `<details class="offgrid"><summary class="small"><strong>${[
            both.size ? both.size + (both.size === 1 ? " issue is" : " issues are") + " owned and wished at once" : "",
            (k => k ? k + (k === 1 ? " comic needs" : " comics need") + " a variant letter" : "")(notInGrid.filter(x => x.hint).length),
            (k => k ? k + (k === 1 ? " comic isn't" : " comics aren't") + " in the grid" : "")(notInGrid.filter(x => !x.conflict && !x.hint).length)
          ].filter(Boolean).join(" · ")}</strong> · tap to see why</summary>
          <div class="list" style="margin-top:8px">${notInGrid.map(({ c, why }) => `<button class="item whyitem" data-open="${esc(c.id)}"><div class="num${String(c.issueLabel || c.issue || "").length > 4 ? " long" : ""}">${esc(c.issueLabel || c.issue || "–")}<small>${esc(tag)}</small></div><div style="min-width:0"><div class="t">${esc(c.title || niceDate(c.date) || tag)}</div><div class="s">${esc(why)}</div></div><div class="chips">${c.status === "wanted" ? '<span class="chip wanted">Wishlist</span>' : ""}</div></button>`).join("")}</div></details>` : ""}
      ${(st => st.length ? `<div class="banner warn small"><div>${st.length} of your ${st.length === 1 ? "copies is" : "copies are"} saved as ${st.length === 1 ? "a book" : "books"} in the book series “${esc(st[0].c.seriesName)}” (${esc(st.map(x => x.c.issue || x.c.title).join(", "))}), so the grid can't count ${st.length === 1 ? "it" : "them"}.</div><div class="row" style="margin-top:6px"><button type="button" class="primary" id="movestray">Move ${st.length === 1 ? "it" : "them"} into ${esc(se.short || se.name)}</button></div></div>` : "")(strayBooks(se.id))}
      ${seriesAbout(se)}
      <div id="cellpick"></div>
      <div id="gridbox" class="${gridClass()}">${grid}</div>`;
  },
  bind() {
    if (S.gapTab === "wishlist") return bindWishlist();
    if (String(S.gapSeries || "").startsWith("book:") && $("#bsize")) return bindBookGaps();
    bindGapTabs(); bindGapHead(); bindGapPicker();
    const open = id => { S.editing = id; S.draft = null; nav("add"); };
    document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { if (S.moveMode) { moveToggle(b); return; } open(b.dataset.open); });
    $("#movestray") && ($("#movestray").onclick = async () => { try { const n = await moveStrays(strayBooks(S.gapSeries)); toast(n + (n === 1 ? " copy moved" : " copies moved")); renderKeep(); } catch (e) { toast(errText(e)); } });
    const og = $("details.offgrid"); if (og) { og.open = !!S.offgridOpen; og.ontoggle = () => { S.offgridOpen = og.open; }; }
    document.querySelectorAll("details.wishseries").forEach(d => d.ontoggle = () => { S.wishOpen = S.wishOpen || {}; S.wishOpen[d.dataset.wk] = d.open; });
    document.querySelectorAll(".cell").forEach(b => b.onclick = async () => {
      if (S.moveMode) { moveToggle(b); return; }
      if (S.edMode && seriesEditions(S.gapSeries).length) {   // choose the edition of the owned comic(s) in this square
        const mine = (b.dataset.ids || "").split(",").map(id => S.comics.find(c => c.id === id)).filter(c => c && isOwn(c));
        if (!mine.length) { toast("Only owned issues have an edition"); return; }
        const se = seriesById(S.gapSeries) || {}, eds = seriesEditions(se.id), def = defaultEditionOf(se.id), c0 = mine[0];
        const price = e => { const r = valueRuleFor(c0, e); return !r ? "no price" : editionKey(r.ed) === editionKey(e) ? money(r.price, r.cur) : "not listed for this issue"; };
        sheetOpen(`<div class="confirm"><strong>${esc((se.short || se.name) + " " + b.dataset.issue)}: edition</strong>
          ${eds.map(e => `<button data-ed="${esc(e)}"${editionKey(c0.edition) === editionKey(e) ? ' class="primary"' : ""}>${esc(e)} · ${esc(price(e))}</button>`).join("")}
          <button data-ed=""${!c0.edition ? ' class="primary"' : ""}>Not set${def ? " (counts as " + esc(def) + ")" : ""}</button><button class="ghost" id="cpX">Cancel</button></div>`);
        $("#cpX").onclick = sheetClose;
        document.querySelectorAll("#cellpick [data-ed]").forEach(x => x.onclick = async () => {
          try { for (const c of mine) await saveComic(Object.assign({}, c, { edition: x.dataset.ed })); sheetClose(); toast((se.short || se.name) + " " + b.dataset.issue + ": " + (x.dataset.ed || "edition not set")); renderKeep(); } catch (e) { toast(errText(e)); }
        });
        return;
      }
      if (S.readMode) {   // quick reading log: toggles "read" on the owned comic(s) in this square
        const mine = (b.dataset.ids || "").split(",").map(id => S.comics.find(c => c.id === id)).filter(c => c && isOwn(c));
        if (!mine.length) { toast("Only owned issues can be marked as read"); return; }
        const read = !mine.every(c => c.read), se = seriesById(S.gapSeries) || S.series[0] || {};
        try {
          // unticking keeps the date aside (readDateWas), so ticking again by mistake brings it back
          for (const c of mine) { const b2 = Object.assign({}, c, { read, readDate: read ? (c.readDate || c.readDateWas || todayIso()) : "" }); if (read) delete b2.readDateWas; else if (c.readDate) b2.readDateWas = c.readDate; await saveComic(b2); }
          b.classList.toggle("read", read);
          toast((se.short || se.name || "") + " " + b.dataset.issue + (read ? " marked as read" : ": read mark removed"));
        } catch (e) { toast(errText(e)); }
        return;
      }
      if (b.dataset.id) { open(b.dataset.id); return; }
      const se = seriesById(S.gapSeries) || S.series[0], label = b.dataset.issue;
      const box = $("#cellpick");
      const ids = (b.dataset.ids || "").split(",").filter(Boolean);
      if (ids.length) {   // several comics in one square: variants, or owned and wished
        const cs = ids.map(id => S.comics.find(c => c.id === id)).filter(Boolean);
        sheetOpen(`<div class="confirm"><strong>${esc(se.short || se.name)} ${esc(label)}</strong>${cs.map(c => `<button data-pick="${esc(c.id)}">${esc(c.issueLabel || c.issue)} · ${c.status === "wanted" ? "wishlist" : "owned"}</button>`).join("")}<button id="cpAdd">Add another variant…</button><button class="ghost" id="cpX">Cancel</button></div>`);
        box.querySelectorAll("[data-pick]").forEach(x => x.onclick = () => open(x.dataset.pick));
        $("#cpAdd").onclick = () => { S.editing = null; S.draft = blankDraft({ seriesId: se.id, issue: label }); nav("add"); };
        $("#cpX").onclick = sheetClose;
        return;
      }
      sheetOpen(`<div class="confirm"><strong>${esc(se.short || se.name)} ${esc(label)}</strong><button class="primary" id="cpOwn">I own it…</button><button id="cpWant">Add to wishlist</button><button class="ghost" id="cpX">Cancel</button></div>`);
      $("#cpX").onclick = sheetClose;
      $("#cpOwn").onclick = () => { S.editing = null; S.draft = blankDraft({ seriesId: se.id, issue: label }); nav("add"); };
      $("#cpWant").onclick = async () => {
        
        const p = parseIssue(se, label);
        try { await saveComic(Object.assign(blankDraft({ seriesId: se.id, seriesName: se.name, issue: label, status: "wanted" }), { issueLabel: p.label, issueSort: p.sort, issueYear: p.year || null, issueNum: p.n })); toast((se.short || se.name) + " " + label + " added to wishlist"); renderKeep(); }
        catch (e) { toast(errText(e)); }
      };
    });
  }
};
