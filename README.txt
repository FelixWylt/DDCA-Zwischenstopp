Dagobert Ducks Archiv - offline catalogue for comics and books
=============================================================

What this is
  A self-contained web app. Once installed on your Android phone from Chrome it runs
  fully offline. Your comics are stored only on the phone (the installed app's own
  storage). Nothing is sent to any server.

Files
  index.html, styles.css, app.js   the app
  sw.js                            keeps the app on the phone for offline use
  manifest.webmanifest, icons/     lets Chrome install it like an app
  fonts/, vendor/                  fonts and the CSV reader, stored locally
  catalogue/                       INDUCKS catalogue files (added later)

Hosting (one time)
  The files need to be served once over https so Chrome can install the app,
  e.g. GitHub Pages or Netlify (both free). Only these files go there, never your data.
  After installing, the phone keeps its own copy and works without internet.

Releasing an update
  Change the files, then raise VERSION in sw.js (e.g. "da-v5"). The app shows
  "A new version is ready" the next time it is opened while online.

Backups
  In the app: Backup > Send backup (Drive, Gmail, Quick Share) or Save backup to
  Downloads. Restore from the same screen. Keep copies on your Windows PC.

Licences: fonts are SIL Open Font License; Papa Parse is MIT (see vendor/).
