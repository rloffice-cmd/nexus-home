// "זו לא פגישה" — ניטרול דרישת הסיכום, מול שרת מדומה.
//
// מה הבדיקה שומרת עליו: הכפתור הזה **מסתיר התראה**. כפתור שמסתיר התראה חייב
// להיות מדויק יותר מכפתור שמייצר אחת — כי טעות כאן משתיקה בשקט משהו שאיתי
// היה צריך לראות, וזה בדיוק דפוס הכשל שהמערכת הזו כבר נשברה עליו (דף הדיווח
// שהיה מת חמישה ימים ואיש לא ידע).
//
// ארבעה קווים אדומים:
// 1. פתיחת החלון אינה כותבת כלום. רק לחיצה על בחירה שולחת בקשה.
// 2. ההיקף שנשלח הוא ההיקף שנלחץ — "כל הסדרה" ≠ "רק הפעם הזו". אם השניים
//    מתחלפים, לחיצה אחת משתיקה סדרה שלמה בלי שאיתי ביקש.
// 3. אירוע שאינו חוזר לא מציע "כל הסדרה" בכלל.
// 4. אירוע מנוטרל יוצא מ"ממתין לסיכום" וגם מהמונה שבסרגל — ואפשר להחזירו.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/classic.html";
const errors = [];
const step = (s) => console.log("· " + s);
const fail = (s) => { errors.push(s); console.log("  ✗ " + s); };

const iso = (d) => new Date(Date.now() + d * 36e5).toISOString();
const base = { all_day: false, arena: null, arena_id: null, source: "google",
               prep_id: null, debrief_id: null, debrief_status: null };
// ev-rec: תזכורת יומית חוזרת (המקרה של "זעפן"). ev-one: פגישה רגילה שהסתיימה.
// ev-wv:  כבר מנוטרל — חייב להיראות אחרת ולא להיספר.
const MEETINGS = [
  { ...base, id: "ser_20260728T051000Z", title: "זעפן", starts_at: iso(-26), ends_at: iso(-25),
    day_offset: -1, is_recurring: true, debrief_waived: false },
  { ...base, id: "one1", title: "פגישה אצלנו", starts_at: iso(-4), ends_at: iso(-3),
    day_offset: 0, is_recurring: false, debrief_waived: false },
  { ...base, id: "wv1", title: "חדר כושר", starts_at: iso(-28), ends_at: iso(-27),
    day_offset: -1, is_recurring: true, debrief_waived: true, waiver_scope: "series" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => fail("pageerror: " + e.message));

let posts = [];
await page.route("**/functions/v1/nexus-app*", async (r) => {
  const req = r.request();
  if (req.method() === "POST") {
    const body = JSON.parse(req.postData() || "{}");
    posts.push(body);
    if (body.action === "meeting_waive_debrief")
      return r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, scope: body.scope, key: "k", title: "x",
                               affected: body.scope === "series" ? 8 : 1 }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, removed: 1 }) });
  }
  return r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ now: "13:00", today: "2026-07-28", arenas: [], meetings: MEETINGS,
      preps: [], debriefs: [], decisions: [], tasks: [], people: [], objectives: [],
      commitments: [], followups: [], ideas: [], captures: [], events: [], lessons: [],
      closed_today: [] }) });
});
for (const p of ["nx-dash", "nx-dec"])
  await page.route(`**/functions/v1/${p}*`, r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("nx_k3", "test-key"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });
await page.click('nav button[data-tab="meetings"]');
await page.waitForTimeout(250);

// ── 1. מנוטרל אינו נספר ואינו ממתין ──────────────────────────────────────
const list = await page.$eval("#main", el => el.innerText);
if (!/לא דורש סיכום/.test(list)) fail("אירוע מנוטרל אינו מסומן כלא-דורש-סיכום");
const badge = await page.$eval('nav button[data-tab=meetings] .bdg', el => el.textContent);
if (badge !== "2") fail(`המונה סופר ${badge} במקום 2 — מנוטרל נספר בטעות`);
step("אירוע מנוטרל מסומן, ואינו נספר במונה שבסרגל");

