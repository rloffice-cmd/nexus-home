// תיבת הפקודה — שיחה בשפה חופשית עם אובייקט, מול שרת מדומה.
//
// מה הבדיקה שומרת עליו: כאן מודל מייצר מוטציות על נתונים אמיתיים. שלוש
// תכונות הן קו אדום, וכל אחת מהן נבדקת על מה שקורה *בפועל*, לא על המראה:
// 1. שום כתיבה לפני אישור — עד ללחיצה על "בצע" אסור שתצא בקשת command_apply.
// 2. התצוגה המקדימה מתרגמת מזהים לשמות. אם המודל בחר בעלים שגוי, איתי חייב
//    לראות "אהרון" ולא uuid — אחרת האישור חסר משמעות.
// 3. כשל חלקי לא נבלע: אם פעולה אחת נכשלה, הסיבה נשארת על המסך.
// ובנוסף: שאלה מהשרת (ops ריק) מוצגת ואינה מציעה כפתור ביצוע.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
const errors = [];
const step = (s) => console.log("· " + s);
const fail = (s) => { errors.push(s); console.log("  ✗ " + s); };

const ARENAS = [{ id: "a1", name: "השדרה / קניון בית שמש", status: "active" }];
const PEOPLE = [{ id: "p-ah", name: "אהרון לואיס", role: "מנהל תפעול", reliability_notes: "אמין" }];
const TASKS = [{ id: "t1", title: "לבדוק את הסכם השכירות מול עופר", status: "open",
                 urgency: "month", arena_id: "a1", owner_id: null, created_at: "2026-07-01" }];

const OPS = [{ op: "task.update", id: "t1", owner_id: "p-ah", urgency: "today", note: "דיברתי איתו בטלפון" }];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => fail("pageerror: " + e.message));

let posts = [];
let previewReply = { ok: true, summary: "מעביר לאהרון, דחוף להיום, ומוסיף הערה", ops: OPS, question: null };
let applyReply = { ok: true, applied: 1, done: [{ op: "task.update", label: "משימה עודכנה" }], errors: [] };

await page.route("**/functions/v1/nexus-app*", async (r) => {
  const req = r.request();
  if (req.method() === "POST") {
    const body = JSON.parse(req.postData() || "{}");
    posts.push(body);
    if (body.action === "command_preview")
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(previewReply) });
    if (body.action === "command_apply")
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(applyReply) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  }
  return r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ now: "13:00", today: "2026-07-27", arenas: ARENAS, tasks: TASKS, people: PEOPLE,
      meetings: [], preps: [], debriefs: [], decisions: [], objectives: [], commitments: [],
      followups: [], ideas: [], captures: [], events: [], lessons: [], closed_today: [] }) });
});
for (const p of ["nx-dash", "nx-dec"])
  await page.route(`**/functions/v1/${p}*`, r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("nx_k3", "test-key"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });

// closeSheet חוזר אחורה בהיסטוריה, וה-popstate מגיע בטיק הבא: פתיחה באותו
// טיק הייתה נסגרת מיד אחר כך. סוגרים, ממתינים, ואז פותחים — כמו משתמש.
async function openObj(fn, arg) {
  await page.evaluate(() => closeSheet());
  await page.waitForTimeout(300);
  await page.evaluate(([f, a]) => window[f](a), [fn, arg]);
  await page.waitForSelector("#cmdTxt", { timeout: 4000 });
  await page.waitForTimeout(150);
}

// ── 1. התיבה קיימת בכל מסך אובייקט, לא רק במשימה ──────────────────────────
for (const [fn, arg, kind] of [["openTask", "t1", "task"], ["openArena", "a1", "arena"],
                               ["openPerson", "p-ah", "person"]]) {
  await openObj(fn, arg);
  const has = await page.$("#cmdTxt");
  if (!has) fail(`אין תיבת פקודה במסך ${kind}`);
  const wired = await page.evaluate(() => CMD.kind + ":" + CMD.id);
  if (wired !== `${kind}:${arg}`) fail(`התיבה מחוברת ל-${wired} במקום ל-${kind}:${arg}`);
}
step("תיבת הפקודה קיימת ומחוברת לאובייקט הנכון במשימה · זירה · אדם");

// ── 2. תצוגה מקדימה: מה נשלח, ומה מוצג ────────────────────────────────────
await openObj("openTask", "t1");
posts = [];
await page.fill("#cmdTxt", "תעביר את זה לאהרון, דחוף להיום, ותוסיף הערה שדיברתי איתו בטלפון");
await page.click("#cmdGo");
await page.waitForSelector("#cmdOk", { timeout: 4000 });

