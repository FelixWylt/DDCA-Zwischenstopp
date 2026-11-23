#!/usr/bin/env python3
"""Writes catalogue/story-where.json: for every story that belongs to a story series (catalogue/story-info.json),
the comics in the app's INDUCKS issue lists (catalogue/inducks-*.json) that print it.

Run after each catalogue build:  python3 scripts/build_story_where.py

Format (kept small, the app loads it only when a story series page is opened):
  pubs:  [[file, code, title], ...]            one entry per issue list
  s:     {story code: [title, [[pub index, issue key], ...], most pages]}
"""
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, "..", "catalogue")
norm = lambda c: re.sub(r"\s+", " ", c or "").strip()

info = json.load(open(os.path.join(CAT, "story-info.json"), encoding="utf-8"))
wanted = {norm(k) for k in info.get("storySeries", {})}
index = json.load(open(os.path.join(CAT, "index.json"), encoding="utf-8"))
by_file = {e["file"]: e for e in index.get("series", {}).values()}

pubs, out = [], {}
for path in sorted(glob.glob(os.path.join(CAT, "inducks-*.json"))):
    f = os.path.basename(path)
    d = json.load(open(path, encoding="utf-8"))
    e = by_file.get(f, {})
    pi = len(pubs)
    pubs.append([f, d.get("code") or e.get("code", ""), e.get("series") or d.get("title") or f])
    for key, iss in (d.get("issues") or {}).items():
        seen = set()
        for s in iss.get("s") or []:
            c = norm(s.get("c"))
            if c not in wanted or c in seen:
                continue
            seen.add(c)
            x = out.setdefault(c, [s.get("t") or "", [], 0])
            if not x[0] and s.get("t"):
                x[0] = s["t"]
            x[1].append([pi, key])
            try:   # most pages of any printing: 0-1 page entries are title pages, covers and gags, not parts of the series
                x[2] = max(x[2], int(float(str(s.get("p") or 0).replace(",", "."))))
            except ValueError:
                pass

res = {"built": info.get("built", ""), "source": "I.N.D.U.C.K.S. (https://inducks.org), via the app's catalogue files",
       "pubs": pubs, "s": out}
with open(os.path.join(CAT, "story-where.json"), "w", encoding="utf-8") as fh:
    json.dump(res, fh, ensure_ascii=False, separators=(",", ":"))
print(len(pubs), "issue lists,", len(out), "of", len(wanted), "series stories found,",
      sum(len(v[1]) for v in out.values()), "printings")
