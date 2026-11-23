# Notes for Claude (read before working on this repo)

## About the user
- Not a programmer. Write in plain language and say where new buttons are in the app.
- The app's data lives only on the user's phone (IndexedDB, DuckDuckGo browser on a Fairphone 5).
  Anything that needs their data (prices, entries) is given to them as text to paste or type in.

## Time estimates (the user has asked for this several times — follow it every time)
1. **Before starting** any job, give an estimate in real time as a range, plus how sure you are. EVERY job, also checks,
   lookups in the backup/catalogue and research before an answer, and also when the user's go comes with new data
   (a pasted table): the estimate comes in the first message, before any tool call (2026-11-22: forgotten several times).
   Estimate at Claude's own pace, not a person's. Base it on the log below: Claude tends to estimate too HIGH.
   State waiting separately (GitHub Actions network probe: about 1 minute; the user's replies don't count).
2. **Measure from the user's message time** (system reminder, minute precision) to the commit time
   (`git log -1 --format=%ad --date=format:%H:%M:%S`). Don't start the clock at your first command:
   that misses the thinking/writing before it. Give a range where the minute precision matters.
3. **After every job** (also lookups, checks and stopped research, not only after publishing), report estimate vs. real time
   and add its log line. Never report a guess as a measurement: read the clock FIRST, then write the row from it
   (2026-11-22: a row said "3–4 min" before the clock was read; it was 1–2).
4. **Add a line to the log in TIMELOG.md** in the same commit, with the real time read from the clock IN the commit
   command (python/`date` just before `git commit`), never written by hand beforehand. Start = user's message
   minute, so give it as a range (e.g. message 22:56, commit 22:58:10 → "1–2 min").

### Time log
The log lives in **TIMELOG.md** (moved out 2026-11-22, the user's wish: this file is sent with every message).
Open TIMELOG.md only to add a line or to read the recent rows for an estimate. Keep it short: at the end of each month,
replace that month's rows by one summary row.

Rough guide from the log (as of 2026-11-15): real time is ~0–1 min for a small fix or answer, ~1–3 min for a bundle
of changes or a research job. Estimates were 2× too high for small jobs and 3–6× too high for bundles/bigger jobs,
and did not improve on their own. So: **take the first guess and divide it by about 3** for bundles and bigger jobs
(by 2 for small ones), and say that you did. In replies write "first guess", never "gut" (the user reads it as the German word). A whole-tab rebuild (Stats, 2026-11-15) took 6–7 min against an estimate of 10–15 (gut ÷ 3): for rebuilds, divide by about 5.

Where the clock stops: do everything first (code, tests, research, the prices/tables for the reply), then make the
commit with the log line the **last** step before writing the reply, so the measured time covers the whole job
except typing the reply itself. Say in the report that the reply writing and GitHub's publishing/rebuild aren't included.

## Where we left off (2026-11-21, app da-v218)
- **Done (2026-11-21 23:56): catalogue rebuilt with story-info.json** (917 KB): 12,782 of 88,750 stories in 1,067 story series,
  original language for 88,749 (18,312 differ from their prefix's usual one), country for 1,521 of 2,573 creators. The first try
  (23:10–23:22) failed: inducks.org timed out from GitHub (curl 28). Rebuild by hand only when the user asks:
  `gh api -X POST repos/FelixWylt/DDCA-Zwischenstopp/actions/workflows/inducks-catalogue.yml/dispatches -f ref=main`.
- **Done (2026-11-22, da-v219): the "Read, not owned" bundle** (user: "everything" of 2a–f, plus 4 and 5), done BEFORE the bug hunt's fixes
  (the user's go at 00:59; a parallel bug-hunt chat was running, its part 1 report was written against da-v218).
  a) story note says owned and read-only apart (hadElsewhereHtml, Fill toast); b) "Got it" is now "I bought it" everywhere (bindGot in
  gaps.js, row = .wishrow/.fairrow/.gotrow) and also on the comic page of wishlist and Read-not-owned items (a read-only item keeps read
  date/ratings, "Read from" gives way to the seller); d) "Want to own it" on a read-only item's page makes a wish with `fromRead`; buying
  that wish copies read/readDate/rating/fav/coverRating/link/words and deletes the read-only entry; c) Gaps: read-only squares
  `.cell.readno` (dashed edge + ✓, legend), no clash mark with a wish; e) Read from: one-tap buttons (data-rsrc); f) Stories: row
  "I have it" (Owned / Read, not owned, storyHave), only when such items exist. 4) Read online also for comic issues and comic books
  (format "Webcomic", Link field); comic page shows Link. 5) Paste box takes a bare link: title from the link's last part (parseWebPage),
  Royal Road = Web serial, fullreads = Short story. da-v220: book-series Gaps mark read-only volumes too (bookGapsHtml, tap opens the entry). Not done: webcomic page reader (answer A: not yet).
  Shop list (Zurich + 1 h) saved in the claude.ai project as claude/shops-zurich.md (2026-11-22).
