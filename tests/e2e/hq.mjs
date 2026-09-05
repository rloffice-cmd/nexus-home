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
  people: [{ id: "p-itay", name: "איתי רובין" }, { id: "p-shira", name: "דנה לוי" }],
  arenas: [{ id: "ar1", name: "השדרה / קניון בית שמש", status: "active", goal: "מיצוי" }],
  tasks: [
    { id: "t-mine", title: "ZZFIX משימה שלי קפואה", arena_id: "ar1", owner_id: "p-itay", status: "open", weight: "critical", due_date: iso(-5), date_source: "legacy", last_activity_at: daysAgo(20), waiting_on: null, expected_by: null },
    { id: "t-cov", title: "ZZFIX מובטחת של דנה", arena_id: "ar1", owner_id: "p-shira", status: "waiting", weight: "major", due_date: iso(-2), date_source: "anchor", last_activity_at: daysAgo(2), waiting_on: "דנה לוי", expected_by: iso(3) },
  ],
  closed_today: [{ id: "c1" }],
  home_brief: null, decisions: [],
};
const DECFIX = { decisions: [{ id: "d-zz", title: "ZZFIX האם להתקדם?", arena_id: "ar1", status: "pending", needed_by: iso(2), recommendation: "כן." }] };
FIX.meetings = [
  { id: "ev1", title: "ZZFIX ועדת היתרים", starts_at: new Date(Date.now() + 3 * 3600000).toISOString(), all_day: false, location: "מודיעין עילית", arena: "השדרה / קניון בית שמש", on_date: iso(0), day_offset: 0 },
  { id: "ev2", title: "ZZFIX פגישת עבר", starts_at: daysAgo(2), all_day: false, on_date: iso(-2), day_offset: -2 },
];
FIX.preps = [{ id: "pr1", event_id: "ev1", body: "ZZFIX נקודת המפתח: לוח הזמנים", depth: "מלא" }];
FIX.events = [{ arena_id: "ar1", description: "ZZFIX דיון בוררות נקבע", happened_at: daysAgo(1) }];
FIX.verifications = [{ id: "v-zz", kind: "fact", subject: "ZZFIX דוגמה", question: "ZZFIX האם שכר הדירה 41,000?" }];
FIX.lessons = [{ lesson: "ZZFIX לקח לבדיקה", created_at: daysAgo(3) }];
const DASHFIX = { assets: [
  { id: "a1", code: "500", name: "ZZFIX חנות הסופר", arena_id: "ar1", is_rented: true, asking_rent: 41000, for_sale: true, asking_price: 9000000, area_gross: 480 },
  { id: "a2", code: "60", name: "ZZFIX משרד פנוי", arena_id: "ar1", is_rented: false, for_sale: false },
] };

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
await T("באנר הדגמה — נתוני דוגמה לא מתחזים לאמת", () => pg.getByText("מצב הדגמה — אלה נתוני דוגמה").first().waitFor({ timeout: 4000 }));

/* ── (ב) חי מדומה: routes ⟶ התחברות דרך המגירה האמיתית (לא prompt) ── */
const posts = [];
const FILEFIX = { folders: [{ folder: "G:/דזירוב/ג2", short: "דזירוב/ג2", docs: 12, sample: "הסכם שכירות.pdf", suggest_arena_id: "ar1", suggest_arena: "השדרה / קניון בית שמש" }], arenas: [{ id: "ar1", name: "השדרה / קניון בית שמש" }], count: { docs: 12, folders: 1 } };
await pg.route("**/functions/v1/nexus-app**", async (route) => {
  const req = route.request();
  if (req.method() === "POST") { posts.push(JSON.parse(req.postData() || "{}")); return route.fulfill({ json: { ok: true, applied: 1 } }); }
  return route.fulfill({ json: FIX });
});
await pg.route("**/functions/v1/nx-dec**", (route) => route.fulfill({ json: DECFIX }));
await pg.route("**/functions/v1/nx-dash**", (route) => route.fulfill({ json: DASHFIX }));
await pg.route("**/functions/v1/nx-act**", async (route) => {
  posts.push(JSON.parse(route.request().postData() || "{}"));
  return route.fulfill({ json: { ok: true } });
});
await pg.route("**/functions/v1/nx-file**", async (route) => {
  const p = JSON.parse(route.request().postData() || "{}");
  posts.push(p);
  if (p.action === "unfiled_list") return route.fulfill({ json: FILEFIX });
  return route.fulfill({ json: { ok: true, filed: 12 } });
});

