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
4. **Add a line to the log below** in the same commit, with the real time read from the clock IN the commit
   command (python/`date` just before `git commit`), never written by hand beforehand. Start = user's message
   minute, so give it as a range (e.g. message 22:56, commit 22:58:10 → "1–2 min").

### Time log (estimate → real, Claude's working time only)
| Date | Job | Estimate | Real |
|---|---|---|---|
| 2026-11-07/08 | Summary of 41 jobs (single rows removed 2026-11-15): app fixes, catalogue additions, price research, answers | mostly 1–2 min, bundles 2–15 min | mostly 0–1 min, bundles 1–3 min: estimates 2–6× too high |
| 2026-11-15 | 6 points: wishlist copy comics/books/both, one-tap category button, lot list by last change (12 lots), catalogue de/MHDW+DSBDD+SDD, LETP prices, two-copies answer | 6–12 min (+1 min wait) | 1–2 min (11:51 → 11:53:11) |
| 2026-11-15 | Wishlist category as 3 fixed buttons under the row (no jumping), "Single comics" in groups (auto for 1-issue INDUCKS series, setting in Series), "Add another copy" in the edit form, LETP sales check (1 search, none found) | 4–8 min (+1 min wait) | 2–3 min (12:09 → 12:11:50) |
| 2026-11-15 | Wishlist category buttons squeezed into a grid cell (CSS fix), separate copies shown once with "2×" + copy picker, Capolavori della Letteratura prices (1 search), single-comic how-to | 4–8 min (+1 min wait) | 0–1 min (12:31 → 12:32:15) |
| 2026-11-15 | CLAUDE.md: estimate correction (÷3 for bundles, ÷2 small) + clock stops at the last step before the reply | under 1 min (gut 1–2 min ÷ 2) | 0–1 min (12:49 → 12:49:33) |
| 2026-11-15 | Package 1: single volumes in Find by title, 34/34B check loads the catalogue first, INDUCKS title replaced on number change, "Third copy" naming (add-on message already existed) | 2–3 min (gut 6–9 ÷ 3) | 1–2 min (13:05 → 13:06:36, incl. planning the 6 packages) |
| 2026-11-15 | Package 2: screenshot check on GitHub (Playwright, phone size, sample data, ?test hook, screens branch), 4 runs incl. 2 fixes | 4–7 min (gut 10–20 ÷ 3) + runs | 5–6 min (≈13:07 after package 1 → 13:13:11, incl. 4 runs of ~1.5 min) |
| 2026-11-15 | Package 3: all lots selectable (Newest/Older), rate check with SEK-per-CHF swap, live wishlist counts, no single comics in Gaps picker, all copies' grades on 2× rows, no doubled name on single comics (ISBN reuse already existed) | 3–4 min (gut 8–12 ÷ 3) + 1 run | 1–2 min (≈13:13 after package 2 → 13:15:14, incl. 1 run) |
| 2026-11-15 | Package 4: identical vs separate copies explained (field + duplicate buttons), one "2×" style, universe/group rule in Series, King Features suggestion | 2–3 min (gut 5–8 ÷ 3) + 1 run | 1–2 min (≈13:15 after package 3 → 13:17:08, incl. 1 run) |
| 2026-11-15 | Package 5: price suggestions in catalogue/prices.json (10 Italian series) + "Use these prices" in Series › value, test reads every list; then screenshot check switched to on-demand, changed screens only (user's request) | 3–5 min (gut 10–15 ÷ 3) + 1 run | 4–5 min (≈13:17 after package 4 → 13:22:20, incl. 3 runs) |
| 2026-11-15 | Package 6: app.js split into 9 files (js/), load-order check with a parser, error check over all screens; log shortened, CLAUDE.md updated | 5–8 min (gut 15–25 ÷ 3, unmeasured kind) + 1 run | 2–3 min (≈13:22 after package 5 → 13:25:29, incl. 1 run) |
| 2026-11-15 | ISBN match copies title/cover/stories; single volumes sorted into Alben & Sammlerbände (not Hefte); how to wish for a complete copy of an owned issue (answer) | 1.5–2 min (gut 4–6 ÷ 3) | 0–1 min (13:33 → 13:33:34) |
| 2026-11-15 | Single volumes: magazines by name (Heft, Sonderheft, Magazin, Zeitung, Extra) stay out of Alben & Sammlerbände | under 1 min (gut 1–2 ÷ 2) | 0–1 min (13:38 → 13:38:44) |
| 2026-11-15 | Suggest app improvements (answer only, no search) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (13:42 → 13:43:12) |
| 2026-11-15 | Package A: Send backup in the reminder (rest of backup already existed), trade list to copy, Next-issue buttons in Add | 2–3 min (gut 6–9 ÷ 3) + 1 run | 1–2 min (13:48 → 13:50:20, incl. planning + 1 run) |
| 2026-11-15 | Package B: extras with their own value (form rows, list chip, comic page row, added to the comic's value) | 2–3 min (gut 6–9 ÷ 3) + 1 run | 2–3 min (≈13:50 after package A → 13:52:58, incl. 1 run) |
| 2026-11-15 | Package C: "you already have this story" note (form, comic page, Fill toast), writer/artist pages (names tappable, person card with counts, years, comics) | 3–4 min (gut 9–12 ÷ 3) + 1 run | 3–4 min (≈13:53 after package B → 13:56:24, incl. 1 run) |
| 2026-11-15 | Package D: value over time (monthly points, chart in Stats › Value, in the backup), insurance list (.csv and print/PDF in Backup) | 3–4 min (gut 9–12 ÷ 3) + 1 run | 1–2 min (≈13:56 after package C → 13:57:27 commit; its check ran during E) |
| 2026-11-15 | Package E: fair mode for the wishlist (big rows, search, Must have first), Got it asks price, currency and seller; screenshot test waits for start-up | 2–3 min (gut 6–9 ÷ 3) + 1 run | 2 min (13:57:27 → 13:59:27, incl. 1 run) |
| 2026-11-15 | Package F: price suggestions de/LTB, de/MM, se/KA, se/KAP (4 searches), "checked on" date with a warning after a year, price check for yearly series | 4–6 min (gut 12–18 ÷ 3) + 1 run | ≈3 min (13:59:27 → 14:01:49, incl. 1 run and logging D–F) |
| 2026-11-15 | Hide the price suggestion box when a series already has your own ranges | under 1 min (gut 1–2 ÷ 2) | 0–1 min (14:07 → 14:07:54, incl. fixing a first edit that didn't apply) |
| 2026-11-15 | Suggest a Stats tab redesign (answer only, from the code, no search) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (14:09 → 14:09:19) |
| 2026-11-15 | Suggest new stats for the Stats tab (answer only, from the app's fields, no search) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (14:13 → 14:13:45) |
| 2026-11-15 | Stats redesign reviewed with the chosen new stats (answer only) | under 1 min (gut 1–2 ÷ 2) | 1–2 min (14:24 → 14:25:15) |
| 2026-11-15 | Stats rebuild (first measured whole-tab rebuild): 5 tabs, Comics/Books/Both switch, ~15 new stats (growth lines, to do, top 10, best/worst buys, lots, budget, characters, pairs, reprints, pile, average ratings), wasWish flag | 10–15 min (gut 30–45 ÷ 3, unmeasured kind) + 2–3 runs | 6–7 min (14:29 → 14:35:15, incl. 2 runs) |
| 2026-11-15 | Stats: month labels on the right no longer overlap (Growth, Value over time), lots count as one buy in Best/worst buys (+ lot list) | about 1 min (gut 2–3 ÷ 2) + 1 run | 1–2 min (15:41 → 15:42:50, incl. 1 run) |
| 2026-11-15 | Stats: free items/lots out of Best/worst buys; "Show them" list of series without prices (Value per series + To do), each opens its price ranges | 1.5–2 min (gut 3–4 ÷ 2) + 1 run | 1–2 min (15:46 → 15:47:55, incl. 1 run) |
| 2026-11-15 | Price ranges with only From or only To: read as "and all later" / "all up to", shown under each row and in the comic's value line, ranking (closed, then From-only latest start, To-only, all) | 1.5–2 min (gut 3–4 ÷ 2) + 1 run | 2–3 min (15:52 → 15:54:39, incl. 1 run) |
| 2026-11-15 | Backup check: all 3 stores and 16 settings compared with the backup; fixes: own exchange rates win on restore, last series added, value history in the compare table | about 2 min (gut 3–5 ÷ 2) | 1–2 min (16:06 → 16:07:27) |
| 2026-11-15 | Price range From/To: normal keyboard for every series (number keyboard for running-number series since 2026-11-07 hid the slash) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (16:16 → 16:16:26) |
| 2026-11-15 | Stats To do "Fill all" opens Series › Tools (Refresh all comics), not Backup | under 1 min (gut 1–2 ÷ 2) | 0–1 min (16:20 → 16:20:43) |
| 2026-11-15 | Handover note for a new chat (open task: Asterix price ranges from the user's backup) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (16:49 → 16:49:57) |
| 2026-11-15 | Guide "How to make price ranges" in CLAUDE.md (sources, Z1, text format, editions, stable ranges) | under 1 min (gut 1–2 ÷ 2) | 1–2 min (16:53 → 16:54:08) |
| 2026-11-15 | Repo connected late; answer on issues per year (91:an, from the code); Asterix ranges redone as Paste-prices lines checked against the app's parser | 2–3 min (gut 6–9 ÷ 3) | 2–3 min (17:26 → 17:28:28) |
| 2026-11-15 | Per year by year ranges (Gaps, Stats, Next issue, Series field), kr/CHF in edition lines, Asterix suggestions stored by series id (+ price check adapted to edition lists), JSON-import check (answer) | 3–4 min (gut 8–12 ÷ 3) + 1 run | 4–5 min (17:33 → 17:37:42, incl. 1 run of ~2 min) |
| 2026-11-15 | Swedish Asterix checked in Seriesams Guide (3 searches, 2 pages): 1–4 and 31–38 corrected, full list to paste + prices.json | 1.5–2.5 min (gut 3–5 ÷ 2) + 1 run | 3–4 min (17:41 → 17:44:50, incl. 1 run of ~2 min) |
| 2026-11-15 | Swedish Asterix from the user's Seriekatalogen table (VF; HC rows 3–6, special 40), full list + prices.json | 1–1.5 min (gut 2–3 ÷ 2) + 1 run | 2–3 min (17:49 → 17:51:29, incl. 1 run of ~2 min) |
| 2026-11-15 | Swedish Asterix: "inb." rows = hardcover (1, 3–6, 40 as 1. Auflage HC) | under 1 min (gut 1–2 ÷ 2) + 1 run | 1–2 min (17:56 → 17:58:19, incl. 1 run of ~2 min) |
| 2026-11-15 | 91:an from the user's Seriekatalogen CSV: 18 yearly ranges (VF) + Per year text, prices.json, price check now uses a yearly series for yearly lists | 1.5–2 min (gut 3–4 ÷ 2) + 1 run | 3–4 min (18:01 → 18:04:23, incl. 1 run of ~2 min) |
| 2026-11-15 | Price batch for Restore: Restore reads price-only files (replace a series' ranges, set per year/years), restore-batch.json + build script, notes | 1.5–2 min (gut 4–6 ÷ 3) | 1–2 min (18:05 → 18:06:46) |
| 2026-11-15 | Restore file vs. Series › Tools button for the price batch (answer only, from the code) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (18:10 → 18:10:35) |
| 2026-11-15 | Series › Tools › Price lists waiting (Add all: replace, years/per year, remembers what's added), price lists fetched fresh by the service worker, test with tap | 2–3 min (gut 6–9 ÷ 3) + 1 run | 3–4 min (18:16 → 18:20:17, incl. 1 run of ~2 min) |
| 2026-11-15 | Does the 91:an list include issue numbers? (answer only) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (18:24 → 18:24:12) |
| 2026-11-15 | Own issue lists for non-INDUCKS series (91:an from the CSV: doubles, 14½, gaps like 2024/16) in Gaps, via Price lists waiting; test checks the grid | 2–3 min (gut 6–9 ÷ 3) + 1 run | 3–4 min (18:25 → 18:29:07, incl. 1 run of ~2 min) |
| 2026-11-15 | Fused squares for double issues? (answer only) | under 1 min (gut 1–2 ÷ 2) | 0–1 min (18:31 → 18:31:17) |
| 2026-11-15 | Double issues as one wide square in Gaps (all yearly series), counted once in totals and Stats; test checks 91:an 2007 | 2–3 min (gut 6–9 ÷ 3) + 1 run | 5–6 min (18:32 → 18:37:43, incl. 2 runs of ~2 min: one with all screens, one after a test fix) |
| 2026-11-15 | Herman Hedning from the user's Seriekatalogen CSV: year/nr converted to the user's running numbers (checked with #86, #95), 6 ranges + latest 204 waiting | 1–1.5 min (gut 2–3 ÷ 2) + 1 run | 2–3 min (18:39 → 18:41:47, incl. 1 run of ~2 min) |
| 2026-11-15 | Herman Hedning by year: batch switches numbering, renumbers the user's copies (86 -> 2009/06), yearly prices + issue list + per year; test checks it | 2–3 min (gut 6–9 ÷ 3) + 1 run | 2–3 min (18:48 → 18:51:21, incl. 1 run of ~2 min) |
| 2026-11-15 | Stats › no prices › "Single books" opened Series › Book series: now Collection › Comic books › Single books (comic books without a series); test | under 1 min (gut 1–2 ÷ 2) + 1 run | 4–5 min (18:56 → 19:00:41, incl. 2 runs of ~2 min: the first test used the wrong kind of book) |
| 2026-11-15 | Herman Hedning Add all added nothing: list loaded fresh but the phone still ran older code (no numbering switch, yearly lines unread). Fix: minApp + APP_BUILD, list offered again; test | 1–2 min (gut 3–5 ÷ 3) + 1 run | 2–3 min (19:02 → 19:05:08, incl. 1 run of ~2 min) |
| 2026-11-15 | Herman Hedning & CO from the user's Seriekatalogen CSV (running numbers match the user's #19, #24): 3 ranges + latest 35 waiting | under 1 min (gut 1–2 ÷ 2) + 1 run | 4–5 min (19:13 → 19:17:45, incl. 2 runs of ~2 min: the price check read Herman Hedning without its year switch, test fixed) |
| 2026-11-15 | A Song of Ice and Fire (Bantam) prices: user's 5 are later mass market printings (2 searches); waiting lists now also for book series; test | 1.5–2.5 min (gut 4–7 ÷ 3) + 1 run | 2–3 min (19:24 → 19:27:08, incl. 1 run of ~2 min) |
| 2026-11-15 | Stories listed twice (Oscar the Ostrich: same code and title twice in one Micky Maus Zeitung) now once; serial parts with their own title stay separate; test | 1–2 min (gut 3–5 ÷ 3) + 1 run | 2–3 min (19:29 → 19:31:31, incl. 1 run of ~2 min) |
| 2026-11-15 | Stats › Stories: "When the stories were made" only read dates starting with the year (missed 30.05.1937, Januar 1966); top characters checked (counts are real, per story); test | 1.5–2 min (gut 4–6 ÷ 3) + 1 run | 2–3 min (19:33 → 19:35:48, incl. 1 run of ~2 min) |
| 2026-11-15 | Stats › When the stories were made: stories without a date placed by the oldest copy (lighter part of the bar, count in the note); test | about 1 min (gut 2–3 ÷ 2) + 1 run | 2–3 min (19:38 → 19:40:47, incl. 1 run of ~2 min) |
| 2026-11-15 | Why 48 → 28 series without prices? (answer from the code and the 15:55 backup: Add all = 4 series, 20 unpriced book series drop out when Stats is on Comics) | 1–2 min (gut 2–4 ÷ 2) | 0–1 min (20:11 → 20:11:58) |
| 2026-11-15 | "gut" explained (English: gut feeling); replies now say "first guess" (rule in CLAUDE.md); Overview count follows the Comics/Books/Both switch shared by all Stats tabs (answer) | under 1 min (first guess 1–2 ÷ 2) | 0–1 min (20:13 → 20:13:42) |
| 2026-11-15 | Legend (Marie Lu) prices: user's books are used paperbacks (1 search), 1-4: 4 € waiting; Prodigy lacks a volume number, Swedish Legend no series | 1.5–2 min (first guess 4–6 ÷ 3) + 1 run | 1–2 min (20:20 → 20:22:20, incl. 1 run of ~2 min) |
| 2026-11-15 | Marvels mutanter from the user's Seriekatalogen CSV: 5 yearly ranges (VF) + issue list (double 1989/7-8) + years/per year waiting | about 1 min (first guess 2–3 ÷ 2) + 1 run | 2–3 min (20:27 → 20:29:32, incl. 1 run of ~2 min) |
| 2026-11-15 | Spirous äventyr from the user's Seriekatalogen CSV: Guldmaskinen = the user's no. 5, 350 kr waiting | under 1 min (first guess 1–2 ÷ 2) + 1 run | 2–3 min (20:31 → 20:33:46, incl. 1 run of ~2 min) |
| 2026-11-15 | Spirous äventyr full list from the user's Seriekatalogen CSV: 0 (Guldmaskinen) + 1–56, 36 ranges (VF) + latest 56 waiting; user's copy to renumber 5 → 0 by hand | about 1 min (first guess 2–3 ÷ 2) + 1 run | 1–2 min (20:36 → 20:38:09, incl. 1 run of ~2 min) |
| 2026-11-15 | Farbror Joakims liv from the user's Seriekatalogen CSV (1: 480 kr, 2: 360 kr); price check explained | under 1 min (first guess 1–2 ÷ 2) + 1 run | 1–2 min (20:46 → 20:48:23, incl. 1 run of ~2 min) |
| 2026-11-15 | Rule: price lists in bundles (prepare + commit locally, push and check once when the user says publish) | under 1 min (first guess 1–2 ÷ 2) | 0–1 min (20:52 → 20:52:36) |
| 2026-11-15 | Value estimate Zelda BotW Master Works (Tokyopop HC 2019, German edition of Creating a Champion): about 30 € (2 searches), single book, typed in by the user | 1–1.5 min (first guess 2–3 ÷ 2) | 0–1 min (20:53 → 20:54:20) |
| 2026-11-15 | Value estimate Chappatte, 100 Karikaturen NZZ am Sonntag (NZZ Libro 2012): about 20 CHF (1 search found nothing; Ricardo asking 29 CHF from the user) | under 1 min (first guess 1–2 ÷ 2) | 0–1 min (20:58 → 20:58:31) |
| 2026-11-15 | Chappatte bought for 5 CHF (answer: value stays ~20 CHF, price paid already in the app) | under 1 min (first guess 1 ÷ 2) | 0–1 min (21:00 → 21:00:38) |
| 2026-11-15 | Bamse from the user's Seriekatalogen CSV: yearly ranges (VF, 1973–2026), issue list with doubles, per year by year; local (bundle) | about 1 min (first guess 2–3 ÷ 2) | 0–1 min (21:04 → 21:05:12) |
| 2026-11-15 | Ninja Timmy (book series, Henrik Tamm): 1-: 50 kr from asking prices (1 search); 2 of the user's 3 books lack the series; local (bundle) | 1–1.5 min (first guess 2–3 ÷ 2) | 0–1 min (21:08 → 21:08:46) |
| 2026-11-15 | Winnetou – Mannen från prärien (Williams 1974, single issue) from the user's Seriekatalogen CSV: 40 kr VF, typed in by the user (no list) | under 1 min (first guess 1–2 ÷ 2) | 0–1 min (21:13 → 21:13:15) |
| 2026-11-15 | Stormlight Archive (book series, 1-: 8 € from asking prices) local; Odysséen (LL-förlaget 2012, lättläst, still in print 219 kr): about 80 kr typed in (2 searches) | 1–1.5 min (first guess 3–4 ÷ 3) | 0–1 min (21:16 → 21:17:05) |

Keep the log short: at the end of each month, replace that month's rows by one summary row.

Rough guide from the log (as of 2026-11-15): real time is ~0–1 min for a small fix or answer, ~1–3 min for a bundle
of changes or a research job. Estimates were 2× too high for small jobs and 3–6× too high for bundles/bigger jobs,
and did not improve on their own. So: **take the first guess and divide it by about 3** for bundles and bigger jobs
(by 2 for small ones), and say that you did. In replies write "first guess", never "gut" (the user reads it as the German word). A whole-tab rebuild (Stats, 2026-11-15) took 6–7 min against an estimate of 10–15 (gut ÷ 3): for rebuilds, divide by about 5.

Where the clock stops: do everything first (code, tests, research, the prices/tables for the reply), then make the
commit with the log line the **last** step before writing the reply, so the measured time covers the whole job
except typing the reply itself. Say in the report that the reply writing and GitHub's publishing/rebuild aren't included.

## Where we left off (2026-11-15, app da-v203)
- **Price batch (the user's wish, 2026-11-15):** new price lists are COLLECTED and the user adds them all at once in
  **Series › Tools › Price lists waiting › Add all** (da-v193). For each new list: add it to catalogue/prices.json (as usual)
  AND an entry to catalogue/restore-batch.json (id = the user's series id from their backup, sugg = the prices.json key,
  replace = true if the series already has ranges in the app, patch = perYear/firstYear/lastYear/defaultEdition/issueList).
  The app fetches both files fresh (service worker: network first for these two) and remembers what it added
  (config priceBatchDone, key = series + list date + text length), so a corrected list shows up again. Old entries
  can stay; remove them once the user has added them. Fallback: scripts/build_restore_batch.py makes a Restore file.
  Waiting now: Swedish Asterix (replaces the imported ranges), 91:an (+ years 1956–2026, per year, issue list),
  Herman Hedning (x-herman-hedning-swedish): the user wants it BY YEAR like Seriekatalogen; the batch entry switches
  numbering to year and has "renumber" (running number -> year/nr, e.g. 86 -> 2009/06) for the user's copies.
  Herman Hedning & CO (x-herman-hedning-co, running like Seriekatalogen: 3 ranges + latest 35).
  A Song of Ice and Fire (book series: id "book:A Song of Ice and Fire", prices.json "id:book:…"; waiting lists work for
  book series since da-v200, no patch). The user's 5 are Bantam mass market paperbacks (later printings) = 4 € each.
  Legend (book series "book:Legend", Marie Lu): 1-4: 4 €. The user's Prodigy has no volume number and the Swedish Legend
  no series yet (told them to set them).
  Marvel mutanter (x-marvel-mutanter-swedish, yearly 1989–1990, issue list with double 1989/7-8); the user's 2 copies are "1989/?", "1990/?".
  Spirous äventyr (x-spirous-aventyr): full list 0–56 (0 = Guldmaskinen 1975) + latest 56. The user's Guldmaskinen copy
  is wrongly numbered 5: told them to change it to 0 by hand.
  Bamse (x-bamse-varldens-starkaste-bjorn): yearly 1973–2026, issue list, per year (local, not yet pushed).
  Ninja Timmy (book series "book:Ninja Timmy"): 1-: 50 kr (local). The user's Sansoria and Vita apan books have no series yet.
  The Stormlight Archive (book series "book:The Stormlight archive"): 1-: 8 € (local).
  Farbror Joakims liv (comic book series "book:Farbror Joakims liv"): 1: 480 kr, 2: 360 kr.
  The user asked (2026-11-15) not to repeat the "Waiting now" list in every reply.
  **Publish price lists in bundles (the user's wish, 2026-11-15):** for each series the user sends, prepare it and commit
  locally (with its log line) but do NOT push and do NOT run the price check. When the user says "publish" (or "done"),
  push everything at once and run ONE price check for the whole bundle. Say in each reply how many lists are unpublished.
  Patch keys: numbering, perYear, firstYear, lastYear, defaultEdition, issueList, latest; plus renumber {old label: new}.
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

## How to make price ranges (the user's way)
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
- Bundle changes. Ask before bigger changes. Keep the climate impact low (few test runs, no needless searches).
- Only test what changed; don't rerun earlier tests.
- The app code is split by section into `js/*.js` (plain scripts sharing their names; order in index.html: core first,
  start last). Code that runs while a file loads may only use names from earlier files. New files: add them to
  index.html and to the file list in sw.js.
- Raise `APP_VERSION` in sw.js with every change, and `APP_BUILD` in js/core.js to the same number (da-v199 → 199).
  A waiting price list that needs new app code gets "minApp": that build (old apps can't apply it properly: the price
  lists load fresh, the code only with the update). Changing "added" makes a list show up again. A push to `main` publishes to GitHub Pages.
- Network checks: push probe-books.mjs to the `cors-test` branch; the workflow writes probe-result.txt.
- Screenshot check (the user's rule): only for a **visible** change, and only of the screens that changed. Start it by hand:
  `gh api -X POST repos/FelixWylt/DDCA-Zwischenstopp/actions/workflows/screens.yml/dispatches -f ref=main -f 'inputs[screens]=wishlist,copy-picker'`
  (`gh workflow run` is blocked here). Add `-f 'inputs[visit]=1'` to open every screen without pictures, only to catch errors (names: collection, group-ltb,
  series-ltb-copies, group-singles, series-tools (also taps Add all), stories (same story twice in one comic = once), stats-singles, wishlist, wishlist-books, edit-comic, new-comic, stats, series, copy-picker,
  price-suggestion, trade, person, value, fair, stats-collection, stats-spend, stats-stories, stats-reading; `prices` = check that every list in catalogue/prices.json reads). It always records JavaScript
  errors. Results on the `screens` branch: `*.png` and `errors.txt` (about 1.5 min per run). No run for invisible changes.
- Price suggestions live in `catalogue/prices.json` (per INDUCKS code, or `id:<series id>` for non-Disney series, text as for Paste prices). Add new price research
  there too (with date and a short note on the sources), then run the check with `prices`.
