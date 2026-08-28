// ‏HQ-Next בשורש (27.8, לילה 2) — שתי שכבות:
// ‏(א) מצב הדגמה: הבית נטען, לוח הכיסוי חי, אין "הדבר האחד".
// ‏(ב) מצב חי מדומה: fixture בצורת nexus-app v34 האמיתית (weight ·
//     waiting_on · expected_by · last_activity_at · date_source) מוזרק
//     ב-route — מוכיח שהמיפוי והפעולות (task_done · decision_decide)
//     שולחים בדיוק את ה-payload שהמנועים מצפים לו, בלי מפתח אמיתי.
import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
let pass = 0; const fails = [];
const T = async (name, fn) => { try { await fn(); pass++; console.log("· ✓ " + name); } catch (e) { fails.push(name + " :: " + String(e.message || e).split("\n")[0]); console.log("· ✗ " + name); } };

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const iso = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const FIX = {
  now: "27.8.2026, 21:00",
  people: [{ id: "p-itay", name: "איתי רובין" }, { id: "p-shira", name: "שירה אבן צור" }],
  arenas: [{ id: "ar1", name: "השדרה / קניון בית שמש", status: "active", goal: "מיצוי" }],
  tasks: [
    { id: "t-mine", title: "ZZFIX משימה שלי קפואה", arena_id: "ar1", owner_id: "p-itay", status: "open", weight: "critical", due_date: iso(-5), date_source: "legacy", last_activity_at: daysAgo(20), waiting_on: null, expected_by: null },
    { id: "t-cov", title: "ZZFIX מובטחת של שירה", arena_id: "ar1", owner_id: "p-shira", status: "waiting", weight: "major", due_date: iso(-2), date_source: "anchor", last_activity_at: daysAgo(2), waiting_on: "שירה אבן צור", expected_by: iso(3) },
  ],
  closed_today: [{ id: "c1" }],
  home_brief: null, decisions: [],
};
const DECFIX = { decisions: [{ id: "d-zz", title: "ZZFIX האם להתקדם?", arena_id: "ar1", status: "pending", needed_by: iso(2), recommendation: "כן." }] };

const b = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {});
const pg = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const jserr = [];
pg.on("pageerror", (e) => jserr.push(String(e.message)));

/* ── (א) הדגמה ── */
await pg.goto(URL, { waitUntil: "domcontentloaded" });
await pg.waitForTimeout(1600);
await T("אין 'הדבר האחד' בבית", async () => { if (await pg.getByText("הדבר האחד").count()) throw new Error("קיים"); });
await T("לוח הכיסוי — התמונה המלאה", () => pg.getByText("התמונה המלאה").first().waitFor({ timeout: 4000 }));
await T("חריגים אדומים מוצגים", () => pg.getByText("בלי טיפול חי").first().waitFor({ timeout: 4000 }));
await T("מצב הדגמה מוצהר", () => pg.getByText("התחבר 🔑").first().waitFor({ timeout: 4000 }));

/* ── (ב) חי מדומה: מפתח + route ── */
const posts = [];
await pg.route("**/functions/v1/nexus-app**", async (route) => {
  const req = route.request();
  if (req.method() === "POST") { posts.push(JSON.parse(req.postData() || "{}")); return route.fulfill({ json: { ok: true, applied: 1 } }); }
  return route.fulfill({ json: FIX });
});
await pg.route("**/functions/v1/nx-dec**", (route) => route.fulfill({ json: DECFIX }));
await pg.route("**/functions/v1/nx-act**", async (route) => {
  posts.push(JSON.parse(route.request().postData() || "{}"));
  return route.fulfill({ json: { ok: true } });
});
await pg.evaluate(() => localStorage.setItem("nx_k3", "ZZTEST-fixture"));
await pg.reload({ waitUntil: "domcontentloaded" });
await pg.waitForTimeout(1800);

await T("LIVE נדלק על ה-fixture", () => pg.getByText("LIVE").first().waitFor({ timeout: 5000 }));
await T("המשימה הקפואה שלי בחריגים", () => pg.getByText("ZZFIX משימה שלי קפואה").first().waitFor({ timeout: 4000 }));
await T("המובטחת של שירה מכוסה (לא בחריגים בבית)", async () => {
  const home = pg.locator("main");
  if (await home.getByText("ZZFIX מובטחת של שירה").count()) throw new Error("מוצגת כחריגה למרות הבטחה חיה");
});
await T("צ'יפ אצלי + שירה בידיים", async () => {
  await pg.getByText("אצלי", { exact: false }).first().waitFor({ timeout: 3000 });
  await pg.getByText("שירה אבן צור").first().waitFor({ timeout: 3000 });
});
await T("בוצע בחריג ⟶ POST task_done אמיתי", async () => {
  await pg.getByText("ZZFIX משימה שלי קפואה").first().click();
  await pg.getByText("בוצע ✓").first().waitFor({ timeout: 3000 });
  await pg.getByText("בוצע ✓").first().click();
  await pg.waitForTimeout(900);
  if (!posts.some((p) => p.action === "task_done" && p.id === "t-mine")) throw new Error("לא נשלח task_done עם id הנכון");
});
await T("עמוד המשימות חי — הבטחה מוצגת", async () => {
  await pg.getByText("משימות", { exact: true }).last().click();
  await pg.getByText("אצל אחרים", { exact: false }).first().click();
  await pg.getByText("ZZFIX מובטחת של שירה").first().waitFor({ timeout: 4000 });
  await pg.getByText("🤝 הובטח").first().waitFor({ timeout: 3000 });
});
await T("החלטה מה-fixture + הכרעה ⟶ decision_decide", async () => {
  await pg.getByText("החלטות", { exact: true }).last().click();
  await pg.getByText("ZZFIX האם להתקדם?").first().waitFor({ timeout: 4000 });
  await pg.getByText("הוכרע ✓").first().click();
  await pg.waitForTimeout(900);
  if (!posts.some((p) => p.action === "decision_decide" && p.id === "d-zz" && p.verdict === "decided")) throw new Error("payload שגוי");
});
await T("אפס שגיאות JS", async () => { if (jserr.length) throw new Error(jserr.join(" | ")); });

await b.close();
console.log(`\nHQ root: ${pass} עברו · ${fails.length} נכשלו`);
if (fails.length) { fails.forEach((f) => console.log("  ✗ " + f)); process.exit(1); }
