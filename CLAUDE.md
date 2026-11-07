# Notes for Claude (read before working on this repo)

## About the user
- Not a programmer. Write in plain language and say where new buttons are in the app.
- The app's data lives only on the user's phone (IndexedDB, DuckDuckGo browser on a Fairphone 5).
  Anything that needs their data (prices, entries) is given to them as text to paste or type in.

## Time estimates (the user has asked for this twice — follow it every time)
1. **Before starting** any job, give an estimate in real time as a range, plus how sure you are.
   Estimate at Claude's own pace, not a person's. Measured so far:
   - small fix or one new field: about 2–5 minutes
   - several related changes (e.g. read-date stats + "Bought from" list + stats card): about 3 minutes
   - bigger rebuilds (e.g. restructuring a whole tab): about 10–30 minutes
   State waiting separately (e.g. GitHub Actions network probe: about 1 minute).
2. **After publishing**, report the real time: from the user's message time (in the system reminder)
   to the commit time (`git log -1 --date=format:%H:%M`). Never report a guess as a measurement.

## Other working rules
- Bundle changes. Ask before bigger changes. Keep the climate impact low (few test runs, no needless searches).
- Only test what changed; don't rerun earlier tests.
- Raise `APP_VERSION` in sw.js with every change. A push to `main` publishes to GitHub Pages.
- Network checks: push probe-books.mjs to the `cors-test` branch; the workflow writes probe-result.txt.