const prev = posts.filter(p => p.action === "command_preview");
if (prev.length !== 1) fail(`נשלחו ${prev.length} בקשות תצוגה מקדימה במקום אחת`);
else {
  if (prev[0].kind !== "task" || prev[0].id !== "t1") fail("התצוגה המקדימה נשלחה על אובייקט שגוי: " + JSON.stringify(prev[0]));
  if (!/דיברתי איתו בטלפון/.test(prev[0].text || "")) fail("הטקסט של איתי לא נשלח לשרת");
}
step("הטקסט נשלח עם הזהות של האובייקט הפתוח");

// הקו האדום: עד כאן אסור שתהיה כתיבה.
if (posts.some(p => p.action === "command_apply")) fail("בוצעה כתיבה לפני אישור — קו אדום");
step("שום כתיבה לא יצאה לפני האישור");

const shown = await page.$eval("#cmdOut", el => el.innerText);
if (!/אהרון לואיס/.test(shown)) fail("התצוגה המקדימה לא תרגמה את מזהה הבעלים לשם: " + shown);
if (/p-ah|t1/.test(shown)) fail("מזהה גולמי דלף לתצוגה המקדימה: " + shown);
if (!/היום/.test(shown)) fail("שינוי הדחיפות לא מוצג");
if (!/דיברתי איתו בטלפון/.test(shown)) fail("ההערה שתיווסף אינה מוצגת");
if (!/לבדוק את הסכם השכירות/.test(shown)) fail("התצוגה לא מזהה על איזו משימה מדובר");
step("התצוגה המקדימה מתרגמת מזהים לשמות — אפשר באמת לאשר");

// ── 3. אישור שולח בדיוק את מה שהוצג ───────────────────────────────────────
posts = [];
await page.click("#cmdOk");
await page.waitForTimeout(400);
const ap = posts.filter(p => p.action === "command_apply");
if (ap.length !== 1) fail(`נשלחו ${ap.length} בקשות ביצוע במקום אחת`);
else if (JSON.stringify(ap[0].ops) !== JSON.stringify(OPS))
  fail("הפעולות שנשלחו לביצוע אינן זהות למה שהוצג: " + JSON.stringify(ap[0].ops));
step("הביצוע שולח בדיוק את הפעולות שהוצגו — לא גרסה אחרת");

// ── 4. ביטול לא כותב כלום ─────────────────────────────────────────────────
await openObj("openTask", "t1");
await page.fill("#cmdTxt", "תסגור את זה");
await page.click("#cmdGo");
await page.waitForSelector("#cmdNo", { timeout: 4000 });
posts = [];
await page.click("#cmdNo");
await page.waitForTimeout(250);
if (posts.length) fail("ביטול שלח בקשה לשרת: " + JSON.stringify(posts));
if (await page.$("#cmdOk")) fail("אחרי ביטול כפתור הביצוע עדיין קיים");
step("ביטול מנקה את ההצעה ואינו כותב דבר");

// ── 5. כשל חלקי נשאר על המסך ──────────────────────────────────────────────
applyReply = { ok: false, applied: 1, done: [{ op: "task.update", label: "עודכנה" }],
               errors: [{ op: "task.merge", error: "משימה לא נמצאה" }] };
await openObj("openTask", "t1");
await page.fill("#cmdTxt", "תאחד את הכפילות");
await page.click("#cmdGo");
await page.waitForSelector("#cmdOk", { timeout: 4000 });
await page.click("#cmdOk");
await page.waitForTimeout(400);
const after = await page.$eval("#cmdOut", el => el.innerText).catch(() => "");
if (!/משימה לא נמצאה/.test(after)) fail("שגיאה בביצוע נבלעה ולא הוצגה: " + after);
if (!/1 נכשלו/.test(after)) fail("מספר הכשלים אינו מוצג: " + after);
step("כשל חלקי מוצג עם הסיבה — לא נבלע בטוסט");

// ── 6. שאלה מהשרת מוצגת ואינה מציעה ביצוע ────────────────────────────────
previewReply = { ok: true, summary: null, ops: [], question: "לאיזה תאריך לדחות?" };
await openObj("openTask", "t1");
await page.fill("#cmdTxt", "תדחה את זה");
await page.click("#cmdGo");
await page.waitForTimeout(500);
const q = await page.$eval("#cmdOut", el => el.innerText);
if (!/לאיזה תאריך/.test(q)) fail("השאלה מהשרת לא הוצגה: " + q);
if (await page.$("#cmdOk")) fail("הוצע ביצוע למרות שאין פעולות");
step("שאלה מוצגת במקום ניחוש, ואין מה לאשר");

