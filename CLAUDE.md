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
   **Format (the user's wish, 2026-11-26):** the waiting goes inside the total, e.g. "3–4 min (including 2–3 min of waiting)";
   the same for the real time ("2–3 min (including about 2.5 min of waiting)"). Never "under 1 min + ~2–3 min waiting".
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
and did not improve on their own. So: **take the first guess and divide it by about 5** for bundles and bigger jobs (was 3 until 2026-11-26: still 2–3× too high,
24 bigger jobs 22–26 Nov; the user chose 5 over 6. Check again around 2026-12-03)
(by 2 for small ones), and say that you did. In replies write "first guess", never "gut" (the user reads it as the German word). A whole-tab rebuild (Stats, 2026-11-15) took 6–7 min against an estimate of 10–15 (gut ÷ 3): for rebuilds, divide by about 5.

Where the clock stops: do everything first (code, tests, research, the prices/tables for the reply), then make the
commit with the log line the **last** step before writing the reply, so the measured time covers the whole job
except typing the reply itself. Say in the report that the reply writing and GitHub's publishing/rebuild aren't included.

## Current state (2026-11-26) — details of every version are in HISTORY.md
- App da-v245 published 2026-11-26 18:34, check run series + visit: no errors (shot shows the list, not a series page) (Fill from Wikidata and Wikipedia on comic series pages; only empty fields, never overwrites). Before that published:
  da-v244 (Cover photo button in Edit; dead GCD cover links dropped), 13 price lists 2026-11-26 (price check clean).
- Waiting on the phone: Add all for the 2026-11-26 price lists; Restore file book-values-2026-11-26.json (38 book values, sent in chat);
  Blixt Gordon prices and the DD Taschenbuch T4 test-issue value (the user does them); once Series › Tools › Refresh all books.
- **da-v246 published 2026-11-26 19:35 (check run edit-comic + visit: no errors):** lots: ticking "Bought as a lot" pre-picks only a lot with something ADDED
  in the last day (newest createdAt, was: last changed), and copies its purchase date/where bought into empty fields; leaving a lot empties
  the lot's share price (prepareLot, unless a new price was typed). Cause: Valhall landed in Uhland's lot; Uhland had no date. Restore file
  lot-fix-2026-11-26.json (Uhland 2025/Street, Valhall price empty) sent in chat, not committed.
- **da-v247 published 2026-11-26 20:41 (check run edit-comic,new-comic,stats-spend + visit: no errors; shot shows the "Split the price" line):** price split.
  Add/Edit › Your copy › "Split the price" under Price paid (or under the lot price): Item price, Shipping, Customs & import VAT, Fees, Discount;
  their sum fills the total and wins on save (priceParts on a comic, lotParts on every lot member, shared by afterLotSave). Detail view row
  "Price split"; Stats › Money › Spending › Spent card: "of which shipping, customs and fees" (extrasOf: lot share by pricePaid/lotTotal).
- **da-v248 published 2026-11-26 20:53 (check run new-comic + visit: no errors):** Discount in the price split takes an amount or "10%"
  (percentage of the item price only; kept as discPct, disc recomputed by cleanParts; the field has no "amt" class so blur keeps the %).
- **da-v249 published 2026-11-26 21:03 (check run new-comic + visit: no errors):** Discount note under the field
  ("= 8.3% of the item price" for an amount, "= 3.00" for a %; discNote); comic page always shows "Discount 8.3% (2.50 CHF)" (percentage first, discPctOf).
- **da-v250 published 2026-11-26 21:58 (check run stats-spend + visit: no errors; shot shows lighter bar tops and the new card):** Stats › Spending: Spent bars get a lighter top part
  for shipping, customs and fees (timeBars lite), new card "Shipping, customs & fees over time" (lineChart running total + bars per month).
  Test data: a1 priceParts, a7 lotParts + date, new sp1 (this month).
- **da-v251 published 2026-11-26 22:23:** extras card rebuilt: "Shipping, customs & fees" (all time): CHF total + % on top of the item prices,
  one solid line (running total) with dots on buying months (lineChart dots), bars by kind (Shipping, Customs & VAT, Fees) + discounts saved;
  the old text line in Spent is gone, Spent bars keep their lighter tops. extrasOf now also returns item.
- **Wishlist prices 2026-11-26 (go 22:36, local until "publish"):** waiting lists it/DLL (Disney lingua latina 1-: 35 €, one eBay sale) and
  Frieren EN (book:Frieren: Beyond Journey's End, 1-: 7 €); 61 other wished books got a value (CHF, used VG; sample check: Mistborn, Piranesi,
  Parzival, Frieren matched the estimates) in the Restore file wishlist-book-values-2026-11-26.json (sent in chat, not committed; original
  updatedAt kept, so wishes changed on the phone since the 19:26 backup stay). Dark Lord web serial: no print edition found, no value.
- Not wanted / don't repeat: GCD covers (pictures never load in the app); webcomic page reader ("not yet"); idea 40 of the bug hunt.
- **HISTORY.md**: open it only when a job touches an older feature or a past decision. Index (version → feature):
  v193 price batch · v194 own issue lists · v195 double issues · v205 titleNumbers · v208 patch keys · v210 Read, not owned, cover ratings ·
  v211 own story titles · v212 book lookup roles · v213 Stats scales, book countries · v215/216 serial chapters, web books · v217 story series ·
  v219/220 Read-not-owned bundle · v221–224 bug-hunt bundles A–D · v225–228 longest stories, story ratings, English formats ·
  v229–232 covers, About this series, bare-year grids · v233/234 Wish all missing, ISBN warning, move/merge, Complete label ·
  v235/236 single comics/books · v237 To do rebuild, story series kinds · v238 Where to find them · v239/240 All INDUCKS search ·
  v241 slim issue lists · v242 To do no-match · v243/244 covers (GCD) · v245 Wikidata for comic series · 2026-11-15/26 price lists, Asterix, 91:an.

## Feature notes still needed for coding
- **Two chats at once (2026-11-22):** a push is refused when another chat pushed first. ALWAYS check the push result
  (`git fetch --depth=5 origin main` + compare), never hide its output; on refusal: `git fetch --depth=50 origin main`, `git rebase origin/main`.
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
- **Covers waiting:** catalogue/covers-batch.json → Series › Tools › Covers waiting › Add all (only comics without a cover). GCD (comics.org)
  links are useless since da-v244: don't collect them. Details in HISTORY.md.
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
- **Switching model/effort (checked 2026-11-24, support.claude.com):** a change applies from Claude's NEXT response, never to a job
  already running. So tell the user to switch BEFORE saying "go" (or to stop, switch, and say "continue"); never "switch now" mid-job.
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
  price-suggestion, trade, person, value, fair, stats-collection, stats-spend, stats-stories, stats-reading, story-series, todo-list; `prices` = check that every list in catalogue/prices.json reads). It always records JavaScript
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
