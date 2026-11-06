import { chromium } from "playwright";
const b = await chromium.launch(); const q = await b.newPage();
await q.goto("https://www.seriekatalogen.se/magazine/kalle-ankas-pocket", { timeout: 45000 }); await q.waitForTimeout(5000);
const t = await q.innerText("body");
const i = t.search(/\n\s*1\s/);
console.log("LEN", t.length); console.log(t.slice(3300, 9000));
// copy as a user would: the table text
const tab = await q.evaluate(() => [...document.querySelectorAll("table")].map(x => x.innerText.slice(0, 2500)).join("\n=====TABLE=====\n"));
console.log("\n#### TABLES\n" + tab.slice(0, 5000));
await b.close();