// ── 2. פתיחת החלון אינה כותבת ─────────────────────────────────────────────
posts = [];
await page.evaluate(() => waiveSheet(0));
await page.waitForSelector("#wvReason", { timeout: 4000 });
await page.waitForTimeout(300);
if (posts.length) fail("נשלחה בקשה עוד לפני שאיתי בחר: " + JSON.stringify(posts));
step("פתיחת החלון אינה כותבת כלום");

// ── 3. אירוע חוזר מציע את שתי האפשרויות ──────────────────────────────────
const sheet = await page.$eval("#sheet", el => el.innerText);
if (!/כל הסדרה/.test(sheet)) fail("אירוע חוזר אינו מציע ניטרול של כל הסדרה");
if (!/רק הפעם הזו/.test(sheet)) fail("אירוע חוזר אינו מציע ניטרול של מופע בודד");
step("אירוע חוזר מציע גם סדרה וגם מופע בודד");

// ── 4. ביטול אינו כותב ────────────────────────────────────────────────────
await page.click('#sheet button:has-text("ביטול")');
await page.waitForTimeout(300);
if (posts.length) fail("ביטול שלח בקשה: " + JSON.stringify(posts));
step("ביטול אינו כותב כלום");

// ── 5. ההיקף שנשלח הוא ההיקף שנלחץ ───────────────────────────────────────
posts = [];
await page.evaluate(() => waiveSheet(0));
await page.waitForSelector("#wvReason", { timeout: 4000 });
await page.fill("#wvReason", "תזכורת אישית");
await page.click('#sheet button:has-text("כל הסדרה")');
await page.waitForTimeout(400);
const w = posts.find(p => p.action === "meeting_waive_debrief");
if (!w) fail("ניטרול לא נשלח לשרת");
else {
  if (w.scope !== "series") fail(`נשלח היקף ${w.scope} במקום series`);
  if (w.event_id !== "ser_20260728T051000Z") fail("נשלח מזהה אירוע שגוי: " + w.event_id);
  if (w.reason !== "תזכורת אישית") fail("הסיבה לא נשלחה: " + JSON.stringify(w.reason));
}
step("«כל הסדרה» שולח scope=series עם המזהה והסיבה");

posts = [];
await page.evaluate(() => { closeSheet(); TAB = "meetings"; render(); });
await page.waitForTimeout(200);
await page.evaluate(() => waiveSheet(0));
await page.waitForSelector("#wvReason", { timeout: 4000 });
await page.click('#sheet button:has-text("רק הפעם הזו")');
await page.waitForTimeout(400);
const w2 = posts.find(p => p.action === "meeting_waive_debrief");
if (!w2) fail("ניטרול מופע בודד לא נשלח");
else if (w2.scope !== "event") fail(`נשלח היקף ${w2.scope} במקום event`);
step("«רק הפעם הזו» שולח scope=event");

// ── 6. אירוע שאינו חוזר אינו מציע סדרה ───────────────────────────────────
await page.evaluate(() => { closeSheet(); TAB = "meetings"; render(); });
await page.waitForTimeout(200);
await page.evaluate(() => waiveSheet(1));
await page.waitForSelector("#wvReason", { timeout: 4000 });
const single = await page.$eval("#sheet", el => el.innerText);
if (/כל הסדרה/.test(single)) fail("אירוע שאינו חוזר מציע ניטרול סדרה");
step("אירוע שאינו חוזר מציע אישור אחד בלבד");

// ── 7. החזרה ──────────────────────────────────────────────────────────────
posts = [];
await page.evaluate(() => { closeSheet(); TAB = "meetings"; render(); });
await page.waitForTimeout(200);
await page.evaluate(() => unwaiveDebrief(2));
await page.waitForTimeout(400);
const u = posts.find(p => p.action === "meeting_unwaive_debrief");
if (!u) fail("החזרה להמתנה לסיכום לא נשלחה");
else if (u.event_id !== "wv1") fail("החזרה נשלחה על אירוע שגוי: " + u.event_id);
step("אפשר להחזיר אירוע מנוטרל להמתנה לסיכום");

await browser.close();
if (errors.length) { console.log(`\n✗ ${errors.length} כשלים`); process.exit(1); }
console.log("\n✓ ניטרול דרישת הסיכום — כל הבדיקות עברו");
