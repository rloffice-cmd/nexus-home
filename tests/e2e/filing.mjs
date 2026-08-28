// מסך שיוך המסמכים, מקצה לקצה מול שרת מדומה.
// כל שיוך כאן נוגע בעשרות מסמכים בלחיצה אחת, ולכן הבדיקה מוודאת לא רק
// שהמסך נטען אלא שהבקשה שיצאה היא בדיוק זו שהמשתמש ביקש, ושהביטול
// מחזיר את אותם מזהים ולא "כל מה שבתיקייה".
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/classic.html";
const errors = [];
const step = (s) => console.log("· " + s);
const fail = (s) => { errors.push(s); console.log("  ✗ " + s); };

const FOLDERS = [
  { folder: "D:\\OneDrive\\מער בית שמש\\ליווי בנקאי", short: "מער בית שמש\\ליווי בנקאי",
    docs: 38, sample: "כתב הסכמה משקיעים.docx",
    suggest_arena_id: "arena-1", suggest_arena: "השדרה / קניון בית שמש" },
  { folder: "D:\\OneDrive\\הנהלת חשבונות\\9.2020", short: "הנהלת חשבונות\\9.2020",
    docs: 17, sample: "01_000095.pdf", suggest_arena_id: null, suggest_arena: null },
];
const ARENAS = [
  { id: "arena-1", name: "השדרה / קניון בית שמש", status: "active" },
  { id: "arena-2", name: "ג2 — דז'יקוב ויז'ניץ", status: "active" },
  { id: "arena-3", name: "עפולה — כרדן G", status: "pipeline" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "he-IL" });
const page = await ctx.newPage();
page.on("pageerror", e => fail("pageerror: " + e.message));

const posted = [];

await page.route("**/functions/v1/nexus-app*", r =>
  r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ now: "13:00", today: "2026-07-26", arenas: ARENAS,
      tasks: [], decisions: [], people: [], objectives: [], commitments: [],
      followups: [], ideas: [], captures: [], events: [], lessons: [], closed_today: [] }) }));
await page.route("**/functions/v1/nx-dash*", r =>
  r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({}) }));

await page.route("**/functions/v1/nx-file*", async (route) => {
  const body = JSON.parse(route.request().postData() || "{}");
  posted.push(body);
  let res = { error: "unknown action" };
  if (body.action === "unfiled_list") {
    res = { ok: true, folders: FOLDERS, arenas: ARENAS, count: { docs: 55, folders: 2 } };
  } else if (body.action === "file_folder") {
    res = { ok: true, filed: 38, arena: "השדרה / קניון בית שמש", rule: true,
            ids: ["id-a", "id-b", "id-c"] };
  } else if (body.action === "ignore_folder") {
    res = { ok: true, ignored: 17, ids: ["id-x"] };
  } else if (body.action === "undo") {
    res = { ok: true, restored: body.ids.length };
  } else if (body.action === "arena_create") {
    res = body.name === "כבר קיימת"
      ? { ok: true, id: "arena-2", name: "ג2 — דז'יקוב ויז'ניץ", existed: true }
      : { ok: true, id: "arena-new", name: body.name, existed: false };
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(res) });
});