// ── 7. תיקון: מתקן את ההצעה, לא מנסח מאפס ────────────────────────────────
// כאן קל מאוד לטעות בשקט: אם התיקון נשלח בלי ההצעה הקודמת, השרת מפרש
// "לא לאהרון, לעופר" כבקשה עצמאית ומאבד את הדחיפות וההערה שכבר סוכמו.
const FIXED = [{ op: "task.update", id: "t1", owner_id: "p-of", urgency: "today", note: "דיברתי איתו בטלפון" }];
PEOPLE.push({ id: "p-of", name: "עופר גל", role: "יזם" });
previewReply = { ok: true, summary: "מעביר לאהרון, דחוף להיום, ומוסיף הערה", ops: OPS, question: null };
applyReply = { ok: true, applied: 1, done: [], errors: [] };
await page.reload({ waitUntil: "domcontentloaded" });          // כדי שעופר ייכנס לנתונים
await page.waitForSelector("nav button", { timeout: 8000 });
await page.evaluate(() => openTask("t1"));
await page.waitForSelector("#cmdTxt", { timeout: 4000 });
await page.fill("#cmdTxt", "תעביר את זה לאהרון, דחוף להיום, ותוסיף הערה שדיברתי איתו בטלפון");
await page.click("#cmdGo");
await page.waitForSelector("#cmdFixBtn", { timeout: 4000 });

previewReply = { ok: true, summary: "מעביר לעופר גל, דחוף להיום, ומוסיף הערה", ops: FIXED, question: null };
await page.click("#cmdFixBtn");
await page.waitForSelector("#cmdFix", { timeout: 4000 });
posts = [];
await page.fill("#cmdFix", "לא לאהרון, לעופר — והשאר אותו דבר");
await page.click("#cmdFixGo");
await page.waitForTimeout(600);

const fx = posts.filter(p => p.action === "command_preview");
if (fx.length !== 1) fail(`התיקון שלח ${fx.length} בקשות במקום אחת`);
else {
  if (!fx[0].prior) fail("התיקון נשלח בלי ההצעה הקודמת — השרת יפרש אותו כבקשה חדשה");
  else {
    if (JSON.stringify(fx[0].prior.ops) !== JSON.stringify(OPS)) fail("ההצעה הקודמת שנשלחה אינה זו שהוצגה");
    if (!/דיברתי איתו בטלפון/.test(fx[0].prior.text || "")) fail("הטקסט המקורי לא נשלח עם התיקון");
  }
  if (!/לעופר/.test(fx[0].text || "")) fail("טקסט התיקון עצמו לא נשלח");
}
step("תיקון נשלח עם ההצעה שהוא מתקן — ולא כבקשה חדשה");

const fixedShown = await page.$eval("#cmdOut", el => el.innerText);
if (!/עופר גל/.test(fixedShown)) fail("ההצעה המתוקנת לא הוחלפה על המסך: " + fixedShown);
if (/אהרון/.test(fixedShown)) fail("ההצעה הישנה נשארה על המסך לצד המתוקנת");
posts = [];
await page.click("#cmdOk");
await page.waitForTimeout(400);
const ap2 = posts.filter(p => p.action === "command_apply");
if (!ap2.length) fail("אחרי תיקון הביצוע לא נשלח");
else if (JSON.stringify(ap2[0].ops) !== JSON.stringify(FIXED))
  fail("אחרי תיקון בוצעה הגרסה הישנה: " + JSON.stringify(ap2[0].ops));
step("הביצוע אחרי תיקון שולח את הגרסה המתוקנת בלבד");

// ── 8. מסלול הניסוח (v13) ─────────────────────────────────────────────────
// הבדיקה הזו נכתבה אחרי שאיתי ביקש טיוטת מייל פולואפ וקיבל "מחוץ ליכולות
// המערכת שלי" — בזמן שהבוט מנסח מיילים מאז v7.9. הקו האדום כאן הפוך מזה של
// המוטציות: טיוטה היא הצעת טקסט, ולכן אסור שתצא ממנה **שום** כתיבה לאובייקט.
const DRAFT = { id: "d1", to_name: "יעקב בן ציון", channel: "email",
                subject: "מרתף בניין 7 — מעקב", body: "יעקב שלום,\nפניתי אליכם לפני שבוע בנושא המרתף ולא קיבלתי מענה." };
