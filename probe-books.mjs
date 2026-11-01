import { chromium } from "playwright";
const b = await chromium.launch(); const p = await b.newPage();
await p.goto("http://localhost:8080/probe.html");
const out = await p.evaluate(async () => {
  const i = "9781902407449", lines = [];
  const get = async u => { try { return await (await fetch(u)).text(); } catch (e) { return "ERR " + e.message; } };
  lines.push("OL: " + (await get("https://openlibrary.org/api/books?jscmd=data&format=json&bibkeys=ISBN:" + i)).slice(0, 700));
  lines.push("LIBRIS 100/700/245: " + ((await get("https://libris.kb.se/xsearch?format=marcxml&n=1&query=isbn:" + i)).match(/tag="(100|245|700)"[\s\S]*?<\/datafield>/g) || []).map(x => x.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).join(" | "));
  const L = await Books.lookupIsbn(i); lines.push("LOOKUP " + JSON.stringify(L.data).slice(0, 700) + " | " + L.sources);
  return lines.join("\n");
});
console.log(out); await b.close();
