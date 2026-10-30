// Duckipedia connection: fetches German issue pages on request and reads issue + story details.
// Duckipedia texts are under the GNU FDL 1.2; every saved result keeps the page address and authors link.
(function (root) {
  "use strict";
  const BASE = "https://de.duckipedia.org/";
  const API = BASE + "api.php";

  // page names per series (by INDUCKS publication code); {n} = issue number, {y} = year, {nn} = 2-digit number
  const PAGES = {
    "de/LTB": ["LTB {n}"], "de/LTBSP": ["LTB Spezial {n}"], "de/LTBM": ["LTB Maus-Edition {n}"],
    "de/LTBEX": ["LTB Exklusiv {n}"], "de/LTBGA": ["LTB Galaxy {n}"], "de/TGDD": ["TGDD {n}", "DDSH {n}"],
    "de/EEDCB": ["Entenhausen-Edition {n}", "Barks Library {n}"], "de/MMC": ["Micky Maus Comics {n}", "MMC {n}"],
    "de/MMP": ["Micky Maus präsentiert {n}", "MMP {n}"], "de/MMM": ["Mega Micky Maus {n}"],
    "de/MM": ["MM {n}/{y}", "Micky Maus {n}/{y}", "MM {y}/{nn}"]
  };
  function candidates(series, comic) {
    if (!series || !comic) return [];
    const code = series.code || "";
    const disney = !series.publisher || series.publisher === "Disney";   // Duckipedia covers Disney comics only
    const german = code.startsWith("de/") || (disney && (String(series.country || "").toUpperCase() === "DE" || /german/i.test(comic.lang || "")));
    if (!german) return [];
    const lab = String(comic.issueLabel || comic.issue || "");
    let m = /^(\d{4})\/(\d{1,3})$/.exec(lab), y = "", n = "";
    if (m) { y = m[1]; n = String(+m[2]); } else if (/^\d+$/.test(lab)) n = String(+lab); else return [];
    const pats = (PAGES[code] || []).concat(m ? [] : [series.name + " {n}"].concat(series.short ? [series.short + " {n}"] : []));
    return [...new Set(pats.filter(p => !p.includes("{y}") || y).map(p => p.replace("{n}", n).replace("{y}", y).replace("{nn}", String(n).padStart(2, "0"))))];
  }

  // ---- wikitext helpers ----
  function clean(t) {
    return String(t || "")
      .replace(/<ref[^>]*\/>/gi, "").replace(/<ref[\s\S]*?<\/ref>/gi, "").replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]+>/g, "")
      .replace(/\{\{(?:sc|I)\|([^{}]*)\}\}/gi, "$1").replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/\[\[(?:Datei|File|Bild|Kategorie|Category):[^\]]*\]\]/gi, "")
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1").replace(/\[\[([^\]]*)\]\]/g, "$1")
      .replace(/\[https?:\/\/\S+\s([^\]]*)\]/g, "$1").replace(/\[https?:\/\/\S+\]/g, "")
      .replace(/'{2,}/g, "").replace(/&nbsp;/g, " ").replace(/[ \t]+/g, " ").replace(/,(\s*,)+/g, ",").replace(/:\s*,/g, ":").replace(/(,\s*)+$/, "").replace(/^\s*,\s*/, "").trim();
  }
  function splitTop(body) {   // split a template body on "|" that is not inside {{ }} or [[ ]]
    const parts = []; let depth = 0, cur = "";
    for (let i = 0; i < body.length; i++) {
      const two = body.substr(i, 2);
      if (two === "{{" || two === "[[") { depth++; cur += two; i++; continue; }
      if ((two === "}}" || two === "]]") && depth) { depth--; cur += two; i++; continue; }
      if (body[i] === "|" && depth === 0) { parts.push(cur); cur = ""; continue; }
      cur += body[i];
    }
    parts.push(cur); return parts;
  }
  function infobox(text) {
    const i = text.search(/\{\{\s*Infobox/i); if (i < 0) return {};
    let depth = 0, j = i;
    for (; j < text.length; j++) {
      if (text.substr(j, 2) === "{{") { depth++; j++; } else if (text.substr(j, 2) === "}}") { depth--; j++; if (!depth) break; }
    }
    const body = text.slice(i + 2, j - 1), out = {};
    splitTop(body).slice(1).forEach(p => { const k = p.indexOf("="); if (k > 0) out[p.slice(0, k).trim().toUpperCase()] = p.slice(k + 1).trim(); });
    return out;
  }
  const pick = (box, keys) => { for (const k of keys) if (box[k] && clean(box[k])) return box[k]; return ""; };
  const LABELS = [
    [/^(originaltitel|englischer titel|original(titel)?|italienischer titel|dänischer titel)$/, "original"],
    [/^(story|skript|autor|text|idee|plot|comicautor)$/, "writer"],
    [/^(zeichnungen?|zeichner|comiczeichner)$/, "artist"], [/^(übersetzung|übersetzer)$/, "translator"],
    [/^(vorkommende )?figuren$/, "characters"], [/^(seiten|seitenanzahl|seitenzahl)$/, "pages"],
    [/^erstveröffentlichung$/, "first"], [/^(produktionsjahr|erstellungsjahr)$/, "year"], [/^genre$/, "genre"],
    [/^nachdruck aus$/, "reprintFrom"], [/^nachgedruckt in$/, "reprintedIn"],
    [/^(erstveröffentlichung in deutschland|deutsche erstveröffentlichung)$/, "firstDe"],
    [/^storycode$/, "code"]
  ];
  function parsePage(title, text) {
    const box = infobox(text);
    const bes = pick(box, ["BES", "BESONDERHEITEN"]);
    const issue = {
      title: clean(pick(box, ["LTBTITEL", "TITEL", "NEU"])),
      date: clean(pick(box, ["EDATUM", "ERSCH NEU", "ERSCH", "DATUM", "ERSCHEINUNGSDATUM"])),
      price: clean(pick(box, ["PREIS", "PREIS NEU"])),
      editor: clean(pick(box, ["CRED", "CHEF", "RED", "REDAKTION"])),
      translator: clean(pick(box, ["UEB", "ÜBERSETZER", "ÜBERSETZUNG"])),
      pages: clean(pick(box, ["PAG", "SEITEN NEU", "SEITEN"])),
      isbn: clean(pick(box, ["ISBN"])),
      notes: bes.split(/\n\s*\*|^\s*\*/).map(clean).filter(Boolean).join(" · ")
    };
    const sec = /^==\s*(?:\[\[)?\s*(Inhalt|Geschichten)\b[^\n]*==\s*$/mi.exec(text);
    const stories = [];
    if (sec) {
      let rest = text.slice(sec.index + sec[0].length);
      const end = rest.search(/^==[^=]/m); if (end >= 0) rest = rest.slice(0, end);
      const parts = rest.split(/^===\s*(.*?)\s*===\s*$/m);
      for (let k = 1; k < parts.length; k += 2) {
        const head = clean(parts[k]), body = parts[k + 1] || "", st = { title: head };
        const ic = /\{\{\s*I\s*\|([^}]*)\}\}/i.exec(body); if (ic) st.code = ic[1].trim();
        const plot = [];
        body.split("\n").forEach(line => {
          const l = line.trim();
          if (/^\*[^*]/.test(l)) {
            const c = l.indexOf(":"); if (c < 0) return;
            const label = clean(l.slice(1, c)).toLowerCase(), val = clean(l.slice(c + 1));
            const hit = LABELS.find(([re]) => re.test(label));
            if (hit && val) st[hit[1]] = st[hit[1]] ? st[hit[1]] + ", " + val : val;
          } else if (l && !/^(\{\{|\[\[(Datei|File|Bild)|\{\||\||!|__)/i.test(l)) {
            const p = clean(l); if (p.length > 20) plot.push(p);
          }
        });
        if (plot.length) st.plot = plot.join("\n\n").slice(0, 2500);
        if ((st.code || st.writer || st.artist) && !(!st.code && /^(seite|seiten|inhaltsverzeichnis|impressum|cover|leserseite)/i.test(head))) stories.push(st);
      }
    }
    const slug = title.replace(/ /g, "_");
    return { page: title, url: BASE + encodeURIComponent(slug).replace(/%2F/g, "/"),
             authors: BASE + "index.php?title=" + encodeURIComponent(slug) + "&action=history",
             fetched: new Date().toISOString().slice(0, 10), issue, stories };
  }

  async function api(params) {
    const url = API + "?" + new URLSearchParams(Object.assign({ format: "json", formatversion: "2", origin: "*" }, params));
    const r = await fetch(url, { headers: { "Api-User-Agent": "DagobertDucksArchiv/1.0 (personal collection app)" } });
    if (!r.ok) throw new Error("Duckipedia answered " + r.status);
    return r.json();
  }
  // returns parsed details, or null when there is no page for this issue
  async function fetchIssue(series, comic) {
    const cands = candidates(series, comic); if (!cands.length) return null;
    const q = await api({ action: "query", titles: cands.join("|"), redirects: "1" });
    const pages = (q.query && q.query.pages) || [];
    const found = cands.map(c => {
      const norm = ((q.query.normalized || []).find(x => x.from === c) || {}).to || c;
      const red = ((q.query.redirects || []).find(x => x.from === norm) || {}).to || norm;
      return pages.find(p => p.title === red && !p.missing && !p.invalid);
    }).find(Boolean);
    if (!found) return null;
    const p = await api({ action: "parse", page: found.title, prop: "wikitext", redirects: "1" });
    if (!p.parse) return null;
    return parsePage(p.parse.title, p.parse.wikitext || "");
  }

  const key = c => String(c || "").replace(/\s+/g, "").toLowerCase();
  // merges Duckipedia details into a comic; INDUCKS stories are kept and enriched by story code
  function merge(comic, d) {
    const out = Object.assign({}, comic, { duckipedia: { page: d.page, url: d.url, authors: d.authors, fetched: d.fetched, issue: d.issue } });
    const stories = (comic.stories || []).map(s => Object.assign({}, s));
    const byCode = {}; stories.forEach((s, i) => { if (s.code) byCode[key(s.code)] = i; });
    const extra = s => ({ dTitle: s.title, original: s.original || "", translator: s.translator || "", characters: s.characters || "",
                          genre: s.genre || "", plot: s.plot || "", first: s.first || "", firstDe: s.firstDe || "",
                          reprintFrom: s.reprintFrom || "", reprintedIn: s.reprintedIn || "" });
    const fromClz = !stories.some(s => s.code);
    if (fromClz && d.stories.length) {
      out.stories = d.stories.map(s => Object.assign({ title: s.title, code: s.code || "", writer: s.writer || "", artist: s.artist || "", hero: "" }, extra(s)));
    } else {
      d.stories.forEach(s => {
        const i = s.code != null ? byCode[key(s.code)] : undefined;
        if (i != null) Object.assign(stories[i], extra(s), { title: stories[i].title || s.title });
      });
      out.stories = stories;
    }
    if (!out.title && d.issue.title) out.title = d.issue.title;
    if (!out.pages && d.issue.pages) out.pages = d.issue.pages;
    return out;
  }
  root.Duckipedia = { candidates, parsePage, fetchIssue, merge, clean };
})(typeof window !== "undefined" ? window : globalThis);
