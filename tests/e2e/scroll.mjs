import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390,height:844},locale:"he-IL"});
const p = await ctx.newPage();
await p.goto((process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html",{waitUntil:"domcontentloaded"});
await p.click("text=צפה בהדגמה"); await p.waitForSelector("nav button");
const issues=[];
// גלילה עמוקה ואז מעבר טאב — חייב לחזור לראש
await p.click('nav button[data-tab="assets"]'); await p.waitForTimeout(200);
await p.evaluate(()=>window.scrollTo(0,1200)); await p.waitForTimeout(300);
const deep = await p.evaluate(()=>window.scrollY);
await p.click('nav button[data-tab="home"]'); await p.waitForTimeout(300);
const after = await p.evaluate(()=>window.scrollY);
console.log(`· גלילה לעומק ${deep}px, אחרי מעבר טאב: ${after}px`);
if (after > 10) issues.push(`מעבר טאב לא חוזר לראש הדף (${after}px)`);
// הכפתור הצף נעלם בגלילה למטה וחוזר בגלילה למעלה
await p.click('nav button[data-tab="assets"]'); await p.waitForTimeout(200);
await p.evaluate(()=>window.scrollTo(0,600)); await p.waitForTimeout(400);
const tucked = await p.evaluate(()=>document.querySelector("#fab").classList.contains("tucked"));
if(!tucked) issues.push("הכפתור הצף לא נעלם בגלילה למטה");
else console.log("· הכפתור הצף נעלם בגלילה למטה");
await p.evaluate(()=>window.scrollTo(0,200)); await p.waitForTimeout(400);
const back = await p.evaluate(()=>!document.querySelector("#fab").classList.contains("tucked"));
if(!back) issues.push("הכפתור הצף לא חוזר בגלילה למעלה");
else console.log("· הכפתור הצף חוזר בגלילה למעלה");
await b.close();
console.log(issues.length ? issues.map(i=>"  ✗ "+i).join("\n") : "  ✓ הגלילה מתנהגת נכון");

if (issues.length) process.exit(1);
