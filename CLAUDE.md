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
| 2026-11-07 | Publisher/Genre suggestion lists (own dropdown widget, 5 fields) | 15–25 min | ~3 min |
| 2026-11-07 | Reading stats with month/year dates + Bought-from list + Bought-from stats card | (none) | ~2–3 min |
| 2026-11-07 | Create CLAUDE.md | 1–2 min | ~20 s |
| 2026-11-07 | Disney De Luxe barcode (joined barcode+add-on, typed lookup) incl. investigation | 5–10 min | ~2.5 min |
| 2026-11-07 | Add this log to CLAUDE.md | 20–40 s | ~15 s (measured by the user) |
| 2026-11-07 | Find why Disney De Luxe isn't linked to the catalogue (answer only) | 1–2 min | ~1 min |
| 2026-11-07 | New series created on leaving the "New series name" field, linked to INDUCKS | 2–4 min | ~1–1.5 min |
| 2026-11-07 | Fill from INDUCKS also fills publisher, format, genres | 1–3 min | ~1.5–2 min |
| 2026-11-07 | Suggestion-list rows overlapping (CSS) + check other menus | 1–3 min | ~1–1.5 min |
| 2026-11-07 | New INDUCKS-linked series get their country group (it → Italia) + one-time fix of existing ones | 1–2 min | 0.0–1.0 min (22:56 → 22:57:01) |
| 2026-11-07 | Italian price ranges for Paste prices (research, 4 series groups; answer only) | 8–15 min | 2–3 min (23:16 → 23:18:52) |
| 2026-11-07 | Add Super Almanacco Paperino (it/SAP = Paperino Mese 1–66) to the catalogue, incl. finding the code | 1–2 min (+1 min wait) | 0–1 min (23:27 → 23:28:07, before the rebuild) |
| 2026-11-07 | Check price range for Super Almanacco Paperino 1–66 (2 searches; answer only) | 1–2 min | 0–1 min (23:33 → 23:33:32) |
| 2026-11-08 | Covers searched again after every catalogue rebuild → only when the series is new in the catalogue or 30 days passed | 1–3 min | 0–1 min (00:06 → 00:06:53) |
| 2026-11-08 | Barcode add-on misread (De Luxe 34 → wrong issue/cover): add-on must be read the same in two frames | 2–4 min | 1–2 min (00:17 → 00:18:37) |
| 2026-11-08 | Do stats understand pages like "120 (116 numbered + 4 covers)"? (answer only: yes, they take the first number) | under 1 min | 0–0 min (00:26 → 00:26:15) |
| 2026-11-08 | Why ISBN 9788828781608 (De Luxe 29) isn't found (answer only: not in the 4 databases, INDUCKS has no ISBN table, SBN can't be asked by apps) | 1–2 min | 1–2 min (00:30 → 00:31:40) |
| 2026-11-08 | Fill from INDUCKS kept the old cover (29 → 29B): replace INDUCKS covers, show new picture over old stored copy | 1–3 min | 0–1 min (00:41 → 00:41:56) |
| 2026-11-08 | "34 and 34B overlap": letter numbers with different INDUCKS titles count as different comics | 1–4 min | 0–1 min (00:57 → 00:58:06) |
| 2026-11-08 | Value of a hand-drawn Celoni picture from Lucca 2025 (3 searches; answer only) | 2–4 min | 0–1 min (01:14 → 01:14:35) |
| 2026-11-08 | Celoni picture: narrow the value (answer only, no search) | under 1 min | 0–1 min (01:20 → 01:20:31) |
| 2026-11-08 | Celoni picture: original or print? (answer only, no search) | under 1 min | 0–1 min (01:26 → 01:26:57) |
| 2026-11-08 | Mottura picture "La leggenda del pianista sull'oceano": original? value? (catalogue check, no web search; answer only) | under 1 min | 0–1 min (01:35 → 01:36:05) |
| 2026-11-08 | Celoni/Mottura pictures bought for 15 € each → signed prints, value corrected (answer only) | under 1 min | 0–1 min (01:37 → 01:37:57) |
| 2026-11-08 | Find "La vera storia di Novecento" in the catalogue (answer only) | under 1 min | 0–0 min (01:43 → 01:43:23) |
| 2026-11-08 | Per-currency tables looked like a wrong conversion: "Priced in" label, explanation, ≈ CHF column (both tables) | 1–2 min | 0–1 min (01:54 → 01:54:42) |

Rough guide from the log: small fix or one field ≈ 1–2 min; a bundle of related changes ≈ 2–4 min;
a bigger rebuild (whole tab) maybe 5–15 min — not yet measured, so say so.

## Other working rules
- Bundle changes. Ask before bigger changes. Keep the climate impact low (few test runs, no needless searches).
- Only test what changed; don't rerun earlier tests.
- Raise `APP_VERSION` in sw.js with every change. A push to `main` publishes to GitHub Pages.
- Network checks: push probe-books.mjs to the `cors-test` branch; the workflow writes probe-result.txt.
