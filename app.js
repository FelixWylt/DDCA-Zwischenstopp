
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
const OTHER_GROUP = "Other series", BOOK_GROUP = "Books", DISNEY = "Disney", OTHER_PUB = "Other", BOOK_PUB = "Comic books", NOVEL_PUB = "Books";
// a normal book (novel, non-fiction) as opposed to a comic book like the Carl Barks Collection
const isNovel = c => c.kind === "book" && c.bookType === "book";
const isBookUni = p => p === BOOK_PUB || p === NOVEL_PUB;
// groups that the second CLZ file used for publishers; they move up one level
const PUBLISHER_GROUPS = { "Marvel": "Marvel", "DC": "DC", "Dargaud": "Dargaud", "Dupuis": "Dupuis", "Casterman": "Casterman",
  "Hanna-Barbera": "Hanna-Barbera", "Swedish comics": "Swedish comics", "Other comics": OTHER_PUB };
const FRANCHISE_RULES = [
  [/spider|spindelmannen/, "Spider-Man"], [/x-men|^x:en|mutant/, "X-Men"], [/doctor strange|dr\.? strange/, "Doctor Strange"],
  [/war of the realms/, "War of the Realms"], [/asterix/, "Asterix"], [/lucky luke/, "Lucky Luke"], [/spirou/, "Spirou"],
  [/tintin/, "Tintin"], [/scooby/, "Scooby-Doo"], [/herman hedning/, "Herman Hedning"], [/bamse/, "Bamse"], [/^91:an/, "91:an"],
  [/sandman/, "The Sandman"], [/winnetou/, "Winnetou"], [/^maus$/, "Maus"]
];
function franchiseOf(name) {
  const n = String(name || "").toLowerCase(), r = FRANCHISE_RULES.find(([re]) => re.test(n));
  return r ? r[1] : String(name || "").replace(/\s*\((German|Swedish|English|Italian|Norwegian)\)$/, "") || OTHER_GROUP;
}
const GROUP_RULES = [
  [/^(lustiges taschenbuch|ltb)\b/, "Lustiges Taschenbuch"], [/micky maus/, "Micky Maus"], [/^kalle anka/, "Kalle Anka"],
  [/topolino/, "Topolino"], [/donald duck|entenhausen/, "Donald Duck"], [/^walt disney/, "Walt Disney's"]
];
// ---- arrangement: universe › group (Disney by country and format, the rest by franchise) ----
const UNIVERSES = { "Dargaud": "Franco-Belgian", "Dupuis": "Franco-Belgian", "Casterman": "Franco-Belgian", "Lombard": "Franco-Belgian", "Hanna-Barbera": OTHER_PUB };
const DE_LTB = "Deutschland – Lustiges Taschenbuch", DE_MAG = "Deutschland – Hefte & Magazine", DE_ALB = "Deutschland – Alben & Sammlerbände", DE_TB = "Deutschland – Taschenbücher";
const SE_MAG = "Sverige – Tidningar", SE_POC = "Sverige – Pocket", SE_ALB = "Sverige – Album & böcker";
const IT_ALL = "Italia", NO_ALL = "Norge", CH_ALL = "Schweiz", AT_ALL = "Österreich";
// series that the rules below would place differently
const ARRANGE_IDS = {
  "donald-duck-taschenbuch": DE_TB, "micky-maus-taschenbuch": DE_TB, "mammut-comics": DE_ALB, "x-micky-maus-prasentiert": DE_ALB,
  "x-micky-maus-comics": DE_MAG, "x-panzerknacker-co": DE_TB, "x-die-tollsten-geschichten-von-donald-duck-sonderheft": DE_MAG,
  "x-musiksaga": SE_ALB, "farbror-joakims-liv": SE_ALB, "x-walt-disney-s-godbitar": SE_ALB, "x-walt-disney-s-klassiker": SE_ALB,
  "x-walt-disney-s-serier": SE_MAG, "x-donald-duck-co": NO_ALL, "donald-duck-co-germany": DE_TB
};
const LANG_OF = { de: "German", ger: "German", deu: "German", se: "Swedish", swe: "Swedish", sv: "Swedish", it: "Italian", ita: "Italian", no: "Norwegian", nor: "Norwegian", en: "English", eng: "English", us: "English", gb: "English", fr: "French", fra: "French" };
function seriesLang(se) {
  const c = String(se.country || (se.code || "").split("/")[0] || "").toLowerCase();
  if (LANG_OF[c]) return LANG_OF[c];
  const m = /\((german|germany|swedish|sweden|italian|italy|norwegian|norway|english)\)\s*$/i.exec(se.name || "");
  if (m) return { germany: "German", sweden: "Swedish", italy: "Italian", norway: "Norwegian" }[m[1].toLowerCase()] || m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  const n = norm(se.name);
  if (/\b(lustiges|taschenbuch|micky|maus|entenhausen|tollsten|geschichten|panzerknacker|spezial|sonderheft|sonderband|edition|magazin|zeitung|prasentiert|mammut|ltb|mmm)\b/.test(n)) return "German";
  if (/\b(topolino|paperino|paperone|storie|giornale|almanacco|zio|divertiamoci|piu|belle|novecento|panini)\b/.test(n)) return "Italian";
  if (/[åäö]|c:o/i.test(se.name) || /\b(kalle|anka|farbror|joakim|musse|pigg|bjornligan|stal|ankeborg|samlarpocket|pocket|tidning|julbok|basta|godbitar|klassiker|serier|liv)/.test(n)) return "Swedish";
  const langs = {}; S.comics.forEach(c => { if (c.seriesId === se.id && c.lang) langs[c.lang] = (langs[c.lang] || 0) + 1; });
  return Object.keys(langs).sort((a, b) => langs[b] - langs[a])[0] || "";
}
function arrangeSeries(se) {
  const uni = se.publisher === DISNEY || !se.publisher ? DISNEY : (UNIVERSES[se.publisher] || se.publisher);
  if (uni !== DISNEY) return { publisher: uni, group: se.group || franchiseOf(se.name) };
  if (ARRANGE_IDS[se.id]) return { publisher: DISNEY, group: ARRANGE_IDS[se.id] };
  const n = norm(se.name), lang = seriesLang(se);
  const cc = String(se.country || (se.code || "").split("/")[0] || "").toLowerCase();
  if (cc === "ch") return { publisher: DISNEY, group: CH_ALL };   // Swiss (Bollmann's Micky Maus Zeitung) and Austrian editions aren't German ones
  if (cc === "at") return { publisher: DISNEY, group: AT_ALL };
  if (lang === "German") return { publisher: DISNEY, group: /^(lustiges taschenbuch|ltb)\b|\bltb\b/.test(n) ? DE_LTB : /taschenb|^panzerknacker|^donald duck (co|und co)\b/.test(n) || ["de/DD", "de/PK", "de/DDCO"].includes(se.code) ? DE_TB : /\b(edition|sammler|album|alben|hardcover|klassik|bibliothek|collection|bande?)\b/.test(n) ? DE_ALB : DE_MAG };
  if (lang === "Swedish") return { publisher: DISNEY, group: /pocket/.test(n) || n === "farbror joakim" || /^bjornligan\b/.test(n) ? SE_POC : /\b(julbok|basta|godbitar|klassiker|bok|bocker|album|liv|saga|samlade|guldbok)\b/.test(n) ? SE_ALB : SE_MAG };
  if (lang === "Italian") return { publisher: DISNEY, group: IT_ALL };
  if (lang === "Norwegian") return { publisher: DISNEY, group: NO_ALL };
  return { publisher: DISNEY, group: lang ? lang : OTHER_GROUP };
}
// a comic's genres from its stories (Duckipedia: Abenteuer, Komik, Krimi ...), in the app's genre names
// in a comic, "Komödie" or "Gag" is humour, not a stage play
function storyGenres(c) {
  if (!(window.Books && Books.oneGenre)) return "";
  const g = (c.stories || []).map(s => s.genre).filter(Boolean).join(", ")
    .replace(/\b(komödie|komödien|komik|gags?|slapstick|parodie|satire|witz|humoreske|comedy)\b/gi, "Humour").replace(/\b(schatzsuche|expedition|reise)\b/gi, "Adventure");
  return Books.oneGenre(g, true);
}
// the usual format of a series' issues, from its group, name or size: LTB and pockets are Taschenbuch / Pocket, magazines are Heft
function seriesFormat(se) {
  if (!se) return "";
  const n = norm(se.name), f = norm(se.format), g = se.group || "";
  if (/hardcover|gebunden|inbunden|\bhc\b/.test(n + " " + f)) return "Hardcover";
  if (g === DE_LTB || g === DE_TB || g === SE_POC || /taschenbuch|\bpocket\b|\bltb\b|^topolino\b/.test(n)) return "Taschenbuch / Pocket";
  if (g === DE_MAG || g === SE_MAG || /\b(magazin|zeitung|heft|hefte|tidning|tidningen)\b/.test(n) || ["kalle anka c o", "kalle anka co", "micky maus", "micky maus magazin"].includes(n)) return "Heft";
  if (/\balbum|alben\b/.test(n)) return "Album";
  return "";
}
const NEW_GROUPS = [DE_LTB, DE_TB, DE_MAG, DE_ALB, SE_MAG, SE_POC, SE_ALB, IT_ALL, NO_ALL, CH_ALL, AT_ALL];
// the new arrangement is in use once any Disney series sits in one of its groups
function arrangedInUse() { return S.series.some(se => se.publisher === DISNEY && NEW_GROUPS.includes(se.group)); }
// series still arranged the old way (by publisher, or Disney groups by character)
function arrangePending() { return S.series.filter(se => UNIVERSES[se.publisher] || (se.publisher === DISNEY && !NEW_GROUPS.includes(se.group) && arrangeSeries(se).group !== se.group)); }
function guessGroup(name) { const n = String(name || "").toLowerCase(); const r = GROUP_RULES.find(([re]) => re.test(n)); return r ? r[1] : OTHER_GROUP; }
const GRADES = [
  ["0", "Z0 · as new"], ["0-1", "Z0-1"], ["1", "Z1 · very good"], ["1-2", "Z1-2"], ["2", "Z2 · good"],
  ["2-3", "Z2-3"], ["3", "Z3 · worn"], ["3-4", "Z3-4"], ["4", "Z4 · poor"], ["4-5", "Z4-5"], ["5", "Z5 · very poor"]
];
const CURRENCIES = ["CHF", "EUR", "SEK"];
// ---------- state ----------
const S = {
  db: null, dbState: "loading", series: DEFAULT_SERIES.slice(), seriesSaved: false,
  comics: [], coverObj: {}, coverHas: {}, storyRatings: {}, view: "collection", filters: { q: "", status: "owned" }, shown: 200, col: {},
  editing: null, draft: null, gapSeries: DEFAULT_SERIES[0].id, catalogue: null, catCache: {},
  confirmDelete: false
};

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// ---- collection value: price ranges per series (for condition Z1), adjusted by condition; checked sold prices win ----
const GRADE_FACTOR_DEFAULT = { "0": 1.5, "0-1": 1.25, "1": 1, "1-2": 0.8, "2": 0.6, "2-3": 0.45, "3": 0.3, "3-4": 0.2, "4": 0.1, "4-5": 0.07, "5": 0.05, "": 0.6 };
const FACSIMILE_FACTOR = 0.3;
const gradeFactor = g => { const f = Object.assign({}, GRADE_FACTOR_DEFAULT, S.gradeFactors || {}); return f[g || ""] != null ? +f[g || ""] : 0.6; };
const valueKeyOf = c => c.kind === "book" ? (c.seriesName ? "book:" + c.seriesName : "") : c.seriesId || "";
function valueNumber(c) {   // the number a price range is compared with: issue number; year × 1000 + issue for yearly series; volume for books
  if (c.kind === "book") return parseFloat(String(c.issue || "").replace(",", ".")) || null;
  const se = seriesById(c.seriesId), lab = String(c.issueLabel || c.issue || "");
  if (se && se.numbering === "year") {
    const y = c.issueYear || +((/^(\d{4})/.exec(lab) || [])[1]) || null; if (!y) return null;
    const n = c.issueNum || +((/^\d{4}\D+(\d{1,3})/.exec(lab) || [])[1]) || 0;
    return y * 1000 + n;
  }
  return c.issueNum || parseInt(lab, 10) || null;
}
// a range's "from" or "to" as a number: "1952/4" or "4/1952" is year 1952 issue 4; a year alone is all of that year
function rangeBound(key, v, isTo) {
  const t = String(v == null ? "" : v).trim(); if (!t) return NaN;
  const se = seriesById(key);
  if (se && se.numbering === "year") {
    let m = /^(\d{4})\s*[\/.:-]\s*(?:nr\.?\s*)?(\d{1,3})$/i.exec(t); if (m) return +m[1] * 1000 + +m[2];
    m = /^(\d{1,3})\s*[\/.]\s*(\d{4})$/.exec(t); if (m) return +m[2] * 1000 + +m[1];
    m = /^(\d{4})$/.exec(t); if (m) return +m[1] * 1000 + (isTo ? 999 : 0);
    return NaN;
  }
  return parseInt(t, 10);
}
function valueRuleFor(c) {
  const k = valueKeyOf(c); if (!k) return null;
  const n = valueNumber(c), rules = (S.valueRules || []).filter(r => r.s === k && typeof r.price === "number");
  const fits = rules.filter(r => { const a = rangeBound(k, r.from), b = rangeBound(k, r.to, true); if (isNaN(a) && isNaN(b)) return true; if (n == null) return false; return (isNaN(a) || n >= a) && (isNaN(b) || n <= b); });
  const width = r => { const a = rangeBound(k, r.from), b = rangeBound(k, r.to, true); return isNaN(a) || isNaN(b) ? 1e9 : b - a; };
  return fits.sort((x, y) => width(x) - width(y))[0] || null;   // the narrowest range wins
}
function valueOf(c) {
  if (typeof c.valueChecked === "number") return { amount: c.valueChecked, cur: c.valueCur || c.currency || "CHF", how: "checked" };
  const r = valueRuleFor(c);
  if (r) return { amount: Math.round(r.price * gradeFactor(c.grade) * (c.facsimile ? FACSIMILE_FACTOR : 1) * 100) / 100, cur: r.cur || "CHF", how: "table", rule: r };
  if (typeof c.value === "number") return { amount: c.value, cur: c.currency || "CHF", how: "estimate" };
  return null;
}
// searches for finished sales of this comic or book on the marketplaces
function soldLinks(c) {   // books only: single comic issues rarely sell on their own, so a search found nothing useful
  if (c.kind !== "book") return "";
  const e = encodeURIComponent([c.title, splitPeople(c.author)[0]].filter(Boolean).join(" "));
  return [["eBay (sold)", `https://www.ebay.de/sch/i.html?_nkw=${e}&LH_Sold=1&LH_Complete=1`], ["Tradera", `https://www.tradera.com/search?q=${e}`], ["Ricardo", `https://www.ricardo.ch/de/s/${e}`]]
    .map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(" · ");
}
// where to read collector prices: Comicguide.de (German and other series) or the Seriesam guide (Swedish), opened in the browser
function collectorName(key) { const se = seriesById(key); return String(key || "").startsWith("book:") ? key.slice(5) : se ? String(se.name).replace(/\s*\([^)]*\)\s*$/, "") : ""; }
function collectorLinks(key, c) {
  const se = seriesById(key), nm = collectorName(key); if (!nm) return "";
  const lang = se ? seriesLang(se) : "", L = [];
  const a = (u, n, note) => L.push(`<a href="${u}" target="_blank" rel="noopener">${n}</a>${note ? ` <span class="muted">(${note})</span>` : ""}`);
  // Seriekatalogen names its pages after the series: "Kalle Anka & C:o" -> /magazine/kalle-anka-och-co
  const skSlug = String(nm).toLowerCase().replace(/[:'’.]/g, "").replace(/&/g, " och ").replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/[éè]/g, "e").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (lang === "Swedish" || !lang) {
    a(`https://www.seriesam.com/cgi-bin/guide?s=${encodeURIComponent(nm.split(/\s+/).slice(0, 2).join(" ").toUpperCase())}&covers=ON`, "Seriesam guide", "shop price; between collectors about half");
    a(`https://www.seriekatalogen.se/magazine/${skSlug}`, "Seriekatalogen");
  }
  if (lang === "Italian") {   // Italian dealers sell single issues with uniform titles ("TOPOLINO libretto n. 1862"), so sold listings are a fair guide
    const num = c ? String(c.issueLabel || c.issue || "").replace(/^0+/, "") : "";
    a(`https://www.ebay.it/sch/i.html?_nkw=${encodeURIComponent((nm + " " + num).trim())}&LH_Sold=1&LH_Complete=1`, "eBay.it (sold)");
  }
  if (lang !== "Swedish" && lang !== "Italian") a(`https://www.comicguide.de/search?search=${encodeURIComponent(nm)}`, "Comicguide.de");
  return L.join(" · ");
}
// the price ranges of one series, edited in the Series tab (saved as you type)
function valueRulesHtml(key) {
  if (!key) return "";
  const rows = (S.valueRules || []).filter(r => r.s === key);
  const cur = r => CURRENCIES.map(x => `<option${(r.cur || "CHF") === x ? " selected" : ""}>${x}</option>`).join("");
  const nm = collectorName(key), src = collectorLinks(key), se = seriesById(key), yearly = se && se.numbering === "year";
  const im = yearly ? 'inputmode="text"' : 'inputmode="numeric"';
  const defCur = (rows[0] && rows[0].cur) || (se && seriesLang(se) === "Swedish" ? "SEK" : se && seriesLang(se) === "German" ? "EUR" : "CHF");
  return `<div class="wide valrules"><span class="l">Value per issue (condition Z1)</span>
    ${nm ? `<span class="small muted">Collector prices: ${src}. Copy the price list there and paste it below, or note a few prices and make ranges.</span>` : ""}
    ${rows.map(r => `<div class="vrow" data-vid="${esc(r.id)}"><input data-vf="from" ${im} placeholder="${yearly ? "1952/4" : "from"}" value="${esc(r.from || "")}" aria-label="From"><input data-vf="to" ${im} placeholder="${yearly ? "1952/12" : "to"}" value="${esc(r.to || "")}" aria-label="To"><input data-vf="price" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(r.price))}" aria-label="Price"><select data-vf="cur" aria-label="Currency">${cur(r)}</select><button type="button" class="ghost tiny" data-vdel="${esc(r.id)}" aria-label="Remove">✕</button><input data-vf="note" class="vnote" placeholder="where from, e.g. eBay sold, Oct 2026" value="${esc(r.note || "")}"></div>`).join("")}
    <div class="row" style="gap:8px;align-items:center"><button type="button" class="ghost" data-vadd="${esc(key)}">Add a price range</button><span class="small muted">${key.startsWith("book:") ? "From/to are volume numbers." : yearly ? "From/to are a year (all its issues) or year/issue, e.g. 1952/4." : "From/to are issue numbers."} Empty = all. The narrowest range wins.</span></div>
    <details class="pastebox" data-pk="${esc(key)}"><summary class="small"><strong>Paste prices or type several ranges</strong></summary>
      <div class="stack" style="margin-top:8px">
        <p class="small muted" style="margin:0">Paste a list copied from Comicguide.de (Zustand 1) or Seriekatalogen.se (the VF column is taken as Z1). Or type ranges, separated by commas: <span class="mono">${yearly ? "1951 800, 1952/1 450, 1952/4-1953/1 150" : "1-25 8, 26-80 5, 81- 3"}</span></p>
        <textarea data-ptext rows="5" placeholder="Paste or type here"></textarea>
        <div class="row" style="gap:8px;align-items:center"><button type="button" data-pread>Read prices</button><label class="small">Currency if none is given <select data-pcur>${CURRENCIES.map(x => `<option${x === defCur ? " selected" : ""}>${x}</option>`).join("")}</select></label></div>
        <div data-pout></div>
      </div></details></div>`;
}
// ---- reading pasted price lists into price ranges ----
// Comicguide: "1952: Nr. 4 150.00 €" (Zustand 1; reprints "(1. Nachdruck)" are skipped)
// Seriekatalogen: "1949 2 650 1300 2000 5000 10000" = year, issue, G VG FN VF NM; VF counts as Z1
// typed: "1-25 8, 26-80 5" or "1952/4-1953/1 150"
function priceAmount(t) { const n = parseAmt(t); return n === "" ? null : n; }
function priceCur(t, fallback) { return /€|eur/i.test(t) ? "EUR" : /\bkr\b|sek/i.test(t) ? "SEK" : /chf|fr\./i.test(t) ? "CHF" : fallback; }
function parsePrices(key, text, fallbackCur) {
  const se = seriesById(key), yearly = !!(se && se.numbering === "year");
  const at = (y, n) => yearly ? (y || 0) * 1000 + (n || 0) : n;
  const items = [], skipped = [], unread = [];
  let reprints = 0, kind = "";
  const lines = String(text || "").split(/\r?\n/).map(l => l.replace(/ /g, " ").trim()).filter(Boolean);
  lines.forEach(line => {
    // Comicguide
    let m = /^(?:(\d{4})\s*:\s*)?Nr\.?\s*(\d{1,4})\s*(?:-\s*(\d{1,4}))?\s*(\(.*?\))?\s*([\d.,]+)\s*(€|EUR)?\s*$/i.exec(line);
    if (m) {
      kind = kind || "Comicguide";
      if (m[4]) { reprints++; return; }
      const y = m[1] ? +m[1] : null, a = +m[2], b = m[3] ? +m[3] : a, p = priceAmount(m[5]);
      if (yearly && !y) { unread.push(line); return; }
      if (p == null) { unread.push(line); return; }
      items.push({ lo: at(y, a), hi: at(y, b), price: p, cur: m[6] || /€/.test(line) ? "EUR" : fallbackCur }); return;
    }
    // Seriekatalogen: year (or nothing), issue or issue range, then five prices
    const sk = /^(?:(\d{4})\s+)?(\d{1,4})(?:\s*-\s*(\d{1,4}))?((?:\s+\d+){5})\s*$/.exec(line);
    if (sk) {
      kind = kind || "Seriekatalogen";
      const nums = sk[4].trim().split(/\s+/).map(Number), y = sk[1] ? +sk[1] : null, a = +sk[2], b = sk[3] ? +sk[3] : a;
      if (yearly && !y) { unread.push(line); return; }
      items.push({ lo: at(y, a), hi: at(y, b), price: nums[3], cur: "SEK" }); return;
    }
    // typed ranges, several per line
    let any = false;
    line.split(/[,;]/).map(x => x.trim()).filter(Boolean).forEach(part => {
      const B = yearly ? "(\\d{4}(?:\\s*\\/\\s*\\d{1,3})?)" : "(\\d{1,5})";
      const r = new RegExp("^" + B + "?\\s*([-–])?\\s*" + B + "?\\s*[:=→>]?\\s+([\\d.,]+)\\s*(€|eur|kr|sek|chf|fr\\.?)?$", "i").exec(part);
      if (!r || (!r[1] && !r[3])) { skipped.push(part); return; }
      const p = priceAmount(r[4]); if (p == null) { skipped.push(part); return; }
      const lo = r[1] ? rangeBound(key, r[1].replace(/\s+/g, "")) : NaN, hi0 = r[3] ? rangeBound(key, r[3].replace(/\s+/g, ""), true) : NaN;
      const hi = r[2] ? hi0 : r[1] ? rangeBound(key, r[1].replace(/\s+/g, ""), true) : hi0;
      items.push({ lo: isNaN(lo) ? null : lo, hi: isNaN(hi) ? null : hi, price: p, cur: r[5] ? priceCur(r[5], fallbackCur) : fallbackCur, typed: true }); any = true;
    });
    if (any) kind = kind || "typed";
  });
  // a pasted list: neighbouring issues with the same price become one range; typed ranges stay as typed
  const listed = items.filter(x => !x.typed).sort((a, b) => a.lo - b.lo), ranges = [];
  listed.forEach(x => {
    const last = ranges[ranges.length - 1];
    if (last && last.price === x.price && last.cur === x.cur) last.hi = Math.max(last.hi, x.hi); else ranges.push(Object.assign({}, x));
  });
  items.filter(x => x.typed).forEach(x => ranges.push(x));
  // from a pasted list, lines with a price that couldn't be placed (e.g. "(Nullnummer) 9000.00 €") are listed for you
  if (kind && kind !== "typed") skipped.filter(x => /€|\d[.,]\d\d\b/.test(x)).forEach(x => unread.push(x));
  return { ranges, kind, reprints, unread, skipped: kind === "typed" ? skipped : [], issues: listed.length };
}
function boundText(key, v, isTo) {
  if (v == null) return "";
  const se = seriesById(key);
  if (se && se.numbering === "year") { const y = Math.floor(v / 1000), n = v % 1000; return n === 0 && !isTo ? String(y) : n === 999 ? String(y) : y + "/" + n; }
  return String(v);
}
function bindPasteBox(root) {
  (root || document).querySelectorAll("details.pastebox").forEach(d => {
    const key = d.dataset.pk, out = d.querySelector("[data-pout]");
    d.querySelector("[data-pread]").onclick = () => {
      const res = parsePrices(key, d.querySelector("[data-ptext]").value, d.querySelector("[data-pcur]").value);
      if (!res.ranges.length) { out.innerHTML = '<div class="banner warn small">No prices found. Paste the lines with issue numbers and prices, or type ranges like 1-25 8.</div>'; return; }
      const have = (S.valueRules || []).filter(r => r.s === key).length;
      const span = r => { const a = r.lo == null ? "" : boundText(key, r.lo), z = r.hi == null ? "" : boundText(key, r.hi, true); return !a ? "all up to " + z : !z ? a + " and later" : a === z ? a : a + " – " + z; };
      const line = r => `<li>${esc(span(r))} → ${esc(money(r.price, r.cur))}</li>`;
      const notes = [res.kind && res.kind !== "typed" ? `Read as a ${res.kind} list: ${res.issues} issues${res.kind === "Seriekatalogen" ? ", VF prices" : ""}` : "", res.reprints ? res.reprints + " reprints skipped" : ""].filter(Boolean).join(" · ");
      const left = res.unread.concat(res.skipped);
      out.innerHTML = `<div class="stack small" style="gap:6px">
        <strong>${res.ranges.length} ${res.ranges.length === 1 ? "range" : "ranges"} found</strong>${notes ? `<span class="muted">${esc(notes)}</span>` : ""}
        <ul class="pranges">${res.ranges.slice(0, 60).map(line).join("")}${res.ranges.length > 60 ? `<li class="muted">… and ${res.ranges.length - 60} more</li>` : ""}</ul>
        ${left.length ? `<details><summary>${left.length} ${left.length === 1 ? "line" : "lines"} not added (enter these yourself if needed)</summary><ul>${left.slice(0, 30).map(x => `<li class="mono">${esc(x)}</li>`).join("")}</ul></details>` : ""}
        ${have ? `<label class="check" style="min-height:0"><input type="checkbox" data-preplace> Remove the ${have} current ${have === 1 ? "range" : "ranges"} of this series first</label>` : ""}
        <div class="row"><button type="button" class="primary" data-padd>Add ${res.ranges.length} ${res.ranges.length === 1 ? "range" : "ranges"}</button></div></div>`;
      out.querySelector("[data-padd]").onclick = () => {
        const rep = out.querySelector("[data-preplace]"), keep = rep && rep.checked ? (S.valueRules || []).filter(r => r.s !== key) : (S.valueRules || []);
        S.valueRules = keep.concat(res.ranges.map(r => ({ id: newId(), s: key, from: r.lo == null ? "" : boundText(key, r.lo), to: r.hi == null ? "" : boundText(key, r.hi, true), price: r.price, cur: r.cur, note: res.kind && res.kind !== "typed" ? res.kind : "" })));
        setConfig("valueRules", S.valueRules).catch(() => {});
        toast(res.ranges.length + (res.ranges.length === 1 ? " price range added" : " price ranges added")); renderKeep();
      };
    };
  });
}
function bindValueRules(root) {
  const save = () => setConfig("valueRules", S.valueRules || []).catch(() => {});
  (root || document).querySelectorAll(".vrow").forEach(row => row.querySelectorAll("[data-vf]").forEach(inp => inp.onchange = () => {
    const r = (S.valueRules || []).find(x => x.id === row.dataset.vid); if (!r) return;
    const k = inp.dataset.vf; r[k] = k === "price" ? parseAmt(inp.value) : inp.value.trim(); save();
  }));
  (root || document).querySelectorAll("[data-vadd]").forEach(b => b.onclick = () => { S.valueRules = (S.valueRules || []).concat([{ id: newId(), s: b.dataset.vadd, from: "", to: "", price: "", cur: "CHF", note: "" }]); save(); renderKeep(); });
  (root || document).querySelectorAll("[data-vdel]").forEach(b => b.onclick = () => { S.valueRules = (S.valueRules || []).filter(r => r.id !== b.dataset.vdel); save(); renderKeep(); });
  bindPasteBox(root);
}
// value of the owned entries of a list, in CHF (for folders in Collection)
function valueChf(list) {
  let t = 0, n = 0;
  list.forEach(c => { if (c.status === "wanted") return; const v = valueOf(c); if (v) { t += toCHF(v.amount * (c.copies || 1), v.cur); n++; } });
  return n ? t : null;
}
function valueTag(list) { const t = valueChf(list); return t == null ? "" : "≈ CHF " + Math.round(t).toLocaleString("de-CH"); }
// ---- exchange rates to CHF: the ECB's daily rates through frankfurter.dev (free, no account), refreshed weekly; editable in Stats ----
const RATE_DEFAULT = { EUR: 0.94, SEK: 0.084 };   // CHF per unit, only until the first refresh
const rateOf = cur => cur === "CHF" || !cur ? 1 : +((S.rates || {})[cur]) || RATE_DEFAULT[cur] || 0;
const toCHF = (amount, cur) => (+amount || 0) * rateOf(cur || "CHF");
async function refreshRates(force) {
  const r = S.rates || {};
  if (!force && (S.ratesTried || r.manual || (r.date && Date.now() - new Date(r.date) < 7 * 864e5) || !navigator.onLine)) return;
  S.ratesTried = true;
  try {
    const j = await (await fetch("https://api.frankfurter.dev/v1/latest?base=CHF&symbols=EUR,SEK")).json();
    if (j && j.rates && j.rates.EUR) {
      S.rates = { EUR: Math.round(1 / j.rates.EUR * 10000) / 10000, SEK: Math.round(1 / j.rates.SEK * 100000) / 100000, date: j.date, source: "ECB via frankfurter.dev" };
      await setConfig("rates", S.rates); if (S.view === "stats") renderKeep();
    }
  } catch (e) {}
}
// Stats card: value per currency, how sure it is, the comics most worth checking
// condition factors and exchange rates, shared by comics and books
function valueSettingsHtml() {
  const fx = Object.assign({}, GRADE_FACTOR_DEFAULT, S.gradeFactors || {});
  return `<details class="small"><summary>Condition factors</summary><div class="gfactors">${GRADES.map(([g, l]) => `<label><span class="l">${esc(l.split(" ")[0])}</span><input data-gf2="${g}" inputmode="decimal" value="${fx[g]}"></label>`).join("")}<label><span class="l">Not graded</span><input data-gf2="" inputmode="decimal" value="${fx[""]}"></label></div>
    <p class="muted" style="margin:4px 0 0">The price ranges are for Z1; other conditions are multiplied by these. Facsimiles count ${FACSIMILE_FACTOR * 100}%.</p></details>
    <details class="small"><summary>Exchange rates</summary><div class="gfactors"><label><span class="l">CHF per EUR</span><input data-rate="EUR" inputmode="decimal" value="${rateOf("EUR")}"></label><label><span class="l">CHF per SEK</span><input data-rate="SEK" inputmode="decimal" value="${rateOf("SEK")}"></label></div>
      <div class="row" style="margin-top:6px"><button type="button" class="ghost" id="rateauto">Use today's ECB rates</button></div><p class="muted" style="margin:4px 0 0">Changing a rate keeps your own rates until you tap the button.</p></details>`;
}
function valueCard(own, title, withSettings) {
  const per = {}, list = []; let none = 0;
  own.forEach(c => { const v = valueOf(c); if (!v) { none++; return; } const n = c.copies || 1, x = per[v.cur] = per[v.cur] || { checked: 0, table: 0, estimate: 0 }; x[v.how] += v.amount * n; list.push({ c, v, total: v.amount * n }); });
  const curs = Object.keys(per).sort();
  const factors = withSettings ? valueSettingsHtml() : "";
  if (!curs.length) return `<div class="card stack"><h3>${esc(title || "Collection value")}</h3><p class="small muted" style="margin:0">No values yet. Add price ranges to your series in the Series tab (open a series › Value per issue), using sold prices from eBay, Tradera or Ricardo. Books also have links to their sold listings.</p>${factors}</div>`;
  // compared in CHF, so 50 CHF ranks above 150 SEK
  const top = list.sort((a, b) => toCHF(b.total, b.v.cur) - toCHF(a.total, a.v.cur)).slice(0, 20);
  // everything in CHF: value, range, and what you paid
  let lik = 0, lo = 0, hi = 0, paid = 0, paidN = 0, paidOfValued = 0;
  curs.forEach(k => { const x = per[k], f = rateOf(k); lik += (x.checked + x.table + x.estimate) * f; lo += (x.checked * 0.9 + (x.table + x.estimate) * 0.6) * f; hi += (x.checked * 1.1 + (x.table + x.estimate) * 1.4) * f; });
  own.forEach(c => { if (typeof c.pricePaid === "number") { const p = toCHF(c.pricePaid * (c.copies || 1), c.currency); paid += p; paidN++; if (valueOf(c)) paidOfValued += p; } });
  const r = S.rates || {}, diff = lik - paidOfValued;
  const chf = `<div class="row" style="gap:24px;flex-wrap:wrap"><div><div class="v2">CHF ${fmt2(lik)}</div><div class="k small muted">likely value · range ${fmt2(lo)}–${fmt2(hi)}</div></div>
    <div><div class="v2">CHF ${fmt2(paid)}</div><div class="k small muted">paid for ${paidN} of ${own.length.toLocaleString("de-CH")}</div></div>
    ${paidOfValued ? `<div><div class="v2">${diff >= 0 ? "+" : "−"} CHF ${fmt2(Math.abs(diff))}</div><div class="k small muted">value minus price paid, for comics with both</div></div>` : ""}</div>
    <p class="small muted" style="margin:0">Converted to CHF: 1 EUR = ${fmt2(rateOf("EUR")).replace(/0$/, "")} · 1 SEK = ${rateOf("SEK").toFixed(4)} ${r.date ? "(" + (r.manual ? "your rates" : "ECB rate of " + niceDate(r.date)) + ")" : "(approximate; updated when online)"}.</p>`;
  const how = { checked: "checked", table: "table", estimate: "own estimate" };
  return `<div class="card stack"><div class="cardhead"><h3>${esc(title || "Collection value")}</h3><span class="muted small">in CHF, details per currency below</span></div>
    ${chf}
    <div class="tablewrap"><table class="moneytab"><thead><tr><th></th><th>Likely</th><th>Range</th><th>Checked</th><th>Table</th><th>Own est.</th></tr></thead><tbody>${curs.map(k => { const x = per[k], t = x.checked + x.table + x.estimate, lo = x.checked * 0.9 + (x.table + x.estimate) * 0.6, hi = x.checked * 1.1 + (x.table + x.estimate) * 1.4;
      return `<tr><td>${k}</td><td><strong>${fmt2(t)}</strong></td><td>${fmt2(lo)}–${fmt2(hi)}</td><td>${fmt2(x.checked)}</td><td>${fmt2(x.table)}</td><td>${fmt2(x.estimate)}</td></tr>`; }).join("")}</tbody></table></div>
    <p class="small muted" style="margin:0">${list.length} of ${own.length.toLocaleString("de-CH")} have a value${none ? ", " + none + " none yet" : ""}. The range allows ±10% for checked prices and −40%/+40% for table values and own estimates. Dealers usually pay well below these values.</p>
    <div class="small"><strong>Most valuable: check these first</strong><ol class="toplist">${top.map(({ c, v, total }) => { const nm = c.kind === "book" ? c.title || "Untitled" : comicTag(c); return `<li><button class="link" data-open="${esc(c.id)}" title="${esc(nm)}">${esc(nm)}</button><span class="muted">${money(total, v.cur)}${v.cur && v.cur !== "CHF" ? " (≈ CHF " + Math.round(toCHF(total, v.cur)).toLocaleString("de-CH") + ")" : ""} · ${how[v.how]}</span></li>`; }).join("")}</ol></div>
    ${factors}</div>`;
}
// ---- favourites and half-star ratings (0.5–5) ----
function starsHtml(v, attr) {
  v = +v || 0; let h = "";
  for (let k = 1; k <= 5; k++) { const cls = v >= k ? "full" : v >= k - 0.5 ? "half" : ""; h += `<span class="star ${cls}"><button type="button" data-half="${k - 0.5}" aria-label="${k - 0.5} stars"></button><button type="button" data-half="${k}" aria-label="${k} stars"></button></span>`; }
  return `<span class="stars" ${attr || ""} data-v="${v}" role="group" aria-label="Rating">${h}</span>`;
}
function bindStars(root, onSet) {
  (root || document).querySelectorAll(".stars").forEach(box => box.querySelectorAll("[data-half]").forEach(b => b.onclick = e => {
    e.stopPropagation(); const v = +b.dataset.half, nv = +box.dataset.v === v ? 0 : v;   // tapping the same value again clears it
    box.dataset.v = nv; box.querySelectorAll(".star").forEach((st, i) => { st.className = "star " + (nv >= i + 1 ? "full" : nv >= i + 0.5 ? "half" : ""); });
    onSet(nv, box);
  }));
}
const heartHtml = (on, attr) => `<button type="button" class="heart${on ? " on" : ""}" ${attr || ""} aria-pressed="${on ? "true" : "false"}" title="Favourite">${on ? "♥" : "♡"}</button>`;
const ratingTxt = v => v ? "★ " + String(v).replace(".", ",") : "";
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600); }
function seriesById(id) { return S.series.find(s => s.id === id); }
function parseIssue(series, raw) {
  const s = String(raw || "").trim();
  if (series && series.numbering === "year") {
    // double issues: "2016/11-12", "2016 11+12", "11-12/2016" -> "2016-11-12", the INDUCKS form
    let dd = s.match(/(\d{4})\D+?(\d{1,3})\s*[-+&]\s*(\d{1,3})(?!\d)/), dr = !dd && s.match(/^\D*(\d{1,3})\s*[-+&]\s*(\d{1,3})\D+(\d{4})(?!\d)/);
    if (dr) dd = [dr[0], dr[3], dr[1], dr[2]];
    if (dd && +dd[3] > +dd[2] && +dd[3] - +dd[2] <= 2) {
      const pad = x => String(+x).padStart(2, "0");
      return { year: +dd[1], n: +dd[2], sort: +dd[1] * 1000 + +dd[2], label: dd[1] + "-" + pad(dd[2]) + "-" + pad(dd[3]) };
    }
    // variants: "1984/19A", "1984/19 B" -> "1984-19A", the INDUCKS form
    const vy = s.match(/(\d{4})\D+?(\d{1,3})\s*([A-Za-z])(?![A-Za-z])/);
    if (vy) { const L = vy[3].toUpperCase(); return { year: +vy[1], n: +vy[2], sort: +vy[1] * 1000 + +vy[2] + (L.charCodeAt(0) - 64) / 100, label: vy[1] + "-" + String(+vy[2]).padStart(2, "0") + L }; }
    let m = s.match(/(\d{4})\D+(\d{1,3})(?!\d)/);
    const r = !m && s.match(/^\D*(\d{1,3})\D+(\d{4})(?!\d)/);
    if (r) m = [r[0], r[2], r[1]];
    if (m) return { year: +m[1], n: +m[2], sort: +m[1] * 1000 + +m[2], label: m[1] + "/" + String(+m[2]).padStart(2, "0") };
  }
  // test issues: "T4", "Test 4", "Testausgabe 4", "Probeheft 4" -> "T4" (INDUCKS de/DD has test issues 1974 besides the regular 1-4)
  const tm = /^\s*(?:t|test|testausgabe|testheft|probe|probeheft|probenummer)\s*[-.:#]?\s*0*(\d{1,3})\s*$/i.exec(s);
  if (tm) return { n: +tm[1], sort: +tm[1] / 100 - 1, label: "T" + +tm[1] };
  // variants: "546A", "LTB 546 b", "546-B" -> "546A"
  const pv = !(series && series.numbering === "year") && /^[A-Za-zÄÖÜäöüß.:#\s-]*?0*(\d{1,5})\s*[-\/]?\s*([A-Za-z])\s*$/.exec(s);
  if (pv) {
    const L = pv[2].toUpperCase(); return { n: +pv[1], sort: +pv[1] + (L.charCodeAt(0) - 64) / 100, label: pv[1].replace(/^0+(?=\d)/, "") + L };
  }
  const plain = /^[A-Za-zÄÖÜäöüß.:#\s-]*?0*(\d{1,5})\s*\.?$/.exec(s);   // "LTB 480", "Nr. 481", "#482", "0482"
  if (plain && !(series && series.numbering === "year")) return { n: +plain[1], sort: +plain[1], label: String(+plain[1]) };
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
  const ce = catEntry(series); if (series && !series.code && ce) series = Object.assign({}, series, { code: ce.code });
  // the catalogue knows INDUCKS's exact issue code (its spacing differs per publication)
  const file = ce && S.catCache[ce.file], hit = file && file.issues[parseIssue(series, issue).label];
  if (hit && hit.ic) return "https://inducks.org/issue.php?c=" + encodeURIComponent(hit.ic).replace(/%20/g, "+");
  if (!series || !series.code) return "";
  const p = parseIssue(series, issue);
  if (p.n == null) return "https://inducks.org/publication.php?c=" + encodeURIComponent(series.code);
  let code;
  if (series.numbering === "year" && p.year) code = series.code + p.year + "-" + String(p.n).padStart(2, "0");
  else code = series.code + " " + String(p.n).padStart(3, " ");
  return "https://inducks.org/issue.php?c=" + encodeURIComponent(code).replace(/%20/g, "+");
}

// ---------- data: everything lives in this device's IndexedDB ----------
const DB_NAME = "dagobert-archiv", DB_VER = 2;
function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("comics")) db.createObjectStore("comics", { keyPath: "id" });
      if (!db.objectStoreNames.contains("config")) db.createObjectStore("config", { keyPath: "key" });
      if (!db.objectStoreNames.contains("covers")) db.createObjectStore("covers", { keyPath: "id" });   // small cover pictures, kept for offline use
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
  const pub = group && PUBLISHER_GROUPS[group] ? PUBLISHER_GROUPS[group] : (guessGroup(name) !== OTHER_GROUP || !group ? DISNEY : OTHER_PUB);
  const s = { id, name, short: "", publisher: pub, group: group && PUBLISHER_GROUPS[group] ? franchiseOf(name) : (group || guessGroup(name)), code: "", country: "", numbering: years.length ? "year" : "running", latest: "" };
  if (years.length) { s.firstYear = Math.min(...years); s.lastYear = Math.max(...years); s.perYear = ""; }
  if (arrangedInUse()) Object.assign(s, arrangeSeries(s));
  S.series.push(s);
  return s;
}
function findSeriesByName(name) { const n = norm(name); return S.series.find(s => norm(s.name) === n); }
async function adoptLooseSeries() {
  let changed = false;
  S.series.forEach(s => { if (s.group == null) { s.group = guessGroup(s.name); changed = true; } });
  S.series.forEach(s => {
    if (s.publisher) return;
    if (PUBLISHER_GROUPS[s.group]) { s.publisher = PUBLISHER_GROUPS[s.group]; s.group = franchiseOf(s.name); }
    else s.publisher = DISNEY;
    changed = true;
  });
  if (changed) S.series.sort((a, b) => pubCompare(a.publisher, b.publisher) || groupCompare(a.group, b.group));
  // "Lusties Taschenbuch Premium +" is called "Lustiges Taschenbuch Premium Plus"
  const renamedIds = [];
  S.series.forEach(se => { if (/^Lusti(?:g)?es Taschenbuch Premium\s*\+\s*$/i.test(se.name)) { se.name = "Lustiges Taschenbuch Premium Plus"; renamedIds.push(se.id); changed = true; } });
  const loose = S.comics.filter(c => c.kind !== "book" && (c.seriesId === "_other" || !seriesById(c.seriesId)));
  const byName = {};
  loose.forEach(c => { const n = String(c.seriesName || "Unknown series").trim(); (byName[n] = byName[n] || []).push(c); });
  const updated = [];
  Object.entries(byName).forEach(([name, list]) => {
    const se = findSeriesByName(name) || newSeriesFor(name, list, (list.find(c => c.seriesGroup) || {}).seriesGroup);
    list.forEach(c => updated.push(Object.assign({}, c, { seriesId: se.id, seriesName: se.name })));
  });
  S.comics.forEach(c => { if (renamedIds.includes(c.seriesId)) updated.push(Object.assign({}, c, { seriesName: seriesById(c.seriesId).name })); });
  S.comics.forEach(c => {
    if (c.kind === "book" || updated.some(u => u.id === c.id)) return;
    const se = seriesById(c.seriesId);
    if (!se || se.numbering === "year" || !c.issueLabel || (/^\d+$/.test(c.issueLabel) && String(+c.issueLabel) === c.issueLabel) || c.inducks) return;
    const p = parseIssue(se, c.issueLabel);
    if (/^\d+$/.test(p.label) && p.label !== c.issueLabel) updated.push(Object.assign({}, c, { issue: p.label, issueLabel: p.label, issueNum: p.n, issueSort: p.sort }));
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
    S.lastSeries = await getConfig("lastSeries") || null;
    S.barcodes = await getConfig("barcodes") || {};
    S.bookSizes = await getConfig("bookSizes") || {};
    S.barcodeYears = await getConfig("barcodeYears") || {};
    S.recentSeries = await getConfig("recentSeries") || [];
    S.comics = await tx("comics", "readonly", st => st.getAll()) || [];
    S.comics.forEach(c => { if (c.barcode && c.seriesId && !S.barcodes[c.barcode]) S.barcodes[c.barcode] = c.seriesId; });   // also after a restore
    S.storyRatings = await getConfig("storyRatings") || {};
    S.bookMeta = await getConfig("bookSeriesInfo") || {};
    if (!(await getConfig("ddTestFix"))) {
      const fix = S.comics.filter(c => /^de\/DD\s+0\d$/.test(c.inducks || "") && !/^T/.test(c.issueLabel || "")).map(c => Object.assign({}, c, { inducks: "" }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("ddTestFix", true);
    }
    S.valueRules = await getConfig("valueRules") || [];
    S.groupKeep = await getConfig("groupKeep") || [];
    S.bookSeriesExtra = await getConfig("bookSeriesExtra") || [];
    S.rates = await getConfig("rates") || null;
    S.gradeFactors = await getConfig("gradeFactors") || {};
    // once: genres filled in by the book databases before October 2026 were lists or catalogue codes; keep one clean genre
    // (run again in version 51: genres from different databases now share one English name)
    // once: comics without a format get their series' usual format (Heft, Taschenbuch / Pocket, ...)
    if (!(await getConfig("comicGenre1"))) {
      const fix = S.comics.filter(c => c.kind !== "book" && !c.genre && storyGenres(c)).map(c => Object.assign({}, c, { genre: storyGenres(c) }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("comicGenre1", true);
    }
    if (!(await getConfig("formatFill1"))) {
      const fix = S.comics.filter(c => c.kind !== "book" && !c.format && seriesFormat(seriesById(c.seriesId))).map(c => Object.assign({}, c, { format: seriesFormat(seriesById(c.seriesId)) }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("formatFill1", true);
    }
    // once: library form terms such as "Lehr- und Lernressource" aren't genres
    if (!(await getConfig("genresClean6")) && window.Books && Books.oneGenre) {
      const fix = S.comics.filter(c => c.kind === "book" && c.genre && Books.oneGenre(c.genre) !== c.genre).map(c => Object.assign({}, c, { genre: Books.oneGenre(c.genre) }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("genresClean6", true);
    }
    if (!(await getConfig("genresEnglish3")) && window.Books && Books.oneGenre) {
      const fix = S.comics.filter(c => c.kind === "book" && c.genre && Books.oneGenre(c.genre) !== c.genre).map(c => Object.assign({}, c, { genre: Books.oneGenre(c.genre) }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("genresEnglish3", true);
    }
    await adoptLooseSeries();
    S.dbState = "ready";
    loadCovers();
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
  if (body.kind !== "book" && !body.format) { const f = seriesFormat(seriesById(body.seriesId)); if (f) body.format = f; }
  if (body.kind !== "book" && !body.genre) { const g = storyGenres(body); if (g) body.genre = g; }   // genres from the stories when none is set   // the series' usual format when none is chosen
  return body;
}
function remember(saved) {
  const i = S.comics.findIndex(x => x.id === saved.id);
  if (i >= 0) S.comics[i] = saved; else S.comics.push(saved);
}
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("dagobert-archiv") : null;
function announce() { try { channel && channel.postMessage("changed"); } catch (e) {} }
async function reloadFromDb() {
  if (!S.db) return;
  try {
    const list = await getConfig("series"); if (Array.isArray(list)) S.series = list.map(x => Object.assign({}, x));
    S.comics = await tx("comics", "readonly", st => st.getAll()) || [];
    if (S.view !== "add") render();   // never disturb a form being filled in
  } catch (e) {}
}
if (channel) channel.onmessage = () => reloadFromDb();
async function saveComic(c, quiet) {
  const body = stamp(c);
  await tx("comics", "readwrite", st => st.put(body));
  remember(body); askPersist(); announce();
  if (!quiet && body.coverUrl && !S.coverHas[body.id + "|" + body.coverUrl]) storeCover(body).then(ok => ok && S.view === "collection" && renderKeep()).catch(() => {});
  return body;
}
// ---- cover pictures: the address is kept on the comic, a small copy (about 10 KB) in the "covers" store ----
// INDUCKS scans are shown through inducks.org/hr.php; copies are made through the wsrv.nl image service,
// which shrinks them and allows the app to keep them (the picture sites themselves don't allow that).
const inducksImg = u => u ? "https://inducks.org/hr.php?image=" + u + "&normalsize=1" : "";
const smallCopy = u => "https://wsrv.nl/?url=" + encodeURIComponent(u) + "&w=200&output=webp&q=65";
async function loadCovers() {
  S.coverObj = S.coverObj || {}; S.coverHas = S.coverHas || {};
  try {
    const all = await tx("covers", "readonly", st => st.getAll()) || [];
    all.forEach(x => { if (x.blob) { S.coverObj[x.id] = URL.createObjectURL(x.blob); S.coverHas[x.id + "|" + x.url] = true; } });
    if (all.length && S.view === "collection") render();
  } catch (e) {}
}
async function storeCover(c) {
  if (!c.coverUrl || !navigator.onLine) return false;
  // through the image service first; if it can't fetch the picture, straight from its site (works where that site allows it)
  let blob = null;
  for (const u of [smallCopy(c.coverUrl), c.coverUrl]) {
    try { const r = await fetch(u); if (r.ok) { const b = await r.blob(); if (b.size && /^image\//.test(b.type)) { blob = b; break; } } } catch (e) {}
  }
  if (!blob) return false;
  await tx("covers", "readwrite", st => st.put({ id: c.id, url: c.coverUrl, blob }));
  if (S.coverObj[c.id]) URL.revokeObjectURL(S.coverObj[c.id]);
  S.coverObj[c.id] = URL.createObjectURL(blob); S.coverHas[c.id + "|" + c.coverUrl] = true;
  return true;
}
// a reminder in Collection when the last backup is old or many entries changed since; "Copy backup" works in DuckDuckGo
function backupNag() {
  if (!S.comics.length || S.nagLater) return "";
  const days = daysSince(S.lastBackup), ch = changedSinceBackup();
  if (days <= 14 && ch < 25) return "";
  const why = days === Infinity ? "You haven't made a backup yet." : `Last backup ${days === 0 ? "today" : days === 1 ? "yesterday" : days + " days ago"}` + (ch ? `, ${ch} ${ch === 1 ? "entry" : "entries"} changed since.` : ".");
  return `<div class="banner warn nag"><span>${why}</span><div class="row" style="gap:6px"><button class="primary" id="nagcopy" type="button">Copy backup</button><button id="naggo" type="button">Backup page</button><button class="ghost" id="naglater" type="button">Later</button></div></div>`;
}
function bindBackupNag() {
  $("#naglater") && ($("#naglater").onclick = () => { S.nagLater = true; renderKeep(); });
  $("#naggo") && ($("#naggo").onclick = () => nav("backup"));
  $("#nagcopy") && ($("#nagcopy").onclick = async () => {
    try {
      const txt = await backupText();
      await navigator.clipboard.writeText(txt); await markBackedUp();
      toast("Backup copied. Paste it into Gmail, Keep or Docs."); renderKeep();
    } catch (e) { toast("Copying didn't work here. Use the Backup page instead."); nav("backup"); }
  });
}
function coverBar() {
  if (S.colTab === "books" || !S.comics.length) return "";
  const noUrl = S.comics.filter(noCoverYet).length, notKept = S.comics.filter(needsKeep).length;
  const run = S.cv && S.cv.running;
  if (!run && !notKept && (!noUrl || S.cvAsked)) return S.cv && S.cv.msg ? `<p class="small muted" style="margin:8px 0">${esc(S.cv.msg)}</p>` : "";
  return `<div class="row small" style="align-items:center;margin:8px 0"><button id="getcv" type="button">${run ? "Stop" : "Get cover pictures"}</button>
    <span class="muted" id="cvprog">${run ? "Working…" : [noUrl ? noUrl + " without a cover" : "", notKept ? notKept + " not stored for offline use yet" : ""].filter(Boolean).join(" · ") + ". Uses the internet once; the pictures are then kept on this phone (about 10 KB each)."}</span></div>`;
}
// ---- big cover: tap a cover picture anywhere to see it large (the full-size scan online, the stored copy offline) ----
function bigCover(u) {
  if (!u) return "";
  if (/inducks\.org\/hr\.php/.test(u)) return u.replace(/&normalsize=1/, "");
  const m = /^(https:\/\/de\.duckipedia\.org\/images)\/thumb\/(.+?)\/\d+px-[^/]+$/.exec(u); if (m) return m[1] + "/" + m[2];
  return u;
}
function showCover(id) {
  const c = S.comics.find(x => x.id === id) || (S.draft && (S.draft.id === id || !id) ? S.draft : null);
  if (!c || !coverOf(c)) return;
  const small = coverOf(c), big = navigator.onLine && c.coverUrl ? bigCover(c.coverUrl) : small;
  const v = document.createElement("div"); v.className = "coverview"; v.setAttribute("role", "dialog"); v.setAttribute("aria-label", "Cover");
  v.innerHTML = `<img src="${esc(small)}" alt="Cover"><button type="button" class="cvclose" aria-label="Close">✕</button>`;
  document.body.appendChild(v);
  const img = v.querySelector("img");
  if (big !== small) { const hi = new Image(); hi.onload = () => { img.src = big; }; hi.src = big; }   // sharp version replaces the small one once loaded
  const close = () => { v.remove(); document.removeEventListener("keydown", esc_); };
  const esc_ = e => { if (e.key === "Escape") close(); };
  v.onclick = close; document.addEventListener("keydown", esc_);
}
// capture phase, so tapping a thumbnail inside a list row shows the cover instead of opening the comic
document.addEventListener("click", e => { const z = e.target.closest && e.target.closest("[data-zoom]"); if (!z) return; e.preventDefault(); e.stopPropagation(); showCover(z.dataset.zoom); }, true);
// still worth looking for a cover: never found one, or the catalogue is newer than the last try
const needsKeep = c => c.coverUrl && !/^data:/.test(c.coverUrl) && !S.coverHas[c.id + "|" + c.coverUrl] && c.coverKeepFail !== c.coverUrl;
const noCoverYet = c => c.kind !== "book" && !c.coverUrl && (!c.coverNone || !!(S.catalogue && S.catalogue.built && S.catalogue.built > c.coverNone));
const coverOf = c => (S.coverObj && S.coverObj[c.id]) || c.coverUrl || "";
// finds covers for comics without one (INDUCKS catalogue first, then Duckipedia) and keeps small copies of all
async function fetchAllCovers() {
  if (S.cv && S.cv.running) return;
  const run = S.cv = { running: true, stop: false, found: 0, kept: 0, done: 0, total: 0 };
  const draw = () => { const el = $("#cvprog"); if (el) el.textContent = run.running ? `Working… ${run.done} of ${run.total}. ${run.found} covers found, ${run.kept} stored.` : `Done. ${run.found} covers found, ${run.kept} stored on this phone.` + (run.failed && run.failed.length ? ` ${run.failed.length} couldn't be stored (the picture's website doesn't allow copies; it still shows when online): ${run.failed.slice(0, 5).map(comicTag).join(", ")}.` : ""); };
  const need = S.comics.filter(noCoverYet);
  const keep = () => S.comics.filter(needsKeep);
  run.total = need.length + keep().length; draw();
  for (const c of need) {
    if (run.stop) break;
    const se = seriesById(c.seriesId); let url = "";
    try {
      const hit = se && await catalogueLookup(se, c.issueLabel || c.issue);
      if (hit && hit.cv) url = inducksImg(hit.cv);
      if (!url && se && Duckipedia.candidates(dkSeries(se), c).length) { const d = await Duckipedia.fetchIssue(dkSeries(se), c); if (d && d.issue.cover) url = d.issue.cover; }
    } catch (e) {}
    if (url) { const saved = await saveComic(Object.assign({}, c, { coverUrl: url }), true).catch(() => null); if (saved) run.found++; }
    else await saveComic(Object.assign({}, c, { coverNone: new Date().toISOString().slice(0, 16) }), true).catch(() => null);   // not asked again
    run.done++; draw();
  }
  const rest = keep(); run.total = run.done + rest.length; draw();
  run.failed = [];
  for (const c of rest) {
    if (run.stop) break;
    if (await storeCover(c).catch(() => false)) run.kept++;
    else if (navigator.onLine) {   // this picture can't be copied: remember it, so it isn't counted as "not stored" again
      run.failed.push(c);
      await saveComic(Object.assign({}, c, { coverKeepFail: c.coverUrl }), true).catch(() => null);
    }
    run.done++; draw();
  }
  run.running = false; S.cvAsked = true; draw(); run.msg = ($("#cvprog") || {}).textContent || ""; if (S.view === "collection") renderKeep();
}
// ---- lots: several comics bought together for one price ----
// ---- "you already have this": shown while typing the number or ISBN, or right after a scan ----
function findDup(d) {
  const other = c => c.id !== d.id;
  if (d.kind === "book") {
    const isbn = d.isbn && window.Books && Books.normalize(d.isbn);
    return (isbn && S.comics.find(c => other(c) && c.isbn && Books.normalize(c.isbn) === isbn))
      || (d.seriesName && String(d.issue || "").trim() && S.comics.find(c => other(c) && c.kind === "book" && c.seriesName === d.seriesName && String(c.issue).trim() === String(d.issue).trim()))
      || (d.title && S.comics.find(c => other(c) && c.kind === "book" && norm(c.title) === norm(d.title) && norm(c.author || "") === norm(d.author || "") && !c.seriesName === !d.seriesName))
      || null;
  }
  const se = seriesById(d.seriesId); if (!se || !String(d.issue || "").trim()) {
    const raw = String(d.isbn || "").replace(/\D/g, ""), isbn = window.Books && Books.normalize(raw);   // the ISBN-or-barcode field of comics
    return (isbn && S.comics.find(c => other(c) && c.isbn && Books.normalize(c.isbn) === isbn)) || null;
  }
  const p = parseIssue(se, d.issue); if (!p.label || /\?/.test(p.label)) return null;
  return S.comics.find(c => other(c) && c.kind !== "book" && !c.facsimile === !d.facsimile && c.seriesId === se.id && sameSlot(c.issueLabel || c.issue, p.label)) || null;
}
function dupHtml(d) {
  const c = findDup(d);
  if (!c) return '<div id="dupnote"></div>';
  const where = c.status === "wanted" ? (d.status === "wanted" ? "is already on your wishlist" : "is on your wishlist: saving moves it to your collection")
    : "is already in your collection" + ((c.copies || 1) > 1 ? " (" + c.copies + " copies)" : "");
  return `<div id="dupnote" class="banner ${c.status === "wanted" && d.status !== "wanted" ? "" : "warn"}">${esc(c.kind === "book" ? c.title + (c.issue ? " (" + c.issue + ")" : "") : comicTag(c))} ${where}. <button type="button" class="link" data-dupopen="${esc(c.id)}">Open it</button></div>`;
}
function refreshDup(d) {
  const el = $("#dupnote"); if (!el) return;
  el.outerHTML = dupHtml(d);
  const b = document.querySelector("[data-dupopen]"); if (b) b.onclick = () => { S.editing = b.dataset.dupopen; S.draft = null; nav("add"); };
}
function lotFields(d) {
  const lots = recentLots(), cur = d.lotId && d.lotId !== "new" ? lotInfo(d.lotId) : null;
  if (cur && !lots.some(l => l.id === cur.id)) lots.unshift(cur);
  const others = cur ? cur.members.filter(c => c.id !== d.id) : [];
  const n = (cur ? cur.members.length + (cur.members.some(c => c.id === d.id) ? 0 : 1) : 1);
  const total = parseAmt(d.lotTotal), w1 = d.kind === "book" ? "book" : "comic", w2 = w1 + "s";
  return `<label class="wide"><span class="l">Lot</span><select id="f-lot"><option value="new"${d.lotId === "new" ? " selected" : ""}>A new lot</option>${lots.map(l => `<option value="${esc(l.id)}"${d.lotId === l.id ? " selected" : ""}>${esc(lotLabel(l))}</option>`).join("")}</select></label>
    <label><span class="l">Price for the whole lot</span><input id="f-lotTotal" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.lotTotal))}"></label>
    <div class="wide small lotinfo"><span id="lotper" data-n="${n}">${total === 0 ? `A free lot: ${n === 1 ? "this " + w1 + " gets" : "all " + n + " " + w2 + " get"} the price 0.00.` : typeof total === "number" && total > 0 ? `With this one: ${n} ${n === 1 ? w1 : w2}, about ${fmt2(total / n)} each. The app splits the price to the cent and adjusts it when more ${w2} join the lot.` : "Enter what you paid for all of them together (0 if they were free). Add the others with “Save and add next”, which keeps the lot."}</span>
      ${others.length ? `<div class="row" style="gap:6px;margin-top:6px">${others.map(c => `<button type="button" class="chipbtn" data-open="${esc(c.id)}">${esc(comicTag(c).trim() || c.title || "comic")}</button>`).join("")}</div>` : ""}</div>`;
}
function lotMembers(id) { return id ? S.comics.filter(c => c.lotId === id && c.status !== "wanted") : []; }
function lotInfo(id) {
  const m = lotMembers(id); if (!m.length) return null;
  const f = m.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
  return { id, members: m, total: f.lotTotal, currency: f.lotCurrency || f.currency || "CHF", source: f.source || "", date: f.purchaseDate || "", created: m.reduce((a, c) => c.createdAt > a ? c.createdAt : a, "") };
}
function recentLots() {
  const ids = [...new Set(S.comics.filter(c => c.lotId && c.status !== "wanted").map(c => c.lotId))];
  return ids.map(lotInfo).filter(Boolean).sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 6);
}
function lotLabel(l) {
  const bk = l.members.filter(c => c.kind === "book").length, n = l.members.length;
  const w = bk === n ? (n === 1 ? " book" : " books") : bk ? (n === 1 ? " item" : " items") : (n === 1 ? " comic" : " comics");   // a lot can mix both
  return [money(l.total, l.currency), n + w, l.source, l.date ? niceDate(l.date) : ""].filter(Boolean).join(" · ");
}
// spreads the lot price over its comics to the cent: 20.00 for 3 -> 6.67, 6.67, 6.66
async function rebalanceLot(id, total, currency) {
  const m = lotMembers(id).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  if (!m.length) return;
  const T = Math.round((typeof total === "number" ? total : +m[0].lotTotal || 0) * 100), cur = currency || m[0].lotCurrency || m[0].currency;
  const units = m.reduce((a, c) => a + (c.copies || 1), 0), base = Math.floor(T / units);
  let rest = T - base * units;
  const out = m.map(c => { let cents = base; if (rest > 0 && (c.copies || 1) === 1) { cents++; rest--; } return Object.assign({}, c, { pricePaid: cents / 100, currency: cur, lotTotal: T / 100, lotCurrency: cur }); });
  if (rest > 0) out[0].pricePaid = Math.round((out[0].pricePaid * 100 + rest / (out[0].copies || 1))) / 100;   // only when every comic has several copies
  await saveMany(out, null, true); announce();
}
// before saving: settle the lot fields; returns false (with a message) if something is missing
function prepareLot(d, c, before) {
  if (c.status === "wanted" || !d.lotId) { c.lotId = ""; c.lotTotal = ""; c.lotCurrency = ""; return true; }
  const total = parseAmt(d.lotTotal);
  if (!(typeof total === "number" && total >= 0)) { toast("Enter the price for the whole lot (0 if you got it for free)"); $("#f-lotTotal") && $("#f-lotTotal").focus(); return false; }
  if (d.lotId === "new") d.lotId = newId();
  c.lotId = d.lotId; c.lotTotal = total; c.lotCurrency = c.currency; c.pricePaid = "";
  return true;
}
async function afterLotSave(c, before) {
  if (c.lotId) await rebalanceLot(c.lotId, c.lotTotal, c.currency);
  if (before && before.lotId && before.lotId !== c.lotId) await rebalanceLot(before.lotId);   // left its old lot
  const l = c.lotId && lotInfo(c.lotId);
  return l ? " · lot of " + l.members.length + ", " + money(l.total / l.members.length, l.currency) + " each" : "";
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
  askPersist(); announce();
  return done;
}
// the grid squares an issue fills: a double issue "2016-11-12" fills 2016/11 and 2016/12
function issueSquares(lab) {
  let v = /^(\d{1,5})([A-Z])$/.exec(lab || "");               // variant 546A sits in square 546
  if (v) return [v[1]];
  v = /^(\d{4})-(\d{1,3})([A-Z])$/.exec(lab || "");          // variant 1984-19A sits in 1984/19
  if (v) return [v[1] + "/" + v[2].padStart(2, "0")];
  const m = /^(\d{4})-(\d{1,3})-(\d{1,3})$/.exec(lab || "");
  if (!m) return [lab];
  const out = []; for (let i = +m[2]; i <= +m[3]; i++) out.push(m[1] + "/" + String(i).padStart(2, "0"));
  return out;
}
function variantOf(lab) { const m = /^(?:\d{4}-)?\d{1,5}([A-Z])$/.exec(lab || ""); return m ? m[1] : ""; }
// two numbers stand for the same comic: same square, and not two different variants (546A and 546B are different comics)
function sameSlot(a, b) {
  const sa = issueSquares(a), sb = issueSquares(b);
  if (!sa.some(k => sb.includes(k))) return false;
  const va = variantOf(a), vb = variantOf(b);
  return !(va && vb && va !== vb);
}
async function deleteComic(id) {
  await tx("comics", "readwrite", st => st.delete(id));
  tx("covers", "readwrite", st => st.delete(id)).catch(() => {});
  S.comics = S.comics.filter(x => x.id !== id); announce();
}
async function saveSeries() {
  await setConfig("series", S.series);
  S.seriesSaved = true; announce();
}
async function loadCatalogueIndex() {
  try { const r = await fetch("catalogue/index.json"); if (r.ok) { S.catalogue = await r.json(); render(); } } catch (e) { S.catalogue = null; }
}
// the catalogue is keyed by series name (as in the app); a series whose name changed is still found by its INDUCKS code
function catEntry(se) {
  const all = S.catalogue && S.catalogue.series; if (!se || !all) return null;
  const n = norm(se.name), list = Object.values(all);
  if (se.code) return list.find(x => x.code === se.code) || null;   // a series with an INDUCKS code only matches that code
  // by name, only within the same country: the Norwegian "Donald Duck & Co" is not the German one
  const cc = String(se.country || "").toLowerCase(), sameLand = x => !cc || String(x.code || "").split("/")[0] === cc;
  return [all[n]].concat(list.filter(x => (x.aliases || []).some(a => norm(a) === n))).find(x => x && sameLand(x)) || null;
}
async function catalogueFile(entry) {
  if (!S.catCache[entry.file]) {
    const r = await fetch("catalogue/" + entry.file);
    if (!r.ok) return null;
    S.catCache[entry.file] = await r.json();
  }
  return S.catCache[entry.file];
}
async function catalogueLookup(series, issue) {
  const entry = catEntry(series); if (!entry) return null;
  const file = await catalogueFile(entry); if (!file) return null;
  const p = parseIssue(series, issue);
  const data = file.issues || {};
  return data[p.label] || data[String(p.n)] || data[String(issue).trim()] || null;
}

// ---------- INDUCKS matching ----------
function labelParts(lab) {
  const tl = /^T(\d{1,3})$/.exec(lab || ""); if (tl) return { year: null, n: +tl[1], sort: +tl[1] / 100 - 1 };
  let m = /^(\d{4})\/(\d{1,3})$/.exec(lab || "");
  if (m) return { year: +m[1], n: +m[2], sort: +m[1] * 1000 + +m[2] };
  if (/^\d+$/.test(lab || "")) return { year: null, n: +lab, sort: +lab };
  m = /^(\d{1,5})([A-Z])$/.exec(lab || "");
  if (m) return { year: null, n: +m[1], sort: +m[1] + (m[2].charCodeAt(0) - 64) / 100 };
  m = /^(\d{4})-(\d{1,3})([A-Z])$/.exec(lab || "");
  if (m) return { year: +m[1], n: +m[2], sort: +m[1] * 1000 + +m[2] + (m[3].charCodeAt(0) - 64) / 100 };
  m = /^(\d{4})-(\d{1,3})-\d{1,3}$/.exec(lab || "");
  if (m) return { year: +m[1], n: +m[2], sort: +m[1] * 1000 + +m[2] };
  m = /^(\d{4})/.exec(lab || "");
  return { year: m ? +m[1] : null, n: null, sort: m ? +m[1] * 1000 + 999 : 1e9 };
}
const STOP = new Set("missa inte serien klassiker extra nummer numret festlig tavling tavlingen sommar specialnummer".split(" "));
function titleWords(t) { return norm(t).split(" ").filter(w => w.length >= 5 && !STOP.has(w)); }
// Proposes an INDUCKS issue for one comic. sure = can be applied without checking.
function proposeMatch(c, file) {
  const issues = file.issues || {}, lab = c.issueLabel || c.issue || "";
  if (lab && issues[lab]) return { label: lab, how: "Same number", sure: true };
  const se = seriesById(c.seriesId);
  // the issue's own title names it: "Stål-Kalle Pocket 4: Fallen stjärna" (a series INDUCKS keeps inside another one)
  if (se && /^\d+$/.test(lab)) {
    const want = norm(se.name) + " " + lab;
    const hit = Object.keys(issues).filter(k => { const t = norm(issues[k].t); return t === want || t.startsWith(want + " "); });
    if (hit.length === 1) return { label: hit[0], how: "Issue title “" + issues[hit[0]].t + "”", sure: true, keepNumber: true };
  }
  // only variants exist (LTB 546A / 546B)
  const vars = Object.keys(issues).filter(k => variantOf(k) && sameSlot(k, lab));
  if (lab && !variantOf(lab) && vars.length) return { label: "", how: "INDUCKS has this number only as variants " + vars.join(", ") + ": pick yours", sure: false, options: vars };
  const date = String(c.date || ""), year = (/^(\d{4})/.exec(lab) || /^(\d{4})/.exec(date) || [])[1];
  const inYear = year ? Object.keys(issues).filter(k => k.startsWith(year) || String(issues[k].d || "").startsWith(year)) : [];
  if (date.length >= 10) {
    const hit = inYear.filter(k => issues[k].d === date);
    if (hit.length === 1) return { label: hit[0], how: "Same cover date", sure: true };
  }
  if (date.length >= 7) {
    const hit = inYear.filter(k => String(issues[k].d || "").slice(0, 7) === date.slice(0, 7));
    if (hit.length === 1) return { label: hit[0], how: "Same month", sure: false };
  }
  const n = /^\d+$/.test(lab) ? +lab : null;
  if (n != null && year) {
    const k = year + "/" + String(n).padStart(2, "0");
    if (issues[k]) return { label: k, how: "Year " + year + ", number " + n, sure: false };
  }
  const words = titleWords(c.title);
  if (words.length && inYear.length) {
    const scored = inYear.map(k => {
      const text = norm([issues[k].t].concat((issues[k].s || []).map(x => x.t)).join(" "));
      return [k, words.filter(w => text.includes(w)).length];
    }).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    if (scored.length && (scored.length === 1 || scored[0][1] > scored[1][1]) && (scored[0][1] >= 2 || scored.length === 1))
      return { label: scored[0][0], how: "Cover text matches a story", sure: false };
  }
  // a number INDUCKS doesn't have at all, e.g. KA 1948/07 when 1948 only had 1948/01–04
  const ym = /^(\d{4})\/(\d{1,3})$/.exec(lab);
  if (ym) {
    const nums = Object.keys(issues).filter(k => k.startsWith(ym[1] + "/")).sort();
    if (nums.length) return { label: "", how: "INDUCKS has no " + lab + ": in " + ym[1] + " there were only " + nums[0] + "–" + nums[nums.length - 1] + ". Check the number, or delete the entry", sure: false };
    return { label: "", how: "INDUCKS has no issues from " + ym[1] + " in this series. Check the year", sure: false };
  }
  return { label: "", how: inYear.length ? "Pick the issue" : "No match found", sure: false };
}
function applyIssueFromCatalogue(c, label, hit) {
  const p = labelParts(label), out = Object.assign({}, c), se = seriesById(c.seriesId);
  // keep your own numbering when INDUCKS files the issue under another series' numbers (Stål-Kalle Pocket 4 = ASP 2016/01)
  const keep = se && se.numbering !== "year" && /^\d+$/.test(c.issueLabel || "") && /\//.test(label);
  if (!keep) { out.issue = label; out.issueLabel = label; out.issueYear = p.year; out.issueNum = p.n; out.issueSort = p.sort; }
  if (hit.d && String(hit.d).length >= String(c.date || "").length) out.date = hit.d;
  if (!c.title && hit.t) out.title = hit.t;
  if (!c.pages && hit.pg) out.pages = hit.pg;
  if (!c.coverUrl && hit.cv) out.coverUrl = inducksImg(hit.cv);
  const fromClz = !(c.stories || []).some(x => x.code);
  const clean = v => String(v || "").split(", ").filter(n => n && n !== "?").join(", ");
  if (fromClz && (hit.s || []).length) out.stories = hit.s.map(x => ({ title: x.t || "", code: x.c || "", writer: clean(x.w), artist: clean(x.a), hero: x.h || "" }));
  out.inducks = hit.ic;
  return out;
}
// fills in missing series details (INDUCKS code, numbering, size) from the catalogue
function seriesFromCatalogue(se, file, entry) {
  let changed = false;
  if (!se.code) { se.code = entry.code; changed = true; }
  const labs = Object.keys(file.issues || {});
  const yearLabs = labs.map(l => /^(\d{4})\/(\d{1,3})$/.exec(l)).filter(Boolean);
  if (yearLabs.length > labs.length / 2) {
    if (se.numbering !== "year") { se.numbering = "year"; changed = true; }
    const ys = yearLabs.map(m => +m[1]), ns = yearLabs.map(m => +m[2]);
    if (!se.firstYear) { se.firstYear = Math.min(...ys); changed = true; }
    if (!se.lastYear) { se.lastYear = Math.max(...ys); changed = true; }
    if (!se.perYear) { se.perYear = Math.min(60, Math.max(...ns)); changed = true; }
  } else if (se.numbering !== "year" && !se.latest) {
    const nums = labs.filter(l => /^\d+$/.test(l)).map(Number);
    if (nums.length) { se.latest = Math.max(...nums); changed = true; }
  }
  return changed;
}

// ---------- derived ----------
function owned() { return S.comics.filter(c => c.status !== "wanted"); }
function searchText(c) {
  const st = (c.stories || []).map(s => [s.title, s.code, s.writer, s.artist, s.hero, s.dTitle, s.original, s.translator, s.characters, s.genre].join(" ")).join(" ");
  const dk = c.duckipedia && c.duckipedia.issue ? [c.duckipedia.issue.translator, c.duckipedia.issue.editor, c.duckipedia.issue.title].join(" ") : "";
  const se = seriesById(c.seriesId);
  return norm([se ? se.name + " " + se.short : c.seriesName, c.issue, c.title, c.notes, c.special, c.location, c.source, c.author, c.publisher, c.genre, c.isbn, String(c.isbn || "").replace(/\D/g, ""), c.kind === "book" ? "book" : "", st, dk].join(" "));
}
function sortComics(list) {
  const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
  return list.slice().sort((a, b) => ((order[a.seriesId] ?? (a.kind === "book" ? 1000 : 999)) - (order[b.seriesId] ?? (b.kind === "book" ? 1000 : 999))) || String(a.seriesName || "").localeCompare(String(b.seriesName || "")) || (a.issueSort ?? 1e9) - (b.issueSort ?? 1e9) || String(a.title || "").localeCompare(String(b.title || "")));
}

// ---------- routing ----------
// opening a comic remembers where you were, so Save, Delete and Back return there at the same scroll position
function scrollState() { const g = document.getElementById("gridbox"); return { y: window.scrollY, gy: g ? g.scrollTop : 0 }; }
function restoreScroll(st) { if (!st) return; requestAnimationFrame(() => { const g = document.getElementById("gridbox"); if (g) g.scrollTop = st.gy || 0; window.scrollTo(0, st.y || 0); }); }
function renderKeep() { const st = scrollState(); render(); restoreScroll(st); }
function setView(v) {
  if (v === "add" && S.view !== "add") S.returnTo = Object.assign({ view: S.view, col: S.col, shown: S.shown }, scrollState());
  S.view = v; S.confirmDelete = false; render();
  if (S.pendingScroll) { restoreScroll(S.pendingScroll); S.pendingScroll = null; } else window.scrollTo(0, 0);
}
// back to the screen the comic was opened from; fallback() is used when there is none
function goBack(fallback) {
  const r = S.returnTo; S.returnTo = null; S.draft = null; S.editing = null;
  if (r && r.view && r.view !== "add" && VIEWS[r.view]) { S.col = r.col || {}; S.shown = r.shown || S.shown; S.pendingScroll = r; nav(r.view); }
  else if (fallback) fallback(); else nav("collection");
}
function nav(v) {
  // pushState changes the address without firing hashchange/popstate, so the view state is kept
  if (location.hash !== "#" + v) { try { history.pushState({ col: S.col }, "", "#" + v); } catch (e) { S.navLock = true; location.hash = v; } }
  setView(v);
}
// "More" on the phone's bottom bar: Series and Backup
const moreMenu = (open) => { const m = $("#moremenu"), b = $("#morebtn"); if (!m) return; m.hidden = !open; b.setAttribute("aria-expanded", open ? "true" : "false"); };
document.getElementById("morebtn").addEventListener("click", e => { e.stopPropagation(); moreMenu($("#moremenu").hidden); });
document.addEventListener("click", e => { if (!e.target.closest("#moremenu, #morebtn")) moreMenu(false); });
document.getElementById("tabs").addEventListener("click", e => {
  const a = e.target.closest("a[data-v]"); if (!a) return;
  moreMenu(false);
  if (a.dataset.v === "collection") { S.col = {}; S.shown = 200; }
  if (location.hash === "#" + a.dataset.v) { e.preventDefault(); if (a.dataset.v === "add") { S.editing = null; S.draft = null; } setView(a.dataset.v); }
});
window.addEventListener("hashchange", () => {
  if (S.navLock) { S.navLock = false; return; }
  const v = location.hash.slice(1);
  if (VIEWS[v]) { if (v === "add") { S.editing = null; S.draft = null; } if (v === "match") S.matchRun = null; setView(v); }
});

// ---------- render ----------
function render() {
  document.querySelectorAll("#tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.v === S.view ? "page" : "false"));
  { const mb = $("#morebtn"); if (mb) mb.setAttribute("aria-current", ["series", "backup", "match"].includes(S.view) ? "page" : "false"); }
  const app = $("#app");
  let head = "";
  if (S.dbState === "none") head = '<div class="banner warn">This browser can\'t store data. Open the archive in Chrome on your phone.</div>';
  const unmatched = S.catalogue && S.view === "collection" && !(S.col && S.col.p) ? S.comics.filter(c => !c.inducks && !c.inducksChecked && c.kind !== "book" && catEntry(seriesById(c.seriesId))).length : 0;
  if (unmatched) head += '<div class="banner row between"><span>INDUCKS can add story lists and issue numbers to ' + unmatched + ' of your comics.</span><a href="#match">Review matches</a></div>';
  if (S.dbState === "ready" && S.view === "collection") head += backupNag();
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
function seriesKeyOf(c) { return c.kind === "book" ? "book:" + (c.seriesName || "") : (seriesById(c.seriesId) ? c.seriesId : "name:" + (c.seriesName || "")); }
function seriesTitle(key) {
  if (key.startsWith("book:")) return key.slice(5) || "Single books";
  if (key.startsWith("name:")) return key.slice(5) || "Unknown series";
  const se = seriesById(key); return se ? seriesLabel(se) : key;
}
// "Spider-Man (German)" when two series share a name
function seriesLabel(se) {
  const same = n => String(n || "").trim().toLowerCase();
  if (!S.series.some(x => x !== se && same(x.name) === same(se.name))) return se.name;
  const l = seriesLang(se); return l ? se.name + " (" + l + ")" : se.name;
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
    if (c.forTrade || (c.copies || 1) > 1) chips.push('<span class="chip trade">' + ((c.copies || 1) > 1 ? "×" + c.copies : "Trade") + '</span>');
    if (c.location) chips.push('<span class="chip">' + esc(c.location) + '</span>');
  }
  if (c.fav && c.status !== "wanted") chips.unshift('<span class="chip fav" title="Favourite">♥</span>');
  if (+c.rating && c.status !== "wanted") chips.unshift('<span class="chip rate">' + ratingTxt(c.rating) + '</span>');
  if (c.special) chips.push('<span class="chip special" title="' + esc(c.special) + '">Special</span>');
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
    ${cv ? `<div class="cthumb" data-zoom="${esc(c.id)}"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></div>` : ""}<div class="num${String(numTxt).length > 8 ? " long xlong" : String(numTxt).length > 4 ? " long" : ""}">${isBook && !c.issue ? '<span style="font-size:.9rem">Book</span>' : esc(numTxt || "–")}<small>${isBook ? (c.issue ? "VOL." : "") + " BOOK" : esc(se ? (se.short || "") : (c.seriesName || ""))}</small></div>
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
  const yrs = se.latestTxt != null ? se.latestTxt : se.numbering === "year" ? [se.firstYear, se.lastYear].filter(Boolean).join("–") : se.latest ? "to issue " + se.latest : "";
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
function entriesHtml(list, inSeries, note) {
  const grid = colView() === "grid";
  const one = c => grid ? tileHtml(c) : note ? itemHtml(c, inSeries).replace('<div class="chips">', '<div class="chips">' + (note(c) ? `<span class="chip sortv">${esc(note(c))}</span>` : "")) : itemHtml(c, inSeries);
  return `<div class="${grid ? "cgrid" : "list"}">` + list.map(x => typeof x === "string" ? x : one(x)).join("") + "</div>";
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
    const keys = Object.keys(bySeries).sort((a, b) => ((order[a] ?? 999) - (order[b] ?? 999)) || seriesTitle(a).localeCompare(seriesTitle(b), "de", { numeric: true }));
    const trail = isBookUni(col.p) ? [{ label: "All", col: {} }, { label: col.p }] : [{ label: "All", col: {} }, { label: col.p, col: { p: col.p } }, { label: col.g }];
    html = crumbs(trail) +
      (keys.length ? '<div class="list">' + keys.map(k => {
        const list = bySeries[k], se = seriesById(k), yrs = yearsText(list);
        return `<button class="folder" data-col='${esc(JSON.stringify({ p: col.p, g: col.g, s: k }))}'><div style="min-width:0"><div class="t">${esc(seriesTitle(k))}${se && se.short ? ` <span class="chip">${esc(se.short)}</span>` : ""}</div>
          <div class="s">${esc([countText(list), yrs, valueTag(list)].filter(Boolean).join(" · "))}</div></div><span class="count">${list.length}</span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("") + '</div>' : '<div class="empty"><h3>Nothing to show here</h3><p>Nothing in this group fits “Show”. Change it above.</p></div>');
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
  box.innerHTML = html;
  box.querySelectorAll("[data-col]").forEach(b => b.onclick = () => openCol(JSON.parse(b.dataset.col)));
  const ab = box.querySelector(".serabout"); if (ab) ab.ontoggle = () => { S.aboutOpen = ab.open; };
  box.querySelectorAll(".item, .tile").forEach(b => b.onclick = () => { S.editing = b.dataset.id; S.draft = null; nav("add"); });
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
  const items = S.series.map(s => ({ key: s.id, label: seriesLabel(s), short: s.short || "", group: (s.publisher || OTHER_PUB) + " · " + (s.group || OTHER_GROUP), uni: s.publisher || OTHER_PUB, code: (catEntry(s) || {}).code || s.code || "", n: cnt[s.id] || 0 }));
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
  $("#gsBtn") && ($("#gsBtn").onclick = async () => go(await pickSeries({ current: S.gapSeries, books: true, onlyMine: true, title: "Gap grid for" })));
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
    cells += `<button class="cell${Number.isInteger(n) ? "" : " half"} ${o && w ? "owned conflict" : o ? "owned" : w ? "wanted" : ""}" data-vol="${n}" data-id="${esc((o || w || {}).id || "")}" title="${esc(name + " " + n + (o ? " · owned" : w ? " · on wishlist" : " · missing"))}">${n}</button>`;
  }
  const noVol = mine.filter(c => vol(c) == null);
  const ownCount = [...own.keys()].length, wantCount = [...want.keys()].filter(k => !own.has(k)).length;
  const wl = sortComics(S.comics.filter(c => c.status === "wanted"));
  return gapTabs() + gapHead(ownCount, wantCount, squares.length, { read: false, legend: '<span><i style="background:var(--owned)"></i>Owned</span><span><i style="background:var(--wanted-soft);box-shadow:inset 0 0 0 1.5px var(--wanted)"></i>Wishlist</span><span><i style="background:var(--cell)"></i>Missing</span>' }) + `
    <div class="row" style="align-items:end;gap:8px"><label style="max-width:220px"><span class="l">Volumes in this series</span><input id="bsize" type="number" min="1" inputmode="numeric" value="${esc(sizes[name] || "")}" placeholder="${maxHave || "e.g. 7"}"></label><button id="bsizego" type="button">Save</button></div>
    ${noVol.length ? `<p class="small muted" style="margin:0">${noVol.length} ${noVol.length === 1 ? "book has" : "books have"} no volume number, so ${noVol.length === 1 ? "it isn't" : "they aren't"} in the grid: ${noVol.map(c => esc(c.title)).join(", ")}.</p>` : ""}
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
    : [row("Series", t(se ? se.name : c.seriesName)), row("Issue", t(showLabel(c.issueLabel || c.issue || ""))), row("Title", t(c.title)), row("Released", t(niceDate(c.date))), row("Pages", t(c.pages)), row("Format", t(c.format)), row("Genres", t(c.genre || storyGenres(c))),
      row("INDUCKS", c.inducks ? `<a href="https://inducks.org/issue.php?c=${encodeURIComponent(c.inducks).replace(/%20/g, "+")}" target="_blank" rel="noopener">${t(c.inducks)}</a>` : ""), row("Facsimile", c.facsimile ? "yes, reprint" : "")];
  const copy = c.status === "wanted"
    ? [row("Wishlist", "yes"), row("Maximum price", t(money(c.pricePaid, c.currency))), row("Notes", t(c.notes))]
    : [row("Condition", t(grade)), row("Copies", (c.copies || 1) > 1 ? c.copies : ""), row("Location", t(c.location)),
      row("Paid", t(money(c.pricePaid, c.currency)) + (lot ? ` <span class="muted">(lot of ${lot.members.length}, ${t(money(lot.total, lot.currency))})</span>` : "")),
      row("Bought", t([niceDate(c.purchaseDate), c.source].filter(Boolean).join(" · "))), row("Read", c.read ? "yes" + (c.readDate ? ", " + t(niceDate(c.readDate)) : "") : "not yet"),
      row("For trade", c.forTrade ? "yes" : ""), row("Value", v ? t(money(v.amount * (c.copies || 1), v.cur)) + ` <span class="muted">(${v.how === "checked" ? "checked price" : v.how === "table" ? "price table" : "own estimate"})</span>` : ""),
      row("Special", t(c.special)), row("Notes", t(c.notes))];
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
// ---- Add / edit ----
function defaultSeriesId() {
  return (S.lastSeries && seriesById(S.lastSeries) && S.lastSeries) || (seriesById("de-LTB") && "de-LTB") || (S.series[0] ? S.series[0].id : "_other");
}
function blankDraft(pre) {
  return Object.assign({ kind: "issue", author: "", publisher: "", isbn: "", format: "", lang: "", status: "owned", seriesId: defaultSeriesId(), seriesName: "", issue: "", title: "", date: "", pages: "",
    stories: [], grade: "", copies: 1, pricePaid: "", currency: "CHF", purchaseDate: "", source: "", value: "", location: "",
    read: false, forTrade: false, notes: "", coverUrl: "" }, pre || {});
}
VIEWS.add = {
  html() {
    if (!S.draft) {
      const c = S.editing && S.comics.find(x => x.id === S.editing);
      S.draft = c ? JSON.parse(JSON.stringify(c)) : blankDraft(); S.storyEdit = false; S.viewMode = !!c;
      if (!S.draft.stories) S.draft.stories = [];
    }
    const d = S.draft, editing = !!d.id, isBook = d.kind === "book";
    if (S.viewMode && editing) return detailHtml(d);
    const se = isBook ? null : seriesById(d.seriesId);
    const sopts = seriesOptions(d.seriesId, s => s.name + (s.country ? " (" + s.country + ")" : "")) + `<option value="_other"${!se ? " selected" : ""}>New series…</option>`;
    const hint = se && se.numbering === "year" ? "Year/number, e.g. 1985/12, double issue 1985/12-13" : "Number, e.g. 474";
    const catReady = catEntry(se);
    const icode = se && (se.code || (catEntry(se) || {}).code);
    const link = d.inducks ? "https://inducks.org/issue.php?c=" + encodeURIComponent(d.inducks).replace(/%20/g, "+")
      : se && d.issue ? inducksIssueUrl(se, d.issue) : (icode ? "https://inducks.org/publication.php?c=" + encodeURIComponent(icode) : "");
    const grades = '<option value="">Not graded</option>' + GRADES.map(([v, l]) => `<option value="${v}"${d.grade === v ? " selected" : ""}>${l}</option>`).join("");
    const curs = CURRENCIES.map(c => `<option${d.currency === c ? " selected" : ""}>${c}</option>`).join("");
    // one view per story with INDUCKS (title, code, writer, artist) and Duckipedia (German title, original, translator, characters, plot) together
    const storyEdit = S.storyEdit || !d.stories.length;
    const stories = !storyEdit ? d.stories.map(storyView).join("") : d.stories.map((s, i) => `<div class="story" data-i="${i}">
        <label class="st-title"><span class="l">Story title</span><input data-sf="title" value="${esc(s.title)}"></label>
        <label><span class="l">Story code</span><input data-sf="code" class="mono" placeholder="I TL 1234-A" value="${esc(s.code)}"></label>
        <label><span class="l">Writer</span><input data-sf="writer" value="${esc(s.writer)}"></label>
        <label><span class="l">Artist</span><input data-sf="artist" value="${esc(s.artist)}"></label>
        <label><span class="l">Main character</span><input data-sf="hero" list="heroes" value="${esc(s.hero)}"></label>
        <button class="ghost danger" data-del="${i}" aria-label="Remove story" title="Remove story">✕</button></div>`).join("");
    return `
      <div class="row between"><div><h2>${editing ? (isBook ? "Edit book" : "Edit comic") : "Add to archive"}</h2>
      <p class="lede">${editing ? "Change any detail and save." : isBook ? "Type or scan the ISBN and tap “Fill from book databases”, or fill in what you know. Only the title is needed." : "Pick the series and issue, then fill in your copy's details. Fields left empty are fine."}</p></div>
      ${editing ? '<button id="cancel">Back</button>' : ""}</div>
      <div class="card stack">
        <div class="row between">
          <div class="seg" role="group" aria-label="Type"><button type="button" data-kind="issue" aria-pressed="${!isBook}">Comic issue</button><button type="button" data-kind="book" aria-pressed="${isBook && !isNovel(d)}">Comic book</button><button type="button" data-kind="novel" aria-pressed="${isNovel(d)}">Book</button></div>
          <div class="seg" role="group" aria-label="Status"><button type="button" data-st="owned" aria-pressed="${d.status !== "wanted"}">I own it</button><button type="button" data-st="wanted" aria-pressed="${d.status === "wanted"}">Wishlist</button></div></div>
${dupHtml(d)}
${coverOf(d) ? `<div class="coverrow"><img class="cover" data-zoom="${esc(d.id || "")}" src="${esc(coverOf(d))}" alt="Cover, tap to enlarge" onerror="this.closest('.coverrow').hidden=true"></div>` : ""}
${isBook ? `
        <div class="isbnrow">
          <label><span class="l">ISBN</span><input id="f-isbn" class="mono" inputmode="numeric" autocomplete="off" value="${esc(d.isbn)}" placeholder="978-3-…"></label>
          <button id="isbnfill" type="button">Fill from book databases</button>
          <button id="isbnscan" type="button" class="ghost" aria-label="Scan the barcode with the camera">Scan barcode</button>
        </div>
        <div id="bookmsg"></div>
        <div class="grid-form">
          <label class="wide"><span class="l">Title</span><input id="f-title" value="${esc(d.title)}" placeholder="${isNovel(d) ? "e.g. Der kleine Hobbit" : "e.g. Carl Barks: Die Ducks"}"></label>
          <label class="wide"><span class="l">${isNovel(d) ? "Author" : "Author or editor"}</span><input id="f-author" value="${esc(d.author)}" placeholder="${isNovel(d) ? "e.g. J. R. R. Tolkien" : "e.g. Carl Barks, Don Rosa"}"></label>
          <div class="wide row" style="gap:8px"><button class="ghost" id="booksearch" type="button">No ISBN? Search by title and author</button></div>
          ${isNovel(d) ? `<label><span class="l">Original title</span><input id="f-originalTitle" value="${esc(d.originalTitle || "")}" placeholder="if translated"></label>
          <label><span class="l">Translator</span><input id="f-translator" value="${esc(d.translator || "")}"></label>
          ` : ""}
          <label class="wide"><span class="l">Genres</span><input id="f-genre" list="genres" value="${esc(d.genre || "")}" placeholder="e.g. Fantasy, Adventure (separate with commas)"></label>
          <label class="wide"><span class="l">Book series</span>${d.newBookSeries
            ? `<input id="f-seriesName" value="${esc(d.seriesName)}" placeholder="${isNovel(d) ? "Name of the new series, e.g. Harry Potter" : "Name of the new series, e.g. Carl Barks Collection"}">`
            : `<span class="bseries"><button type="button" class="pickbtn wrap" id="f-bseries-btn"><span>${esc(d.seriesName || "No series (single book)")}</span><span class="chev" aria-hidden="true">▾</span></button>${d.seriesName ? '<button type="button" id="f-bseries-x">Single book</button>' : ""}</span><input type="hidden" id="f-seriesName" value="${esc(d.seriesName)}">`}</label>
          <label><span class="l">Volume</span><input id="f-issue" value="${esc(d.issue)}" placeholder="e.g. 12 or 0.5"></label>
          <label><span class="l">Publisher</span><input id="f-publisher" list="publishers" value="${esc(d.publisher)}" placeholder="${isNovel(d) ? "e.g. dtv" : "e.g. Egmont Comic Collection"}"></label>
          <label><span class="l">Year</span><input id="f-date" inputmode="numeric" value="${esc(d.date)}" placeholder="2005"></label>
          <label><span class="l">Format</span><select id="f-format">${["", "Hardcover", "Softcover", "Paperback", "Box set", "E-book", "Audiobook", "Other"].map(v => `<option value="${v}"${d.format === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Language</span><select id="f-lang">${[...new Set(["", "German", "Swedish", "Italian", "English", "French", "Norwegian", "Danish", "Dutch", "Spanish", "Other", d.lang || ""])].map(v => `<option value="${v}"${(d.lang || "") === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Pages</span><input id="f-pages" inputmode="numeric" value="${esc(d.pages)}"></label>
          <label class="wide"><span class="l">Cover image URL</span><input id="f-coverUrl" value="${esc(d.coverUrl)}" placeholder="Filled in by the lookup, or paste a link"></label>
        </div>
        <datalist id="genres">${[...new Set(["Novel", "Novella", "Short Stories", "Drama", "Poetry", "Fantasy", "Science Fiction", "Crime", "Thriller", "Horror", "Adventure", "Historical Fiction", "Romance", "Humour", "Children's", "Young Adult", "Non-fiction", "Biography", "History", "Mythology", "Fairy Tales"].concat(S.comics.map(c => c.genre).filter(Boolean)))].map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
        <datalist id="bookseries">${[...new Set(S.comics.filter(c => c.kind === "book" && isNovel(c) === isNovel(d) && c.seriesName).map(c => c.seriesName))].sort().map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
        <datalist id="publishers">${[...new Set(["Egmont Ehapa", "Egmont Comic Collection", "Panini", "Giunti", "Mondadori", "Egmont Kärnan", "Fantagraphics"].concat(S.comics.map(c => c.publisher).filter(Boolean)))].map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
` : `
        <div class="lookup">
          <label><span class="l">Series</span><button type="button" class="pickbtn" id="f-series-btn"><span>${esc(se ? seriesLabel(se) : "New series…")}</span><span class="chev" aria-hidden="true">▾</span></button><select id="f-series" class="visually-hidden" tabindex="-1" aria-hidden="true">${sopts}</select></label>
          <label><span class="l">Issue</span><input id="f-issue" placeholder="${esc(hint)}" value="${esc(d.issue)}"></label>
          <button id="lookup" ${catReady ? "" : "disabled"}>Fill from INDUCKS</button>
        </div>
        <div class="row" style="gap:8px"><button class="ghost" id="comicscan" type="button">Scan barcode or ISBN</button></div>
        <div id="bookmsg"></div>
        ${!se ? `<label><span class="l">New series name</span><input id="f-seriesName" value="${esc(d.seriesName)}" placeholder="e.g. Donald Duck Extra"></label>` : ""}
        <p class="small muted" style="margin:0">${catReady ? "Fills in title, date and stories from INDUCKS." : S.catalogue ? "This series isn't in the INDUCKS catalogue." : "The INDUCKS catalogue isn't loaded yet, so auto-fill is off for now."}
          ${!isBook && window.Duckipedia && Duckipedia.candidates(dkSeries(se), { issueLabel: "1" }).length ? `<button class="ghost" id="dkfetch" type="button">${d.duckipedia ? "Refresh" : "Get"} details from Duckipedia</button>` : ""}
          <span id="ilink">${link ? ` <a href="${esc(link)}" target="_blank" rel="noopener">Open this ${d.issue ? "issue" : "series"} on INDUCKS</a>` : ""}</span></p>
        <div class="grid-form">
          <label class="wide"><span class="l">Issue title</span><input id="f-title" value="${esc(d.title)}" placeholder="e.g. Der Schatz des Goldenen Helms"></label>
          <label><span class="l">Publication date</span><input id="f-date" value="${esc(niceDate(d.date))}" placeholder="TT.MM.JJJJ or MM.JJJJ"></label>
          <label><span class="l">Pages</span><input id="f-pages" inputmode="numeric" value="${esc(d.pages)}"></label>
          <label><span class="l">Format</span><select id="f-format">${["", "Heft", "Taschenbuch / Pocket", "Softcover", "Hardcover", "Album", "Other"].map(v => `<option value="${v}"${(d.format || "") === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label class="wide"><span class="l">Genres</span><input id="f-genre" list="genres" value="${esc(d.genre || "")}" placeholder="${esc(storyGenres(d) ? "From the stories: " + storyGenres(d) : "e.g. Humour, Adventure (separate with commas)")}"></label>
          <label><span class="l">Publisher</span><input id="f-publisher" list="publishers" value="${esc(d.publisher)}" placeholder="e.g. Egmont Ehapa"></label>
          <label><span class="l">ISBN or barcode</span><input id="f-isbn" class="mono" inputmode="numeric" value="${esc(d.isbn || (d.barcode ? d.barcode + (d.barcodeExt ? " " + d.barcodeExt : "") : ""))}" placeholder="optional"></label>
          <label class="wide"><span class="l">Cover image URL</span><input id="f-coverUrl" value="${esc(d.coverUrl)}" placeholder="Link to a cover scan (optional)"></label>
        </div>
        <datalist id="publishers">${[...new Set(S.comics.filter(c => c.seriesId === d.seriesId).map(c => c.publisher).concat(S.comics.map(c => c.publisher)).filter(Boolean))].slice(0, 40).map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
`}
      </div>
      ${d.duckipedia ? duckipediaCard(d) : ""}
      <div class="card stack">
        <div class="row between"><h3>Stories${d.stories.length ? ` <span class="muted small">${d.stories.length}</span>` : ""}</h3><span class="row" style="gap:6px">${d.stories.length ? `<button id="editstories" class="ghost" type="button">${storyEdit ? "Done" : "Edit stories"}</button>` : ""}<button id="addstory">Add story</button></span></div>
        ${d.stories.length ? '<div class="stories">' + stories + '</div>' : '<p class="muted small" style="margin:0">No stories listed yet. Add them so you can search by story, writer or artist later.</p>'}
        <datalist id="heroes"><option>Donald Duck</option><option>Micky Maus / Topolino</option><option>Dagobert / Zio Paperone / Joakim</option><option>Phantomias / Paperinik</option><option>Daniel Düsentrieb / Archimede</option><option>Goofy / Pippo / Långben</option><option>Gustav Gans / Gastone / Alexander Lukas</option><option>Die Panzerknacker / Bassotti / Björnligan</option><option>Tick, Trick und Track</option></datalist>
      </div>
      ${d.status === "wanted" ? `
      <div class="card stack"><h3>Wishlist notes</h3>
        <div class="grid-form"><label><span class="l">Maximum price</span><input id="f-pricePaid" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.pricePaid))}"></label>
        <label><span class="l">Currency</span><select id="f-currency">${curs}</select></label>
        <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label></div></div>` : `
      <div class="card stack"><div class="row between"><h3>Your copy</h3><span class="row" style="gap:10px">${heartHtml(d.fav, 'id="f-fav"')}${starsHtml(d.rating, 'id="f-rating"')}</span></div>
        <div class="grid-form">
          <label><span class="l">Condition</span><select id="f-grade">${grades}</select></label>
          <label><span class="l">Copies</span><input id="f-copies" type="number" min="1" value="${esc(d.copies || 1)}"></label>
          <label><span class="l">Storage location</span><input id="f-location" value="${esc(d.location)}" placeholder="Box 3, shelf B"></label>
          <label class="check wide" style="min-height:0"><input id="f-inlot" type="checkbox"${d.lotId ? " checked" : ""}> Bought as a lot: several ${isBook ? "books or comics" : "comics"} for one price</label>
          ${d.lotId ? lotFields(d) : `<label><span class="l">Price paid</span><input id="f-pricePaid" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.pricePaid))}"></label>`}
          <label><span class="l">Currency</span><select id="f-currency">${curs}</select></label>
          <label class="wide"><span class="l">Checked value <span class="muted">(sold or collector price)</span></span><span class="row valrow" style="gap:6px;flex-wrap:nowrap"><input id="f-valueChecked" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.valueChecked))}"><select id="f-valueCur" aria-label="Currency of the checked value" style="width:auto">${CURRENCIES.map(x => `<option${(d.valueCur || d.currency || "CHF") === x ? " selected" : ""}>${x}</option>`).join("")}</select></span></label>
          <label><span class="l">Own estimate</span><input id="f-value" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.value))}"></label>
          <div class="wide small valueline">${(v => v ? `Value: <strong>${money(v.amount * (d.copies || 1), v.cur)}</strong> · ${v.how === "checked" ? "checked price" : v.how === "table" ? "from the price table (" + esc([v.rule.from, v.rule.to].filter(Boolean).join("–") || "all") + ": " + money(v.rule.price, v.rule.cur) + " × condition " + gradeFactor(d.grade) + (d.facsimile ? " × facsimile " + FACSIMILE_FACTOR : "") + ")" : "your own estimate"}` : "No value yet.")(valueOf(d))}
${d.kind === "book" ? `<br>Sold prices: ${soldLinks(d)}` : collectorLinks(d.seriesId, d) ? `<br>Collector prices: ${collectorLinks(d.seriesId, d)}` : ""}</div>
          <label><span class="l">Purchase date <button type="button" class="ghost tiny" id="today">today</button></span><input id="f-purchaseDate" inputmode="numeric" value="${esc(niceDate(d.purchaseDate))}" placeholder="TT.MM.JJJJ"></label>
          <label><span class="l">Bought from</span><input id="f-source" value="${esc(d.source)}" placeholder="Comic-Börse Zürich, Ricardo…"></label>
          <label class="check"><input id="f-read" type="checkbox"${d.read ? " checked" : ""}> Read</label>
          ${d.read ? `<label><span class="l">Read on</span><input id="f-readDate" inputmode="numeric" value="${esc(niceDate(d.readDate || ""))}" placeholder="${d.readDate ? "TT.MM.JJJJ" : "not recorded"}"></label>` : ""}
          <label class="check"><input id="f-forTrade" type="checkbox"${d.forTrade ? " checked" : ""}> Available for trade</label>
          ${isBook ? "" : `<label class="check wide"><input id="f-facsimile" type="checkbox"${d.facsimile ? " checked" : ""}> Facsimile or reprint (doesn't count as the original in the gap grid)</label>`}
          <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label>
          <label class="wide"><span class="l">Special about my copy</span><textarea id="f-special" rows="2" placeholder="Misprint, missing page, signed, first print…">${esc(d.special || "")}</textarea></label>
        </div></div>`}
      <div class="row">
        <button class="primary" id="save"${S.db ? "" : " disabled"}>${editing ? "Save changes" : "Save to archive"}</button>
        ${!editing ? '<button id="saveNext"' + (S.db ? "" : " disabled") + '>' + (isBook ? "Save and add next volume" : "Save and add next issue") + '</button>' : ""}
        ${!editing && !isBook ? '<button class="ghost" id="skipNext" type="button">Skip this number</button>' : ""}
        ${editing ? '<button class="danger" id="del">Delete</button>' : ""}
      </div>
      <div id="confirmBox"></div>`;
  },
  bind() {
    const d = S.draft;
    if (S.viewMode && d && d.id) return bindDetail(d);
    bindAmounts();
    $("#today") && ($("#today").onclick = () => { $("#f-purchaseDate").value = niceDate(todayIso()); });
    $("#f-fav") && ($("#f-fav").onclick = e => { d.fav = !d.fav; const b = e.currentTarget; b.classList.toggle("on", d.fav); b.textContent = d.fav ? "♥" : "♡"; b.setAttribute("aria-pressed", d.fav); });
    bindStars($("#app"), (v, box) => { if (box.id === "f-rating") d.rating = v; });
    refreshDup(d);
    ["issue", "isbn", "title", "author", "seriesName"].forEach(k => { const el = $("#f-" + k); if (el) el.addEventListener("input", () => { d[k] = el.value; refreshDup(d); }); });
    // ticking "Read" notes today's date (it can be changed); unticking clears it
    $("#f-read") && ($("#f-read").onchange = e => { grab(); d.readDate = e.target.checked ? (d.readDate || todayIso()) : ""; renderKeep(); });
    $("#f-inlot") && ($("#f-inlot").onchange = e => {
      grab();
      if (e.target.checked) { const last = recentLots()[0]; d.lotId = "new"; d.lotTotal = d.lotTotal || ""; if (last && daysSince(last.created) < 1) { d.lotId = last.id; d.lotTotal = last.total; d.currency = last.currency; } }
      else { d.lotId = ""; d.lotTotal = ""; }
      render(); $("#f-inlot") && $("#f-inlot").scrollIntoView({ block: "center" });
    });
    $("#f-lot") && ($("#f-lot").onchange = e => { grab(); d.lotId = e.target.value; const l = lotInfo(d.lotId); if (l) { d.lotTotal = l.total; d.currency = l.currency; if (!d.source) d.source = l.source; if (!d.purchaseDate) d.purchaseDate = l.date; } else d.lotTotal = ""; render(); });
    // update the "about x each" line while typing, without redrawing the form (a redraw would swallow the Save tap)
    $("#f-lotTotal") && ($("#f-lotTotal").oninput = e => { const t = parseAmt(e.target.value), w1 = d.kind === "book" ? "book" : "comic", w2 = w1 + "s", el = $("#lotper"), n = +(el && el.dataset.n) || 1; if (el) el.textContent = t === 0 ? `A free lot: ${n === 1 ? "this " + w1 + " gets" : "all " + n + " " + w2 + " get"} the price 0.00.` : typeof t === "number" && t > 0 ? `With this one: ${n} ${n === 1 ? w1 : w2}, about ${fmt2(t / n)} each. The app splits the price to the cent and adjusts it when more ${w2} join the lot.` : "Enter what you paid for all of them together (0 if they were free). Add the others with “Save and add next”, which keeps the lot."; });
    document.querySelectorAll(".lotinfo [data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; render(); window.scrollTo(0, 0); });
    $("#isbnfill") && ($("#isbnfill").onclick = () => fillFromIsbn(d, grab));
    $("#comicscan") && ($("#comicscan").onclick = async () => {
      grab();
      try { const hit = await scanBarcode({ ext: true }); if (hit) await comicFromCode(d, hit.code, hit.ext); }
      catch (e) { bookMsg('<div class="banner warn">' + (e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "The camera isn't allowed for this app. Allow it in the browser's site settings, then try again." : "The camera couldn't start. Type the number instead.") + '</div>'); }
    });
    $("#booksearch") && ($("#booksearch").onclick = () => searchBooks(d, grab));
    $("#f-isbn") && ($("#f-isbn").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); fillFromIsbn(d, grab); } });
    $("#isbnscan") && ($("#isbnscan").onclick = async () => {
      grab();
      try {
        const hit = await scanBarcode(); if (!hit) return; const code = hit.code;
        if (!/^97[89]/.test(code)) { bookMsg('<div class="banner warn">That barcode (' + esc(code) + ') isn\'t an ISBN. Books have one starting with 978 or 979; try the other barcode, or type the ISBN.</div>'); return; }
        d.isbn = code; $("#f-isbn").value = code; fillFromIsbn(d, grab);
      } catch (e) {
        bookMsg('<div class="banner warn">' + (e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "The camera isn't allowed for this app. Allow it in the browser's site settings (the lock or ⓘ next to the address), then try again." : e && e.message === "nocamera" ? "This browser doesn't give web apps access to the camera. Type the ISBN instead." : "The camera couldn't start: " + esc(e && (e.message || e.name) || "unknown") + ". Type the ISBN instead.") + '</div>');
      }
    });
    const grab = () => {
      ["issue", "title", "date", "pages", "coverUrl", "grade", "copies", "location", "pricePaid", "currency", "value", "valueChecked", "valueCur", "purchaseDate", "source", "notes", "special", "seriesName", "author", "publisher", "isbn", "format", "lang", "genre", "translator", "originalTitle", "lotTotal"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.value; });
      if (d.kind !== "book") d.date = isoDate(d.date);
      d.purchaseDate = isoDate(d.purchaseDate);
      const rd = $("#f-readDate"); if (rd) d.readDate = isoDate(rd.value);
      ["read", "forTrade", "facsimile"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.checked; });
      document.querySelectorAll(".story").forEach(row => { const s = d.stories[+row.dataset.i]; row.querySelectorAll("[data-sf]").forEach(inp => s[inp.dataset.sf] = inp.value); });
    };
    $("#cancel") && ($("#cancel").onclick = () => goBack());
    document.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { grab(); d.status = b.dataset.st; render(); });
    document.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => {
      grab();
      const k = b.dataset.kind, kind = k === "issue" ? "issue" : "book", bt = k === "novel" ? "book" : "";
      if (d.kind === kind && (d.bookType || "") === bt) return;
      d.bookType = bt; if (d.kind === kind) { render(); return; }
      d.kind = kind;
      if (d.kind === "book") { d.seriesId = "_book"; if (seriesById(d.seriesName) || S.series.some(x => x.name === d.seriesName)) d.seriesName = ""; }
      else if (!seriesById(d.seriesId)) { d.seriesId = defaultSeriesId(); d.seriesName = ""; }
      render();
    });
    $("#f-series") && ($("#f-series").onchange = e => { grab(); d.seriesId = e.target.value; rememberSeries(d.seriesId); render(); });
    // book series: the same searchable picker; choosing a comic series turns the entry into a comic issue of it
    $("#f-bseries-btn") && ($("#f-bseries-btn").onclick = async () => {
      const k = await pickSeries({ current: d.seriesName ? "book:" + d.seriesName : "", books: true, allowNew: true, title: "Series for this book" });
      if (!k) return;
      grab();
      if (k === "_other") { d.newBookSeries = true; d.seriesName = ""; render(); setTimeout(() => $("#f-seriesName") && $("#f-seriesName").focus(), 50); return; }
      if (k.startsWith("book:")) { d.seriesName = k.slice(5); d.newBookSeries = false; render(); return; }
      const se = seriesById(k); if (!se) return;
      d.kind = "issue"; d.seriesId = se.id; d.seriesName = se.name; d.newBookSeries = false;
      render(); toast(se.name + " is a comic series: this is now a comic issue in it. Enter the issue number, then Fill from INDUCKS.");
    });
    // a single book has no series, so no volume number either
    $("#f-bseries-x") && ($("#f-bseries-x").onclick = () => { grab(); d.seriesName = ""; d.issue = ""; render(); });
    $("#f-series-btn") && ($("#f-series-btn").onclick = async () => { const k = await pickSeries({ current: d.seriesId, allowNew: true, title: "Series" }); if (k) { grab(); d.seriesId = k; render(); } });
    $("#f-issue").oninput = e => {
      d.issue = e.target.value;
      const se = seriesById(d.seriesId), l = $("#ilink");
      const ic = se && (se.code || (catEntry(se) || {}).code);
      if (se && l) l.innerHTML = ic ? ` <a href="${esc(d.issue ? inducksIssueUrl(se, d.issue) : "https://inducks.org/publication.php?c=" + encodeURIComponent(ic))}" target="_blank" rel="noopener">Open this ${d.issue ? "issue" : "series"} on INDUCKS</a>` : "";
    };
    $("#editstories") && ($("#editstories").onclick = () => { grab(); S.storyEdit = !(S.storyEdit || !d.stories.length); renderKeep(); });
    $("#addstory").onclick = () => { grab(); S.storyEdit = true; d.stories.push({ title: "", code: "", writer: "", artist: "", hero: "" }); render(); const rows = document.querySelectorAll(".story input"); rows.length && rows[rows.length - 5].focus(); };
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { grab(); d.stories.splice(+b.dataset.del, 1); render(); });
    $("#dkfetch") && ($("#dkfetch").onclick = async () => {
      grab(); const btn = $("#dkfetch");
      const se0 = seriesById(d.seriesId), probe = Object.assign({}, d, { issueLabel: d.id && d.issueLabel && String(d.issue).trim() === String((S.comics.find(x => x.id === d.id) || {}).issue || "").trim() ? d.issueLabel : parseIssue(se0, d.issue).label });
      if (!Duckipedia.candidates(dkSeries(se0), probe).length) { toast("Enter the issue number first"); $("#f-issue").focus(); return; }
      btn.disabled = true; btn.textContent = "Asking Duckipedia…";
      try {
        const res = await Duckipedia.fetchIssue(dkSeries(se0), probe);
        if (!res) { toast("Duckipedia has no page for this issue"); btn.disabled = false; btn.textContent = "Get details from Duckipedia"; return; }
        S.draft = Duckipedia.merge(d, res); render();
        toast("Duckipedia details added (" + res.stories.length + " stories). Tap Save to keep them.");
      } catch (e) { toast(navigator.onLine ? "Duckipedia didn't answer. Try again later." : "Duckipedia needs an internet connection."); btn.disabled = false; btn.textContent = "Get details from Duckipedia"; }
    });
    $("#lookup") && ($("#lookup").onclick = async () => {
      grab(); const se = seriesById(d.seriesId); if (!se) return;
      const hit = await catalogueLookup(se, d.issue);
      if (!hit) {
        // the number exists only as variants (LTB 546A and 546B): offer them
        const entry = catEntry(se), file = entry && await catalogueFile(entry), p = parseIssue(se, d.issue);
        const vars = file ? Object.keys(file.issues || {}).filter(k => variantOf(k) && sameSlot(k, p.label)) : [];
        if (vars.length) {
          $("#confirmBox").innerHTML = `<div class="confirm"><span>${esc(se.short || se.name)} ${esc(p.label)} came out in ${vars.length} variants. Which one is it?</span>${vars.map(k => `<button data-var="${esc(k)}">${esc(k)}${file.issues[k].t ? " · " + esc(String(file.issues[k].t).slice(0, 40)) : ""}</button>`).join("")}<button class="ghost" id="varNo">Cancel</button></div>`;
          $("#varNo").onclick = () => { $("#confirmBox").innerHTML = ""; };
          document.querySelectorAll("[data-var]").forEach(b => b.onclick = () => { $("#confirmBox").innerHTML = ""; d.issue = b.dataset.var; $("#f-issue").value = d.issue; $("#lookup").click(); });
          $("#confirmBox").scrollIntoView({ block: "center" });
          return;
        }
        toast("INDUCKS has no " + (se.short || se.name) + " " + (d.issue || "") + ". Check the number."); return;
      }
      if (hit.ic) {   // compact catalogue format
        d.title = d.title || hit.t || ""; d.date = hit.d || d.date; d.pages = hit.pg || d.pages; if (!d.coverUrl && hit.cv) d.coverUrl = inducksImg(hit.cv);
        d.stories = (hit.s || []).map(x => ({ title: x.t || "", code: x.c || "", writer: x.w || "", artist: x.a || "", hero: x.h || "" }));
        d.inducks = hit.ic; render(); toast("Filled from INDUCKS: " + d.stories.length + (d.stories.length === 1 ? " story" : " stories")); return;
      }
      d.title = d.title || hit.title || ""; d.date = hit.date || d.date; d.pages = hit.pages || d.pages; d.coverUrl = d.coverUrl || hit.cover || "";
      d.stories = (hit.stories || []).map(s => ({ title: s.title || "", code: s.code || "", writer: s.writer || "", artist: s.artist || "", hero: s.hero || "" }));
      d.inducks = hit.issuecode || ""; render(); toast("Filled from INDUCKS");
    });
    const doSave = async (next) => {
      grab();
      if (d.kind === "book") return saveBook(next);
      // the ISBN-or-barcode field: an ISBN, or a magazine barcode with its add-on
      { const raw = String(d.isbn || "").trim(), digits = raw.replace(/[^0-9X ]/gi, "").trim();
        if (!raw) { d.isbn = ""; }
        else if (window.Books && Books.normalize(raw)) { d.isbn = Books.normalize(raw); d.barcode = ""; d.barcodeExt = ""; }
        else { const m = /^(\d{8,13})(?:\s+(\d{2}|\d{5}))?$/.exec(digits); if (m) { d.barcode = m[1]; d.barcodeExt = m[2] || d.barcodeExt || ""; d.isbn = ""; } } }
      const se = seriesById(d.seriesId);
      d.issue = String(d.issue || ""); d.seriesName = String(d.seriesName || "");
      if (!d.issue.trim() && se && se.numbering === "year" && !(d.id && !String((S.comics.find(x => x.id === d.id) || {}).issue || "").trim())) { toast("Enter an issue number first"); $("#f-issue").focus(); return; }
      if (!se && !d.seriesName.trim()) { toast("Enter the series name"); return; }
      const orig = d.id && S.comics.find(x => x.id === d.id);
      const unchanged = orig && orig.seriesId === d.seriesId && String(orig.issue || "").trim() === d.issue.trim() && orig.issueLabel != null;
      const p = unchanged ? { label: orig.issueLabel, sort: orig.issueSort, year: orig.issueYear, n: orig.issueNum } : parseIssue(se, d.issue);
      const yearOnly = !unchanged && /^\s*(\d{4})\s*\/\s*\?\s*$/.exec(d.issue);
      if (yearOnly) { p.year = +yearOnly[1]; p.label = yearOnly[1] + "/?"; p.n = null; p.sort = p.year * 1000 + (d.date && d.date.length >= 7 ? (+d.date.slice(5, 7) - 1) * 4.3 : 0); }
      if (!unchanged && se && se.numbering === "year" && !p.year && d.issue.trim()) { toast("For " + (se.short || se.name) + " enter year and number, e.g. 1985/12, or 1985/? if you don't know the number"); $("#f-issue").focus(); return; }
      let target = se;
      if (!target) { target = findSeriesByName(d.seriesName.trim()) || newSeriesFor(d.seriesName.trim(), []); try { await saveSeries(); } catch (e) { toast(errText(e)); return; } }
      const c = Object.assign({}, d, {
        seriesId: target.id, seriesName: target.name, issueLabel: p.label, issueSort: p.sort,
        issueYear: p.year || null, issueNum: p.n, copies: Math.max(1, parseInt(d.copies, 10) || 1),
        pricePaid: parseAmt(d.pricePaid),
        value: parseAmt(d.value), valueChecked: parseAmt(d.valueChecked),
        stories: d.stories.filter(s => s.title || s.code || s.writer || s.artist || s.hero)
      });
      let moved = false, alsoGone = [];
      if (!d.id && !c.facsimile && p.label && !/\?/.test(p.label)) {
        // same number, or overlapping squares (a double issue 2016-11-12 against 2016/11 or 2016/12)
        const same = S.comics.filter(x => x.kind !== "book" && !x.facsimile && x.seriesId === target.id && sameSlot(x.issueLabel || x.issue, p.label));
        const wishes = same.filter(x => x.status === "wanted"), wish = wishes.find(x => (x.issueLabel || x.issue) === p.label) || wishes[0];
        const have = same.find(x => x.status !== "wanted" && (x.issueLabel || x.issue) === p.label) || same.find(x => x.status !== "wanted");
        const haveLab = have && (have.issueLabel || have.issue), exact = haveLab === p.label;
        const tag = (target.short || target.name) + " " + p.label;
        if (c.status !== "wanted" && wish && !have) {
          // bought something from the wishlist: that entry becomes owned instead of a second one
          const sameNo = (wish.issueLabel || wish.issue) === p.label;
          ["title", "date", "pages", "inducks", "duckipedia", "coverUrl"].forEach(k => { if (!c[k] && wish[k] && sameNo) c[k] = wish[k]; });
          if (!c.stories.length && (wish.stories || []).length && sameNo) c.stories = wish.stories;
          c.id = wish.id; c.createdAt = wish.createdAt; moved = true;
          alsoGone = wishes.filter(x => x !== wish).map(x => x.id);   // a double issue also clears the other number's wish
        } else if (!S.dupOk && (have || (wish && c.status === "wanted"))) {
          const box = $("#confirmBox");
          box.innerHTML = have
            ? `<div class="confirm"><span>${exact ? esc(tag) + " is already in your collection" + (c.status === "wanted" ? "" : " (" + (have.copies || 1) + (have.copies > 1 ? " copies" : " copy") + ")") : esc(tag) + " overlaps with " + esc((target.short || target.name) + " " + haveLab) + ", which is already in your collection"}.</span>
                ${c.status === "wanted" ? `<button class="primary" id="dupWant">Add to wishlist anyway</button>` : exact ? `<button class="primary" id="dupCopy">Count as one more copy</button><button id="dupSep">Save as separate entry</button>` : `<button class="primary" id="dupSep">Save anyway</button>`}
                ${next ? `<button id="dupSkip">Skip to next number</button>` : ""}<button class="ghost" id="dupNo">Cancel</button></div>`
            : `<div class="confirm"><span>${esc(tag)} is already on your wishlist.</span>${next ? `<button class="primary" id="dupSkip">Skip to next number</button>` : ""}<button class="ghost" id="dupNo">Cancel</button></div>`;
          box.scrollIntoView({ block: "center" });
          $("#dupNo").onclick = () => { box.innerHTML = ""; };
          $("#dupSkip") && ($("#dupSkip").onclick = () => { box.innerHTML = ""; skipToNext(); });
          $("#dupWant") && ($("#dupWant").onclick = () => { box.innerHTML = ""; S.dupOk = true; doSave(next).finally(() => { S.dupOk = false; }); });
          $("#dupSep") && ($("#dupSep").onclick = () => { box.innerHTML = ""; S.dupOk = true; doSave(next).finally(() => { S.dupOk = false; }); });
          $("#dupCopy") && ($("#dupCopy").onclick = async () => {
            box.innerHTML = "";
            try { await saveComic(Object.assign({}, have, { copies: (have.copies || 1) + 1 })); toast(tag + ": now " + ((have.copies || 1) + 1) + " copies"); next ? skipToNext() : goBack(); }
            catch (e) { toast(errText(e)); }
          });
          return;
        }
      }
      const btns = document.querySelectorAll("#save, #saveNext, #skipNext"); btns.forEach(b => b.disabled = true);
      try {
        const before = d.id ? S.comics.find(x => x.id === d.id) : null;
        if (!prepareLot(d, c, before)) { btns.forEach(b => b.disabled = false); return; }
        const saved = await saveComic(c);
        const lotNote = await afterLotSave(saved, before);
        for (const id of alsoGone) await deleteComic(id);
        if (saved.barcode && saved.seriesId) {
          S.barcodes = Object.assign({}, S.barcodes, { [saved.barcode]: saved.seriesId }); setConfig("barcodes", S.barcodes).catch(() => {});
          if (saved.issueYear) { S.barcodeYears = Object.assign({}, S.barcodeYears, { [saved.barcode]: saved.issueYear }); setConfig("barcodeYears", S.barcodeYears).catch(() => {}); }
        }
        rememberSeries(saved.seriesId);
        if (S.lastSeries !== saved.seriesId) { S.lastSeries = saved.seriesId; setConfig("lastSeries", saved.seriesId).catch(() => {}); }
        toast((moved ? (target.short || target.name) + " " + p.label + " moved from your wishlist to your collection" : c.status === "wanted" ? "Added to wishlist" : "Saved to archive") + lotNote);
        if (next) {
          S.lastSaved = (target.short || target.name) + " " + p.label;
          goNext(c, p, se);
        } else goBack(() => { S.col = { p: publisherOf(saved), g: groupOf(saved), s: seriesKeyOf(saved) }; S.filters.q = ""; S.filters.status = saved.status === "wanted" ? "wanted" : "owned"; nav("collection"); });
      } catch (e) { toast(errText(e)); btns.forEach(b => b.disabled = false); }
    };
    // the next number in a run, keeping series, status, place and date of purchase
    const goNext = (c, p, se) => {
      const per = se ? (+se.perYear || 52) : 52;
      const dbl = /^(\d{4})-\d{1,3}-(\d{1,3})$/.exec(p.label || "");
      if (dbl) p = Object.assign({}, p, { n: +dbl[2] });   // after 2016-11-12 comes 2016/13
      const nextIssue = se && se.numbering === "year" && p.year ? (p.n >= per ? (p.year + 1) + "/01" : p.year + "/" + String(p.n + 1).padStart(2, "0")) : (p.n != null ? String(p.n + 1) : "");
      S.editing = null;
      S.draft = blankDraft({ seriesId: c.seriesId, seriesName: c.seriesName, status: c.status, issue: nextIssue, currency: c.currency, source: c.source, purchaseDate: c.purchaseDate, location: c.location, lotId: c.lotId || "", lotTotal: c.lotId ? c.lotTotal : "", pricePaid: c.lotId ? "" : c.pricePaid });
      render(); $("#f-issue") && $("#f-issue").focus();
    };
    // skip a number you don't have: move on without saving anything
    const skipToNext = () => {
      grab(); const se0 = seriesById(d.seriesId);
      const p0 = parseIssue(se0, d.issue);
      if (p0.n == null) { toast("Enter an issue number first"); return; }
      const skipped = (se0 ? se0.short || se0.name : "") + " " + p0.label;
      goNext(Object.assign({}, d, { seriesId: d.seriesId, seriesName: d.seriesName }), p0, se0);
      toast(skipped + " skipped, nothing saved");
    };
    $("#skipNext") && ($("#skipNext").onclick = skipToNext);
    const saveBook = async (next) => {
      ["title", "issue", "seriesName", "isbn"].forEach(k => d[k] = String(d[k] || ""));
      if (!d.title.trim()) { toast("Enter the book title first"); $("#f-title").focus(); return; }
      const vol = d.issue.trim().replace(/^(\d+),(\d+)$/, "$1.$2"), vm = vol.match(/\d+(\.\d+)?/);
      const c = Object.assign({}, d, {
        kind: "book", seriesId: "_book", seriesName: d.seriesName.trim(), title: d.title.trim(), issue: vol, issueLabel: vol,
        issueSort: vm ? +vm[0] : 1e9, issueYear: null, issueNum: vm ? +vm[0] : null, copies: Math.max(1, parseInt(d.copies, 10) || 1),
        isbn: d.isbn.trim(), pricePaid: parseAmt(d.pricePaid), value: parseAmt(d.value), valueChecked: parseAmt(d.valueChecked),
        stories: d.stories.filter(s => s.title || s.code || s.writer || s.artist || s.hero)
      });
      const btns = document.querySelectorAll("#save, #saveNext"); btns.forEach(b => b.disabled = true);
      try {
        const before = d.id ? S.comics.find(x => x.id === d.id) : null;
        if (!prepareLot(d, c, before)) { btns.forEach(b => b.disabled = false); return; }
        const saved = await saveComic(c);
        const lotNote = await afterLotSave(saved, before);
        toast((c.status === "wanted" ? "Book added to wishlist" : "Book saved") + lotNote);
        if (next) {
          S.editing = null;
          S.draft = blankDraft({ kind: "book", bookType: c.bookType || "", seriesId: "_book", seriesName: c.seriesName, issue: vm ? String(Math.floor(+vm[0]) + 1) : "", author: c.author, publisher: c.publisher, format: c.format, lang: c.lang, status: c.status, currency: c.currency, source: c.source, purchaseDate: c.purchaseDate, location: c.location, lotId: c.lotId || "", lotTotal: c.lotId ? c.lotTotal : "", pricePaid: c.lotId ? "" : c.pricePaid });
          render(); $("#f-title") && $("#f-title").focus();
        } else goBack(() => { S.col = isNovel(saved) ? (saved.seriesName ? { p: NOVEL_PUB, g: BOOK_GROUP, s: seriesKeyOf(saved) } : {}) : { p: publisherOf(saved), g: BOOK_GROUP, s: seriesKeyOf(saved) }; if (isNovel(saved)) S.colTab = "books"; S.filters.q = ""; S.filters.status = saved.status === "wanted" ? "wanted" : "owned"; nav("collection"); });
      } catch (e) { toast(errText(e)); btns.forEach(b => b.disabled = false); }
    };
    $("#save").onclick = () => doSave(false);
    $("#saveNext") && ($("#saveNext").onclick = () => doSave(true));
    $("#del") && ($("#del").onclick = () => {
      $("#confirmBox").innerHTML = '<div class="confirm"><span>Delete this ' + (d.kind === "book" ? "book" : "comic") + ' from your archive? This can\'t be undone.</span><button class="danger" id="yesdel">Delete</button><button id="nodel">Keep it</button></div>';
      $("#nodel").onclick = () => $("#confirmBox").innerHTML = "";
      $("#yesdel").onclick = async () => { try { const lot = (S.comics.find(x => x.id === d.id) || {}).lotId; await deleteComic(d.id); if (lot) await rebalanceLot(lot); toast("Deleted"); goBack(); } catch (e) { toast(errText(e)); } };
    });
  }
};

// ---- Match with INDUCKS ----
VIEWS.match = {
  html() {
    if (!S.catalogue) return '<h2>Match with INDUCKS</h2><div class="empty"><h3>No INDUCKS catalogue yet</h3><p>Update the app while online to get it.</p></div>';
    if (!S.matchRun) return '<div><h2>Match with INDUCKS</h2><p class="lede">Looking for your comics in INDUCKS…</p></div><div class="empty"><h3>Checking…</h3></div>';
    const R = S.matchRun;
    const sure = R.items.filter(x => x.sure), check = R.items.filter(x => !x.sure && x.label), open = R.items.filter(x => !x.label && !x.sure);
    const row = x => {
      const c = x.c, se = seriesById(c.seriesId);
      const opts = [`<option value="">Don't match</option>`].concat((x.options || []).map(k => {
        const h = x.file.issues[k], first = (h.s || []).slice(0, 2).map(s => s.t).filter(Boolean).join(" / ");
        return `<option value="${esc(k)}"${k === x.label ? " selected" : ""}>${esc(k)} · ${esc(niceDate(h.d))}${first ? " · " + esc(first.slice(0, 60)) : ""}</option>`;
      })).join("");
      return `<div class="matchrow"><div style="min-width:0"><div class="t">${esc((se ? se.short || se.name : c.seriesName) + " " + (c.issueLabel || c.issue || ""))}${c.title ? " · " + esc(c.title) : ""}</div>
        <div class="s">${esc([niceDate(c.date), x.how].filter(Boolean).join(" · "))}</div></div>
        <label><span class="l">INDUCKS issue</span><select data-mid="${esc(c.id)}">${opts}</select></label></div>`;
    };
    const chosen = R.items.filter(x => x.label).length;
    return `
      <div><h2>Match with INDUCKS</h2><p class="lede">Matched comics get INDUCKS's issue number, date and full story list with writers and artists. Your own details (condition, price, notes and so on) stay as they are.</p></div>
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(105px,1fr))">
        <div class="card stat"><div class="v">${sure.length}</div><div class="k">certain matches</div></div>
        <div class="card stat"><div class="v">${check.length}</div><div class="k">likely, please check</div></div>
        <div class="card stat"><div class="v">${open.length}</div><div class="k">not found</div></div>
      </div>
      ${check.length ? `<div class="card stack"><h3>Please check</h3><p class="small muted" style="margin:0">Each one has a suggestion. Change it if it's wrong, or choose "Don't match".</p>${check.map(row).join("")}</div>` : ""}
      ${open.length ? `<div class="card stack"><h3>Not found</h3><p class="small muted" style="margin:0">Pick the issue if you know it. Those left on "Don't match" stay as they are.</p>${open.map(row).join("")}</div>` : ""}
      ${sure.length ? `<details class="card"><summary><strong>${sure.length} certain matches</strong> <span class="small muted">same number or exact cover date</span></summary><div class="stack" style="margin-top:12px">${sure.map(row).join("")}</div></details>` : ""}
      ${R.notInCatalogue || R.already ? `<p class="small muted" style="margin:0">${[R.notInCatalogue ? R.notInCatalogue + " Disney comics are in series without INDUCKS data" : "", R.already ? R.already + " are already matched" : ""].filter(Boolean).join("; ")}.</p>` : ""}
      <div class="row"><button class="primary" id="mapply"${R.items.length ? "" : " disabled"}>Apply <span id="mcount">${chosen}</span> matches</button><button id="mback">Back</button></div>`;
  },
  bind() {
    if (!S.catalogue) return;   // re-rendered once the catalogue has loaded
    if (!S.matchRun) { if (!S.matchBuilding) { S.matchBuilding = true; buildMatchRun().then(() => { S.matchBuilding = false; if (S.view === "match") render(); }); } return; }
    const R = S.matchRun;
    document.querySelectorAll("[data-mid]").forEach(sel => sel.onchange = () => {
      const x = R.items.find(i => i.c.id === sel.dataset.mid); x.label = sel.value;
      $("#mcount").textContent = R.items.filter(i => i.label).length;
    });
    $("#mback") && ($("#mback").onclick = () => { S.matchRun = null; nav("series"); });
    $("#mapply") && ($("#mapply").onclick = async () => {
      const btn = $("#mapply"); btn.disabled = true;
      const updated = R.items.filter(x => x.label).map(x => applyIssueFromCatalogue(x.c, x.label, x.file.issues[x.label]))
        // comics left on "Don't match" are remembered as checked, so the reminder stops counting them
        .concat(R.items.filter(x => !x.label && !x.c.inducksChecked).map(x => Object.assign({}, x.c, { inducksChecked: true })));
      try {
        await saveMany(updated);
        let sChanged = false;
        R.files.forEach(({ se, file, entry }) => { if (seriesFromCatalogue(se, file, entry)) sChanged = true; });
        if (sChanged) await saveSeries();
        toast("Matched " + R.items.filter(x => x.label).length + " comics with INDUCKS");
        S.matchRun = null; S.col = {}; nav("collection");
      } catch (e) { toast(errText(e)); btn.disabled = false; }
    });
  }
};
async function buildMatchRun() {
  const items = [], files = []; let notInCatalogue = 0, already = 0;
  const bySeries = {};
  S.comics.forEach(c => { if (c.kind !== "book" && seriesById(c.seriesId)) (bySeries[c.seriesId] = bySeries[c.seriesId] || []).push(c); });
  for (const [sid, list] of Object.entries(bySeries)) {
    const se = seriesById(sid), entry = catEntry(se);
    if (!entry) { if (se.publisher === DISNEY) notInCatalogue += list.length; continue; }
    const file = await catalogueFile(entry); if (!file) continue;
    files.push({ se, file, entry });
    list.forEach(c => {
      if (c.inducks) { already++; return; }
      const m = proposeMatch(c, file);
      const yr = (/^(\d{4})/.exec(m.label || c.issueLabel || "") || /^(\d{4})/.exec(c.date || "") || [])[1];
      const near = /^\d+$/.test(c.issueLabel || "") ? Object.keys(file.issues).filter(k => Math.abs((parseInt(k, 10) || -99) - +c.issueLabel) <= 3) : [];
      const options = m.options || (yr ? Object.keys(file.issues).filter(k => k.startsWith(yr) || String(file.issues[k].d || "").startsWith(yr)) : (m.label ? [m.label] : near));
      if (m.label && !options.includes(m.label)) options.unshift(m.label);
      const mm = Object.assign({}, m); delete mm.options;
      items.push(Object.assign({ c, file, options: options.slice(0, 120) }, mm));
    });
  }
  const ord = x => (x.c.seriesName || "") + String(x.c.issueSort || 0).padStart(12, "0");
  items.sort((a, b) => ord(a).localeCompare(ord(b)));
  S.matchRun = { items, files, notInCatalogue, already };
}

// wishlist: one folder per series, opened by tapping
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
  const pct = total ? Math.round(owned / total * 100) : 0, f = S.gapFilter || "all";
  const chip = (k, label) => `<button type="button" class="fchip${f === k ? " on" : ""}" data-gf="${k}" aria-pressed="${f === k}">${label}</button>`;
  return `<div class="card stack gaphead">
      ${gapPicker(info.cur || S.gapSeries)}
      <div><div class="row between small"><span><strong>${owned}</strong> of ${total} owned · ${pct}%</span><span class="muted">${wanted} wanted · ${Math.max(0, total - owned)} missing</span></div>
        <div class="meter" style="margin-top:4px"><span style="width:${pct}%"></span></div></div>
      <div class="fchips">${chip("all", "All")}${chip("missing", "Missing")}${chip("wanted", "Wishlist")}${info.read === false ? "" : chip("unread", "Unread")}
        ${info.read === false ? "" : `<button type="button" class="fchip readchip${S.readMode ? " on" : ""}" id="readmode" aria-pressed="${!!S.readMode}">✓ Mark read</button>`}
        <details class="ginfo"><summary aria-label="What the colours mean">ⓘ</summary><div class="legend small">${info.legend}</div></details></div>
      ${S.readMode ? '<p class="small muted" style="margin:0">Reading mode: tap an owned issue to mark it read today; tap again to undo.</p>' : ""}
    </div>`;
}
function bindGapHead() {
  document.querySelectorAll("[data-gf]").forEach(b => b.onclick = () => { S.gapFilter = b.dataset.gf; const g = $("#gridbox"); if (g) g.className = gridClass(!$("#readmode")); document.querySelectorAll("[data-gf]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); }); });
  $("#readmode") && ($("#readmode").onclick = () => { S.readMode = !S.readMode; renderKeep(); });
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
function wishlistView() {
  const all = sortComics(S.comics.filter(c => c.status === "wanted"));
  const fits = all.filter(c => (wishBudget(c) || {}).ok);
  if (S.wishFilter === "budget" && !fits.length) S.wishFilter = "all";
  const wl = S.wishFilter === "budget" ? fits : all;
  const chip = (k, label) => `<button type="button" class="fchip${(S.wishFilter || "all") === k ? " on" : ""}" data-wf="${k}" aria-pressed="${(S.wishFilter || "all") === k}">${label}</button>`;
  return gapTabs() + (all.length ? `<div class="row between wishhead"><div class="fchips">${chip("all", "All " + all.length)}${fits.length ? chip("budget", "Within budget " + fits.length) : ""}</div><button type="button" id="wcopy">Copy list for comic fair</button></div>
      <textarea id="wcopybox" class="mono" rows="6" readonly hidden></textarea>
      <p class="small muted" style="margin:0">${wl.length} ${wl.length === 1 ? "issue" : "issues"} ${S.wishFilter === "budget" ? "worth no more than your maximum price (by your price table)" : "wanted"}. Tap “Got it” when you buy one: it moves to your collection with today's date.</p>` + wishlistBySeries(wl)
    : '<div class="empty"><h3>Your wishlist is empty</h3><p>In Gaps, tap a grey number to put it on your wishlist.</p></div>') + '<div id="cellpick"></div>';
}
// the wishlist as short text for a comic fair: "LTB: 12, 45, 101–103 (max CHF 8)"
function wishlistText() {
  const wl = sortComics(S.comics.filter(c => c.status === "wanted")), groups = new Map();
  wl.forEach(c => { const k = seriesKeyOf(c); (groups.get(k) || groups.set(k, []).get(k)).push(c); });
  const lines = [];
  groups.forEach((list, k) => {
    const se = seriesById(k), yearly = se && se.numbering === "year";
    const maxOf = c => typeof c.pricePaid === "number" ? "max " + money(c.pricePaid, c.currency || "CHF") : "";
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
    if (list[0].kind === "book" && !list[0].seriesName) list.forEach(c => lines.push("Book: " + [c.title, c.author].filter(Boolean).join(" – ") + (maxOf(c) ? " (" + maxOf(c) + ")" : "")));
    else lines.push(name(list[0]) + ": " + parts.join(", "));
  });
  return "My wishlist (" + wl.length + ")\n" + lines.join("\n");
}
function bindWishlist() {
  bindGapTabs();
  document.querySelectorAll("[data-wf]").forEach(b => b.onclick = () => { S.wishFilter = b.dataset.wf; renderKeep(); });
  $("#wcopy") && ($("#wcopy").onclick = async () => {
    const txt = wishlistText(), box = $("#wcopybox");
    try { await navigator.clipboard.writeText(txt); toast("Wishlist copied. Paste it into Keep or a message."); }
    catch (e) { box.value = txt; box.hidden = false; box.focus(); box.select(); toast("Press and hold the selected text, then Copy."); }
  });
  document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
  document.querySelectorAll("details.wishseries").forEach(d => d.ontoggle = () => { S.wishOpen = S.wishOpen || {}; S.wishOpen[d.dataset.wk] = d.open; });
  document.querySelectorAll("[data-got]").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    const c = S.comics.find(x => x.id === b.dataset.got); if (!c) return;
    try {
      // the wishlist's maximum price isn't the price paid, so it is cleared
      await saveComic(Object.assign({}, c, { status: "owned", pricePaid: "", purchaseDate: todayIso(), copies: c.copies || 1 }));
      toast(comicTag(c) + " moved to your collection"); renderKeep();
    } catch (x) { toast(errText(x)); }
  });
}
function wishItem(c) {
  const s = seriesById(c.seriesId), bk = c.kind === "book", cv = coverOf(c);
  const bud = wishBudget(c), v = bud ? bud.v : valueOf(c);
  const sub = [c.pricePaid !== "" && c.pricePaid != null ? "Max " + money(c.pricePaid, c.currency) : "", v ? "worth ≈ " + money(v.amount, v.cur) : "", c.notes].filter(Boolean).join(" · ") || niceDate(c.date) || "";
  return `<div class="item wishrow">${cv ? `<div class="cthumb" data-zoom="${esc(c.id)}"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></div>` : ""}
    <button class="wishmain" data-open="${esc(c.id)}"><div class="num${String(c.issueLabel || c.issue || "").length > 4 ? " long" : ""}">${bk && !c.issue ? '<span style="font-size:.9rem">Book</span>' : esc(c.issueLabel || c.issue || "–")}<small>${bk ? "BOOK" : esc(s ? s.short : c.seriesName)}</small></div>
      <div style="min-width:0"><div class="t">${esc(c.title || (s ? s.name : c.seriesName))}${bud && bud.ok ? ' <span class="chip budget">Within budget</span>' : ""}</div><div class="s">${esc(sub)}</div></div></button>
    <button class="gotit" type="button" data-got="${esc(c.id)}">Got it</button></div>`;
}
function wishlistBySeries(wl) {
  const groups = {};
  wl.forEach(c => { const k = seriesKeyOf(c); (groups[k] = groups[k] || []).push(c); });
  const order = Object.fromEntries(S.series.map((s, i) => [s.id, i]));
  const keys = Object.keys(groups).sort((a, b) => ((order[a] ?? 999) - (order[b] ?? 999)) || seriesTitle(a).localeCompare(seriesTitle(b), "de", { numeric: true }));
  S.wishOpen = S.wishOpen || {};
  return '<div class="list">' + keys.map(k => {
    const list = groups[k], se = seriesById(k), max = list.filter(c => typeof c.pricePaid === "number");
    const sub = [list.length + (list.length === 1 ? " issue wanted" : " issues wanted"), se ? se.publisher : "", max.length ? "budget " + money(max.reduce((a, c) => a + c.pricePaid, 0), max[0].currency) : ""].filter(Boolean).join(" · ");
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
    const covered = issueSquares;
    const inSquare = new Map();   // square -> every comic in it (variants, double issues)
    mine.forEach(c => { if (c.facsimile) return; covered(c.issueLabel || c.issue).forEach(k => { (c.status === "wanted" ? want : own).set(k, c); (inSquare.get(k) || inSquare.set(k, []).get(k)).push(c); }); });
    // owned and wished at once: the same comic both ways (546A owned with 546B wished is fine)
    const live = mine.filter(c => !c.facsimile), clash = new Set();
    live.forEach(a => { if (a.status === "wanted") return; live.forEach(b => { if (b.status === "wanted" && sameSlot(a.issueLabel || a.issue, b.issueLabel || b.issue)) { clash.add(a.id); clash.add(b.id); } }); });
    const clashSq = new Set(live.filter(c => clash.has(c.id)).flatMap(c => covered(c.issueLabel || c.issue)));
    const opts = seriesOptions(se.id, s => s.name) + bookSeriesOptions("");
    let grid = "", total = 0, ownIn = 0, wantIn = 0;
    const tag = shortTag(se);
    const gridLabels = new Set();
    const cell = (label, txt) => {
      gridLabels.add(label);
      const o = own.get(label), w = want.get(label);
      if (o) ownIn++; else if (w) wantIn++;
      const all = inSquare.get(label) || [];
      const vars = all.filter(c => variantOf(c.issueLabel || c.issue));
      const cls = (clashSq.has(label) ? "owned conflict" : o ? "owned" : w ? "wanted" : "") + (o && w && !clashSq.has(label) ? " alsowant" : "") + (all.some(c => c.status !== "wanted") && all.filter(c => c.status !== "wanted").every(c => c.read) ? " read" : "");
      const vtxt = vars.length ? `<sup>${esc([...new Set(vars.filter(c => !o || c.status !== "wanted").map(c => variantOf(c.issueLabel || c.issue)))].sort().join(""))}</sup>` : "";
      const info = all.length ? all.map(c => (c.issueLabel || c.issue) + (c.status === "wanted" ? " on wishlist" : " owned")).join(", ") : "missing";
      return `<button class="cell ${cls}" data-issue="${esc(label)}" data-id="${esc(all.length === 1 ? all[0].id : "")}" data-ids="${esc(all.map(c => c.id).join(","))}" title="${esc(tag + " " + label + " · " + info)}">${esc(txt)}${vtxt}</button>`;
    };
    const ent0 = catEntry(se), cat0 = ent0 && S.catCache[ent0.file], perY = {};
    if (cat0) Object.keys(cat0.issues || {}).forEach(k => { const m = /^(\d{4})\/(\d{1,3})$/.exec(k); if (m) perY[m[1]] = Math.max(perY[m[1]] || 0, +m[2]); });
    const catYears = Object.keys(perY).map(Number), catLast = catYears.length ? Math.max(...catYears) : 0;
    if (se.numbering === "year") {
      const ownYears = mine.map(c => c.issueYear || +((/^(\d{4})\//.exec(c.issueLabel || "") || [])[1]) || 0).filter(Boolean);
      const ownMax = Math.max(0, ...mine.map(c => +((/^\d{4}\/(\d{1,3})$/.exec(c.issueLabel || "") || [])[1]) || 0));
      const y0 = Math.min(+se.firstYear || 1950, ...ownYears), y1 = Math.max(+se.lastYear || new Date().getFullYear(), ...ownYears), per = Math.max(+se.perYear || 52, ownMax);
      const unknown = mine.filter(c => /\?/.test(c.issueLabel || "")).length;
      const years = [];
      for (let y = y1; y >= y0; y--) years.push(y);
      // with the INDUCKS catalogue, each year shows only the numbers that came out (KA 1948: 1–4)
      const perFor = y => {
        if (!cat0 || y > catLast) return per;
        const owned = mine.filter(c => c.status !== "wanted" && (c.issueLabel || "").startsWith(y + "/")).map(c => parseInt((c.issueLabel || "").slice(5), 10) || 0);
        return Math.max(perY[y] || 0, ...owned);   // an owned issue always gets its square
      };
      total = years.reduce((a, y) => a + perFor(y), 0);
      grid = years.map(y => {
        const py = perFor(y); if (!py) return "";
        let cells = ""; for (let n = 1; n <= py; n++) cells += cell(y + "/" + String(n).padStart(2, "0"), n);
        const cnt = [...own.keys()].filter(k => String(k).startsWith(y + "/")).length;
        return `<div class="yearrow"><div class="y">${y}<div class="muted small">${cnt} of ${py}</div></div><div class="cells">${cells}</div></div>`;
      }).join("");
      grid = '<div class="stack" style="gap:10px">' + grid + '</div>';
    } else {
      const highest = Math.max(0, ...mine.filter(c => /^\d+$/.test(c.issueLabel || "")).map(c => +c.issueLabel));
      const max = Math.max(+se.latest || 10, highest); total = max; let cells = "";
      for (let n = 1; n <= max; n++) cells += cell(String(n), n);
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
        : !lab ? "No issue number" : "Number “" + lab + "” doesn't fit this series' numbering" + (se.numbering === "year" ? " (year/number, e.g. 1985/12)." : ".");
      notInGrid.push({ c, why });
    });
    // numbers INDUCKS only knows as variants (LTB 546 is 546A or 546B): ask which one
    const entry = catEntry(se), cat = entry && S.catCache[entry.file];
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
    return gapTabs() + gapHead(ownCount, wantCount, total, { cur: se.id, legend: `<span><i style="background:var(--owned)"></i>Owned</span><span><i style="background:var(--wanted-soft);box-shadow:inset 0 0 0 1.5px var(--wanted)"></i>Wishlist</span><span><i style="background:var(--cell)"></i>Missing</span><span>Small letters: variants, e.g. 546<sup>AB</sup></span>
        <span>${se.numbering === "year" ? `Grid covers ${esc(se.firstYear || "?")}–${esc(se.lastYear || "?")}, ${cat0 ? "with the issues INDUCKS lists for each year" : esc(se.perYear || 52) + " issues a year"}` : `Grid runs to issue ${esc(se.latest || "you own with the highest number")}`}. Adjust this under Series.</span>` }) + `
      ${notInGrid.length ? `<details class="offgrid"><summary class="small"><strong>${[
            both.size ? both.size + (both.size === 1 ? " issue is" : " issues are") + " owned and wished at once" : "",
            (k => k ? k + (k === 1 ? " comic needs" : " comics need") + " a variant letter" : "")(notInGrid.filter(x => x.hint).length),
            (k => k ? k + (k === 1 ? " comic isn't" : " comics aren't") + " in the grid" : "")(notInGrid.filter(x => !x.conflict && !x.hint).length)
          ].filter(Boolean).join(" · ")}</strong> · tap to see why</summary>
          <div class="list" style="margin-top:8px">${notInGrid.map(({ c, why }) => `<button class="item whyitem" data-open="${esc(c.id)}"><div class="num${String(c.issueLabel || c.issue || "").length > 4 ? " long" : ""}">${esc(c.issueLabel || c.issue || "–")}<small>${esc(tag)}</small></div><div style="min-width:0"><div class="t">${esc(c.title || niceDate(c.date) || tag)}</div><div class="s">${esc(why)}</div></div><div class="chips">${c.status === "wanted" ? '<span class="chip wanted">Wishlist</span>' : ""}</div></button>`).join("")}</div></details>` : ""}
      <div id="cellpick"></div>
      <div id="gridbox" class="${gridClass()}">${grid}</div>`;
  },
  bind() {
    if (S.gapTab === "wishlist") return bindWishlist();
    if (String(S.gapSeries || "").startsWith("book:") && $("#bsize")) return bindBookGaps();
    bindGapTabs(); bindGapHead(); bindGapPicker();
    const open = id => { S.editing = id; S.draft = null; nav("add"); };
    document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => open(b.dataset.open));
    const og = $("details.offgrid"); if (og) { og.open = !!S.offgridOpen; og.ontoggle = () => { S.offgridOpen = og.open; }; }
    document.querySelectorAll("details.wishseries").forEach(d => d.ontoggle = () => { S.wishOpen = S.wishOpen || {}; S.wishOpen[d.dataset.wk] = d.open; });
    document.querySelectorAll(".cell").forEach(b => b.onclick = async () => {
      if (S.readMode) {   // quick reading log: toggles "read" on the owned comic(s) in this square
        const mine = (b.dataset.ids || "").split(",").map(id => S.comics.find(c => c.id === id)).filter(c => c && c.status !== "wanted");
        if (!mine.length) { toast("Only owned issues can be marked as read"); return; }
        const read = !mine.every(c => c.read), se = seriesById(S.gapSeries) || S.series[0] || {};
        try {
          for (const c of mine) await saveComic(Object.assign({}, c, { read, readDate: read ? (c.readDate || todayIso()) : "" }));
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

// ---- Stats ----
// ---- lists opened from Stats: "lang:German:c" = comics in German; scope c comics, b books, a everything ----
const genresOf = c => String(c.genre || "").split(/\s*[,;\/]\s*/).map(x => x.trim()).filter(Boolean);
function langOfEntry(c) { return c.lang || (c.kind !== "book" ? seriesLang(seriesById(c.seriesId) || {}) : "") || "Not set"; }
const yearOf = d => +(String(d || "").slice(0, 4)) || 0;
const addedOn = c => /^\d{4}-\d{2}/.test(c.purchaseDate || "") ? c.purchaseDate : String(c.createdAt || "").slice(0, 10);
const MISSING = {
  grade: { label: "condition", test: c => c.kind !== "book" && !c.grade },
  price: { label: "price paid", test: c => typeof c.pricePaid !== "number" && !c.lotId },
  cover: { label: "cover picture", test: c => !c.coverUrl },
  genre: { label: "genre", test: c => !c.genre && !(c.kind !== "book" && storyGenres(c)) },
  pages: { label: "pages", test: c => !parseInt(c.pages, 10) },
  date: { label: "purchase date", test: c => !c.purchaseDate }
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
    author: [c => splitPeople(c.author).includes(val), `by ${val}`],
    miss: [c => !!MISSING[val] && MISSING[val].test(c), `without ${(MISSING[val] || {}).label || val}`],
    added: [c => addedOn(c).startsWith(val), `added or bought ${val.length === 4 ? "in " + val : niceDate(val + "-01").replace(/^1\.\s*/, "")}`],
    read: [c => c.read && String(c.readDate || "").startsWith(val), `read in ${val}`]
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
      const tot = s.numbering === "year" ? Math.max(0, ((+s.lastYear || 0) - (+s.firstYear || 0) + 1) * (+s.perYear || 0)) : (+s.latest || 0);
      const mine = own.filter(c => c.seriesId === s.id && c.kind !== "book");
      // count the squares the gap grid shows as owned, so both screens agree
      const inGrid = k => { const m = /^(\d{4})\/(\d{2,3})$/.exec(k); return s.numbering === "year" ? !!m && +m[1] >= +s.firstYear && +m[1] <= +s.lastYear && +m[2] >= 1 && +m[2] <= Math.max(+s.perYear || 0, 1) : /^\d+$/.test(k) && +k >= 1 && +k <= +s.latest; };
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
    const graded = own.filter(c => c.grade);
    const gradeMap = {}; graded.forEach(c => { const g = String(c.grade).split("-")[0]; gradeMap[g] = (gradeMap[g] || 0) + 1; });
    const gradeNames = { 0: "Z0 as new", 1: "Z1 very good", 2: "Z2 good", 3: "Z3 worn", 4: "Z4 poor", 5: "Z5 very poor" };
    const condition = graded.length ? `<div class="card stack"><div class="cardhead"><h3>Condition</h3><span class="muted small">${graded.length} of ${nf(own.length)} graded</span></div>
      <div class="seg-bar" role="img" aria-label="Condition of graded comics">${Object.keys(gradeNames).filter(g => gradeMap[g]).map(g => `<span class="g${g}" style="flex:${gradeMap[g]}" title="${gradeNames[g]}: ${gradeMap[g]}"></span>`).join("")}</div>
      <div class="legend2">${Object.keys(gradeNames).filter(g => gradeMap[g]).map(g => `<button type="button" class="legbtn" data-pick="grade|${g}|c"><i class="g${g}"></i>${gradeNames[g]} <b>${gradeMap[g]}</b></button>`).join("")}</div>
      <p class="small muted" style="margin:0">Half grades (Z1-2) count with the better grade. Tap a grade to see those comics.</p></div>` : "";
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
      ${curRows.length > 1 || (curRows[0] && curRows[0] !== "CHF") ? `<details class="small"><summary>Per currency</summary><div class="tablewrap"><table class="moneytab"><thead><tr><th></th><th>Value</th><th>Paid</th></tr></thead><tbody>${curRows.map(k => `<tr><td>${k}</td><td>${mAll.vals[k] != null ? fmt2(mAll.vals[k]) : "–"}</td><td>${mAll.sums[k] != null ? fmt2(mAll.sums[k]) : "–"}</td></tr>`).join("")}</tbody></table></div></details>` : ""}</div>` : "";

    // ---- Overview: everything together ----
    const all = owned(), wantAll = S.comics.filter(c => c.status === "wanted");
    const now = new Date(), ymNow = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0"), yNow = String(now.getFullYear());
    const valAll = valueChf(all), readAll = all.filter(c => c.read).length;
    const spentIn = (list, prefix) => list.filter(c => typeof c.pricePaid === "number" && String(c.purchaseDate || "").startsWith(prefix)).reduce((a, c) => a + toCHF(c.pricePaid * (c.copies || 1), c.currency), 0);
    const addedM = all.filter(c => addedOn(c).startsWith(ymNow)).length, readM = all.filter(c => String(c.readDate || "").startsWith(ymNow)).length, spentM = spentIn(all, ymNow);
    const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const ovHero = `<div class="hero card">
        <div class="hero-main"><div class="v">${nf(all.length)}</div><div class="k">entries you own</div>
          <div class="small muted">${nf(own.length)} comics · ${nf(novels.length)} ${novels.length === 1 ? "book" : "books"}</div></div>
        <div class="hero-side">
          <div><div class="v2">${valAll != null ? "≈ " + Math.round(valAll).toLocaleString("de-CH") : "–"}</div><div class="k">CHF value</div></div>
          <div><div class="v2">${nf(wantAll.length)}</div><div class="k">on wishlist</div></div>
          <div><div class="v2">${nf(idx.length)}</div><div class="k">stories</div></div>
          <div><div class="v2">${pct(readAll, all.length)} %</div><div class="k">read · ${nf(all.length - readAll)} to go</div><div class="meter"><span style="width:${pct(readAll, all.length)}%"></span></div></div>
        </div></div>`;
    const ovMonth = `<div class="card stack"><div class="cardhead"><h3>This month</h3><span class="muted small">${M[now.getMonth()]} ${yNow}</span></div>
      <div class="row monthrow">
        <button type="button" class="stat3"${addedM ? ` data-pick="added|${ymNow}|a"` : ""}><span class="v2">${nf(addedM)}</span><span class="k small muted">added or bought</span></button>
        <button type="button" class="stat3"${readM ? ` data-pick="read|${ymNow}|a"` : ""}><span class="v2">${nf(readM)}</span><span class="k small muted">read</span></button>
        <div class="stat3"><span class="v2">CHF ${fmt2(spentM)}</span><span class="k small muted">spent</span></div>
      </div></div>`;
    // collection over time: what was added (by purchase date, else the day it was entered) and what was spent
    const perAdded = {}, perSpent = {};
    all.forEach(c => { const d = addedOn(c).slice(0, 7); if (d) perAdded[d] = (perAdded[d] || 0) + 1; if (typeof c.pricePaid === "number" && /^\d{4}-\d{2}/.test(c.purchaseDate || "")) { const k = c.purchaseDate.slice(0, 7); perSpent[k] = (perSpent[k] || 0) + toCHF(c.pricePaid * (c.copies || 1), c.currency); } });
    const inRange = per => Object.keys(per).filter(k => (S.statRange || "year") === "all" || k.startsWith(yNow)).reduce((a, k) => a + per[k], 0);
    const ovTime = `<div class="card stack"><div class="cardhead"><h3>Collection over time</h3>${rangeSwitch()}</div>
      <div class="small"><strong>${nf(inRange(perAdded))}</strong> <span class="muted">added or bought ${(S.statRange || "year") === "year" ? "in " + yNow : "in all"}</span></div>
      ${timeBars(perAdded, "entries added", "added", "a")}
      <div class="small" style="margin-top:6px"><strong>CHF ${fmt2(inRange(perSpent))}</strong> <span class="muted">spent ${(S.statRange || "year") === "year" ? "in " + yNow : "in all"}</span></div>
      ${timeBars(perSpent, "CHF spent", "", "a", n => "CHF " + fmt2(n))}
      <p class="small muted" style="margin:0">Counted by purchase date; entries without one count on the day they were entered in the app. Tap a bar to see what was added then.</p></div>`;
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
    if (tab === "overview") return tabs + ovHero + ovMonth + ovTime + ovMissing;
    if (tab === "value") return tabs + `${money}${serCard}${valueCard(own, "Comics & comic books")}${valueCard(novels, "Books")}<div class="card stack"><h3>Settings for values</h3>${valueSettingsHtml()}</div>`;
    return tabs + `
      <div class="hero card">
        <div class="hero-main"><div class="v">${nf(own.length)}</div><div class="k">comics you own</div>
          <div class="small muted">${nf(issues)} issues · ${books} comic ${books === 1 ? "book" : "books"}${copies > own.length ? " · " + nf(copies) + " copies with duplicates" : ""}</div></div>
        <div class="hero-side">
          <div><div class="v2">${nf(wanted.length)}</div><div class="k">on wishlist</div></div>
          <div><div class="v2">${nf(seriesOwned)}</div><div class="k">series</div></div>
          <div><div class="v2">${nf(idx.length)}</div><div class="k">stories</div></div>
          <div><div class="v2">${pct(read, own.length)} %</div><div class="k">read · ${nf(own.length - read)} to go</div><div class="meter"><span style="width:${pct(read, own.length)}%"></span></div></div>
        </div>
      </div>
      <div class="two">${comp}${years}</div>
      <div class="two">${completion}${closeCard}</div>
      ${glCard}
      <div class="two">${creatorCard("writers", "Top writers")}${creatorCard("artists", "Top artists")}</div>
      ${readingCard(own, "comics")}
      ${ratedCard(own, "comics")}
      ${condition ? `<div class="two">${condition}</div>` : ""}
      <p class="small muted">Writers and artists: each story counts once, even if you have it in several comics or languages. Tap a name to see the stories.</p>`;
  },
  bind() {
    document.querySelectorAll("[data-sttab]").forEach(b => b.onclick = () => { S.statTab = b.dataset.sttab; render(); window.scrollTo(0, 0); });
    document.querySelectorAll(".hbar[data-who]").forEach(b => b.onclick = () => { S.st = Object.assign(S.st || { q: "", status: "owned", sort: "title", shown: 100 }, { tab: "all", q: "", shown: 100, status: "owned", who: { role: b.dataset.role, name: b.dataset.who } }); nav("stories"); });
    document.querySelectorAll(".hbar[data-g]").forEach(b => b.onclick = () => { S.filters.q = ""; S.filters.status = "owned"; S.shown = 200; S.col = b.dataset.p === BOOK_PUB ? { p: BOOK_PUB, g: BOOK_GROUP } : { p: b.dataset.p, g: b.dataset.g }; nav("collection"); window.scrollTo(0, 0); });
    document.querySelectorAll(".hbar[data-gap]").forEach(b => b.onclick = () => { S.gapSeries = b.dataset.gap; S.gapTab = "gaps"; nav("gaps"); });
    refreshRates();
    document.querySelectorAll("[data-rate]").forEach(inp => inp.onchange = async () => { const v = parseFloat(String(inp.value).replace(",", ".")); if (!(v > 0)) return; S.rates = Object.assign({}, S.rates, { [inp.dataset.rate]: v, manual: true, date: S.rates && S.rates.date || todayIso() }); await setConfig("rates", S.rates); renderKeep(); });
    $("#rateauto") && ($("#rateauto").onclick = async () => { S.rates = Object.assign({}, S.rates, { manual: false }); S.ratesTried = false; await refreshRates(true); toast(S.rates && !S.rates.manual && S.rates.date ? "ECB rates of " + niceDate(S.rates.date) : "Rates couldn't be fetched"); renderKeep(); });
    document.querySelectorAll("[data-gf2]").forEach(inp => inp.onchange = async () => { const v = parseFloat(String(inp.value).replace(",", ".")); S.gradeFactors = Object.assign({}, S.gradeFactors); if (isNaN(v)) delete S.gradeFactors[inp.dataset.gf2]; else S.gradeFactors[inp.dataset.gf2] = v; await setConfig("gradeFactors", S.gradeFactors); renderKeep(); });
    document.querySelectorAll("#app [data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
    $("#stAllSeries") && ($("#stAllSeries").onclick = () => { S.statAllSeries = !S.statAllSeries; render(); });
    document.querySelectorAll("[data-range]").forEach(b => b.onclick = () => { S.statRange = b.dataset.range; renderKeep(); });
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
  const dated = list.filter(c => c.read && /^\d{4}-\d{2}-\d{2}$/.test(c.readDate || ""));
  if (!dated.length) return "";
  const scope = word === "books" ? "b" : "c", all = (S.statRange || "year") === "all", year = String(new Date().getFullYear());
  const per = {}, perPages = {}; dated.forEach(c => { const k = c.readDate.slice(0, 7); per[k] = (per[k] || 0) + 1; perPages[k] = (perPages[k] || 0) + (parseInt(c.pages, 10) || 0); });
  const inRange = dated.filter(c => all || c.readDate.startsWith(year)), pages = inRange.reduce((a, c) => a + (parseInt(c.pages, 10) || 0), 0);
  const last = dated.slice().sort((a, b) => b.readDate.localeCompare(a.readDate)).slice(0, 3), w = n => n === 1 ? word.replace(/s$/, "") : word;
  return `<div class="card stack"><div class="cardhead"><h3>Reading</h3>${rangeSwitch()}</div>
    <div class="row" style="gap:24px"><div><div class="v2">${inRange.length}</div><div class="k small muted">${w(inRange.length)} read ${all ? "in all" : "in " + year}</div></div>${pages ? `<div><div class="v2">${pages.toLocaleString("de-CH")}</div><div class="k small muted">pages ${all ? "in all" : "in " + year}</div></div>` : ""}</div>
    ${timeBars(per, word + " read", "read", scope)}
    ${word === "books" && pages ? `<div class="small muted">Pages read</div>${timeBars(perPages, "pages read", "", scope)}` : ""}
    <p class="small muted" style="margin:0">Last read: ${last.map(c => `<button class="link" data-open="${esc(c.id)}">${esc(c.kind === "book" ? c.title : comicTag(c))}</button> (${esc(niceDate(c.readDate))})`).join(", ")}. Counts only what was marked as read since 31.10.2026. Tap a bar to see what you read then.</p></div>`;
}
// ---- Stats for normal books, kept apart from the comics ----
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
  const serCard = Object.keys(sers).length ? `<div class="card stack"><div class="cardhead"><h3>Book series</h3><span class="muted small">${Object.keys(sers).length} series</span></div>
    ${serRows.length ? `<div class="hbars">${serRows.map(x => `<button class="hbar" data-bgap="${esc(x.n)}" title="${esc(x.n)}: ${x.have} of ${x.tot}"><span class="lab">${esc(x.n)}</span><span class="track"><span class="fill book" style="width:${Math.max(1, Math.min(100, x.have / x.tot * 100)).toFixed(1)}%"></span></span><span class="n">${x.have}/${x.tot}</span></button>`).join("")}</div>` : ""}
    <p class="small muted" style="margin:0">Tap a series for its gap grid.${unsized ? ` ${unsized} ${unsized === 1 ? "series has" : "series have"} no number of volumes yet: set it in Gaps under “Volumes in this series”.` : ""}</p></div>` : "";
  return `<h2 class="sectionhead">Books</h2>
    <div class="hero card">
      <div class="hero-main"><div class="v book">${nf(own.length)}</div><div class="k">${own.length === 1 ? "book" : "books"} you own</div><div class="small muted">novels, non-fiction and other books that aren't comics</div></div>
      <div class="hero-side">
        <div><div class="v2">${nf(wanted.length)}</div><div class="k">on wishlist</div></div>
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
    <div class="two">${serCard}<div class="card stack"><div class="cardhead"><h3>Formats</h3><span class="muted small">books</span></div>${pickBars(formats, "book")}</div></div>
    ${decCard}
    <p class="small muted">Tap any bar to see those books.</p>` : ""}`;
}
// ---- book lookup and barcode scanning ----
function applyBookData(d, r) {
  const set = (k, v) => { if (v) d[k] = v; };
  set("title", r.title); set("author", (r.authors || []).join(", ")); set("publisher", r.publisher); set("date", r.year);
  set("pages", r.pages); set("lang", r.lang); set("genre", r.genre); set("translator", r.translator); set("originalTitle", r.originalTitle);
  set("coverUrl", r.cover); set("isbn", r.isbn); set("format", r.format);
  if (r.series && !d.seriesName) { d.seriesName = r.series; if (r.volume && !d.issue) d.issue = String(r.volume).replace(/^\D+/, ""); }
}
function bookMsg(html) { const b = $("#bookmsg"); if (b) { b.innerHTML = html; b.scrollIntoView({ block: "nearest" }); } }
async function fillFromIsbn(d, grab) {
  grab();
  if (!window.Books) return;
  const isbn = Books.normalize(d.isbn);
  if (!isbn) { bookMsg('<div class="banner warn">That isn\'t a valid ISBN. It has 10 or 13 digits and is printed above the barcode.</div>'); return; }
  const dup = S.comics.find(c => c.id !== d.id && c.kind === "book" && Books.normalize(c.isbn) === isbn);
  bookMsg('<div class="banner">Looking up ' + isbn + '…</div>');
  const res = await Books.lookupIsbn(isbn);
  if (!res.data) { bookMsg(`<div class="banner warn">${res.offline ? "The book databases need an internet connection." : "None of the book databases knows ISBN " + isbn + ". Fill in the details yourself, or try “Search by title and author”."}</div>`); d.isbn = isbn; return; }
  applyBookData(d, res.data); render();
  bookMsg(`<div class="banner ok">Filled in from ${esc(res.sources.join(", "))}. Check the details and save.${dup ? ` <strong>You already have this ISBN: ${esc(dup.title)}${dup.status === "wanted" ? " (on your wishlist)" : ""}.</strong>` : ""}</div>`);
}
async function searchBooks(d, grab) {
  grab();
  const q = [d.title, d.author].filter(Boolean).join(" ").trim();
  if (!q) { bookMsg('<div class="banner warn">Type at least part of the title or the author first.</div>'); $("#f-title").focus(); return; }
  bookMsg('<div class="banner">Searching…</div>');
  const list = await Books.search(q);
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
async function comicFromCode(d, code, ext) {
  const isbn = window.Books && Books.normalize(code);
  if (isbn && /^97[89]/.test(code)) {
    const known = S.comics.find(c => c.id !== d.id && c.isbn && Books.normalize(c.isbn) === isbn);
    if (known) { d.seriesId = known.seriesId; d.seriesName = known.seriesName; d.issue = known.issueLabel || known.issue; d.isbn = isbn; render(); bookMsg(`<div class="banner warn">You already have this ISBN: ${esc(comicTag(known))}${known.status === "wanted" ? " (on your wishlist)" : ""}. Saving asks what to do with it.</div>`); return; }
    bookMsg('<div class="banner">Looking up ISBN ' + isbn + '…</div>');
    const res = await Books.lookupIsbn(isbn), r = res.data;
    d.isbn = isbn;
    if (!r) { render(); bookMsg(`<div class="banner warn">${res.offline ? "Looking up the ISBN needs an internet connection." : "The library databases don't know ISBN " + isbn + "."} Pick the series and number yourself; the ISBN is saved with the comic.</div>`); return; }
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
  if (!se) { render(); bookMsg(`<div class="banner">Barcode ${esc(code)}${ext ? " with add-on " + esc(ext) : ""} isn't known yet. Pick the series and the number and save: from then on the app recognises this magazine's barcode.</div>`); return; }
  d.seriesId = se.id; d.seriesName = se.name;
  const n = ext ? +ext.slice(-2) : 0;   // the add-on's last two digits are the issue number
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
    let firstHit = 0, best = null;
    const done = (code, ext) => {
      // magazines: keep looking briefly for the add-on, which tells the issue number
      if (wantExt && !ext && !/^97[89]/.test(code)) { best = best || { code, ext: "" }; if (!firstHit) firstHit = Date.now(); if (Date.now() - firstHit < 1800) return false; }
      close(); resolve(ext || !best ? { code, ext: ext || "" } : best); return true;
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
// every story once, with the comics it appears in (a reprinted story is one story)
// story ratings are kept per story (INDUCKS story code, or the title when there is no code), in the config store
const storyKey = e => e.code ? "c:" + String(e.code).replace(/\s+/g, "").toLowerCase() : "t:" + norm(e.titles[0] || "");
const storyRate = e => S.storyRatings[storyKey(e)] || {};
async function setStoryRate(key, patch) {
  const cur = Object.assign({}, S.storyRatings[key] || {}, patch);
  if (!cur.fav && !+cur.rating) delete S.storyRatings[key]; else S.storyRatings[key] = cur;
  await setConfig("storyRatings", S.storyRatings);
}
function storyIndex(status) {
  const map = new Map();
  S.comics.forEach(c => {
    if (status === "owned" && c.status === "wanted") return;
    if (status === "wanted" && c.status !== "wanted") return;
    (c.stories || []).forEach((st, i) => {
      if (!st.title && !st.code) return;
      const code = storyCode(st.code);
      let key = code ? "c:" + code : "x:" + c.id + ":" + i;
      // parts of a serial can share one code inside a comic: then each part is its own story
      if (map.has(key) && map.get(key).items.includes(c)) key += "#" + norm(st.dTitle || st.title) + "#" + i;
      if (map.has(key) && map.get(key).items.includes(c)) return;
      let e = map.get(key);
      if (!e) { e = { key, code, titles: [], writers: new Set(), artists: new Set(), chars: new Set(), genre: "", plot: "", original: "", first: "", items: [] }; map.set(key, e); }
      const title = st.dTitle || st.title; if (title && !e.titles.includes(title)) e.titles.push(title);
      splitPeople(st.writer).forEach(x => e.writers.add(x)); splitPeople(st.artist).forEach(x => e.artists.add(x));
      splitChars(st.characters).concat(st.hero ? [st.hero] : []).forEach(x => e.chars.add(x));
      ["genre", "plot", "original", "first"].forEach(k => { if (!e[k] && st[k]) e[k] = st[k]; });
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
    Object.entries({ q: "", tab: "all", role: "writers", who: null, status: "owned", sort: "title", reprinted: false, shown: 100 }).forEach(([k, v]) => { if (st[k] === undefined) st[k] = v; });
    if (["writers", "artists", "chars"].includes(st.mode)) { st.role = st.mode; st.tab = "people"; } delete st.mode;
    if (st.sort === "fav") { st.sort = "rating"; st.tab = "fav"; }
    const all = storyIndex(st.status);
    const nFav = all.filter(e => { const r = storyRate(e); return r.fav || +r.rating; }).length;
    const tab = (k, label, n) => `<button role="tab" type="button" data-stab="${k}" aria-selected="${st.tab === k}">${label}${n != null ? ` <span class="muted">${n}</span>` : ""}</button>`;
    const chip = (attr, on, label) => `<button type="button" class="fchip${on ? " on" : ""}" ${attr} aria-pressed="${on}">${label}</button>`;
    const inChips = [["owned", "Owned"], ["wanted", "Wishlist"], ["all", "Both"]].map(([k, l]) => chip(`data-stin="${k}"`, st.status === k, l)).join("");
    const filters = st.tab === "people"
      ? `<div class="fchips">${[["writers", "Writers"], ["artists", "Artists"], ["chars", "Characters"]].map(([k, l]) => chip(`data-role="${k}"`, st.role === k, l)).join("")}</div>`
      : `<div class="fchips">${inChips}${st.tab === "all" ? chip('data-strep="1"', st.reprinted, "Reprinted") : ""}</div>`;
    const sortSel = st.tab === "all" ? `<label class="inline"><span class="l">Sort</span><select id="stsort">${[["title", "Title"], ["comics", "Most reprinted"], ["code", "Story code"], ["rating", "My rating"]].map(([k, l]) => `<option value="${k}"${st.sort === k ? " selected" : ""}>${l}</option>`).join("")}</select></label>` : "";
    const head = `<div><h2>Stories</h2><p class="lede hide-phone">Every story in your comics, counted once even when it's reprinted. Tap a story to see where you have it.</p></div>
      <div class="subtabs three" role="tablist" aria-label="Show">${tab("all", "All stories", all.length)}${tab("people", "People")}${tab("fav", "Favourites", nFav)}</div>
      <div class="stack" style="gap:8px">
        <label class="q"><span class="l visually-hidden">Search</span><input id="stq" type="search" value="${esc(st.q)}" placeholder="${st.tab === "people" ? "Name" : "Title, code, writer, artist, character"}"></label>
        <div class="row between" style="gap:8px">${filters}${sortSel}</div>
        ${st.who && st.tab === "all" ? `<div class="row small"><span class="chip">${esc({ writers: "Writer", artists: "Artist", chars: "Character" }[st.who.role])}: ${esc(st.who.name)}</span><button class="ghost" id="stwhox" type="button">Show all stories</button></div>` : ""}
      </div><div id="stres"></div>`;
    return all.length || st.status !== "owned" ? head : head.replace('<div id="stres"></div>', '<div class="empty"><h3>No stories yet</h3><p>Stories come with "Fill from INDUCKS" or Duckipedia details, or you add them on a comic.</p></div>');
  },
  bind() {
    const st = S.st;
    document.querySelectorAll("[data-stab]").forEach(b => b.onclick = () => { if (st.tab === b.dataset.stab) return; st.tab = b.dataset.stab; st.q = ""; st.shown = 100; if (st.tab !== "all") st.who = null; render(); });
    document.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { st.role = b.dataset.role; st.shown = 100; render(); });
    document.querySelectorAll("[data-stin]").forEach(b => b.onclick = () => { st.status = b.dataset.stin; st.shown = 100; render(); });
    $("[data-strep]") && ($("[data-strep]").onclick = () => { st.reprinted = !st.reprinted; st.shown = 100; render(); });
    $("#stq").oninput = e => { st.q = e.target.value; st.shown = 100; drawStories(); };
    $("#stsort") && ($("#stsort").onchange = e => { st.sort = e.target.value; drawStories(); });
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
  return `<details class="storyit"><summary>${cv ? `<span class="sthumb"><img src="${esc(cv)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>` : `<span class="sthumb none"></span>`}<div style="min-width:0;flex:1"><div class="t">${sr.fav ? '<span style="color:#c8102e">♥</span> ' : ""}${esc(storyTitle(e) || "Untitled")}${+sr.rating ? ` <span class="chip rate">${ratingTxt(sr.rating)}</span>` : ""}</div><div class="s">${esc(by || "Creators unknown")}</div></div><span class="chip${e.items.length > 1 ? " trade" : ""}">${e.items.length > 1 ? "×" + e.items.length : esc(comicTag(e.items[0]))}</span></summary>
    <div class="stbody small">
      <div class="row" style="gap:10px;align-items:center">${heartHtml(sr.fav, `data-sfav="${esc(sk)}"`)}${starsHtml(sr.rating, `data-sk="${esc(sk)}"`)}</div>
      ${e.titles.length > 1 ? `<div><span class="muted">Also titled:</span> ${e.titles.slice(1).map(esc).join(" · ")}</div>` : ""}
      ${e.original ? `<div><span class="muted">Original title:</span> ${esc(e.original)}</div>` : ""}
      ${e.code ? `<div><span class="muted">Story code:</span> <a class="mono" href="https://inducks.org/story.php?c=${encodeURIComponent(e.code)}" target="_blank" rel="noopener">${esc(e.code)}</a>${e.first ? ` · <span class="muted">first published</span> ${esc(niceDate(e.first))}` : ""}</div>` : ""}
      ${e.writers.size ? `<div><span class="muted">Writer:</span> ${[...e.writers].map(n => `<button class="link" data-person="writers" data-n="${esc(n)}">${esc(n)}</button>`).join(", ")}</div>` : ""}
      ${e.artists.size ? `<div><span class="muted">Artist:</span> ${[...e.artists].map(n => `<button class="link" data-person="artists" data-n="${esc(n)}">${esc(n)}</button>`).join(", ")}</div>` : ""}
      ${e.chars.size ? `<div><span class="muted">Characters:</span> ${[...e.chars].map(n => `<button class="link" data-person="chars" data-n="${esc(n)}">${esc(n)}</button>`).join(", ")}</div>` : ""}
      ${e.genre ? `<div><span class="muted">Genre:</span> ${esc(e.genre)}</div>` : ""}
      ${e.plot ? `<p class="stplot">${esc(e.plot)}${plotSrc}</p>` : ""}
      <div class="row" style="gap:6px">${e.items.map(c => `<button class="chipbtn${c.status === "wanted" ? " wanted" : ""}" data-open="${esc(c.id)}">${esc(comicTag(c))}${c.status === "wanted" ? " · wishlist" : ""}</button>`).join("")}</div>
    </div></details>`;
}
function drawStories() {
  const box = $("#stres"); if (!box) return;
  const st = S.st, q = norm(st.q), words = q ? q.split(" ") : [];
  const all = storyIndex(st.status);
  const more = n => n > st.shown ? `<div class="row" style="justify-content:center;margin-top:12px"><button id="stmore">Show more (${n - st.shown} left)</button></div>` : "";
  const cmpT = (a, b) => storyTitle(a).localeCompare(storyTitle(b), "de", { numeric: true });
  if (st.tab === "people") {
    const role = st.role, counts = new Map();
    all.forEach(e => e[role].forEach(n => { const x = counts.get(n) || { n, stories: 0, comics: new Set() }; x.stories++; e.items.forEach(c => x.comics.add(c.id)); counts.set(n, x); }));
    const list = [...counts.values()].filter(x => words.every(w => norm(x.n).includes(w))).sort((a, b) => b.stories - a.stories || a.n.localeCompare(b.n, "de", { numeric: true }));
    const word = { writers: ["writer", "writers"], artists: ["artist", "artists"], chars: ["character", "characters"] }[role];
    box.innerHTML = `<p class="muted small" style="margin:8px 0">${list.length} ${list.length === 1 ? word[0] : word[1]}</p>` +
      (list.length ? '<div class="list">' + list.slice(0, st.shown).map(x => `<button class="folder" data-who="${esc(x.n)}"><div style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${x.stories} ${x.stories === 1 ? "story" : "stories"} · in ${x.comics.size} ${x.comics.size === 1 ? "comic" : "comics"}</div></div><span class="count">${x.stories}</span><span class="chev" aria-hidden="true">›</span></button>`).join("") + '</div>' : '<div class="empty"><h3>Nobody found</h3><p>Try another name.</p></div>') + more(list.length);
    box.querySelectorAll("[data-who]").forEach(b => b.onclick = () => { st.who = { role, name: b.dataset.who }; st.tab = "all"; st.q = ""; st.shown = 100; render(); window.scrollTo(0, 0); });
  } else {
    let list = all;
    if (st.who) list = list.filter(e => e[st.who.role].has(st.who.name));
    if (words.length) list = list.filter(e => { const t = norm([e.titles.join(" "), e.code, e.original, [...e.writers].join(" "), [...e.artists].join(" "), [...e.chars].join(" "), e.items.map(comicTag).join(" ")].join(" ")); return words.every(w => t.includes(w)); });
    let html = "";
    if (st.tab === "fav") {
      // hearted stories first, then the rest by stars
      list = list.filter(e => { const r = storyRate(e); return r.fav || +r.rating; });
      const hearts = list.filter(e => storyRate(e).fav).sort((a, b) => (+storyRate(b).rating || 0) - (+storyRate(a).rating || 0) || cmpT(a, b));
      const rated = list.filter(e => !storyRate(e).fav), groups = new Map();
      rated.forEach(e => { const r = +storyRate(e).rating; (groups.get(r) || groups.set(r, []).get(r)).push(e); });
      const parts = [];
      if (hearts.length) parts.push([`♥ Favourites`, hearts]);
      [...groups.keys()].sort((a, b) => b - a).forEach(r => parts.push([ratingTxt(r), groups.get(r).sort(cmpT)]));
      let left = st.shown, total = list.length;
      html = `<p class="muted small" style="margin:8px 0">${hearts.length} ${hearts.length === 1 ? "favourite" : "favourites"} · ${rated.length + hearts.filter(e => +storyRate(e).rating).length} rated</p>` +
        (total ? parts.map(([h, xs]) => { if (left <= 0) return ""; const shown = xs.slice(0, left); left -= shown.length; return `<h3 class="listhead">${esc(h)} <span class="muted">${xs.length}</span></h3><div class="list">${shown.map(storyRow).join("")}</div>`; }).join("")
          : '<div class="empty"><h3>No favourites yet</h3><p>Open a story under All stories and tap the heart or the stars.</p></div>') + more(total);
    } else {
      if (st.reprinted) list = list.filter(e => e.items.length > 1);
      list = list.slice().sort(st.sort === "rating" ? (a, b) => (+storyRate(b).rating || 0) - (+storyRate(a).rating || 0) || cmpT(a, b) : st.sort === "comics" ? (a, b) => b.items.length - a.items.length || cmpT(a, b) : st.sort === "code" ? (a, b) => (a.code || "~").localeCompare(b.code || "~") : cmpT);
      const reprints = list.filter(e => e.items.length > 1).length;
      html = `<p class="muted small" style="margin:8px 0">${list.length} ${list.length === 1 ? "story" : "stories"}${reprints && !st.reprinted ? " · " + reprints + " of them in more than one comic" : ""}</p>` +
        (list.length ? '<div class="list">' + list.slice(0, st.shown).map(storyRow).join("") + '</div>' : '<div class="empty"><h3>No stories match</h3><p>Try another search word, or tap Owned, Wishlist or Both.</p></div>') + more(list.length);
    }
    box.innerHTML = html;
    box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; nav("add"); });
    box.querySelectorAll("[data-sfav]").forEach(b => b.onclick = async () => {
      const k = b.dataset.sfav, on = !(S.storyRatings[k] || {}).fav;
      b.classList.toggle("on", on); b.textContent = on ? "♥" : "♡";
      try { await setStoryRate(k, { fav: on }); } catch (e) { toast(errText(e)); }
    });
    bindStars(box, async (v, el) => { try { await setStoryRate(el.dataset.sk, { rating: v }); } catch (e) { toast(errText(e)); } });
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
  return { app: "dagobert-archiv", format: 1, exported: new Date().toISOString(), series: S.series, comics: S.comics, storyRatings: S.storyRatings, bookSizes: S.bookSizes, bookSeriesInfo: S.bookMeta, valueRules: S.valueRules, gradeFactors: S.gradeFactors, bookSeriesExtra: S.bookSeriesExtra,
    groupKeep: S.groupKeep, barcodes: S.barcodes, barcodeYears: S.barcodeYears, recentSeries: S.recentSeries, rates: S.rates };
}
// entries changed or added since the last backup
function changedSinceBackup() { const t = S.lastBackup || ""; return S.comics.filter(c => !t || String(c.updatedAt || c.createdAt || "") > t).length; }
// what a backup holds next to what is on this phone, so you can see a restore brings everything back
function backupCompare(b) {
  const n = x => Array.isArray(x) ? x.length : x && typeof x === "object" ? Object.keys(x).length : 0;
  const rows = [
    ["Entries", b.comics, S.comics], ["… of them owned", (b.comics || []).filter(c => c && c.status !== "wanted"), S.comics.filter(c => c.status !== "wanted")],
    ["… on the wishlist", (b.comics || []).filter(c => c && c.status === "wanted"), S.comics.filter(c => c.status === "wanted")],
    ["Series", b.series, S.series], ["Price ranges", b.valueRules, S.valueRules], ["Own condition factors", b.gradeFactors, S.gradeFactors],
    ["Story ratings", b.storyRatings, S.storyRatings], ["Book series info", b.bookSeriesInfo, S.bookMeta], ["Empty book series", b.bookSeriesExtra, S.bookSeriesExtra],
    ["Volumes per book series", b.bookSizes, S.bookSizes], ["Group choices", b.groupKeep, S.groupKeep], ["Learned barcodes", b.barcodes, S.barcodes]
  ];
  const ratesTxt = b.rates ? "yes" : "no";
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
        <div class="card stat"><div class="v">${n.toLocaleString("de-CH")}</div><div class="k">entries on this phone: ${(k => k.owned + " owned · " + k.wanted + " on wishlist")({ owned: S.comics.filter(c => c.status !== "wanted").length, wanted: S.comics.filter(c => c.status === "wanted").length })}</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${S.lastBackup ? esc(stampDate(S.lastBackup)) : "Never"}</div><div class="k">last backup</div></div>
        <div class="card stat"><div class="v" style="font-size:1.15rem">${S.persisted ? "Protected" : "Not yet"}</div><div class="k">${S.persisted ? "Android won't clear this data on its own" : "requested on first save"}${mb ? " · " + mb + " used" : ""}</div></div>
      </div>
      <div class="card stack"><h3>Make a backup</h3>
        <p class="small muted" style="margin:0">The backup file holds every comic, story and setting. ${canShare ? "“Send backup” lets you pick Google Drive, Gmail or Quick Share to get it to your PC." : ""}</p>
        <div class="row">
          ${canShare ? `<button class="primary" id="bshare"${n ? "" : " disabled"}>Send backup…</button>` : ""}
          <button ${canShare ? "" : 'class="primary" '}id="bsave"${n ? "" : " disabled"}>Save backup to Downloads</button>
          <button id="bcsv"${n ? "" : " disabled"}>Save table for Excel (.csv)</button>
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
        const have = new Set(S.comics.map(c => c.id));
        const fresh = isClz ? b.comics.filter(c => c && !have.has(c.id)) : b.comics;
        const known = b.comics.length - fresh.length;
        // only entries from the old in-app CLZ importer qualify; comics from converted files carry clzBatch/seriesGroup
        const oldClz = b.source === "clz-import" ? S.comics.filter(c => c.importedFrom === "CLZ" && !ids.has(c.id) && !c.clzBatch && !c.seriesGroup) : [];
        box.innerHTML = `<div class="confirm" style="display:grid;gap:10px"><span>${isClz ? (fresh.length ? "Add " + fresh.length + " comics from your CLZ collection?" : "All comics in this file are already in your archive.") + (known && fresh.length ? " " + known + " already in your archive stay as they are." : "") : "Restore " + b.comics.length + (b.comics.length === 1 ? " entry" : " entries") + " from " + esc(stampDate(b.exported)) + "?"}</span>${isClz ? "" : backupCompare(b)}
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
            if (Array.isArray(b.valueRules)) { const ids = new Set((S.valueRules || []).map(r => r.id)); S.valueRules = (S.valueRules || []).concat(b.valueRules.filter(r => r && !ids.has(r.id))); await setConfig("valueRules", S.valueRules); }
            if (b.gradeFactors && typeof b.gradeFactors === "object") { S.gradeFactors = Object.assign({}, b.gradeFactors, S.gradeFactors); await setConfig("gradeFactors", S.gradeFactors); }
            if (b.bookSizes && typeof b.bookSizes === "object") { S.bookSizes = Object.assign({}, S.bookSizes, b.bookSizes); await setConfig("bookSizes", S.bookSizes); }
            if (b.bookSeriesInfo && typeof b.bookSeriesInfo === "object") { S.bookMeta = Object.assign({}, S.bookMeta, b.bookSeriesInfo); await setConfig("bookSeriesInfo", S.bookMeta); }
            if (Array.isArray(b.groupKeep)) { S.groupKeep = [...new Set((S.groupKeep || []).concat(b.groupKeep))]; await setConfig("groupKeep", S.groupKeep); }
            if (b.barcodes && typeof b.barcodes === "object") { S.barcodes = Object.assign({}, b.barcodes, S.barcodes); await setConfig("barcodes", S.barcodes); }
            if (b.barcodeYears && typeof b.barcodeYears === "object") { S.barcodeYears = Object.assign({}, b.barcodeYears, S.barcodeYears); await setConfig("barcodeYears", S.barcodeYears); }
            if (Array.isArray(b.recentSeries) && !(S.recentSeries || []).length) { S.recentSeries = b.recentSeries; await setConfig("recentSeries", S.recentSeries); }
            if (b.rates && !S.rates) { S.rates = b.rates; await setConfig("rates", S.rates); }
            if (b.storyRatings && typeof b.storyRatings === "object") { S.storyRatings = Object.assign({}, S.storyRatings, b.storyRatings); await setConfig("storyRatings", S.storyRatings); }
            const n = await saveMany(fresh, d => { box.innerHTML = `<div class="banner">${isClz ? "Adding" : "Restoring"}… ${d} of ${fresh.length}</div>`; }, true);
            await adoptLooseSeries();
            await refreshStorageInfo(); toast((isClz ? "Added " : "Restored ") + n + (n === 1 ? " entry" : " entries")); render();
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
function refreshCard() {
  const r = S.rf, nDe = S.comics.filter(c => c.kind !== "book" && Duckipedia.candidates(dkSeries(seriesById(c.seriesId)), c).length).length;
  return `<div class="card stack" id="rfbox"><h3>Refresh all comics</h3>
    <p class="small muted" style="margin:0">Fetches INDUCKS and Duckipedia details again for every comic: story lists, titles, dates, pages and covers are replaced with the current data. Condition, prices, notes, ratings, read marks and covers you pasted yourself are kept. INDUCKS comes from the catalogue on this phone; Duckipedia needs internet and takes about ${Math.max(1, Math.round(nDe * 2 / 60))} min for your ${nDe} German comics. Worth doing every few months.</p>
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
      const hit = file && ((c.inducks && Object.values(file.issues || {}).find(x => x.ic === c.inducks)) || (file.issues || {})[lab]);
      if (hit) {
        if (hit.d) c.date = hit.d; if (hit.t) c.title = hit.t; if (hit.pg) c.pages = hit.pg;
        if (hit.cv && fromSources(c.coverUrl)) c.coverUrl = inducksImg(hit.cv);
        const clean = v => String(v || "").split(", ").filter(n => n && n !== "?").join(", ");
        if ((hit.s || []).length) c.stories = hit.s.map(x => ({ title: x.t || "", code: x.c || "", writer: clean(x.w), artist: clean(x.a), hero: x.h || "" }));
        c.inducks = hit.ic;
      }
    }
    // Duckipedia, German comics only
    if (se && Duckipedia.candidates(dkSeries(se), c).length) {
      try {
        const d = await Duckipedia.fetchIssue(dkSeries(se), c);
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
  const n = S.comics.filter(c => c.kind === "book" && window.Books && Books.normalize(c.isbn)).length, r = S.rb;
  if (!n && !r) return "";
  return `<div class="card stack" id="rbbox"><h3>Refresh all books</h3>
    <p class="small muted" style="margin:0">Looks up your ${n} books with an ISBN in the Deutsche Nationalbibliothek, LIBRIS, Open Library and Google Books again. Title, author, publisher, year, pages, language, translator, genres and cover are replaced with their data; series, volume and everything about your copy stay. Needs internet; takes about ${Math.max(1, Math.round(n * 1.5 / 60))} min.</p>
    ${r && r.running ? `<div class="progress"><div style="width:${(r.done / r.total * 100).toFixed(1)}%"></div></div><p class="small" style="margin:0">${r.done} of ${r.total} · ${r.changed} updated</p><div class="row"><button id="rbstop">Stop</button></div>`
      : `${r && r.finished ? `<p class="small" style="margin:0">${r.stopped ? "Stopped" : "Finished"}: ${r.changed} ${r.changed === 1 ? "book" : "books"} updated${r.none ? ", " + r.none + " not found in any database" : ""}.</p>` : ""}<div class="row"><button id="rball"${S.db ? "" : " disabled"}>Refresh all books</button></div>`}
  </div>`;
}
function drawRefreshBooks() { const b = $("#rbbox"); if (b) { b.outerHTML = refreshBooksCard(); bindRefreshBooks(); } }
function bindRefreshBooks() {
  $("#rball") && ($("#rball").onclick = () => refreshBooks());
  $("#rbstop") && ($("#rbstop").onclick = () => { if (S.rb) S.rb.stop = true; });
}
async function refreshBooks() {
  const list = S.comics.filter(c => c.kind === "book" && Books.normalize(c.isbn));
  const r = S.rb = { running: true, total: list.length, done: 0, changed: 0, none: 0 };
  drawRefreshBooks();
  for (const c0 of list) {
    if (r.stop) { r.stopped = true; break; }
    if (!navigator.onLine) { toast("No internet: book refresh stopped"); r.stopped = true; break; }
    try {
      const res = await Books.lookupIsbn(Books.normalize(c0.isbn));
      if (res.data) {
        const c = Object.assign({}, c0);
        applyBookData(c, res.data);
        c.seriesName = c0.seriesName || c.seriesName; c.issue = c0.issue || c.issue;   // your series and volume stay
        const strip = x => JSON.stringify(Object.assign({}, x, { updatedAt: 0 }));
        if (strip(c) !== strip(c0)) { await saveComic(c); r.changed++; }
      } else r.none++;
    } catch (e) {}
    r.done++; drawRefreshBooks();
    await sleep(600);
  }
  r.running = false; r.finished = true; drawRefreshBooks();
  toast("Books: " + r.changed + " updated");
}
// ---- fill a series' details from INDUCKS (offline catalogue) and Duckipedia (German series, needs internet) ----
async function fillSeriesInfo(se) {
  const got = [], set = (k, v, label) => { if (v && !se[k]) { se[k] = v; if (!got.includes(label)) got.push(label); } };
  if (!S.inducksDir) { try { const r = await fetch("catalogue/directory.json"); if (r.ok) S.inducksDir = (await r.json()).publications || []; } catch (e) {} }
  let p = se.code && (S.inducksDir || []).find(x => x[0] === se.code);
  if (!p) {   // without a code, only an exact name match counts (no guessing: "Kalle Anka" is not "Kalle Anka & C:o")
    const exact = exactInducks(se);
    if (exact.length === 1) p = exact[0];
  }
  const badCode = se.code && S.inducksDir && /^(de|ch|at|se|it|us|uk)\//.test(se.code) && !S.inducksDir.some(x => x[0] === se.code);
  if (badCode && p) { got.push("INDUCKS code corrected from " + se.code + " to " + p[0]); se.code = p[0]; }
  else if (badCode) got.warn = "INDUCKS has no publication with the code " + se.code + ": check it on inducks.org";
  const entry = catEntry(se) || (p && catEntry({ name: se.name, code: p[0] }));
  if (p) {
    set("code", p[0], "INDUCKS code"); set("name", p[1], "name");
    set("country", p[0].split("/")[0].toUpperCase(), "country");
    set("pubHouse", p[5] || "", "publisher"); set("format", p[6] || "", "format");
  }
  if (entry) {
    const before = JSON.stringify([se.numbering, se.firstYear, se.lastYear, se.latest]);
    const file = await catalogueFile(entry).catch(() => null);
    if (file) {
      seriesFromCatalogue(se, file, entry);
      // keep the latest issue up to date, not only when it was empty
      if (se.numbering === "year") { const ys = Object.keys(file.issues || {}).map(l => +(/^(\d{4})\//.exec(l) || [])[1]).filter(Boolean); if (ys.length && Math.max(...ys) > (se.lastYear || 0)) se.lastYear = Math.max(...ys); }
      else { const ns = Object.keys(file.issues || {}).filter(l => /^\d+$/.test(l)).map(Number); if (ns.length && Math.max(...ns) > (se.latest || 0)) se.latest = Math.max(...ns); }
    }
    if (JSON.stringify([se.numbering, se.firstYear, se.lastYear, se.latest]) !== before) got.push(se.numbering === "year" ? "years" : "latest issue");
  } else if (p && se.numbering === "year") {
    if (!se.firstYear && p[3]) { se.firstYear = p[3]; got.push("years"); } if (p[4] && p[4] > (se.lastYear || 0)) { se.lastYear = p[4]; if (!got.includes("years")) got.push("years"); }
  } else if (p && !se.latest && p[2]) { se.latest = p[2]; got.push("latest issue"); }
  if (seriesLang(se) === "German" && (se.publisher || DISNEY) === DISNEY && typeof Duckipedia !== "undefined") {
    try {
      const short = se.short && /^[A-Z]/.test(se.short) ? se.short : "";
      const d = await Duckipedia.fetchSeries([se.name, p && p[1], short]);
      if (d) {
        set("about", d.description, "description");
        if (d.description && !se.aboutSrc) se.aboutSrc = d.url;
        set("pubHouse", d.publisher, "publisher"); set("format", [d.size, d.pages && d.pages + " pages"].filter(Boolean).join(", "), "format");
      }
    } catch (e) { got.warn = "Duckipedia couldn't be reached"; }
  }
  return got;
}
// ---- INDUCKS status of a series: in the offline catalogue, only on INDUCKS, or not found ----
function inducksCandidates(se) {
  const dir = S.inducksDir; if (!dir) return [];
  const n = norm(String(se.name).replace(/\s*\([^)]*\)\s*$/, "")), lang = seriesLang(se);
  const cc = { German: ["de", "ch", "at"], Swedish: ["se"], Italian: ["it"], Norwegian: ["no"], Danish: ["dk"], English: ["us", "uk"] }[lang] || null;
  return dir.filter(p => (!cc || cc.includes(p[0].split("/")[0])) && (norm(p[1]) === n || norm(p[1]).replace(/\s+\d+$/, "") === n || (n.length > 8 && norm(p[1]).includes(n))))
    .sort((a, b) => b[2] - a[2]).slice(0, 3);
}
// "Add to catalogue": a ready-filled request on the app's GitHub repository; a GitHub job adds the series and rebuilds the catalogue
const APP_REPO = "FelixWylt/DDCA-Zwischenstopp";
function catalogueRequestUrl(code, name) {
  const body = "Series: " + name + "\nINDUCKS: https://inducks.org/publication.php?c=" + encodeURIComponent(code) + "\n\nSent from Dagobert Ducks Archiv. Just tap Submit.";
  return `https://github.com/${APP_REPO}/issues/new?title=${encodeURIComponent("Add to catalogue: " + code)}&body=${encodeURIComponent(body)}`;
}
// INDUCKS publications with exactly this series' name, in its country (searched in the whole directory, not just the top hits)
function exactInducks(se) {
  const dir = S.inducksDir || [], n = norm(String(se.name).replace(/\s*\([^)]*\)\s*$/, "")), lang = seriesLang(se);
  const cc = { German: ["de", "ch", "at"], Swedish: ["se"], Italian: ["it"], Norwegian: ["no"], Danish: ["dk"], English: ["us", "uk"] }[lang] || null;
  return dir.filter(p => (!cc || cc.includes(p[0].split("/")[0])) && norm(p[1]) === n);
}
// Disney series that are on INDUCKS but not in the offline catalogue: by their code, or else by an exact name match only
function missingFromCatalogue() {
  if (!S.inducksDir || !S.catalogue) return { add: [], unsure: [] };
  const add = [], unsure = [];
  S.series.forEach(se => {
    if ((se.publisher || DISNEY) !== DISNEY || catEntry(se)) return;
    let p = se.code && S.inducksDir.find(x => x[0] === se.code);
    if (!p) { const ex = exactInducks(se); if (ex.length === 1) p = ex[0]; }
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
function bookSeriesGroup() {
  const bySer = {};
  (S.bookSeriesExtra || []).forEach(x => { bySer[x.name] = bySer[x.name] || []; });   // set up in the Series tab, no book yet
  S.comics.forEach(c => { if (c.kind === "book" && c.seriesName) (bySer[c.seriesName] = bySer[c.seriesName] || []).push(c); });
  const names = Object.keys(bySer).sort((a, b) => a.localeCompare(b, "de", { numeric: true }));
  if (!names.length) return "";
  const item = n => {
    const bs = bySer[n], own = bs.filter(c => c.status !== "wanted").length, want = bs.length - own, k = "book:" + n, m = bookInfo(n);
    const authors = m.author || [...new Set(bs.map(c => splitPeople(c.author)[0]).filter(Boolean))].slice(0, 2).join(", ");
    const size = (S.bookSizes || {})[n] || "";
    const meta = [authors, own + (own === 1 ? " book" : " books"), want ? want + " wanted" : "", size ? size + " volumes" : ""].filter(Boolean).join(" · ");
    const f = (key, label, ph) => `<label><span class="l">${label}</span><input data-bk="${key}" value="${esc(m[key] || "")}" placeholder="${esc(ph || "")}"></label>`;
    return `<details class="sitem" data-k="${esc(k)}" data-find="${esc(norm([n, authors, "book"].join(" ")))}"${S.serOpen[k] ? " open" : ""}><summary><span class="t">${esc(n)}</span><span class="muted small">${esc(meta)}</span></summary>
      <div class="seriesrow bookrow" data-old="${esc(n)}">
        <label class="sr-name"><span class="l">Name</span><input data-bk="name" value="${esc(n)}"></label>
        <label><span class="l">Volumes in the series</span><input data-bk="size" type="number" min="1" inputmode="numeric" value="${esc(size)}" placeholder="${Math.max(0, ...bs.map(c => parseInt(c.issue, 10) || 0)) || ""}"></label>
        ${f("author", "Author")}${f("publisher", "Publisher")}${f("years", "Years", "2010–2012")}${f("genres", "Genres", "Fantasy, Adventure")}
        <label class="wide"><span class="l">About this series</span><textarea data-bk="about" rows="3">${esc(m.about || "")}</textarea></label>
        ${m.aboutSrc ? `<div class="wide small muted">Text from <a href="${esc(m.aboutSrc)}" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA)${m.wikidata ? ` · <a href="https://www.wikidata.org/wiki/${esc(m.wikidata)}" target="_blank" rel="noopener">Wikidata</a>` : ""}</div>` : ""}
        ${valueRulesHtml("book:" + n)}
        <div class="wide small muted">Renaming changes it on all ${bs.length} ${bs.length === 1 ? "book" : "books"}.</div>
        <div class="wide row"><button type="button" data-bkfill="${esc(n)}">Fill from Wikidata and Wikipedia</button><button type="button" class="ghost" data-bkgap="${esc(n)}">Open gap grid</button>${bs.length ? "" : `<button type="button" class="ghost danger" data-bkrm="${esc(n)}">Remove series</button>`}</div>
      </div></details>`;
  };
  const isNovelSer = n => bySer[n].length ? bySer[n].some(isNovel) : !!((S.bookSeriesExtra || []).find(x => x.name === n) || {}).novel;
  const novels = names.filter(isNovelSer), cbooks = names.filter(n => !novels.includes(n));
  const grp = (u, list) => list.length ? `<details class="sgroup" data-u="${u}"${S.serOpen["u:" + u] ? " open" : ""}><summary><span class="t">${u}</span><span class="muted small">${list.length} series</span></summary>${list.map(item).join("")}</details>` : "";
  return grp("Book series", novels) + grp("Comic book series", cbooks);
}
// ---- Wikidata (facts) and Wikipedia (description) for a book series; empty fields only, then your own books fill the rest ----
const WD = "https://www.wikidata.org/w/api.php";
async function wdGet(params) {
  const r = await fetch(WD + "?" + new URLSearchParams(Object.assign({ format: "json", origin: "*" }, params)), { headers: { "Api-User-Agent": "DagobertDucksArchiv/1.0 (personal collection app)" } });
  if (!r.ok) throw new Error("Wikidata answered " + r.status); return r.json();
}
async function findSeriesEntity(name, author) {
  const tries = [];
  for (const q of [name, /^(the|die|der|das) /i.test(name) ? "" : "The " + name]) for (const lang of ["en", "de", "sv"]) if (q) tries.push([q, lang]);
  const seen = new Set();
  for (const [q, lang] of tries) {
    const j = await wdGet({ action: "wbsearchentities", search: q, language: lang, uselang: "en", limit: "7", type: "item" });
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
      const r = await fetch(`https://${w.slice(0, 2)}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, "_"))}`);
      if (r.ok) { const j = await r.json(); if (j.extract) return { text: j.extract.slice(0, 700), url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || `https://${w.slice(0, 2)}.wikipedia.org/wiki/${encodeURIComponent(t)}` }; }
    } catch (e) {}
  }
  return null;
}
async function fillBookSeries(name) {
  const bs = S.comics.filter(c => c.kind === "book" && c.seriesName === name);
  const m = Object.assign({}, bookInfo(name)), got = [];
  const set = (k, v, label) => { if (v && !m[k]) { m[k] = v; got.push(label); } };
  const ownAuthor = [...new Set(bs.map(c => splitPeople(c.author)[0]).filter(Boolean))].slice(0, 2).join(", ");
  try {
    const id = m.wikidata || await findSeriesEntity(name, ownAuthor);
    if (id) {
      m.wikidata = id;
      const e = Object.values((await wdGet({ action: "wbgetentities", ids: id, props: "claims|sitelinks" })).entities || {})[0] || {};
      const cl = p => ((e.claims || {})[p] || []).map(c => (c.mainsnak || {}).datavalue && c.mainsnak.datavalue.value).filter(Boolean);
      const ids = p => cl(p).map(v => v.id).filter(Boolean);
      const want = [...ids("P50"), ...ids("P123"), ...ids("P136")];
      const labels = {};
      if (want.length) { const j = await wdGet({ action: "wbgetentities", ids: [...new Set(want)].slice(0, 40).join("|"), props: "labels", languages: "en|de|sv" }); Object.values(j.entities || {}).forEach(x => { const l = x.labels || {}; labels[x.id] = (l.en || l.de || l.sv || {}).value || ""; }); }
      const lab = p => ids(p).map(x => labels[x]).filter(Boolean);
      set("author", lab("P50").slice(0, 2).join(", "), "author");
      set("publisher", lab("P123").slice(0, 2).join(", "), "publisher");
      set("genres", window.Books && Books.oneGenre ? Books.oneGenre(lab("P136").join(", ")) : lab("P136").slice(0, 3).join(", "), "genres");
      const yr = p => cl(p).map(v => +(String(v.time || "").match(/^\+?(\d{4})/) || [])[1]).filter(Boolean);
      const y0 = Math.min(...yr("P580"), ...yr("P577")), y1 = Math.max(...yr("P582"), ...yr("P577"));
      if (isFinite(y0)) set("years", y0 + (isFinite(y1) && y1 > y0 ? "–" + y1 : ""), "years");
      const parts = (cl("P2635")[0] || cl("P1113")[0] || {}).amount;
      const vols = parts ? Math.round(+parts) : ids("P527").length;
      if (vols && !(S.bookSizes || {})[name]) { S.bookSizes = Object.assign({}, S.bookSizes, { [name]: vols }); await setConfig("bookSizes", S.bookSizes); got.push("volumes"); }
      if (!m.about) { const w = await wikiSummary(e.sitelinks); if (w) { m.about = w.text; m.aboutSrc = w.url; got.push("description"); } }
    }
  } catch (e) { got.warn = "Wikidata couldn't be reached"; }
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
    const fields = (s, i) => `<div class="seriesrow" data-i="${i}">
      <label class="sr-name"><span class="l">Name</span><input data-k="name" value="${esc(s.name)}"></label>
      <label><span class="l">Universe</span><input data-k="publisher" list="publist" value="${esc(s.publisher || "")}" placeholder="${DISNEY}"></label>
      <label><span class="l">Group</span><input data-k="group" list="grouplist" value="${esc(s.group || "")}" placeholder="${OTHER_GROUP}"></label>
      <label><span class="l">Short</span><input data-k="short" value="${esc(s.short)}"></label>
      <label><span class="l">INDUCKS code</span><input data-k="code" class="mono" value="${esc(s.code)}" placeholder="de/LTB"></label>
      <div class="wide small inducksnote" data-ni="${i}">${inducksNote(s)}</div>
      <label><span class="l">Country</span><input data-k="country" value="${esc(s.country)}" maxlength="3"></label>
      <label><span class="l">Numbering</span><select data-k="numbering"><option value="running"${s.numbering !== "year" ? " selected" : ""}>Running number</option><option value="year"${s.numbering === "year" ? " selected" : ""}>Per year</option></select></label>
      ${s.numbering === "year"
        ? `<label><span class="l">Years</span><input data-k="years" value="${esc(s.firstYear || s.lastYear ? (s.firstYear || "") + "–" + (s.lastYear || "") : "")}" placeholder="1951–2026"></label><label><span class="l">Per year</span><input data-k="perYear" type="number" min="1" placeholder="e.g. 52" value="${esc(s.perYear || "")}"></label>`
        : `<label><span class="l">Latest issue</span><input data-k="latest" type="number" min="1" value="${esc(s.latest || "")}"></label><span></span>`}
      <label><span class="l">Publisher</span><input data-k="pubHouse" value="${esc(s.pubHouse || "")}" placeholder="Egmont Ehapa"></label>
      <label><span class="l">Format</span><input data-k="format" value="${esc(s.format || "")}" placeholder="12,5×19,0 cm"></label>
      ${valueRulesHtml(s.id)}
      <label class="wide"><span class="l">About this series</span><textarea data-k="about" rows="3">${esc(s.about || "")}</textarea></label>
      ${s.aboutSrc ? `<div class="wide small muted">Text from <a href="${esc(s.aboutSrc)}" target="_blank" rel="noopener">Duckipedia</a> (GNU FDL 1.2)</div>` : ""}
      <div class="wide row"><button type="button" data-fillser="${i}">Fill from INDUCKS${(s.publisher || DISNEY) === DISNEY ? " and Duckipedia" : ""}</button></div>
      <button class="ghost danger" data-rm="${i}" type="button">Remove series</button></div>`;
    // universe › group › series, each series a row that opens for editing
    const tree = {};
    S.series.forEach((s, i) => { const u = s.publisher || "No universe yet", g = s.group || OTHER_GROUP; ((tree[u] = tree[u] || {})[g] = tree[u][g] || []).push(i); });
    const sKey = s => s.id || "new:" + S.series.indexOf(s);
    const rows = Object.keys(tree).sort(pubCompare).map(u => {
      const groups = tree[u], n = Object.values(groups).reduce((a, l) => a + l.length, 0);
      return `<details class="sgroup" data-u="${esc(u)}"${S.serOpen["u:" + u] ? " open" : ""}><summary><span class="t">${esc(u)}</span><span class="muted small">${n} series</span></summary>` +
        Object.keys(groups).sort(groupCompare).map(g => `<h4 class="sghead">${esc(g)}</h4>` + groups[g].map(i => {
          const s = S.series[i], k = sKey(s), cnt = used[s.id] || 0;
          const ce = catEntry(s);
          const meta = [s.short, cnt === 1 ? "1 comic" : cnt + " comics", s.numbering === "year" ? (s.firstYear || "?") + "–" + (s.lastYear || "?") : s.latest ? "to " + s.latest : "", ce ? "INDUCKS ✓" : ""].filter(Boolean).join(" · ");
          return `<details class="sitem" data-k="${esc(k)}" data-find="${esc(norm([s.name, s.short, s.group, u, s.code].join(" ")))}"${S.serOpen[k] ? " open" : ""}><summary><span class="t">${esc(seriesLabel(s) || "New series")}</span><span class="muted small">${esc(meta)}</span></summary>${fields(s, i)}</details>`;
        }).join("")).join("") + '</details>';
    }).join("") + bookSeriesGroup();
    const tab = S.serTab || "list";
    const tabs = `<h2 style="margin:0">Series</h2><div class="subtabs" role="tablist" aria-label="Show"><button role="tab" type="button" data-stab="list" aria-selected="${tab === "list"}">My series</button><button role="tab" type="button" data-stab="tools" aria-selected="${tab === "tools"}">Tools</button></div>`;
    if (tab === "tools") return tabs + `
      <p class="small muted" style="margin:0">Bulk jobs for all your series and comics. The ones that need internet say so.</p>
      <div class="card stack"><h3>Fill all series</h3>
        <p class="small muted" style="margin:0">Fills empty details of every Disney series at once: INDUCKS code, country, years, latest issue, publisher and format from INDUCKS, plus a short description from Duckipedia for German series. Book series get author, publisher, years, genres, number of volumes and a description from Wikidata and Wikipedia. What you've entered yourself is kept. Needs internet for Duckipedia; takes about a second per series.</p>
        <div class="row" style="align-items:center"><button id="fillall"${S.db ? "" : " disabled"}>${S.fillAll && S.fillAll.running ? "Stop" : "Fill all series"}</button><span class="small muted" id="fillprog">${S.fillAll && !S.fillAll.running ? esc(S.fillAll.msg) : ""}</span></div></div>
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
    return tabs + `
      ${arrangeCard()}
      ${groupCheckCard()}
      <div><p class="lede" style="margin:0">The series you collect. Universe and group decide where a series appears under Collection; the publisher is saved with each comic, since it changes over the years. The gap grid and completion stats use the latest issue, or the years and issues per year for weekly titles.</p></div>
      ${S.seriesSaved ? "" : '<div class="banner">These are the starting series. Save once to keep your own version.</div>'}
      <div class="card stack">
        <label><span class="l">Find a series</span><input id="serfind" type="search" placeholder="Name, short name, group or INDUCKS code" value="${esc(S.serFind || "")}"></label>
        <div class="serieslist">${rows}</div>
        <datalist id="publist">${[...new Set([DISNEY, "Franco-Belgian", "Marvel", "DC", "Swedish comics", OTHER_PUB].concat(S.series.map(s => s.publisher).filter(Boolean)))].sort(pubCompare).map(p => `<option>${esc(p)}</option>`).join("")}</datalist>
        <datalist id="grouplist">${[...new Set(S.series.map(s => s.group).filter(Boolean))].sort().map(g => `<option>${esc(g)}</option>`).join("")}</datalist>
        <div id="newbook"></div>
        <div class="row savebar"><button id="addser">Add series</button><button id="addbookser" type="button">Add book series</button><button class="primary" id="saveser"${S.db ? "" : " disabled"}>Save series</button></div></div>
`;
  },
  bind() {
    document.querySelectorAll("[data-stab]").forEach(b => b.onclick = () => { if (S.serTab !== b.dataset.stab) { try { grab(); } catch (e) {} } S.serTab = b.dataset.stab; render(); window.scrollTo(0, 0); });
    const grab = () => document.querySelectorAll(".seriesrow:not(.bookrow)").forEach(row => {
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
    $("#gomatch") && ($("#gomatch").onclick = () => { S.matchRun = null; nav("match"); });
    bindArrangeCard(); bindGroupCheck();
    document.querySelectorAll("details.sgroup").forEach(el => el.ontoggle = () => { S.serOpen["u:" + el.dataset.u] = el.open; });
    document.querySelectorAll("details.sitem").forEach(el => el.ontoggle = () => { S.serOpen[el.dataset.k] = el.open; });
    const find = () => {
      const q = norm(S.serFind || ""), words = q ? q.split(" ") : [];
      document.querySelectorAll("details.sgroup").forEach(g => {
        let any = false;
        g.querySelectorAll("details.sitem").forEach(it => { const hit = words.every(w => it.dataset.find.includes(w)); it.hidden = !hit; any = any || hit; });
        g.querySelectorAll(".sghead").forEach(h => { let el = h.nextElementSibling, vis = false; while (el && el.classList.contains("sitem")) { vis = vis || !el.hidden; el = el.nextElementSibling; } h.hidden = !vis; });
        g.hidden = !any;
        if (q) g.open = any; else g.open = !!S.serOpen["u:" + g.dataset.u];
      });
    };
    $("#serfind") && ($("#serfind").oninput = e => { S.serFind = e.target.value; find(); });
    if (S.serFind) find();
    $("#dkall") && ($("#dkall").onclick = () => duckipediaBulk());
    bindValueRules();
    document.querySelectorAll("[data-bkfill]").forEach(b => b.onclick = async () => {
      grab(); try { await saveBookSeries(); } catch (e) {}   // keep what was typed
      b.disabled = true; b.textContent = "Looking up…";
      const got = await fillBookSeries(b.dataset.bkfill);
      toast((got.length ? "Filled in: " + got.join(", ") : "Nothing new found") + (got.warn ? ". " + got.warn : ""));
      S.serOpen["book:" + b.dataset.bkfill] = true; renderKeep();
    });
    document.querySelectorAll("[data-bkgap]").forEach(b => b.onclick = () => { S.gapSeries = "book:" + b.dataset.bkgap; S.gapTab = "gaps"; nav("gaps"); });
    bindRefresh(); bindRefreshBooks();
    $("#fillall") && ($("#fillall").onclick = async () => {
      if (S.fillAll && S.fillAll.running) { S.fillAll.stop = true; return; }
      grab();
      const run = S.fillAll = { running: true, stop: false, msg: "" }, btn = $("#fillall"), prog = $("#fillprog");
      btn.textContent = "Stop";
      const list = S.series.filter(se => (se.publisher || DISNEY) === DISNEY && (se.name || se.code));
      const books = [...new Set(S.comics.filter(c => c.kind === "book" && c.seriesName).map(c => c.seriesName))];
      let changed = 0, warn = "";
      for (let k = 0; k < list.length && !run.stop; k++) {
        if (prog && prog.isConnected) prog.textContent = `${k + 1} of ${list.length}: ${list[k].name}`;
        const got = await fillSeriesInfo(list[k]).catch(() => []);
        if (got.length) changed++; if (got.warn) warn = got.warn;
      }
      for (let k = 0; k < books.length && !run.stop; k++) {
        if (prog && prog.isConnected) prog.textContent = `Book series ${k + 1} of ${books.length}: ${books[k]}`;
        const got = await fillBookSeries(books[k]).catch(() => []);
        if (got.length) changed++; if (got.warn) warn = got.warn;
        await sleep(300);
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
      S.serOpen[se.id] = true;
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
        S.serOpen["u:" + (novel ? "Book series" : "Comic book series")] = true; S.serOpen["book:" + name] = true;
        toast(name + " created. Add its number of volumes, then Fill from Wikidata."); render();
      };
      setTimeout(() => $("#nbname").focus(), 50);
    };
    document.querySelectorAll("[data-bkrm]").forEach(b => b.onclick = async () => {
      S.bookSeriesExtra = (S.bookSeriesExtra || []).filter(x => x.name !== b.dataset.bkrm); await setConfig("bookSeriesExtra", S.bookSeriesExtra);
      toast(b.dataset.bkrm + " removed"); renderKeep();
    });
    if ($("#addser")) $("#addser").onclick = () => {
      grab(); S.series.push({ id: "", name: "", short: "", publisher: "", group: "", code: "", country: "", numbering: "running", latest: "" });
      S.serFind = ""; S.serOpen["u:No universe yet"] = true; S.serOpen["new:" + (S.series.length - 1)] = true; render();
      const ins = document.querySelectorAll('.seriesrow [data-k="name"]'); const last = ins[ins.length - 1]; last.scrollIntoView({ block: "center" }); last.focus();
    };
    document.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => {
      grab(); const s = S.series[+b.dataset.rm];
      const used = S.comics.filter(c => c.seriesId === s.id).length;
      if (used) { toast(used + " comics are in this series. Move or delete them first."); return; }
      S.series.splice(+b.dataset.rm, 1); render();
    });
    if ($("#saveser")) $("#saveser").onclick = async () => {
      grab();
      if (S.series.some(s => !s.name)) { toast("Every series needs a name"); return; }
      S.series.forEach(s => { if (!s.group) s.group = OTHER_GROUP; if (!s.publisher) s.publisher = OTHER_PUB; });
      S.series.sort((a, b) => pubCompare(a.publisher, b.publisher) || groupCompare(a.group, b.group));
      const ids = S.series.map(s => s.id); if (new Set(ids).size !== ids.length) { toast("Two series have the same INDUCKS code"); return; }
      try { await saveBookSeries(); await saveSeries(); toast("Series saved"); render(); } catch (e) { toast(errText(e)); }
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
