# Notes for Claude (read before working on this repo)

## About the user
- Not a programmer. Write in plain language and say where new buttons are in the app.
- The app's data lives only on the user's phone (IndexedDB, DuckDuckGo browser on a Fairphone 5).
  Anything that needs their data (prices, entries) is given to them as text to paste or type in.

## Time estimates (the user has asked for this several times — follow it every time)
1. **Before starting** any job, give an estimate in real time as a range, plus how sure you are.
   Estimate at Claude's own pace, not a person's. Base it on the log below: Claude tends to estimate too HIGH.
   State waiting separately (GitHub Actions network probe: about 1 minute; the user's replies don't count).
2. **Measure:** run `date +%T` as the first step (the user's message time only shows the minute),
   and take the end from the commit (`git log -1 --format=%ad --date=format:%H:%M:%S`).
3. **After publishing**, report estimate vs. real time. Never report a guess as a measurement.
4. **Add a line to the log below** in the same commit.

### Time log (estimate → real, Claude's working time only)
| Date | Job | Estimate | Real |
|---|---|---|---|
| 2026-11-07 | Publisher/Genre suggestion lists (own dropdown widget, 5 fields) | 15–25 min | ~3 min |
| 2026-11-07 | Reading stats with month/year dates + Bought-from list + Bought-from stats card | (none) | ~2–3 min |
| 2026-11-07 | Create CLAUDE.md | 1–2 min | ~20 s |
| 2026-11-07 | Disney De Luxe barcode (joined barcode+add-on, typed lookup) incl. investigation | 5–10 min | ~2.5 min |
| 2026-11-07 | Add this log to CLAUDE.md | 20–40 s | see git log |

Rough guide from the log: small fix or one field ≈ 1–2 min; a bundle of related changes ≈ 2–4 min;
a bigger rebuild (whole tab) maybe 5–15 min — not yet measured, so say so.

## Other working rules
- Bundle changes. Ask before bigger changes. Keep the climate impact low (few test runs, no needless searches).
- Only test what changed; don't rerun earlier tests.
- Raise `APP_VERSION` in sw.js with every change. A push to `main` publishes to GitHub Pages.
- Network checks: push probe-books.mjs to the `cors-test` branch; the workflow writes probe-result.txt.
