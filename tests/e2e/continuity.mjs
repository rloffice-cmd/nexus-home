import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
const errors = [], steps = [];
const step = s => { steps.push(s); console.log("· " + s); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => navigator.serviceWorker.ready.then(()=>true));
await page.click("text=צפה בהדגמה");
await page.waitForSelector("nav button");

// ---- 1. עדכון אופטימי + ביטול: המצב חייב לחזור בדיוק ----
await page.click('.hviews button:has-text("הכל")').catch(()=>{});
await page.waitForTimeout(150);
const countOpen = () => page.evaluate(() => (D.tasks||[]).filter(t=>t.status==="open"||t.status==="waiting").length);
const n0 = await countOpen();
const row = await page.$('.row[onclick^="openTask"]');
if (row) {
  await row.click(); await page.waitForSelector(".sheet.on");
  await page.click('.sheet .btn:has-text("בוצע")');
  await page.waitForTimeout(200);
  const n1 = await countOpen();
  if (n1 !== n0 - 1) errors.push(`"בוצע" לא הוריד משימה: ${n0} → ${n1}`);
  const undo = await page.$("#toast .u");
  const visible = undo && await undo.isVisible();
  if (!visible) errors.push("כפתור הביטול לא מוצג אחרי סימון בוצע");
  else {
    await undo.click(); await page.waitForTimeout(250);
    const n2 = await countOpen();
    if (n2 !== n0) errors.push(`ביטול לא החזיר את המצב: ${n0} → ${n1} → ${n2}`);
    else step(`עדכון אופטימי וביטול מחזירים את המצב במדויק (${n0}→${n1}→${n2})`);
  }
}

// ---- 2. הטוסט נעלם מעצמו ולא נערם ----
await page.waitForTimeout(5600);
const toastOn = await page.evaluate(() => document.querySelector("#toast").classList.contains("on"));
if (toastOn) errors.push("הטוסט לא נעלם אחרי הזמן הקצוב");
else step("הטוסט נסגר מעצמו");

// ---- 3. שרידות מטמון: מפתח קיים + אין רשת => נתונים מהמטמון, לא מסך שבור ----
await page.evaluate(() => {
  localStorage.setItem("nx_k3", "demo-key-not-real");
  localStorage.setItem("nx_c3", JSON.stringify({ now:"10:00", arenas:[{id:"a1",name:"זירת מטמון",status:"active"}],
    tasks:[{id:"t1",title:"משימה מהמטמון",status:"open",urgency:"today"}], decisions:[], people:[], commitments:[], followups:[], captures:[], events:[], lessons:[] }));
});
await ctx.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const offlineText = await page.$eval("body", el => el.innerText);

// מסך הבית לא מפרט משימות מתוך בחירה (עקרון "הדבר האחד"); הנתונים חייבים
// להיות נגישים בלחיצה מאריח "משימות פתוחות".
await page.click('.vt:has-text("משימות פתוחות")');
await page.waitForSelector(".sheet.on", { timeout: 3000 });
const sheetTxt = await page.$eval("#sheet", el => el.innerText);
if (!/משימה מהמטמון/.test(sheetTxt)) errors.push("נתוני המטמון אינם נגישים מאריח 'משימות פתוחות'");
else step("לא-מקוון: נתוני המטמון האמיתיים נגישים בלחיצה");
await page.click("#ov"); await page.waitForTimeout(200);
if (!/לא מעודכן|מהמטמון/.test(offlineText)) errors.push("אין סימון ברור שהנתונים אינם חיים ולא מעודכנים");
else step("מסומן: נתונים אמיתיים מהמטמון, לא 'הדגמה'");
if (/הדגמה \(נתונים סינתטיים\)/.test(offlineText)) errors.push("נתוני מטמון אמיתיים מסומנים בטעות כהדגמה סינתטית");

// ---- 4. חזרה לרשת ----
await ctx.setOffline(false);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const back = await page.$eval("body", el => el.innerText.slice(0,200));
step("חזרה לרשת: " + back.replace(/\s+/g," ").slice(0,55));

// ---- 5. שימוש ממושך: 120 אינטראקציות רצופות ----
await page.evaluate(() => { localStorage.removeItem("nx_k3"); localStorage.removeItem("nx_c3"); });
await page.reload({ waitUntil: "domcontentloaded" });
await page.click("text=צפה בהדגמה");
await page.waitForSelector("nav button");
const tabs = ["home","arenas","decisions","assets","ask"];
for (let i = 0; i < 120; i++) {
  await page.click(`nav button[data-tab="${tabs[i % 5]}"]`);
  if (i % 7 === 0) { const s = await page.$('.row[onclick]'); if (s) { await s.click(); await page.waitForTimeout(25); await page.click("#ov").catch(()=>{}); } }
  await page.waitForTimeout(12);
}
const heap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize/1048576 : 0);
const nodes = await page.evaluate(() => document.querySelectorAll("*").length);
step(`120 אינטראקציות: זיכרון ${heap.toFixed(1)}MB · ${nodes} אלמנטים ב-DOM`);
if (heap > 150) errors.push(`דליפת זיכרון: ${heap.toFixed(0)}MB`);
if (nodes > 4000) errors.push(`ערימת DOM: ${nodes} אלמנטים`);
const alive = await page.$eval("#main", el => el.innerText.trim().length);
if (alive < 30) errors.push("האפליקציה ריקה אחרי שימוש ממושך");
else step("האפליקציה מגיבה ומלאה גם אחרי 120 אינטראקציות");

console.log("\n===== תוצאה =====");
if (errors.length) { console.log(errors.map(e=>"  ✗ "+e).join("\n")); await browser.close(); process.exit(1); }
console.log(`  ✓ ${steps.length} בדיקות המשכיות עברו`);
await browser.close();
