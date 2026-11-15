#!/usr/bin/env python3
"""Title index for "Find by title": every catalogue issue that has its own title (books, specials, De Luxe ...),
as [file, issue, title, date, price]. Made from the finished catalogue files, so it never needs the INDUCKS export."""
import glob, json, os, sys
out_dir = sys.argv[1] if len(sys.argv) > 1 else "catalogue"
rows = []
# a one-volume publication (Der Stammbaum der Ducks, Micky Holmes & Donald Watson) often has no issue title:
# its series name is the title then
names = {}
try:
    for s in json.load(open(os.path.join(out_dir, "index.json"), encoding="utf-8")).get("series", {}).values():
        names[s.get("file")] = s.get("title") or s.get("series") or ""
except FileNotFoundError:
    pass
for f in sorted(glob.glob(os.path.join(out_dir, "inducks-*.json"))):
    issues = json.load(open(f, encoding="utf-8")).get("issues", {})
    for k, x in issues.items():
        t = x.get("t") or (names.get(os.path.basename(f), "") if len(issues) == 1 else "")
        if t:
            rows.append([os.path.basename(f), k, t, x.get("d") or "", x.get("pr") or ""])
json.dump({"titles": rows}, open(os.path.join(out_dir, "titles.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"titles.json: {len(rows):,} titled issues, {os.path.getsize(os.path.join(out_dir, 'titles.json'))/1024:,.0f} KB")
