// Screenshot check: opens the app like a phone (Fairphone 5 size) with sample comics, takes pictures of the main
// screens and records JavaScript errors. Run by .github/workflows/screens.yml after every app change.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:8080/?test";
const OUT = process.env.OUT || "shots";
// only the screens asked for (comma list of names, e.g. "wishlist,copy-picker,prices"); empty = only the error check
const WANT = String(process.env.SCREENS || "").split(",").map(s => s.trim()).filter(Boolean);
const want = name => WANT.includes(name);
fs.mkdirSync(OUT, { recursive: true });

const series = [
  { id: "ltb", name: "Lustiges Taschenbuch", short: "LTB", code: "de/LTB", country: "de", publisher: "Disney", group: "Deutschland – Lustiges Taschenbuch", numbering: "running", latest: 600 },
  { id: "tldle", name: "Disney De Luxe", short: "DDL", code: "it/TLDLE", country: "it", publisher: "Disney", group: "Italia", numbering: "running" },
  { id: "mhdw", name: "Micky Holmes & Donald Watson", code: "de/MHDW", country: "de", publisher: "Disney", group: "Deutschland – Alben & Sammlerbände", numbering: "running" },
  { id: "mm", name: "Micky Maus Magazin", short: "MM", code: "de/MM", country: "de", publisher: "Disney", group: "Deutschland – Micky Maus", numbering: "year", firstYear: 1951 },
  { id: "ka", name: "Kalle Anka & C:o", short: "KA", code: "se/KA", country: "se", publisher: "Disney", group: "Sverige – Kalle Anka", numbering: "year", firstYear: 1948 },
  { id: "kap", name: "Kalle Ankas Pocket", short: "KAP", code: "se/KAP", country: "se", publisher: "Disney", group: "Sverige – Pocket", numbering: "running" },
  // series the price lists in catalogue/restore-batch.json are for (Series › Tools › Price lists waiting)
  { id: "x-91-an-swedish", name: "91:an", publisher: "Swedish comics", group: "91:an", numbering: "year", firstYear: 1978, lastYear: 1988 },
  { id: "x-asterix-swedish", name: "Asterix (Swedish)", publisher: "Franco-Belgian", group: "Asterix", numbering: "running" },
  { id: "x-herman-hedning-swedish", name: "Herman Hedning", publisher: "Swedish comics", group: "Herman Hedning", numbering: "running" }
];
const c = (id, s, n, extra) => Object.assign({ id, kind: "issue", seriesId: s, issue: String(n), issueLabel: String(n), issueSort: typeof n === "number" ? n : parseInt(n, 10), issueNum: parseInt(n, 10), status: "owned", copies: 1, currency: "CHF", stories: [] }, extra || {});
const comics = [
  c("a1", "ltb", 1, { stories: [{ title: "Der Kolumbusfalter", code: "I TL 1-AP", writer: "Guido Martina", artist: "Romano Scarpa", first: "1953-01-01" }], title: "Der Kolumbusfalter", grade: "1", pricePaid: 40, source: "Ricardo", purchaseDate: "2025-03-01" }),
  c("a2", "ltb", 1, { title: "Der Kolumbusfalter", grade: "3", pricePaid: 12, source: "Flohmarkt", purchaseDate: "2025-06-01", notes: "Second copy" }),
  c("a3", "ltb", 2, { title: "Hallo, hier Micky!", forTrade: true, copies: 2, grade: "2", stories: [{ title: "Der Kolumbusfalter", code: "I TL 1-AP", writer: "Guido Martina", artist: "Romano Scarpa", first: "1953-01-01" }, { title: "Micky und das Meer", code: "I TL 20-A", writer: "Guido Martina", artist: "Luciano Bottaro", first: "1955-05-01" }], extras: [{ what: "Lithograph (Freccero)", value: 15, cur: "EUR" }] }),
  c("a4", "tldle", "29B", { title: "PK Tube", issueSort: 29 }),
  c("a5", "tldle", 34, { title: "PK Timecrime DD" }),
  c("a6", "mhdw", 1, {}),
  c("a7", "kap", 15, { lotId: "lot1", lotTotal: 20, lotCurrency: "CHF", source: "Tradera" }),
  c("w1", "ltb", 3, { status: "wanted", wishLevel: "must", pricePaid: 10 }),
  c("w2", "ltb", 4, { status: "wanted" }),
  c("w3", "ltb", 5, { status: "wanted", wishLevel: "dream" }),
  { id: "b1", kind: "book", bookType: "book", seriesId: "_book", title: "Der Hobbit", author: "J. R. R. Tolkien", status: "wanted", stories: [] },
  { id: "b2", kind: "book", bookType: "book", seriesId: "_book", title: "Momo", author: "Michael Ende", status: "owned", stories: [] },
  { id: "b3", kind: "book", bookType: "", seriesId: "_book", title: "Ende gut, alles gut!", status: "owned", stories: [] },
  c("mmz14", "mm", "1937/14", { stories: [{ title: "Oscar the Ostrich", code: "YM 029", first: "30.05.1937" }, { title: "Oscar the Ostrich", code: "YM 029" }, { title: "Tolle Phantasien", code: "ZS 37-05-30" }] }),
  { id: "b4", kind: "book", bookType: "book", seriesId: "_book", seriesName: "A Song of Ice and Fire", issue: "1", issueLabel: "1", issueNum: 1, issueSort: 1, title: "A Game of Thrones", author: "George R. R. Martin", status: "owned", stories: [] },
  c("hh1", "x-herman-hedning-swedish", 1), c("hh86", "x-herman-hedning-swedish", 86),
  // read but not owned: a library book and a borrowed comic
  { id: "nb1", kind: "book", bookType: "book", seriesId: "_book", seriesName: "A Song of Ice and Fire", issue: "2", issueLabel: "2", issueNum: 2, issueSort: 2, title: "A Clash of Kings", status: "notowned", read: true, readDate: "2026-11-01", pages: "700", rating: 4, coverRating: 3, source: "Library", stories: [] },
  c("nc1", "kap", 46, { status: "notowned", read: true, readDate: "2026-10-12", stories: [{ title: "Farbror Joakim och spartävlingen", code: "I TL  299-A", writer: "Romano Scarpa", artist: "Romano Scarpa", pages: "32" }] })
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = [];
page.on("pageerror", e => errors.push("page error: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });

await page.goto(BASE, { waitUntil: "load" });
try { await page.waitForFunction(() => window.__dda && window.__dda.S.dbState !== "loading", null, { timeout: 20000 }); }
catch (e) {
  const state = await page.evaluate(() => !window.__dda ? "test hook missing" : "dbState=" + window.__dda.S.dbState + " err=" + (window.__dda.S.dbError && (window.__dda.S.dbError.name + " " + window.__dda.S.dbError.message))).catch(x => "evaluate failed: " + x.message);
  fs.writeFileSync(`${OUT}/errors.txt`, "app not ready: " + state + "\n" + errors.join("\n") + "\n");
  await page.screenshot({ path: `${OUT}/00-not-ready.png`, fullPage: true });
  console.log("app not ready: " + state + "\n" + errors.join("\n")); await browser.close(); process.exit(0);
}
await page.evaluate(async ({ series, comics }) => { const { S, saveSeries, saveMany } = window.__dda; S.series = series; await saveSeries(); await saveMany(comics); }, { series, comics });
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => window.__dda && window.__dda.S.dbState === "ready" && window.__dda.S.comics.length > 5);

const shot = async (name, fn) => {
  const look = want(name.replace(/^\d+b?-/, ""));
  if (!look && !process.env.VISIT) return;   // VISIT=1: open every screen (to catch errors) without taking pictures
  try { await page.evaluate(`(() => { const { S, nav } = window.__dda; (${fn.toString()})(); })()`); await page.waitForTimeout(600); if (look) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); }
  catch (e) { errors.push(name + ": " + e.message); }
};
await shot("01-collection", () => { S.colTab = "comics"; S.col = {}; nav("collection"); });
await shot("02-group-ltb", () => { S.col = { p: "Disney", g: "Deutschland – Lustiges Taschenbuch" }; nav("collection"); });
await shot("02b-series-ltb-copies", () => { S.col = { p: "Disney", g: "Deutschland – Lustiges Taschenbuch", s: "ltb" }; nav("collection"); });
await shot("03-group-singles", () => { S.col = { p: "Disney", g: "Deutschland – Alben & Sammlerbände" }; nav("collection"); });
await shot("04-wishlist", () => { S.gapTab = "wishlist"; S.wishKind = "comics"; S.wishOpen = { ltb: true }; nav("gaps"); });
await shot("05-wishlist-books", () => { S.gapTab = "wishlist"; S.wishKind = "books"; nav("gaps"); });
await shot("06-edit-comic", () => { S.editing = "a3"; S.draft = null; nav("add"); });
await shot("07-new-comic", () => { S.recentSeries = ["ltb", "tldle", "kap"]; S.editing = null; S.draft = null; nav("add"); });
await shot("12-trade", () => { S.filters.status = "trade"; S.colTab = "comics"; S.col = {}; nav("collection"); });
await shot("13-person", () => { S.st = { tab: "all", who: { role: "writers", name: "Guido Martina" }, status: "all" }; nav("stories"); });
await shot("14-value", () => { insuranceRows(); insuranceCsv(); S.statNoVal = true; S.valueHistory = { "2026-08": { v: 120, p: 100, n: 8 }, "2026-09": { v: 150, p: 110, n: 9 }, "2026-10": { v: 165, p: 115, n: 10 } }; S.statTab = "value"; nav("stats"); });
await shot("15-fair", () => { S.fair = true; S.gapTab = "wishlist"; S.wishKind = "comics"; nav("gaps"); document.querySelector("#fairres [data-got]").click(); });
await shot("16-stats-collection", () => { S.statTab = "collection"; S.statScope = "a"; S.statRange = "all"; nav("stats"); });
await shot("17-stats-spend", () => { S.statTab = "money"; S.statMoney = "spend"; nav("stats"); });
await shot("18-stats-stories", () => { S.statTab = "stories"; nav("stats"); });
await shot("19-stats-reading", () => { S.statTab = "reading"; nav("stats"); });
await shot("08-stats", () => { S.statTab = "overview"; nav("stats"); });
// a story twice in one comic with the same title and code (two weeks of a daily strip) is one story
if (want("stories")) try {
  const n = await page.evaluate(() => window.__dda.storyIndex("owned").filter(e => e.code && /ym029/i.test(e.code.replace(/\s+/g, ""))).length);
  if (n !== 1) errors.push("stories: Oscar the Ostrich listed " + n + " times");
  // "When the stories were made" reads "30.05.1937": a column for the 1930s
  await page.evaluate(() => { const { S, nav } = window.__dda; S.statTab = "stories"; S.statScope = "a"; nav("stats"); }); await page.waitForTimeout(700);
  const has30s = await page.evaluate(() => !!document.querySelector('.col[title^="1930s: "]'));
  if (!has30s) errors.push("stories: no 1930s column in When the stories were made");
  // a story without a date is placed by its oldest copy (Tolle Phantasien in the 1937 sample comic: a second 1930s story)
  const by30 = await page.evaluate(() => (document.querySelector('.col[title^="1930s: "]') || {}).title || "");
  if (!/1930s: 2 \(1 by your oldest copy\)/.test(by30)) errors.push("stories: oldest-copy year missing: " + by30);
  await page.screenshot({ path: `${OUT}/18b-stats-stories-years.png` });
} catch (e) { errors.push("stories: " + e.message); }
// "Show them" › Single books opens Collection › Books at the single books (not the top of Series › Book series)
if (want("stats-singles")) try {
  await page.evaluate(() => { const { S, nav } = window.__dda; S.statTab = "overview"; S.statNoVal = true; nav("stats"); }); await page.waitForTimeout(700);
  const btn = page.locator('[data-priceser="book:"]').first();
  if (!(await btn.count())) errors.push("stats singles: no Single books button");
  else { await btn.click(); await page.waitForTimeout(700); const r = await page.evaluate(() => ({ view: window.__dda.S.view, s: (window.__dda.S.col || {}).s, book: /Ende gut/.test(document.body.textContent) })); if (r.view !== "collection" || r.s !== "book:" || !r.book) errors.push("stats singles: " + JSON.stringify(r)); await page.screenshot({ path: `${OUT}/08b-stats-singles.png` }); }
} catch (e) { errors.push("stats singles: " + e.message); }
await shot("09-series", () => { nav("series"); });
await shot("09b-series-tools", () => { S.serTab = "tools"; nav("series"); });
// "Add all" in Price lists waiting: ranges added, 91:an gets its years and per year, the card goes away
if (want("series-tools")) try {
  await page.evaluate(() => { window.__dda.S.serTab = "tools"; window.__dda.nav("series"); }); await page.waitForTimeout(800);
  await page.locator("#pbatch").click(); await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const { S } = window.__dda, se = S.series.find(s => s.id === "x-91-an-swedish"); const hh = S.series.find(s => s.id === "x-herman-hedning-swedish"); return { hh: hh.numbering, hh86: (S.comics.find(c => c.id === "hh86") || {}).issueLabel, hh1: (S.comics.find(c => c.id === "hh1") || {}).issueLabel, hhr: S.valueRules.filter(r => r.s === "x-herman-hedning-swedish").length, asoiaf: S.valueRules.filter(r => r.s === "book:A Song of Ice and Fire").map(r => r.from + "-" + r.to + ":" + r.price + ":" + r.ed).join(" "), n: S.valueRules.filter(r => r.s === "x-91-an-swedish" || r.s === "x-asterix-swedish").length, eds: [...new Set(S.valueRules.filter(r => r.s === "x-asterix-swedish").map(r => r.ed))].join(","), first: se.firstYear, per: se.perYear, card: !!document.querySelector("#pbatch") }; });
  if (!r.n || r.first !== 1956 || !/1970-: 26/.test(r.per) || r.card || r.hh !== "year" || r.hh86 !== "2009/06" || r.hh1 !== "1998/01" || r.hhr !== 7 || !/1-5:4:höhere Auflagen/.test(r.asoiaf) || !/1-1:600:1\. Auflage HC/.test(r.asoiaf)) errors.push("price batch: " + JSON.stringify(r));
  await page.screenshot({ path: `${OUT}/09c-series-tools-added.png`, fullPage: true });
  fs.writeFileSync(`${OUT}/price-batch.txt`, JSON.stringify(r) + "\n");
  // 91:an's own issue list in Gaps: doubles fill two squares, 1982 has 14½, 2024 has no 16
  await page.evaluate(() => { const { S } = window.__dda; S.gapTab = "gaps"; S.gapSeries = "x-91-an-swedish"; window.__dda.nav("gaps"); }); await page.waitForTimeout(800);
  const g = await page.evaluate(() => ({ wide: !!document.querySelector('.cell.wide[data-issue="2007-09-10"]'), no9: !document.querySelector('[data-issue="2007/09"]'), x14: !!document.querySelector('[data-issue="1982X14"]'), n16: !!document.querySelector('[data-issue="2024/16"]'), n17: !!document.querySelector('[data-issue="2024/17"]'), y56: [...document.querySelectorAll(".yearrow")].length }));
  if (!g.wide || !g.no9 || !g.x14 || g.n16 || !g.n17 || g.y56 < 70) errors.push("91:an grid: " + JSON.stringify(g));
  await page.evaluate(() => { const r = [...document.querySelectorAll('.yearrow')].find(x => /^2007/.test(x.textContent.trim())); if (r) r.scrollIntoView(); }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/09d-gaps-91an.png` });
} catch (e) { errors.push("price batch: " + e.message); }
// read, not owned: kept out of the collection and its value, counted apart in Stats › Reading and in Stories
if (want("notowned")) try {
  const r = await page.evaluate(async () => { const { S, nav, owned } = window.__dda;
    S.statTab = "reading"; S.statScope = "a"; S.statRange = "all"; nav("stats"); await new Promise(f => setTimeout(f, 700));
    const reading = document.body.textContent;
    S.statTab = "stories"; nav("stats"); await new Promise(f => setTimeout(f, 700));
    const stories = document.body.textContent;
    S.gapTab = "gaps"; S.gapSeries = "book:A Song of Ice and Fire"; nav("gaps"); await new Promise(f => setTimeout(f, 700));
    return { inOwned: owned().some(c => c.id === "nb1" || c.id === "nc1"), notOwnedLine: /2 read without owning them/.test(reading), split: /owned, 2 not owned/.test(reading), storiesRead: /Stories read/.test(stories), longest: /32 pages/.test(stories),
      vol2: (document.querySelector('.cell[data-vol="2"]') || {}).className || "none", markRead: !!document.querySelector("#readmode") };
  });
  if (r.inOwned || !r.notOwnedLine || !r.split || !r.storiesRead || !r.longest || /owned/.test(r.vol2) || !r.markRead) errors.push("read, not owned: " + JSON.stringify(r));
  await page.screenshot({ path: `${OUT}/20-book-gaps.png`, fullPage: true });
  // Mark read in a book series' grid: tap volume 1 (owned) and it gets its read mark
  await page.evaluate(() => { window.__dda.S.readMode = true; window.__dda.nav("gaps"); }); await page.waitForTimeout(600);
  await page.locator('.cell[data-vol="1"]').click(); await page.waitForTimeout(600);
  const rd = await page.evaluate(() => ({ cls: document.querySelector('.cell[data-vol="1"]').className, saved: !!(window.__dda.S.comics.find(c => c.id === "b4") || {}).read }));
  if (!/\bread\b/.test(rd.cls) || !rd.saved) errors.push("book grid mark read: " + JSON.stringify(rd));
  await page.evaluate(() => { window.__dda.S.readMode = false; });
} catch (e) { errors.push("read, not owned: " + e.message); }
// the copy picker: tap the LTB 1 row with two copies
if (want("copy-picker")) try {
  await page.evaluate(() => { const { S, nav } = window.__dda; S.col = { p: "Disney", g: "Deutschland – Lustiges Taschenbuch", s: "ltb" }; nav("collection"); });
  await page.waitForTimeout(600);
  await page.locator("[data-copies]").first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/10-copy-picker.png`, fullPage: false });
} catch (e) { errors.push("copy picker: " + e.message); }

