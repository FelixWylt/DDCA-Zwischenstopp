// Book lookups for Dagobert Ducks Archiv: ISBN and title/author search in free library databases.
// Deutsche Nationalbibliothek, LIBRIS (Swedish national library), Open Library and Google Books all allow
// requests straight from the browser. Each is asked in parallel; the answers are merged field by field.
(function (root) {
  "use strict";

  const LANG = { ger: "German", deu: "German", de: "German", swe: "Swedish", sv: "Swedish", ita: "Italian", it: "Italian",
    eng: "English", en: "English", fre: "French", fra: "French", fr: "French", nor: "Norwegian", nob: "Norwegian", no: "Norwegian", nb: "Norwegian",
    dan: "Danish", da: "Danish", dut: "Dutch", nld: "Dutch", nl: "Dutch", spa: "Spanish", es: "Spanish" };
  const langName = code => LANG[String(code || "").toLowerCase()] || "";

  // ---- ISBN ----
  function clean(isbn) { return String(isbn || "").toUpperCase().replace(/[^0-9X]/g, ""); }
  function valid13(s) { if (!/^\d{13}$/.test(s)) return false; let t = 0; for (let i = 0; i < 12; i++) t += +s[i] * (i % 2 ? 3 : 1); return (10 - t % 10) % 10 === +s[12]; }
  function valid10(s) { if (!/^\d{9}[\dX]$/.test(s)) return false; let t = 0; for (let i = 0; i < 10; i++) t += (s[i] === "X" ? 10 : +s[i]) * (10 - i); return t % 11 === 0; }
  function to13(s) { const b = "978" + s.slice(0, 9); let t = 0; for (let i = 0; i < 12; i++) t += +b[i] * (i % 2 ? 3 : 1); return b + ((10 - t % 10) % 10); }
  // returns the ISBN-13, or "" if it isn't a valid ISBN
  function normalize(isbn) { const s = clean(isbn); if (valid13(s) && /^97[89]/.test(s)) return s; if (valid10(s)) return to13(s); return ""; }
  function hyphenless(isbn) { return clean(isbn); }

  // ---- helpers ----
  function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]); }
  async function getJson(url) { const r = await withTimeout(fetch(url), 9000); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }
  async function getText(url) { const r = await withTimeout(fetch(url), 9000); if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); }
  const tidy = s => String(s || "").replace(/[\u0098\u009c]/g, "").replace(/\s+/g, " ").replace(/\s*[\/:;,=]\s*$/, "").replace(/\s+\.$/, "").trim();
  // "Lindgren, Astrid, 1907-2002" -> "Astrid Lindgren"
  function personName(s) {
    const t = tidy(String(s || "").replace(/,?\s*\d{4}-(\d{4})?\.?$/, ""));
    const m = /^([^,]+),\s*(.+)$/.exec(t); return m ? m[2] + " " + m[1] : t;
  }
  const year = s => ((/(1[5-9]|20)\d{2}/.exec(String(s || "")) || [])[0]) || "";

  // ---- Deutsche Nationalbibliothek (MARC 21 over SRU) ----
  function parseMarc(xml) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const recs = [...doc.getElementsByTagNameNS("*", "record")].filter(r => r.getAttribute("type") === "Bibliographic");
    return recs.map(rec => {
      const fields = tag => [...rec.getElementsByTagNameNS("*", "datafield")].filter(f => f.getAttribute("tag") === tag);
      const sub = (f, code) => f ? [...f.getElementsByTagNameNS("*", "subfield")].filter(s => s.getAttribute("code") === code).map(s => s.textContent) : [];
      const first = (tag, code) => { for (const f of fields(tag)) { const v = sub(f, code)[0]; if (v) return v; } return ""; };
      const authors = fields("100").map(f => personName(sub(f, "a")[0]));
      const others = fields("700").filter(f => !sub(f, "t").length);
      const translator = others.filter(f => /bersetz/i.test(sub(f, "e").join(" "))).map(f => personName(sub(f, "a")[0])).join(", ");
      if (!authors.length) others.filter(f => /(Verfasser|Hrsg|Herausgeber)/i.test(sub(f, "e").join(" "))).forEach(f => authors.push(personName(sub(f, "a")[0])));
      const t245 = fields("245")[0];
      const title = tidy([tidy(sub(t245, "a")[0]), tidy(sub(t245, "b")[0])].filter(Boolean).join(" – "));
      const orig = fields("700").map(f => sub(f, "t")[0]).filter(Boolean)[0] || fields("240").map(f => sub(f, "a")[0])[0] || "";
      const pages = (/(\d+)\s*S\b/.exec(first("300", "a")) || /(\d+)/.exec(first("300", "a")) || [])[1] || "";
      const isbn = fields("020").map(f => clean(sub(f, "a")[0])).find(x => x.length === 13) || fields("020").map(f => clean(sub(f, "a")[0]))[0] || "";
      return {
        title, authors: authors.filter(Boolean), translator, originalTitle: tidy(orig),
        publisher: tidy(first("264", "b") || first("260", "b")), year: year(first("264", "c") || first("260", "c")),
        pages, lang: langName(first("041", "a")),
        // a publisher's paperback number (dtv 21412, rororo 23315) isn't a book series
        ...(+tidy(first("490", "v")).replace(/\D/g, "") > 200 ? {} : { series: tidy(first("490", "a")), volume: tidy(first("490", "v")) }),
        rawSeries: tidy(first("490", "a") || first("830", "a")), rawVolume: tidy(first("490", "v") || first("830", "v")),
        genre: fields("655").map(f => sub(f, "a")[0]).filter(Boolean).join(", "), isbn
      };
    });
  }
  async function dnb(query, max) {
    const url = "https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=" + (max || 1) + "&query=" + encodeURIComponent(query);
    return parseMarc(await getText(url));
  }

  // ---- LIBRIS (Swedish national library) ----
  function fromLibris(x) {
    const pub = [].concat(x.publisher || []);
    const p = pub.map(s => (/:\s*(.+)$/.exec(s) || [])[1]).filter(Boolean)[0] || (pub.length > 1 ? pub[1] : "");
    return { title: tidy(x.title), authors: [].concat(x.creator || []).map(personName), publisher: tidy(p), year: year(x.date), lang: langName(x.language), isbn: clean([].concat(x.isbn || [])[0]) };
  }
  async function libris(query, n) {
    const j = await getJson("https://libris.kb.se/xsearch?format=json&n=" + (n || 1) + "&query=" + encodeURIComponent(query));
    return ((j.xsearch || {}).list || []).map(fromLibris);
  }

  // ---- Open Library ----
  async function openLibraryIsbn(isbn) {
    const j = await getJson("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + isbn);
    const x = j["ISBN:" + isbn]; if (!x) return [];
    return [{ title: tidy([x.title, x.subtitle].filter(Boolean).join(" – ")), authors: (x.authors || []).map(a => a.name), publisher: tidy(((x.publishers || [])[0] || {}).name),
      year: year(x.publish_date), pages: x.number_of_pages ? String(x.number_of_pages) : "", cover: (x.cover || {}).medium || "", genre: (x.subjects || []).slice(0, 3).map(s => s.name).join(", "), isbn }];
  }
  async function openLibrarySearch(q) {
    const j = await getJson("https://openlibrary.org/search.json?limit=12&fields=title,author_name,first_publish_year,isbn,cover_i,publisher,language&q=" + encodeURIComponent(q));
    return (j.docs || []).map(x => ({ title: tidy(x.title), authors: x.author_name || [], year: x.first_publish_year ? String(x.first_publish_year) : "",
      publisher: tidy((x.publisher || [])[0]), isbn: ((x.isbn || []).find(i => i.length === 13) || (x.isbn || [])[0] || ""), cover: x.cover_i ? "https://covers.openlibrary.org/b/id/" + x.cover_i + "-M.jpg" : "",
      lang: langName((x.language || [])[0]) }));
  }

  // ---- Google Books ----
  function fromGoogle(v) {
    const x = v.volumeInfo || {}, ids = x.industryIdentifiers || [];
    return { title: tidy([x.title, x.subtitle].filter(Boolean).join(" – ")), authors: x.authors || [], publisher: tidy(x.publisher), year: year(x.publishedDate),
      pages: x.pageCount ? String(x.pageCount) : "", lang: langName(x.language), cover: ((x.imageLinks || {}).thumbnail || "").replace(/^http:/, "https:"),
      genre: (x.categories || []).join(", "), isbn: clean((ids.find(i => i.type === "ISBN_13") || ids[0] || {}).identifier) };
  }
  async function google(q, n) {
    const j = await getJson("https://www.googleapis.com/books/v1/volumes?maxResults=" + (n || 1) + "&q=" + encodeURIComponent(q));
    return (j.items || []).map(fromGoogle);
  }

  // genre: databases send lists and catalogue codes ("Serie:The_Kane_Chronicles", "Juvenile Fiction / Fantasy & Magic"),
  // each in its own language. Common names become one English name; up to three genres are kept, comma separated.
  const GENRES = {
    "Fantasy": ["fantasy", "fantasy fiction", "fantasy & magic", "fantasyroman", "fantasyromane", "fantasylitteratur", "fantasy-literatur", "fantastik", "fantasyberättelser"],
    "Science Fiction": ["science-fiction", "science fiction", "science-fiction", "sf", "sci-fi", "scifi", "science fiction-roman", "sciencefiction"],
    "Crime": ["krimi", "krimi", "kriminalroman", "kriminalromane", "kriminalgeschichte", "crime", "crime fiction", "mystery", "mysteries", "mystery & detective", "detective and mystery stories", "detective and mystery fiction", "deckare", "kriminalromaner", "detektivgeschichte"],
    "Thriller": ["thriller", "thrillers", "suspense", "spänning", "spänningsromaner", "psychothriller"],
    "Adventure": ["abenteuer", "abenteuer", "adventure", "adventure stories", "adventure and adventurers", "action & adventure", "äventyr", "äventyrsberättelser", "äventyrsromaner", "abenteuerroman", "abenteuergeschichte"],
    "Children's": ["kinderbuch", "kinderbuch", "kinderliteratur", "children's fiction", "children's stories", "juvenile literature", "barnböcker", "barnlitteratur", "bilderbuch"],
    "Young Adult": ["jugendbuch", "jugendbuch", "jugendliteratur", "jugendroman", "young adult", "young adult fiction", "ungdomsböcker", "ungdomslitteratur", "ungdomsromaner"],
    "Children's & Young Adult": ["kinder- und jugendbuch", "kinder- und jugendliteratur", "kinder- und jugendbuch", "barn- och ungdomslitteratur", "barn- och ungdomsböcker"],
    "Novel": ["roman", "roman", "romane", "novel", "novels", "romaner", "belletristik", "skönlitteratur", "erzählende literatur", "unterhaltungsliteratur"],
    "Historical Fiction": ["historischer roman", "historical fiction", "historischer roman", "historiska romaner", "historisk roman", "history fiction"],
    "Horror": ["horror", "horror tales", "horror stories", "skräck", "skräckromaner", "gruselgeschichte", "gruselroman"],
    "Humour": ["humor", "humor", "humour", "humorous stories", "humorous fiction", "humoristiska berättelser", "humoristisk"],
    "Romance": ["liebesroman", "romance", "love stories", "liebesroman", "kärleksromaner", "liebesgeschichte"],
    "Non-fiction": ["sachbuch", "sachbuch", "nonfiction", "non-fiction", "facklitteratur"],
    "Biography": ["biografie", "biografie", "biographie", "biography", "biographies", "autobiography", "biografi", "biografier", "memoarer"],
    "Comics": ["comic", "comic", "comics", "comics & graphic novels", "graphic novels", "graphic novel", "tecknade serier", "serier", "bildgeschichte", "manga"],
    "Mythology": ["mythologie", "mythologie", "mythology", "mytologi", "götter und helden"],
    "Fairy Tales": ["märchen", "märchen", "fairy tales", "sagor", "sagor och sägner", "folklore"],
    "History": ["geschichte", "geschichte", "history", "historia"],
    "Short Stories": ["short stories", "short story", "short fiction", "kurzgeschichten", "kurzgeschichte", "erzählungen", "erzählung", "novellen", "novelle", "noveller", "novellsamling", "berättelser", "short stories, english", "anthologies", "anthologie", "antologi"],
    "Poetry": ["gedichte", "gedichte", "lyrik", "poetry", "dikter"]
  };
  const GENRE_OF = {}; Object.keys(GENRES).forEach(k => GENRES[k].forEach(v => { GENRE_OF[v] = k; }));
  const DROP = /^(serie|series|reihe|fiction|general|juvenile fiction|young adult fiction|accessible book|protected daisy|in library|large type books|fiktionale darstellung|lending library|open library staff picks|english language|deutsch|svenska)$/i;
  function oneGenre(g) {
    const seen = new Set(), out = [];
    String(g || "").split(/[,;|]/).map(x => x.split("/").pop().replace(/_/g, " ").replace(/\.$/, "").trim())
      .filter(x => x && !/:/.test(x) && !DROP.test(x) && x.length <= 40)
      .map(x => GENRE_OF[x.toLowerCase()] || x[0].toUpperCase() + x.slice(1))
      .forEach(x => { const k = x.toLowerCase(); if (!seen.has(k) && out.length < 3) { seen.add(k); out.push(x); } });
    return out.join(", ");
  }
  // ---- merge: national libraries first, then Open Library, then Google ----
  const KEYS = ["title", "authors", "translator", "originalTitle", "publisher", "year", "pages", "lang", "series", "volume", "rawSeries", "rawVolume", "genre", "cover", "isbn"];
  function merge(list) {
    const out = {};
    KEYS.forEach(k => { if (k === "genre") return; for (const r of list) { const v = r && r[k]; if (Array.isArray(v) ? v.length : v) { out[k] = v; break; } } });
    // genres from all databases together; the shared names make the same genre count once
    out.genre = oneGenre(list.map(r => r && r.genre).filter(Boolean).join(", "));
    // library catalogues abbreviate publishers ("Dt. Taschenbuch-Verl."): take a written-out name if another source has one
    const full = list.map(r => r && r.publisher).filter(p => p && !/\.\s*$|\b[A-ZÄÖÜ][a-zäöü]{0,4}\./.test(p));
    if (out.publisher && /\./.test(out.publisher) && full.length) out.publisher = full[0];
    return out;
  }
  async function lookupIsbn(raw) {
    const isbn = normalize(raw);
    if (!isbn) return { error: "invalid" };
    const tries = [
      ["Deutsche Nationalbibliothek", () => dnb("isbn=" + isbn)],
      ["LIBRIS", () => libris("isbn:" + isbn)],
      ["Open Library", () => openLibraryIsbn(isbn)],
      ["Google Books", () => google("isbn:" + isbn)]
    ];
    const res = await Promise.all(tries.map(([name, f]) => f().then(r => ({ name, r: r[0] || null }), e => ({ name, r: null, err: e }))));
    const hits = res.filter(x => x.r && x.r.title);
    if (!hits.length) return { isbn, sources: [], offline: res.every(x => x.err), data: null };
    const data = merge(hits.map(x => x.r));
    if (!data.cover) data.cover = "https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg?default=false";
    data.isbn = isbn;
    return { isbn, sources: hits.map(x => x.name), data };
  }
  // title/author search: several catalogues, one list without duplicates
  async function search(q) {
    const tries = [() => openLibrarySearch(q), () => google(q, 10), () => dnb("WOE=" + q, 8), () => libris(q, 8)];
    const res = await Promise.all(tries.map(f => f().catch(() => [])));
    const seen = new Set(), out = [];
    const key = r => r.isbn ? "i" + r.isbn : "t" + (r.title + "|" + (r.authors || [])[0] + "|" + r.year).toLowerCase();
    // interleave so each source shows its best hits first
    for (let i = 0; i < 12; i++) res.forEach(list => { const r = list[i]; if (r && r.title && !seen.has(key(r))) { seen.add(key(r)); out.push(r); } });
    return out.slice(0, 30);
  }

  root.Books = { normalize, hyphenless, lookupIsbn, search, parseMarc, fromLibris, langName, oneGenre };
})(typeof window !== "undefined" ? window : globalThis);
