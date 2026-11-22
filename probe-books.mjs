// Probe (2026-11-22, 2): GCD API (from GitHub) gives cover links; do those pictures show in a real browser page, and can the page copy them (CORS)?
import { chromium } from "playwright";
const H = { "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", "Accept": "application/json" };
const j = async u => { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); return r.ok ? r.json() : { ERR: r.status }; } catch (e) { return { ERR: e.message }; } };
const covers = [];
for (const name of ["Spindelmannen", "Herman Hedning", "Lucky Lukes äventyr"]) {
  const s = await j("https://www.comics.org/api/series/name/" + encodeURIComponent(name) + "/?format=json");
  console.log("\n==", name, s.ERR || ("count " + s.count));
  for (const r of (s.results || []).slice(0, 6)) console.log("  ", r.name, r.year_began, r.country, r.language, "issues", (r.active_issues || []).length, r.api_url);
  const r = (s.results || []).find(x => (x.active_issues || []).length > 5);
  if (r) { const is = await j(r.active_issues[2]); console.log("  issue keys:", Object.keys(is).join(",")); console.log("  issue:", is.series_name, is.number, is.publication_date, "cover:", is.cover); if (is.cover) covers.push(is.cover); }
}
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/index.html").catch(() => {});
for (const u of covers) {
  const res = await p.evaluate(async u => { const img = new Image(); const shown = await new Promise(ok => { img.onload = () => ok(img.naturalWidth + "x" + img.naturalHeight); img.onerror = () => ok("ERROR"); img.src = u; setTimeout(() => ok("timeout"), 20000); });
    let copy = ""; try { const r = await fetch(u); copy = r.status + " " + (await r.blob()).size; } catch (e) { copy = "blocked: " + e.message; } return { shown, copy }; }, u);
  console.log("\n== picture", u, JSON.stringify(res));
}
await b.close();