// every price suggestion must read as price ranges (catalogue/prices.json)
if (want("prices")) try {
  const bad = await page.evaluate(async () => {
    const { S, parsePrices } = window.__dda; const out = [];
    const sugg = S.priceSugg || (await (await fetch("catalogue/prices.json")).json()).series;
    const tl = S.series.find(s => s.id === "tldle");
    // a list that comes with a numbering switch (Herman Hedning: by year) is read the way Add all reads it
    const batch = S.priceBatch || (await (await fetch("catalogue/restore-batch.json")).json()).series || [];
    for (const [code, sg] of Object.entries(sugg)) { const lines = sg.text.split("\n").length, se = S.series.find(s => s.code === code || "id:" + s.id === code) || (/^\d{4}[\/:\s-]/.test(sg.text) ? S.series.find(s => s.numbering === "year") : tl), pn = (batch.find(e => e.sugg === code && e.patch && e.patch.numbering) || {}).patch, was = se.numbering; if (pn) se.numbering = pn.numbering; const res = parsePrices(se.id, sg.text, sg.cur); se.numbering = was; const read = res.editions.length ? res.editions.reduce((a, e) => a + e.n, 0) : res.ranges.length; if (read !== lines) out.push(code + ": " + read + " of " + lines + " lines read"); }
    return out;
  });
  bad.forEach(b => errors.push("price suggestion " + b));
} catch (e) { errors.push("price check: " + e.message); }
// the suggestion in the Series tab (Disney De Luxe)
if (want("price-suggestion")) try {
  await page.evaluate(() => window.__dda.nav("series")); await page.waitForTimeout(500);
  await page.locator('[data-su="Disney"]').first().click(); await page.waitForTimeout(300);
  await page.locator('[data-sg="Italia"]').first().click(); await page.waitForTimeout(300);
  await page.locator('[data-sopen]').first().click(); await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelectorAll("details").forEach(d => { if (d.querySelector("[data-psugg]")) d.open = true; }));
  await page.locator('[data-psugg]').first().scrollIntoViewIfNeeded(); await page.locator('[data-psugg]').first().click(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/11-price-suggestion.png` });
} catch (e) { errors.push("price suggestion screen: " + e.message); }

fs.writeFileSync(`${OUT}/errors.txt`, errors.length ? errors.join("\n") + "\n" : "no errors\n");
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
