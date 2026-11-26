// Dagobert Ducks Archiv – constants, state, helpers, value rules, data, covers, lots, INDUCKS matching, routing, render.
// One of several plain scripts sharing their names (see index.html for the order).
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
  "x-musiksaga": SE_ALB, "farbror-joakims-liv": SE_ALB, "x-walt-disney-s-godbitar": SE_MAG, "x-walt-disney-s-klassiker": SE_MAG,
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
  // a one-volume book (Der Stammbaum der Ducks, Micky Holmes & Donald Watson) is an album, not a magazine
  // … unless its name says it is a magazine (Mega Micky Maus Sonderheft, … Extra)
  if (isSingleSeries(se) && (lang === "German" || lang === "Swedish") && !/(heft|magazin|zeitung|extra|tidning)/.test(n)) return { publisher: DISNEY, group: lang === "German" ? DE_ALB : SE_ALB };
  if (lang === "German") return { publisher: DISNEY, group: /^(lustiges taschenbuch|ltb)\b|\bltb\b/.test(n) ? DE_LTB : /taschenb|^panzerknacker|^donald duck (co|und co)\b/.test(n) || ["de/DD", "de/PK", "de/DDCO"].includes(se.code) ? DE_TB : /\b(edition|sammler|album|alben|hardcover|klassik|bibliothek|collection|bande?)\b/.test(n) ? DE_ALB : DE_MAG };
  if (lang === "Swedish") return { publisher: DISNEY, group: /pocket/.test(n) || n === "farbror joakim" || /^bjornligan\b/.test(n) || /^kalle ankas basta\b/.test(n) ? SE_POC : /^walt disney s (godbitar|klassiker|serier)\b/.test(n) ? SE_MAG : /\b(julbok|basta|godbitar|klassiker|bok|bocker|album|liv|saga|samlade|guldbok)\b/.test(n) ? SE_ALB : SE_MAG };
  if (lang === "Italian") return { publisher: DISNEY, group: IT_ALL };
  if (lang === "Norwegian") return { publisher: DISNEY, group: NO_ALL };
  return { publisher: DISNEY, group: lang ? lang : OTHER_GROUP };
}
// for comics, "Comics" or "Graphic novels" says nothing: it's what they all are
const noComicsGenre = g => String(g || "").split(/\s*,\s*/).filter(x => x && !/^(comics?|graphic novels?|comic books?|tegneserier|serier|fumetti|bandes dessinées)$/i.test(x)).join(", ");
// a comic's genres from its stories (Duckipedia: Abenteuer, Komik, Krimi ...), in the app's genre names
// in a comic, "Komödie" or "Gag" is humour, not a stage play
function storyGenres(c) {
  if (!(window.Books && Books.oneGenre)) return "";
  const MAP = [[/einseiter|one-pager|onepager|ensidig/i, ""], [/gagstory|gag|komödie|komik|slapstick|parodie|satire|humoreske|witz|comedy/i, "Humour"], [/kriminal|krimi|detektiv|mystery|agenten|spionage/i, "Crime"],
    [/abenteuer|schatzsuche|expedition|reise|western|piraten|dschungel/i, "Adventure"], [/science-fiction|science fiction|weltraum|zeitreise|zukunft|erfindung|düsentrieb/i, "Science Fiction"],
    [/superheld|phantomias|paperinik|duck avenger/i, "Superheroes"], [/horror|grusel|gespenst|geister/i, "Horror"], [/magie|zauber|hexe|fantasy|märchen|sagen/i, "Fantasy"],
    [/historisch|geschichte der|antike|mittelalter/i, "Historical"], [/sport|fussball|fußball/i, "Sport"], [/liebe|romantik/i, "Romance"]];
  const out = [];
  (c.stories || []).forEach(s => String(s.genre || "").split(/\s*,\s*/).forEach(g => { if (!g) return; const hit = MAP.find(([re]) => re.test(g)); if (hit && hit[1] && !out.includes(hit[1])) out.push(hit[1]); }));
  // "Kurzgeschichte", "Rahmengeschichte" describe a story's length or role, not its genre: left out
  const freq = {}; (c.stories || []).forEach(s => String(s.genre || "").split(/\s*,\s*/).forEach(g => { const hit = MAP.find(([re]) => re.test(g)); if (hit) freq[hit[1]] = (freq[hit[1]] || 0) + 1; }));
  return out.sort((a, b) => freq[b] - freq[a]).slice(0, 3).join(", ");
}
// a story's own genres (Duckipedia writes them in German) and dates, shown in English
const STORY_GENRE_EN = [[/^einseiter$/i, "One-pager"], [/^(gagstory|gag)$/i, "Gag story"], [/^(komik|komödie|comedy)$/i, "Comedy"], [/^slapstick$/i, "Slapstick"], [/^parodie$/i, "Parody"], [/^satire$/i, "Satire"],
  [/^(abenteuer|abenteuergeschichte)$/i, "Adventure"], [/^(krimi|kriminalgeschichte)$/i, "Crime"], [/^detektivgeschichte$/i, "Detective story"], [/^mystery$/i, "Mystery"], [/^(agenten|spionage)/i, "Spy story"],
  [/^schatzsuche$/i, "Treasure hunt"], [/^(reise|reisegeschichte)$/i, "Travel"], [/^expedition$/i, "Expedition"], [/^western$/i, "Western"], [/^piraten/i, "Pirates"], [/^science.?fiction$/i, "Science fiction"],
  [/^zeitreise/i, "Time travel"], [/^superheld/i, "Superhero"], [/^(horror|grusel)/i, "Horror"], [/^(fantasy|magie|zauber)/i, "Fantasy"], [/^märchen/i, "Fairy tale"], [/^sagen?$/i, "Legend"],
  [/^historisch/i, "Historical"], [/^sport/i, "Sport"], [/^(liebe|liebesgeschichte|romantik)/i, "Romance"], [/^kurzgeschichte$/i, "Short story"], [/^rahmengeschichte$/i, "Frame story"],
  [/^weihnacht/i, "Christmas"], [/^ostern|ostergeschichte/i, "Easter"], [/^literaturadaption|literaturparodie/i, "Literary parody"], [/^fortsetzungsgeschichte$/i, "Serial"], [/^schatzjagd$/i, "Treasure hunt"]];
