// Probe (2026-11-22): can the app read the Grand Comics Database API and its cover pictures (CORS)?
const H = { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", "Origin": "https://felixwylt.github.io", "Accept": "application/json" };
const get = async u => { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); const t = await r.text(); return { status: r.status, acao: r.headers.get("access-control-allow-origin"), ct: r.headers.get("content-type"), len: t.length, t }; } catch (e) { return { ERR: e.message }; } };
const show = async (lab, u, n = 700) => { const x = await get(u); console.log("\n==", lab, u, "\n", x.status, "ACAO:", x.acao, x.ct, x.len, x.ERR || ""); if (x.t) console.log(x.t.slice(0, n)); return x; };
await show("api root", "https://www.comics.org/api/");
const s = await show("series by name", "https://www.comics.org/api/series/name/Spindelmannen/?format=json", 2500);
await show("issue", "https://www.comics.org/api/issue/104731/?format=json", 1500);
await show("search page", "https://www.comics.org/searchNew/?q=Spindelmannen&search_object=series", 300);
const m = s.t && s.t.match(/https?:[^"]*files1\.comics\.org[^"]*/);
const img = m ? m[0] : "https://files1.comics.org//img/gcd/covers_by_id/104/w400/104731.jpg";
const i = await get(img); console.log("\n== image", img, i.status, "ACAO:", i.acao, i.ct, i.len, i.ERR || "");
