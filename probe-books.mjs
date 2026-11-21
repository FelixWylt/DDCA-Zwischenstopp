// Probe (2026-11-21): can the app (a web page on github.io) read Royal Road / Fullreads pages? Look for CORS headers and what the pages contain.
const H = { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", "Origin": "https://felixwylt.github.io" };
const get = async u => { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); const t = await r.text(); return { status: r.status, acao: r.headers.get("access-control-allow-origin"), len: t.length, t }; } catch (e) { return { ERR: e.message }; } };
const pick = (t, re) => [...t.matchAll(re)].slice(0, 12).map(m => m[1].replace(/\s+/g, " ").trim());
const s = await get("https://www.royalroad.com/fictions/search?title=" + encodeURIComponent("I swear I'm not a dark lord"));
console.log("RR search", s.status, "ACAO:", s.acao, s.len, s.ERR || "");
const links = s.t ? pick(s.t, /href="(\/fiction\/\d+\/[^"\/]+)"/g) : [];
console.log("links", links.slice(0, 5));
if (links[0]) {
  const f = await get("https://www.royalroad.com" + links[0]);
  console.log("RR fiction", f.status, "ACAO:", f.acao, f.len);
  console.log("og:", pick(f.t, /<meta property="(?:og|books):[^"]*" content="([^"]*)"/g));
  console.log("author:", pick(f.t, /<h4[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g).slice(0, 2));
  console.log("stats:", pick(f.t, /<li class="bold uppercase[^"]*">([^<]*)<\/li>/g));
  console.log("pages:", pick(f.t, /([\d,]+)\s*Pages/gi).slice(0, 3), "words:", pick(f.t, /([\d,]+)\s*words/gi).slice(0, 3));
  console.log("chapters:", (f.t.match(/class="chapter-row"/g) || []).length, "volumes:", pick(f.t, /data-volume-id="(\d+)"/g).length, pick(f.t, /"volumeId":(\d+)/g).length, pick(f.t, /class="volume[^"]*"[^>]*>([^<]{0,80})/g).slice(0, 8));
  console.log("ld+json:", pick(f.t, /<script type="application\/ld\+json">([\s\S]{0,600})/g).slice(0, 1));
}
const p = await get("https://www.fullreads.com/literature/the-lottery/");
console.log("Fullreads", p.status, "ACAO:", p.acao, p.len, p.ERR || "");
if (p.t) { console.log("title:", pick(p.t, /<title>([^<]*)/g), "og:", pick(p.t, /<meta property="og:[^"]*" content="([^"]*)"/g).slice(0, 4), "author:", pick(p.t, /(?:by|author)[^<]{0,5}<[^>]*>([^<]{3,40})</gi).slice(0, 3)); const body = p.t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " "); console.log("words on page ≈", body.split(/\s+/).filter(Boolean).length); }
