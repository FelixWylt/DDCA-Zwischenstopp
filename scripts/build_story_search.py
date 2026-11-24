#!/usr/bin/env python3
"""Every INDUCKS comic story, for the app's "All INDUCKS" search (da-v239).

Usage: build_story_search.py <isv-dir> <catalogue-dir>

Writes
  story-search.txt        one line per comic story (kind "n": stories and gags; no covers, illustrations, articles):
                          code TAB de TAB sv TAB en TAB it TAB original title TAB writers TAB artists TAB heroes TAB pages TAB year TAB lang
                          titles: the most used title in that language (empty when there is none or it equals the original);
                          writers/artists/heroes: indexes into the lists in story-search-meta.json
  story-search-meta.json  built, people [names], heroes [[de, sv, en, it]], pubs [[code, title, lang, catalogue file or ""]], shards
  story-print/NN.json     printings in German, Swedish, English and Italian, split by story code (shard = sum of the code's
                          character codes % SHARDS, the app computes the same): {code: [[pub index, issue number, year], ...]}
Only the standard library; every ISV table is streamed.
Data: I.N.D.U.C.K.S. (https://inducks.org), used under the Inducks licence.
"""
import json, os, re, sys, glob, datetime
from collections import Counter

isv_dir, out_dir = sys.argv[1], sys.argv[2]
LANGS = ["de", "sv", "en", "it"]
SHARDS = 64

def rows(table, wanted):
    with open(os.path.join(isv_dir, table + ".isv"), encoding="utf-8", errors="replace", newline="") as fh:
        header = fh.readline().rstrip("\r\n").split("^")
        if header and header[-1] == "": header.pop()
        miss = [c for c in wanted if c not in header]
        if miss: print(f"  ! {table}: columns not found: {miss} (have: {header})")
        idx = [(c, header.index(c)) for c in wanted if c in header]
        for line in fh:
            r = line.rstrip("\r\n").split("^")
            yield {c: (r[i] if i < len(r) else "") for c, i in idx}

clean = lambda s: re.sub(r"[\t\r\n]+", " ", (s or "").replace("\\,", ",")).strip()
norm = lambda c: re.sub(r"\s+", " ", c or "").strip()

# comic story versions -> story
sv_story, pages, first_sv = {}, {}, {}
for r in rows("inducks_storyversion", ["storyversioncode", "storycode", "kind", "entirepages"]):
    if r["kind"] != "n" or not r["storycode"]: continue
    sc = r["storycode"]; sv_story[r["storyversioncode"]] = sc; first_sv.setdefault(sc, r["storyversioncode"])
    try: pages[sc] = max(pages.get(sc, 0), int(float(r["entirepages"] or 0)))
    except ValueError: pass
print(f"comic stories: {len(first_sv):,}")

pubs = {r["publicationcode"]: (r["languagecode"], clean(r["title"])) for r in rows("inducks_publication", ["publicationcode", "languagecode", "title"])}
issue = {}
for r in rows("inducks_issue", ["issuecode", "publicationcode", "issuenumber", "oldestdate"]):
    issue[r["issuecode"]] = (r["publicationcode"], r["issuenumber"].strip(), r["oldestdate"][:4] if re.match(r"\d{4}", r["oldestdate"] or "") else "")

heroes = {}
for r in rows("inducks_herocharacter", ["storycode", "charactercode", "number"]):
    if r["storycode"] in first_sv and r["charactercode"]:
        heroes.setdefault(r["storycode"], []).append((r["number"] or "9", r["charactercode"]))
hero_codes = sorted({c for v in heroes.values() for _, c in v})
hero_ix = {c: i for i, c in enumerate(hero_codes)}
cname = {}
for r in rows("inducks_charactername", ["charactercode", "languagecode", "charactername", "preferred"]):
    c, l = r["charactercode"], r["languagecode"]
    if c in hero_ix and l in LANGS and r["charactername"] and ((c, l) not in cname or r["preferred"] == "Y"):
        cname[(c, l)] = clean(r["charactername"])

titles = {}                    # (story, lang) -> Counter of titles
first = {}                     # story -> (year, lang) of the oldest dated printing
prints = {}                    # story -> [(pub, number, year)] in LANGS
# INDUCKS gives some (mostly old Swedish) titles without their hero: "och Atlantidernas skatt". Put the printed hero line in
# front, else the story's main character in that language: "Farbror Joakim och Atlantidernas skatt" (as build_catalogue.py does)
def full_title(t, printed, sc, lang):
    if not t or not t[0].islower(): return t
    name = printed
    if not name:
        hs = sorted(heroes.get(sc, []))
        name = cname.get((hs[0][1], lang), "") if hs else ""
    if not name: return t
    return name + t if t.startswith("s ") else name + " " + t
