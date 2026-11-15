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
  { id: "kap", name: "Kalle Ankas Pocket", short: "KAP", code: "se/KAP", country: "se", publisher: "Disney", group: "Sverige – Pocket", numbering: "running" }
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
  { id: "b2", kind: "book", bookType: "book", seriesId: "_book", title: "Momo", author: "Michael Ende", status: "owned", stories: [] }
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
await shot("14-value", () => { insuranceRows(); insuranceCsv(); S.valueHistory = { "2026-08": { v: 120, p: 100, n: 8 }, "2026-09": { v: 150, p: 110, n: 9 }, "2026-10": { v: 165, p: 115, n: 10 } }; S.statTab = "value"; nav("stats"); });
await shot("15-fair", () => { S.fair = true; S.gapTab = "wishlist"; S.wishKind = "comics"; nav("gaps"); document.querySelector("#fairres [data-got]").click(); });
await shot("08-stats", () => { nav("stats"); });
await shot("09-series", () => { nav("series"); });
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
    for (const [code, sg] of Object.entries(sugg)) { const lines = sg.text.split("\n").length, res = parsePrices((S.series.find(s => s.code === code) || tl).id, sg.text, sg.cur); if (res.ranges.length !== lines) out.push(code + ": " + res.ranges.length + " of " + lines + " lines read"); }
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
