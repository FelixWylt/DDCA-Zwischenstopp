// Dagobert Ducks Archiv – Add / edit form, Match with INDUCKS.
// One of several plain scripts sharing their names (see index.html for the order).
"use strict";
// ---- Add / edit ----
function defaultSeriesId() {
  return (S.lastSeries && seriesById(S.lastSeries) && S.lastSeries) || (seriesById("de-LTB") && "de-LTB") || (S.series[0] ? S.series[0].id : "_other");
}
function blankDraft(pre) {
  return Object.assign({ kind: "issue", author: "", publisher: "", isbn: "", format: "", lang: "", status: "owned", seriesId: defaultSeriesId(), seriesName: "", issue: "", title: "", date: "", pages: "",
    stories: [], grade: "", copies: 1, pricePaid: "", currency: "CHF", purchaseDate: "", source: "", value: "", location: "",
    read: false, forTrade: false, notes: "", coverUrl: "" }, pre || {});
}
VIEWS.add = {
  html() {
    if (!S.draft) {
      const c = S.editing && S.comics.find(x => x.id === S.editing);
      S.draft = c ? JSON.parse(JSON.stringify(c)) : blankDraft(); S.storyEdit = false; S.viewMode = !!c;
      if (!S.draft.stories) S.draft.stories = [];
    }
    const d = S.draft, editing = !!d.id, isBook = d.kind === "book";
    if (S.viewMode && editing) return detailHtml(d);
    const se = isBook ? null : seriesById(d.seriesId);
    const sopts = seriesOptions(d.seriesId, s => s.name + (s.country ? " (" + s.country + ")" : "")) + `<option value="_other"${!se ? " selected" : ""}>New series…</option>`;
    const hint = se && se.numbering === "year" ? "Year/number, e.g. 1985/12, double issue 1985/12-13" : "Number, e.g. 474";
    const catReady = catEntry(se);
    const icode = se && (se.code || (catEntry(se) || {}).code);
    const link = d.inducks ? "https://inducks.org/issue.php?c=" + encodeURIComponent(d.inducks).replace(/%20/g, "+")
      : se && d.issue ? inducksIssueUrl(se, d.issue) : (icode ? "https://inducks.org/publication.php?c=" + encodeURIComponent(icode) : "");
    const grades = '<option value="">Not graded</option>' + GRADES.map(([v, l]) => `<option value="${v}"${d.grade === v ? " selected" : ""}>${l}</option>`).join("");
    const curs = CURRENCIES.map(c => `<option${d.currency === c ? " selected" : ""}>${c}</option>`).join("");
    // one view per story with INDUCKS (title, code, writer, artist) and Duckipedia (German title, original, translator, characters, plot) together
    const storyEdit = S.storyEdit || !d.stories.length;
    const stories = !storyEdit ? d.stories.map(s => storyView(s)).join("") : d.stories.map((s, i) => `<div class="story" data-i="${i}">
        <label class="st-title"><span class="l">Story title</span><input data-sf="title" value="${esc(s.title)}"></label>
        <label><span class="l">Story code</span><input data-sf="code" class="mono" placeholder="I TL 1234-A" value="${esc(s.code)}"></label>
        <label><span class="l">Writer</span><input data-sf="writer" value="${esc(s.writer)}"></label>
        <label><span class="l">Artist</span><input data-sf="artist" value="${esc(s.artist)}"></label>
        <label><span class="l">Main character</span><input data-sf="hero" list="heroes" value="${esc(s.hero)}"></label>
        <button class="ghost danger" data-del="${i}" aria-label="Remove story" title="Remove story">✕</button></div>`).join("");
    return `
      <div class="row between"><div><h2>${editing ? (isBook ? "Edit book" : "Edit comic") : "Add to archive"}</h2>
      <p class="lede">${editing ? "Change any detail and save." : isBook ? "Type or scan the ISBN and tap “Fill from book databases”, or fill in what you know. Only the title is needed." : "Pick the series and issue, then fill in your copy's details. Fields left empty are fine."}</p></div>
      ${editing ? '<button id="cancel">Back</button>' : ""}</div>
      <div class="card stack">
        <div class="row between">
          <div class="seg" role="group" aria-label="Type"><button type="button" data-kind="issue" aria-pressed="${!isBook}">Comic issue</button><button type="button" data-kind="book" aria-pressed="${isBook && !isNovel(d)}">Comic book</button><button type="button" data-kind="novel" aria-pressed="${isNovel(d)}">Book</button></div>
          <div class="seg" role="group" aria-label="Status"><button type="button" data-st="owned" aria-pressed="${isOwn(d)}">I own it</button><button type="button" data-st="wanted" aria-pressed="${d.status === "wanted"}">Wishlist</button><button type="button" data-st="notowned" aria-pressed="${notOwned(d)}" title="Read but not owned: library books, free e-books. Counts only in the reading stats.">Read, not owned</button></div></div>
${dupHtml(d)}
${coverOf(d) ? `<div class="coverrow"><img class="cover" data-zoom="${esc(d.id || "")}" src="${esc(coverOf(d))}" alt="Cover, tap to enlarge" onerror="this.closest('.coverrow').hidden=true"></div>` : ""}
${isBook ? `
        <div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="ghost" id="readonline">Read online</button>
          ${isNovel(d) ? `<details class="pastebox"><summary class="small">${editing ? "Fill empty fields from the link or the page" : "Paste the link or the page (Royal Road, Fullreads …)"}</summary>
            <textarea id="f-paste" rows="4" placeholder="Paste the story's link (Share › Copy link), or the whole copied page"></textarea>
            <button type="button" id="pastego">Fill from the pasted text</button></details>` : ""}</div>
        ${isNovel(d) && S.webVols && d.seriesName === S.webVols.series && S.webVols.vols.length ? `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Books on the page:</span>${S.webVols.vols.map((v, i) => `<button type="button" class="fchip${d.title === v.title ? " on" : ""}" data-wvol="${i}">${esc(v.n + ": " + v.title)}</button>`).join("")}</div>` : ""}
        <div class="isbnrow">
          <label><span class="l">ISBN</span><input id="f-isbn" class="mono" inputmode="numeric" autocomplete="off" value="${esc(d.isbn)}" placeholder="13 or old 10 digits"></label>
          <button id="isbnfill" type="button">Fill from book databases</button>
          <button id="isbnscan" type="button" class="ghost" aria-label="Scan the barcode with the camera">Scan barcode</button>
          <button id="isbnsbn" type="button" class="ghost"${window.Books && Books.isItalian(d.isbn) ? "" : " hidden"} title="Opens the Italian national library catalogue in the browser">Look up in SBN</button>
        </div>
        <div id="isbnwarn">${isbnWarnHtml(d)}</div>
        <div id="bookmsg"></div>
        <div class="grid-form">
          <label class="wide"><span class="l">Title</span><input id="f-title" value="${esc(d.title)}" placeholder="${isNovel(d) ? "e.g. Der kleine Hobbit" : "e.g. Carl Barks: Die Ducks"}"></label>
          <label class="wide"><span class="l">${isNovel(d) ? "Author" : "Author or editor"}</span><input id="f-author" value="${esc(d.author)}" placeholder="${isNovel(d) ? "e.g. J. R. R. Tolkien" : "e.g. Carl Barks, Don Rosa"}"></label>
          <div class="wide row" style="gap:8px"><button class="ghost" id="booksearch" type="button">No ISBN? Search by title, author or series and volume</button></div>
          ${isNovel(d) ? `<label><span class="l">Original title</span><input id="f-originalTitle" value="${esc(d.originalTitle || "")}" placeholder="if translated"></label>
          <label><span class="l">Translator</span><input id="f-translator" value="${esc(d.translator || "")}"></label>
          ` : ""}
          <label class="wide"><span class="l">Genres</span><input id="f-genre" list="genres" value="${esc(d.genre || "")}" placeholder="e.g. Fantasy, Adventure (separate with commas)"></label>
          <label class="wide"><span class="l">Book series</span>${d.newBookSeries && !(d.seriesName && S.comics.some(x => x.id !== d.id && x.kind === "book" && x.seriesName === d.seriesName))
            ? `<input id="f-seriesName" value="${esc(d.seriesName)}" placeholder="${isNovel(d) ? "Name of the new series, e.g. Harry Potter" : "Name of the new series, e.g. Carl Barks Collection"}">`
            : `<span class="bseries"><button type="button" class="pickbtn wrap" id="f-bseries-btn"><span>${esc(d.seriesName || "No series (single book)")}</span><span class="chev" aria-hidden="true">▾</span></button>${d.seriesName ? '<button type="button" id="f-bseries-x">Single book</button>' : ""}</span><input type="hidden" id="f-seriesName" value="${esc(d.seriesName)}">`}</label>
          <label><span class="l">Volume</span><input id="f-issue" value="${esc(d.issue)}" placeholder="e.g. 12 or 0.5"></label>
          <label><span class="l">Publisher</span><input id="f-publisher" list="publishers" value="${esc(d.publisher)}" placeholder="${isNovel(d) ? "e.g. dtv" : "e.g. Egmont Comic Collection"}"></label>
          <label><span class="l">Year</span><input id="f-date" inputmode="numeric" value="${esc(d.date)}" placeholder="2005"></label>
          <label><span class="l">Format</span><select id="f-format">${["", "Hardcover", "Softcover", "Paperback", "Box set", "E-book", "Audiobook", "Web serial", "Short story", "Webcomic", "Other"].map(v => `<option value="${v}"${d.format === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Language</span><select id="f-lang">${[...new Set(["", "German", "Swedish", "Italian", "English", "French", "Norwegian", "Danish", "Dutch", "Spanish", "Other", d.lang || ""])].map(v => `<option value="${v}"${(d.lang || "") === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Pages</span><input id="f-pages" inputmode="numeric" value="${esc(d.pages)}"></label>
          ${isNovel(d) ? `<label><span class="l">Words</span><input id="f-words" inputmode="numeric" value="${esc(d.words || "")}" placeholder="pages = words ÷ 300"></label>` : ""}
          <label class="wide"><span class="l">Link</span><input id="f-link" type="url" value="${esc(d.link || "")}" placeholder="${isNovel(d) ? "where you read it, e.g. a Royal Road page" : "where you read it online (optional)"}"></label>
          <label><span class="l">Country</span><input id="f-country" list="countrylist" value="${esc(d.country || "")}" placeholder="${esc(isNovel(d) ? bookCountry(Object.assign({}, d, { country: "" })) || "where it first came out" : bookCountry(Object.assign({}, d, { country: "" })) || "of this edition")}"></label>
          <datalist id="countrylist">${[...new Set(Object.values(COUNTRY_NAMES).concat(S.comics.map(c => c.country).filter(Boolean)))].sort().map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
          <label class="wide"><span class="l">Cover image URL</span><input id="f-coverUrl" value="${esc(/^data:/.test(d.coverUrl || "") ? "" : d.coverUrl)}" placeholder="Filled in by the lookup, or paste a link"></label>
          ${coverPhotoHtml(d)}
        </div>
        <datalist id="genres">${[...new Set(["Novel", "Novella", "Short Stories", "Drama", "Poetry", "Fantasy", "Science Fiction", "Crime", "Thriller", "Horror", "Adventure", "Historical Fiction", "Romance", "Humour", "Children's", "Young Adult", "Non-fiction", "Biography", "History", "Mythology", "Fairy Tales", "Superheroes"].concat(S.comics.map(c => c.genre).filter(Boolean).flatMap(g => g.split(",").map(x => x.trim()))))].filter(Boolean).map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
        <datalist id="bookseries">${[...new Set(S.comics.filter(c => c.kind === "book" && isNovel(c) === isNovel(d) && c.seriesName).map(c => c.seriesName))].sort().map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
        <datalist id="publishers">${[...new Set(S.comics.filter(c => c.kind === "book" && isNovel(c) === isNovel(d)).map(c => c.publisher).concat(isNovel(d) ? [] : ["Egmont Ehapa", "Egmont Comic Collection", "Panini", "Giunti", "Mondadori", "Egmont Kärnan", "Fantagraphics"], S.comics.map(c => c.publisher)).filter(Boolean))].map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
` : `
        ${!editing && !d.issue ? (q => q ? `<div class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Next:</span>${q}</div>` : "")((S.recentSeries || []).map(seriesById).filter(s => s && s.numbering !== "year" && !isSingleSeries(s)).slice(0, 3).map(s => {
          const n = Math.max(0, ...S.comics.filter(c => c.seriesId === s.id && isOwn(c) && Number.isInteger(c.issueNum)).map(c => c.issueNum));
          return n ? `<button type="button" class="fchip" data-nextser="${esc(s.id)}" data-nextno="${n + 1}">${esc((s.short || s.name) + " " + (n + 1))}</button>` : "";
        }).join("")) : ""}
        <div class="lookup">
          <label><span class="l">Series</span><button type="button" class="pickbtn" id="f-series-btn"><span>${esc(se ? seriesLabel(se) : "New series…")}</span><span class="chev" aria-hidden="true">▾</span></button><select id="f-series" class="visually-hidden" tabindex="-1" aria-hidden="true">${sopts}</select></label>
          <label><span class="l">Issue</span><input id="f-issue" placeholder="${esc(hint)}" value="${esc(d.issue)}"></label>
          <button id="lookup" ${catReady ? "" : "disabled"}>Fill from INDUCKS</button>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="ghost" id="comicscan" type="button">Scan barcode or ISBN</button>${!editing ? '<button type="button" class="ghost" id="readonline">Read online</button>' : ""}</div>
        <div id="bookmsg"></div>
        ${S.catalogue ? `<label><span class="l">Find by title</span><input id="f-titleq" type="search" autocomplete="off" placeholder="words from the cover, e.g. destino paperone"></label><div id="titlehits" class="stack"></div>` : ""}
        ${!se ? `<label><span class="l">New series name</span><input id="f-seriesName" value="${esc(d.seriesName)}" placeholder="e.g. Donald Duck Extra"></label>` : ""}
        <p class="small muted" style="margin:0">${catReady ? "Fills in title, date and stories from INDUCKS." : S.catalogue ? "This series isn't in the INDUCKS catalogue." : "The INDUCKS catalogue isn't loaded yet, so auto-fill is off for now."}
          ${!isBook && window.Duckipedia && Duckipedia.candidates(dkSeries(se), { issueLabel: "1" }).length ? `<button class="ghost" id="dkfetch" type="button">${d.duckipedia ? "Refresh" : "Get"} details from Duckipedia</button>` : ""}
          <span id="ilink">${link ? ` <a href="${esc(link)}" target="_blank" rel="noopener">Open this ${d.issue ? "issue" : "series"} on INDUCKS</a>` : ""}</span></p>
        <div class="grid-form">
          <label class="wide"><span class="l">Issue title</span><input id="f-title" value="${esc(d.title)}" placeholder="e.g. Der Schatz des Goldenen Helms"></label>
          <label><span class="l">Publication date</span><input id="f-date" value="${esc(niceDate(d.date))}" placeholder="TT.MM.JJJJ or MM.JJJJ"></label>
          <label><span class="l">Pages</span><input id="f-pages" inputmode="numeric" value="${esc(d.pages)}"></label>
          <label><span class="l">Format</span><select id="f-format">${["", "Magazine", "Pocket book", "Softcover", "Hardcover", "Album", "Webcomic", "Other"].map(v => `<option value="${v}"${(d.format || "") === v ? " selected" : ""}>${v || "Not set"}</option>`).join("")}</select></label>
          <label><span class="l">Edition</span><input id="f-edition" list="f-edlist" value="${esc(d.edition || "")}" placeholder="${esc(defaultEditionOf(d.seriesId) ? "counts as " + defaultEditionOf(d.seriesId) : "e.g. 1. Auflage")}"><datalist id="f-edlist">${[...new Set(seriesEditions(d.seriesId).concat(["1. Auflage", "höhere Auflagen", "Neuauflage", "Sonderausgabe"]))].map(x => `<option>${esc(x)}</option>`).join("")}</datalist></label>
          <label class="wide"><span class="l">Genres</span><input id="f-genre" list="genres" value="${esc(d.genre || "")}" placeholder="${esc(storyGenres(d) ? "From the stories: " + storyGenres(d) : "e.g. Humour, Adventure (separate with commas)")}"></label>
          <label><span class="l">Publisher</span><input id="f-publisher" list="publishers" value="${esc(d.publisher)}" placeholder="e.g. Egmont Ehapa"></label>
          <label><span class="l">ISBN or barcode</span><input id="f-isbn" class="mono" inputmode="numeric" value="${esc(d.isbn || (d.barcode ? d.barcode + (d.barcodeExt ? " " + d.barcodeExt : "") : ""))}" placeholder="optional"></label>
          <div id="isbnwarn" class="wide">${isbnWarnHtml(d)}</div>
          <label class="wide"><span class="l">Cover image URL</span><input id="f-coverUrl" value="${esc(/^data:/.test(d.coverUrl || "") ? "" : d.coverUrl)}" placeholder="Link to a cover scan (optional)"></label>
          ${coverPhotoHtml(d)}
          ${d.link || notOwned(d) ? `<label class="wide"><span class="l">Link</span><input id="f-link" type="url" value="${esc(d.link || "")}" placeholder="where you read it online (optional)"></label>` : ""}
        </div>
        <datalist id="genres">${[...new Set(["Humour", "Adventure", "Crime", "Fantasy", "Science Fiction", "Horror", "Mythology", "Fairy Tales", "History", "Superheroes"].concat(S.comics.map(c => c.genre).filter(Boolean).flatMap(g => g.split(",").map(x => x.trim()))))].filter(Boolean).map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
        <datalist id="publishers">${[...new Set(S.comics.filter(c => c.seriesId === d.seriesId).map(c => c.publisher).concat(S.comics.map(c => c.publisher)).filter(Boolean))].slice(0, 40).map(n => `<option>${esc(n)}</option>`).join("")}</datalist>
`}
      </div>
      ${d.duckipedia ? duckipediaCard(d) : ""}
      <div class="card stack">
        <div class="row between"><h3>Stories${d.stories.length ? ` <span class="muted small">${d.stories.length}</span>` : ""}</h3><span class="row" style="gap:6px">${d.stories.length ? `<button id="editstories" class="ghost" type="button">${storyEdit ? "Done" : "Edit stories"}</button>` : ""}<button id="addstory">Add story</button></span></div>
        ${hadElsewhereHtml(d, false)}${d.stories.length ? '<div class="stories">' + stories + '</div>' : '<p class="muted small" style="margin:0">No stories listed yet. Add them so you can search by story, writer or artist later.</p>'}
        <datalist id="heroes"><option>Donald Duck</option><option>Micky Maus / Topolino</option><option>Dagobert / Zio Paperone / Joakim</option><option>Phantomias / Paperinik</option><option>Daniel Düsentrieb / Archimede</option><option>Goofy / Pippo / Långben</option><option>Gustav Gans / Gastone / Alexander Lukas</option><option>Die Panzerknacker / Bassotti / Björnligan</option><option>Tick, Trick und Track</option></datalist>
      </div>
      ${d.status === "wanted" ? `
      <div class="card stack"><h3>Wishlist notes</h3>
        <div class="seg" role="group" aria-label="How much you want it">${WISH_LEVELS.map(([k, l]) => `<button type="button" data-wl="${k}" aria-pressed="${wishLevel(d) === k}">${k === "must" ? "★ " : ""}${l}</button>`).join("")}</div>
        <div class="grid-form"><label><span class="l">Maximum price</span><input id="f-pricePaid" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.pricePaid))}"></label>
        <label><span class="l">Currency</span><select id="f-currency">${curs}</select></label>
        <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label></div></div>` : notOwned(d) ? `
      <div class="card stack"><div class="row between"><h3>Read, not owned</h3><span class="row" style="gap:10px">${heartHtml(d.fav, 'id="f-fav"')}${starsHtml(d.rating, 'id="f-rating"')}</span></div>
        <p class="small muted" style="margin:0">For things you read without owning them (library, free e-book, borrowed). They count in the reading stats, kept apart from your own, and never in your collection, value or gap grids.</p>
        <div class="grid-form">
          <label><span class="l">Read on <button type="button" class="ghost tiny" data-yearonly="f-readDate" title="When you only know the year">only the year</button></span><input id="f-readDate" inputmode="numeric" value="${esc(niceDate(d.readDate || ""))}" placeholder="TT.MM.JJJJ, MM.JJJJ or JJJJ"></label>
          <label><span class="l">Read from</span><input id="f-source" list="readfrom" value="${esc(d.source)}" placeholder="Library, e-book, borrowed…"><datalist id="readfrom"><option>Library</option><option>Free e-book</option><option>Borrowed</option><option>Online</option></datalist></label>
          <div class="row wide" style="gap:6px;flex-wrap:wrap">${["Library", "Free e-book", "Borrowed", "Online"].map(x => `<button type="button" class="fchip${d.source === x ? " on" : ""}" data-rsrc="${x}">${x}</button>`).join("")}</div>
          <div class="row wide" style="gap:10px;align-items:center"><span class="small muted">Cover</span>${starsHtml(d.coverRating, 'id="f-coverRating" aria-label="Cover rating"')}</div>
          <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label></div></div>` : `
      <div class="card stack"><div class="row between"><h3>Your copy</h3><span class="row" style="gap:10px">${heartHtml(d.fav, 'id="f-fav"')}${starsHtml(d.rating, 'id="f-rating"')}</span></div>
        <div class="row" style="gap:10px;align-items:center"><span class="small muted">Cover</span>${starsHtml(d.coverRating, 'id="f-coverRating" aria-label="Cover rating"')}</div>
        <div class="grid-form">
          <label><span class="l">Condition</span><select id="f-grade">${grades}</select></label>
          <label><span class="l">Identical copies</span><input id="f-copies" type="number" min="1" value="${esc(d.copies || 1)}"></label>
          <p class="small muted wide" style="margin:0">Only for copies that are the same in every way (condition, price, seller). A copy in another condition or from another seller: save it, then use <strong>Add another copy</strong> at the bottom.</p>
          <label><span class="l">Storage location</span><input id="f-location" value="${esc(d.location)}" placeholder="Box 3, shelf B"></label>
          <label class="check wide" style="min-height:0"><input id="f-inlot" type="checkbox"${d.lotId ? " checked" : ""}> Bought as a lot: several ${isBook ? "books or comics" : "comics"} for one price</label>
          ${d.lotId ? lotFields(d) + partsHtml(d.lotParts, true) : `<label><span class="l">Price paid</span><input id="f-pricePaid" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.pricePaid))}"></label>` + partsHtml(d.priceParts, false)}
          <label><span class="l">Currency</span><select id="f-currency">${curs}</select></label>
          <label class="wide"><span class="l">Checked value <span class="muted">(sold or collector price)</span></span><span class="row valrow" style="gap:6px;flex-wrap:nowrap"><input id="f-valueChecked" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.valueChecked))}"><select id="f-valueCur" aria-label="Currency of the checked value" style="width:auto">${CURRENCIES.map(x => `<option${(d.valueCur || d.currency || "CHF") === x ? " selected" : ""}>${x}</option>`).join("")}</select></span></label>
          <label><span class="l">Own estimate</span><input id="f-value" class="amt" inputmode="decimal" placeholder="0.00" value="${esc(amtVal(d.value))}"></label>
          <div class="wide small valueline">${(v => v ? `Value: <strong>${money(v.amount * (d.copies || 1), v.cur)}</strong> · ${v.how === "checked" ? "checked price" : v.how === "table" ? "from the price table (" + esc(rangeText(v.rule) || "all") + ": " + money(v.rule.price, v.rule.cur) + " × condition " + gradeFactor(d.grade) + (d.facsimile ? " × facsimile " + FACSIMILE_FACTOR : "") + ")" : "your own estimate"}` : "No value yet.")(valueOf(d))}
${d.kind === "book" ? `<br>Sold prices: ${soldLinks(d)}` : collectorLinks(d.seriesId, d) ? `<br>Collector prices: ${collectorLinks(d.seriesId, d)}` : ""}</div>
          <label><span class="l">Purchase date <button type="button" class="ghost tiny" id="today">today</button> <button type="button" class="ghost tiny" data-yearonly="f-purchaseDate" title="When you only know the year">only the year</button></span><input id="f-purchaseDate" inputmode="numeric" value="${esc(niceDate(d.purchaseDate))}" placeholder="TT.MM.JJJJ, MM.JJJJ or JJJJ"></label>
          <label><span class="l">Bought from</span><input id="f-source" list="sources" value="${esc(d.source)}" placeholder="Comic-Börse Zürich, Ricardo…"><datalist id="sources">${sourceList().map(n => `<option>${esc(n)}</option>`).join("")}</datalist></label>
          <label class="check"><input id="f-read" type="checkbox"${d.read ? " checked" : ""}> Read</label>
          ${d.read ? `<label><span class="l">Read on <button type="button" class="ghost tiny" data-yearonly="f-readDate" title="When you only know the year">only the year</button></span><input id="f-readDate" inputmode="numeric" value="${esc(niceDate(d.readDate || ""))}" placeholder="${d.readDate ? "TT.MM.JJJJ, MM.JJJJ or JJJJ" : "not recorded"}"></label>` : ""}
          <label class="check"><input id="f-forTrade" type="checkbox"${d.forTrade ? " checked" : ""}> Available for trade</label>
          ${isBook ? "" : `<label class="check wide"><input id="f-facsimile" type="checkbox"${d.facsimile ? " checked" : ""}> Facsimile or reprint (doesn't count as the original in the gap grid)</label>`}
          <label class="wide"><span class="l">Notes</span><textarea id="f-notes">${esc(d.notes)}</textarea></label>
          <label class="wide"><span class="l">Special about my copy</span><textarea id="f-special" rows="2" placeholder="Misprint, missing page, signed, first print…">${esc(d.special || "")}</textarea></label>
          <div class="wide stack" style="gap:6px"><span class="l">Extras that came with it</span>
            ${(d.extras || []).map((x, i) => `<div class="row extrarow" data-xi="${i}" style="gap:6px;flex-wrap:nowrap"><input data-xf="what" placeholder="Lithograph, signature, box …" value="${esc(x.what || "")}" style="flex:2;min-width:0"><input data-xf="value" class="amt" inputmode="decimal" placeholder="value" value="${esc(amtVal(x.value))}" style="flex:1;min-width:0"><select data-xf="cur">${CURRENCIES.map(k => `<option${(x.cur || "CHF") === k ? " selected" : ""}>${k}</option>`).join("")}</select><button type="button" class="ghost" data-xdel="${i}" aria-label="Remove">✕</button></div>`).join("")}
            <div class="row" style="gap:8px;align-items:center"><button type="button" class="ghost" id="xadd">Add an extra</button><span class="small muted">Each extra's value is added to the comic's value.</span></div>
          </div>
        </div></div>`}
      <div class="row">
        <button class="primary" id="save"${S.db ? "" : " disabled"}>${editing ? "Save changes" : "Save to archive"}</button>
        ${!editing ? '<button id="saveNext"' + (S.db ? "" : " disabled") + '>' + (isBook ? "Save and add next volume" : "Save and add next issue") + '</button>' : ""}
        ${!editing && !isBook ? '<button class="ghost" id="skipNext" type="button">Skip this number</button>' : ""}
        ${editing && isOwn(d) ? '<button id="secondCopy" type="button">Add another copy</button>' : ""}
        ${editing ? '<button class="danger" id="del">Delete</button>' : ""}
      </div>
      <div id="confirmBox"></div>`;
  },
  bind() {
    const d = S.draft;
    if (S.viewMode && d && d.id) return bindDetail(d);
    bindAmounts();
    // price split (da-v247): typing a part fills in the total
    const readParts = () => { const p = {}; document.querySelectorAll("[data-pp]").forEach(x => p[x.dataset.pp] = x.value); return p; };
    document.querySelectorAll("[data-pp]").forEach(el => el.addEventListener("input", () => { const dn = $("#ppdiscnote"); if (dn) dn.textContent = discNote(readParts()); const t = partsSum(readParts()), tot = $("#f-lotTotal") || $("#f-pricePaid"); if (tot && t != null) { tot.value = t.toFixed(2); tot.dispatchEvent(new Event("input")); } }));
    $("#today") && ($("#today").onclick = () => { $("#f-purchaseDate").value = niceDate(todayIso()); });
    // a rough date (da-v237): only the year counts as filled in (yearly numbers), not in the monthly charts
    document.querySelectorAll("[data-yearonly]").forEach(b => b.onclick = e => { e.preventDefault(); const inp = $("#" + b.dataset.yearonly); if (!inp) return;
      const y = /^\d{4}/.exec(isoDate(inp.value)); inp.value = y ? y[0] : ""; if (!y) { inp.placeholder = "Year, e.g. 2019"; inp.focus(); } });
    $("#f-fav") && ($("#f-fav").onclick = e => { d.fav = !d.fav; const b = e.currentTarget; b.classList.toggle("on", d.fav); b.textContent = d.fav ? "♥" : "♡"; b.setAttribute("aria-pressed", d.fav); });
    bindStars($("#app"), (v, box) => { if (box.id === "f-rating") d.rating = v; if (box.id === "f-coverRating") d.coverRating = v; });
    refreshDup(d);
    ["issue", "isbn", "title", "author", "seriesName"].forEach(k => { const el = $("#f-" + k); if (el) el.addEventListener("input", () => { d[k] = el.value; refreshDup(d); }); });
    // ticking "Read" notes today's date (it can be changed); unticking clears it
    $("#f-read") && ($("#f-read").onchange = e => { grab(); if (e.target.checked) { d.readDate = d.readDate || d.readDateWas || todayIso(); delete d.readDateWas; } else { if (d.readDate) d.readDateWas = d.readDate; d.readDate = ""; } renderKeep(); });
    $("#f-inlot") && ($("#f-inlot").onchange = e => {
      grab();
      if (e.target.checked) {
        // a lot is offered only if something in it was ADDED in the last day (a lot bought today), not just changed today (da-v246)
        const addedAt = l => l.members.reduce((a, c) => { const x = String(c.createdAt || ""); return x > a ? x : a; }, "");
        const last = allLots().filter(l => !l.members.some(c => c.id === d.id)).sort((a, b) => addedAt(b).localeCompare(addedAt(a)))[0];
        d.lotId = "new"; d.lotTotal = d.lotTotal || ""; d.lotParts = d.lotParts || d.priceParts || null;
        if (last && daysSince(addedAt(last)) < 1) { d.lotId = last.id; d.lotTotal = last.total; d.lotParts = last.parts; d.currency = last.currency; if (!d.source) d.source = last.source; if (!d.purchaseDate) d.purchaseDate = last.date; }   // its date and place, as when picked from the list
      }
      else { d.lotId = ""; d.lotTotal = ""; d.lotParts = null; }
      render(); $("#f-inlot") && $("#f-inlot").scrollIntoView({ block: "center" });
    });
    $("#f-lot") && ($("#f-lot").onchange = e => { grab(); d.lotId = e.target.value; const l = lotInfo(d.lotId); if (l) { d.lotTotal = l.total; d.lotParts = l.parts; d.currency = l.currency; if (!d.source) d.source = l.source; if (!d.purchaseDate) d.purchaseDate = l.date; } else d.lotTotal = ""; render(); });
    // update the "about x each" line while typing, without redrawing the form (a redraw would swallow the Save tap)
    $("#f-lotTotal") && ($("#f-lotTotal").oninput = e => { const t = parseAmt(e.target.value), w1 = d.kind === "book" ? "book" : "comic", w2 = w1 + "s", el = $("#lotper"), n = +(el && el.dataset.n) || 1; if (el) el.textContent = t === 0 ? `A free lot: ${n === 1 ? "this " + w1 + " gets" : "all " + n + " " + w2 + " get"} the price 0.00.` : typeof t === "number" && t > 0 ? `With this one: ${n} ${n === 1 ? w1 : w2}, about ${fmt2(t / n)} each. The app splits the price to the cent and adjusts it when more ${w2} join the lot.` : "Enter what you paid for all of them together (0 if they were free). Add the others with “Save and add next”, which keeps the lot."; });
    document.querySelectorAll(".lotinfo [data-open]").forEach(b => b.onclick = () => { S.editing = b.dataset.open; S.draft = null; render(); window.scrollTo(0, 0); });
    bindCoverPhoto(d);
    // ISBN / bootleg warning follows what you type
    const warnNow = () => { const w = $("#isbnwarn"); if (w) w.innerHTML = isbnWarnHtml(Object.assign({}, d, { isbn: ($("#f-isbn") || {}).value || "", publisher: $("#f-publisher") ? $("#f-publisher").value : d.publisher })); };
    ["f-isbn", "f-publisher"].forEach(k => { const el = $("#" + k); if (el) el.addEventListener("input", warnNow); });
    $("#isbnfill") && ($("#isbnfill").onclick = () => fillFromIsbn(d, grab));
    $("#comicscan") && ($("#comicscan").onclick = async () => {
      grab();
      try { const hit = await scanBarcode({ ext: true }); if (hit) await comicFromCode(d, hit.code, hit.ext); }
      catch (e) { bookMsg('<div class="banner warn">' + (e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "The camera isn't allowed for this app. Allow it in the browser's site settings, then try again." : "The camera couldn't start. Type the number instead.") + '</div>'); }
    });
    $("#booksearch") && ($("#booksearch").onclick = () => searchBooks(d, grab));
    document.querySelectorAll("[data-nextser]").forEach(b => b.onclick = () => { grab(); const s = seriesById(b.dataset.nextser); d.seriesId = s.id; d.seriesName = s.name; d.issue = b.dataset.nextno; render(); if (catEntry(s)) setTimeout(() => $("#lookup") && $("#lookup").click(), 50); });
    // "Look up in SBN" shows up while the ISBN is an Italian one (978-88 or 979-12)
    if ($("#isbnsbn")) { const sb = $("#isbnsbn"), inp = $("#f-isbn"); inp.addEventListener("input", () => { sb.hidden = !Books.isItalian(inp.value); }); sb.onclick = () => { const u = Books.sbnUrl(inp.value); if (u) window.open(u, "_blank", "noopener"); }; }
    $("#f-isbn") && ($("#f-isbn").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); if (d.kind === "book") fillFromIsbn(d, grab); else e.target.blur(); } });
    if (d.kind !== "book" && $("#f-isbn")) $("#f-isbn").onchange = async e => {
      const sc = splitCode(e.target.value); if (!sc) return;
      grab(); await comicFromCode(d, sc.isbn || sc.code, sc.ext || "");
    };
    $("#isbnscan") && ($("#isbnscan").onclick = async () => {
      grab();
      try {
        const hit = await scanBarcode(); if (!hit) return; const code = hit.code;
        if (!/^97[89]/.test(code)) { bookMsg('<div class="banner warn">That barcode (' + esc(code) + ') isn\'t an ISBN. Books have one starting with 978 or 979; try the other barcode, or type the ISBN.</div>'); return; }
        d.isbn = code; $("#f-isbn").value = code; fillFromIsbn(d, grab);
      } catch (e) {
        bookMsg('<div class="banner warn">' + (e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "The camera isn't allowed for this app. Allow it in the browser's site settings (the lock or ⓘ next to the address), then try again." : e && e.message === "nocamera" ? "This browser doesn't give web apps access to the camera. Type the ISBN instead." : "The camera couldn't start: " + esc(e && (e.message || e.name) || "unknown") + ". Type the ISBN instead.") + '</div>');
      }
    });
    const grab = () => {
      ["issue", "title", "date", "pages", "coverUrl", "grade", "copies", "location", "pricePaid", "currency", "value", "valueChecked", "valueCur", "purchaseDate", "source", "notes", "special", "edition", "seriesName", "author", "publisher", "isbn", "format", "lang", "genre", "translator", "originalTitle", "country", "lotTotal"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.value; });
      if (document.querySelector("[data-pp]")) { const p = {}; document.querySelectorAll("[data-pp]").forEach(x => p[x.dataset.pp] = x.value); if (d.lotId) d.lotParts = cleanParts(p); else d.priceParts = cleanParts(p); }
      if (!String(d.coverUrl || "").trim() && S.coverPhoto) d.coverUrl = S.coverPhoto;   // your own cover photo (not shown in the link box)
      const words0 = d.words;
      ["link", "words"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.value.trim(); });
      // pages from words (about 300 words per printed page): Pages follows Words until you type Pages yourself
      { const wn = v => parseInt(String(v || "").replace(/[^\d]/g, ""), 10), fromW = v => wn(v) > 0 ? String(Math.max(1, Math.round(wn(v) / 300))) : "";
        const w = wn(d.words), pg = String(d.pages || "").trim();
        if (pg && !d.pagesAuto && pg === fromW(words0)) d.pagesAuto = pg;   // pages worked out earlier, before the app remembered that
        if (pg && d.pagesAuto && pg !== d.pagesAuto) delete d.pagesAuto;     // typed by hand
        if (w > 0 && (!pg || d.pagesAuto)) { d.pages = fromW(d.words); d.pagesAuto = d.pages; } }
      // the suggestion list leaves "Fantasy, Adventure, " while typing: no empty genre at the end
      if (d.genre) d.genre = d.genre.split(",").map(x => x.trim()).filter(Boolean).join(", ");
      if (d.kind !== "book") d.date = isoDate(d.date);
      d.purchaseDate = isoDate(d.purchaseDate);
      const rd = $("#f-readDate"); if (rd) d.readDate = isoDate(rd.value);
      ["read", "forTrade", "facsimile"].forEach(k => { const el = $("#f-" + k); if (el) d[k] = el.checked; });
      document.querySelectorAll(".extrarow").forEach(row => { const x = (d.extras || [])[+row.dataset.xi]; if (!x) return; row.querySelectorAll("[data-xf]").forEach(inp => { x[inp.dataset.xf] = inp.dataset.xf === "value" ? parseAmt(inp.value) : inp.value.trim(); }); });
      if (d.extras) d.extras = d.extras.filter(x => x.what || typeof x.value === "number");
      if (d.status === "notowned") d.read = true;   // read without owning it: always read
      document.querySelectorAll(".story").forEach(row => { const s = d.stories[+row.dataset.i]; row.querySelectorAll("[data-sf]").forEach(inp => { if (inp.dataset.sf === "title" && inp.value.trim() && inp.value !== (s.title || "")) s.ownTitle = true; s[inp.dataset.sf] = inp.value; }); });
    };
    $("#cancel") && ($("#cancel").onclick = () => goBack());
    $("#xadd") && ($("#xadd").onclick = () => { grab(); d.extras = (d.extras || []).concat([{ what: "", value: "", cur: d.currency || "CHF" }]); render(); });
    document.querySelectorAll("[data-xdel]").forEach(b => b.onclick = () => { grab(); d.extras.splice(+b.dataset.xdel, 1); render(); });
    // read online: one tap for Read, not owned + Online + today + Web serial
    const readOnline = () => { d.status = "notowned"; d.read = true; d.readDate = d.readDate || todayIso(); d.source = d.source || "Online"; if (!d.format) d.format = isNovel(d) ? "Web serial" : "Webcomic"; };
    $("#readonline") && ($("#readonline").onclick = () => { grab(); readOnline(); render(); });
    $("#pastego") && ($("#pastego").onclick = () => {
      grab(); const p = parseWebPage($("#f-paste").value);
      if (!p.title) { bookMsg('<div class="banner warn">Nothing found in the pasted text. Paste the story\'s link, or copy the whole page starting with its title.</div>'); return; }
      if (p.vols.length > 1) { p.words = 0; }   // the page's words are the whole story's, not one book's
      if (d.id) {
        // editing a book: only empty fields are filled; title, series and status stay
        const got = [], fill = (k, v, name) => { if (v && !String(d[k] || "").trim()) { d[k] = String(v); got.push(name); } };
        fill("author", p.author, "author"); fill("link", p.link, "link"); fill("genre", p.genres.join(", "), "genres"); fill("format", p.format, "format");
        fill("words", p.words, "words"); if (!(p.vols.length > 1)) fill("pages", p.pages, "pages");
        if (p.words && !String(d.pages || "").trim()) { d.pages = String(Math.max(1, Math.round(p.words / 300))); d.pagesAuto = d.pages; got.push("pages"); }
        render(); bookMsg(`<div class="banner ok">${got.length ? "Filled in the empty fields: " + got.join(", ") + "." : "Nothing new: the fields the page knows are already filled."} Title, series and status stay as they are. Check, then save.</div>`); return;
      }
      readOnline(); if (p.format) d.format = p.format;
      if (p.author) d.author = p.author; if (p.genres.length && !d.genre) d.genre = p.genres.join(", "); if (p.link) d.link = p.link; if (p.words) d.words = String(p.words);
      if (p.vols.length) {
        const known = S.comics.some(c => c.kind === "book" && isNovel(c) && c.seriesName === p.title);
        S.webVols = { series: p.title, vols: p.vols }; d.seriesName = p.title; d.newBookSeries = !known; d.title = p.vols[0].title; d.issue = String(p.vols[0].n);
      } else { d.title = p.title; if (p.pages && !d.pages) d.pages = String(p.pages); }
      if (p.words && !d.pages) { d.pages = String(Math.max(1, Math.round(p.words / 300))); d.pagesAuto = d.pages; }
      render();
      bookMsg(`<div class="banner ok">Filled in: ${[d.title && "title", p.author && "author", p.genres.length && "genres", p.link && "link", d.pages && "pages", p.words && "words"].filter(Boolean).join(", ") || "title"}.${p.vols.length ? ` The page lists ${p.vols.length} ${p.vols.length === 1 ? "book" : "books"}: saved as the book series “${esc(p.title)}”, book ${esc(String(p.vols[0].n))}. Type its pages yourself${p.pages ? ` (the page counts ${Number(p.pages).toLocaleString("de-CH")} pages for the whole story)` : ""}, then use Save &amp; next and tap the next book above.` : ""}${p.ongoing ? " Still running on the site." : ""} Check the fields, then save.</div>`);
    });
    document.querySelectorAll("[data-rsrc]").forEach(b => b.onclick = () => { const el = $("#f-source"); if (el) el.value = b.dataset.rsrc; document.querySelectorAll("[data-rsrc]").forEach(x => x.classList.toggle("on", x === b)); });
    document.querySelectorAll("[data-wvol]").forEach(b => b.onclick = () => { grab(); const v = S.webVols.vols[+b.dataset.wvol]; d.title = v.title; d.issue = String(v.n); render(); });
    document.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { grab(); d.status = b.dataset.st; if (d.status === "notowned") { d.read = true; d.readDate = d.readDate || todayIso(); } render(); });
    document.querySelectorAll("[data-wl]").forEach(b => b.onclick = () => { d.wishLevel = b.dataset.wl; document.querySelectorAll("[data-wl]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    document.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => {
      grab();
      const k = b.dataset.kind, kind = k === "issue" ? "issue" : "book", bt = k === "novel" ? "book" : "";
      if (d.kind === kind && (d.bookType || "") === bt) return;
      d.bookType = bt; if (d.kind === kind) { render(); return; }
      d.kind = kind;
      if (d.kind === "book") { d.seriesId = "_book"; if (seriesById(d.seriesName) || S.series.some(x => x.name === d.seriesName)) d.seriesName = ""; }
      else if (!seriesById(d.seriesId)) { d.seriesId = defaultSeriesId(); d.seriesName = ""; }
      render();
    });
    // Find by title: a hit sets series and number, then fills from INDUCKS
    if ($("#f-titleq")) {
      let tq; const box = $("#titlehits");
      $("#f-titleq").addEventListener("input", e => { clearTimeout(tq); const q = e.target.value; tq = setTimeout(async () => {
        await loadTitles(); const hits = findByTitle(q);
        box.innerHTML = norm(q).length < 3 ? "" : hits.length ? hits.map((h, i) => `<button type="button" class="ghost titlehit" data-th="${i}" style="text-align:left">${esc(h.t)}<br><span class="small muted">${esc((h.mine ? h.mine.short || h.mine.name : h.entry.series + " (new series)") + " " + h.issue + (h.d ? " · " + h.d.slice(0, 7) : "") + (h.pr ? " · " + h.pr : ""))}</span></button>`).join("") : '<p class="small muted" style="margin:0">No title in your INDUCKS catalogue has all these words. Try fewer words, or add the series under Series first.</p>';
        box.querySelectorAll("[data-th]").forEach(b => b.onclick = async () => { const h = hits[+b.dataset.th]; grab();
          if (h.mine) { d.seriesId = h.mine.id; d.seriesName = h.mine.name; } else { d.seriesId = ""; d.seriesName = h.entry.series; }
          d.issue = h.issue; render();
          // not one of your series yet: made and linked to INDUCKS, as when you type a new series name
          const nm = $("#f-seriesName"); if (!h.mine && nm && nm.onchange) { nm.value = h.entry.series; await nm.onchange({ target: nm }); }
          setTimeout(() => $("#lookup") && !$("#lookup").disabled && $("#lookup").click(), 50); });
      }, 250); });
    }
    $("#f-series") && ($("#f-series").onchange = e => { grab(); d.seriesId = e.target.value; rememberSeries(d.seriesId); render(); });
    // book series: the same searchable picker; choosing a comic series turns the entry into a comic issue of it
    $("#f-bseries-btn") && ($("#f-bseries-btn").onclick = async () => {
      const k = await pickSeries({ current: d.seriesName ? "book:" + d.seriesName : "", books: true, allowNew: true, title: "Series for this book" });
      if (!k) return;
      grab();
      if (k === "_other") { d.newBookSeries = true; d.seriesName = ""; render(); setTimeout(() => $("#f-seriesName") && $("#f-seriesName").focus(), 50); return; }
      if (k.startsWith("book:")) { d.seriesName = k.slice(5); d.newBookSeries = false; render(); return; }
      const se = seriesById(k); if (!se) return;
      d.kind = "issue"; d.seriesId = se.id; d.seriesName = se.name; d.newBookSeries = false;
      render(); toast(se.name + " is a comic series: this is now a comic issue in it. Enter the issue number, then Fill from INDUCKS.");
    });
    // a single book has no series, so no volume number either
    $("#f-bseries-x") && ($("#f-bseries-x").onclick = () => { grab(); d.seriesName = ""; d.issue = ""; render(); });
    // "New series name": the series is made as soon as the name is typed (on leaving the field), so Fill from INDUCKS works right away
    if (d.kind !== "book" && !seriesById(d.seriesId) && $("#f-seriesName")) $("#f-seriesName").onchange = async e => {
      const name = e.target.value.trim(); if (!name) return;
      grab();
      let se = findSeriesByName(name), made = false;
      if (!se) {
        // a series made here a moment ago with another name (a typo) goes again; the new one is saved only with the comic
        S.series = S.series.filter(x => !(x.pending && x.id === d.seriesId));
        se = newSeriesFor(name, []); made = true; se.pending = true;
        const entry = catEntry(se), file = entry && await catalogueFile(entry).catch(() => null);
        if (file) seriesFromCatalogue(se, file, entry);
      }
      d.seriesId = se.id; d.seriesName = se.name; rememberSeries(se.id); render();
      bookMsg(`<div class="banner ok">${made ? "New series “" + esc(se.name) + "” created" : "“" + esc(se.name) + "” is already one of your series: picked it"}${catEntry(se) ? ", linked to INDUCKS " + esc(catEntry(se).code) + ". Type the issue number and tap Fill from INDUCKS." : ". It isn't in the INDUCKS catalogue under this name: add its INDUCKS code under More › Series if it has one."}</div>`);
    };
    $("#f-series-btn") && ($("#f-series-btn").onclick = async () => { const k = await pickSeries({ current: d.seriesId, allowNew: true, title: "Series" }); if (k) { grab(); d.seriesId = k; render(); } });
    $("#f-issue").oninput = e => {
      d.issue = e.target.value;
      const se = seriesById(d.seriesId), l = $("#ilink");
      const ic = se && (se.code || (catEntry(se) || {}).code);
      if (se && l) l.innerHTML = ic ? ` <a href="${esc(d.issue ? inducksIssueUrl(se, d.issue) : "https://inducks.org/publication.php?c=" + encodeURIComponent(ic))}" target="_blank" rel="noopener">Open this ${d.issue ? "issue" : "series"} on INDUCKS</a>` : "";
    };
    $("#editstories") && ($("#editstories").onclick = () => { grab(); S.storyEdit = !(S.storyEdit || !d.stories.length); renderKeep(); });
    $("#addstory").onclick = () => { grab(); S.storyEdit = true; d.stories.push({ title: "", code: "", writer: "", artist: "", hero: "" }); render(); const rows = document.querySelectorAll(".story input"); rows.length && rows[rows.length - 5].focus(); };
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { grab(); d.stories.splice(+b.dataset.del, 1); render(); });
    $("#dkfetch") && ($("#dkfetch").onclick = async () => {
      grab(); const btn = $("#dkfetch");
      const se0 = seriesById(d.seriesId), probe = Object.assign({}, d, { issueLabel: d.id && d.issueLabel && String(d.issue).trim() === String((S.comics.find(x => x.id === d.id) || {}).issue || "").trim() ? d.issueLabel : parseIssue(se0, d.issue).label });
      if (!Duckipedia.candidates(dkSeries(se0), probe).length) { toast("Enter the issue number first"); $("#f-issue").focus(); return; }
      btn.disabled = true; btn.textContent = "Asking Duckipedia…";
      try {
        const res = await Duckipedia.fetchIssue(dkSeries(se0), probe);
        if (!res) { toast("Duckipedia has no page for this issue"); btn.disabled = false; btn.textContent = "Get details from Duckipedia"; return; }
        S.draft = Duckipedia.merge(d, res); if (!String(S.draft.genre || "").trim() && storyGenres(S.draft)) S.draft.genre = storyGenres(S.draft); render();
        toast("Duckipedia details added (" + res.stories.length + " stories). Tap Save to keep them.");
      } catch (e) { toast(navigator.onLine ? "Duckipedia didn't answer. Try again later." : "Duckipedia needs an internet connection."); btn.disabled = false; btn.textContent = "Get details from Duckipedia"; }
    });
    // after Fill from INDUCKS: publisher, format and genres, which the INDUCKS issue data doesn't have.
    // Publisher and format come from your other comics in this series (most used), else from the INDUCKS directory;
    // genres from the stories (Duckipedia's story genres). Fields you've already filled stay as they are.
    const fillExtras = async se => {
      if (!S.inducksDir && se.code) { try { const r = await fetch("catalogue/directory.json"); if (r.ok) S.inducksDir = (await r.json()).publications || []; } catch (e) {} }
      const mine = S.comics.filter(c => c.id !== d.id && c.seriesId === se.id && c.kind !== "book");
      const most = k => { const n = {}; mine.forEach(c => { const v = String(c[k] || "").trim(); if (v) n[v] = (n[v] || 0) + 1; }); return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || ""; };
      const dir = se.code && S.inducksDir ? S.inducksDir.find(x => x[0] === se.code) : null;
      if (!String(d.publisher || "").trim()) d.publisher = most("publisher") || (dir && dir[5]) || se.pubHouse || PUBLISHER_FALLBACK[se.code] || "";
      if (!d.format) d.format = most("format") || (/pocket|taschenbuch/i.test(se.name + " " + (dir ? dir[6] : "") + " " + (se.group || "")) ? "Pocket book" : "");
      if (!String(d.genre || "").trim() && storyGenres(d)) d.genre = storyGenres(d);
    };
    $("#lookup") && ($("#lookup").onclick = async () => {
      grab(); const se = seriesById(d.seriesId); if (!se) return;
      const hit = await catalogueLookup(se, d.issue);
      if (!hit) {
        // the number exists only as variants (LTB 546A and 546B): offer them
        const entry = catEntry(se), file = entry && await catalogueFile(entry), p = parseIssue(se, d.issue);
        const vars = file ? Object.keys(file.issues || {}).filter(k => variantOf(k) && sameSlot(k, p.label)) : [];
        if (vars.length) {
          $("#confirmBox").innerHTML = `<div class="confirm"><span>${esc(se.short || se.name)} ${esc(p.label)} came out in ${vars.length} variants. Which one is it?</span>${vars.map(k => `<button data-var="${esc(k)}">${esc(k)}${file.issues[k].t ? " · " + esc(String(file.issues[k].t).slice(0, 40)) : ""}</button>`).join("")}<button class="ghost" id="varNo">Cancel</button></div>`;
          $("#varNo").onclick = () => { $("#confirmBox").innerHTML = ""; };
          document.querySelectorAll("[data-var]").forEach(b => b.onclick = () => { $("#confirmBox").innerHTML = ""; d.issue = b.dataset.var; $("#f-issue").value = d.issue; $("#lookup").click(); });
          $("#confirmBox").scrollIntoView({ block: "center" });
          return;
        }
        toast("INDUCKS has no " + (se.short || se.name) + " " + (d.issue || "") + ". Check the number."); return;
      }
      if (hit.ic) {   // compact catalogue format
        const cf = d.title && catEntry(se) ? await catalogueFile(catEntry(se)).catch(() => null) : null;   // a title typed earlier that is only some issue's catalogue title gets replaced
        const fromCat = !!(cf && Object.values(cf.issues || {}).some(x => x.t && norm(x.t) === norm(d.title)));
        d.title = (!d.title || fromCat ? hit.t : d.title) || d.title || ""; d.date = hit.d || d.date; d.pages = hit.pg || d.pages; if (hit.cv && fromSources(d.coverUrl)) d.coverUrl = inducksImg(hit.cv);   // the cover of the issue now chosen (29 → 29B); one you pasted yourself is kept
        d.stories = keepOwnTitles(d.stories, (hit.s || []).map(x => ({ title: x.t || "", code: x.c || "", writer: x.w || "", artist: x.a || "", hero: x.h || "", pages: x.p || "" })));
        d.inducks = hit.ic; await fillExtras(se); render(); const hadX = storiesHadElsewhere(d), had = hadX.filter(m => m.comics.some(c => isOwn(c))).length, hadR = hadX.length - had; toast("Filled from INDUCKS: " + d.stories.length + (d.stories.length === 1 ? " story" : " stories") + (had ? " · you already have " + had + " of them in other comics" : "") + (hadR ? " · you've read " + hadR + " without owning " + (hadR === 1 ? "it" : "them") : "")); return;
      }
      d.title = d.title || hit.title || ""; d.date = hit.date || d.date; d.pages = hit.pages || d.pages; d.coverUrl = d.coverUrl || hit.cover || "";
      d.stories = (hit.stories || []).map(s => ({ title: s.title || "", code: s.code || "", writer: s.writer || "", artist: s.artist || "", hero: s.hero || "" }));
      d.inducks = hit.issuecode || ""; await fillExtras(se); render(); toast("Filled from INDUCKS");
    });
    const doSave = async (next) => {
      grab();
      if (d.kind === "book") return saveBook(next);
      // the ISBN-or-barcode field: an ISBN, or a magazine barcode with its add-on
      { const raw = String(d.isbn || "").trim(), digits = raw.replace(/[^0-9X ]/gi, "").trim();
        if (!raw) { d.isbn = ""; }
        else { const sc = splitCode(raw);
          if (sc && sc.isbn) { d.isbn = sc.isbn; d.barcode = ""; d.barcodeExt = ""; }
          else if (sc) { d.barcode = sc.code; d.barcodeExt = sc.ext || d.barcodeExt || ""; d.isbn = ""; } } }
      const se = seriesById(d.seriesId);
      d.issue = String(d.issue || ""); d.seriesName = String(d.seriesName || "");
      if (!d.issue.trim() && se && se.numbering === "year" && !(d.id && !String((S.comics.find(x => x.id === d.id) || {}).issue || "").trim())) { toast("Enter an issue number first"); $("#f-issue").focus(); return; }
      if (!se && !d.seriesName.trim()) { toast("Enter the series name"); return; }
      const orig = d.id && S.comics.find(x => x.id === d.id);
      const unchanged = orig && orig.seriesId === d.seriesId && String(orig.issue || "").trim() === d.issue.trim() && orig.issueLabel != null;
      const p = unchanged ? { label: orig.issueLabel, sort: orig.issueSort, year: orig.issueYear, n: orig.issueNum } : parseIssue(se, d.issue);
      const yearOnly = !unchanged && /^\s*(\d{4})\s*\/\s*\?\s*$/.exec(d.issue);
      if (yearOnly) { p.year = +yearOnly[1]; p.label = yearOnly[1] + "/?"; p.n = null; p.sort = p.year * 1000 + (d.date && d.date.length >= 7 ? (+d.date.slice(5, 7) - 1) * 4.3 : 0); }
      if (!unchanged && se && se.numbering === "year" && !p.year && d.issue.trim()) { toast("For " + (se.short || se.name) + " enter year and number, e.g. 1985/12, or 1985/? if you don't know the number"); $("#f-issue").focus(); return; }
      let target = se;
      if (!target) { target = findSeriesByName(d.seriesName.trim()) || newSeriesFor(d.seriesName.trim(), []); try { await saveSeries(); } catch (e) { toast(errText(e)); return; } }
      if (target.pending) { delete target.pending; try { await saveSeries(); } catch (e) { target.pending = true; toast(errText(e)); return; } }
      const c = Object.assign({}, d, {
        seriesId: target.id, seriesName: target.name, issueLabel: p.label, issueSort: p.sort,
        issueYear: p.year || null, issueNum: p.n, copies: Math.max(1, parseInt(d.copies, 10) || 1),
        pricePaid: parseAmt(d.pricePaid),
        value: parseAmt(d.value), valueChecked: parseAmt(d.valueChecked),
        stories: d.stories.filter(s => s.title || s.code || s.writer || s.artist || s.hero)
      });
      let moved = false, alsoGone = [], fromReadGone = null;
      // Edit › "I own it" on a wish made with "Want to own it"
      if (orig && orig.status === "wanted" && isOwn(c) && orig.fromRead) fromReadGone = takeFromRead(c, orig);
      if ((!d.id || !unchanged) && !c.facsimile && p.label && !/\?/.test(p.label)) {   // new, or edited with another series or number
        // same number, or overlapping squares (a double issue 2016-11-12 against 2016/11 or 2016/12)
        // a letter is usually a variant cover (546A = 546), but INDUCKS also uses it for other items under one number:
        // De Luxe 34B is a box, not Timecrime 34. Different titles in the catalogue = different comics
        const ce = catEntry(target), cf = ce && (S.catCache[ce.file] || await catalogueFile(ce).catch(() => null)), ttl = k => cf && cf.issues && cf.issues[k] ? norm(cf.issues[k].t || "") : "";
        const otherItem = (a, b) => a !== b && ttl(a) && ttl(b) && ttl(a) !== ttl(b);
        const same = S.comics.filter(x => x.id !== d.id && x.kind !== "book" && !x.facsimile && x.seriesId === target.id && sameSlot(x.issueLabel || x.issue, p.label) && !otherItem(x.issueLabel || x.issue, p.label));
        const wishes = same.filter(x => x.status === "wanted"), wish = wishes.find(x => (x.issueLabel || x.issue) === p.label) || wishes[0];
        const have = same.find(x => isOwn(x) && (x.issueLabel || x.issue) === p.label) || same.find(x => isOwn(x));
        const haveLab = have && (have.issueLabel || have.issue), exact = haveLab === p.label;
        const tag = (target.short || target.name) + " " + p.label;
        if (!d.id && isOwn(c) && wish && !have) {
          // bought something from the wishlist: that entry becomes owned instead of a second one
          const sameNo = (wish.issueLabel || wish.issue) === p.label;
          ["title", "date", "pages", "inducks", "duckipedia", "coverUrl"].forEach(k => { if (!c[k] && wish[k] && sameNo) c[k] = wish[k]; });
          if (!String(c.notes || "").trim() && wish.notes) c.notes = wish.notes;   // the wish's notes stay
          fromReadGone = takeFromRead(c, wish);
          if (!c.stories.length && (wish.stories || []).length && sameNo) c.stories = wish.stories;
          c.id = wish.id; c.createdAt = wish.createdAt; c.wasWish = true; moved = true;
          alsoGone = wishes.filter(x => x !== wish).map(x => x.id);   // a double issue also clears the other number's wish
        } else if (!S.dupOk && !notOwned(c) && !(S.draft && S.draft.secondCopy) && (have || (wish && c.status === "wanted"))) {
          const box = $("#confirmBox");
          box.innerHTML = have
            ? `<div class="confirm"><span>${exact ? esc(tag) + " is already in your collection" + (c.status === "wanted" ? "" : " (" + (have.copies || 1) + (have.copies > 1 ? " copies" : " copy") + ")") : esc(tag) + " overlaps with " + esc((target.short || target.name) + " " + haveLab) + ", which is already in your collection"}.</span>
                ${c.status === "wanted" ? `<button class="primary" id="dupWant">Add to wishlist anyway</button>` : exact && !d.id ? `<button class="primary" id="dupCopy">One more identical copy</button><button id="dupSep">Separate copy (own condition, price, seller)</button>` : `<button class="primary" id="dupSep">Save anyway</button>`}
                ${next ? `<button id="dupSkip">Skip to next number</button>` : ""}<button class="ghost" id="dupNo">Cancel</button></div>`
            : `<div class="confirm"><span>${esc(tag)} is already on your wishlist.</span>${d.id ? `<button class="primary" id="dupSep">Save anyway</button>` : ""}${next ? `<button class="primary" id="dupSkip">Skip to next number</button>` : ""}<button class="ghost" id="dupNo">Cancel</button></div>`;
          box.scrollIntoView({ block: "center" });
          $("#dupNo").onclick = () => { box.innerHTML = ""; };
          $("#dupSkip") && ($("#dupSkip").onclick = () => { box.innerHTML = ""; skipToNext(); });
          $("#dupWant") && ($("#dupWant").onclick = () => { box.innerHTML = ""; S.dupOk = true; doSave(next).finally(() => { S.dupOk = false; }); });
          $("#dupSep") && ($("#dupSep").onclick = () => { box.innerHTML = ""; S.dupOk = true; doSave(next).finally(() => { S.dupOk = false; }); });
          $("#dupCopy") && ($("#dupCopy").onclick = async () => {
            box.innerHTML = "";
            try { await saveComic(Object.assign({}, have, { copies: (have.copies || 1) + 1 })); toast(tag + ": now " + ((have.copies || 1) + 1) + " copies"); next ? skipToNext() : goBack(); }
            catch (e) { toast(errText(e)); }
          });
          return;
        }
      }
      const btns = document.querySelectorAll("#save, #saveNext, #skipNext"); btns.forEach(b => b.disabled = true);
      try {
        const before = d.id ? S.comics.find(x => x.id === d.id) : null;
        if (!prepareLot(d, c, before)) { btns.forEach(b => b.disabled = false); return; }
        const saved = await saveComic(c);
        const lotNote = await afterLotSave(saved, before);
        for (const id of alsoGone) await deleteComic(id);
        if (fromReadGone && fromReadGone.id !== saved.id) await deleteComic(fromReadGone.id);
        if (saved.barcode && saved.seriesId) {
          S.barcodes = Object.assign({}, S.barcodes, { [saved.barcode]: saved.seriesId }); setConfig("barcodes", S.barcodes).catch(() => {});
          if (saved.issueYear) { S.barcodeYears = Object.assign({}, S.barcodeYears, { [saved.barcode]: saved.issueYear }); setConfig("barcodeYears", S.barcodeYears).catch(() => {}); }
        }
        rememberSeries(saved.seriesId);
        if (S.lastSeries !== saved.seriesId) { S.lastSeries = saved.seriesId; setConfig("lastSeries", saved.seriesId).catch(() => {}); }
        const what = (target.short || target.name) + " " + (p.label || "");
        toast("✓ " + (moved ? what + " moved from your wishlist to your collection" : S.editing ? "Changes saved: " + what : c.status === "wanted" ? what + " added to your wishlist" : notOwned(c) ? what + " saved as read (not owned)" : what + " saved to your archive") + lotNote);
        if (next) {
          S.lastSaved = (target.short || target.name) + " " + p.label;
          goNext(c, p, se);
        } else goBack(() => { S.col = { p: publisherOf(saved), g: groupOf(saved), s: seriesKeyOf(saved) }; S.filters.q = ""; S.filters.status = saved.status === "wanted" ? "wanted" : notOwned(saved) ? "notowned" : "owned"; nav("collection"); });
      } catch (e) { toast(errText(e)); btns.forEach(b => b.disabled = false); }
    };
    // the next number in a run, keeping series, status, place and date of purchase
    const goNext = (c, p, se) => {
      const per = se ? (perYearOf(se, p.year) || 52) : 52;
      const dbl = /^(\d{4})-\d{1,3}-(\d{1,3})$/.exec(p.label || "");
      if (dbl) p = Object.assign({}, p, { n: +dbl[2] });   // after 2016-11-12 comes 2016/13
      const nextIssue = se && se.numbering === "year" && p.year ? (p.n >= per ? (p.year + 1) + "/01" : p.year + "/" + String(p.n + 1).padStart(2, "0")) : (p.n != null ? String(p.n + 1) : "");
      S.editing = null;
      S.draft = blankDraft({ seriesId: c.seriesId, seriesName: c.seriesName, status: c.status, issue: nextIssue, read: notOwned(c) || undefined, readDate: notOwned(c) ? todayIso() : undefined, currency: c.currency, source: c.source, purchaseDate: c.purchaseDate, location: c.location, lotId: c.lotId || "", lotTotal: c.lotId ? c.lotTotal : "", lotParts: c.lotId ? c.lotParts || null : null, pricePaid: c.lotId ? "" : c.pricePaid, priceParts: c.lotId ? null : c.priceParts || null });
      render(); $("#f-issue") && $("#f-issue").focus();
    };
    // skip a number you don't have: move on without saving anything
    const skipToNext = () => {
      grab(); const se0 = seriesById(d.seriesId);
      const p0 = parseIssue(se0, d.issue);
      if (p0.n == null) { toast("Enter an issue number first"); return; }
      const skipped = (se0 ? se0.short || se0.name : "") + " " + p0.label;
      goNext(Object.assign({}, d, { seriesId: d.seriesId, seriesName: d.seriesName }), p0, se0);
      toast(skipped + " skipped, nothing saved");
    };
    $("#skipNext") && ($("#skipNext").onclick = skipToNext);
    const saveBook = async (next) => {
      ["title", "issue", "seriesName", "isbn"].forEach(k => d[k] = String(d[k] || ""));
      if (!d.title.trim()) { toast("Enter the book title first"); $("#f-title").focus(); return; }
      const vol = d.issue.trim().replace(/^(\d+),(\d+)$/, "$1.$2"), vm = vol.match(/\d+(\.\d+)?/);
      const c = Object.assign({}, d, {
        kind: "book", seriesId: "_book", seriesName: d.seriesName.trim(), title: d.title.trim(), issue: vol, issueLabel: vol,
        issueSort: vm ? +vm[0] : 1e9, issueYear: null, issueNum: vm ? +vm[0] : null, copies: Math.max(1, parseInt(d.copies, 10) || 1),
        isbn: d.isbn.trim(), pricePaid: parseAmt(d.pricePaid), value: parseAmt(d.value), valueChecked: parseAmt(d.valueChecked),
        stories: d.stories.filter(s => s.title || s.code || s.writer || s.artist || s.hero)
      });
      delete c.newBookSeries;   // only for the form
      // bought a book from the wishlist: that entry becomes owned instead of a second one (a wish made with "Want to own it"
      // also takes the read-only entry's read date, ratings and link, then that entry goes)
      let moved = false, rd = null;
      if (!d.id && isOwn(c)) {
        const w = findDup(c);
        if (w && w.status === "wanted") {
          ["title", "author", "publisher", "isbn", "coverUrl", "pages", "lang", "genre", "translator", "link", "words"].forEach(k => { if (!String(c[k] || "").trim() && w[k]) c[k] = w[k]; });
          if (!String(c.notes || "").trim() && w.notes) c.notes = w.notes;
          rd = takeFromRead(c, w);
          c.id = w.id; c.createdAt = w.createdAt; c.wasWish = true; c.wishLevel = ""; moved = true;
        }
      }
      { const o = d.id && S.comics.find(x => x.id === d.id); if (o && o.status === "wanted" && isOwn(c) && o.fromRead) rd = takeFromRead(c, o); }
      const btns = document.querySelectorAll("#save, #saveNext"); btns.forEach(b => b.disabled = true);
      try {
        const before = d.id ? S.comics.find(x => x.id === d.id) : null;
        if (!prepareLot(d, c, before)) { btns.forEach(b => b.disabled = false); return; }
        const saved = await saveComic(c);
        if (rd && rd.id !== saved.id) await deleteComic(rd.id);
        const lotNote = await afterLotSave(saved, before);
        toast("✓ " + (moved ? "Moved from your wishlist to your collection: " : S.editing ? "Changes saved: " : c.status === "wanted" ? "Added to your wishlist: " : notOwned(c) ? "Saved as read (not owned): " : "Saved to your archive: ") + (c.title || "book") + lotNote);
        if (next) {
          S.editing = null;
          S.draft = blankDraft({ kind: "book", bookType: c.bookType || "", seriesId: "_book", seriesName: c.seriesName, issue: vm ? String(Math.floor(+vm[0]) + 1) : "", author: c.author, publisher: c.publisher, format: c.format, lang: c.lang, status: c.status, currency: c.currency, source: c.source, purchaseDate: c.purchaseDate, link: c.link || "", genre: c.genre || "", read: notOwned(c) || undefined, readDate: notOwned(c) ? todayIso() : undefined, location: c.location, lotId: c.lotId || "", lotTotal: c.lotId ? c.lotTotal : "", lotParts: c.lotId ? c.lotParts || null : null, pricePaid: c.lotId ? "" : c.pricePaid, priceParts: c.lotId ? null : c.priceParts || null });
          render(); $("#f-title") && $("#f-title").focus();
        } else goBack(() => { S.col = isNovel(saved) ? (saved.seriesName ? { p: NOVEL_PUB, g: BOOK_GROUP, s: seriesKeyOf(saved) } : {}) : { p: publisherOf(saved), g: BOOK_GROUP, s: seriesKeyOf(saved) }; if (isNovel(saved)) S.colTab = "books"; S.filters.q = ""; S.filters.status = saved.status === "wanted" ? "wanted" : notOwned(saved) ? "notowned" : "owned"; nav("collection"); });
      } catch (e) { toast(errText(e)); btns.forEach(b => b.disabled = false); }
    };
    $("#save").onclick = () => doSave(false);
    $("#saveNext") && ($("#saveNext").onclick = () => doSave(true));
    // a second copy of the same issue, with its own condition, price, seller and notes (not "one more copy" of the same)
    $("#secondCopy") && ($("#secondCopy").onclick = () => {
      grab();
      const keep = ["kind", "bookType", "seriesId", "seriesName", "issue", "issueLabel", "title", "date", "pages", "stories", "coverUrl", "inducks", "duckipedia", "author", "publisher", "isbn", "format", "lang", "genre", "currency"];
      const pre = {}; keep.forEach(k => { if (d[k] !== undefined) pre[k] = d[k]; });
      const nth = S.comics.filter(x => isOwn(x) && copyKey(x) && copyKey(x) === copyKey(Object.assign({ status: "owned" }, d))).length + 1;
      const word = ["", "First", "Second", "Third", "Fourth", "Fifth"][nth] || nth + "th";
      S.editing = null; S.draft = blankDraft(Object.assign(pre, { secondCopy: true, notes: word + " copy" }));
      toast(word + " copy: enter its condition, price and seller, then save"); render(); window.scrollTo(0, 0);
    });
    $("#del") && ($("#del").onclick = () => {
      $("#confirmBox").innerHTML = '<div class="confirm"><span>Delete this ' + (d.kind === "book" ? "book" : "comic") + ' from your archive? This can\'t be undone.</span><button class="danger" id="yesdel">Delete</button><button id="nodel">Keep it</button></div>';
      $("#nodel").onclick = () => $("#confirmBox").innerHTML = "";
      $("#yesdel").onclick = async () => { try { const lot = (S.comics.find(x => x.id === d.id) || {}).lotId; await deleteComic(d.id); if (lot) await rebalanceLot(lot); toast("Deleted"); goBack(); } catch (e) { toast(errText(e)); } };
    });
  }
};

