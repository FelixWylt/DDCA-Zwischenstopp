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

Keep the log short: at the end of each month, replace that month's rows by one summary row.

Rough guide from the log (as of 2026-11-15): real time is ~0–1 min for a small fix or answer, ~1–3 min for a bundle
of changes or a research job. Estimates were 2× too high for small jobs and 3–6× too high for bundles/bigger jobs,
and did not improve on their own. So: **take the gut estimate and divide it by about 3** for bundles and bigger jobs
(by 2 for small ones), and say that you did. A whole-tab rebuild (Stats, 2026-11-15) took 6–7 min against an estimate of 10–15 (gut ÷ 3): for rebuilds, divide by about 5.

Where the clock stops: do everything first (code, tests, research, the prices/tables for the reply), then make the
commit with the log line the **last** step before writing the reply, so the measured time covers the whole job
except typing the reply itself. Say in the report that the reply writing and GitHub's publishing/rebuild aren't included.

## Where we left off (2026-11-15, app da-v186)
- Open task: Asterix price ranges. Asterix has many reprints, so ranges must be split by printing (Edition field: "1. Auflage",
  "Neuauflage" …; price ranges can be per edition). The user will attach a backup (.json): read the Asterix entries from
  `comics` (seriesId → `series`, issue, edition, date, notes, pricePaid), research sold prices, and give the ranges as text
  for Series › Asterix › Price ranges › Paste prices (and add them to catalogue/prices.json if they're general).
  Treat the backup as private: don't commit it to the repo.

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
- Raise `APP_VERSION` in sw.js with every change. A push to `main` publishes to GitHub Pages.
- Network checks: push probe-books.mjs to the `cors-test` branch; the workflow writes probe-result.txt.
- Screenshot check (the user's rule): only for a **visible** change, and only of the screens that changed. Start it by hand:
  `gh api -X POST repos/FelixWylt/DDCA-Zwischenstopp/actions/workflows/screens.yml/dispatches -f ref=main -f 'inputs[screens]=wishlist,copy-picker'`
  (`gh workflow run` is blocked here). Add `-f 'inputs[visit]=1'` to open every screen without pictures, only to catch errors (names: collection, group-ltb,
  series-ltb-copies, group-singles, wishlist, wishlist-books, edit-comic, new-comic, stats, series, copy-picker,
  price-suggestion, trade, person, value, fair, stats-collection, stats-spend, stats-stories, stats-reading; `prices` = check that every list in catalogue/prices.json reads). It always records JavaScript
  errors. Results on the `screens` branch: `*.png` and `errors.txt` (about 1.5 min per run). No run for invisible changes.
- Price suggestions live in `catalogue/prices.json` (per INDUCKS code, text as for Paste prices). Add new price research
  there too (with date and a short note on the sources), then run the check with `prices`.
