import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
p.on("console", m => console.log("console:", m.text()));
await p.goto("http://localhost:8080/t.html");
for (const i of ["3855041814", "3-423-11015-6", "0552131059", "9129538413", "91-29-53841-3", "345242238"]) {
  const r = await p.evaluate(async i => { const t = Date.now(); const r = await Books.lookupIsbn(i); return { ms: Date.now() - t, isbn: r.isbn, err: r.error, src: r.sources, d: r.data && { title: r.data.title, author: r.data.author || r.data.authors, year: r.data.year, lang: r.data.lang, genre: r.data.genre, fmt: r.data.format, pages: r.data.pages } }; }, i);
  console.log(i, JSON.stringify(r));
}
await b.close();