// ---- Match with INDUCKS ----
VIEWS.match = {
  html() {
    if (!S.catalogue) return '<h2>Match with INDUCKS</h2><div class="empty"><h3>No INDUCKS catalogue yet</h3><p>Update the app while online to get it.</p></div>';
    if (!S.matchRun) return '<div><h2>Match with INDUCKS</h2><p class="lede">Looking for your comics in INDUCKS…</p></div><div class="empty"><h3>Checking…</h3></div>';
    const R = S.matchRun;
    const sure = R.items.filter(x => x.sure), check = R.items.filter(x => !x.sure && x.label), open = R.items.filter(x => !x.label && !x.sure);
    const row = x => {
      const c = x.c, se = seriesById(c.seriesId);
      const opts = [`<option value="">Don't match</option>`].concat((x.options || []).map(k => {
        const h = x.file.issues[k], first = (h.s || []).slice(0, 2).map(s => s.t).filter(Boolean).join(" / ");
        return `<option value="${esc(k)}"${k === x.label ? " selected" : ""}>${esc(k)} · ${esc(niceDate(h.d))}${first ? " · " + esc(first.slice(0, 60)) : ""}</option>`;
      })).join("");
      return `<div class="matchrow"><div style="min-width:0"><div class="t">${esc((se ? se.short || se.name : c.seriesName) + " " + (c.issueLabel || c.issue || ""))}${c.title ? " · " + esc(c.title) : ""}</div>
        <div class="s">${esc([niceDate(c.date), x.how].filter(Boolean).join(" · "))}</div></div>
        <label><span class="l">INDUCKS issue</span><select data-mid="${esc(c.id)}">${opts}</select></label></div>`;
    };
    const chosen = R.items.filter(x => x.label).length;
    return `
      <div><h2>Match with INDUCKS</h2><p class="lede">Matched comics get INDUCKS's issue number, date and full story list with writers and artists. Your own details (condition, price, notes and so on) stay as they are.</p></div>
      <div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(105px,1fr))">
        <div class="card stat"><div class="v">${sure.length}</div><div class="k">certain matches</div></div>
        <div class="card stat"><div class="v">${check.length}</div><div class="k">likely, please check</div></div>
        <div class="card stat"><div class="v">${open.length}</div><div class="k">not found</div></div>
      </div>
      ${check.length ? `<div class="card stack"><h3>Please check</h3><p class="small muted" style="margin:0">Each one has a suggestion. Change it if it's wrong, or choose "Don't match".</p>${check.map(row).join("")}</div>` : ""}
      ${open.length ? `<div class="card stack"><h3>Not found</h3><p class="small muted" style="margin:0">Pick the issue if you know it. Those left on "Don't match" stay as they are.</p>${open.map(row).join("")}</div>` : ""}
      ${sure.length ? `<details class="card"><summary><strong>${sure.length} certain matches</strong> <span class="small muted">same number or exact cover date</span></summary><div class="stack" style="margin-top:12px">${sure.map(row).join("")}</div></details>` : ""}
      ${R.notInCatalogue || R.already ? `<p class="small muted" style="margin:0">${[R.notInCatalogue ? R.notInCatalogue + " Disney comics are in series without INDUCKS data" : "", R.already ? R.already + " are already matched" : ""].filter(Boolean).join("; ")}.</p>` : ""}
      <div class="row"><button class="primary" id="mapply"${R.items.length ? "" : " disabled"}>Apply <span id="mcount">${chosen}</span> matches</button><button id="mback">Back</button></div>`;
  },
  bind() {
    if (!S.catalogue) return;   // re-rendered once the catalogue has loaded
    if (!S.matchRun) { if (!S.matchBuilding) { S.matchBuilding = true; buildMatchRun().then(() => { S.matchBuilding = false; if (S.view === "match") render(); }); } return; }
    const R = S.matchRun;
    document.querySelectorAll("[data-mid]").forEach(sel => sel.onchange = () => {
      const x = R.items.find(i => i.c.id === sel.dataset.mid); x.label = sel.value;
      $("#mcount").textContent = R.items.filter(i => i.label).length;
    });
    $("#mback") && ($("#mback").onclick = () => { S.matchRun = null; nav("series"); });
    $("#mapply") && ($("#mapply").onclick = async () => {
      const btn = $("#mapply"); btn.disabled = true;
      const updated = R.items.filter(x => x.label).map(x => applyIssueFromCatalogue(x.c, x.label, x.file.issues[x.label]))
        // comics left on "Don't match" are remembered as checked, so the reminder stops counting them
        .concat(R.items.filter(x => !x.label && !x.c.inducksChecked).map(x => Object.assign({}, x.c, { inducksChecked: true })));
      try {
        await saveMany(updated);
        let sChanged = false;
        R.files.forEach(({ se, file, entry }) => { if (seriesFromCatalogue(se, file, entry)) sChanged = true; });
        if (sChanged) await saveSeries();
        toast("Matched " + R.items.filter(x => x.label).length + " comics with INDUCKS");
        S.matchRun = null; S.col = {}; nav("collection");
      } catch (e) { toast(errText(e)); btn.disabled = false; }
    });
  }
};
async function buildMatchRun() {
  const items = [], files = []; let notInCatalogue = 0, already = 0;
  const bySeries = {};
  S.comics.forEach(c => { if (c.kind !== "book" && seriesById(c.seriesId)) (bySeries[c.seriesId] = bySeries[c.seriesId] || []).push(c); });
  for (const [sid, list] of Object.entries(bySeries)) {
    const se = seriesById(sid), entry = catEntry(se);
    if (!entry) { if (se.publisher === DISNEY) notInCatalogue += list.length; continue; }
    const file = await catalogueFile(entry); if (!file) continue;
    files.push({ se, file, entry });
    list.forEach(c => {
      if (c.inducks) { already++; return; }
      const m = proposeMatch(c, file);
      const yr = (/^(\d{4})/.exec(m.label || c.issueLabel || "") || /^(\d{4})/.exec(c.date || "") || [])[1];
      const near = /^\d+$/.test(c.issueLabel || "") ? Object.keys(file.issues).filter(k => Math.abs((parseInt(k, 10) || -99) - +c.issueLabel) <= 3) : [];
      const options = m.options || (yr ? Object.keys(file.issues).filter(k => k.startsWith(yr) || String(file.issues[k].d || "").startsWith(yr)) : (m.label ? [m.label] : near));
      if (m.label && !options.includes(m.label)) options.unshift(m.label);
      const mm = Object.assign({}, m); delete mm.options;
      items.push(Object.assign({ c, file, options: options.slice(0, 120) }, mm));
    });
  }
  const ord = x => (x.c.seriesName || "") + String(x.c.issueSort || 0).padStart(12, "0");
  items.sort((a, b) => ord(a).localeCompare(ord(b)));
  S.matchRun = { items, files, notInCatalogue, already };
}

// wishlist: one folder per series, opened by tapping
// how many squares the gap grid of a year-numbered series has, from its INDUCKS catalogue file (null when not loaded yet);
// Stats uses it too, so both screens give the same total
// a Nullnummer (issue 0) gets a square where INDUCKS lists one or you have entered one:
// year series "1951/00", running series "0"
function zeroSquares(se, cat, mine) {
  const out = new Set(), keys = Object.keys((cat && cat.issues) || {});
  const add = lab => { const m = /^(\d{4})\/0{1,3}$/.exec(lab || ""); if (m) out.add(m[1]); else if (/^0+$/.test(lab || "")) out.add("run"); };
  keys.forEach(add); mine.forEach(c => { if (!c.facsimile) add(c.issueLabel || c.issue); });
  return out;   // years, and "run" for a running series
}
// series INDUCKS lists completely although the numbers have gaps: the grid shows only those issues.
// Kalle Anka & C:o (B-nummer): each carries the number of the Kalle Anka & C:o it came with (1953: 1B, 3B, 5B …)
const LISTED_ONLY = new Set(["se/B"]);
// publishers INDUCKS doesn't name, from Swedish Wikipedia and Seriesam's guide
const PUBLISHER_FALLBACK = { "se/B": "Richters förlag" };
// extra issues between the numbers (Walt Disney's Serier 1967 7½ = INDUCKS 1967X07): the X numbers of a year, from INDUCKS and your own
function yearExtras(cat, mine, y) {
  const set = new Set(); const add = l => { const m = /^(\d{4})X(\d{1,3})$/.exec(l || ""); if (m && +m[1] === y) set.add(+m[2]); };
  Object.keys((cat && cat.issues) || {}).forEach(add); mine.forEach(c => add(c.issueLabel)); return [...set].sort((a, b) => a - b);
}
// numbers INDUCKS lists only with letters (Walt Disney's Serier 1967-02A and 1967-02B, no plain 1967/02): different issues,
// each with its own square. Variants of a number that also exists plainly (1984/19 and 1984-19A) share its square as before.
// double issues the list has as one issue (Kalle Anka 1987-52-53, 91:an 2007-09-10): one wide square in Gaps
function catDoubles(cat) {
  if (!cat || !cat.issues) return {};
  if (!cat._dbl) { cat._dbl = {}; Object.keys(cat.issues).forEach(k => { const m = /^(\d{4})-(\d{1,3})-(\d{1,3})$/.exec(k); if (m && +m[3] > +m[2]) (cat._dbl[+m[1]] = cat._dbl[+m[1]] || {})[+m[2]] = +m[3]; }); }
  return cat._dbl;
}
const fusedKey = (y, a, b) => y + "-" + String(a).padStart(2, "0") + "-" + String(b).padStart(2, "0");
// a label's fused square, if the list has the double issue it belongs to: "2007-9-10" and "2007/09" both -> "2007-09-10"
function fusedSquare(cat, lab) {
  let m = /^(\d{4})-(\d{1,3})-(\d{1,3})$/.exec(lab || "");
  if (m) { const d = catDoubles(cat)[+m[1]] || {}; return d[+m[2]] === +m[3] ? fusedKey(m[1], m[2], m[3]) : null; }
  m = /^(\d{4})\/(\d{1,3})$/.exec(lab || ""); if (!m) return null;
  const d = catDoubles(cat)[+m[1]] || {};
  for (const a in d) if (+m[2] >= +a && +m[2] <= d[a]) return fusedKey(m[1], a, d[a]);
  return null;
}
function yearSplits(cat, y) {
  const out = {}, iss = (cat && cat.issues) || {};
  Object.keys(iss).forEach(k => { const m = /^(\d{4})-(\d{1,3})([A-Z])$/.exec(k); if (m && +m[1] === y && !iss[m[1] + "/" + m[2].padStart(2, "0")]) (out[+m[2]] = out[+m[2]] || []).push(m[3]); });
  Object.values(out).forEach(l => l.sort()); return out;
}
function splitLabel(cat, lab) { const m = /^(\d{4})-(\d{1,3})([A-Z])$/.exec(lab || ""); return !!(m && cat && cat.issues && cat.issues[lab] && !cat.issues[m[1] + "/" + m[2].padStart(2, "0")]); }
// a year INDUCKS starts later than 1 (Walt Disney's Serier 1954 starts at 3, 1963 at 4, numbered on from 1962): its first number
function yearStart(perYSet, mine, y) {
  if (!perYSet[y]) return 1;
  const own = mine.map(c => /^(\d{4})\/(\d{1,3})$/.exec(c.issueLabel || "")).filter(m => m && +m[1] === y).map(m => +m[2]);
  return Math.max(1, Math.min(...perYSet[y], ...own));
}
function yearGridTotal(se) {
  const cat = gridCat(se); if (!cat || se.numbering !== "year") return null;
  const mine = S.comics.filter(c => c.seriesId === se.id && !c.facsimile), perY = {}, perYSet = {};
  Object.keys(cat.issues || {}).forEach(k => { const m = /^(\d{4})\/(\d{1,3})$/.exec(k); if (m) { perY[m[1]] = Math.max(perY[m[1]] || 0, +m[2]); (perYSet[m[1]] = perYSet[m[1]] || new Set()).add(+m[2]); } });
  const catYears = Object.keys(perY).map(Number), catLast = catYears.length ? Math.max(...catYears) : 0;
  const ownYears = mine.map(c => c.issueYear || +((/^(\d{4})\//.exec(c.issueLabel || "") || [])[1]) || 0).filter(Boolean);
  const ownMax = Math.max(0, ...mine.map(c => +((/^\d{4}\/(\d{1,3})$/.exec(c.issueLabel || "") || [])[1]) || 0));
  const y0 = Math.min(+se.firstYear || 1950, ...ownYears, ...(catYears.length ? [Math.min(...catYears)] : [])), y1 = Math.max(+se.lastYear || new Date().getFullYear(), ...ownYears), per = Math.max(+se.perYear || 52, ownMax);
  let total = 0; const zero = zeroSquares(se, cat, mine);
  for (let y = y0; y <= y1; y++) {
    if (zero.has(String(y))) total++;
    if (!perY[y] && y <= catLast && yearExtras(cat, mine, y).length) { total += yearExtras(cat, mine, y).length; continue; }
    const owned = mine.filter(c => isOwn(c) && (c.issueLabel || "").startsWith(y + "/")).map(c => parseInt((c.issueLabel || "").slice(5), 10) || 0);
    const py = y > catLast ? perYearFor(se, y, mine) : Math.max(perY[y] || 0, ...owned); if (!py) continue;
    let has;
    if (perYSet[y] && (cat.own || LISTED_ONLY.has(se.code) || perYSet[y].size * 2 < perY[y])) { const set = new Set(perYSet[y]); mine.forEach(c => { const m = /^(\d{4})\/(\d{1,3})$/.exec(c.issueLabel || ""); if (m && +m[1] === y) set.add(+m[2]); }); total += [...set].filter(n => n > 0).length; has = n => set.has(n); }
    else { const st = yearStart(perYSet, mine, y); total += py - st + 1; has = n => n >= st && n <= py; }
    Object.entries(catDoubles(cat)[y] || {}).forEach(([a, b]) => { let inside = 0; for (let n = +a; n <= b; n++) if (has(n)) inside++; total += 1 - inside; });   // one square per double issue
    total += yearExtras(cat, mine, y).length;
    Object.values(yearSplits(cat, y)).forEach(l => { total += l.length - 1; });
  }
  return total;
}

// "Paste from the page": what a copied Royal Road (or similar) page says. The app can't load those pages itself
// (no CORS, Royal Road blocks robots, tested 2026-11-21), so the user copies the page and pastes it.
function parseWebPage(text) {
  const raw = String(text || ""), urls = [...raw.matchAll(/https?:\/\/[^\s)\]]+/g)].map(m => m[0]);
  const tagLinks = [...raw.matchAll(/\[([^\]]+)\]\([^)]*tagsAdd=[^)]*\)/g)].map(m => m[1].trim());
  const plain = raw.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\u00a0/g, " ");
  const lines = plain.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const num = s => parseInt(String(s || "").replace(/[^\d]/g, ""), 10) || 0;
  const r = { title: "", author: "", genres: [], link: "", pages: 0, words: 0, vols: [], format: "", ongoing: false };
  // only a link (Share › Copy link on the phone): the title comes from the link's last part, e.g. …/fiction/112557/the-wandering-inn
  const bare = raw.trim().replace(urls[0] || "\u0000", "").trim();
  if (urls.length === 1 && !/\n/.test(raw.trim()) && bare.split(/\s+/).filter(Boolean).length <= 12) {
    const u = urls[0].replace(/[?#].*$/, "").replace(/\/+$/, ""), rr1 = /royalroad\.com\/fiction\/(\d+)(?:\/([a-z0-9-]+))?/i.exec(u);
    const slug = rr1 ? rr1[2] || "" : decodeURIComponent(u.split("/").pop() || "").replace(/\.[a-z]{2,5}$/i, "");
    const small = new Set(["a", "an", "the", "of", "and", "or", "in", "on", "to", "for", "at", "by", "with"]);
    r.title = bare.replace(/\s*[|–-]\s*Royal Road.*$/i, "").trim() || slug.split(/[-_]+/).filter(Boolean).map((w, i) => i && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    r.link = rr1 ? "https://www.royalroad.com/fiction/" + rr1[1] + (rr1[2] ? "/" + rr1[2] : "") : urls[0];
    if (rr1) r.format = "Web serial"; else if (/fullreads\.com/i.test(u)) r.format = "Short story";
    return r;
  }
  const skip = /^(home|menu|login|log in|sign in|search|read|fictions?|advertisement|report)$/i;
  r.title = (lines.find(l => !skip.test(l) && !/^by\s/i.test(l)) || "").replace(/^Read\s+/, "").replace(/\s*\|.*$/, "").trim();
  const by = /\bby\s+(.+?)(?:\s*\|.*)?$/i.exec(lines.find(l => /^by\s+\S/i.test(l)) || "") || /^.+?\sby\s+([^|]+?)\s*(?:\||$)/i.exec(lines[0] || "");
  if (by) { r.author = by[1].trim(); if (r.title.toLowerCase().endsWith(" by " + r.author.toLowerCase())) r.title = r.title.slice(0, -(r.author.length + 4)).trim(); }
  const rr = urls.map(u => /royalroad\.com\/fiction\/(\d+)(?:\/([a-z0-9-]+))?/i.exec(u)).find(Boolean);
  if (rr) { r.link = "https://www.royalroad.com/fiction/" + rr[1] + (rr[2] ? "/" + rr[2] : ""); r.format = "Web serial"; }
  else { const u = urls.find(x => !/\/(profile|report|amazon)\//i.test(x)); if (u) r.link = u; }
  const pg = /\bPAGES\s*:?\s*([\d][\d,.'’]*)/i.exec(plain); if (pg) r.pages = num(pg[1]);
  const wd = /([\d][\d,.'’]*)\s+words\b/i.exec(plain); if (wd) r.words = num(wd[1]);
  const st = lines.find(l => /^(Original|Fan Fiction)\s+(ONGOING|COMPLETED|HIATUS|STUB|DROPPED)\b/i.test(l));
  if (st) { r.ongoing = /ONGOING/i.test(st); r.format = "Web serial";
    r.genres = tagLinks.length ? tagLinks : st.replace(/^(Original|Fan Fiction)\s+\S+\s*/i, "").split(/\s{2,}|\t/).map(x => x.trim()).filter(Boolean);
    if (!tagLinks.length && r.genres.length === 1 && r.genres[0].split(" ").length > 3) r.genres = [];   // tags run together in a plain copy: can't tell where one ends
  }
  lines.forEach(l => { const m = /^Vol(?:ume)?\.?\s*(\d+)\s*[,:–-]\s*(.+?)(?:\s*,?\s+is available\b.*|\s*[.,]?\s*$)/i.exec(l); if (m && !r.vols.some(v => v.n === +m[1])) r.vols.push({ n: +m[1], title: m[2].trim() }); });
  r.vols.sort((a, b) => a.n - b.n);
  // a copied short story (Fullreads …): no page count on the page, so count the words of the text itself
  if (!r.pages && !r.words && !st) { const w = plain.split(/\s+/).filter(x => /[A-Za-zÀ-ÿ]/.test(x)).length; if (w > 800) { r.words = w; if (!r.format && w < 20000) r.format = "Short story"; } }
  return r;
}
