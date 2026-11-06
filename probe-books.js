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

  // binding, from the words libraries add to the ISBN ("inb.", "hft.", "Gb.", "kart.", "Festeinband") or Open Library's physical_format
  function bindingOf(text, swedish) {
    const t = " " + String(text || "").toLowerCase() + " ";
    if (/ljudbok|ljudböcker|audio|hörbuch|\bmp3\b|\bcd\b|daisy/.test(t)) return "Audiobook";
    if (/e-bok|e-böcker|ebook|e-book|epub|\bpdf\b|kindle|online/.test(t)) return "E-book";
    if (/box|schuber|kassett|\bset\b/.test(t)) return "Box set";
    if (/\b(inb|inbunden|danskt band|kartonnage|gb|geb|gebunden|festeinband|pappband|hardcover|hardback|hard cover|library binding|board book|pp)\b/.test(t)) return "Hardcover";
    if (/\bkart/.test(t)) return swedish ? "Hardcover" : "Softcover";   // Swedish kartonnage has board covers; German "kartoniert" is a soft cover
    if (/\b(pocket|storpocket|taschenbuch|tb|paperback|mass market|pb)\b/.test(t)) return "Paperback";
    if (/\b(hft|häftad|flexband|broschur|broschiert|klappenbroschur|softcover|soft cover|trade paperback)\b/.test(t)) return "Softcover";
    return "";
  }
  const NOT_SERIES = /\b(werk|werke|werkausgabe|ausgabe|gesammelte|sämtliche|classics|klassiker|bibliothek|bibliothèque|library|taschenbuch|taschenbücher|erläuterungen|lektüre|lektürehilfe|edition|reihe|collection|meisterwerke|bücherei|samlade|verk)\b|^(dtv|rororo|detebe|fischer|btb|suhrkamp|insel|reclam|goldmann|heyne|diogenes)\b/i;
  // numbered publisher series that collectors gather by number
  const COLLECTED = /^insel[- ]bücherei\b|^insel[- ]taschenbuch\b/i;
  function storySeries(fields, sub) {
    const authorWorks = new Set(fields("800").map(f => tidy(sub(f, "t")[0]).toLowerCase()).filter(Boolean));
    // one volume of a work in several volumes: "Uhlands Werke, Bd. 1" -> series Uhlands Werke, volume 1
    const t245 = fields("245")[0], part = t245 ? tidy(sub(t245, "n")[0]) : "", partNo = (/(\d+)/.exec(part) || [])[1];
    const books = fields("490").concat(fields("830"));
    if (partNo && !books.some(f => COLLECTED.test(tidy(sub(f, "a")[0]).normalize("NFC")))) return { series: tidy(sub(t245, "a")[0]).replace(/^\[([^\]]+)\]\s*/, "$1 "), volume: partNo };
    for (const f of books) {
      const name = tidy(sub(f, "a")[0]).replace(/(\S)[\s-]+(serie|serien|series)$/i, "$1"), vol = tidy(sub(f, "v")[0]), n = +String(vol).replace(/[^\d.]/g, "");
      if (name && COLLECTED.test(name.normalize("NFC"))) return { series: name.replace(/\s*;.*$/, ""), volume: vol.replace(/^\D+/, "") };
      if (!name || authorWorks.has(name.toLowerCase()) || NOT_SERIES.test(name.normalize("NFC")) || n > 200) continue;
      return { series: name, volume: vol };
    }
    return null;
  }
  // DNB subject groups (Sachgruppen) that say something about the genre
  const SDNB = { B: "Fiction", K: "Kinder- und Jugendliteratur", "741.5": "Comics", "830": "Fiction", "833": "Fiction", "823": "Fiction", "839": "Fiction", "S": "" };
  // ---- Deutsche Nationalbibliothek (MARC 21 over SRU) ----
  function parseMarc(xml) {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const recs = [...doc.getElementsByTagNameNS("*", "record")].filter(r => (r.getAttribute("type") || "Bibliographic") === "Bibliographic" && [...r.children].some(x => x.localName === "datafield"));
    return recs.map(rec => {
      const fields = tag => [...rec.getElementsByTagNameNS("*", "datafield")].filter(f => f.getAttribute("tag") === tag);
      const sub = (f, code) => f ? [...f.getElementsByTagNameNS("*", "subfield")].filter(s => s.getAttribute("code") === code).map(s => s.textContent) : [];
      const first = (tag, code) => { for (const f of fields(tag)) { const v = sub(f, code)[0]; if (v) return v; } return ""; };
      const authors = fields("100").map(f => personName(sub(f, "a")[0]));
      const others = fields("700").filter(f => !sub(f, "t").length);
      const translator = others.filter(f => /bersetz|översätt|translat|trl/i.test(sub(f, "e").concat(sub(f, "4")).join(" "))).map(f => personName(sub(f, "a")[0])).join(", ");
      // an anonymous work (Nibelungenlied, Edda, Beowulf) is catalogued under its title (130), not under an author: its editors aren't its authors
      if (!authors.length && !fields("110").length && fields("130").length) authors.push("Anonymous");
      if (!authors.length) others.filter(f => /(Verfasser|Hrsg|Herausgeber)/i.test(sub(f, "e").join(" "))).forEach(f => authors.push(personName(sub(f, "a")[0])));
      const t245 = fields("245")[0];
      const title = tidy([tidy(sub(t245, "a")[0]), tidy(sub(t245, "b")[0])].filter(Boolean).join(" – "));
      const orig = fields("700").map(f => sub(f, "t")[0]).filter(Boolean)[0] || fields("240").map(f => sub(f, "a")[0])[0] || "";
      const extent = first("300", "a");
      const pages = (/(\d+)\s*(?:s\.|s\b|seiten|sidor|p\.|pages?\b)/i.exec(extent) || (/tim|min|vol|band|cd|mp3|punktskrift/i.test(extent) ? null : /^\s*\[?(\d+)\]?\s*$/.exec(extent)) || [])[1] || "";
      const isbn = fields("020").map(f => clean(sub(f, "a")[0])).find(x => x.length === 13) || fields("020").map(f => clean(sub(f, "a")[0]))[0] || "";
      const langs = fields("041").flatMap(f => sub(f, "a")).map(langName).filter(Boolean);
      const lang = langs.length > 1 ? (langs.find(l => l !== "German" && l !== "Swedish") || langs[0]) : langs[0] || "";
      const binding = bindingOf(fields("020").map(f => sub(f, "q").concat(sub(f, "c")).join(" ")).join(" ") + " " + fields("655").map(f => sub(f, "a")[0]).join(" "), lang === "Swedish");
      return {
        title, authors: authors.filter(Boolean), translator, originalTitle: tidy(orig), format: binding,
        publisher: tidy(first("264", "b") || first("260", "b")), year: year(first("264", "c") || first("260", "c")),
        pages, lang,
        // a publisher's paperback number (dtv 21412, rororo 23315), an author's collected works ("Das dramatische Werk", Werkausgabe)
        // or a publisher's line ("Modern classics", "Königs Erläuterungen") isn't a book series
        ...(storySeries(fields, sub) || {}),
        rawSeries: tidy(first("490", "a") || first("830", "a")), rawVolume: tidy(first("490", "v") || first("830", "v")),
        genre: fields("655").map(f => sub(f, "a")[0]).filter(Boolean)
          .concat(oneGenre(fields("650").map(f => sub(f, "a")[0]).filter(Boolean).join(", "), true))
          .concat(fields("084").filter(f => sub(f, "2")[0] === "sdnb").map(f => SDNB[sub(f, "a")[0]] || ""))
          .concat(fields("082").filter(f => /sdnb/.test(sub(f, "2")[0] || "")).flatMap(f => sub(f, "a")).filter(a => a === "B" || a === "K").map(a => SDNB[a])).filter(Boolean).join(", "), isbn
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
    return { title: tidy(x.title), authors: [].concat(x.creator || []).map(personName), publisher: tidy(p), year: year(x.date), lang: langName(x.language), genre: [].concat(x.subject || [], x.genre || []).filter(v => typeof v === "string").join(", "), isbn: clean([].concat(x.isbn || [])[0]) };
  }
  async function libris(query, n) {
    try {
      const xml = await getText("https://libris.kb.se/xsearch?format=marcxml&n=" + (n || 1) + "&query=" + encodeURIComponent(query));
      const recs = parseMarc(xml).filter(r => r.title);
      if (recs.length) return recs;
    } catch (e) {}
    const j = await getJson("https://libris.kb.se/xsearch?format=json&n=" + (n || 1) + "&query=" + encodeURIComponent(query));
    return ((j.xsearch || {}).list || []).map(fromLibris);
  }

  // ---- Open Library ----
  async function openLibraryIsbn(isbn) {
    const j = await getJson("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + isbn);
    const x = j["ISBN:" + isbn]; if (!x) return [];
    let fmt = "", lang = ""; try { const ed = await getJson("https://openlibrary.org/isbn/" + isbn + ".json"); fmt = bindingOf(ed.physical_format); lang = langName(String(((ed.languages || [])[0] || {}).key || "").split("/").pop()); if (!x.number_of_pages && ed.number_of_pages) x.number_of_pages = ed.number_of_pages; } catch (e) {}
    return [{ format: fmt, lang, title: tidy([x.title, x.subtitle].filter(Boolean).join(" – ")), authors: (x.authors || []).map(a => a.name), publisher: tidy(((x.publishers || [])[0] || {}).name),
      year: year(x.publish_date), pages: x.number_of_pages ? String(x.number_of_pages) : "", cover: (x.cover || {}).medium || "", genre: oneGenre((x.subjects || []).slice(0, 25).map(s => s.name).join(", "), true), isbn }];
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
    "Fantasy": ["fantasy literature", "high fantasy", "urban fantasy", "fantasy", "fantasy fiction", "fantasy & magic", "fantasyroman", "fantasyromane", "fantasylitteratur", "fantasy-literatur", "fantastik", "fantasyberättelser"],
    "Science Fiction": ["science fiction literature", "dystopian fiction", "dystopias", "dystopier", "apocalyptic fiction", "science fiction novel", "science-fiction", "science fiction", "science-fiction", "sf", "sci-fi", "scifi", "science fiction-roman", "sciencefiction"],
    "Crime": ["crime novel", "detective fiction", "detective novel", "mystery fiction", "krimi", "krimi", "kriminalroman", "kriminalromane", "kriminalgeschichte", "crime", "crime fiction", "mystery", "mysteries", "mystery & detective", "detective and mystery stories", "detective and mystery fiction", "deckare", "detektivböcker", "kriminalromaner", "detektivgeschichte"],
    "Thriller": ["thriller", "thrillers", "suspense", "spänning", "spänningsromaner", "spänningsböcker", "psychothriller"],
    "Adventure": ["adventure fiction", "adventure novel", "abenteuer", "abenteuer", "adventure", "adventure stories", "adventure and adventurers", "action & adventure", "äventyr", "äventyrsberättelser", "äventyrsromaner", "äventyrsböcker", "abenteuerroman", "abenteuergeschichte"],
    "Children's": ["juvenile fiction", "juvenile literature", "juvenile works", "kapitelböcker", "barnböcker", "bilderböcker", "children's literature", "children's books", "children's novel", "kinderbuch", "kinderbuch", "kinderliteratur", "children's fiction", "children's stories", "juvenile literature", "barnböcker", "barnlitteratur", "bilderbuch"],
    "Young Adult": ["young adult fiction", "young adult literature", "young adult works", "young adult novel", "jugendbuch", "jugendbuch", "jugendliteratur", "jugendroman", "young adult", "young adult fiction", "ungdomsböcker", "ungdomslitteratur", "ungdomsromaner"],
    "Children's & Young Adult": ["kinder- und jugendbuch", "kinder- und jugendliteratur", "kinder- und jugendbuch", "barn- och ungdomslitteratur", "barn- och ungdomsböcker"],
    "Novel": ["fiction", "general fiction", "literary fiction", "roman", "roman", "romane", "novel", "novels", "romaner", "belletristik", "skönlitteratur", "erzählende literatur", "unterhaltungsliteratur"],
    "Historical Fiction": ["historical novel", "historischer roman", "historical fiction", "historischer roman", "historiska romaner", "historisk roman", "historiska böcker", "history fiction"],
    "Horror": ["horror fiction", "horror literature", "horror", "horror tales", "horror stories", "skräck", "skräckromaner", "skräckböcker", "gruselgeschichte", "gruselroman"],
    "Humour": ["comedy", "humorous fiction", "humor", "humor", "humour", "humorous stories", "humorous fiction", "humoristiska berättelser", "humoristisk", "humoristiska böcker"],
    "Romance": ["romance novel", "liebesroman", "romance", "love stories", "liebesroman", "kärleksromaner", "kärleksböcker", "liebesgeschichte"],
    "Non-fiction": ["sachbuch", "sachbuch", "nonfiction", "non-fiction", "facklitteratur"],
    "Biography": ["biografie", "biografie", "biographie", "biography", "biographies", "autobiography", "biografi", "biografier", "memoarer"],
    "Comics": ["comic book", "comic book series", "comic strip", "comic", "comic", "comics", "comics & graphic novels", "graphic novels", "graphic novel", "tecknade serier", "serier", "bildgeschichte", "manga"],
    "Mythology": ["mythological fiction", "mythologie", "mythologie", "mythology", "mytologi", "götter und helden"],
    "Fairy Tales": ["fairy tale", "märchen", "märchen", "fairy tales", "sagor", "sagor och sägner", "folklore"],
    "History": ["geschichte", "geschichte", "history", "historia"],
    "Short Stories": ["short story collection", "short stories", "short story", "short fiction", "kurzgeschichten", "kurzgeschichte", "erzählungen", "erzählung", "noveller", "novellsamling", "berättelser", "short stories, english", "anthologies", "anthologie", "antologi"],
    "Novella": ["novella", "novellas", "novellen", "novelle", "novelette", "kortroman", "kortromaner", "romanzo breve", "racconto lungo"],
    "Drama": ["drama", "dramen", "schauspiel", "theaterstück", "bühnenwerk", "dramatisches gedicht", "tragödie", "trauerspiel", "komödie", "lustspiel", "tragische komödie", "plays", "play", "english drama", "german drama", "comedies", "tragedies", "drama (genre)", "dramatic works", "theater", "tragedy", "comedy (drama)", "pjäs", "pjäser", "skådespel", "dramatik"],
    "Poetry": ["poems", "gedichte", "gedichte", "lyrik", "poetry", "dikter"]
  };
  const GENRE_OF = {}; Object.keys(GENRES).forEach(k => { GENRE_OF[k.toLowerCase()] = k; GENRES[k].forEach(v => { GENRE_OF[v] = k; }); });
  const DROP = /^(ej skönlitteratur|pressendruck|geschenkbuch|geschenkbücher|fiktionale darstellung|lehr- und lernressource|lehrmittel|schulbuch|unterrichtsmaterial|lernhilfe|lektürehilfe|aufgabensammlung|quelle|hochschulschrift|online-publikation|bildband|ratgeber|verzeichnis|katalog|einführung|textsammlung|läromedel|study guides?|textbooks?|serie|series|reihe|general|ljudböcker|e-böcker|e-bok|talböcker|punktskrift|lättläst|storstil|audiobooks?|accessible book|protected daisy|in library|large type books|fiktionale darstellung|lending library|open library staff picks|english language|deutsch|svenska|nyt[: ].*|reading level.*|lexile.*|literature|fiction in english|translations into .*|.*\d{4}.*)$/i;
  const GENERIC = new Set(["Novel", "Children's", "Young Adult", "Children's & Young Adult"]);
  function oneGenre(g, knownOnly) {
    const seen = new Set(), known = [], other = [];
    String(g || "").normalize("NFC").split(/[,;|]/).map(x => x.split("/").pop().replace(/_/g, " ").replace(/\.$/, "").replace(/\s*\([^)]*\)\s*$/, "").trim())
      .map(x => x.split(":")[0].trim()).filter(x => x && !DROP.test(x) && x.length <= 40)
      .forEach(x => {
        const k = GENRE_OF[x.toLowerCase()] || GENRE_OF[x.toLowerCase().replace(/ fiction$| stories$| novels?$/, "")];
        if (k) { if (!seen.has(k)) { seen.add(k); known.push(k); } }
        else if (x.length <= 25 && !/\d/.test(x) && !seen.has(x.toLowerCase())) { seen.add(x.toLowerCase()); other.push(x[0].toUpperCase() + x.slice(1)); }
      });
    // specific genres before general ones ("Fantasy, Children's"); unknown words only when no known genre was found
    const specific = known.filter(k => !GENERIC.has(k)), general = known.filter(k => GENERIC.has(k));
    const pick = specific.concat(general).filter((k, i, all) => k !== "Novel" || all.length === 1);   // "Novel" only when nothing more precise is known
    return (pick.length ? pick : knownOnly ? [] : other).slice(0, 3).join(", ");
  }

  // "adapted by Alan Grant", "Cam Kennedy (Illustrator)", "Hrsg. von ..." -> the name; each person once
  const ROLE = /^(adapted|adaptation|retold|illustrated|illustrations?|edited|translated|introduced|introduction|foreword|afterword|written|text|drawn|art|bearbeitet|übersetzt|illustriert|herausgegeben|hrsg\.?|nacherzählt|aus dem \w+ von|bearbetad|översatt|illustrerad)(\s+(and|und|och|&)\s+\w+)?\s*(by|von|av|:)?\s+/i;
  function cleanPeople(list) {
    const seen = new Set(), out = [];
    [].concat(list || []).flatMap(a => String(a || "").split(/\s*;\s*|,\s*(?=(?:adapted|adaptation|retold|illustrated|edited|translated|with|and)\b)|\s+(?:and|und|och|&)\s+(?=\w+ by\b)/i)).forEach(a => {
      let n = tidy(String(a).replace(ROLE, "").replace(/\s*[\(\[][^)\]]*[\)\]]\s*$/, "").replace(/,?\s*\b(ed|eds|hrsg|ill|illus|trans|transl|adapter|illustrator|editor)\.?$/i, ""));
      n = personName(n);
      const k = n.toLowerCase().normalize("NFC").replace(/[^a-z0-9äöüåéèàç]+/g, "");
      if (n && k && !seen.has(k)) { seen.add(k); out.push(n); }
    });
    return out;
  }
  // ---- merge: national libraries first, then Open Library, then Google ----
  const KEYS = ["title", "authors", "translator", "originalTitle", "publisher", "year", "pages", "format", "lang", "series", "volume", "rawSeries", "rawVolume", "genre", "cover", "isbn"];
  function merge(list) {
    const out = {};
    list = list.map(r => r && Object.assign({}, r, { authors: cleanPeople(r.authors) }));
    KEYS.forEach(k => { if (k === "genre") return; for (const r of list) { const v = r && r[k]; if (Array.isArray(v) ? v.length : v) { out[k] = v; break; } } });
    // genres from all databases together; the shared names make the same genre count once
    out.genre = oneGenre(list.map(r => r && r.genre).filter(Boolean).join(", "));
    if (!out.genre || out.genre === "Novel") {
      const sub = String(out.title || "").toLowerCase().normalize("NFC");
      const m = /\b(dramatisches gedicht|schauspiel|tragödie|trauerspiel|komödie|lustspiel|drama|pjäs|comedy|tragedy|a play|play in \w+ acts?)\b/.exec(sub) ? "Drama"
        : /\b(novellen?|novella)\b/.exec(sub) ? "Novella" : /\b(erzählungen|kurzgeschichten|noveller)\b/.exec(sub) ? "Short Stories" : /\b(gedichte|dikter|poems)\b/.exec(sub) ? "Poetry"
        : /\b(roman|novel)\b/.exec(sub) ? "Novel" : "";
      if (m) out.genre = m;
    }
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
    if (!data.genre && data.title) data.genre = await genreFromOtherEditions(data, isbn);
    if (!data.cover) data.cover = "https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg?default=false";
    data.isbn = isbn;
    // no database names the language: the ISBN's country group usually does (978-0/1 English, 978-3 German, 978-91 Swedish ...)
    if (!data.lang) data.lang = langFromIsbn(isbn);
    return { isbn, sources: hits.map(x => x.name), data };
  }
  // a school or study edition often has no genre of its own: take it from other editions of the same work
  // the work's title without edition words: "Strange Case of Dr. Jekyll and Mr. Hyde, Norton Critical Editions, 2nd Edition" -> "Strange Case of Dr. Jekyll and Mr. Hyde"
  function workTitle(t) {
    let x = tidy(String(t || "").split(" – ")[0]).replace(/\s*\([^)]*\)\s*$/, "");
    for (let i = 0; i < 3; i++) x = x.replace(/,\s*[^,]*\b(editions?|ausgabe|auflage|upplaga|edizione|classics|reader)\b[^,]*$/i, "");
    return x.trim();
  }
  const workKey = t => workTitle(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/^(the|a|an|der|die|das|le|la|les|il|lo|el|den|det)\s+/, "");
  async function genreFromOtherEditions(data, isbn) {
    const title = workTitle(data.title), author = (data.authors || [])[0] || "";
    if (!title) return "";
    const surname = author.split(" ").pop();
    // the same work: same title, and the same author when the record names one (older records of the same ISBN count too)
    const same = r => r && workKey(r.title) === workKey(title) && (!surname || !(r.authors || []).length || (r.authors || []).some(a => a.toLowerCase().includes(surname.toLowerCase())));
    const olSubjects = async () => {
      const j = await getJson("https://openlibrary.org/search.json?limit=8&fields=title,author_name,subject&title=" + encodeURIComponent(title) + (surname ? "&author=" + encodeURIComponent(surname) : ""));
      return (j.docs || []).map(d => ({ title: d.title, authors: d.author_name || [], genre: oneGenre((d.subject || []).slice(0, 40).join(", "), true) }));
    };
    const asks = [
      dnb('tit="' + title + '"' + (surname ? ' and per="' + surname + '"' : ""), 12).catch(() => []),
      libris('tit:"' + title + '"', 12).catch(() => []),
      olSubjects().catch(() => [])
    ];
    const recs = [].concat(...await Promise.all(asks)).filter(same).map(r => oneGenre(r.genre)).filter(Boolean);
    // genres most editions agree on; one comic adaptation shouldn't make the novel a comic
    const count = {}; recs.forEach(g => g.split(", ").forEach(x => { count[x] = (count[x] || 0) + 1; }));
    const ranked = Object.keys(count).sort((a, b) => count[b] - count[a]), specific = ranked.filter(k => !GENERIC.has(k));
    // specific genres named by at least two editions and at least half as often as the most named one
    const top = specific.length ? count[specific[0]] : 0;
    const keep = specific.filter(k => count[k] >= 2 && count[k] * 2 >= top);
    if (keep.length) return oneGenre(keep.join(", "));
    return oneGenre(specific.length === 1 ? specific[0] : ranked[0] || "");
  }
  function langFromIsbn(isbn) {
    const t = String(isbn);
    if (t.startsWith("979")) { const g9 = t.slice(3); return g9.startsWith("8") ? "English" : g9.startsWith("10") ? "French" : g9.startsWith("12") ? "Italian" : ""; }
    const g = t.slice(3);
    const groups = [["0", "English"], ["1", "English"], ["2", "French"], ["3", "German"], ["82", "Norwegian"], ["87", "Danish"], ["88", "Italian"], ["91", "Swedish"], ["90", "Dutch"], ["94", "Dutch"], ["84", "Spanish"]];
    const hit = groups.find(([p]) => g.startsWith(p));
    return hit ? hit[1] : "";
  }
  // title/author search: several catalogues, one list without duplicates
  async function search(q) {
    const tries = [() => openLibrarySearch(q), () => google(q, 10), () => dnb("WOE=" + q, 8), () => libris(q, 8)];
    const res = await Promise.all(tries.map(f => f().catch(() => [])));
    const seen = new Set(), out = [];
    const key = r => r.isbn ? "i" + r.isbn : "t" + (r.title + "|" + (r.authors || [])[0] + "|" + r.year).toLowerCase();
    // interleave so each source shows its best hits first
    for (let i = 0; i < 12; i++) res.forEach(list => { const r = list[i]; if (r && r.title && !seen.has(key(r))) { seen.add(key(r)); out.push(r); } });
    // search hits are used directly when they have no ISBN, so their genres get the same clean-up as a lookup
    return out.slice(0, 30).map(r => Object.assign({}, r, { genre: oneGenre(r.genre || ""), authors: cleanPeople(r.authors) }));
  }

  // how many volumes a series has in this language's national library: the highest volume number listed under exactly that series name
  async function seriesVolumes(name, lang) {
    const key = x => String(x || "").toLowerCase().normalize("NFC").replace(/[\s.;:,\/]+$/, "").replace(/\s+/g, " ").trim();
    const want = key(name);
    const read = xml => {
      const doc = new DOMParser().parseFromString(xml, "text/xml"); let max = 0;
      [...doc.getElementsByTagNameNS("*", "datafield")].filter(f => ["490", "830"].includes(f.getAttribute("tag"))).forEach(f => {
        const sub = c => ([...f.children].find(x => x.getAttribute("code") === c) || {}).textContent || "";
        if (key(sub("a")) !== want) return;
        const n = parseInt(String(sub("v")).replace(/^\D+/, ""), 10); if (n > 0 && n < 500) max = Math.max(max, n);
      });
      return max;
    };
    const asks = [];
    if (lang !== "German") asks.push(getText("https://libris.kb.se/xsearch?format=marcxml&n=200&query=" + encodeURIComponent('"' + name + '"')).then(read).catch(() => 0));
    if (lang !== "Swedish") asks.push(getText("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=100&query=" + encodeURIComponent('WOE="' + name + '"')).then(read).catch(() => 0));
    return Math.max(0, ...(await Promise.all(asks)));
  }
  root.Books = { seriesVolumes, normalize, hyphenless, lookupIsbn, search, parseMarc, fromLibris, langName, oneGenre, bindingOf };
})(typeof window !== "undefined" ? window : globalThis);
