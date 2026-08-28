// בדיקת "נפילה שקטה" — שני מצבי כשל שמראים נתונים ישנים כאילו הם חיים.
// שניהם שוחזרו בדפדפן אמיתי בביקורת 26.7 ותוקנו; הבדיקה הזאת מונעת חזרה.
//
// A1 — רענון שנכשל (500/timeout) בזמן שכבר מוצגים נתונים חיים: האפליקציה
//      חייבת לרדת ל"לא מעודכן", לא להישאר "חי" עם נתונים ישנים.
// A2 — nx-dec (מקור ההחלטות) נכשל: מסך ההחלטות חייב להגיד "לא נטען",
//      לא "אין החלטות פתוחות ✓" כוזב. זה המסך שכבר נעלמו בו 7 החלטות.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/classic.html";
const fails = [];
const step = (s) => console.log("· " + s);
const fail = (s) => { fails.push(s); console.log("  ✗ " + s); };

// הלוח (nexus-app) שולח החלטות בלי status — בדיוק כמו בייצור
const BOARD = {
  now: "12:00", today: "2026-07-26",
  arenas: [{ id: "a1", name: "השדרה", status: "active" }],
  tasks: [{ id: "t1", title: "משימה חיה", arena_id: "a1", status: "open", urgency: "today" }],
  decisions: [{ id: "d1", arena_id: "a1", title: "החלטה ממתינה מהלוח" }],
  people: [], objectives: [], commitments: [], followups: [], ideas: [], captures: [], events: [], lessons: [], closed_today: [],
};
const FULL_DEC = [{ id: "d1", arena_id: "a1", title: "החלטה ממתינה מהלוח", status: "pending", needed_by: "2026-07-30", recommendation: "לאשר" }];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => fail("pageerror: " + e.message));

let decMode = "ok", boardMode = "ok";
await page.route("**/functions/v1/nexus-app*", r => boardMode === "fail"
  ? r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"boom"}' })
  : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(BOARD) }));
await page.route("**/functions/v1/nx-dash*", r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await page.route("**/functions/v1/nx-dec*", r => decMode === "fail"
  ? r.abort()
  : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, decisions: FULL_DEC }) }));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("nx_k3", "test-key"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });
step("נטען במצב מחובר");

// ===== A2: nx-dec נכשל → המסך לא רשאי להגיד "אין החלטות ✓" =====
decMode = "fail";
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });
await page.waitForTimeout(300);
await page.click('nav button[data-tab="decisions"]');
await page.waitForTimeout(250);
const decTxt = await page.$eval("#main", el => el.innerText);
if (/אין החלטות פתוחות/.test(decTxt)) fail("A2: מסך ההחלטות מציג 'אין החלטות פתוחות' בזמן כשל nx-dec");
else if (!/לא נטענו|שגיאת רשת/.test(decTxt)) fail("A2: אין הודעת כשל ברורה במסך ההחלטות (התקבל: " + decTxt.slice(0,60) + ")");
else step("A2: כשל nx-dec מציג 'לא נטענו', לא 'אין ✓' כוזב");

// ===== A1: כשל רענון בזמן שיש נתונים חיים → 'לא מעודכן', לא 'חי' =====
decMode = "ok";
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });
await page.waitForTimeout(300);
const before = await page.evaluate(() => ({ live: LIVE, cached: CACHED }));
if (!before.live) fail("A1 setup: לא נכנס למצב חי לפני הבדיקה");
boardMode = "fail";
await page.evaluate(() => load(true));
await page.waitForTimeout(500);
const after = await page.evaluate(() => ({ live: LIVE, cached: CACHED }));
const dot = await page.evaluate(() => { const d = document.querySelector("#demoDot"); return d ? { shown: d.style.display !== "none", txt: d.textContent } : null; });
if (after.live && !after.cached) fail("A1: נשאר 'חי' אחרי כשל רענון — נתונים ישנים כחיים");
else if (!dot || !dot.shown || !/לא מעודכן/.test(dot.txt)) fail("A1: אין תגית 'לא מעודכן' אחרי כשל רענון (" + JSON.stringify(dot) + ")");
else step("A1: כשל רענון יורד ל'לא מעודכן' עם חותמת זמן");

await browser.close();
console.log("\n===== נפילה שקטה =====");
if (fails.length) { console.log(`  ✗ ${fails.length} כשלים`); process.exit(1); }
console.log("  ✓ כשל רענון וכשל החלטות מסומנים במפורש — אין נתונים ישנים המוצגים כחיים");
