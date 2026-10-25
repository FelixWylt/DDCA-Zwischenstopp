#!/usr/bin/env python3
"""Build the Dagobert Ducks Archiv catalogue from the INDUCKS ISV export.

Usage: build_catalogue.py <isv-dir> <catalogue-dir>

Reads catalogue/publications.json, finds each publication in INDUCKS, and writes one
compact JSON file per publication plus index.json and report.txt. Only the standard
library is used and every ISV file is streamed, so memory stays small.
Data: I.N.D.U.C.K.S. (https://inducks.org), used under the Inducks licence.
"""
import json, os, re, sys, unicodedata, datetime, glob, shutil

isv_dir, out_dir = sys.argv[1], sys.argv[2]
report = []
def log(*a):
    line = " ".join(str(x) for x in a); print(line); report.append(line)

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "").casefold())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

def rows(table, wanted_cols):
    """Stream an ISV table, yielding dicts with only the wanted columns."""
    path = os.path.join(isv_dir, table + ".isv")
    with open(path, encoding="utf-8", errors="replace", newline="") as fh:
        header = fh.readline().rstrip("\r\n").split("^")
        if header and header[-1] == "": header.pop()
        missing = [c for c in wanted_cols if c not in header]
        if missing: log(f"  ! {table}: columns not found: {missing} (have: {header})")
        idx = [(c, header.index(c)) for c in wanted_cols if c in header]
        for line in fh:
            r = line.rstrip("\r\n").split("^")
            yield {c: (r[i] if i < len(r) else "") for c, i in idx}

cfg = json.load(open(os.path.join(out_dir, "publications.json"), encoding="utf-8"))
targets = cfg["targets"]

# 1. publications -------------------------------------------------------------------
pubs = {}
for r in rows("inducks_publication", ["publicationcode", "countrycode", "languagecode", "title"]):
    pubs[r["publicationcode"]] = r
log(f"INDUCKS publications: {len(pubs):,}")

def score(p, t):
    return max(score1(p, t, title) for title in (t.get("titles") or [t["title"]]))

def score1(p, t, title):
    if p["countrycode"] != t["country"]: return 0
    a, b = norm(p["title"]), norm(title)
    # exact title, or the INDUCKS title adds words after ours ("Topolino (libretto)"); never the reverse
    s = 100 if a == b else 70 if a.startswith(b + " ") else 0
    return s + (50 if s and t.get("code") == p["publicationcode"] else 0)

chosen = {}
log("\nPUBLICATIONS")
for t in targets:
    if t.get("code") in pubs and pubs[t["code"]]["countrycode"] == t["country"]:
        best = pubs[t["code"]]; how = "code"
    else:
        cands = sorted(((score(p, t), p) for p in pubs.values()), key=lambda x: (-x[0], len(x[1]["title"])))
        cands = [c for c in cands if c[0] > 0][:5]
        if not cands:  # show near misses to help fix the list
            words = set(" ".join(norm(x) for x in (t.get("titles") or [t["title"]])).split()) - {"ltb", "c", "o", "s"}
            near = sorted((p for p in pubs.values() if p["countrycode"] == t["country"] and words & set(norm(p["title"]).split())),
                          key=lambda p: -len(words & set(norm(p["title"]).split())))[:6]
            cands = [(0, p) for p in near]
        best = cands[0][1] if cands and cands[0][0] >= 70 and not (len(cands) > 1 and cands[1][0] == cands[0][0]) else None
        how = "title"
        if not best:
            log(f"  ? {t['series']}: no confident match. Candidates: " + "; ".join(f"{p['publicationcode']} '{p['title']}' ({s})" for s, p in cands))
            continue
    if best["publicationcode"] in chosen:
        log(f"  ! {t['series']}: {best['publicationcode']} is already used for {chosen[best['publicationcode']]['series']}, skipped"); continue
    chosen[best["publicationcode"]] = t
    log(f"  ✓ {t['series']}  →  {best['publicationcode']}  '{best['title']}'  (by {how})")

# 2. issues ---------------------------------------------------------------------------
issues = {}
for r in rows("inducks_issue", ["issuecode", "publicationcode", "issuenumber", "title", "pages", "oldestdate"]):
    if r["publicationcode"] in chosen: issues[r["issuecode"]] = r
log(f"\nissues in chosen publications: {len(issues):,}")

# 3. entries (contents of each issue) -------------------------------------------------
entries = {}
for r in rows("inducks_entry", ["entrycode", "issuecode", "storyversioncode", "position", "title", "printedhero", "part"]):
    if r["issuecode"] in issues: entries.setdefault(r["issuecode"], []).append(r)