await T("התחברות במגירה: הדבקת מפתח ⟶ LIVE בלי reload", async () => {
  await pg.getByText("מצב הדגמה — אלה נתוני דוגמה").first().click();
  await pg.getByPlaceholder("מפתח Nexus…").waitFor({ timeout: 3000 });
  await pg.getByPlaceholder("מפתח Nexus…").fill("ZZTEST-fixture");
  await pg.getByText("התחבר ✓").first().click();
  await pg.getByText("LIVE").first().waitFor({ timeout: 6000 });
  await pg.waitForTimeout(800);
});
await T("המשימה הקפואה שלי בחריגים", () => pg.getByText("ZZFIX משימה שלי קפואה").first().waitFor({ timeout: 4000 }));
await T("המובטחת של דנה מכוסה (לא בחריגים בבית)", async () => {
  const home = pg.locator("main");
  if (await home.getByText("ZZFIX מובטחת של דנה").count()) throw new Error("מוצגת כחריגה למרות הבטחה חיה");
});
await T("צ'יפ אצלי + דנה בידיים", async () => {
  await pg.getByText("אצלי", { exact: false }).first().waitFor({ timeout: 3000 });
  await pg.getByText("דנה לוי").first().waitFor({ timeout: 3000 });
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
  await pg.getByText("ZZFIX מובטחת של דנה").first().waitFor({ timeout: 4000 });
  await pg.getByText("🤝 הובטח").first().waitFor({ timeout: 3000 });
});
await T("החלטה מה-fixture + הכרעה ⟶ decision_decide", async () => {
  await pg.getByText("החלטות", { exact: true }).last().click();
  await pg.getByText("ZZFIX האם להתקדם?").first().waitFor({ timeout: 4000 });
  await pg.getByText("✓ קבל המלצה").first().click();
  await pg.waitForTimeout(900);
  if (!posts.some((p) => p.action === "decision_decide" && p.id === "d-zz" && p.verdict === "decided")) throw new Error("payload שגוי");
});
await T("זירות: כרטיס זירה + תיק זירה", async () => {
  await pg.getByText("זירות", { exact: true }).last().click();
  await pg.getByText("השדרה", { exact: false }).first().waitFor({ timeout: 4000 });
  await pg.getByText("השדרה").first().click();
  await pg.getByText("ZZFIX דיון בוררות נקבע").first().waitFor({ timeout: 4000 });
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
});
await T("נכסים: KPI + מושכר/למכירה", async () => {
  await pg.getByText("נכסים ·", { exact: false }).first().click();
  await pg.getByText("ZZFIX חנות הסופר").first().waitFor({ timeout: 4000 });
  await pg.getByText("שכ\"ד חודשי").first().waitFor({ timeout: 3000 });
  await pg.getByText("למכירה · ₪9,000,000").first().waitFor({ timeout: 3000 });
});
await T("פגישות: עתידית מוצגת · עבר מוסתר · תיק נפתח", async () => {
  await pg.getByText("פגישות", { exact: true }).last().click();
  await pg.getByText("ZZFIX ועדת היתרים").first().waitFor({ timeout: 4000 });
  if (await pg.getByText("ZZFIX פגישת עבר").count()) throw new Error("פגישת עבר מוצגת");
  await pg.getByText("ZZFIX ועדת היתרים").first().click();
  await pg.getByText("ZZFIX נקודת המפתח").first().waitFor({ timeout: 4000 });
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
});
await T("תפריט ☰ — הפונקציות מההמבורגר חזרו", async () => {
  await pg.getByLabel("עוד").click();
  await pg.getByText("שיוך מסמכים").first().waitFor({ timeout: 3000 });
  await pg.getByText("מה לא ברור").first().waitFor({ timeout: 2000 });
  await pg.getByText("האפליקציה הקודמת").first().waitFor({ timeout: 2000 });
});
await T("שיוך מסמכים: הצעה ⟶ POST file_folder אמיתי", async () => {
  await pg.getByText("שיוך מסמכים").first().click();
  await pg.getByText("דזירוב/ג2").first().waitFor({ timeout: 4000 });
  if (!posts.some((p) => p.action === "unfiled_list")) throw new Error("לא נשלח unfiled_list");
  await pg.getByText("✓ השדרה").first().click();
  await pg.waitForTimeout(800);
  if (!posts.some((p) => p.action === "file_folder" && p.folder === "G:/דזירוב/ג2" && p.arena_id === "ar1")) throw new Error("payload שגוי");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(600);
});
await T("מה לא ברור: אישור ⟶ POST verify_commit", async () => {
  await pg.getByLabel("עוד").click();
  await pg.getByText("מה לא ברור").first().waitFor({ timeout: 3000 });
  await pg.getByText("מה לא ברור").first().click();
  await pg.getByText("ZZFIX האם שכר הדירה").first().waitFor({ timeout: 4000 });
  await pg.getByText("✓ נכון כמו שכתוב").first().click();
  await pg.waitForTimeout(800);
  if (!posts.some((p) => p.action === "verify_commit" && p.id === "v-zz" && p.verdict === "confirm")) throw new Error("payload שגוי");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(600);
});
await T("אנשים במגירה — מהנתונים החיים", async () => {
  await pg.getByLabel("עוד").click();
  await pg.getByText("אנשים").first().waitFor({ timeout: 3000 });
  await pg.getByText("אנשים").first().click();
  await pg.getByText("דנה לוי").first().waitFor({ timeout: 4000 });
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(600);
});
await T("כותרות בולטות — פס מבטא על .sec", async () => {
  const w = await pg.evaluate(() => {
    const el = document.querySelector(".sec"); if (!el) return "missing";
    return getComputedStyle(el, "::before").width;
  });
  if (w === "missing" || w === "none" || w === "auto" || parseFloat(w) < 3) throw new Error("אין פס מבטא: " + w);
});
await T("אפס שגיאות JS", async () => { if (jserr.length) throw new Error(jserr.join(" | ")); });

await b.close();
console.log(`\nHQ root: ${pass} עברו · ${fails.length} נכשלו`);
if (fails.length) { fails.forEach((f) => console.log("  ✗ " + f)); process.exit(1); }
