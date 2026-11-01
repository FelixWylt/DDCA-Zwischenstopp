# Book databases: what do they return for genre and pages? (Spejarens lärling, plus a German and an English book)
import json, urllib.request, urllib.parse, re, xml.etree.ElementTree as ET
UA = {"User-Agent": "Mozilla/5.0 (Linux; Android 14) Mobile", "Origin": "https://felixwylt.github.io"}
def get(url, raw=False):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25)
        b = r.read().decode("utf-8", "replace")
        return (b, r.headers.get("Access-Control-Allow-Origin")) if raw else b
    except Exception as e:
        return (("ERR " + str(e)), None) if raw else "ERR " + str(e)
def sec(t): print("\n=====", t)
q = "spejarens lärling"
sec("LIBRIS xsearch json")
b = get("https://libris.kb.se/xsearch?format=json&n=6&query=" + urllib.parse.quote(q))
isbns = []
try:
    for x in json.loads(b)["xsearch"]["list"]:
        print(json.dumps({k: x.get(k) for k in x if k not in ("identifier",)}, ensure_ascii=False)[:600])
        for i in ([x.get("isbn")] if isinstance(x.get("isbn"), str) else x.get("isbn") or []):
            i = re.sub(r"[^0-9X]", "", i)
            if len(i) == 13 and i not in isbns: isbns.append(i)
except Exception as e: print("parse", e, b[:300])
sec("LIBRIS xsearch marcxml (CORS?)")
b, cors = get("https://libris.kb.se/xsearch?format=marcxml&n=4&query=" + urllib.parse.quote(q), True)
print("CORS:", cors)
try:
    root = ET.fromstring(b.encode())
    for rec in root.iter():
        if rec.tag.endswith("record") and any(c.tag.endswith("datafield") for c in rec):
            out = []
            for f in rec:
                if f.tag.endswith("datafield") and f.get("tag") in ("020", "041", "084", "245", "300", "490", "650", "655", "830"):
                    out.append(f.get("tag") + " " + " ".join("$" + s.get("code") + s.text for s in f if s.text))
                if f.tag.endswith("controlfield") and f.get("tag") == "008": out.append("008 " + (f.text or ""))
            print(" | ".join(out)[:900]); print("--")
except Exception as e: print("parse", e, b[:500])
sec("LIBRIS XL find (json-ld) CORS + extent/genre")
b, cors = get("https://libris.kb.se/find.jsonld?_limit=2&q=" + urllib.parse.quote(q), True)
print("CORS:", cors)
try:
    j = json.loads(b)
    for it in j.get("items", [])[:2]:
        s = json.dumps(it, ensure_ascii=False)
        print("extent:", re.findall(r'"extent"[^\]]{0,200}', s)[:2])
        print("genreForm:", re.findall(r'"genreForm"[^\]]{0,400}', s)[:1])
        print("subject:", re.findall(r'"subject"[^\]]{0,400}', s)[:1])
        print("classification:", re.findall(r'"classification"[^\]]{0,300}', s)[:1])
        print("--")
except Exception as e: print("parse", e, b[:300])
isbns = isbns[:3] + ["9783551354013", "9780439023481"]
for i in isbns:
    sec("ISBN " + i)
    b = get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + i)
    try:
        x = json.loads(b).get("ISBN:" + i) or {}
        print("OL data: pages", x.get("number_of_pages"), "pagination", x.get("pagination"), "subjects", [s["name"] for s in x.get("subjects", [])][:12])
    except Exception as e: print("OL", e, b[:200])
    b = get("https://openlibrary.org/isbn/%s.json" % i)
    try:
        x = json.loads(b); print("OL edition: pages", x.get("number_of_pages"), "pagination", x.get("pagination"), "subjects", x.get("subjects"), "works", x.get("works"))
        for w in x.get("works", [])[:1]:
            wj = json.loads(get("https://openlibrary.org%s.json" % w["key"])); print("OL work subjects:", (wj.get("subjects") or [])[:15])
    except Exception as e: print("OL ed", str(e)[:80], b[:120])
    b = get("https://www.googleapis.com/books/v1/volumes?q=isbn:" + i)
    try:
        for v in json.loads(b).get("items", [])[:1]:
            vi = v["volumeInfo"]; print("Google: pages", vi.get("pageCount"), "categories", vi.get("categories"), "title", vi.get("title"))
            full = json.loads(get(v["selfLink"]))["volumeInfo"]; print("Google full: pages", full.get("pageCount"), "printedPages", full.get("printedPageCount"), "categories", full.get("categories"))
    except Exception as e: print("Google", e, b[:200])
    b = get("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml&maximumRecords=1&query=isbn%3D" + i)
    print("DNB 300:", re.findall(r'tag="300".*?</datafield>', b, re.S)[:1][:1], "\nDNB 650/655:", [re.sub(r"<[^>]+>", " ", m)[:120] for m in re.findall(r'tag="65[05]".*?</datafield>', b, re.S)][:5])
