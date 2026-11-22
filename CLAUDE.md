# Notes for Claude (read before working on this repo)

## About the user
- Not a programmer. Write in plain language and say where new buttons are in the app.
- The app's data lives only on the user's phone (IndexedDB, DuckDuckGo browser on a Fairphone 5).
  Anything that needs their data (prices, entries) is given to them as text to paste or type in.

## Time estimates (the user has asked for this several times — follow it every time)
1. **Before starting** any job, give an estimate in real time as a range, plus how sure you are.
   Estimate at Claude's own pace, not a person's. Base it on the log below: Claude tends to estimate too HIGH.
   State waiting separately (GitHub Actions network probe: about 1 minute; the user's replies don't count).
2. **Measure from the user's message time** (system reminder, minute precision) to the commit time
   (`git log -1 --format=%ad --date=format:%H:%M:%S`). Don't start the clock at your first command:
   that misses the thinking/writing before it. Give a range where the minute precision matters.
3. **After publishing**, report estimate vs. real time. Never report a guess as a measurement.
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
  Royal Road = Web serial, fullreads = Short story. Not done: read mark in book-series gaps; webcomic page reader (answer A: not yet).
- **Two chats at once (2026-11-22):** a push is refused when another chat pushed first. ALWAYS check the push result
  (`git fetch --depth=5 origin main` + compare), never hide its output; on refusal: `git fetch --depth=50 origin main`, `git rebase origin/main`.
- **Open (handover nr. 11, 2026-11-22):** nothing waiting locally. The user may send a backup to check da-v217/218 (Story series,
  Original / In my comics rows, People › Country, Characters › In my comics). Still on the phone: Series › Tools › Price lists
  waiting › Add all, and once Series › Tools › Refresh all books.
- **Older open points (handover nr. 10):** the user may check one story per code and Read online entries; the user still has to tap Series › Tools › Price lists waiting › Add all (nothing new waiting since 2026-11-15).
  After da-v213: Refresh all books once fills book countries (author's country); Fill on book series fills their Country.
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
- **Report before starting (the user's wish, 2026-11-20):** before changing anything, report what you found and the plan
  (with the time estimate and any questions), then wait for the user's go. Only answers need no report first.
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