- **Two chats at once (2026-11-22):** a push is refused when another chat pushed first. ALWAYS check the push result
  (`git fetch --depth=5 origin main` + compare), never hide its output; on refusal: `git fetch --depth=50 origin main`, `git rebase origin/main`.
- **Open (handover nr. 12, 2026-11-22 11:40): bug-hunt fixes, chosen = ALL of 1–48 except 40** (Opus high is enough; none needs extra).
  Found by reading da-v218–220 + the user's backup of 2026-11-21 (kept off GitHub). FIRST re-check each point against the newest code.
  Do the bundles in order (A first: bug 1 can wipe data). Mark: all **high**. Each bundle = one version, one report before, one log line.
  Bug 1 fixed in da-v221: Refresh all comics is safe again (told the user).
  The user's backup shows all 34 price lists are ALREADY added (every batch id has ranges noted "Claude, 2026-11-15"): "Add all" is done.
  Still on the phone: once Series › Tools › Refresh all books (fills book countries; Fill on book series fills their Country).
  - **Bundle A DONE (da-v221, 2026-11-22 ~11:55):** keepOwnTitles keeps every non-INDUCKS story field by code (chapters in order); new series `pending` until its comic is saved (saveSeries skips, setView drops); pagesAuto; edit dup check skips the wish move.
    Was: **Bundle A (Add/Edit, 12):** 1+42 refreshAll (series.js) and Fill from INDUCKS (add.js hit.ic branch) replace c.stories with INDUCKS ones
    and drop Duckipedia story extras (dTitle, translator, characters, plot, genre); Duckipedia is skipped when dkDue() false (<30 days;
    212 comics fetched 2026-10-31) → keep the extras by story code (like keepOwnTitles). 42 = Stats › Overview › To do "Fill all" leads there.
    2 add.js Fill from INDUCKS: `fromCat` uses `file`, undefined in the hit.ic branch → ReferenceError whenever d.title is set (silent).
    3 saveBook never moves a wish (dupHtml promises "saving moves it to your collection") → do it like doSave, incl. fromRead.
    7 goNext (comics) for Read, not owned: no readDate → set today like saveBook. 8 "genres" typo in secondCopy keep list and scan.js
    comicFromCode → "genre". 9 saveBook stores newBookSeries (13 books) → don't save it / ignore it when the series exists.
    10 dupHtml (core.js) says "is already in your collection" for notowned → "you read this (not owned)". 11 maybe: parseWebPage with
    Vol lines + words gives book 1 the whole story's words/pages. 12 Words → Pages only while Pages is empty → follow Words unless
    typed by hand. 15 new series made on leaving the name field (typos/cancel leave empty series; Tools › Delete empty series exists).
    16 idea: Read online + Paste link/page also when editing a book. 17 idea: duplicate warning when an edited comic's number changes.
  - **Bundle B DONE (da-v222, 2026-11-22):** Restore skips entries newer on the phone, series merged (fresh phone = backup's list); backup has priceBatchDone, Add all skips identical ranges; takeFromRead() in core.js (Add, Edit, saveBook); books.js fetchOk skips a host 10 min after a timeout; scanner pushState + popstate. User should test the back gesture (13) on the phone.
    Was: **Bundle B (Backup, lookup, wishlist, 12):** 4 Restore (stories-backup.js) writes every backup comic over the phone's and REPLACES
    S.series → merge: phone keeps newer entries (updatedAt), series merged by id. 5 priceBatchDone not in backup (25 of 34 lists have no
    replace → ~105 ranges doubled after a restore) → back it up and/or make Add all skip identical ranges. 6 "Copy backup as text" =
    ~2 M characters: too long for Keep/Docs → reword (Gmail/file). 13 maybe, test on phone: back gesture leaves the scanner open.
    14 maybe: DNB asked first, 9 s timeout each (lookup + genre step) → skip a source after it failed this session (= idea 21).
    18 idea: keep wishlist notes when a comic wish becomes owned in doSave. 19 idea: Backup counts + compare table show Read, not owned.
    20 idea: CSV adds edition, rating, read date, checked value, value, link, words. 21 see 14. 29 buying a fromRead wish via Add
    (doSave move) or Edit "I own it" skips bindGot's merge (read date/ratings) and leaves the read-only entry. 31 idea: I bought it
    asks the condition (Z chips). 35 idea: Copy list for comic fair marks Must ★, option without Dream.
  - **Bundle C DONE (da-v223, 2026-11-22):** copyKey '' for '?'; sepCopies()/isTradeable() in collection.js; readDateWas on untick (Gaps, Edit); valueNumber running variants; parsePrices splits on ; or ', '; lastRuns config + lastRunText/markRun (core.js); Stats noEnd note (data-snoend); Gaps #copymiss reads the grid.
    Was: **Bundle C (Collection, Gaps, Series, 12):** 22 collection copyKey merges different "year/?" comics into one "7×" row (Spindelmannen
    1988/?) → '?' labels never copies (as Stats slotKey). 23 Duplicates for trade + trade list ignore separate copies (LTB Maus-Edition 7,
    Magnus Chase 1) → count copyKey groups too. 24 Gaps read mode (and Edit) clears readDate on untick → keep the old date for an undo.
    25 valueNumber (core.js) returns issueNum for running variants "546A" → use issueSort (546.01) so "546A:" ranges apply.
    26 parsePrices typed split `,(?!5(?!\d))` cuts "8,50 €" → split only on ", " / ";". 27 Remove series leaves its valueRules.
    28 countText ignores notowned (folder line "0 comics"). 30 book page lacks Words, Country. 32 idea: price ranges card lists your
    comics without a range. 33 idea: Gaps "Copy missing numbers". 34 idea: Tools show when each bulk job last ran. 44 idea: series
    without Latest issue (10: Asterix German, Lucky Lukes äventyr, Musiksaga …) are missing in Stats › How complete → note with links.
  - **Bundle D DONE (da-v224, 2026-11-22, pushed 12:4x after a second add_repo try; the first try in a chat can be refused, retry):** storiesGo() in stories-backup.js opens Stories with clean filters (Stats links, data-goperson); storyRead() + Unread chip; readFromOf() + pick "rfrom" + card "Reading by where from" (stats.js); Stats › Stories card "Story series you have most of" (SINFO.tot); on-wishlist tile data-gowish.
    Was: **Bundle D (Stats, Stories, 10):** 36 storyIndex("wanted") lets notowned in (`isOwn` test) → only status wanted. 37 Stats links
    data-stq / .hbar[data-who] keep old Stories filters (olang, clang, ownf, sub=series) → reset them. 38 Overview This month "read"
    counts sel only, its list uses isMine → count selN too. 39 maybe: Unread pile pace counts notowned by pages, not by items.
    41 Stories sort by code: localeCompare with numeric: true. 43 Stats What you collect (.hbar[data-g]) keeps S.colSort → set "series".
    45 idea: Overview "on wishlist" tile opens the Wishlist. 46 idea: Reading by "Read from" (Library, Online, own). 47 idea: Stories
    chip "Unread". 48 idea: Stats › Stories card "story series you have most of" (totals from story-info.json storySeries).
  - Not wanted: 40 (Stats Wishes fulfilled note still says "Got it").
- **Done 2026-11-22 evening (handover nr. 13):** da-v225 Longest stories: pages = largest total of any of the user's comics
  (chapters per comic add up; was the first copy found), a later chapter's Duckipedia title (dTitle) names the story when the first
  chapter has none (firstD/gotD in storyIndex). da-v226 Overview To do "comics without stories" skips comics with c.inducks set
  (DSBP 63 Postcard Collection has no stories in INDUCKS). da-v227 story ratings Writing/Art (storyRatings[key].writing/.art) under
  Overall on the story page; Rated chip, Stats ratings note averages, best writers by Writing / artists by Art (fallback Overall);
  screens shot "13b-story-rating". da-v228 formats in English: FMT_EN (Heft → Magazine, Taschenbuch / Pocket → Pocket book) on start,
  in stamp() and saveSeries; enSize() for Duckipedia series sizes ("200 × 135 mm", "varying pages"). The user kept "Magazine" (not "Issue").
  Spindelmannen price list (Seriekatalogen VF, 1984–1999/8, 1991/2B variant, replace) published with da-v228; the user still taps Add all
  and gives the 9 "?" copies their numbers. Spider-Man (SE) and Spider-Man Magazin lists were already done 2026-11-15.
  The user's backup of 2026-11-22 was used for checks (kept off GitHub).
- **Handover nr. 14 (2026-11-23 ~21:00, app da-v232, nothing local after publish):** 2026-11-22/23 late: +4 GCD covers (47 waiting;
  Samlade serier 5 match was wrong, left out); Frieren (English, Viz) vols 1–15 sent as a Restore file (frieren-english-wishlist.json,
  1–7 Must have, 15 comes out 14 Jan 2027; the user owns German vol 1 only); da-v232 Farbror Joakims liv grid (now a comic series, comic "2017").
  Ideas offered, none chosen yet: 1 "Wish the whole series" button, 2 coming-out dates on wishes + "Coming soon", 3 bootleg/ISBN warning,
  4 move a series book ⇄ comic, 5 nightly GCD cover run (~6 series a night), 6 webcomic reader (still "not yet").
  Still on the phone: Refresh all books once; check the Winnetou 1 cover after Add all. Back gesture in the scanner: tested, works (2026-11-23).
  Chosen 2026-11-23 21:05: ideas 1, 3, 4 (plan sent, waiting for the go); 2, 5, 6 not wanted. 21:10: plan + 1b "Remove all wishes" (the reverse of 1). Answers 21:14: Want preselected; ask the universe; Remove keeps Must have. With the bundle add the rule
  "answers to questions are not a go" (the user's wish, 21:17). 21:26: + A (from–to range in Wish all missing), B (cost of the new
  wishes in that box), C (Stats › Overview › To do lists ISBN warnings). D/E/F (move entries, merge series, series complete) not now.
  **da-v233 built (go 21:27, local until "publish"):** gaps.js gapHead chips "Wish all missing" (#wishall: empty squares read from the grid,
  From–To via gapPos/gapBound, level chips, Want preselected, cost via wishCost) and "Remove all wishes" (#unwishall, keeps Must have),
  bindWholeSeriesWishes/gapWishDraft/gapWishesOf; core.js isbnWarnings()/isbnWarnHtml() (check digit, length, FAKE_PUB, first 7 digits vs
  ≥2 other valid volumes of the same book series + language) in Add/Edit (#isbnwarn, live) and the book page ISBN row; stats.js pick "isbn"
  + To do line (owned list, wishes → Wishlist); series.js "Make it a comic series" (data-bk2c, asks the universe, bookToComicSeries) and
  "Make it a book series" (data-c2b, not for yearly series, asks Book/Comic book, comicToBookSeries); both carry price ranges + description.
  Screens at publish: series, edit-comic, stats, series-tools (opens the 91:an grid), notowned (opens a book grid), plus visit=1.
  21:47: user wants D/E/F next (move entries, merge series, series complete) as da-v234: plan sent, waiting for the go.
  21:54 answers: D in the gap grid (not Collection); E keep the kept series' ranges + add the other's only where none, with a warning
  to check ranges first; F not ✓ (same as the read mark): 21:57 chose B = gold "Complete" word label (gap grid, Collection folders, Stats).
  **da-v234 built (go 21:58, local until "publish"):** D gaps.js Move chip (#movemode, S.moveMode/S.moveSel, moveToggle/bindMoveMode; cells and
  the off-grid list; Move to… = pickSeries {books, exclude}) + core.js entryMovedTo()/moveEntries() (comic⇄comic/book); E series.js
  "Merge into…" (data-smerge, pickSeries onlyBooks/exclude; mergePlan: kept series' ranges win, the other's added only without overlap,
  warning box lists left-out ranges; mergeSeries fills empty fields, removes the other; different numbering refused); F core.js
  completeKeys (config completeSeries, markComplete/isComplete/completeChip/bookSeriesComplete): set by gapHead (only with a known end)
  and Stats (perSeries with tot, book series with a size); gold chip .complete in gap head, Collection folders, Stats card "Complete
  series" (data-cgap) and How complete. Screens at publish: + series-ltb-copies/collection, stats, series (with da-v233's list).
- **Handover nr. 15 (2026-11-23 ~22:42, app da-v234 published, nothing local):** da-v233 + da-v234 pushed 22:37; one check run
  (series, edit-comic, stats, series-tools, notowned, series-ltb-copies, collection + visit): no JavaScript errors; book grid shows Move and
  Wish all missing. Not yet tried on the phone: Wish all missing / Remove all wishes, ISBN warning, Make it a comic/book series, Move, Merge,
  Complete label (Collection label appears after the grid or Stats counted a series). Nothing chosen next.
  Offered 22:56, no go yet: da-v235 single comics (isSingleSeries) get no Complete label and stay out of How complete / no prices yet.
  Idea 5 judged NOT needed (2026-11-23): the last GCD run had only 7 comics left; a nightly job can't know which comics lack covers
  (data only on the phone, needs a fresh backup each time). Instead: a one-off run when the user sends a backup with new cover-less comics.
- **Older open points (handover nr. 10):** the user may check one story per code and Read online entries.
- **Price batch (the user's wish, 2026-11-15):** new price lists are COLLECTED and the user adds them all at once in
  **Series › Tools › Price lists waiting › Add all** (da-v193). For each new list: add it to catalogue/prices.json (as usual)
  AND an entry to catalogue/restore-batch.json (id = the user's series id from their backup, sugg = the prices.json key,
  replace = true if the series already has ranges in the app, patch = perYear/firstYear/lastYear/defaultEdition/issueList).
  The app fetches both files fresh (service worker: network first for these two) and remembers what it added
  (config priceBatchDone, key = series + list date + text length), so a corrected list shows up again. Old entries
  can stay; remove them once the user has added them. Fallback: scripts/build_restore_batch.py makes a Restore file.
  All 34 lists sent so far were published (last bundle 2026-11-15 about 23:18; nothing local). Their series ids, keys and patches
  are in catalogue/restore-batch.json, their prices and source notes in catalogue/prices.json (trimmed from this file 2026-11-22).
  Hand fixes told to the user then: Spirous äventyr Guldmaskinen 5 → 0; Tintin #20 Edition 1. Auflage; Legend: Prodigy needs a volume
  number, Swedish Legend a series; Ninja Timmy: Sansoria and Vita apan need the series; several "year/?" copies need their number.
  The user asked (2026-11-15) not to repeat the "Waiting now" list in every reply.
  **Publish price lists in bundles (the user's wish, 2026-11-15):** for each series the user sends, prepare it and commit
  locally (with its log line) but do NOT push and do NOT run the price check. When the user says "publish" (or "done"),
  push everything at once and run ONE price check for the whole bundle. Say in each reply how many lists are unpublished.
  Book series: "titleNumbers": {"title words": "number"} numbers the user's books without a number by title (da-v205).
  Patch keys: numbering, perYear, firstYear, lastYear, defaultEdition, issueList, latest, first (da-v208); plus renumber {old label: new}.
- Swedish Asterix: from the user's Seriekatalogen list (VF). seriekatalogen.se can't be fetched from here: ask the user to
  paste the series' table (they can). Seriesams Guide online is a fallback with fewer values.
- Asterix price ranges done (2026-11-15): the user imported them from a .json file Claude made (rules merge by id, so
  this worked). They are also stored as suggestions in catalogue/prices.json under "id:<series id>" (series INDUCKS
  doesn't have). Edition lines ("12 Asterix (1. Auflage) 8 €") now accept kr and CHF too.
- 91:an: prices (Seriekatalogen VF) in prices.json "id:x-91-an-swedish"; its issues per year are in that note.
- Own issue lists (da-v194): a series INDUCKS doesn't have can carry `issueList` (keys as in the INDUCKS files: "1956/01",
  doubles "2007-09-10" plus their single numbers, extras "1982X14" = 14½). Gaps then shows exactly those numbers
  (gridCat/ownIssueCat in core.js). 91:an's list (1732 keys, from the user's Seriekatalogen CSV) goes in via the batch patch.
- Double issues (da-v195): in yearly series a double the list knows ("1987-52-53", "2007-09-10") is ONE wide square in Gaps
  (catDoubles/fusedSquare in add.js); a comic "2007-9-10" or "2007/09" fills it; Gaps totals and Stats count it once.
- "Per year" in Series takes one number or ranges by year ("1978-1983: 12, 1984-: 24"); Gaps, Stats and Next issue use it.
- **Read, not owned (da-v210):** status "notowned" (third button in Add: I own it / Wishlist / Read, not owned). Helpers in
  core.js: `isOwn(c)` = owned (collection, value, gaps, insurance, lots), `isMine(c)` = owned or read-not-owned (ratings,
  hearts, read lists), `notOwned(c)`. Stats › Reading counts them apart (with a total); Stories and its stats include them.
  When adding code that asks "not on the wishlist", decide between isOwn and isMine.
- **Own story titles (da-v211):** a title changed in Edit › Stories gets `ownTitle: true`; keepOwnTitles() keeps it when
  Refresh all comics or Fill from INDUCKS replace the stories (matched by story code).
- **Book lookup roles (da-v212):** books.js parseMarc: no 100 → author from the 700 field with $t (the work); editor-only records
  get weakAuthors and merge() prefers another database's author; translator from $e/$4 (incl. "Übers.") or 245$c
  ("übers./übertragen/deutsch von X"). The DNB (SRU and portal) couldn't be reached from here or by the user on 2026-11-20.
- **da-v213 (2026-11-20):** Stats bar charts get a scale (`ychart`, `niceMax`, `labStep` in stats.js); ranked lists get a ↓/↑ button (`sortBtn`/`ordered`, S.statAsc);
  Growth has monthly bars; What you collect = Disney by group ("Disney · …"), other universes one bar; duplicates by series+number+edition (unknown "?" numbers
  and books without a volume only by ISBN) with a Show them list; a wish turned owned in saveComic gets wasWish (+ wishGotOn without a purchase date);
  book countries: `bookCountry()` (own Country field › book series country from Wikidata P495/author P27 › 041 $h original language › author's country,
  cached in config authorCountry, asked after Refresh all books); comic books = edition country. Story genres/dates shown in English (storyGenreEn, dateEn);
  One-pager only on stories. Reading All time = everything read; per month counted from January 2016 (the user's wish).
- **da-v215/216 (2026-11-21):** storyIndex: the same story code twice in one comic = ONE story (chapters of a serial; 86 groups in the
  user's backup), title = sharedTitle() of the chapter titles (only where the title goes on with a separator/chapter word, else the
  first title without "Teil 1"), pages added up. Stats: tap a bar (barRead) = number above the chart + Show them; index chips
  (.statindex) on Collection/Money/Stories/Reading; Reading's Average ratings = series only; pages per month. Update popup reads the
  new sw.js for its version. Books: Read online button, "Paste from the page" (parseWebPage in add.js: title, by author, RR tags,
  "Vol N, title" lines -> book series + S.webVols buttons, PAGES, words; a long plain text = a short story, words counted), fields
  Link and Words (pages = words ÷ 300), formats Web serial / Short story. The user types each book's pages (answer G).
- **da-v217 (2026-11-21): story series + filters.** build_catalogue.py section 5 writes catalogue/story-info.json: series (subseries code ->
  name + other-language names), storySeries (story code -> subseries codes), original language = language of the first dated printing
  (stored only where it differs from langDefault of the code's prefix), people (creator full name -> nationality country code). The app
  (loadStoryInfo/SINFO in stories-backup.js) matches by story code: Stories › All stories has sub chips Stories | Story series, the search
  finds series names, story details show Story series (tappable page) + Original language; filter rows "Original" and "In my comics"
  (comicLangOf: c.lang › seriesLang › country code) on All stories and Favourites; People: Country (writers/artists) or In my comics
  (characters, e.charLang). Names via Intl.DisplayNames.
- **Cover ratings (da-v210):** `coverRating` (half stars) on the edit form and the comic page.
- **Story titles without the hero (2026-11-20):** INDUCKS gives old Swedish titles as "och spartävlingen". scripts/fix_titles.py
  (run after each catalogue build) takes the full title from another printing or the printed hero; build_catalogue.py adds
  the story's hero name in the issue's language (tables inducks_herocharacter + inducks_charactername; confirmed by the 2026-11-20 build: 2,275 → 31 short titles left;
  names written "Knatte\, Fnatte…" in INDUCKS are unescaped). Comics keep their old titles until Refresh all comics.

## How to make price ranges (the user's way)
- **Variants (the user's wish, 2026-11-15):** when Seriekatalogen ("Variant: Ja") or another source lists a variant,
  add it as its own issue with a capital letter: issueList key "2003-01B" (double: "2019-01-02B"), and a price line
  "2003/1B: 35 kr" only when its price differs from the plain issue. The plain issue keeps no letter.
  Running numbers too since da-v209 ("5B: 6 €"). Write variant lines ONE PER ISSUE: a range "1B-4B" would also cover plain 2–4.
- **Value = condition Z1** (very good). Other conditions are worked out by the app's condition factors, so never lower
  a range for worn copies.
- **Sources, best first:** Comicguide.de (column "Zustand 1"), Seriekatalogen.se (VF column), then real sold prices
  (eBay "sold", Tradera, Ricardo, Catawiki, auctions such as Little Nemo/Eppli). Asking prices only as a last resort,
  and say so. The user's own ranges (from Comicguide/Seriekatalogen) win: don't overwrite them.
- **Text format for Paste prices** (one range per line, currency sign at the end):
  `1: 900 €` · `2-5: 150 €` · `81-: 3 €` (81 and all later) · `-25: 8 €` (all up to 25).
  Yearly series: `1951/1: 6000 €` · `1952: 300 €` (whole year) · `1956-1957: 60 €` · `1951/2-1951/4: 900 €`.
- **Editions / reprints:** when a series has reprints (Asterix, LTB, Micky Maus), give separate ranges per edition
  ("1. Auflage", "Neuauflage" …) and tell the user to set the comic's Edition field; a range without an edition counts
  for every edition. Facsimiles count 50 % automatically.
- **Keep ranges stable:** never change a price without a reason. When merging or re-sending lists, check that
  every range still has the same price as before, and list any change with its reason.
- **Give the source and date** with each list (a short note), and for general series also add it to
  catalogue/prices.json (see below). Fewer, wider ranges are better than many guessed single prices; say where
  the numbers are only estimates.

## Other working rules
- **Mistakes not to repeat (2026-11-22, the user's wish):**
  - **Every reply ends with "Unpublished: …"** (app versions, price lists, log/notes commits), also "Unpublished: nothing".
  - **A plan for an app change names:** the new version (da-vNNN), "committed locally, pushed only on 'publish'", and whether a
    screenshot check is needed (visible change: which screens) — plus estimate, how sure, waiting, Model/effort.
  - **Check before promising web research:** test ONE source first, then estimate. Blocked from here (2026-11-22): comics.org (GCD,
    WebFetch and curl), openlibrary.org (robots, proxy 403); comicbooks.com opens but WebFetch shows no picture links; curl reaches
    no outside site. So cover links can't be collected here: the app finds them on the phone (it can reach Open Library, Google Books, Libris).
    GCD from GitHub (probes 2026-11-22): its API answers (series by name: /api/series/name/<name>/, issue JSON has "cover"), but sends no
    CORS header (the app can't ask it), and its pictures (files1.comics.org) fail with 403 on GitHub, also in a headless browser.
    Shop list: a Claude doc https://claude.ai/artifact/RC1qQvSjfR3sfWAUWboi52 (tables; claude/shops-zurich.md in the project only points to it).
- **Covers waiting (da-v230):** catalogue/covers-batch.json {covers:[{sid,label,url,gcd}]} → Series › Tools › Covers waiting › Add all
  (coverBatchWaiting/applyCoverBatch in core.js; only comics without coverUrl). Made by the GCD lookup in probe-books.mjs on the cors-test
  branch (input cover-input.json from the backup; output covers-found.json). 2026-11-22: 27 covers; GCD stopped answering after 3 series
  (rate limit?). Slower run (1.6 s): +16 (Lucky Luke 6, Spirou 10); GCD stops after ~5 series per run, so run ~6 series at a time
  (Asterix names last: broad searches). da-v229: Get cover pictures also finds book covers. da-v231: "About this series" always shows
  when the series has an INDUCKS code (link); comic book series get the code by name from the catalogue index (Farbror Joakims liv = se/FJL). da-v232: yearly series whose INDUCKS keys are bare years (se/FJL: 1997, 2017, 2019, 2022) get one square per listed year, label = the year (yearOnly in gaps.js); the user's comic is numbered "2017".
  - **Repo access:** the first push-access request in a chat is often refused by the safety check (it wants the user's own words).
    Ask for push access only when the user asks for work on the repo; if refused, say so in one line and ask the user to say "try again".
  - **The backup is per chat:** a file sent in another chat can't be opened here, and project files hold no backup. Ask the user to
    attach it. A 0-byte upload failed: ask again (pick it from Files, wait for its size, or zip it).
- **Publish only on "publish" (the user's wish, 2026-11-22):** app changes too, not only price lists: after the go, make the change,
  test what can be tested here and commit locally (with its log line), but do NOT push. Say in each reply what is unpublished
  (app versions and price lists). On "publish" (or "done"): push everything at once, then ONE check run for all of it.
  Never count a "yes" to a plan as "publish", even when the plan says it would be published.
- **Report before starting (the user's wish, 2026-11-20):** before changing anything, report what you found and the plan
  (with the time estimate and any questions), then wait for the user's go. Only answers need no report first.
  **Answers to questions are NOT a go** (the user's wish, 2026-11-23): after the user answers a plan's questions or adds to it,
  restate the plan and wait for an explicit "go".
- **More power (the user's wish, 2026-11-21):** (see the guideline table below) before a job, say when it needs more than the current setting: a higher "effort"
  setting (usually "high" is enough for big bundles; "extra" only for one very tricky problem) or a stronger model. Say it in the
  report, before the go, with one line on why.
- **Model/effort guideline (the user's wish, 2026-11-21):** in every report before a job, add ONE line "Model/effort: …" taken from
  this table, without working it out anew (saves energy):
  | Kind of job | Model | Effort |
  |---|---|---|
  | Answers, explanations, value estimates, notes/CLAUDE.md edits | Opus (Sonnet is enough too) | low or medium |
  | Price lists from a pasted CSV/table, one small fix | Opus (Sonnet is enough too) | medium |
  | Bundles of several app changes, a new screen/filter, catalogue build changes | Opus | high |
  | One very tricky bug that already failed once, or a big rebuild of a whole tab | Opus | extra |
  | Only if Opus on extra failed twice on the same problem | Fable | high |
  Say it only when the current setting differs from the table ("switch to high for this one"), else just "current setting is fine".
  Judge by the job's real size, not by "it's an app change": ONE feature with one or two small parts is a "small fix" (medium);
  high only for bundles of several changes or a tricky part (2026-11-22: a 2-part cover finder was wrongly put at high).
- **New chat (the user's wish, 2026-11-20):** say on your own when it's time for a new chat: when the chat has grown long
  (many replies, this file re-sent many times) or answers slow down, and best at a quiet moment (nothing local, nothing waiting).
- Bundle changes. Ask before bigger changes. Keep the climate impact low (few test runs, no needless searches).
- Only test what changed; don't rerun earlier tests.
- The app code is split by section into `js/*.js` (plain scripts sharing their names; order in index.html: core first,
  start last). Code that runs while a file loads may only use names from earlier files. New files: add them to
  index.html and to the file list in sw.js.
- sw.js was found EMPTY on 2026-11-15 (wiped by the 19:25 commit, restored in da-v204): after editing it, check it isn't empty.
- Raise `APP_VERSION` in sw.js with every change, and `APP_BUILD` in js/core.js to the same number (da-v199 → 199).
  A waiting price list that needs new app code gets "minApp": that build (old apps can't apply it properly: the price
  lists load fresh, the code only with the update). Changing "added" makes a list show up again. A push to `main` publishes to GitHub Pages.
- Network checks: push probe-books.mjs to the `cors-test` branch; the workflow writes probe-result.txt.
  2026-11-21: royalroad.com answers 403 to GitHub's servers and sends no CORS header; fullreads.com no CORS header either: the app can't fetch them.
- Screenshot check (the user's rule): only for a **visible** change, and only of the screens that changed. Start it by hand:
  `gh api -X POST repos/FelixWylt/DDCA-Zwischenstopp/actions/workflows/screens.yml/dispatches -f ref=main -f 'inputs[screens]=wishlist,copy-picker'`
  (`gh workflow run` is blocked here). Add `-f 'inputs[visit]=1'` to open every screen without pictures, only to catch errors (names: collection, group-ltb,
  series-ltb-copies, group-singles, series-tools (also taps Add all), stories (same story twice in one comic = once), stats-singles, wishlist, wishlist-books, edit-comic, new-comic, stats, series, copy-picker,
  price-suggestion, trade, person, value, fair, stats-collection, stats-spend, stats-stories, stats-reading; `prices` = check that every list in catalogue/prices.json reads). It always records JavaScript
  errors. Results on the `screens` branch: `*.png` and `errors.txt` (about 1.5 min per run). No run for invisible changes.
- **Handover tips (2026-11-15):** the user's backup (.json, sent in the chat) is private: never commit it. It is the only
  source for the user's series ids (non-INDUCKS series "x-<name>-<lang>", book series "book:<name>") and for what they
  already typed in; ask for a fresh one when needed. The user pastes Seriekatalogen CSVs (use the VF column) and
  Comicguide tables (Zustand 1). Before a push: `test -s sw.js`, `node --check` on sw.js and js/*.js, json.load of
  catalogue/prices.json and restore-batch.json. After a check run (~2 min) read the result with
  `gh api "repos/FelixWylt/DDCA-Zwischenstopp/contents/errors.txt?ref=screens" -H "Accept: application/vnd.github.raw"`
  (it starts with a "price batch:" test line; real errors follow it). Commits end with the session's attribution lines.
- Price suggestions live in `catalogue/prices.json` (per INDUCKS code, or `id:<series id>` for non-Disney series, text as for Paste prices). Add new price research
  there too (with date and a short note on the sources), then run the check with `prices`.
