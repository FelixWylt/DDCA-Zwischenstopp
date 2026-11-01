import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const lines = [];
  const vols = async (src, url, name) => {
    const xml = await (await fetch(url)).text();
    const recs = Books.parseMarc(xml);
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const v = new Map();
    [...doc.getElementsByTagNameNS("*", "datafield")].filter(f => ["490", "830", "800"].includes(f.getAttribute("tag"))).forEach(f => {
      const a = [...f.children].find(s => s.getAttribute("code") === "a" || s.getAttribute("code") === "t"), vv = [...f.children].find(s => s.getAttribute("code") === "v");
      if (a && vv) v.set(a.textContent.trim() + " | " + vv.textContent.trim(), 1);
    });
    lines.push(src + " " + name + " → records " + recs.length + ": " + [...v.keys()].filter(k => k.toLowerCase().includes(name.toLowerCase().slice(0, 8))).sort().join(" ; "));
  };
  await vols("LIBRIS", "https://libris.kb.se/xsearch?format=marcxml&n=200&query=" + encodeURIComponent('"Spejarens lärling"'), "Spejarens lärling");
  await vols("LIBRIS", "https://libris.kb.se/xsearch?format=marcxml&n=200&query=" + encodeURIComponent('serie:"Spejarens lärling"'), "Spejarens lärling");
  await vols("DNB", "https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=100&query=" + encodeURIComponent('WOE="Harry Potter" and per=Rowling'), "Harry Potter");
  await vols("DNB", "https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=100&query=" + encodeURIComponent('tst="Die Chroniken von Narnia"'), "Die Chroniken von Narnia");
  const wd = await (await fetch("https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Ranger%27s%20Apprentice&language=en&format=json&origin=*")).json();
  lines.push("WD: " + (wd.search || []).slice(0, 4).map(x => x.id + " " + x.label + " – " + x.description).join(" || "));
  return lines.join("\n");
});
console.log(out); await b.close();