await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.evaluate(() => localStorage.setItem("nx_k3", "test-key"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector("nav button", { timeout: 8000 });
step("נכנס במצב מחובר");

await page.click("#moreBtn");
await page.waitForSelector("text=שיוך מסמכים", { timeout: 4000 });
await page.click("text=🗂 שיוך מסמכים");
await page.waitForSelector("text=ליווי בנקאי", { timeout: 4000 });
step("המסך נפתח מתפריט העוד");

if (!posted.some(p => p.action === "unfiled_list")) fail("לא נשלחה בקשת רשימה");

const txt = await page.$eval("#main", el => el.innerText);
if (!/38 מסמכים/.test(txt)) fail("מספר המסמכים בתיקייה לא מוצג");
if (!/55/.test(txt)) fail("סך המסמכים בארגז לא מוצג");
if (!/השדרה/.test(txt)) fail("הצעת הזירה לא מוצגת");
step("תיקיות, כמויות והצעת זירה מוצגות");

// תיקייה בלי הצעה חייבת בכל זאת לאפשר בחירה — אחרת היא תקועה בארגז לנצח
if (!/בחר זירה/.test(txt)) fail("תיקייה ללא הצעה נשארת בלי דרך לשייך");
step("גם תיקייה ללא הצעה ניתנת לשיוך");

// שיוך בלחיצה על ההצעה
await page.click("button.go");
await page.waitForTimeout(350);
const filePost = posted.find(p => p.action === "file_folder");
if (!filePost) fail("לא נשלחה בקשת שיוך");
else {
  if (filePost.folder !== FOLDERS[0].folder) fail("נשלחה תיקייה שגויה: " + filePost.folder);
  if (filePost.arena_id !== "arena-1") fail("נשלחה זירה שגויה: " + filePost.arena_id);
}
const after = await page.$eval("#main", el => el.innerText);
if (/ליווי בנקאי/.test(after)) fail("התיקייה נשארה ברשימה אחרי שיוך");
if (!/17/.test(after)) fail("המונה לא התעדכן אחרי שיוך");
step("שיוך: הבקשה נכונה, התיקייה ירדה מהרשימה");

// ביטול — הדבר שהופך שיוך של עשרות מסמכים לפעולה שאפשר לחזור ממנה
const undoBtn = await page.$(".toast.on .u");
const undoShown = undoBtn ? await undoBtn.isVisible() : false;
if (!undoShown) fail("לא הוצע ביטול אחרי פעולה על 38 מסמכים");
if (undoShown) {
  await undoBtn.click();
  await page.waitForTimeout(400);
  const undoPost = posted.find(p => p.action === "undo");
  if (!undoPost) fail("הביטול לא נשלח לשרת");
  else {
    if (JSON.stringify(undoPost.ids) !== JSON.stringify(["id-a", "id-b", "id-c"]))
      fail("הביטול לא שלח את המזהים שהוחזרו: " + JSON.stringify(undoPost.ids));
    if (undoPost.folder !== FOLDERS[0].folder) fail("הביטול לא ביקש להסיר את הכלל שנלמד");
  }
  step("ביטול מחזיר בדיוק את המסמכים ששויכו, ומסיר את הכלל");
}

// בחירת זירה ידנית לתיקייה שאין לה הצעה
await page.waitForSelector("text=הנהלת חשבונות", { timeout: 4000 });
const buttons = await page.$$("#main .card .mini button");
let picked = false;
for (const b of buttons) {
  if ((await b.innerText()).trim() === "בחר זירה") { await b.click(); picked = true; break; }
}
if (!picked) fail("לא נמצא כפתור בחירת זירה");
else {
  await page.waitForSelector(".sheet.on", { timeout: 3000 });
  const sheet = await page.$eval(".sheet", el => el.innerText);
  for (const a of ARENAS) if (!sheet.includes(a.name)) fail("זירה חסרה בבורר: " + a.name);
  if (!/בצנרת/.test(sheet)) fail("סטטוס הזירה לא מסומן בבורר");
  await page.click(`.sheet .li:has-text("ג2")`);
  await page.waitForTimeout(350);
  const p2 = posted.filter(p => p.action === "file_folder").pop();
  if (p2.arena_id !== "arena-2") fail("בחירה ידנית שלחה זירה שגויה: " + p2.arena_id);
  if (p2.folder !== FOLDERS[1].folder) fail("בחירה ידנית שלחה תיקייה שגויה");
  step("בורר הזירות שולח את הזירה והתיקייה הנכונות");
}

// פתיחת זירה חדשה מתוך הבורר, ושיוך אליה מיד.
// הרשימה נטענת מחדש כי השיוך הקודם הוריד ממנה את התיקייה חסרת ההצעה.
await page.evaluate(() => loadFiling());
await page.waitForSelector("text=הנהלת חשבונות", { timeout: 4000 });
const btns2 = await page.$$("#main .card .mini button");
for (const b of btns2) if ((await b.innerText()).trim() === "בחר זירה") { await b.click(); break; }
await page.waitForSelector("#newArena", { timeout: 3000 });

// שם קצר מדי לא אמור להגיע לשרת בכלל
await page.fill("#newArena", "א");
await page.click(".sheet button.go");
await page.waitForTimeout(250);
if (posted.some(p => p.action === "arena_create"))
  fail("שם קצר מדי נשלח לשרת במקום להיעצר במסך");
step("שם קצר מדי נעצר לפני השרת");

await page.fill("#newArena", "בית החלמה ליולדות");
await page.click(".sheet button.go");
await page.waitForTimeout(450);
const ac = posted.find(p => p.action === "arena_create");
if (!ac) fail("פתיחת הזירה לא נשלחה");
else if (ac.name !== "בית החלמה ליולדות") fail("נשלח שם שגוי: " + ac.name);
const filedNew = posted.filter(p => p.action === "file_folder").pop();
if (!filedNew || filedNew.arena_id !== "arena-new")
  fail("התיקייה לא שויכה לזירה שנפתחה: " + JSON.stringify(filedNew));
if (filedNew.folder !== FOLDERS[1].folder) fail("שויכה תיקייה שגויה לזירה החדשה");
step("זירה חדשה נפתחת והתיקייה משויכת אליה מיד");

// המסך אינו חושף פעולות כשאין חיבור חי
await page.evaluate(() => { LIVE = false; FL.err = "demo"; render(); });
const demo = await page.$eval("#main", el => el.innerText);
if (/לא רלוונטי/.test(demo)) fail("פעולות שיוך מוצגות גם בלי חיבור חי");
step("במצב הדגמה המסך לא מציע פעולות");

await browser.close();
console.log("\n===== מסך שיוך המסמכים =====");
if (errors.length) { console.log(`  ✗ ${errors.length} כשלים`); process.exit(1); }
console.log("  ✓ שיוך, ביטול, בורר זירות ומצב הדגמה — הכל עובד");