const storyGenreEn = g => String(g || "").split(/\s*,\s*/).filter(Boolean).map(x => (STORY_GENRE_EN.find(([re]) => re.test(x)) || [0, x])[1]).filter((x, i, a) => a.indexOf(x) === i).join(", ");
const MONTHS_DE = { januar: "January", jänner: "January", februar: "February", märz: "March", april: "April", mai: "May", juni: "June", juli: "July", august: "August", september: "September", oktober: "October", november: "November", dezember: "December" };
const dateEn = d => String(d || "").replace(/\b(januar|jänner|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/gi, m => MONTHS_DE[m.toLowerCase()]);
// books saved in a book series that is really one of your comic series ("Disney Special Books" -> Disney Special Books Panini)
function strayBooks(seriesId) {
  const out = [];
  S.comics.forEach(c => {
    if (c.kind !== "book" || !c.seriesName) return;
    const k = norm(c.seriesName);
    const se = S.series.find(s => (!seriesId || s.id === seriesId) && (norm(s.name) === k || (s.short && norm(s.short) === k) || (k.length >= 12 && norm(s.name).startsWith(k + " ")) || (catEntry(s) && norm(catEntry(s).title || "") === k)));
    if (se) out.push({ c, se });
  });
  return out;
}
async function moveStrays(list) {
  const fix = list.map(({ c, se }) => { const p = parseIssue(se, c.issueLabel || c.issue || ""); return Object.assign({}, c, { kind: "issue", seriesId: se.id, seriesName: se.name, bookType: "", issue: p.label || c.issue, issueLabel: p.label || c.issue, issueNum: p.n, issueSort: p.sort, issueYear: p.year || null }); });
  await saveMany(fix, null, true); fix.forEach(remember); announce();
  return fix.length;
}
// ---- ISBN / bootleg warning (da-v233): a number that doesn't add up, a made-up publisher, or another publisher than the series' other volumes ----
const FAKE_PUB = /^(generic|unknown|unbekannt|okänd|n\/?a|none|no brand|unbranded|underground|wos limited\b.*)$/i;
function isbnWarnings(c) {
  if (!c) return [];
  const out = [], raw = String(c.isbn || "").toUpperCase().replace(/[^0-9X]/g, ""), book = c.kind === "book", N = x => (window.Books ? Books.normalize(x) : "") || "";
  const n13 = raw ? N(raw) : "";
  if (raw && !n13 && (book || /^97[89]\d{10}$/.test(raw))) out.push(raw.length === 10 || raw.length === 13 ? "The ISBN doesn't add up (its check digit is wrong): a typo, or a made-up number as on unofficial copies." : "The ISBN has " + raw.length + " digits; a real one has 13 (or 10 on older books).");
  const pub = String(c.publisher || "").trim();
  if (pub && (FAKE_PUB.test(pub) || /\bgeneric\b/i.test(pub))) out.push("“" + pub + "” isn't a real publisher: often an unofficial copy (bootleg).");
  if (n13 && book && c.seriesName) {   // same series, same language: the first digits name the publisher
    const others = S.comics.filter(x => x.id !== c.id && x.kind === "book" && x.seriesName === c.seriesName && (!c.lang || !x.lang || x.lang === c.lang)).map(x => N(x.isbn)).filter(Boolean);
    if (others.length >= 2) {
      let p = others[0]; others.forEach(o => { let i = 0; while (i < p.length && p[i] === o[i]) i++; p = p.slice(0, i); }); p = p.slice(0, 7);
      if (p.length >= 6 && !n13.startsWith(p)) out.push("The ISBN doesn't start like your other volumes of " + c.seriesName + " (" + p + "…): another publisher, or an unofficial copy.");
    }
  }
  return out;
}
const isbnWarnHtml = c => (w => w.length ? `<div class="banner warn small isbnwarn">⚠ ${w.map(esc).join("<br>⚠ ")}</div>` : "")(isbnWarnings(c));
// ---- complete series (da-v234): remembered when the gap grid or Stats counts them, shown as a gold "Complete" label ----
function isComplete(key) { return key !== "book:" && !!(S.completeKeys || {})[key]; }
function markComplete(key, done) {
  if (!key) return; S.completeKeys = S.completeKeys || {};
  if (key === "book:" || (String(key).startsWith("book:") && parseInt((S.bookSizes || {})[key.slice(5)], 10) === 1)) done = false;   // single books (no series, or a series of one volume) are never "complete"
  if (!!S.completeKeys[key] === !!done) return;
  if (done) S.completeKeys[key] = true; else delete S.completeKeys[key];
  setConfig("completeSeries", S.completeKeys).catch(() => {});
}
const completeChip = key => isComplete(key) ? ' <span class="chip complete">Complete</span>' : "";
// a book series is complete when its number of volumes is set and you own every one of them
function bookSeriesComplete(name) {
  const size = parseInt((S.bookSizes || {})[name], 10); if (!size) return false;
  const have = new Set(S.comics.filter(c => c.kind === "book" && c.seriesName === name && isOwn(c)).map(c => parseFloat(String(c.issue || "").replace(",", "."))));
  for (let i = 1; i <= size; i++) if (!have.has(i)) return false; return true;
}
// ---- move entries to another series (da-v234): comic ⇄ comic, book ⇄ book, comic ⇄ book ----
function entryMovedTo(c, key) {
  if (String(key).startsWith("book:")) {
    const name = key.slice(5), proto = S.comics.find(x => x.kind === "book" && x.seriesName === name && x.id !== c.id), extra = (S.bookSeriesExtra || []).find(x => x.name === name);
    const bookType = proto ? proto.bookType || "" : extra ? (extra.novel ? "book" : "") : c.kind === "book" ? c.bookType || "" : "";
    const o = Object.assign({}, c, { kind: "book", bookType, seriesId: "_book", seriesName: name, issue: c.issueLabel || c.issue || "", title: c.title || name + " " + (c.issueLabel || c.issue || "") });
    ["issueLabel", "issueSort", "issueYear", "issueNum"].forEach(k => delete o[k]); return o;
  }
  const se = seriesById(key), p = parseIssue(se, c.issueLabel || c.issue || "");
  return Object.assign({}, c, { kind: "issue", bookType: "", seriesId: se.id, seriesName: se.name, issue: p.label || c.issue || "", issueLabel: p.label || c.issue || "", issueNum: p.n, issueSort: p.sort, issueYear: p.year || null });
}
async function moveEntries(list, key) { const fix = list.map(c => entryMovedTo(c, key)); if (fix.length) await saveMany(fix, null, true); return fix.length; }
// format names in English (the user's wish, 2026-11-22): old German names are renamed on start, on save and on restore
const FMT_EN = { "Heft": "Magazine", "Taschenbuch / Pocket": "Pocket book" };
// series sizes from Duckipedia in English: "200 mm (Höhe) × 135 mm (Breite)" -> "200 × 135 mm", "wechselnd pages" -> "varying pages"
const enSize = s => String(s || "").replace(/(\d+(?:[.,]\d+)?)\s*mm\s*\(H[öo]he\)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*mm\s*\(Breite\)/gi, "$1 × $2 mm").replace(/\bwechselnd(?:e|er|en)?(?=\s|,|$)/gi, "varying").replace(/\bSeiten\b/g, "pages");
// the usual format of a series' issues, from its group, name or size: LTB and pockets are Pocket book, magazines are Magazine
function seriesFormat(se) {
  if (!se) return "";
  const n = norm(se.name), f = norm(se.format), g = se.group || "";
  if (/hardcover|gebunden|inbunden|\bhc\b/.test(n + " " + f)) return "Hardcover";
  if (g === DE_LTB || g === DE_TB || g === SE_POC || /taschenbuch|\bpocket\b|\bltb\b|^topolino\b/.test(n)) return "Pocket book";
  if (g === DE_MAG || g === SE_MAG || /\b(magazin|zeitung|heft|hefte|tidning|tidningen)\b/.test(n) || ["kalle anka c o", "kalle anka co", "micky maus", "micky maus magazin"].includes(n)) return "Magazine";
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
    if (/^\d{4}X\d{1,3}$/.test(lab)) return y * 1000 + n + 0.5;                                   // extra: 1967X07 = 7½
    const v = /^\d{4}-\d{1,3}([A-Z])$/.exec(lab); if (v) return y * 1000 + n + (v[1].charCodeAt(0) - 64) / 100;   // 1967-02B = 2B
    return y * 1000 + n;
  }
  const rv = /^\s*(\d{1,5})\s*([A-Za-z])\s*$/.exec(lab); if (rv) return +rv[1] + (rv[2].toUpperCase().charCodeAt(0) - 64) / 100;   // 546A = 546.01, as its ranges read
  return c.issueNum || parseInt(lab, 10) || (/^0+$/.test(lab.trim()) ? 0 : null);   // issue 0 (Nullnummer) counts too
}
// a range's "from" or "to" as a number: "1952/4" or "4/1952" is year 1952 issue 4; a year alone is all of that year
// how a range reads: only From = that issue and all later ones, only To = everything up to it, both empty = all
function rangeText(r) { const f = String(r.from || "").trim(), t = String(r.to || "").trim(); return f && t ? (f === t ? f : f + "–" + t) : f ? f + " and all later" : t ? "all up to " + t : "all issues"; }
function rangeBound(key, v, isTo) {
  const t = String(v == null ? "" : v).trim(); if (!t) return NaN;
  const se = seriesById(key);
  if (se && se.numbering === "year") {
    // a plain number's "to" also covers its extras and variants (to 1967/7 includes 7½ and 7A)
    let m = /^(\d{4})\s*[\/.:-]\s*(?:nr\.?\s*)?(\d{1,3})$/i.exec(t); if (m) return +m[1] * 1000 + +m[2] + (isTo ? 0.99 : 0);
    m = /^(\d{4})\s*(?:[\/.:-]\s*(\d{1,3})\s*(?:½|[.,]5|1\/2)|X(\d{1,3}))$/i.exec(t); if (m) return +m[1] * 1000 + +(m[2] || m[3]) + 0.5;   // 7½, 7.5, 7,5
    m = /^(\d{4})\s*[\/.:-]\s*(\d{1,3})\s*([A-Z])$/.exec(t); if (m) return +m[1] * 1000 + +m[2] + (m[3].charCodeAt(0) - 64) / 100;
    m = /^(\d{1,3})\s*[\/.]\s*(\d{4})$/.exec(t); if (m) return +m[2] * 1000 + +m[1];
    m = /^(\d{4})$/.exec(t); if (m) return +m[1] * 1000 + (isTo ? 999 : 0);
    return NaN;
  }
  // running numbers: a variant "1B" is 1.02 (as parseIssue sorts it); a plain number's "to" covers its variants too
  const rv = /^(\d{1,5})\s*([A-Za-z])$/.exec(t); if (rv) return +rv[1] + (rv[2].toUpperCase().charCodeAt(0) - 64) / 100;
  const n = parseInt(t, 10); return isNaN(n) ? NaN : n + (isTo && /^\d+$/.test(t) ? 0.99 : 0);
}
// "Per year" of a yearly series: one number ("52") or by years ("1978-1983: 12, 1984-1988: 24", "1990-: 52");
// a year not covered by a "from-to: n" part uses the plain number, if any. 0 = not set
function perYearParts(se) {
  const parts = []; let plain = 0;
  String((se && se.perYear) || "").split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).forEach(x => {
    const m = /^(\d{4})?\s*(?:([-–])\s*(\d{4})?)?\s*[:=]\s*(\d{1,3})$/.exec(x);
    if (m && (m[1] || m[3])) parts.push({ a: m[1] ? +m[1] : -Infinity, b: m[3] ? +m[3] : m[2] ? Infinity : +m[1], n: +m[4] });
    else if (/^\d{1,3}$/.test(x)) plain = +x;
  });
  return { parts, plain };
}
function perYearOf(se, y) { const { parts, plain } = perYearParts(se), p = parts.find(p => y >= p.a && y <= p.b); return p ? p.n : plain; }
// squares for a year in Gaps: the setting (52 if not set), but never fewer than the highest number you have that year
function perYearFor(se, y, mine) {
  const own = Math.max(0, ...(mine || []).map(c => { const m = /^(\d{4})\/(\d{1,3})$/.exec(c.issueLabel || ""); return m && +m[1] === y ? +m[2] : 0; }));
  return Math.max(perYearOf(se, y) || 52, own);
}
// all issues of a yearly series from its first to its last year, by the setting (0 if not set)
function perYearTotal(se) { let t = 0; for (let y = +se.firstYear || 0; y && y <= (+se.lastYear || 0); y++) t += perYearOf(se, y); return t; }
// an edition name without its year: "Neuauflage 1997" and "Neuauflage 1998" are the same kind of edition
function editionKey(e) { return String(e || "").toLowerCase().replace(/\b(1[89]|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim(); }
// editions (1. Auflage, höhere Auflagen, Neuauflage …): price ranges can be for one edition; each comic can name its edition,
// and a series names the edition that counts for copies without one
function seriesEditions(key) { const m = new Map(); (S.valueRules || []).forEach(r => { if (r.s === key && r.ed && !m.has(editionKey(r.ed))) m.set(editionKey(r.ed), r.ed); }); return [...m.values()]; }
function defaultEditionOf(key) { const se = seriesById(key), eds = seriesEditions(key); if (se && se.defaultEdition && eds.some(e => editionKey(e) === editionKey(se.defaultEdition))) return se.defaultEdition; return eds.find(e => /höher|spätere|nachdruck|later/i.test(e)) || ""; }
const editionOf = c => c.edition || defaultEditionOf(valueKeyOf(c));
// a short mark for the gap grid: "1. Auflage" -> 1A, "Neuauflage" -> N, "Sonderausgabe" -> S
const editionMark = e => String(e || "").replace(/\b(1[89]|20)\d{2}\b/g, "").split(/[\s.-]+/).filter(Boolean).map(w => /^\d/.test(w) ? w : w[0].toUpperCase()).join("").slice(0, 3);
function valueRuleFor(c, asEdition) {
  const k = valueKeyOf(c); if (!k) return null;
  const n = valueNumber(c), all = (S.valueRules || []).filter(r => r.s === k && typeof r.price === "number");
  // ranges for this copy's edition first, then ranges for every edition, then the series' default edition
  const ed = editionKey(asEdition != null ? asEdition : editionOf(c)), def = editionKey(defaultEditionOf(k));
  const tiers = [ed, "", def].filter((x, i, a) => a.indexOf(x) === i);
  let rules = [];
  for (const t of tiers) { rules = all.filter(r => editionKey(r.ed) === t && (() => { const a = rangeBound(k, r.from), b = rangeBound(k, r.to, true); return (isNaN(a) && isNaN(b)) || (n != null && (isNaN(a) || n >= a) && (isNaN(b) || n <= b)); })()); if (rules.length) break; }
  const fits = rules;
  const width = r => { const a = rangeBound(k, r.from), b = rangeBound(k, r.to, true);
    return !isNaN(a) && !isNaN(b) ? b - a : !isNaN(a) ? 1e9 - a : !isNaN(b) ? 2e9 + b : 1e12; };
  return fits.sort((x, y) => width(x) - width(y))[0] || null;   // the narrowest range wins
}
// extras that came with a copy (lithograph, signature, box, gadget …), each with its own value, in CHF
function extrasCHF(c) { return (c.extras || []).reduce((a, x) => a + (typeof x.value === "number" ? toCHF(x.value, x.cur || "CHF") : 0), 0); }
function valueOf(c) {
  if (c && c.status === "notowned") return null;   // read without owning it: no value of yours
  const v = baseValueOf(c), x = c.status === "wanted" ? 0 : extrasCHF(c);
  if (!x) return v;
  if (!v) return { amount: Math.round(x * 100) / 100, cur: "CHF", how: "estimate", extras: x };
  return Object.assign({}, v, { amount: Math.round((v.amount + x / (rateOf(v.cur) || 1)) * 100) / 100, extras: x });
}
function baseValueOf(c) {
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
  // in order of the issues; a new empty range stays at the end; long lists show 10 until "Show all"
  const pos = r => { const b = rangeBound(key, r.from); return r.price === "" && !r.from && !r.to ? Infinity : isNaN(b) ? -1 : b; };
  const all = (S.valueRules || []).filter(r => r.s === key).sort((a, b) => pos(a) - pos(b) || rangeBound(key, a.to, true) - rangeBound(key, b.to, true));
  const full = (S.vrAll || {})[key] || all.length <= 12, rows = full ? all : all.slice(0, 10).concat(all.filter(r => pos(r) === Infinity));
  const cur = r => CURRENCIES.map(x => `<option${(r.cur || "CHF") === x ? " selected" : ""}>${x}</option>`).join("");
  const nm = collectorName(key), src = collectorLinks(key), se = seriesById(key), yearly = se && se.numbering === "year";
  const im = 'inputmode="text" autocapitalize="off"';   // normal keyboard: ranges can need / or - (1952/4), letters (34B) or ½
  const defCur = (rows[0] && rows[0].cur) || (se && seriesLang(se) === "Swedish" ? "SEK" : se && seriesLang(se) === "German" ? "EUR" : "CHF");
  return `<div class="wide valrules"><span class="l">Value per issue (condition Z1)</span>
    ${nm ? `<span class="small muted">Collector prices: ${src}. Copy the price list there and paste it below, or note a few prices and make ranges.</span>` : ""}
    ${rows.map(r => `<div class="vrow" data-vid="${esc(r.id)}"><input data-vf="from" ${im} placeholder="${yearly ? "1952/4" : "from"}" value="${esc(r.from || "")}" aria-label="From"><input data-vf="to" ${im} placeholder="${yearly ? "1952/12" : "to"}" value="${esc(r.to || "")}" aria-label="To"><input data-vf="price" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(r.price))}" aria-label="Price"><select data-vf="cur" aria-label="Currency">${cur(r)}</select><button type="button" class="ghost tiny" data-vmore aria-label="Edition and note" title="Edition and where the price is from">⋯</button><button type="button" class="ghost tiny" data-vdel="${esc(r.id)}" aria-label="Remove">✕</button><input data-vf="ed" class="vnote${r.ed ? "" : " vhide"}" list="edlist" placeholder="edition (empty = every edition)" value="${esc(r.ed || "")}"><input data-vf="note" class="vnote vhide" placeholder="where from, e.g. eBay sold, Oct 2026" value="${esc(r.note || "")}"></div><div class="small muted vread" data-vread="${esc(r.id)}">${typeof r.price === "number" ? "= " + esc(rangeText(r)) : ""}</div>`).join("")}
    ${(eds => eds.length ? `<label class="small"><span class="l">Copies without an edition count as</span><select data-vdef="${esc(key)}"><option value="">Automatic</option>${eds.map(e => `<option${editionKey(e) === editionKey(defaultEditionOf(key)) ? " selected" : ""}>${esc(e)}</option>`).join("")}</select></label><datalist id="edlist">${eds.map(e => `<option>${esc(e)}</option>`).join("")}</datalist>` : "")(seriesEditions(key))}
    ${full ? "" : `<button type="button" class="ghost" data-vall="${esc(key)}">Show all ${all.length} ranges</button>`}
    <div class="row" style="gap:8px;align-items:center"><button type="button" class="ghost" data-vadd="${esc(key)}">Add a price range</button><span class="small muted">${key.startsWith("book:") ? "From/to are volume numbers." : yearly ? "From/to are a year (all its issues) or year/issue, e.g. 1952/4." : "From/to are issue numbers."} Only From = that issue and all later ones; only To = all up to that issue; both empty = all. The narrowest range wins.</span></div>
    ${(sg => sg ? `<div class="banner small" style="margin:0"><div><strong>Suggested prices</strong> (${esc(sg.cur)}, checked on ${esc(niceDate(sg.date))}${(Date.now() - new Date(sg.date)) / 864e5 > 365 ? ", over a year ago: prices may have changed" : ""}): ${esc(sg.note)}<br><span class="mono">${esc(sg.text.split("\n").slice(0, 4).join(", "))}${sg.text.split("\n").length > 4 ? " …" : ""}</span></div><div class="row" style="gap:8px;margin-top:6px"><button type="button" data-psugg="${esc(key)}">Use these prices</button></div></div>` : "")(se && !all.some(r => r.price !== "" && r.price != null) && priceSuggFor(se))}
    <details class="pastebox" data-pk="${esc(key)}"><summary class="small"><strong>Paste prices or type several ranges</strong></summary>
      <div class="stack" style="margin-top:8px">
        <p class="small muted" style="margin:0">Paste a list copied from Comicguide.de (Zustand 1) or Seriekatalogen.se (the VF column is taken as Z1). Or type ranges, separated by commas: <span class="mono">${yearly ? "1951 800, 1952/1 450, 1952/4-1953/1 150" : "1-25 8, 26-80 5, 81- 3"}</span></p>
        <textarea data-ptext rows="5" placeholder="Paste or type here"></textarea>
        <div class="row" style="gap:8px;align-items:center"><button type="button" data-pread>Read prices</button><label class="small">Currency if none is given <select data-pcur>${CURRENCIES.map(x => `<option${x === defCur ? " selected" : ""}>${x}</option>`).join("")}</select></label></div>
        <div data-pout></div>
      </div></details>
    ${(miss => miss.length ? `<p class="small muted" style="margin:0">Your ${key.startsWith("book:") ? "books" : "comics"} without a price range (${miss.length}): ${esc(miss.slice(0, 40).join(", "))}${miss.length > 40 ? " …" : ""}</p>` : "")(all.some(r => typeof r.price === "number") ? sortComics(S.comics.filter(c => isOwn(c) && valueKeyOf(c) === key && typeof c.valueChecked !== "number" && !valueRuleFor(c))).map(c => showLabel(c.issueLabel || c.issue || "") || c.title || "?") : [])}</div>`;
}
// ---- reading pasted price lists into price ranges ----
// Comicguide: "1952: Nr. 4 150.00 €" (Zustand 1; reprints "(1. Nachdruck)" are skipped)
// Seriekatalogen: "1949 2 650 1300 2000 5000 10000" = year, issue, G VG FN VF NM; VF counts as Z1
// typed: "1-25 8, 26-80 5" or "1952/4-1953/1 150"
function priceAmount(t) { const n = parseAmt(t); return n === "" ? null : n; }
// price suggestions (catalogue/prices.json): by INDUCKS code, or "id:<series id>" for series INDUCKS doesn't have (Asterix)
function priceSuggFor(se) { const P = S.priceSugg || {}; return P[(catEntry(se) || {}).code || se.code] || P["id:" + se.id] || null; }
function priceCur(t, fallback) { return /€|eur/i.test(t) ? "EUR" : /\bkr\b|sek/i.test(t) ? "SEK" : /chf|fr\./i.test(t) ? "CHF" : fallback; }

function parsePrices(key, text, fallbackCur, edition) {
  const se = seriesById(key), yearly = !!(se && se.numbering === "year");
  const at = (y, n) => yearly ? (y || 0) * 1000 + (n || 0) : n;
  const items = [], skipped = [], unread = [], edRows = [];
  let reprints = 0, kind = "", bnum = 0, others = 0;
  const lines = String(text || "").split(/\r?\n/).map(l => l.replace(/ /g, " ").trim()).filter(Boolean);
  lines.forEach(line => {
    // the Nullnummer has no number in Comicguide's list: it is issue 0 (Micky Maus Magazin 1951/0); "(Nullnummer) 9000.00 €"
    if (/null-?nummer/i.test(line)) {
      const pm = /(\d[\d.,]*)\s*(€|eur|euro)?\s*$/i.exec(line), p = pm && priceAmount(pm[1]);
      const y = +((/^(\d{4})\b/.exec(line) || [])[1]) || (yearly ? +(se.firstYear || 0) || null : null);
      if (p == null || (yearly && !y)) { unread.push(line); return; }
      kind = kind || "Comicguide";
      items.push({ lo: at(y, 0), hi: at(y, 0), price: p, cur: pm[2] || !/kr|sek|chf/i.test(line) ? "EUR" : fallbackCur, zero: true }); return;
    }
    // Comicguide
    let m = /^(?:(\d{4})\s*:\s*)?Nr\.?\s*(\d{1,4})\s*(?:-\s*(\d{1,4}))?\s*(\(.*?\))?\s*([\d.,]+)\s*(€|EUR|Euro)?\s*$/i.exec(line);
    if (m) {
      kind = kind || "Comicguide";
      if (m[4]) { reprints++; return; }
      const y = m[1] ? +m[1] : null, a = +m[2], b = m[3] ? +m[3] : a, p = priceAmount(m[5]);
      if (yearly && !y) { unread.push(line); return; }
      if (p == null) { unread.push(line); return; }
      items.push({ lo: at(y, a), hi: at(y, b), price: p, cur: m[6] || /€|euro/i.test(line) ? "EUR" : fallbackCur }); return;
    }
    // Comicguide with titles and editions: "1 Der Kolumbusfalter (1. Auflage) Softcover 1000.00 €"
    const cg = /^(\d{1,4})\s+(?![-–:=])(.*\S)\s+(\d[\d.,]*)\s*(€|EUR|Euro|kr|SEK|CHF|Fr\.)\s*$/i.exec(line);   // a title, not "– 10: 1000 EUR"; kr and CHF too ("16 Asterix (1. Auflage) 80 kr")
    if (cg) {
      kind = kind || "Comicguide";
      if (yearly) { unread.push(line); return; }
      const ed = (/\(([^()]*)\)\s*[A-Za-zÄÖÜäöü\/ .-]{0,24}$/.exec(cg[2]) || [])[1] || "", p = priceAmount(cg[3]);
      if (p == null) { unread.push(line); return; }
      edRows.push({ n: +cg[1], ed: editionKey(ed), label: ed.replace(/\s*\b(1[89]|20)\d{2}\b/g, "").trim(), price: p, cur: priceCur(cg[4], "EUR") }); return;
    }
    // Seriekatalogen: year (or nothing), issue or issue range, then five prices
    // Seriekatalogen: year (or nothing), issue or issue range, an optional title, then five prices G VG FN VF NM ("-" = no price)
    // e.g. "1949 2 650 1300 2000 5000 10000" (Kalle Anka & C:o) or "1968 1 Tuff till tusen miljarder 100 200 300 750 1500" (Kalle Ankas Pocket)
    const sk = /^(?:(\d{4})\s+)?(\d{1,4})(½|[.,]5(?!\d)|[A-Z])?(?:\s*-\s*(\d{1,4}))?(?:\s+(.*?\D.*?))?((?:\s+(?:\d+|[-–]))\s+(?:\d+|[-–])\s+(?:\d+|[-–])\s+(?:\d+|[-–])\s+(?:\d+|[-–]))\s*$/.exec(line);
    if (sk) {
      kind = kind || "Seriekatalogen";
      // "1950 11B" (1950–1954): the B-nummer, extra issues of Kalle Anka & C:o (INDUCKS se/B), listed with Walt Disney's Serier;
      // "1967 2B" is Walt Disney's Serier 1967-02B, "1967 7½" its extra 1967X07
      const bSeries = !!(se && se.code === "se/B"), yr = sk[1] ? +sk[1] : 0; let frac = 0;
      if (sk[3] === "½" || /^[.,]5$/.test(sk[3] || "")) frac = 0.5;
      else if (sk[3]) { if (sk[3] === "B" && bSeries) frac = 0; else if (sk[3] === "B" && yr >= 1950 && yr <= 1954) { bnum++; return; } else frac = (sk[3].charCodeAt(0) - 64) / 100; }
      if (bSeries && sk[3] !== "B") { others++; return; }   // pasted into the B-nummer: the ordinary Walt Disney's Serier lines aren't theirs
      const nums = sk[6].trim().split(/\s+/).map(x => /^\d+$/.test(x) ? +x : null), y = sk[1] ? +sk[1] : null, a = +sk[2], b = sk[4] ? +sk[4] : a;
      if (nums[3] == null) { unread.push(line); return; }   // no VF price listed
      // Kalle Ankas bästa: "2016 4" and "2017 5" are cover numbers (book 4 = INDUCKS 2017/01); a year/number INDUCKS knows is used as it is
      if (yearly && listedSeries(se) && !sk[4] && !(y && listedSeries(se).years[y] && listedSeries(se).years[y].includes(a))) {
        const k = listedLabel(se, String(a), y) || (sk[5] && listedLabel(se, sk[5].trim(), y));
        if (k) { const v = rangeBound(key, k); items.push({ lo: v, hi: v, price: nums[3], cur: "SEK", single: true }); return; }
      }
      if (yearly && !y) { unread.push(line); return; }
      // running series (Kalle Ankas Pocket): the year column is only the publication year
      items.push({ lo: yearly ? at(y, a) + frac : a + frac, hi: yearly ? at(y, b) + (sk[4] ? 0 : frac) : b + (sk[4] ? 0 : frac), price: nums[3], cur: "SEK" }); return;
    }
    // a title or book number with a price, in a series like Kalle Ankas bästa: "Spookyzone 2 120 kr", "Kalle Ankas bästa 4: 250"
    if (yearly && listedSeries(se)) {
      const tp = /^(.*?\D.*?)\s*[:=]?\s+(\d[\d.,]*)\s*(kr|sek|€|eur|euro|chf|fr\.?)?\s*$/i.exec(line), k = tp && !/^\d{4}\b/.test(tp[1]) && listedLabel(se, tp[1].replace(/[\s:–-]+$/, ""));
      if (k && priceAmount(tp[2]) != null) { const v = rangeBound(key, k); kind = kind || "list"; items.push({ lo: v, hi: v, price: priceAmount(tp[2]), cur: tp[3] ? priceCur(tp[3], fallbackCur) : fallbackCur, single: true }); return; }
    }
    // typed ranges, several per line
    let any = false;
    // ranges are split at ";" or ", " only: "6,5" (a half number) and "8,50 €" (a price) stay whole
    line.split(/;|,\s+/).map(x => x.trim()).filter(Boolean).forEach(part => {
      const B = yearly ? "(\\d{4}(?:\\s*\\/\\s*\\d{1,3}(?:½|[.,]5|[A-Z])?)?)" : "(\\d{1,5}[A-Za-z]?)";
      const r = new RegExp("^" + B + "?\\s*([-–])?\\s*" + B + "?\\s*[:=→>]?\\s+([\\d.,]+)\\s*(€|eur|kr|sek|chf|fr\\.?)?$", "i").exec(part);
      if (!r || (!r[1] && !r[3])) { skipped.push(part); return; }
      const p = priceAmount(r[4]); if (p == null) { skipped.push(part); return; }
      const lo = r[1] ? rangeBound(key, r[1].replace(/\s+/g, "")) : NaN, hi0 = r[3] ? rangeBound(key, r[3].replace(/\s+/g, ""), true) : NaN;
      const hi = r[2] ? hi0 : r[1] ? rangeBound(key, r[1].replace(/\s+/g, ""), true) : hi0;
      items.push({ lo: isNaN(lo) ? null : lo, hi: isNaN(hi) ? null : hi, price: p, cur: r[5] ? priceCur(r[5], fallbackCur) : fallbackCur, typed: true }); any = true;
    });
    if (any) kind = kind || "typed";
  });
  // several editions per issue (1. Auflage, höhere Auflagen, Neuauflage ...): one edition counts, chosen by you;
  // the default is the later printings, the copies most collectors have
  const editions = []; let chosen = "", edMissing = 0;
  if (edRows.length) {
    const cnt = {}; edRows.forEach(r => { if (!cnt[r.ed]) { cnt[r.ed] = { key: r.ed, label: r.label || "No edition named", n: 0 }; editions.push(cnt[r.ed]); } cnt[r.ed].n++; });
    const want = edition != null && cnt[edition] ? edition : (editions.find(e => /höher|spätere|nachdruck|later/.test(e.key)) || editions.slice().sort((a, b) => b.n - a.n)[0]).key;
    chosen = want;
    const byN = {}; edRows.forEach(r => (byN[r.n] = byN[r.n] || []).push(r));
    Object.keys(byN).forEach(n => { const rs = byN[n], r = rs.find(x => x.ed === want) || rs.find(x => x.ed === ""); if (r) items.push({ lo: +n, hi: +n, price: r.price, cur: r.cur || "EUR" }); else edMissing++; });
  }
  // every edition with its own ranges, to add them all
  const merge = list => { const out = []; list.sort((a, b) => a.lo - b.lo).forEach(x => { const l = out[out.length - 1]; if (l && l.price === x.price && l.cur === x.cur) l.hi = Math.max(l.hi, x.hi); else out.push(Object.assign({}, x)); }); return out; };
  const byEdition = editions.map(e => ({ key: e.key, label: e.label, n: e.n, ranges: merge(edRows.filter(r => r.ed === e.key).map(r => ({ lo: r.n, hi: r.n, price: r.price, cur: r.cur || "EUR" }))) }));
  // a pasted list: neighbouring issues with the same price become one range; typed ranges stay as typed
  const listed = items.filter(x => !x.typed).sort((a, b) => a.lo - b.lo), ranges = [];
  listed.forEach(x => {
    const last = ranges[ranges.length - 1];
    if (x.zero) { ranges.push(Object.assign({}, x)); return; }   // the Nullnummer keeps its own range
    if (last && !last.zero && last.price === x.price && last.cur === x.cur) last.hi = Math.max(last.hi, x.hi); else ranges.push(Object.assign({}, x));
  });
  items.filter(x => x.typed).forEach(x => ranges.push(x));
  // from a pasted list, lines with a price that couldn't be placed (e.g. "(Nullnummer) 9000.00 €") are listed for you
  if (kind && kind !== "typed") skipped.filter(x => /€|\d[.,]\d\d\b/.test(x)).forEach(x => unread.push(x));
  return { ranges, kind, reprints, bnum, others, unread, skipped: kind === "typed" ? skipped : [], issues: listed.length, editions, edition: chosen, edMissing, byEdition };
}
// issue 0 written so it can't be mistaken for a whole year: "1951/0", or "0" in a running series
function zeroText(key, v) { const se = seriesById(key); return se && se.numbering === "year" ? Math.floor(v / 1000) + "/0" : "0"; }
function boundText(key, v, isTo) {
  if (v == null) return "";
  const se = seriesById(key);
  if (se && se.numbering === "year") {
    const y = Math.floor(v / 1000), r = Math.round((v - y * 1000) * 100) / 100, n = Math.floor(r), f = Math.round((r - n) * 100);
    if (f === 50) return y + "/" + n + "½";                                     // extra
    if (f > 0 && f <= 26 && f !== 99) return y + "/" + n + String.fromCharCode(64 + f);   // variant 2B
    return n === 0 && !isTo ? String(y) : n === 999 ? String(y) : y + "/" + n;
  }
  return String(v);
}
function bindPasteBox(root) {
  // a suggested list goes into the paste box and is read like a pasted one: you still see it and confirm
  (root || document).querySelectorAll("[data-psugg]").forEach(b => b.onclick = () => {
    const key = b.dataset.psugg, se = seriesById(key), sg = se && priceSuggFor(se);
    const d = [...document.querySelectorAll("details.pastebox")].find(x => x.dataset.pk === key); if (!sg || !d) return;
    d.open = true; d.querySelector("[data-ptext]").value = sg.text; d.querySelector("[data-pcur]").value = sg.cur;
    d.querySelector("[data-pread]").click(); d.scrollIntoView({ block: "start" });
  });
  (root || document).querySelectorAll("details.pastebox").forEach(d => {
    const key = d.dataset.pk, out = d.querySelector("[data-pout]");
    const read = () => {
      const res = parsePrices(key, d.querySelector("[data-ptext]").value, d.querySelector("[data-pcur]").value, d.dataset.ped);
      if (!res.ranges.length) { out.innerHTML = '<div class="banner warn small">No prices found. Paste the lines with issue numbers and prices, or type ranges like 1-25 8.</div>'; return; }
      const have = (S.valueRules || []).filter(r => r.s === key).length;
      const span = r => { if (r.zero) return zeroText(key, r.lo) + " (Nullnummer)"; const a = r.lo == null ? "" : boundText(key, r.lo), z = r.hi == null ? "" : boundText(key, r.hi, true); return !a ? "all up to " + z : !z ? a + " and later" : a === z ? a : a + " – " + z; };
      const line = r => `<li>${esc(span(r))} → ${esc(money(r.price, r.cur))}</li>`;
      const notes = [res.kind && res.kind !== "typed" ? `Read as a ${res.kind} list: ${res.issues} issues${res.kind === "Seriekatalogen" ? ", VF prices" : ""}` : "", res.reprints ? res.reprints + " reprints skipped" : "", res.others ? res.others + " lines without B skipped (they belong to Walt Disney's Serier)" : "", res.bnum ? res.bnum + " B-nummer skipped (1950–1954, a series of their own: Kalle Anka & C:o (B-nummer), INDUCKS se/B)" : ""].filter(Boolean).join(" · ");
      const left = res.unread.concat(res.skipped);
      out.innerHTML = `<div class="stack small" style="gap:6px">
        <strong>${res.ranges.length} ${res.ranges.length === 1 ? "range" : "ranges"} found</strong>${notes ? `<span class="muted">${esc(notes)}</span>` : ""}
        ${res.editions.length > 1 ? `<span class="muted">${res.editions.length} editions: ${esc(res.byEdition.map(e => e.label + " (" + e.ranges.length + " ranges)").join(", "))}. All are added; each comic counts with its own edition.</span>
          <label class="small"><span class="l">Copies without an edition count as</span><select data-ped>${res.editions.map(e => `<option value="${esc(e.key)}"${e.key === res.edition ? " selected" : ""}>${esc(e.label)}</option>`).join("")}</select></label>
          <span class="muted">Set the edition of single comics in the comic's form, or in Gaps with “Edition”. Below: the ranges for the edition chosen here.</span>` : ""}
        <ul class="pranges">${res.ranges.slice(0, 60).map(line).join("")}${res.ranges.length > 60 ? `<li class="muted">… and ${res.ranges.length - 60} more</li>` : ""}</ul>
        ${left.length ? `<details><summary>${left.length} ${left.length === 1 ? "line" : "lines"} not added (enter these yourself if needed)</summary><ul>${left.slice(0, 30).map(x => `<li class="mono">${esc(x)}</li>`).join("")}</ul></details>` : ""}
        ${have ? `<label class="check" style="min-height:0"><input type="checkbox" data-preplace> Remove the ${have} current ${have === 1 ? "range" : "ranges"} of this series first</label>` : ""}
        <div class="row"><button type="button" class="primary" data-padd>${res.editions.length > 1 ? "Add all " + res.byEdition.reduce((a, e) => a + e.ranges.length, 0) + " ranges" : "Add " + res.ranges.length + " " + (res.ranges.length === 1 ? "range" : "ranges")}</button></div></div>`;
      out.querySelector("[data-padd]").onclick = () => {
        const rep = out.querySelector("[data-preplace]"), keep = rep && rep.checked ? (S.valueRules || []).filter(r => r.s !== key) : (S.valueRules || []);
        const mk = (r, ed) => ({ id: newId(), s: key, from: r.zero ? zeroText(key, r.lo) : r.lo == null ? "" : boundText(key, r.lo), to: r.zero ? zeroText(key, r.hi) : r.hi == null ? "" : boundText(key, r.hi, true), price: r.price, cur: r.cur, note: res.kind && res.kind !== "typed" ? res.kind : "", ed: ed || "" });
        const multi = res.editions.length > 1;
        S.valueRules = keep.concat(multi ? res.byEdition.flatMap(e => e.ranges.map(r => mk(r, e.label))) : res.ranges.map(r => mk(r)));
        if (multi) { const se = seriesById(key), def = res.byEdition.find(e => e.key === res.edition); if (se && def) { se.defaultEdition = def.label; saveSeries().catch(() => {}); } }
        setConfig("valueRules", S.valueRules).catch(() => {});
        const added = res.editions.length > 1 ? res.byEdition.reduce((a, e) => a + e.ranges.length, 0) : res.ranges.length;
        toast(added + (added === 1 ? " price range added" : " price ranges added")); renderKeep();
      };
      const sel = out.querySelector("[data-ped]"); if (sel) sel.onchange = () => { d.dataset.ped = sel.value; read(); };
    };
    d.querySelector("[data-pread]").onclick = () => { delete d.dataset.ped; read(); };
  });
}
function bindValueRules(root) {
  const save = () => setConfig("valueRules", S.valueRules || []).catch(() => {});
  (root || document).querySelectorAll(".vrow").forEach(row => row.querySelectorAll("[data-vf]").forEach(inp => inp.onchange = () => {
    const r = (S.valueRules || []).find(x => x.id === row.dataset.vid); if (!r) return;
    const k = inp.dataset.vf; r[k] = k === "price" ? parseAmt(inp.value) : inp.value.trim(); save();
    const rd = document.querySelector(`[data-vread="${CSS.escape(r.id)}"]`); if (rd) rd.textContent = typeof r.price === "number" ? "= " + rangeText(r) : "";
  }));
  (root || document).querySelectorAll("[data-vadd]").forEach(b => b.onclick = () => { S.valueRules = (S.valueRules || []).concat([{ id: newId(), s: b.dataset.vadd, from: "", to: "", price: "", cur: "CHF", note: "" }]); save(); renderKeep(); });
  (root || document).querySelectorAll("[data-vmore]").forEach(b => b.onclick = () => b.closest(".vrow").classList.toggle("more"));
  (root || document).querySelectorAll("[data-vall]").forEach(b => b.onclick = () => { S.vrAll = Object.assign({}, S.vrAll, { [b.dataset.vall]: true }); renderKeep(); });
  (root || document).querySelectorAll("[data-vdel]").forEach(b => b.onclick = () => { S.valueRules = (S.valueRules || []).filter(r => r.id !== b.dataset.vdel); save(); renderKeep(); });
  (root || document).querySelectorAll("[data-vdef]").forEach(sel => sel.onchange = async () => { const se = seriesById(sel.dataset.vdef); if (!se) return; se.defaultEdition = sel.value; try { await saveSeries(); toast("Saved"); } catch (e) { toast(errText(e)); } });
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
    <div class="tablewrap"><table class="moneytab"><thead><tr><th>Priced in</th><th>Likely</th><th>≈ CHF</th><th>Range</th><th>Checked</th><th>Table</th><th>Own est.</th></tr></thead><tbody>${curs.map(k => { const x = per[k], t = x.checked + x.table + x.estimate, lo = x.checked * 0.9 + (x.table + x.estimate) * 0.6, hi = x.checked * 1.1 + (x.table + x.estimate) * 1.4;
      return `<tr><td>${k}</td><td><strong>${fmt2(t)}</strong></td><td>${k === "CHF" ? "–" : fmt2(toCHF(t, k))}</td><td>${fmt2(lo)}–${fmt2(hi)}</td><td>${fmt2(x.checked)}</td><td>${fmt2(x.table)}</td><td>${fmt2(x.estimate)}</td></tr>`; }).join("")}</tbody></table></div>
    <p class="small muted" style="margin:0">Each row is a different group of comics: those whose value is in that currency (e.g. Swedish comics from Seriekatalogen in SEK), in that currency. The ≈ CHF column converts them; together they make the total above.</p>
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
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3200); }
function seriesById(id) { return S.series.find(s => s.id === id); }
// Kalle Ankas bästa: books 1–6 (2016–2017) carry a running number on the cover, INDUCKS lists them as 2016/01–2017/03;
// from 2018 the books are numbered year/1–6 and most have only a title. A small yearly series with gaps in INDUCKS counts as such.
function listedSeries(se) {
  if (!se || se.numbering !== "year") return null;
  const ent = catEntry(se), cat = ent && S.catCache[ent.file]; if (!cat) return null;
  if (cat._listed !== undefined) return cat._listed;
  const labs = Object.keys(cat.issues || {}).filter(k => /^\d{4}\/\d{1,3}$/.test(k)).sort();
  const per = {}; labs.forEach(k => { const y = k.slice(0, 4), n = +k.slice(5); (per[y] = per[y] || []).push(n); });
  const small = Object.values(per).every(ns => Math.max(...ns) <= 12), gaps = Object.values(per).some(ns => ns.length < Math.max(...ns));
  const titles = new Map(); labs.forEach(k => { const t = norm(cat.issues[k].t || ""); if (t && !titles.has(t)) titles.set(t, k); });
  cat._listed = labs.length && labs.length <= 400 && small && gaps ? { order: labs, titles, years: per } : null;
  return cat._listed;
}
// "4" or "Kalle Ankas bästa 4" (the cover number), "Spookyzone 2" (a title) -> the INDUCKS label (2017/01, 2021/05).
// With a year (from a price list), the book must be from that year or the one next to it (Seriekatalogen: book 4 in 2016, INDUCKS 2017/01).
function listedLabel(se, raw, year) {
  const L = listedSeries(se); if (!L) return "";
  const t = norm(String(raw || "")); if (!t) return "";
  const near = k => !year || Math.abs(+k.slice(0, 4) - +year) <= 1;
  const byTitle = L.titles.get(t) || (/^\d{1,3}$/.test(t) ? L.titles.get(norm(se.name + " " + t)) : "");
  if (byTitle) return near(byTitle) ? byTitle : "";
  if (t.length >= 6 && !/^\d+$/.test(t)) { const hits = [...L.titles.keys()].filter(x => x.length >= 6 && (x.includes(t) || t.includes(x)) && near(L.titles.get(x))); if (hits.length === 1) return L.titles.get(hits[0]); }
  return "";
}
function parseIssue(series, raw) {
  const s = String(raw || "").trim();
  // a book number or title without a year, in a series like Kalle Ankas bästa
  if (series && series.numbering === "year" && s && !/\d{4}/.test(s)) { const k = listedLabel(series, s.replace(/^(nr\.?|#)\s*/i, "")); if (k) return parseIssue(series, k); }
  if (series && series.numbering === "year") {
    // extras between two numbers, INDUCKS writes them 1967X07: "1967/7½", "1967 7 1/2", "1967X07"
    const xh = s.match(/^(\d{4})\s*(?:[\/:.-]\s*|\s)(?:nr\.?\s*)?(\d{1,3})\s*(?:½|1\/2|,5|\.5)$/i) || s.match(/^(\d{4})X(\d{1,3})$/i);
    if (xh) return { year: +xh[1], n: +xh[2], sort: +xh[1] * 1000 + +xh[2] + 0.5, label: xh[1] + "X" + String(+xh[2]).padStart(2, "0") };
    // double issues: "2016/11-12", "2016 11+12", "11-12/2016" -> "2016-11-12", the INDUCKS form
    // a variant of a double issue keeps its letter: "2019/1-2B" -> "2019-01-02B" (Herman Hedning)
    let dd = s.match(/(\d{4})\D+?(\d{1,3})\s*[-+&]\s*(\d{1,3})(?!\d)\s*([A-Za-z](?![A-Za-z]))?/), dr = !dd && s.match(/^\D*(\d{1,3})\s*[-+&]\s*(\d{1,3})\D+(\d{4})(?!\d)/);
    if (dr) dd = [dr[0], dr[3], dr[1], dr[2]];
    if (dd && +dd[3] > +dd[2] && +dd[3] - +dd[2] <= 2) {
      const pad = x => String(+x).padStart(2, "0"), L = dd[4] ? dd[4].toUpperCase() : "";
      return { year: +dd[1], n: +dd[2], sort: +dd[1] * 1000 + +dd[2] + (L ? (L.charCodeAt(0) - 64) / 100 : 0), label: dd[1] + "-" + pad(dd[2]) + "-" + pad(dd[3]) + L };
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
  if (n === "StorageWait") return "The phone's storage didn't answer for 20 seconds, so this wasn't saved. Close other tabs with this app (or close DuckDuckGo and open it again), then try again.";
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
    // the phone's storage can wait forever, e.g. for another tab with this app that Android has paused: give up after 20 s
    const timer = setTimeout(() => { try { t.abort(); } catch (e) {} const e = new Error("storage did not answer"); e.name = "StorageWait"; rej(e); }, 20000);
    let out; const req = fn(st);
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => { clearTimeout(timer); res(out); };
    t.onerror = () => { clearTimeout(timer); rej(t.error); };
    t.onabort = () => { clearTimeout(timer); rej(t.error || new Error("Saving was stopped")); };
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
    S.completeKeys = await getConfig("completeSeries") || {};
    S.barcodeYears = await getConfig("barcodeYears") || {};
    S.recentSeries = await getConfig("recentSeries") || [];
    S.comics = await tx("comics", "readonly", st => st.getAll()) || [];
    S.comics.forEach(c => { if (c.barcode && c.seriesId && !S.barcodes[c.barcode]) S.barcodes[c.barcode] = c.seriesId; });   // also after a restore
    S.storyRatings = await getConfig("storyRatings") || {};
    S.bookMeta = await getConfig("bookSeriesInfo") || {};
    S.authorCountry = await getConfig("authorCountry") || {};
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
    S.valueHistory = await getConfig("valueHistory") || {};
    S.priceBatchDone = await getConfig("priceBatchDone") || [];
    S.lastRuns = await getConfig("lastRuns") || {};
    S.storyKinds = await getConfig("storyKinds") || {};   // kind of each story series (da-v237)
    S.todoHidden = await getConfig("todoHidden") || [];   // Stats › To do lines hidden with "Not now" (da-v237)
    // once: genres filled in by the book databases before October 2026 were lists or catalogue codes; keep one clean genre
    // (run again in version 51: genres from different databases now share one English name)
    // once: comics without a format get their series' usual format (Magazine, Pocket book, ...)
    // once: prices kept as text ("12.50", from imports) become numbers, purchase dates "12.10.2026" become 2026-10-12, so every sum and chart counts them
    if (!(await getConfig("otherGroupFix1")) && arrangedInUse()) {
      const n = [];
      S.series.forEach(se => { if (!se.code || (se.publisher || DISNEY) !== DISNEY || (se.group && se.group !== OTHER_GROUP)) return;
        const a = arrangeSeries(se); if (a.group && a.group !== OTHER_GROUP) { se.group = a.group; n.push(se.name + " → " + a.group); } });
      if (n.length) { await setConfig("series", S.series); setTimeout(() => toast("Series group fixed: " + n.join(", ")), 2500); }
      await setConfig("otherGroupFix1", true);
    }
    if (!(await getConfig("dkShortFix1"))) {
      const n = [];
      S.series.forEach(se => { const m = /duckipedia\.org\/(.+)$/.exec(se.aboutSrc || ""); if (!m) return;
        let t = m[1]; try { t = decodeURIComponent(t); } catch (e) {} t = t.replace(/_/g, " ");
        if (!pageFits(t, se)) { delete se.about; delete se.aboutSrc; n.push(se.name); } });
      if (n.length) { await setConfig("series", S.series); setTimeout(() => toast("Wrong Duckipedia description removed from: " + n.join(", ")), 2000); }
      await setConfig("dkShortFix1", true);
    }
    if (!(await getConfig("moneyFix1"))) {
      const num = v => typeof v === "string" && v.trim() !== "" && typeof parseAmt(v) === "number";
      const fix = S.comics.filter(c => num(c.pricePaid) || num(c.value) || num(c.valueChecked) || num(c.lotTotal) || (c.purchaseDate && isoDate(c.purchaseDate) !== c.purchaseDate)).map(c => {
        const o = Object.assign({}, c); ["pricePaid", "value", "valueChecked", "lotTotal"].forEach(k => { if (num(o[k])) o[k] = parseAmt(o[k]); });
        if (o.purchaseDate) o.purchaseDate = isoDate(o.purchaseDate); return o; });
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("moneyFix1", true);
    }
    if (!(await getConfig("lotDates1"))) {
      const lots = {}; S.comics.forEach(c => { if (c.lotId && isOwn(c)) (lots[c.lotId] = lots[c.lotId] || []).push(c); });
      const fix = [];
      Object.values(lots).forEach(m => {
        const withDate = m.filter(c => c.purchaseDate).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        const withSrc = m.filter(c => c.source).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
        const date = withDate.length ? withDate[0].purchaseDate : "", src = withSrc.length ? withSrc[0].source : "";
        m.forEach(c => { if ((date && c.purchaseDate !== date) || (src && !c.source)) fix.push(Object.assign({}, c, date ? { purchaseDate: date } : {}, src && !c.source ? { source: src } : {})); });
      });
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("lotDates1", true);
    }
    // once: comic genres the app had filled in with its first rules (Kurzgeschichte -> Short Stories, Gagstory ignored) are redone; typed ones stay
    if (!(await getConfig("bookSeriesTidy1"))) {
      const used = new Set(S.comics.filter(c => c.kind === "book" && c.seriesName).map(c => c.seriesName).concat((S.bookSeriesExtra || []).map(x => x.name)));
      const lower = new Set([...used].map(n => n.toLowerCase()));
      let ch = false; const sz = Object.assign({}, S.bookSizes), mt = Object.assign({}, S.bookMeta);
      Object.keys(sz).concat(Object.keys(mt)).forEach(k => { if (!used.has(k) && lower.has(k.toLowerCase())) { delete sz[k]; delete mt[k]; ch = true; } });
      if (ch) { S.bookSizes = sz; S.bookMeta = mt; await setConfig("bookSizes", sz); await setConfig("bookSeriesInfo", mt); }
      await setConfig("bookSeriesTidy1", true);
    }
    // once: "One-pager" is a story's genre, not a whole comic's or book's; and Panzerknacker & Co 2 (bought from the wishlist before da-v213 counted it)
    if (!(await getConfig("onePagerOff1"))) {
      const fix = [];
      S.comics.forEach(c => { if (!/one-pager/i.test(c.genre || "")) return;
        let g = String(c.genre).split(/\s*,\s*/).filter(x => x && !/^one-pager$/i.test(x)).join(", ");
        if (!g && !isNovel(c)) g = storyGenres(c);
        fix.push(Object.assign({}, c, { genre: g })); });
      const pk = S.comics.find(c => isOwn(c) && !c.wasWish && /panzerknacker/i.test((seriesById(c.seriesId) || {}).name || c.seriesName || "") && String(c.issueLabel || c.issue) === "2");
      if (pk) { const f = fix.find(x => x.id === pk.id) || pk, i = fix.indexOf(f); const g = Object.assign({}, f, { wasWish: true }); if (!/^\d{4}/.test(String(g.purchaseDate || ""))) g.purchaseDate = todayIso(); if (i >= 0) fix[i] = g; else fix.push(g); }
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("onePagerOff1", true);
    }
    // once: "Comics" removed as a genre of comics and comic books; app-made comic genres redone (One-pager for Einseiter)
    if (!(await getConfig("comicGenre3")) && window.Books && Books.oneGenre) {
      const appNames = new Set(["Adventure", "Crime", "Short Stories", "Science Fiction", "Horror", "Fantasy", "Humour", "Superheroes", "Historical", "Sport", "Romance", "Comics"]);
      const fix = [];
      S.comics.forEach(c => {
        if (isNovel(c) || !c.genre) return;
        let g = noComicsGenre(c.genre);
        if (c.kind !== "book" && storyGenres(c) && String(c.genre).split(/\s*,\s*/).every(x => appNames.has(x))) g = storyGenres(c);
        if (g !== c.genre) fix.push(Object.assign({}, c, { genre: g }));
      });
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("comicGenre3", true); await setConfig("comicGenre2", true);
    }
    if (!(await getConfig("comicGenre2")) && window.Books && Books.oneGenre) {
      const oldRule = c => Books.oneGenre((c.stories || []).map(s => s.genre).filter(Boolean).join(", ").replace(/\b(komödie|komödien|komik|gags?|slapstick|parodie|satire|witz|humoreske|comedy)\b/gi, "Humour").replace(/\b(schatzsuche|expedition|reise)\b/gi, "Adventure"), true);
      const appNames = new Set(["Adventure", "Crime", "Short Stories", "Science Fiction", "Horror", "Fantasy", "Humour", "Mythology", "Drama", "Thriller", "Historical Fiction", "Fairy Tales", "Novel", "Children's", "Young Adult", "Comics", "Romance"]);
      const fix = S.comics.filter(c => c.kind !== "book" && c.genre && storyGenres(c) && storyGenres(c) !== c.genre && (c.genre === oldRule(c) || String(c.genre).split(/\s*,\s*/).every(g => appNames.has(g)))).map(c => Object.assign({}, c, { genre: storyGenres(c) }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("comicGenre2", true); await setConfig("comicGenre1", true);
    }
    if (!(await getConfig("comicGenre1"))) {
      const fix = S.comics.filter(c => c.kind !== "book" && !c.genre && storyGenres(c)).map(c => Object.assign({}, c, { genre: storyGenres(c) }));
      if (fix.length) await saveMany(fix, null, true);
      await setConfig("comicGenre1", true);
    }
    // every start: GCD cover links your phone couldn't load are dropped, so the comic counts as "no cover" again (photo or another source)
    { const dead = S.comics.filter(c => deadCoverHost(c.coverUrl) && c.coverKeepFail === c.coverUrl).map(c => Object.assign({}, c, { coverUrl: "", coverKeepFail: "" })); if (dead.length) await saveMany(dead, null, true); }
    // every start: German format names and series sizes become English (also catches an old backup restored earlier)
    { const fx = S.comics.filter(c => FMT_EN[c.format]).map(c => Object.assign({}, c, { format: FMT_EN[c.format] })); if (fx.length) await saveMany(fx, null, true);
      if (S.series.some(se => se.format && enSize(se.format) !== se.format)) await saveSeries(); }
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
  ["pricePaid", "value", "valueChecked", "lotTotal"].forEach(k => { if (typeof body[k] === "string" && body[k].trim() !== "" && typeof parseAmt(body[k]) === "number") body[k] = parseAmt(body[k]); });
  if (body.purchaseDate) body.purchaseDate = isoDate(body.purchaseDate);
  if (FMT_EN[body.format]) body.format = FMT_EN[body.format];
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
  // a wish that becomes owned (I bought it, or "I own it" in its edit form) counts as a fulfilled wish; without a purchase date, in the month it changed
  const old = c && c.id && S.comics.find(x => x.id === c.id);
  if (old && old.status === "wanted" && isOwn(c) && !c.wasWish) { c = Object.assign({}, c, { wasWish: true }); if (!/^\d{4}/.test(String(c.purchaseDate || ""))) c.wishGotOn = todayIso(); }
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
  return `<div class="banner warn nag"><span>${why}</span><div class="row" style="gap:6px">${navigator.share && navigator.canShare ? '<button class="primary" id="nagshare" type="button">Send backup…</button><button id="nagcopy" type="button">Copy backup</button>' : '<button class="primary" id="nagcopy" type="button">Copy backup</button>'}<button id="naggo" type="button">Backup page</button><button class="ghost" id="naglater" type="button">Later</button></div></div>`;
}
function bindBackupNag() {
  $("#naglater") && ($("#naglater").onclick = () => { S.nagLater = true; renderKeep(); });
  $("#naggo") && ($("#naggo").onclick = () => nav("backup"));
  $("#nagshare") && ($("#nagshare").onclick = async () => {
    const f = backupFile(true); let ok = false;
    try { ok = navigator.canShare({ files: [f] }); } catch (e) {}
    try {
      if (ok) { await navigator.share({ files: [f] }); toast("Backup sent"); }
      else { await saveToDevice(f); toast("Saved to Downloads: " + f.name); }
      await markBackedUp(); renderKeep();
    } catch (e) { if (!(e && e.name === "AbortError")) { toast("Sending didn't work. Use the Backup page."); nav("backup"); } }
  });
  $("#nagcopy") && ($("#nagcopy").onclick = async () => {
    try {
      const txt = await backupText();
      await navigator.clipboard.writeText(txt); await markBackedUp();
      toast("Backup copied. Paste it into Gmail, Keep or Docs."); renderKeep();
    } catch (e) { toast("Copying didn't work here. Use the Backup page instead."); nav("backup"); }
  });
}
function coverBar() {
  if (!S.comics.length) return "";
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
// a catalogue rebuild (monthly, or whenever a series is added) only brings a new try when it can help:
// the comic's series is newly in the catalogue, or the last try is at least 30 days old
const coverRetry = c => {
  if (!(S.catalogue && S.catalogue.built && S.catalogue.built > c.coverNone)) return false;
  const ent = catEntry(seriesById(c.seriesId)), file = ent ? ent.file : "";
  if (c.coverNoneCat !== undefined && file !== c.coverNoneCat) return true;
  return Date.now() - Date.parse(c.coverNone + "Z") >= 30 * 864e5;
};
// books: the book databases are asked again 30 days after a try found nothing; web serials and short stories have no cover to find
const bookNoCover = c => c.kind === "book" && (/^(Web serial|Short story)$/.test(c.format || "") || /royalroad\.com|fullreads\.com/.test(c.link || ""));
const noCoverYet = c => !c.coverUrl && !bookNoCover(c) && (!c.coverNone || (c.kind === "book" ? Date.now() - Date.parse(c.coverNone + "Z") >= 30 * 864e5 : coverRetry(c)));
// a book's cover from Open Library, Google Books, Libris or the DNB: by ISBN, else by title + author (only a hit whose title and author match)
async function bookCover(c) {
  if (!window.Books) return "";
  if (c.isbn) { try { const r = await Books.lookupIsbn(c.isbn); if (r && r.data && r.data.cover) return r.data.cover; } catch (e) {} }
  const norm = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const main = norm(String(c.title || "").split(/\s[:–-]\s|: /)[0]); if (main.length < 3) return "";
  const last = norm(String(c.author || "").split(/,|&| and /)[0]).split(" ").pop();
  let hits = []; try { hits = await Books.search((c.title || "") + (c.author ? " " + String(c.author).split(/,|&/)[0] : "")); } catch (e) {}
  const ok = h => { const t = norm(h.title); return h.cover && (t === main || t.startsWith(main + " ") || main.startsWith(t + " ") && t.length >= 8) && (!last || (h.authors || []).some(a => norm(a).split(" ").includes(last))); };
  const h = hits.find(ok); return h ? h.cover : "";
}
// the stored copy only while it is of the current picture: after a cover change the new one shows (and is stored next)
const coverOf = c => (S.coverObj && S.coverObj[c.id] && (!c.coverUrl || S.coverHas[c.id + "|" + c.coverUrl]) ? S.coverObj[c.id] : "") || c.coverUrl || "";
// finds covers for comics without one (INDUCKS catalogue first, then Duckipedia) and books (book databases), and keeps small copies of all
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
    if (c.kind === "book") { url = await bookCover(c).catch(() => ""); if (url) { if (await saveComic(Object.assign({}, c, { coverUrl: url }), true).catch(() => null)) run.found++; } else await saveComic(Object.assign({}, c, { coverNone: new Date().toISOString().slice(0, 16) }), true).catch(() => null); run.done++; draw(); continue; }
    try {
      const hit = se && await catalogueLookup(se, c.issueLabel || c.issue);
      if (hit && hit.cv) url = inducksImg(hit.cv);
      if (!url && se && Duckipedia.candidates(dkSeries(se), c).length) { const d = await Duckipedia.fetchIssue(dkSeries(se), c); if (d && d.issue.cover) url = d.issue.cover; }
    } catch (e) {}
    if (url) { const saved = await saveComic(Object.assign({}, c, { coverUrl: url }), true).catch(() => null); if (saved) run.found++; }
    else { const ent = catEntry(se); await saveComic(Object.assign({}, c, { coverNone: new Date().toISOString().slice(0, 16), coverNoneCat: ent ? ent.file : "" }), true).catch(() => null); }   // not asked again
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
// buying a wish made with "Want to own it": the read-only entry's read date, ratings, heart and link come along; returns that entry (delete it after saving)
function takeFromRead(c, wish) {
  const rd = wish && wish.fromRead ? S.comics.find(x => x.id === wish.fromRead && notOwned(x)) : null;
  if (rd) ["read", "readDate", "rating", "fav", "coverRating", "link", "words"].forEach(k => { if (rd[k] !== undefined && rd[k] !== "" && (c[k] === undefined || c[k] === "" || c[k] === false || c[k] === null)) c[k] = rd[k]; });
  delete c.fromRead; return rd;
}
function dupHtml(d) {
  const c = findDup(d);
  if (!c) return '<div id="dupnote"></div>';
  const where = c.status === "wanted" ? (isOwn(d) ? "is on your wishlist: saving moves it to your collection" : "is already on your wishlist")
    : notOwned(c) ? "is already saved: you read it (not owned)"
    : "is already in your collection" + ((c.copies || 1) > 1 ? " (" + c.copies + " copies)" : "");
  return `<div id="dupnote" class="banner ${c.status === "wanted" && isOwn(d) ? "" : "warn"}">${esc(c.kind === "book" ? c.title + (c.issue ? " (" + c.issue + ")" : "") : comicTag(c))} ${where}. <button type="button" class="link" data-dupopen="${esc(c.id)}">Open it</button></div>`;
}
function refreshDup(d) {
  const el = $("#dupnote"); if (!el) return;
  el.outerHTML = dupHtml(d);
  const b = document.querySelector("[data-dupopen]"); if (b) b.onclick = () => { S.editing = b.dataset.dupopen; S.draft = null; nav("add"); };
}
function lotFields(d) {
  const every = allLots(), lots = every.slice(0, 12), older = every.slice(12), cur = d.lotId && d.lotId !== "new" ? lotInfo(d.lotId) : null;
  const others = cur ? cur.members.filter(c => c.id !== d.id) : [];
  const n = (cur ? cur.members.length + (cur.members.some(c => c.id === d.id) ? 0 : 1) : 1);
  const total = parseAmt(d.lotTotal), w1 = d.kind === "book" ? "book" : "comic", w2 = w1 + "s";
  return `<label class="wide"><span class="l">Lot</span><select id="f-lot"><option value="new"${d.lotId === "new" ? " selected" : ""}>A new lot</option>${(o => older.length ? `<optgroup label="Newest">${lots.map(o).join("")}</optgroup><optgroup label="Older lots">${older.map(o).join("")}</optgroup>` : lots.map(o).join(""))(l => `<option value="${esc(l.id)}"${d.lotId === l.id ? " selected" : ""}>${esc(lotLabel(l))}</option>`)}</select></label>
    <label><span class="l">Price for the whole lot</span><input id="f-lotTotal" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.lotTotal))}"></label>
    <div class="wide small lotinfo"><span id="lotper" data-n="${n}">${total === 0 ? `A free lot: ${n === 1 ? "this " + w1 + " gets" : "all " + n + " " + w2 + " get"} the price 0.00.` : typeof total === "number" && total > 0 ? `With this one: ${n} ${n === 1 ? w1 : w2}, about ${fmt2(total / n)} each. The app splits the price to the cent and adjusts it when more ${w2} join the lot.` : "Enter what you paid for all of them together (0 if they were free). Add the others with “Save and add next”, which keeps the lot."}</span>
      <div class="muted" style="margin-top:4px">Purchase date and where bought apply to the whole lot: changing them here changes them for all its ${w2}.</div>
      ${others.length ? `<div class="row" style="gap:6px;margin-top:6px">${others.map(c => `<button type="button" class="chipbtn" data-open="${esc(c.id)}">${esc(comicTag(c).trim() || c.title || "comic")}</button>`).join("")}</div>` : ""}</div>`;
}
// ---- price split (da-v247): item + shipping + customs & import VAT + fees − discount = the total in "Price paid" (or the lot's price) ----
const PRICE_PARTS = [["item", "Item price"], ["ship", "Shipping"], ["tax", "Customs & import VAT"], ["fees", "Fees (Ricardo, eBay, PayPal…)"], ["disc", "Discount (amount or %)"]];
function cleanParts(p) {
  if (!p) return null; const o = {}; PRICE_PARTS.forEach(([k]) => { if (k === "disc") return; const v = parseAmt(p[k]); if (typeof v === "number") o[k] = v; });
  // discount: an amount, or a percentage of the item price ("10%", da-v248); a kept percentage follows the item price
  const dv = p.disc, pct = typeof dv === "string" && /%/.test(dv) ? parseAmt(dv.replace("%", "")) : typeof dv !== "string" && typeof p.discPct === "number" ? p.discPct : "";
  if (typeof pct === "number") { o.discPct = pct; o.disc = Math.round((o.item || 0) * pct) / 100; }
  else { const v = parseAmt(dv); if (typeof v === "number") o.disc = v; }
  return Object.keys(o).length ? o : null;
}
function partsSum(p) { p = cleanParts(p); if (!p) return null; const t = PRICE_PARTS.reduce((a, [k]) => a + (typeof p[k] === "number" ? (k === "disc" ? -p[k] : p[k]) : 0), 0); return Math.max(0, Math.round(t * 100) / 100); }
function partsHtml(p, forLot) {
  return `<details class="wide pparts"${cleanParts(p) ? " open" : ""}><summary class="small">Split the price${forLot ? " (for the whole lot)" : ""}: shipping, customs, fees</summary><div class="grid-form" style="margin-top:6px">${PRICE_PARTS.map(([k, l]) => k === "disc"
      ? `<label><span class="l">${l}</span><input id="f-pp-disc" data-pp="disc" inputmode="text" placeholder="e.g. 2.50 or 10%" value="${esc(p && typeof p.discPct === "number" ? p.discPct + "%" : p && p.disc != null ? amtVal(p.disc) : "")}"><span class="small muted" id="ppdiscnote">${esc(discNote(p || {}))}</span></label>`
      : `<label><span class="l">${l}</span><input id="f-pp-${k}" data-pp="${k}" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(p && p[k] != null ? amtVal(p[k]) : "")}"></label>`).join("")}
    <p class="small muted wide" style="margin:0">The app adds these up (minus the discount; a percentage counts on the item price) and puts the total into “${forLot ? "Price for the whole lot" : "Price paid"}”. Customs & import VAT is only for parcels from abroad: in a Swiss shop the MWST is already in the price.</p></div></details>`;
}
function pctText(x) { return (Math.round(x * 10) / 10).toString() + "%"; }
// the discount as a percentage of the item price (typed or worked out), null without an item price (da-v249)
function discPctOf(p) { return !p || typeof p.disc !== "number" ? null : typeof p.discPct === "number" ? p.discPct : p.item > 0 ? p.disc / p.item * 100 : null; }
// the note under the Discount field: the other number of the two
function discNote(raw) { const p = cleanParts(raw); if (!p || typeof p.disc !== "number") return ""; const typedPct = typeof raw.disc === "string" ? /%/.test(raw.disc) : typeof raw.discPct === "number";
  if (typedPct) return "= " + fmt2(p.disc); const q = discPctOf(p); return q == null ? "" : "= " + pctText(q) + " of the item price"; }
function partsText(p, cur) { p = cleanParts(p); return p ? PRICE_PARTS.filter(([k]) => typeof p[k] === "number").map(([k, l]) => l.replace(/ \(.*\)$/, "") + (k === "disc" && discPctOf(p) != null ? " " + pctText(discPctOf(p)) + " (" + money(p[k], cur) + ")" : " " + money(p[k], cur))).join(" · ") : ""; }
// shipping, customs and fees of an entry in CHF (for a lot: its share, by its part of the lot price)
function extrasOf(c) {
  const p = cleanParts(c.lotId ? c.lotParts : c.priceParts); if (!p || typeof c.pricePaid !== "number") return null;
  let f = c.copies || 1;
  if (c.lotId) { const T = +c.lotTotal; if (!(T > 0)) return null; f = c.pricePaid * (c.copies || 1) / T; }
  const cur = c.lotId ? (c.lotCurrency || c.currency) : c.currency, x = k => toCHF((p[k] || 0) * f, cur);
  return { ship: x("ship"), tax: x("tax"), fees: x("fees"), disc: x("disc") };
}
function lotMembers(id) { return id ? S.comics.filter(c => c.lotId === id && isOwn(c)) : []; }
function lotInfo(id) {
  const m = lotMembers(id); if (!m.length) return null;
  const f = m.slice().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
  return { id, members: m, total: f.lotTotal, parts: f.lotParts || null, currency: f.lotCurrency || f.currency || "CHF", source: f.source || "", date: f.purchaseDate || "", created: m.reduce((a, c) => { const x = String(c.updatedAt || c.createdAt || ""); return x > a ? x : a; }, "") };
}
function allLots() {
  const ids = [...new Set(S.comics.filter(c => c.lotId && isOwn(c)).map(c => c.lotId))];
  return ids.map(lotInfo).filter(Boolean).sort((a, b) => String(b.created).localeCompare(String(a.created)));
}
function recentLots() { return allLots().slice(0, 12); }
function lotLabel(l) {
  const bk = l.members.filter(c => c.kind === "book").length, n = l.members.length;
  const w = bk === n ? (n === 1 ? " book" : " books") : bk ? (n === 1 ? " item" : " items") : (n === 1 ? " comic" : " comics");   // a lot can mix both
  return [money(l.total, l.currency), n + w, l.source, l.date ? niceDate(l.date) : ""].filter(Boolean).join(" · ");
}
// spreads the lot price over its comics to the cent: 20.00 for 3 -> 6.67, 6.67, 6.66
// a lot was bought at one time and place: purchase date and source are shared by all its comics
async function rebalanceLot(id, total, currency, shared) {
  const m = lotMembers(id).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  if (!m.length) return;
  const T = Math.round((typeof total === "number" ? total : +m[0].lotTotal || 0) * 100), cur = currency || m[0].lotCurrency || m[0].currency;
  const units = m.reduce((a, c) => a + (c.copies || 1), 0), base = Math.floor(T / units);
  let rest = T - base * units;
  const out = m.map(c => { let cents = base; if (rest > 0 && (c.copies || 1) === 1) { cents++; rest--; } return Object.assign({}, c, { pricePaid: cents / 100, currency: cur, lotTotal: T / 100, lotCurrency: cur }, shared || {}); });
  if (rest > 0) out[0].pricePaid = Math.round((out[0].pricePaid * 100 + rest / (out[0].copies || 1))) / 100;   // only when every comic has several copies
  await saveMany(out, null, true); announce();
}
// before saving: settle the lot fields; returns false (with a message) if something is missing
function prepareLot(d, c, before) {
  if (c.status === "wanted" || !d.lotId) {
    // leaving a lot: the lot's share price goes too (unless you typed a new price), so the real price can be filled in (da-v246)
    if (before && before.lotId && c.pricePaid === before.pricePaid) c.pricePaid = "";
    c.lotId = ""; c.lotTotal = ""; c.lotCurrency = ""; delete c.lotParts;
    if (c.status === "wanted") delete c.priceParts;
    else { c.priceParts = cleanParts(d.priceParts); if (c.priceParts) c.pricePaid = partsSum(c.priceParts); else delete c.priceParts; }   // the split decides the total (da-v247)
    return true;
  }
  delete c.priceParts; c.lotParts = cleanParts(d.lotParts); if (!c.lotParts) delete c.lotParts;
  const total = c.lotParts ? partsSum(c.lotParts) : parseAmt(d.lotTotal);
  if (!(typeof total === "number" && total >= 0)) { toast("Enter the price for the whole lot (0 if you got it for free)"); $("#f-lotTotal") && $("#f-lotTotal").focus(); return false; }
  if (d.lotId === "new") d.lotId = newId();
  c.lotId = d.lotId; c.lotTotal = total; c.lotCurrency = c.currency; c.pricePaid = "";
  return true;
}
async function afterLotSave(c, before) {
  const shared = {}; if (c.purchaseDate) shared.purchaseDate = c.purchaseDate; if (c.source) shared.source = c.source;   // an empty field never wipes the others
  if (c.lotId) shared.lotParts = c.lotParts || null;   // the price split belongs to the whole lot (da-v247)
  if (c.lotId) await rebalanceLot(c.lotId, c.lotTotal, c.currency, shared);
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
  S.series.forEach(se => { if (se.format) se.format = enSize(se.format); });
  await setConfig("series", S.series.filter(s => !s.pending));   // a series typed in Add is saved only with its first comic
  S.seriesSaved = true; announce();
}
async function loadCatalogueIndex() {
  try { const r = await fetch("catalogue/index.json"); if (r.ok) { S.catalogue = await r.json(); render(); } } catch (e) { S.catalogue = null; }
  // price suggestions per INDUCKS series (catalogue/prices.json, kept in the app's repository)
  try { const r = await fetch("catalogue/prices.json"); if (r.ok) S.priceSugg = (await r.json()).series || {}; } catch (e) {}
  // price lists Claude has collected for your series (Series › Tools › Price lists waiting)
  try { const r = await fetch("catalogue/restore-batch.json"); if (r.ok) { S.priceBatch = (await r.json()).series || []; if (S.view === "series") render(); } } catch (e) {}
  // cover links Claude has looked up (comics.org) for comics without a cover (Series › Tools › Covers waiting)
  // slim issue lists (da-v241): every other German/Swedish/English/Italian INDUCKS publication, loaded only when needed
  try { const r = await fetch("catalogue/slim-index.json"); if (r.ok) setSlimIndex((await r.json()).series || []); } catch (e) {}
  try { const r = await fetch("catalogue/covers-batch.json"); if (r.ok) { S.coverBatch = (await r.json()).covers || []; if (S.view === "series") render(); } } catch (e) {}
}
// GCD (comics.org) pictures never load in the app (the site blocks them, checked on the phone 2026-11-26)
const deadCoverHost = url => /(^|\/\/|\.)comics\.org\//i.test(String(url || ""));
// your own cover photo: shrunk to 600 px and stored in the entry (and so in the backup)
async function photoToCover(file) {
  const u = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
    const k = Math.min(1, 600 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)), cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/jpeg", 0.8);
  } finally { URL.revokeObjectURL(u); }
}
const coverPhotoHtml = d => { const has = /^data:/.test(d.coverUrl || ""); return `<div class="wide row" id="coverphotobox" style="gap:8px;align-items:center;flex-wrap:wrap"><input type="file" accept="image/*" id="f-coverPhotoFile" hidden><button type="button" class="ghost" id="coverphoto">${has ? "New cover photo" : "Cover photo"}</button><span id="coverphotoinfo" class="small">${has ? `<img src="${esc(d.coverUrl)}" alt="" style="height:48px;vertical-align:middle;border-radius:4px"> Your photo · <button type="button" class="ghost small" id="coverphotodel">Remove photo</button>` : "Take a photo of the cover or pick one"}</span></div>`; };
function bindCoverPhoto(d) {
  S.coverPhoto = /^data:/.test(d.coverUrl || "") ? d.coverUrl : "";
  const btn = $("#coverphoto"), inp = $("#f-coverPhotoFile"); if (!btn || !inp) return;
  const show = () => { const i = $("#coverphotoinfo"); if (i) i.innerHTML = S.coverPhoto ? `<img src="${esc(S.coverPhoto)}" alt="" style="height:48px;vertical-align:middle;border-radius:4px"> Your photo · <button type="button" class="ghost small" id="coverphotodel">Remove photo</button>` : "Take a photo of the cover or pick one"; btn.textContent = S.coverPhoto ? "New cover photo" : "Cover photo"; const x = $("#coverphotodel"); if (x) x.onclick = () => { S.coverPhoto = ""; d.coverUrl = ""; show(); }; };
  btn.onclick = () => inp.click();
  inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return;
    try { S.coverPhoto = await photoToCover(f); d.coverUrl = S.coverPhoto; const u = $("#f-coverUrl"); if (u) u.value = ""; show(); toast("Photo added: tap Save to keep it"); }
    catch (e) { toast("That picture couldn't be read"); } inp.value = ""; };
  show();
}
// comics without a cover that a waiting cover link fits (same series, same number); a cover you set yourself is never replaced
function coverBatchWaiting() {
  const want = new Map(); (S.coverBatch || []).forEach(e => { if (e && e.url && !deadCoverHost(e.url)) want.set(e.sid + "|" + e.label, e.url); });
  return S.comics.filter(c => c.kind !== "book" && !c.coverUrl && want.has(c.seriesId + "|" + (c.issueLabel || c.issue || ""))).map(c => ({ c, url: want.get(c.seriesId + "|" + (c.issueLabel || c.issue || "")) }));
}
async function applyCoverBatch() {
  let n = 0;
  for (const { c, url } of coverBatchWaiting()) if (await saveComic(Object.assign({}, c, { coverUrl: url }), true).catch(() => null)) n++;
  await markRun("covers"); return n;
}
// this app's build number (the number in APP_VERSION, sw.js): a waiting list can need a newer app ("minApp")
const APP_BUILD = 250;
// a waiting list counts as added once it has been added (by its "added" mark, date, text and settings), so a corrected list shows up again
const batchKey = e => { const sg = (S.priceSugg || {})[e.sugg] || {}; return e.id + "|" + (e.added || "") + "|" + (sg.date || "") + "|" + String(sg.text || "").length + "|" + JSON.stringify(e.patch || {}).length; };
const batchTooNew = e => +e.minApp > APP_BUILD;
// a waiting list is for one of your comic series, or for a book series ("book:A Song of Ice and Fire") you have books of
const batchHas = id => String(id || "").startsWith("book:") ? S.comics.some(c => c.kind === "book" && "book:" + (c.seriesName || "") === id) : !!seriesById(id);
function priceBatchWaiting() { const done = new Set(S.priceBatchDone || []); return (S.priceBatch || []).filter(e => e && batchHas(e.id) && (S.priceSugg || {})[e.sugg] && !done.has(batchKey(e))); }
function priceBatchRules(e) {
  // read the list as the series will be after the patch (Herman Hedning: by year instead of running numbers)
  const se = seriesById(e.id), was = se && se.numbering, pn = e.patch && e.patch.numbering;
  if (se && pn) se.numbering = pn;
  try {
    const sg = S.priceSugg[e.sugg], res = parsePrices(e.id, sg.text, sg.cur), note = "Claude, " + sg.date;
    const mk = (r, ed) => ({ id: newId(), s: e.id, from: r.zero ? zeroText(e.id, r.lo) : r.lo == null ? "" : boundText(e.id, r.lo), to: r.zero ? zeroText(e.id, r.hi) : r.hi == null ? "" : boundText(e.id, r.hi, true), price: r.price, cur: r.cur, note, ed: ed || "" });
    return res.editions.length > 1 ? res.byEdition.flatMap(x => x.ranges.map(r => mk(r, x.label))) : res.ranges.map(r => mk(r));
  } finally { if (se && pn) se.numbering = was; }
}
// when each bulk job in Series › Tools last ran
const lastRunText = k => (S.lastRuns || {})[k] ? `<p class="small muted" style="margin:0">Last run: ${esc(stampDate(S.lastRuns[k]))}</p>` : "";
async function markRun(k) { S.lastRuns = Object.assign({}, S.lastRuns, { [k]: new Date().toISOString() }); try { await setConfig("lastRuns", S.lastRuns); } catch (e) {} }
async function applyPriceBatch() {
  const list = priceBatchWaiting().filter(e => !batchTooNew(e)); let n = 0;
  for (const e of list) {
    const se = seriesById(e.id), rules = priceBatchRules(e);   // read before the patch changes the series
    if (e.replace) S.valueRules = (S.valueRules || []).filter(r => r.s !== e.id);
    // a range that is already there (same series, numbers, edition, price) isn't added twice (after a restore the app may not know a list was added)
    const rk = r => [r.s, r.from, r.to, r.ed || "", r.price, r.cur].join("|"), had = new Set((S.valueRules || []).map(rk)), add = rules.filter(r => !had.has(rk(r)));
    S.valueRules = (S.valueRules || []).concat(add); n += add.length;
    if (se && e.patch && typeof e.patch === "object") ["numbering", "perYear", "firstYear", "lastYear", "defaultEdition", "issueList", "latest", "first"].forEach(k => { if (k in e.patch) se[k] = e.patch[k]; });
    // a series switched from running numbers to year/number (Herman Hedning): your copies get their new numbers ("86" -> "2009/06")
    if (e.renumber && typeof e.renumber === "object") {
      const moved = S.comics.filter(c => c.seriesId === e.id && e.renumber[String(c.issueLabel || c.issue || "")]).map(c => { const p = parseIssue(se, e.renumber[String(c.issueLabel || c.issue || "")]); return Object.assign({}, c, { issue: p.label, issueLabel: p.label, issueNum: p.n, issueSort: p.sort, issueYear: p.year || null }); });
      if (moved.length) await saveMany(moved);
    }
    // book series: number the user's books by title ("titleNumbers": {"Loki": "1"}), only books that have no number yet
    if (e.titleNumbers && typeof e.titleNumbers === "object") {
      const keys = Object.keys(e.titleNumbers).map(k => [norm(k), e.titleNumbers[k]]);
      const mine = S.comics.filter(c => (c.seriesId === e.id || "book:" + String(c.seriesName || "").trim() === e.id) && !String(c.issueLabel || c.issue || "").trim());
      const numbered = mine.map(c => { const hit = keys.find(([k]) => k && norm(c.title || "").includes(k)); if (!hit) return null; const q = parseIssue(se, String(hit[1])); return Object.assign({}, c, { issue: q.label, issueLabel: q.label, issueNum: q.n, issueSort: q.sort }); }).filter(Boolean);
      if (numbered.length) await saveMany(numbered);
    }
    S.priceBatchDone = (S.priceBatchDone || []).concat(batchKey(e));
  }
  await setConfig("valueRules", S.valueRules); await saveSeries(); await setConfig("priceBatchDone", S.priceBatchDone); await markRun("prices");   // book series have no series entry: their ranges are enough
  return { series: list.length, ranges: n };
}
// the catalogue is keyed by series name (as in the app); a series whose name changed is still found by its INDUCKS code
// the issue list for a series' Gaps grid: the INDUCKS catalogue, or for series INDUCKS doesn't have (91:an) the series'
// own list (issueList, e.g. from Seriekatalogen): "1956/01", double issues "2007-09-10", extras "1982X14" (14½)
const ownCats = new Map();
function ownIssueCat(se) {
  if (!se || !Array.isArray(se.issueList) || !se.issueList.length) return null;
  const k = se.issueList.join(","); if (ownCats.has(se.id) && ownCats.get(se.id).k === k) return ownCats.get(se.id).cat;
  const cat = { code: "", own: true, issues: Object.fromEntries(se.issueList.map(x => [x, { n: x.replace("/", "-"), t: "", s: [] }])) };
  ownCats.set(se.id, { k, cat }); return cat;
}
// slim lists: [code, title, lang, file, issues]; a title becomes a name to match only where it is unique in its country
function setSlimIndex(list) {
  const byCode = {}, byName = new Map(), seen = new Map();
  list.forEach(([code, title, lang, file, issues]) => { byCode[code] = { series: title, title, code, file, issues, lang, slim: true };
    const k = norm(title) + "|" + String(code).split("/")[0]; seen.set(k, (seen.get(k) || 0) + 1); });
  Object.values(byCode).forEach(x => { const n = norm(x.title), k = n + "|" + x.code.split("/")[0]; if (seen.get(k) === 1) (byName.get(n) || byName.set(n, []).get(n)).push(x); });
  S.slimCat = { byCode, byName };
}
const catEntryByFile = file => (S.catalogue && Object.values(S.catalogue.series || {}).find(x => x.file === file)) || (S.slimCat && Object.values(S.slimCat.byCode).find(x => x.file === file)) || null;
function gridCat(se) { const e = catEntry(se); return (e && S.catCache[e.file]) || ownIssueCat(se); }
function catEntry(se) {
  const all = S.catalogue && S.catalogue.series; if (!se || !all) return null;
  const n = norm(se.name), list = Object.values(all);
  const slim = S.slimCat;
  if (se.code) return list.find(x => x.code === se.code) || (slim && slim.byCode[se.code]) || null;   // a series with an INDUCKS code only matches that code
  // by name, only within the same country: the Norwegian "Donald Duck & Co" is not the German one
  const cc = String(se.country || "").toLowerCase(), sameLand = x => !cc || String(x.code || "").split("/")[0] === cc;
  return [all[n]].concat(list.filter(x => (x.aliases || []).some(a => norm(a) === n))).find(x => x && sameLand(x))
    || (slim && (slim.byName.get(n) || []).find(x => cc && sameLand(x))) || null;   // slim lists by name only with a known country
}
// ---- "Find by title": books and specials found by the words on their cover (INDUCKS has no ISBNs) ----
async function loadTitles() {
  if (S.titles) return S.titles;
  try { const r = await fetch("catalogue/titles.json"); if (r.ok) S.titles = (await r.json()).titles.map(x => ({ file: x[0], issue: x[1], t: x[2], d: x[3], pr: x[4], n: norm(x[2]) })); } catch (e) {}
  return S.titles || [];
}
function findByTitle(q) {
  const words = norm(q).split(" ").filter(w => w.length > 1); if (!words.length || !S.titles) return [];
  const byFile = {}; Object.values((S.catalogue && S.catalogue.series) || {}).forEach(x => { byFile[x.file] = x; });
  return S.titles.filter(x => words.every(w => x.n.includes(w)) && byFile[x.file])
    .sort((a, b) => (a.d || "").localeCompare(b.d || "")).slice(0, 15)
    .map(x => Object.assign({ entry: byFile[x.file], mine: S.series.find(s => { const e = catEntry(s); return e && e.file === x.file; }) }, x));
}
async function catalogueFile(entry) {
  if (!S.catCache[entry.file]) {
    const r = await fetch("catalogue/" + entry.file);
    if (!r.ok) return null;
    const f = await r.json();
    if (f.slim) await expandSlim(f);
    S.catCache[entry.file] = f;
  }
  return S.catCache[entry.file];
}
// a slim list names only story codes: titles (in the list's language), creators and pages come from the story list
async function expandSlim(f) {
  const sr = await storyRecs(), li = Math.max(0, ["de", "sv", "en", "it"].indexOf(f.lang)), ppl = v => (v ? v.split(",").map(x => sr.people[+x]) : []).filter(Boolean).join(", ");
  Object.values(f.issues || {}).forEach(i => {
    if (!i.ic) i.ic = f.code + " " + i.n;
    i.t = i.t || ""; i.s = (i.s || []).map(c => { const r = sr.map.get(c);
      return r ? { c, t: r[1 + li] || r[5] || r[1] || r[2] || r[3] || r[4] || "", w: ppl(r[6]), a: ppl(r[7]), h: "", p: r[9] || "" } : { c, t: "", w: "", a: "", h: "", p: "" }; });
  });
}
// story code -> line of catalogue/story-search.txt (shared with the All INDUCKS search when that is loaded)
let SRECS = null;
function storyRecs() {
  if (!SRECS) SRECS = (async () => {
    let recs, m;
    if (typeof ISRCH !== "undefined" && ISRCH && ISRCH.recs) { recs = ISRCH.recs; m = ISRCH.meta; }
    else { const [mj, t] = await Promise.all([fetch("catalogue/story-search-meta.json").then(r => r.ok ? r.json() : null), fetch("catalogue/story-search.txt").then(r => r.ok ? r.text() : null)]);
      if (!mj || !t) { SRECS = null; throw new Error("The story list couldn't be loaded: try again online"); }
      m = mj; recs = t.split("\n").filter(Boolean).map(l => l.split("\t")); }
    return { map: new Map(recs.map(r => [r[0], r])), people: m.people || [] };
  })();
  return SRECS;
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
  if (fromClz && (hit.s || []).length) out.stories = hit.s.map(x => ({ title: x.t || "", code: x.c || "", writer: clean(x.w), artist: clean(x.a), hero: x.h || "", pages: x.p || "" }));
  out.inducks = hit.ic;
  return out;
}
// fills in missing series details (INDUCKS code, numbering, size) from the catalogue
function seriesFromCatalogue(se, file, entry) {
  let changed = false;
  if (!se.code) { se.code = entry.code; changed = true;
    // the group was guessed from the name alone (it/TLDLE "Disney De Luxe" -> Other series); the code tells the country
    if (arrangedInUse() && (se.publisher || DISNEY) === DISNEY && (!se.group || se.group === OTHER_GROUP)) Object.assign(se, arrangeSeries(se)); }
  const labs = Object.keys(file.issues || {});
  const yearLabs = labs.map(l => /^(\d{4})\/(\d{1,3})$/.exec(l)).filter(Boolean);
  if (yearLabs.length > labs.length / 2) {
    if (se.numbering !== "year") { se.numbering = "year"; changed = true; }
    const ys = yearLabs.map(m => +m[1]), ns = yearLabs.map(m => +m[2]);
    if (!se.firstYear) { se.firstYear = Math.min(...ys); changed = true; }
    if (!se.lastYear) { se.lastYear = Math.max(...ys); changed = true; }
    if (!se.perYear) { se.perYear = Math.min(60, Math.max(...ns)); changed = true; }
  } else if (se.numbering !== "year") {
    const nums = labs.filter(l => /^\d+$/.test(l)).map(Number);
    if (nums.length && !se.latest) { se.latest = Math.max(...nums); changed = true; }
    // one issue a year, numbered by the year (Kalle Ankas julbok 1941, 1942 …): the grid starts at the first year, not at 1
    if (nums.length && !se.first && Math.min(...nums) >= 1800 && Math.max(...nums) <= 2100) { se.first = Math.min(...nums); changed = true; }
    if (nums.length && +se.first > 1 && +se.latest < +se.first) { se.latest = Math.max(...nums); changed = true; }   // "latest 77" was the number of books
  }
  return changed;
}

// ---------- derived ----------
// status "owned", "wanted" (wishlist) or "notowned" (read but not owned: library books, free e-books; only for reading stats)
function isOwn(c) { return !!c && c.status !== "wanted" && c.status !== "notowned"; }
function isMine(c) { return !!c && c.status !== "wanted"; }   // owned or read without owning: your ratings and read marks count
const notOwned = c => !!c && c.status === "notowned";
function owned() { return S.comics.filter(c => isOwn(c)); }
function searchText(c) {
  const st = (c.stories || []).map(s => [s.title, s.code, s.writer, s.artist, s.hero, s.dTitle, s.original, s.translator, s.characters, s.genre].join(" ")).join(" ");
  const dk = c.duckipedia && c.duckipedia.issue ? [c.duckipedia.issue.translator, c.duckipedia.issue.editor, c.duckipedia.issue.title].join(" ") : "";
  const se = seriesById(c.seriesId);
  return norm([se ? se.name + " " + se.short : c.seriesName, c.issue, c.title, c.notes, c.special, c.location, c.source, c.author, c.publisher, c.genre, c.isbn, String(c.isbn || "").replace(/\D/g, ""), c.kind === "book" ? "book" : "", st, dk].join(" "));
}
// search: words split by spaces; a word with a hyphen stays one phrase ("x-men" = "x men" together, not "x" and "men"
// anywhere), and phrases and words of 1–2 letters must start a word ("x" no longer matches every "x-…" or "box")
function searchHit(c, raw) {
  const t = " " + searchText(c);
  return String(raw || "").trim().split(/\s+/).map(norm).filter(Boolean).every(w => (w.length <= 2 || w.includes(" ")) ? t.includes(" " + w) : t.includes(w));
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
  if (v !== "add" && S.series.some(s => s.pending)) S.series = S.series.filter(s => !s.pending);   // left Add without saving: the new series goes
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
// while the keyboard is open, pinned bars (Series buttons, bottom navigation) let go instead of riding up on top of it
const typingField = el => el && (el.tagName === "TEXTAREA" || el.isContentEditable || (el.tagName === "INPUT" && !/^(checkbox|radio|button|submit|range|color|file)$/i.test(el.type)));
const setKb = () => document.body.classList.toggle("kb", typingField(document.activeElement) || (window.visualViewport ? window.visualViewport.height < window.innerHeight * 0.75 : false));
document.addEventListener("focusin", setKb);
document.addEventListener("focusout", () => setTimeout(setKb, 120));
if (window.visualViewport) window.visualViewport.addEventListener("resize", setKb);
// suggestion lists for text fields (publisher, genres, edition, universe, group): DuckDuckGo on Android doesn't open
// the browser's own <datalist> menus, so the app shows its own. The <datalist> stays as the source of the choices.
// Genres take several values separated by commas: only the part being typed is matched and replaced.
// shops and sellers you've bought from, the ones you use most first (case and spaces don't make a new one)
function sourceList() {
  const n = {}, name = {};
  S.comics.forEach(c => { const v = String(c.source || "").trim(); if (!v) return; const k = v.toLowerCase(); n[k] = (n[k] || 0) + 1; name[k] = name[k] || v; });
  return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b)).map(k => name[k]);
}
const Sugg = { box: null, el: null };
const suggClose = () => { if (Sugg.box) Sugg.box.remove(); Sugg.box = null; };
const suggMulti = el => el.id === "f-genre";
function suggShow(el) {
  const dl = document.getElementById(el.dataset.sugg); suggClose(); Sugg.el = el;
  if (!dl) return;
  const parts = suggMulti(el) ? el.value.split(",") : [el.value];
  const q = parts[parts.length - 1].trim().toLowerCase(), taken = new Set(parts.slice(0, -1).map(s => s.trim().toLowerCase()));
  const all = [...new Set([...dl.options].map(o => (o.value || o.textContent || "").trim()).filter(Boolean))];
  const hits = all.filter(v => { const k = v.toLowerCase(); return !taken.has(k) && k !== q && (!q || k.includes(q)); })
    .sort((a, b) => (b.toLowerCase().startsWith(q) - a.toLowerCase().startsWith(q))).slice(0, 30);
  if (!hits.length) return;
  const box = document.createElement("div"); box.className = "sugg"; box.setAttribute("role", "listbox");
  box.innerHTML = hits.map(v => `<button type="button" role="option" data-sv="${esc(v)}">${esc(v)}</button>`).join("");
  // keep the keyboard open: the field must not lose focus when a choice is tapped
  box.addEventListener("pointerdown", e => e.preventDefault());
  box.addEventListener("mousedown", e => e.preventDefault());
  box.addEventListener("click", e => {
    const b = e.target.closest("[data-sv]"); if (!b) return;
    const v = b.dataset.sv;
    if (suggMulti(el)) { const p = el.value.split(","); p[p.length - 1] = (p.length > 1 ? " " : "") + v; el.value = p.join(",") + ", "; }
    else el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
    if (suggMulti(el)) suggShow(el); else suggClose();
  });
  el.parentNode.classList.add("sugghost"); el.insertAdjacentElement("afterend", box); Sugg.box = box;
}
document.addEventListener("focusin", e => {
  const el = e.target;
  if (el.tagName !== "INPUT") return;
  // take the field off the browser's own list so the two menus don't show at the same time
  if (el.hasAttribute("list")) { el.dataset.sugg = el.getAttribute("list"); el.removeAttribute("list"); }
  if (el.dataset.sugg) suggShow(el);
});
document.addEventListener("input", e => { if (e.target.dataset && e.target.dataset.sugg && e.target === document.activeElement) suggShow(e.target); });
document.addEventListener("focusout", e => { if (e.target === Sugg.el) setTimeout(() => { if (document.activeElement !== Sugg.el) suggClose(); }, 150); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && Sugg.box) suggClose(); });
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
