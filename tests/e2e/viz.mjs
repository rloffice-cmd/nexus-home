// גרפים וטיפוס על העץ. הבדיקות כאן נכתבו מול הכשלים שהתגלו בפועל בבנייה:
// · setHomeView לא עבר דרך render(), ולכן שכבת הריחוף לא חוברה בדיוק
//   בעדשה שכולה גרפים — הגרף נראה תקין ולא הגיב.
// · מקטע מוערם בגובה 16px היה יעד לחיצה, והכפתור הצף כיסה אותו.
// · טיפוס לעומק בלי חזרה הוא מלכודת: יורדים ולא יודעים לחזור.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
const issues = [], notes = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "he-IL" });
const page = await ctx.newPage();
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.click("text=צפה בהדגמה");
await page.waitForSelector("nav button");

// 1. סדרת זמן. ההדגמה לא מחזיקה מספיק ימים, ולכן מוזרקת היסטוריה אמיתית
//    בצורתה — הגרף אמור להופיע רק כשיש ממה לצייר עקומה.
const before = await page.evaluate(() => { setHomeView("viz"); return !!document.querySelector(".vzarea"); });
if (before) issues.push("גרף הזמן נוצר גם בלי מספיק היסטוריה (הדגמה)");
else notes.push("בלי מספיק ימים אין גרף זמן — נכון");

await page.evaluate(() => {
  const ev = [], now = Date.now();
  for (let d = 20; d >= 0; d--) {
    const n = Math.max(0, Math.round(3 + 3 * Math.sin(d / 2.2)));
    for (let i = 0; i < n; i++) ev.push({ id: `e${d}_${i}`, arena_id: "a1", description: "אירוע " + d, happened_at: new Date(now - d * 864e5).toISOString() });
  }
  D.events = ev; setHomeView("viz");
});
await page.waitForTimeout(300);

const area = await page.$(".vzarea");
if (!area) issues.push("גרף הזמן לא נוצר גם עם 21 ימי אירועים");
else {
  const box = await area.boundingBox();
  if (!box || box.height < 60) issues.push("גובה גרף הזמן קטן מדי: " + JSON.stringify(box));
  else {
    // ריחוף הוא שכבת ברירת מחדל, לא תוספת — כאן נתפס שהחיווט נשמט
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.waitForTimeout(200);
    const tip = await page.$eval(".vztip", e => ({ on: e.classList.contains("on"), txt: (e.textContent || "").trim() }));
    if (!tip.on || !tip.txt) issues.push("ריחוף על גרף הזמן לא מציג טולטיפ");
    else notes.push("טולטיפ על גרף הזמן: " + tip.txt);
  }
}

// 2. טבלה — ערוץ הגיבוי. כל ערך חייב להיות נגיש גם בלי לקרוא צורה.
const toggle = await page.$(".vza");
if (!toggle) issues.push("אין מתג טבלה על אף גרף");
else {
  await toggle.click(); await page.waitForTimeout(150);
  const rows = await page.$$eval(".vztable.on tbody tr", r => r.length).catch(() => 0);
  if (!rows) issues.push("מתג הטבלה לא פותח טבלה עם שורות");
  else notes.push(`טבלה נפתחת (${rows} שורות)`);
  await toggle.click();
}

// 3. אין יעדי לחיצה דקים: מקטע מוערם אינו יעד מגע, המקרא הוא
for (const sel of [".vzstack i[onclick]"]) {
  const n = await page.$$eval(sel, e => e.length).catch(() => 0);
  if (n) issues.push(`${n} מקטעים דקים עדיין יעד לחיצה (${sel})`);
}
const keys = await page.$$eval(".vzkey", els => els.filter(e => e.getAttribute("onclick")).length);
if (!keys) issues.push("כפתורי המקרא אינם לחיצים — אין דרך לרדת מהמקטע לרשימה");
else notes.push(`${keys} כפתורי מקרא לחיצים`);

// 4. טיפוס על העץ: אריח → רשימה → אובייקט
await page.evaluate(() => setHomeView("all"));
await page.waitForTimeout(250);
const tile = await page.$('.vt[onclick*="t:all"]');
if (!tile) issues.push("אריח 'משימות פתוחות' אינו מוביל לפירוט");
else {
  await tile.click(); await page.waitForSelector(".sheet.on"); await page.waitForTimeout(250);
  const lvl1 = await page.$eval(".sheet h3", e => e.textContent);
  const rows = await page.$$(".sheet .li.tapli");
  if (!rows.length) issues.push("רשימת הפירוט ריקה");
  else {
    await rows[0].click(); await page.waitForTimeout(250);
    const lvl2 = await page.$eval(".sheet h3", e => e.textContent);
    if (lvl2 === lvl1) issues.push("לחיצה על שורה ברשימה לא ירדה לאובייקט");
    else notes.push(`אריח → רשימה → אובייקט: ${lvl1} → ${lvl2.slice(0, 34)}`);
  }
}

// 5. עומק שלוש וחזרה. בלי חזרה, ירידה לעומק היא מלכודת.
await page.keyboard.press("Escape"); await page.waitForTimeout(250);
await page.evaluate(() => drill("ar:active"));
await page.waitForTimeout(250);
const a1 = await page.$eval(".sheet h3", e => e.textContent);
const arenaRows = await page.$$(".sheet .li.tapli");
if (!arenaRows.length) issues.push("רשימת הזירות ריקה");
else {
  await arenaRows[0].click(); await page.waitForTimeout(250);
  const a2 = await page.$eval(".sheet h3", e => e.textContent);
  const back = await page.$('.sheet button[onclick="drillUp()"]');
  if (!back) issues.push("אין כפתור חזרה ברמה שנייה של הטיפוס");
  else {
    await back.click(); await page.waitForTimeout(250);
    const a3 = await page.$eval(".sheet h3", e => e.textContent);
    if (a3 !== a1) issues.push(`חזרה לא החזירה לרמה הקודמת: "${a3}" במקום "${a1}"`);
    else notes.push(`טיפוס וחזרה: ${a1} → ${a2.slice(0, 30)} → חזרה`);
  }
}

// 6. סרגל צד בדסקטופ, סרגל תחתון בנייד — אותו DOM, פריסה אחרת
const deskNav = await page.evaluate(() => { const r = document.querySelector("nav").getBoundingClientRect(); return r.height > r.width; });
if (!deskNav) issues.push("ב-1600px הניווט עדיין סרגל תחתון ולא סרגל צד");
else notes.push("1600px: ניווט כסרגל צד");
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const mp = await mob.newPage();
await mp.goto(URL, { waitUntil: "domcontentloaded" });
await mp.click("text=צפה בהדגמה"); await mp.waitForSelector("nav button");
const mobNav = await mp.evaluate(() => { const r = document.querySelector("nav").getBoundingClientRect(); return r.width > r.height; });
if (!mobNav) issues.push("ב-390px הניווט אינו סרגל תחתון");
else notes.push("390px: ניווט כסרגל תחתון");

await browser.close();
console.log(notes.map(n => "· " + n).join("\n"));
if (jsErrors.length) issues.push("שגיאות JS: " + jsErrors.join(" | "));
console.log("\n===== גרפים וטיפוס =====");
if (!issues.length) console.log("  ✓ גרפים, טבלאות, ריחוף וטיפוס על העץ — הכל עובד");
else { console.log(issues.map(i => "  ✗ " + i).join("\n")); process.exit(1); }
