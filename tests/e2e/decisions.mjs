// מסך ההחלטות מול שרת מדומה.
//
// הבדיקה הזאת נכתבה בעקבות תקלה אמיתית: המסך הראה "אין החלטות פתוחות"
// בזמן ש-7 החלטות המתינו במסד. הסיבה לא הייתה במסך אלא בשדות — nexus-app
// שלח את ההחלטות בלי status/needed_by/recommendation/cost_of_delay, והמסך
// מסנן על status==='pending'. בהדגמה הכל נראה תקין, כי לנתוני ההדגמה יש
// את כל השדות. לכן הבדיקה מדמה את nexus-app בדיוק כפי שהוא — בלי השדות —
// ומוודאת שהמסך בכל זאת מציג, כלומר שהנתונים מגיעים מ-nx-dec.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
const errors = [];
const step = (s) => console.log("· " + s);
const fail = (s) => { errors.push(s); console.log("  ✗ " + s); };

const ARENAS = [{ id: "a1", name: "השדרה / קניון בית שמש", status: "active" }];

// כפי ש-nexus-app מחזיר בפועל: בלי status ובלי שדות ההחלטה
const BOARD_DECISIONS = [
  { id: "d1", arena_id: "a1", title: "הסכם חשמל מול פרומול — עיון ואישור",
    decided_on: null, rationale: null, alternatives: null, source: "ביקורת" },
  { id: "d2", arena_id: null, title: "רוטציית סודות", decided_on: null,
    rationale: null, alternatives: null, source: "ביקורת" },
];

// כפי ש-nx-dec מחזיר: מלא
const FULL_DECISIONS = [
  { id: "d1", arena_id: "a1", title: "הסכם חשמל מול פרומול — עיון ואישור",
    status: "pending", decided_on: null, needed_by: "2026-07-30",
    recommendation: "לאשר אחרי בדיקת סעיף ההצמדה", alternatives: "לדחות לרבעון הבא",
    cost_of_delay: "עיכוב חיבור", rationale: null, source: "ביקורת" },
  { id: "d2", arena_id: null, title: "רוטציית סודות", status: "pending",
    decided_on: null, needed_by: null, recommendation: null, alternatives: null,
    cost_of_delay: null, rationale: null, source: "ביקורת" },
  { id: "d3", arena_id: "a1", title: "החלטה שכבר הוכרעה", status: "decided",
    decided_on: "2026-07-19", needed_by: null, recommendation: null,
    alternatives: null, cost_of_delay: null, rationale: null, source: "סשן" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => fail("pageerror: " + e.message));

let decCalled = false;

await page.route("**/functions/v1/nexus-app*", r =>
  r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ now: "18:53", today: "2026-07-26", arenas: ARENAS,
      decisions: BOARD_DECISIONS, tasks: [], people: [], objectives: [],
      commitments: [], followups: [], ideas: [], captures: [], events: [],
      lessons: [], closed_today: [] }) }));
await page.route("**/functions/v1/nx-dash*", r =>
  r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await page.route("**/functions/v1/nx-dec*", r => {
  decCalled = true;
  return r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ ok: true, decisions: FULL_DECISIONS }) });
});

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("nx_k3", "test-key"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });

if (!decCalled) fail("האפליקציה לא ביקשה את ההחלטות מ-nx-dec");
step("ההחלטות נמשכות ממקור נפרד בזמן הטעינה");

await page.click('nav button[data-tab="decisions"]');
await page.waitForTimeout(250);
const txt = await page.$eval("#main", el => el.innerText);

if (/אין החלטות פתוחות/.test(txt))
  fail("המסך מציג 'אין החלטות פתוחות' בזמן ששתיים ממתינות");
if (!/הסכם חשמל/.test(txt)) fail("החלטה ממתינה לא מוצגת");
if (!/רוטציית סודות/.test(txt)) fail("החלטה ממתינה שנייה לא מוצגת");
if (/החלטה שכבר הוכרעה/.test(txt)) fail("החלטה שהוכרעה מוצגת ברשימת הפתוחות");
step("שתי הממתינות מוצגות, וההכרעה כבר לא");

// השדות שהיו חסרים הם בדיוק אלה שנותנים להחלטה משמעות
if (!/לאשר אחרי בדיקת סעיף ההצמדה/.test(txt)) fail("ההמלצה לא מוצגת");
if (!/עיכוב חיבור/.test(txt)) fail("עלות העיכוב לא מוצגת");
if (!/30\.07|30\.7/.test(txt)) fail("תאריך היעד לא מוצג");
step("המלצה, עלות עיכוב ותאריך יעד מוצגים");

// המונה בסרגל הוא מה שגורם לאיתי לפתוח את המסך מלכתחילה
const badge = await page.$eval('nav button[data-tab=decisions] .bdg', el =>
  ({ text: el.textContent, shown: el.style.display !== "none" }));
if (!badge.shown || badge.text !== "2") fail("המונה בסרגל מראה " + JSON.stringify(badge));
step("המונה בסרגל מראה 2");

// כשל בהחלטות לא רשאי להפיל את הלוח. זה בדיוק מה שקרה כשהוספתי את
// הבקשה השלישית לתוך Promise.all בלי catch משלה.
await page.unroute("**/functions/v1/nx-dec*");
await page.route("**/functions/v1/nx-dec*", r => r.abort());
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });
await page.waitForTimeout(400);
const home = await page.$eval("#main", el => el.innerText);
if (home.trim().length < 40) fail("הלוח נשאר ריק כשההחלטות נכשלו");
// LIVE הוא הבדיקה האמיתית. בלי זה האפליקציה נופלת בשקט למטמון ונראית
// תקינה לגמרי בזמן שהיא מציגה נתונים ישנים — כשל גרוע יותר ממסך ריק.
const st = await page.evaluate(() => ({ live: LIVE, cached: CACHED, demo: DEMO }));
if (!st.live) fail("כשל בהחלטות הוציא את הלוח ממצב חי: " + JSON.stringify(st));
step("כשל בשליפת ההחלטות לא מוציא את הלוח ממצב חי");

await browser.close();
console.log("\n===== מסך ההחלטות =====");
if (errors.length) { console.log(`  ✗ ${errors.length} כשלים`); process.exit(1); }
console.log("  ✓ החלטות ממתינות מוצגות עם כל השדות, והמונה נכון");
