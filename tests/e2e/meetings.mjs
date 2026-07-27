// מרכז הפגישות מול שרת מדומה.
//
// מה הבדיקה שומרת עליו: הסיכום הוא לא רק החלטות. אם מקטע נשמט מהטופס או
// שדה לא נשלח, הפגישה "נקלטה" לכאורה — והמידע נעלם בשקט. לכן הבדיקה בודקת
// את *מה שנשלח לשרת בפועל*, לא רק את מה שנראה על המסך.
//
// שלושה דברים שנשברו בעבר ומכוסים כאן:
// 1. פגישות היום נעלמות בחצות — הרשימה חייבת להציג גם "ממתין לסיכום" מאתמול.
// 2. פריט שדווח כטופל ולא נמצא לו זוג — חייב להיאמר לאיתי, לא להיבלע.
// 3. סיכום חופשי לבדו (בלי החלטות) חייב להיקלט; זה המקרה הנפוץ ביותר.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
const errors = [];
const step = (s) => console.log("· " + s);
const fail = (s) => { errors.push(s); console.log("  ✗ " + s); };

const ARENAS = [{ id: "a1", name: "השדרה / קניון בית שמש", status: "active" }];
const iso = (d) => new Date(Date.now() + d * 36e5).toISOString();
const MEETINGS = [
  { id: "ev1", title: "פגישה שהסתיימה ולא סוכמה", starts_at: iso(-26), ends_at: iso(-25),
    all_day: false, arena: "השדרה / קניון בית שמש", arena_id: "a1", source: "google",
    prep_id: null, debrief_id: null, debrief_status: null, day_offset: -1 },
  { id: "ev2", title: "רם ישראל — חשמל ואנרגיה", starts_at: iso(2), ends_at: iso(3),
    all_day: false, arena: "השדרה / קניון בית שמש", arena_id: "a1", source: "google",
    conference_url: "https://meet.google.com/abc-defg-hij",
    prep_id: "p1", debrief_id: null, debrief_status: null, day_offset: 0 },
  { id: "manual:m1", title: "שיחה מזדמנת עם עופר", starts_at: iso(-2), ends_at: iso(-1),
    all_day: false, arena: null, arena_id: null, source: "manual",
    prep_id: null, debrief_id: null, debrief_status: null, day_offset: 0 },
];
const OPEN_ITEMS = { ok: true, arena: "השדרה / קניון בית שמש", arena_id: "a1",
  tasks: [{ id: "t1", title: "לשלוח חשבוניות נגדיות", status: "open", urgency: "week", due: null, owner: null }],
  commitments: [{ id: "c1", what: "להעביר הערות על ההסכם", direction: "by_itay", due: null, who: "אהרון" }],
  decisions: [] };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => fail("pageerror: " + e.message));

let lastPost = null;
await page.route("**/functions/v1/nexus-app*", async (r) => {
  const req = r.request();
  if (req.method() === "POST") {
    const body = JSON.parse(req.postData() || "{}");
    if (body.action === "meeting_open_items")
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(OPEN_ITEMS) });
    lastPost = body;
    if (body.action === "meeting_create")
      return r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, id: "manual:new", title: body.title, arena: "השדרה / קניון בית שמש" }) });
    if (body.action === "debrief_submit")
      return r.fulfill({ status: 200, contentType: "application/json",
        body: JSON.stringify({ ok: true, debrief_id: "db1", result: { ok: true, decisions_new: 1, updates: 1,
          handled: 1, people_notes: 1, still_open: 1, handled_unmatched: ["משהו שלא נמצא"] } }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  }
  return r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ now: "13:00", today: "2026-07-27", arenas: ARENAS, meetings: MEETINGS,
      preps: [{ id: "p1", event_id: "ev2", meeting_title: "רם ישראל", body: "גוף התיק", depth: "full", version: 1, created_at: iso(-3) }],
      debriefs: [], decisions: [], tasks: [], people: [], objectives: [], commitments: [],
      followups: [], ideas: [], captures: [], events: [], lessons: [], closed_today: [] }) });
});
for (const p of ["nx-dash", "nx-dec"])
  await page.route(`**/functions/v1/${p}*`, r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("nx_k3", "test-key"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });

// 1. הרשימה
await page.click('nav button[data-tab="meetings"]');
await page.waitForTimeout(250);
const list = await page.$eval("#main", el => el.innerText);
if (!/ממתין לסיכום/.test(list)) fail("פגישה שהסתיימה ולא סוכמה אינה מופיעה כממתינה לסיכום");
if (!/פגישה שהסתיימה ולא סוכמה/.test(list)) fail("פגישת האתמול נעלמה מהרשימה");
if (!/רם ישראל/.test(list)) fail("פגישת היום לא מוצגת");
if (!/ידנית/.test(list)) fail("פגישה ידנית אינה מסומנת ככזו");
step("הרשימה מקבצת: ממתין לסיכום · היום · ידנית מסומנת");

const badge = await page.$eval('nav button[data-tab=meetings] .bdg', el => ({ t: el.textContent, on: el.style.display !== "none" }));
if (!badge.on || badge.t !== "2") fail("מונה הפגישות שממתינות לסיכום מראה " + JSON.stringify(badge));
step("המונה בסרגל סופר רק את מה שממתין לסיכום");

