#!/usr/bin/env python3
"""Complete story titles that INDUCKS gives without the hero's name.

Old Swedish (and some Norwegian) printings had the hero's name in the title logo, so INDUCKS
lists the title as "och spartävlingen" instead of "Farbror Joakim och spartävlingen".
When another printing of the same story in the same language has the full title
(it ends with the short one), the full title is used.

Usage: fix_titles.py <catalogue-dir>   (runs after build_catalogue.py; changes the files in place)
"""
import json, glob, os, sys, collections

cat = sys.argv[1] if len(sys.argv) > 1 else "catalogue"
files = {}
full = collections.defaultdict(lambda: collections.defaultdict(set))   # language -> story code -> titles
for f in sorted(glob.glob(os.path.join(cat, "inducks-*.json"))):
    lang = os.path.basename(f).split("-")[1]
    d = json.load(open(f, encoding="utf-8"))
    files[f] = (lang, d)
    for i in d.get("issues", {}).values():
        for s in i.get("s", []):
            if s.get("c") and s.get("t") and not s["t"][0].islower():
                full[lang][s["c"]].add(s["t"])

fixed = left = 0
for f, (lang, d) in files.items():
    changed = False
    for i in d.get("issues", {}).values():
        for s in i.get("s", []):
            t = s.get("t") or ""
            if not t or not t[0].islower(): continue
            # the shortest full title that ends with this one ("Farbror Joakim och spartävlingen")
            cands = sorted((x for x in full[lang].get(s.get("c"), ()) if len(x) > len(t) and x.endswith(t)), key=len)
            if cands: s["t"] = cands[0]; fixed += 1; changed = True
            elif s.get("h"): s["t"] = s["h"] + (t if t.startswith("s ") else " " + t); fixed += 1; changed = True   # the printed hero line
            else: left += 1
    if changed:
        with open(f, "w", encoding="utf-8") as fh:
            json.dump(d, fh, ensure_ascii=False, separators=(",", ":"))
print(f"story titles completed from other printings: {fixed}; still starting in lower case: {left}")
