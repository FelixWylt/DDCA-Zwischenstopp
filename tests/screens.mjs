// Screenshot check: opens the app like a phone (Fairphone 5 size) with sample comics, takes pictures of the main
// screens and records JavaScript errors. Run by .github/workflows/screens.yml after every app change.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:8080/";
const OUT = process.env.OUT || "shots";
fs.mkdirSync(OUT, { recursive: true });

const series = [
  { id: "ltb", name: "Lustiges Taschenbuch", short: "LTB", code: "de/LTB", country: "de", publisher: "Disney", group: "Deutschland – Lustiges Taschenbuch", numbering: "running", latest: 600 },
  { id: "tldle", name: "Disney De Luxe", short: "DDL", code: "it/TLDLE", country: "it", publisher: "Disney", group: "Italia", numbering: "running" },
  { id: "mhdw", name: "Micky Holmes & Donald Watson", code: "de/MHDW", country: "de", publisher: "Disney", group: "Deutschland – Alben & Sammlerbände", numbering: "running" },
  { id: "kap", name: "Kalle Ankas Pocket", short: "KAP", code: "se/KAP", country: "se", publisher: "Disney", group: "Sverige – Pocket", numbering: "running" }
];
const c = (id, s, n, extra) => Object.assign({ id, kind: "issue", seriesId: s, issue: String(n), issueLabel: String(n), issueSort: typeof n === "number" ? n : parseInt(n, 10), status: "owned", copies: 1, currency: "CHF", stories: [] }, extra || {});
const comics = [
  c("a1", "ltb", 1, { title: "Der Kolumbusfalter", grade: "1", pricePaid: 40, source: "Ricardo", purchaseDate: "2025-03-01" }),
  c("a2", "ltb", 1, { title: "Der Kolumbusfalter", grade: "3", pricePaid: 12, source: "Flohmarkt", purchaseDate: "2025-06-01", notes: "Second copy" }),
  c("a3", "ltb", 2, { title: "Hallo, hier Micky!" }),
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
try { await page.waitForFunction(() => typeof S !== "undefined" && S.dbState !== "loading", null, { timeout: 20000 }); }
catch (e) {
  const state = await page.evaluate(() => typeof S === "undefined" ? "S is undefined" : "dbState=" + S.dbState + " err=" + (S.dbError && (S.dbError.name + " " + S.dbError.message))).catch(x => "evaluate failed: " + x.message);
  fs.writeFileSync(`${OUT}/errors.txt`, "app not ready: " + state + "\n" + errors.join("\n") + "\n");
  await page.screenshot({ path: `${OUT}/00-not-ready.png`, fullPage: true });
  console.log("app not ready: " + state + "\n" + errors.join("\n")); await browser.close(); process.exit(0);
}
await page.evaluate(async ({ series, comics }) => { S.series = series; await saveSeries(); await saveMany(comics); }, { series, comics });
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => typeof S !== "undefined" && S.comics && S.comics.length > 5);

const shot = async (name, fn) => {
  try { await page.evaluate(fn); await page.waitForTimeout(600); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); }
  catch (e) { errors.push(name + ": " + e.message); }
};
await shot("01-collection", () => { S.colTab = "comics"; S.col = {}; nav("collection"); });
await shot("02-group-ltb", () => { S.col = { p: "Disney", g: "Deutschland – Lustiges Taschenbuch" }; nav("collection"); });
await shot("03-group-singles", () => { S.col = { p: "Disney", g: "Deutschland – Alben & Sammlerbände" }; nav("collection"); });
await shot("04-wishlist", () => { S.gapTab = "wishlist"; S.wishKind = "comics"; nav("gaps"); });
await shot("05-wishlist-books", () => { S.gapTab = "wishlist"; S.wishKind = "books"; nav("gaps"); });
await shot("06-edit-comic", () => { S.editing = "a3"; S.draft = null; nav("add"); });
await shot("07-new-comic", () => { S.editing = null; S.draft = null; nav("add"); });
await shot("08-stats", () => { nav("stats"); });
await shot("09-series", () => { nav("series"); });
// the copy picker: tap the LTB 1 row with two copies
try {
  await page.evaluate(() => { S.col = { p: "Disney", g: "Deutschland – Lustiges Taschenbuch", s: "ltb" }; nav("collection"); });
  await page.waitForTimeout(600);
  await page.locator("[data-copies]").first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/10-copy-picker.png`, fullPage: false });
} catch (e) { errors.push("copy picker: " + e.message); }

fs.writeFileSync(`${OUT}/errors.txt`, errors.length ? errors.join("\n") + "\n" : "no errors\n");
console.log(errors.length ? errors.join("\n") : "no errors");
await browser.close();