previewReply = { ok: true, route: "draft", summary: "טיוטת פולואפ ליעקב בן ציון", draft: DRAFT, ops: [] };
await openObj("openTask", "t1");
posts = [];
await page.fill("#cmdTxt", "תכין לי טיוטת מייל פולואפ למי שלא ענה לי");
await page.click("#cmdGo");
await page.waitForSelector("#drCopy", { timeout: 4000 });

if (posts.some(p => p.action === "command_apply")) fail("מסלול הניסוח ביצע פעולה — קו אדום");
if (await page.$("#cmdOk")) fail("טיוטה הציעה כפתור ביצוע של פעולות");
const drShown = await page.$eval("#cmdOut", el => el.innerText);
if (!/יעקב בן ציון/.test(drShown)) fail("הנמען אינו מוצג: " + drShown);
if (!/לא קיבלתי מענה/.test(drShown)) fail("גוף הטיוטה אינו מוצג: " + drShown);
if (!/מרתף בניין 7/.test(drShown)) fail("נושא המייל אינו מוצג: " + drShown);
step("טיוטה מוצגת במלואה ואינה מבצעת דבר");

// שכתוב: הגוף על המסך חייב להתחלף במה שהשרת החזיר, אחרת איתי יעתיק גרסה ישנה.
posts = [];
await page.route("**/functions/v1/nexus-app*", async (r) => {
  const req = r.request();
  if (req.method() === "POST") {
    const body = JSON.parse(req.postData() || "{}");
    posts.push(body);
    if (body.action === "draft_refine")
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, id: "d1", body: "יעקב, מה עם המרתף?" }) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  }
  return r.fallback();
});
await page.click("#drShort");
await page.waitForTimeout(500);
const ref = posts.filter(p => p.action === "draft_refine");
if (ref.length !== 1) fail(`שכתוב שלח ${ref.length} בקשות במקום אחת`);
else {
  if (ref[0].style !== "short") fail("הסגנון שנשלח אינו short: " + JSON.stringify(ref[0]));
  if (ref[0].id !== "d1") fail("השכתוב נשלח על טיוטה אחרת: " + JSON.stringify(ref[0]));
}
const refShown = await page.$eval("#drBody", el => el.innerText);
if (!/מה עם המרתף/.test(refShown)) fail("הגוף לא הוחלף בגרסה המשוכתבת: " + refShown);
if (/לא קיבלתי מענה/.test(refShown)) fail("הגרסה הישנה נשארה על המסך");
step("שכתוב מחליף את הגוף על המסך — אין סיכון להעתיק גרסה ישנה");

posts = [];
await page.click("#drSent");
await page.waitForTimeout(400);
const snt = posts.filter(p => p.action === "draft_sent");
if (snt.length !== 1 || snt[0].id !== "d1") fail("סימון כנשלח לא נשלח נכון: " + JSON.stringify(posts));
step("סימון כנשלח הוא הצהרה של איתי — המערכת לא שולחת בשמו");

// ── 9. מסלול השאלה (v13) ─────────────────────────────────────────────────
// שאלה היא קריאה בלבד. אם יופיע כאן כפתור ביצוע — משהו התבלבל בין לשאול
// לבין לעשות, וזו בדיוק הדלת שאסור לפתוח.
previewReply = { ok: true, route: "ask", question_text: "כמה משימות פתוחות בשדרה?",
                 answer: "יש 14 משימות פתוחות בזירת השדרה, מהן 3 באיחור.", ops: [] };
await page.unroute("**/functions/v1/nexus-app*");
await page.route("**/functions/v1/nexus-app*", async (r) => {
  const req = r.request();
  if (req.method() === "POST") {
    const body = JSON.parse(req.postData() || "{}");
    posts.push(body);
    if (body.action === "command_preview")
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(previewReply) });
    return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  }
  return r.fallback();
});
await openObj("openArena", "a1");
posts = [];
await page.fill("#cmdTxt", "כמה משימות פתוחות בשדרה?");
await page.click("#cmdGo");
await page.waitForTimeout(600);
const askShown = await page.$eval("#cmdOut", el => el.innerText);
if (!/14 משימות פתוחות/.test(askShown)) fail("התשובה מהמוח לא הוצגה: " + askShown);
if (await page.$("#cmdOk")) fail("שאלה הציעה כפתור ביצוע");
if (await page.$("#drCopy")) fail("שאלה הוצגה ככרטיס טיוטה");
if (posts.some(p => p.action === "command_apply" || p.action === "draft_sent"))
  fail("מסלול השאלה כתב למערכת: " + JSON.stringify(posts));
