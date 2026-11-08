#!/usr/bin/env python3
"""Title index for "Find by title": every catalogue issue that has its own title (books, specials, De Luxe ...),
as [file, issue, title, date, price]. Made from the finished catalogue files, so it never needs the INDUCKS export."""
import glob, json, os, sys
out_dir = sys.argv[1] if len(sys.argv) > 1 else "catalogue"
rows = []
for f in sorted(glob.glob(os.path.join(out_dir, "inducks-*.json"))):
    for k, x in json.load(open(f, encoding="utf-8")).get("issues", {}).items():
        if x.get("t"):
            rows.append([os.path.basename(f), k, x["t"], x.get("d") or "", x.get("pr") or ""])
json.dump({"titles": rows}, open(os.path.join(out_dir, "titles.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"titles.json: {len(rows):,} titled issues, {os.path.getsize(os.path.join(out_dir, 'titles.json'))/1024:,.0f} KB")
