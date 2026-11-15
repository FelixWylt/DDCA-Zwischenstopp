// Dagobert Ducks Archiv – book lookup and barcode scanning.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- book lookup and barcode scanning ----
function applyBookData(d, r) {
  const set = (k, v) => { if (v) d[k] = v; };
  set("title", r.title); set("author", (r.authors || []).join(", ")); set("publisher", r.publisher); set("date", r.year);
  set("pages", r.pages); set("lang", r.lang); set("genre", isNovel(d) ? r.genre : noComicsGenre(r.genre)); set("translator", r.translator); set("originalTitle", r.originalTitle);
  set("coverUrl", r.cover); set("isbn", r.isbn); set("format", r.format);
  if (r.series && !d.seriesName) { d.seriesName = r.series; if (r.volume && !d.issue) d.issue = String(r.volume).replace(/^\D+/, ""); }
}
function bookMsg(html) { const b = $("#bookmsg"); if (b) { b.innerHTML = html; b.scrollIntoView({ block: "nearest" }); } }
async function fillFromIsbn(d, grab) {
  grab();
  if (!window.Books) return;
  const isbn = Books.normalize(d.isbn);
  if (!isbn) { bookMsg('<div class="banner warn">That isn\'t a valid ISBN. New books have 13 digits above the barcode. Older books have 10 digits, usually on the back or the copyright page; if the last one is an X, type the other 9 and leave the X off. Books from before about 1970 often have no ISBN at all: search by title instead.</div>'); return; }
  const dup = S.comics.find(c => c.id !== d.id && c.kind === "book" && Books.normalize(c.isbn) === isbn);
  bookMsg('<div class="banner">Looking up ' + isbn + '…</div>');
  const res = await Books.lookupIsbn(isbn);
  if (!res.data) { bookMsg(`<div class="banner warn">${res.offline ? "The book databases need an internet connection." : "None of the book databases knows ISBN " + isbn + "." + (/^97[89]88|^97912/.test(isbn) ? " Italian books are often only in the Italian national library, which apps can't ask, and in Google Books, whose free daily limit is sometimes used up (try again later)." : "") + " Look it up and copy title and author: " + `<a href="${esc(Books.sbnUrl(isbn))}" target="_blank" rel="noopener">Italian library (SBN)</a> · <a href="https://www.google.com/search?tbm=bks&q=isbn:${encodeURIComponent(isbn)}" target="_blank" rel="noopener">Google Books</a>, or try “Search by title and author”.`}</div>`); d.isbn = isbn; return; }
  applyBookData(d, res.data); render();
  bookMsg(`<div class="banner ok">Filled in from ${esc(res.sources.join(", "))}. Check the details and save.${dup ? ` <strong>You already have this ISBN: ${esc(dup.title)}${dup.status === "wanted" ? " (on your wishlist)" : ""}.</strong>` : ""}</div>`);
}
async function searchBooks(d, grab) {
  grab();
  const series = String(d.seriesName || "").trim(), vol = String(d.issue || "").trim();
  // no title yet, but series and volume: look the volume up by its number
  const bySeries = !String(d.title || "").trim() && series && /\d/.test(vol) && Books.seriesSearch;
  const q = [d.title, d.author].filter(Boolean).join(" ").trim() || (series ? [series, vol].filter(Boolean).join(" ") : "");
  if (!q) { bookMsg('<div class="banner warn">Type part of the title or the author first, or the series name and volume number.</div>'); $("#f-title").focus(); return; }
  bookMsg('<div class="banner">Searching…</div>');
  let list = bySeries ? await Books.seriesSearch(series, vol, { author: d.author, lang: d.lang }) : [];
  // the libraries don't know the series: an ordinary search with series name, volume and author still often finds it
  if (!list.length) list = await Books.search(bySeries ? [series, vol, d.author].filter(Boolean).join(" ") : q);
  if (!list.length) { bookMsg('<div class="banner warn">Nothing found' + (navigator.onLine ? "" : " (you seem to be offline)") + '. Try fewer or other words.</div>'); return; }
  bookMsg(`<div class="card stack bookhits"><div class="row between"><strong>${list.length} found. Tap your edition:</strong><button class="ghost" id="bhx" type="button">Close</button></div>
    ${list.map((r, i) => `<button class="bookhit" data-hit="${i}" type="button">${r.cover ? `<img src="${esc(r.cover)}" alt="" loading="lazy" onerror="this.remove()">` : '<span class="nocover"></span>'}<span><span class="t">${esc(r.title)}</span><span class="s">${esc([(r.authors || []).join(", "), r.publisher, r.year, r.lang, r.isbn ? "ISBN " + r.isbn : ""].filter(Boolean).join(" · "))}</span></span></button>`).join("")}</div>`);
  $("#bhx").onclick = () => bookMsg("");
  document.querySelectorAll("[data-hit]").forEach(b => b.onclick = async () => {
    const r = list[+b.dataset.hit];
    if (r.isbn) { d.isbn = r.isbn; const full = await Books.lookupIsbn(r.isbn); applyBookData(d, Object.assign({}, r, full.data || {})); }
    else applyBookData(d, r);
    render(); bookMsg('<div class="banner ok">Filled in. Check the details and save.</div>');
  });
}
// a scanned comic: ISBN (pocket books like LTB) -> library record -> series and number;
// magazine barcode -> the series it was saved with before, issue number from the add-on
function seriesFromName(name) {
  const n = norm(name); if (!n) return null;
  return S.series.find(s => norm(s.name) === n || norm(s.short) === n) || S.series.find(s => n.startsWith(norm(s.name)) && norm(s.name).length > 5) || null;
}
// what's typed in a comic's "ISBN or barcode" field: an ISBN, or a magazine barcode with its add-on, given with a space
// ("9772385018901 00026") or run together as one number (15 or 18 digits: 13 + 2 or 13 + 5), as phone scanner apps often give it
function splitCode(raw) {
  const t = String(raw || "").trim(); if (!t) return null;
  if (window.Books && Books.normalize(t) && !/^\d{15}$|^\d{18}$/.test(t.replace(/[\s-]/g, ""))) return { isbn: Books.normalize(t) };
  const g = t.replace(/[^0-9 ]/g, " ").trim().split(/\s+/);
  if (g.length === 2 && /^\d{8,13}$/.test(g[0]) && /^(\d{2}|\d{5})$/.test(g[1])) return { code: g[0], ext: g[1] };
  const j = g.join("");
  if (/^\d{15}$|^\d{18}$/.test(j) && /^(97[789]|41)/.test(j)) return { code: j.slice(0, 13), ext: j.slice(13) };
  if (g.length === 1 && /^\d{8,13}$/.test(j)) return { code: j, ext: "" };
  return null;
}
// the issue number in a barcode add-on: 2 digits, or 5 where the last two are the number (German) or the whole is (Italian 00026, 00126)
const addonNumber = ext => !ext ? 0 : /^00\d{3}$/.test(ext) ? +ext : +ext.slice(-2);
async function comicFromCode(d, code, ext) {
  const isbn = window.Books && Books.normalize(code);
  if (isbn && /^97[89]/.test(code)) {
    const known = S.comics.find(c => c.id !== d.id && c.isbn && Books.normalize(c.isbn) === isbn);
    if (known) {
      d.seriesId = known.seriesId; d.seriesName = known.seriesName; d.issue = known.issueLabel || known.issue; d.isbn = isbn;
      // the comic's own details come along (title, cover, stories …), like "Add another copy"; your copy's fields stay empty
      ["kind", "bookType", "title", "date", "pages", "stories", "coverUrl", "inducks", "duckipedia", "author", "publisher", "format", "lang", "genres"].forEach(k => { if (known[k] !== undefined && known[k] !== "" && !(Array.isArray(d[k]) && d[k].length)) d[k] = known[k]; });
      render(); bookMsg(`<div class="banner warn">You already have this ISBN: ${esc(comicTag(known))}${known.status === "wanted" ? " (on your wishlist)" : ""}. Saving asks what to do with it.</div>`); return; }
    bookMsg('<div class="banner">Looking up ISBN ' + isbn + '…</div>');
    const res = await Books.lookupIsbn(isbn), r = res.data;
    d.isbn = isbn;
    if (!r) { render(); bookMsg(`<div class="banner warn">${res.offline ? "Looking up the ISBN needs an internet connection." : "The library databases don't know ISBN " + isbn + "."} Type a few words of the title into <strong>Find by title</strong> below, or pick the series and number yourself; the ISBN is saved with the comic.${!res.offline && Books.isItalian(isbn) ? ` Italian books are often only in the Italian national library: <a href="${esc(Books.sbnUrl(isbn))}" target="_blank" rel="noopener">Look up in SBN</a>.` : ""}</div>`); return; }
    const se = seriesFromName(r.rawSeries || r.series), vol = String(r.rawVolume || r.volume || "").replace(/^\D+/, "").replace(/\D.*$/, "");
    if (se && vol) {
      d.seriesId = se.id; d.seriesName = se.name; d.issue = vol; render();
      bookMsg(`<div class="banner ok">ISBN ${isbn} is ${esc((se.short || se.name) + " " + vol)}${r.title ? " – " + esc(r.title) : ""}.${catEntry(se) ? " Filling in from INDUCKS…" : ""}</div>`);
      if (catEntry(se)) setTimeout(() => $("#lookup") && $("#lookup").click(), 50);
    } else {
      if (r.title && !d.title) d.title = r.title; render();
      bookMsg(`<div class="banner warn">ISBN ${isbn}: ${esc(r.title || "found")}${r.rawSeries ? " (" + esc(r.rawSeries + (r.rawVolume ? " " + r.rawVolume : "")) + ")" : ""}. That series isn't one of yours yet: pick the series and number, or add the series under Series. If it's a single volume, add it as a <strong>Comic book</strong> instead.</div>`);
    }
    return;
  }
  // magazine barcode
  const map = S.barcodes || {}, sid = map[code];
  d.barcode = code; d.barcodeExt = ext || ""; d.isbn = "";
  const se = sid && seriesById(sid);
  if (!se) {
    // 977 barcodes carry the magazine's ISSN (digits 4–10 plus a check digit)
    const issn = /^977\d{10}$/.test(code) ? (x => { const t = [...x].reduce((a, ch, i) => a + +ch * (8 - i), 0), c = (11 - t % 11) % 11; return x.slice(0, 4) + "-" + x.slice(4) + (c === 10 ? "X" : c); })(code.slice(3, 10)) : "";
    const n0 = addonNumber(ext);
    render();
    bookMsg(`<div class="banner"><div>Barcode ${esc(code)}${ext ? " with add-on " + esc(ext) : ""} isn't known yet${issn ? ` (magazine ISSN <a href="https://portal.issn.org/resource/ISSN/${issn}" target="_blank" rel="noopener">${issn}</a>)` : ""}. Pick its series${n0 ? "" : " and type the number"}, then save: from then on the app recognises this barcode.</div>
      <div class="row" style="gap:8px;margin-top:8px"><button type="button" class="primary" id="bcpick">Pick the series</button></div>
      <div class="small muted" style="margin-top:6px">Not one of your series yet? Add it under More › Series first (Fill from INDUCKS finds its details), then scan again.</div></div>`);
    $("#bcpick") && ($("#bcpick").onclick = async () => {
      const k = await pickSeries({ current: d.seriesId, title: "Series of this magazine" }); if (!k) return;
      const s2 = seriesById(k); if (!s2) return;
      d.seriesId = s2.id; d.seriesName = s2.name; if (n0 && s2.numbering !== "year") d.issue = String(n0);
      render(); bookMsg(`<div class="banner ok">${esc(s2.short || s2.name)}${d.issue ? " " + esc(d.issue) : ""}. ${d.issue ? "" : "Type the number, then "}Save, and next time the barcode is recognised.</div>`);
      if (d.issue && catEntry(s2)) setTimeout(() => $("#lookup") && $("#lookup").click(), 50);
    });
    return;
  }
  d.seriesId = se.id; d.seriesName = se.name;
  const n = addonNumber(ext);
  if (!n) { render(); bookMsg(`<div class="banner ok">That's ${esc(se.short || se.name)}. The add-on with the number wasn't readable; type the number.</div>`); return; }
  if (se.numbering !== "year") { d.issue = String(n); render(); bookMsg(`<div class="banner ok">That's ${esc(se.short || se.name)} ${n}.</div>`); if (catEntry(se)) setTimeout(() => $("#lookup") && $("#lookup").click(), 50); return; }
  // weekly/monthly titles: the barcode has the number and (German magazines) the price, but no year.
  // INDUCKS knows every issue's number and price, so offer the issues that fit, nearest year first.
  const cents = barcodePrice(code), entry = catEntry(se), file = entry && await catalogueFile(entry);
  const anchor = (S.barcodeYears || {})[code] || Math.max(0, ...S.comics.filter(c => c.seriesId === se.id && c.status !== "wanted" && c.issueYear).map(c => c.issueYear)) || new Date().getFullYear();
  let cands = [], priceUsed = false;
  if (file) {
    cands = Object.keys(file.issues).filter(k => { const m = /^(\d{4})(?:\/(\d{1,3})|-(\d{1,3})-(\d{1,3}))$/.exec(k); return m && (+m[2] === n || +m[3] === n || +m[4] === n); });
    const priced = cents ? cands.filter(k => issuePrice(file.issues[k].pr) === cents) : [];
    if (priced.length) { cands = priced; priceUsed = true; }
    cands.sort((a, b) => Math.abs(+a.slice(0, 4) - anchor) - Math.abs(+b.slice(0, 4) - anchor) || b.localeCompare(a));
  }
  const pick = k => { d.issue = k.replace(/^(\d{4})-(\d+)-(\d+)$/, "$1/$2-$3"); render(); bookMsg(`<div class="banner ok">${esc(se.short || se.name)} ${esc(d.issue)}. Filling in from INDUCKS…</div>`); setTimeout(() => $("#lookup") && $("#lookup").click(), 50); };
  if (cands.length === 1) { pick(cands[0]); return; }
  d.issue = anchor + "/" + String(n).padStart(2, "0"); render();
  if (!cands.length) { bookMsg(`<div class="banner ok">That's ${esc(se.short || se.name)}, number ${n}. The barcode doesn't say the year, so the app put in ${anchor}: correct it if needed.</div>`); return; }
  const top = cands.slice(0, 8);
  bookMsg(`<div class="banner ok"><div>That's ${esc(se.short || se.name)} number ${n}${priceUsed ? ", price " + fmt2(cents / 100) + " €" : ""}. The barcode doesn't contain the year; these issues fit${priceUsed ? " (number and price)" : ""}. Tap yours:</div>
    <div class="row" style="gap:6px;margin-top:8px">${top.map(k => `<button type="button" class="chipbtn" data-cand="${esc(k)}">${esc(k.replace(/^(\d{4})-(\d+)-(\d+)$/, "$1/$2-$3"))} · ${esc(niceDate(file.issues[k].d))}</button>`).join("")}</div>
    ${cands.length > top.length ? `<div class="small muted" style="margin-top:6px">${cands.length - top.length} more in other years: type the year if it isn't listed.</div>` : ""}</div>`);
  document.querySelectorAll("[data-cand]").forEach(b => b.onclick = () => pick(b.dataset.cand));
}
// German press barcodes (419 / 414): digits 9–12 are the cover price in cents
function barcodePrice(code) { return /^41[49]\d{10}$/.test(code) ? +code.slice(8, 12) || 0 : 0; }
// INDUCKS prices like "EUR 3,99(in DE)" or "Euro(D) 1,75"; older DM prices don't count
function issuePrice(pr) { const t = String(pr || ""); if (!/eur/i.test(t)) return 0; const m = /(\d+)[.,](\d{2})/.exec(t); return m ? +m[1] * 100 + +m[2] : 0; }
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector('script[src="' + src + '"]')) return res(); const t = document.createElement("script"); t.src = src; t.onload = res; t.onerror = () => rej(new Error("load")); document.head.appendChild(t); }); }
// camera barcode scanner: the browser's own detector if it has one, otherwise ZXing (stored with the app)
// The 2- or 5-digit add-on right of a magazine barcode (EAN-2 / EAN-5), read straight from the
// picture, since the bundled ZXing doesn't return it. canvas: the frame; x0: where the main barcode ends; y: its row.
const ADDON_L = [[3,2,1,1],[2,2,2,1],[2,1,2,2],[1,4,1,1],[1,1,3,2],[1,2,3,1],[1,1,1,4],[1,3,1,2],[1,2,1,3],[3,1,1,2]];
const ADDON_G = ADDON_L.map(p => p.slice().reverse());
const ADDON5_PARITY = ["GGLLL", "GLGLL", "GLLGL", "GLLLG", "LGGLL", "LLGGL", "LLLGG", "LGLGL", "LGLLG", "LLGLG"];
function readAddon(canvas, x0, y) {
  const g = canvas.getContext("2d"), w = canvas.width;
  for (const dy of [0, -6, 6, -12, 12, -20, 20]) {
    const yy = Math.round(y + dy); if (yy < 0 || yy >= canvas.height || x0 >= w - 10) continue;
    const px = g.getImageData(Math.round(x0), yy, w - Math.round(x0), 1).data, lum = [];
    for (let i = 0; i < px.length; i += 4) lum.push(px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11);
    const mn = Math.min(...lum), mx = Math.max(...lum); if (mx - mn < 60) continue;
    const thr = (mn + mx) / 2, runs = [];   // [isBar, length]
    lum.forEach(v => { const bar = v < thr; if (runs.length && runs[runs.length - 1][0] === bar) runs[runs.length - 1][1]++; else runs.push([bar, 1]); });
    for (let s0 = 0; s0 < Math.min(runs.length, 8); s0++) {
      if (!runs[s0][0] || s0 + 3 > runs.length) continue;
      const [a, b2, c] = [runs[s0][1], runs[s0 + 1][1], runs[s0 + 2] && runs[s0 + 2][1]];
      if (!c || !runs[s0 + 2][0]) continue;
      const mod = (a + b2 + c) / 4; if (Math.abs(a - mod) > mod * 0.6 || Math.abs(b2 - mod) > mod * 0.6 || Math.abs(c - 2 * mod) > mod * 0.9) continue;
      for (const n of [5, 2]) {
        let i = s0 + 3, digits = "", par = "", ok = true;
        for (let k = 0; k < n && ok; k++) {
          if (k) { i += 2; }   // separator: one space, one bar
          const r = runs.slice(i, i + 4).map(x => x[1]); if (r.length < 4) { ok = false; break; }
          const sum = r.reduce((x, y) => x + y, 0), sc = r.map(x => x * 7 / sum);
          let best = null;
          [["L", ADDON_L], ["G", ADDON_G]].forEach(([set, pats]) => pats.forEach((pat, dgt) => { const e = pat.reduce((acc, m, j) => acc + (m - sc[j]) ** 2, 0); if (!best || e < best.e) best = { e, dgt, set }; }));
          if (!best || best.e > 1.6) ok = false; else { digits += best.dgt; par += best.set; }
          i += 4;
        }
        if (!ok) continue;
        if (n === 2 && ["LL", "LG", "GL", "GG"][+digits % 4] === par) return digits;
        if (n === 5) { const d = digits.split("").map(Number), chk = (3 * (d[0] + d[2] + d[4]) + 9 * (d[1] + d[3])) % 10; if (ADDON5_PARITY[chk] === par) return digits; }
      }
    }
  }
  return "";
}
// resolves to { code, ext } (ext: the small 2- or 5-digit add-on magazines print next to the barcode), or null
async function scanBarcode(opts) {
  const wantExt = !!(opts && opts.ext);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("nocamera");
  const box = document.createElement("div"); box.className = "scanner";
  box.innerHTML = '<div class="scanframe"><video playsinline muted></video><div class="scanline"></div></div><p>Hold the barcode on the back of the book inside the frame.</p><button class="primary" type="button">Cancel</button>';
  document.body.appendChild(box);
  const video = box.querySelector("video");
  let stream, stop = false;
  const close = () => { stop = true; if (stream) stream.getTracks().forEach(t => t.stop()); box.remove(); };
  return new Promise(async (resolve, reject) => {
    box.querySelector("button").onclick = () => { close(); resolve(null); };
    let firstHit = 0, best = null; const seen = {};
    const done = (code, ext) => {
      // magazines: keep looking briefly for the add-on, which tells the issue number. Its check digit is weak, so one
      // blurry frame can misread it (De Luxe 34 read as another issue): only an add-on read the same in two frames counts
      if (wantExt && !/^97[89]/.test(code)) {
        if (!firstHit) firstHit = Date.now();
        best = best || { code, ext: "" };
        if (ext) { const k = code + " " + ext; seen[k] = (seen[k] || 0) + 1; if (seen[k] >= 2) { close(); resolve({ code, ext }); return true; } }
        if (Date.now() - firstHit < 3000) return false;
        close(); resolve(best); return true;   // no add-on read twice: the number is typed by hand
      }
      close(); resolve({ code, ext: ext || "" }); return true;
    };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      video.srcObject = stream; await video.play();
      let native = null;
      if ("BarcodeDetector" in window && !wantExt) { try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes("ean_13")) native = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a"] }); } catch (e) {} }
      if (native) {
        const tick = async () => { if (stop) return; try { const r = await native.detect(video); const hit = r.find(x => /^97[89]\d{10}$/.test(x.rawValue)) || r[0]; if (hit && done(hit.rawValue)) return; } catch (e) {} setTimeout(tick, 200); };
        tick();
      } else {
        await loadScript("vendor/zxing.min.js");
        const hints = new Map(); hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A]); hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        // read a band across the middle of the picture a few times a second
        const reader = new ZXing.MultiFormatReader(); reader.setHints(hints);
        const canvas = document.createElement("canvas"), g = canvas.getContext("2d", { willReadFrequently: true });
        const tick = () => {
          if (stop) return;
          const w = video.videoWidth, h = video.videoHeight;
          if (w && h) {
            const bw = Math.round(w * 0.9), bh = Math.round(h * 0.45);
            canvas.width = bw; canvas.height = bh;
            g.drawImage(video, (w - bw) / 2, (h - bh) / 2, bw, bh, 0, 0, bw, bh);
            try {
              const r = reader.decode(new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.HTMLCanvasElementLuminanceSource(canvas))));
              if (r) {
                const m = r.getResultMetadata(); let ext = m && m.get(ZXing.ResultMetadataType.UPC_EAN_EXTENSION);
                if (!ext && wantExt) { const pts = r.getResultPoints() || []; if (pts.length) ext = readAddon(canvas, Math.max(...pts.map(q => q.getX())) + 2, pts.reduce((a, q) => a + q.getY(), 0) / pts.length); }
                if (done(r.getText(), ext ? String(ext) : "")) return;
              }
            } catch (e) { /* nothing found in this frame */ }
          }
          setTimeout(tick, 220);
        };
        tick();
      }
    } catch (e) { close(); reject(e); }
  });
}
