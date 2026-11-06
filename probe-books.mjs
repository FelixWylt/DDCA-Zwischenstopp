import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/t.html");
for (const [s, v, a, l] of [["Artemis Fowl", "2", "Eoin Colfer", "German"], ["Artemis Fowl", "2", "", "English"], ["Artemis Fowl", "2", "Eoin Colfer", "Swedish"], ["Percy Jackson", "3", "", "Swedish"], ["Mistborn", "1", "Brandon Sanderson", "English"], ["Woodwalkers", "1", "", "German"], ["Spejarens lärling", "4", "", "Swedish"]]) {
  const r = await p.evaluate(async ([s, v, a, l]) => { const t = Date.now(); const r = await Books.seriesSearch(s, v, { author: a, lang: l }); return { ms: Date.now() - t, n: r.length, top: r.slice(0, 4).map(x => [x.title, (x.authors || []).join("/"), x.year, x.lang, x.series || x.rawSeries, x.volume || x.rawVolume, x.isbn].join(" | ")) }; }, [s, v, a, l]);
  console.log(s, v, a, l, JSON.stringify(r, null, 1));
}
await b.close();
