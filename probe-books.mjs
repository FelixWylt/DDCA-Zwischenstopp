// Probe: where can the 1961 Penguin edition of Animal Farm be found?
const get = async (u, txt) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(30000) }); return txt ? await r.text() : await r.json(); } catch (e) { return { ERR: e.message }; } };
const show = (label, x) => console.log("\n### " + label + "\n" + JSON.stringify(x, null, 1).slice(0, 3500));

// 1. what the app asks today
const cur = await get("https://openlibrary.org/search.json?limit=12&fields=title,author_name,first_publish_year,isbn,cover_i,publisher,language&q=" + encodeURIComponent("Animal Farm 1961"));
show("OL today: q=Animal Farm 1961", (cur.docs || []).map(d => [d.title, (d.author_name || [])[0], d.first_publish_year, (d.publisher || []).slice(0, 3)]));

// 2. edition-level search
for (const q of ['title:"animal farm" author:orwell publisher:penguin publish_year:1961', 'animal farm orwell penguin', 'title:"animal farm" publish_year:1961']) {
  const j = await get("https://openlibrary.org/search.json?limit=5&fields=key,title,author_name,first_publish_year,editions,editions.key,editions.title,editions.publisher,editions.publish_date,editions.isbn,editions.cover_i,editions.number_of_pages_median,editions.language&q=" + encodeURIComponent(q));
  show("OL editions: " + q, { numFound: j.numFound, docs: (j.docs || []).map(d => ({ t: d.title, a: d.author_name, ed: d.editions })) });
}
// 3. all editions of the work, filtered to 1961
const w = await get("https://openlibrary.org/search.json?limit=1&fields=key&q=" + encodeURIComponent('title:"animal farm" author:orwell'));
const wk = ((w.docs || [])[0] || {}).key;
if (wk) {
  const eds = await get("https://openlibrary.org" + wk + "/editions.json?limit=1000");
  const hits = (eds.entries || []).filter(e => /196[01]/.test(e.publish_date || ""));
  show("OL work " + wk + " editions 1960/61 (" + (eds.entries || []).length + " total)", hits.map(e => [e.key, e.title, e.publishers, e.publish_date, e.isbn_10, e.covers, e.number_of_pages, e.physical_format]));
}
// 4. Google
const g = await get("https://www.googleapis.com/books/v1/volumes?maxResults=10&q=" + encodeURIComponent("intitle:animal farm inauthor:orwell"));
show("Google intitle/inauthor", (g.items || []).map(v => [v.volumeInfo.title, v.volumeInfo.authors, v.volumeInfo.publisher, v.volumeInfo.publishedDate]));
const g2 = await get("https://www.googleapis.com/books/v1/volumes?maxResults=10&q=" + encodeURIComponent("Animal Farm 1961"));
show("Google today: Animal Farm 1961", (g2.items || []).map(v => [v.volumeInfo.title, v.volumeInfo.authors, v.volumeInfo.publisher, v.volumeInfo.publishedDate]));
// 5. DNB / LIBRIS
const d = await get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=oai_dc&maximumRecords=10&query=" + encodeURIComponent('tit="animal farm" and jhr=1961'), true);
show("DNB tit+jhr", typeof d === "string" ? [...d.matchAll(/<dc:(title|publisher|date)>([^<]*)/g)].map(m => m[2]) : d);
const l = await get("https://libris.kb.se/xsearch?format=json&n=10&query=" + encodeURIComponent("tit:(animal farm) år:1961"));
show("LIBRIS tit+år", ((l.xsearch || {}).list || []).map(x => [x.title, x.creator, x.publisher, x.date]));