step("שאלה מחזירה תשובה בלבד — קריאה, בלי דלת לביצוע");

// ── 10. התיבה מתרוקנת אחרי מענה — ורק כשהצליח ────────────────────────────
// איתי: "אחרי שמקבלים מענה התיבה נשארת מלאה במה שכתבתי, ואם אני רוצה לנהל
// דיאלוג אז אני צריך למחוק את מה שכתבתי קודם ולכתוב מחדש."
//
// תיבה שאינה מתנקה הופכת כל שאלת המשך לעבודת מחיקה, וזה מה שהורג שיחה.
// אבל הכיוון ההפוך מסוכן יותר: ניקוי אחרי כשל מוחק בדיוק את הטקסט שצריך
// לנסח מחדש. לכן שני הכיוונים נבדקים כאן, ולא רק זה שהתלוננו עליו.

// א. אחרי תשובה — התיבה ריקה, והשאלה עצמה נשארת על המסך.
let box = await page.$eval("#cmdTxt", el => el.value);
if (box !== "") fail(`אחרי תשובה התיבה נשארה מלאה: "${box}"`);
if (!/כמה משימות פתוחות בשדרה/.test(askShown))
  fail("השאלה לא מוצגת ליד התשובה — עם תיבה שמתנקה, איתי מאבד את ההקשר");

previewReply = { ok: true, route: "ask", question_text: "ומי הכי תקוע?",
                 answer: "אהרון לואיס — שלושה פריטים באיחור.", ops: [] };
await page.fill("#cmdTxt", "ומי הכי תקוע?");
await page.click("#cmdGo");
await page.waitForTimeout(600);
const second = await page.$eval("#cmdOut", el => el.innerText);
if (!/שלושה פריטים/.test(second)) fail("שאלת ההמשך לא נענתה: " + second);
box = await page.$eval("#cmdTxt", el => el.value);
if (box !== "") fail("התיבה לא התרוקנה אחרי שאלת ההמשך");
step("דיאלוג: שאלה, תשובה, ושאלה נוספת — בלי מחיקה ידנית באמצע");

// ב. תצוגה מקדימה של מוטציה — ההצעה על המסך והתיבה פנויה. התיקון אינו
//    עובר כאן אלא בתיבה משלו (#cmdFix), ולכן אין מה לשמר.
previewReply = { ok: true, summary: "מעביר לאהרון", ops: OPS, question: null };
await openObj("openTask", "t1");
await page.fill("#cmdTxt", "תעביר לאהרון");
await page.click("#cmdGo");
await page.waitForSelector("#cmdOk", { timeout: 4000 });
box = await page.$eval("#cmdTxt", el => el.value);
if (box !== "") fail(`אחרי תצוגה מקדימה התיבה נשארה מלאה: "${box}"`);
step("תצוגה מקדימה מרוקנת את התיבה");

// ג. **הכיוון ההפוך.** לא זוהתה פעולה → הטקסט נשאר, כי הוא מה שצריך לנסח
//    מחדש. ניקוי כאן היה מחליף תקלה אחת בגרועה ממנה.
previewReply = { ok: true, summary: null, ops: [], question: null };
await openObj("openTask", "t1");
await page.fill("#cmdTxt", "בלגן מוחלט שאי אפשר להבין");
await page.click("#cmdGo");
await page.waitForTimeout(600);
box = await page.$eval("#cmdTxt", el => el.value);
if (box !== "בלגן מוחלט שאי אפשר להבין")
  fail(`בקשה שלא הובנה מחקה את מה שאיתי כתב: "${box}"`);
step("בקשה שלא הובנה משאירה את הטקסט — יש מה לנסח מחדש");

// ד. כשל רשת — אותו כלל בדיוק. תקלה חולפת לא גובה הקלדה מחדש.
await page.unroute("**/functions/v1/nexus-app*");
await page.route("**/functions/v1/nexus-app*", r => r.request().method() === "POST"
  ? r.fulfill({ status: 500, contentType: "application/json", body: "{}" })
  : r.fallback());
await openObj("openTask", "t1");
await page.fill("#cmdTxt", "תסמן שנסגר");
await page.click("#cmdGo");
await page.waitForTimeout(700);
box = await page.$eval("#cmdTxt", el => el.value);
if (box !== "תסמן שנסגר") fail(`כשל בקריאה מחק את מה שאיתי כתב: "${box}"`);
step("כשל בקריאה משאיר את הטקסט");

await browser.close();
if (errors.length) { console.log(`\n${errors.length} כשלים`); process.exit(1); }
console.log("\nתיבת הפקודה — הכל עבר.");
