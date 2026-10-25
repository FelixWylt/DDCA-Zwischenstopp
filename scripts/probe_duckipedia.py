"""One-off probe: learn Duckipedia's page names, page layout, licence and API access. Output goes to probe/."""
import json, urllib.request, urllib.parse, os, time
UA = {"User-Agent": "DagobertDucksArchiv-probe (+https://github.com/FelixWylt/DDCA-Zwischenstopp)"}
os.makedirs("probe", exist_ok=True)
out = {}
def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except Exception as e:
        return getattr(e, "code", 0), dict(getattr(e, "headers", {}) or {}), str(e)
api = None
for cand in ["https://de.duckipedia.org/api.php", "https://de.duckipedia.org/w/api.php"]:
    st, h, body = get(cand + "?action=query&meta=siteinfo&siprop=general|rightsinfo&format=json&origin=*")
    out[cand] = {"status": st, "cors": h.get("Access-Control-Allow-Origin") or h.get("access-control-allow-origin"), "body": body[:1500]}
    if st == 200 and body.lstrip().startswith("{"): api = cand; break
out["api"] = api
st, h, body = get("https://de.duckipedia.org/robots.txt"); out["robots"] = body[:2000]
def wikitext(title):
    st, h, body = get(api + "?action=parse&prop=wikitext&format=json&formatversion=2&redirects=1&origin=*&page=" + urllib.parse.quote(title))
    try: j = json.loads(body); return j.get("parse", {}).get("title"), j.get("parse", {}).get("wikitext")
    except Exception: return None, None
if api:
    for t in ["Duckipedia:Lizenzbestimmungen", "Micky Maus Comics 100", "LTB 474", "Lustiges Taschenbuch 474", "LTB 17",
              "MM 29/1965", "Micky Maus 29/1965", "MM 22/1979", "TGDD 378", "Die tollsten Geschichten von Donald Duck 378",
              "LTB Spezial 67", "LTB Maus-Edition 6", "Entenhausen-Edition 51", "Der Glücksgroschen"]:
        title, text = wikitext(t)
        out["page:" + t] = {"resolved": title, "length": len(text or "")}
        if text:
            open("probe/" + "".join(c if c.isalnum() else "_" for c in t) + ".txt", "w", encoding="utf-8").write(text[:60000])
        time.sleep(1)
    for q in ["LTB 47", "MM 29/", "TGDD 3", "LTB Spezial", "Micky Maus Magazin"]:
        st, h, body = get(api + "?action=query&list=prefixsearch&pslimit=15&format=json&origin=*&pssearch=" + urllib.parse.quote(q))
        out["prefix:" + q] = body[:1500]; time.sleep(1)
    st, h, body = get(api + "?action=query&list=categorymembers&cmlimit=20&format=json&origin=*&cmtitle=" + urllib.parse.quote("Kategorie:LTB"))
    out["cat:LTB"] = body[:1500]
json.dump(out, open("probe/summary.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({k: (v if isinstance(v, str) else v) for k, v in out.items()}, ensure_ascii=False)[:3000])