svcs = {e["storyversioncode"] for es in entries.values() for e in es if e["storyversioncode"]}
log(f"entries: {sum(len(v) for v in entries.values()):,}, story versions: {len(svcs):,}")

versions = {}
for r in rows("inducks_storyversion", ["storyversioncode", "storycode", "kind", "entirepages"]):
    if r["storyversioncode"] in svcs: versions[r["storyversioncode"]] = r
storycodes = {v["storycode"] for v in versions.values() if v["storycode"]}
stories = {}
for r in rows("inducks_story", ["storycode", "title"]):
    if r["storycode"] in storycodes: stories[r["storycode"]] = r["title"]
jobs = {}
for r in rows("inducks_storyjob", ["storyversioncode", "personcode", "plotwritartink"]):
    if r["storyversioncode"] in svcs and r["personcode"]:
        jobs.setdefault(r["storyversioncode"], []).append((r["plotwritartink"], r["personcode"]))
people_needed = {p for js in jobs.values() for _, p in js}
people = {}
for r in rows("inducks_person", ["personcode", "fullname"]):
    if r["personcode"] in people_needed: people[r["personcode"]] = r["fullname"] or r["personcode"]

# 4. write one file per publication --------------------------------------------------
def label_for(num):
    num = (num or "").strip()
    m = re.fullmatch(r"(\d{4})-(\d{1,3})", num)
    if m: return f"{m[1]}/{int(m[2]):02d}"
    if re.fullmatch(r"\d+", num): return str(int(num))
    return num

def names(pairs, roles):
    seen = []
    for role, p in pairs:
        if role in roles and p.strip() not in ("?", ""):
            n = people.get(p, p)
            if n and n.strip() not in ("?", "") and n not in seen: seen.append(n)
    return ", ".join(seen)

index = {"built": datetime.date.today().isoformat(), "source": "I.N.D.U.C.K.S. (https://inducks.org)",
         "licence": "Data from the Inducks database, used under the Inducks licence (see inducks.org).", "series": {}}
for f in glob.glob(os.path.join(out_dir, "inducks-*.json")): os.remove(f)
log("\nFILES")
for code, t in chosen.items():
    out = {}
    for ic, i in issues.items():
        if i["publicationcode"] != code: continue
        st = []
        for e in sorted(entries.get(ic, []), key=lambda e: e["position"] or ""):
            v = versions.get(e["storyversioncode"]) or {}
            if v.get("kind") != "n": continue          # comic stories only
            js = jobs.get(e["storyversioncode"], [])
            st.append({"c": v.get("storycode", ""), "t": e["title"] or stories.get(v.get("storycode"), ""),
                       "w": names(js, "pw"), "a": names(js, "ai"), "h": e["printedhero"] or "", "p": v.get("entirepages", "")})
        lab = label_for(i["issuenumber"])
        rec = {"ic": ic, "n": i["issuenumber"], "t": i["title"], "d": i["oldestdate"], "pg": i["pages"], "s": st}
        if lab in out and out[lab]["ic"] != ic: lab = f"{lab} ({i['issuenumber']})"
        out[lab] = rec
    fname = "inducks-" + re.sub(r"[^A-Za-z0-9]+", "-", code).strip("-") + ".json"
    json.dump({"code": code, "title": pubs[code]["title"], "issues": out}, open(os.path.join(out_dir, fname), "w", encoding="utf-8"),
              ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(os.path.join(out_dir, fname))
    index["series"][norm(t["series"])] = {"series": t["series"], "code": code, "title": pubs[code]["title"], "file": fname, "issues": len(out)}
    sample = next(iter(sorted(out.items(), key=lambda kv: kv[1]["d"] or "")[len(out)//2:]), None)
    log(f"  {fname}: {len(out):,} issues, {size/1024:,.0f} KB" + (f"  e.g. {sample[0]} = {sample[1]['ic']} {sample[1]['d']} ({len(sample[1]['s'])} stories)" if sample else ""))

json.dump(index, open(os.path.join(out_dir, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for lic in glob.glob(os.path.join(isv_dir, "*icen*")) + glob.glob(os.path.join(isv_dir, "..", "*icen*")):
    shutil.copy(lic, os.path.join(out_dir, "INDUCKS-" + os.path.basename(lic)))
    log(f"licence file copied: {os.path.basename(lic)}")
log("\nfiles in the ISV export: " + ", ".join(sorted(os.path.basename(p) for p in glob.glob(os.path.join(isv_dir, "*")) if not p.endswith(".isv"))))
open(os.path.join(out_dir, "report.txt"), "w", encoding="utf-8").write("\n".join(report) + "\n")