short_before = 0
for r in rows("inducks_entry", ["issuecode", "storyversioncode", "title", "printedhero"]):
    sc = sv_story.get(r["storyversioncode"])
    if not sc: continue
    i = issue.get(r["issuecode"])
    if not i: continue
    pub, num, year = i; lang = (pubs.get(pub) or ("", ""))[0]
    if year and (sc not in first or year < first[sc][0]): first[sc] = (year, lang)
    if lang in LANGS:
        t = clean(r["title"])
        if t and t[0].islower(): short_before += 1
        t = full_title(t, clean(r["printedhero"]), sc, lang)
        if t: titles.setdefault((sc, lang), Counter())[t] += 1
        p = prints.setdefault(sc, [])
        if not any(x[0] == pub and x[1] == num for x in p): p.append((pub, num, year))
print(f"titles starting with a small letter: {short_before:,} printings before the hero fix")
print(f"stories printed in {'/'.join(LANGS)}: {len(prints):,}, printings: {sum(len(v) for v in prints.values()):,}")

orig_title, first_date = {}, {}
for r in rows("inducks_story", ["storycode", "title", "firstpublicationdate"]):
    if r["storycode"] in first_sv:
        orig_title[r["storycode"]] = clean(r["title"])
        if re.match(r"\d{4}", r.get("firstpublicationdate") or ""): first_date[r["storycode"]] = r["firstpublicationdate"][:4]

jobs = {}
want_sv = set(first_sv.values())
for r in rows("inducks_storyjob", ["storyversioncode", "personcode", "plotwritartink"]):
    if r["storyversioncode"] in want_sv and r["personcode"].strip() not in ("", "?"):
        jobs.setdefault(sv_story[r["storyversioncode"]], []).append((r["plotwritartink"], r["personcode"]))
need = {p for v in jobs.values() for _, p in v}
pname = {r["personcode"]: clean(r["fullname"]) or r["personcode"] for r in rows("inducks_person", ["personcode", "fullname"]) if r["personcode"] in need}
people, pix = [], {}
def person(p):
    n = pname.get(p, p)
    if n not in pix: pix[n] = len(people); people.append(n)
    return pix[n]
def role_ix(sc, roles):
    out = []
    for role, p in jobs.get(sc, []):
        if role in roles and pname.get(p, p) not in ("", "?"):
            i = person(p)
            if i not in out: out.append(i)
    return ",".join(map(str, out[:4]))

lines = []
for sc in sorted(first_sv, key=lambda s: s.lower()):
    o = orig_title.get(sc, "")
    ts = []
    for l in LANGS:
        c = titles.get((sc, l)); t = c.most_common(1)[0][0] if c else ""
        ts.append("" if t == o else t)
    hs = ",".join(str(hero_ix[c]) for _, c in sorted(heroes.get(sc, []))[:3])
    year = first_date.get(sc) or (first.get(sc) or ("", ""))[0]
    lang = (first.get(sc) or ("", ""))[1]
    lines.append("\t".join([norm(sc)] + ts + [o, role_ix(sc, "pw"), role_ix(sc, "ai"), hs, str(pages.get(sc) or ""), year, lang]))

index = json.load(open(os.path.join(out_dir, "index.json"), encoding="utf-8"))
cat_file = {e.get("code"): e.get("file") for e in index.get("series", {}).values() if e.get("code")}
pub_list, pub_ix = [], {}
shards = [dict() for _ in range(SHARDS)]
for sc, ps in prints.items():
    code = norm(sc); arr = []
    for pub, num, year in sorted(ps, key=lambda x: (x[2] or "9999", x[0])):
        if pub not in pub_ix:
            pub_ix[pub] = len(pub_list); l, t = pubs.get(pub, ("", "")); pub_list.append([pub, t, l, cat_file.get(pub, "")])
        arr.append([pub_ix[pub], num, year])
    shards[sum(ord(ch) for ch in code) % SHARDS][code] = arr

left = sum(1 for l in lines for t in l.split("\t")[1:5] if t and t[0].islower())
print(f"titles in the list still starting with a small letter: {left:,}")
with open(os.path.join(out_dir, "story-search.txt"), "w", encoding="utf-8") as fh: fh.write("\n".join(lines) + "\n")
meta = {"built": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"), "source": "I.N.D.U.C.K.S. (https://inducks.org)",
        "langs": LANGS, "shards": SHARDS, "people": people,
        "heroes": [(lambda ns: ns if any(ns) else [c, "", "", ""])([cname.get((c, l), "") for l in LANGS]) for c in hero_codes], "heroCodes": hero_codes, "pubs": pub_list}
json.dump(meta, open(os.path.join(out_dir, "story-search-meta.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
pd = os.path.join(out_dir, "story-print"); os.makedirs(pd, exist_ok=True)
for f in glob.glob(os.path.join(pd, "*.json")): os.remove(f)
for n, sh in enumerate(shards):
    json.dump(sh, open(os.path.join(pd, f"{n:02d}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
size = lambda p: os.path.getsize(p) / 1024
print(f"story-search.txt: {len(lines):,} stories, {size(os.path.join(out_dir, 'story-search.txt')):,.0f} KB; "
      f"meta {size(os.path.join(out_dir, 'story-search-meta.json')):,.0f} KB; story-print: {sum(size(p) for p in glob.glob(os.path.join(pd, '*.json'))):,.0f} KB in {SHARDS} files")
