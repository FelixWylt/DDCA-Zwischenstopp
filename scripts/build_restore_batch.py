"""Build one Restore file (Backup > Restore) from the price lists waiting in catalogue/restore-batch.json.
The file has no comics: Restore adds the price ranges, removes a series' old ranges where "replace" is set,
and sets series settings from "patch". Usage: python3 scripts/build_restore_batch.py > prices-restore.json"""
import json, re, sys, uuid, datetime, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUR = lambda t, d: "EUR" if re.search(r"€|eur", t, re.I) else "SEK" if re.search(r"\bkr\b|sek", t, re.I) else "CHF" if re.search(r"chf|fr\.", t, re.I) else d
num = lambda x: float(x.replace(",", ".")) if "." in x or "," in x else int(x)

def rules(sid, text, cur, note):
    out, ed_rows = [], {}
    for line in text.splitlines():
        line = line.strip()
        if not line: continue
        m = re.match(r"^(\d{1,4})\s+(?![-–:=])(.*\S)\s+(\d[\d.,]*)\s*(€|EUR|Euro|kr|SEK|CHF|Fr\.)\s*$", line, re.I)
        if m:   # "12 Asterix (1. Auflage) 8 €": one issue of one edition
            ed = (re.search(r"\(([^()]*)\)\s*[A-Za-zÄÖÜäöü/ .-]{0,24}$", m.group(2)) or [None, ""])[1]
            ed_rows.setdefault(ed, []).append((int(m.group(1)), num(m.group(3)), CUR(m.group(4), cur))); continue
        m = re.match(r"^(\d{4}(?:/\d{1,3})?|\d{1,5})?\s*([-–])?\s*(\d{4}(?:/\d{1,3})?|\d{1,5})?\s*[:=]\s*([\d.,]+)\s*(€|eur|kr|sek|chf|fr\.?)?$", line, re.I)
        if not m or not (m.group(1) or m.group(3)): sys.exit("can't read line: " + line)
        a, dash, b = m.group(1) or "", m.group(2), m.group(3) or ""
        out.append(dict(frm=a, to=b if dash else a, price=num(m.group(4)), cur=CUR(m.group(5) or "", cur), ed=""))
    for ed, rows in ed_rows.items():   # merge neighbouring issues with the same price into one range
        rows.sort(); run = None
        for n, p, c in rows:
            if run and run["price"] == p and run["cur"] == c and int(run["to"]) == n - 1: run["to"] = str(n); continue
            run = dict(frm=str(n), to=str(n), price=p, cur=c, ed=ed); out.append(run)
    return [{"id": uuid.uuid4().hex, "s": sid, "from": r["frm"], "to": r["to"], "price": r["price"], "cur": r["cur"], "note": note, "ed": r["ed"]} for r in out]

batch = json.load(open(os.path.join(ROOT, "catalogue/restore-batch.json")))
sugg = json.load(open(os.path.join(ROOT, "catalogue/prices.json")))["series"]
vr, rep, patch = [], [], {}
for e in batch["series"]:
    sg = sugg[e["sugg"]]
    vr += rules(e["id"], sg["text"], sg["cur"], "Claude, " + sg["date"])
    if e.get("replace"): rep.append(e["id"])
    if e.get("patch"): patch[e["id"]] = e["patch"]
json.dump({"app": "dagobert-archiv", "format": 1, "kind": "prices", "exported": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
           "comics": [], "valueRules": vr, "valueRulesReplace": rep, "seriesPatch": patch}, sys.stdout, ensure_ascii=False, indent=1)
