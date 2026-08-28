import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/classic.html";
const errors = [], warns = [];
const log = [];
const step = (s) => { log.push(s); console.log("· " + s); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();

page.on("pageerror", e => errors.push("pageerror: " + e.message));
page.on("console", m => { if (m.type() === "error") {
  const t = m.text();
  // כשל טעינת גופנים בסביבת הבדיקה המנותקת אינו תקלה באפליקציה
  if (/fonts\.g|ERR_CONNECTION_RESET|ERR_FAILED/.test(t) && !/index\.html/.test(t)) return;
  errors.push("console.error: " + t.slice(0,200));
} });
page.on("requestfailed", r => {
  const u = r.url();
  if (!/fonts\.g/.test(u)) warns.push("requestfailed: " + u.slice(0,80) + " — " + (r.failure()?.errorText||""));
});

await page.goto(URL, { waitUntil: "networkidle" });
step("נטען מסך הכניסה");

// כניסה למצב הדגמה
await page.click("text=צפה בהדגמה");
await page.waitForSelector("nav button", { timeout: 5000 });
step("נכנס למצב הדגמה");

const tabs = ["home","arenas","decisions","assets","ask"];
for (const t of tabs) {
  await page.click(`nav button[data-tab="${t}"]`);
  await page.waitForTimeout(120);
  const empty = await page.$eval("#main", el => el.innerHTML.trim().length);
  if (empty < 50) errors.push(`טאב ${t} נשאר ריק`);
}
step(`כל ${tabs.length} הטאבים נטענים`);

// עדשות מסך הבית
await page.click('nav button[data-tab="home"]');
for (const v of ["all","focus","money","move"]) {
  await page.click(`.hviews button:has-text("${{all:"הכל",focus:"דורש אותי",money:"פיננסי",move:"תנועה"}[v]}")`);
  await page.waitForTimeout(100);
  const len = await page.$eval("#main", el => el.innerText.trim().length);
  if (len < 20) errors.push(`עדשה ${v} ריקה`);
}
step("כל 4 עדשות מסך הבית מציגות תוכן");

// פתיחת גיליון וסגירתו — כולל כפתור אחורה של הדפדפן
await page.click('nav button[data-tab="home"]');
await page.click('.hviews button:has-text("הכל")');
await page.waitForTimeout(150);
const taskRow = await page.$('.row[onclick^="openTask"]');
if (taskRow) {
  await taskRow.click();
  await page.waitForSelector(".sheet.on", { timeout: 3000 });
  step("גיליון משימה נפתח");
  await page.goBack();
  await page.waitForTimeout(300);
  const stillOpen = await page.$(".sheet.on");
  if (stillOpen) errors.push("כפתור אחורה לא סוגר את הגיליון");
  else step("כפתור אחורה סוגר את הגיליון");
} else warns.push("לא נמצאה שורת משימה לחיצה במסך הבית");

// המשכיות: 40 מחזורי פתיחה/סגירה — דליפת מאזינים, ערימת היסטוריה, זליגת מצב
const before = await page.evaluate(() => history.length);
for (let i = 0; i < 40; i++) {
  await page.click('nav button[data-tab="arenas"]'); await page.waitForTimeout(20);
  const a = await page.$('.row[onclick^="openArena"]');
  if (a) { await a.click(); await page.waitForTimeout(40); await page.click("#ov"); await page.waitForTimeout(30); }
  await page.click('nav button[data-tab="home"]'); await page.waitForTimeout(20);
}
const after = await page.evaluate(() => history.length);
step(`40 מחזורי ניווט הושלמו (היסטוריה: ${before} → ${after})`);
if (after - before > 45) errors.push(`ערימת ההיסטוריה גדלה ב-${after-before} — כפתור אחורה ייתקע`);

const sheets = await page.$$eval("#sheet", els => els.length);
if (sheets !== 1) errors.push(`נוצרו ${sheets} אלמנטי גיליון במקום 1`);

// דליפת זיכרון גסה
const heap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
step(`זיכרון JS אחרי 40 מחזורים: ${(heap/1048576).toFixed(1)}MB`);
if (heap > 120 * 1048576) errors.push(`שימוש זיכרון גבוה: ${(heap/1048576).toFixed(0)}MB`);

// לכידה מהירה — ה-FAB
await page.click('nav button[data-tab="home"]');
await page.click("#fab");
await page.waitForSelector(".sheet.on");
const capInput = await page.$("#capText, .sheet textarea, .sheet input[type=text]");
if (capInput) { await capInput.fill("בדיקת המשכיות"); step("לכידה מהירה מקבלת קלט"); }
else warns.push("לא נמצא שדה קלט בגיליון הלכידה");
await page.click("#ov"); await page.waitForTimeout(200);

// שרידות רענון: מצב הדגמה אמור לחזור לשער, לא להישבר
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
const afterReload = await page.$eval("body", el => el.innerText.slice(0, 120));
step("רענון: " + afterReload.replace(/\s+/g," ").slice(0,60));

console.log("\n===== תוצאה =====");
if (warns.length) console.log("אזהרות:\n" + warns.map(w => "  ⚠ " + w).join("\n"));
if (errors.length) { console.log("שגיאות:\n" + errors.map(e => "  ✗ " + e).join("\n")); await browser.close(); process.exit(1); }
console.log(`  ✓ ${log.length} שלבים עברו, אפס שגיאות JS`);
await browser.close();