// 2. פגישה חדשה
await page.click("text=➕ פגישה חדשה");
await page.waitForSelector("#nmTitle", { timeout: 4000 });
await page.fill("#nmTitle", "פגישת בדיקה");
await page.click("#nmSubmit");
await page.waitForTimeout(400);
if (!lastPost || lastPost.action !== "meeting_create") fail("פתיחת פגישה לא נשלחה לשרת");
else if (lastPost.title !== "פגישת בדיקה") fail("כותרת הפגישה לא נשלחה: " + JSON.stringify(lastPost));
else if (!lastPost.starts_at) fail("מועד הפגישה לא נשלח");
step("פגישה חדשה נשלחת לשרת עם כותרת ומועד");

// 3. טופס הסיכום — כל המקטעים
await page.evaluate(() => { closeSheet(); TAB = "meetings"; render(); });
await page.waitForTimeout(200);
await page.evaluate(() => debriefSheet(1));
await page.waitForSelector("#dbSummary", { timeout: 4000 });
await page.waitForTimeout(500); // טעינת הפריטים הפתוחים

const sections = await page.$eval("#sheet", el => el.innerText);
for (const s of ["מה נאמר בפגישה", "החלטות", "עדכונים על נושאים", "טיפלתי בזה", "על אנשים", "נשאר פתוח"])
  if (!sections.includes(s)) fail(`מקטע חסר בטופס הסיכום: ${s}`);
step("כל ששת המקטעים קיימים בטופס");

const nHandled = await page.$$eval(".dbh", els => els.length);
if (nHandled !== 2) fail(`הצ'קליסט של הפריטים הפתוחים הציג ${nHandled} פריטים במקום 2`);
step("הצ'קליסט נטען עם הפריטים הפתוחים של הזירה");

await page.fill("#dbSummary", "ישבנו שעה, הטון היה ענייני, הם בלחץ תזרימי.");

// המקטעים מעבר לסיכום ולהחלטות מקופלים כברירת מחדל — פתיחתם היא חלק
// מהמסלול האמיתי, ולכן נבדקת ולא נעקפת.
for (const [sel, box] of [["📌 עדכונים", "dbUpds"], ["✅ טיפלתי", "dbHandledBox"],
                          ["👤 על אנשים", "dbPersons"], ["⏳ נשאר פתוח", "dbOpenBox"]]) {
  await page.click(`#sheet h4:has-text("${sel}")`);
  await page.waitForTimeout(120);
  const vis = await page.$eval(`#${box}`, el => el.style.display !== "none");
  if (!vis) fail(`מקטע ${sel} לא נפתח בהקשה`);
}
step("מקטעים מקופלים נפתחים בהקשה");

await page.fill("#dbUpds .du-top", "מצב תזרים");
await page.fill("#dbUpds .du-txt", "הם ממהרים לסגור");
await page.fill("#dbPersons .dp-who", "עופר");
await page.fill("#dbPersons .dp-note", "מגיע מוכן");
await page.fill("#dbOpen", "האם להיכנס במחיר המבוקש");
await page.click(".dbh"); // סימון הפריט הראשון כטופל
await page.click("#dbSubmit");
await page.waitForTimeout(500);

const p = lastPost || {};
if (p.action !== "debrief_submit") fail("הסיכום לא נשלח");
if (!/בלחץ תזרימי/.test(p.summary || "")) fail("הסיכום החופשי לא נשלח — זה בדיוק המידע שהיה נעלם");
if (!(p.updates || []).length || p.updates[0].topic !== "מצב תזרים") fail("עדכון-נושא לא נשלח: " + JSON.stringify(p.updates));
if (!(p.handled || []).length || p.handled[0].ref !== "t1") fail("'טיפלתי בזה' לא נשלח עם ref מדויק: " + JSON.stringify(p.handled));
if (p.handled?.[0]?.kind !== "task") fail("סוג הפריט שנסגר לא נשלח");
if (!(p.people_notes || []).length) fail("הערה על אדם לא נשלחה");
if (!(p.open || []).includes("האם להיכנס במחיר המבוקש")) fail("'נשאר פתוח' לא נשלח");
if (p.event_id !== "ev2") fail("הסיכום לא נקשר לפגישה");
step("הסיכום נשלח מלא: נרטיב · עדכון · טופל-עם-ref · אדם · פתוח");

// פריט שדווח כטופל ולא נמצא לו זוג חייב להיאמר במפורש
await page.waitForTimeout(3200);
const toastTxt = await page.$eval("#toast", el => el.innerText);
if (!/לא נמצא/.test(toastTxt)) fail("פריט שלא נמצא לו זוג נבלע בשקט: " + toastTxt);
step("פריט שדווח כטופל ולא נמצא — מדווח לאיתי");

// 4. סיכום חופשי לבדו — המקרה הנפוץ ביותר
await page.evaluate(() => { closeSheet(); debriefSheet(2); });
await page.waitForSelector("#dbSummary", { timeout: 4000 });
await page.fill("#dbSummary", "רק שיחה קצרה, שום דבר להחליט.");
lastPost = null;
await page.click("#dbSubmit");
await page.waitForTimeout(400);
if (!lastPost || lastPost.action !== "debrief_submit") fail("סיכום חופשי בלי החלטות נחסם — זה המקרה הנפוץ ביותר");
else if (!lastPost.summary) fail("הסיכום החופשי נשלח ריק");
step("סיכום חופשי לבדו נקלט");

await browser.close();
console.log("\n===== מרכז הפגישות =====");
if (errors.length) { console.log(`  ✗ ${errors.length} כשלים`); process.exit(1); }
console.log("  ✓ קיבוץ, פגישה ידנית, כל מקטעי הסיכום, ref מדויק ודיווח על מה שלא נמצא");
