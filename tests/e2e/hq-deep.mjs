// ‏QA לילה 4 — סיור מקצה לקצה עם נפח ייצור אמיתי (~90 משימות), צילומים לכל מסך.
import { chromium } from "playwright";
const URL = "http://127.0.0.1:8099/index.html";
const OUT = process.env.OUT || "/tmp/nexus-shots";
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const iso = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ~90 משימות בצורת v34, מפוזרות על 12 זירות ו-7 בעלים
const ARENAS = ["השדרה / קניון בית שמש", "פסגת שלמה", "תב\"ע השדרה", "ג2", "אגרו-אנרגיה", "עפולה", "אודם", "מע\"ר בית שמש", "פינוי בינוי", "חמד", "משק 85", "כללי פיננסי"].map((n, i) => ({ id: "ar" + i, name: n, status: "active", goal: "יעד " + n }));
const PEOPLE = [["p-itay", "איתי רובין"], ["p-shira", "שירה אבן צור"], ["p-ilona", "אילונה קפטש"], ["p-aharon", "אהרון לואיס"], ["p-yaniv", "יניב מידן"], ["p-shayke", "שייקה לוין"], ["p-yoni", "יוני גורפינקל"]].map(([id, name], i) => ({ id, name, role: i ? "צוות" : "בעלים", organization: i % 2 ? "רם ישראל" : "", phone: "05012345" + i, reliability_notes: i === 3 ? "מורח, דורש נדנוד" : i === 1 ? "אמינה ויסודית" : "" }));
const W = ["critical", "major", "normal", "minor"];
const tasks = [];
for (let i = 0; i < 90; i++) {
  const owner = PEOPLE[i % PEOPLE.length];
  const frozenDays = i % 7 === 0 ? 15 + (i % 30) : i % 3;
  const promised = i % 5 === 0 ? iso(3) : i % 11 === 0 ? iso(-2) : null;
  tasks.push({
    id: "t" + i, title: `ZZQA משימה ${i} — ${["גבייה", "היתר", "חוזה", "התחשבנות", "מכרז"][i % 5]} ${ARENAS[i % ARENAS.length].name.split(" ")[0]}`,
    arena_id: ARENAS[i % ARENAS.length].id, owner_id: owner.id,
    status: i % 4 === 0 ? "waiting" : "open", weight: W[i % 4],
    due_date: i % 3 === 0 ? iso((i % 10) - 5) : null, date_source: ["anchor", "legacy", "itay"][i % 3],
    last_activity_at: daysAgo(frozenDays), waiting_on: i % 4 === 0 ? owner.name : null, expected_by: promised,
  });
}
const FIX = {
  now: "29.8.2026, 03:00", people: PEOPLE, arenas: ARENAS, tasks, closed_today: [{ id: "c1" }, { id: "c2" }],
  meetings: [
    { id: "ev1", title: "ZZQA ועדת היתרים", starts_at: new Date(Date.now() + 3 * 3600000).toISOString(), all_day: false, location: "מודיעין עילית", arena: ARENAS[1].name, on_date: iso(0), day_offset: 0 },
    { id: "ev2", title: "ZZQA פגישת NBS", starts_at: new Date(Date.now() + 26 * 3600000).toISOString(), all_day: false, on_date: iso(1), day_offset: 1 },
  ],
  preps: [{ id: "pr1", event_id: "ev1", body: "ZZQA נקודת המפתח: לוח הזמנים", depth: "מלא" }],
  events: [{ arena_id: "ar0", description: "ZZQA דיון בוררות נקבע", happened_at: daysAgo(1) }],
  lessons: [{ lesson: "ZZQA לקח ראשון", created_at: daysAgo(3) }],
  verifications: [{ id: "v-zz", kind: "fact", subject: "ZZQA אודם", question: "ZZQA האם שכר הדירה 41,000?" }],
  home_brief: null, decisions: [],
  alpha: {
    shifts_today: 1,
    mandates: [
      { id: "am-p", title: "ZZQA מנדט מוצע — רדיפת נתיב קריטי", goal: "לרדוף פריטים על הנתיב הקריטי גם בלי איחור", status: "proposed", expires_at: iso(30) },
      { id: "am-a", title: "ZZQA מנדט פעיל — רדיפת איחורים", goal: "", status: "active", expires_at: iso(44) },
    ],
    recent_actions: [{ id: "aa1", body: "ZZQA • יניב — תזכורת שנייה על התחשבנות", action: "follow_up", outcome: "delivered", sent_at: daysAgo(1) }],
  },
};
const DECFIX = { decisions: [{ id: "d-zz", title: "ZZQA האם להתקדם?", arena_id: "ar0", status: "pending", needed_by: iso(2), recommendation: "כן." }] };
const DASHFIX = {
  assets: [
    { id: "a1", code: "500", name: "ZZQA חנות הסופר", arena_id: "ar7", is_rented: true, asking_rent: 41000, for_sale: true, asking_price: 9000000, area_gross: 480 },
    { id: "a2", code: "60", name: "ZZQA משרד פנוי", arena_id: "ar0", is_rented: false, for_sale: false },
  ],
  loans: [{ id: "ln1", lender: "ZZQA בנק לאומי", principal: 4200000, interest: "P+1.2%", collateral: "השדרה — קומה 2-" }],
};
const REPFIX = {
  ok: true, mode: "owner", name: "איתי",
  pulse: { pending: 18, stuck: 4, silent: 12 },
  silent: [{ title: "ZZQA גנרטור שבת", person: "אהרון לואיס", status: "waiting", last_report_at: daysAgo(32) }],
  reports: [{ at: daysAgo(1), note: "ZZQA מוטי מכין נתוני גבייה", title: "ZZQA להעביר נתוני גבייה", person: "שירה אבן צור", status: "open" }],
  team: [],
};

const b = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {});
let pass = 0; const fails = []; const posts = [];
const T = async (name, fn) => { try { await fn(); pass++; console.log("· ✓ " + name); } catch (e) { fails.push(name + " :: " + String(e.message || e).split("\n")[0]); console.log("· ✗ " + name + " :: " + String(e.message || e).split("\n")[0]); } };

async function makePage(vp) {
  const pg = await b.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  pg.jserr = [];
  pg.on("pageerror", (e) => pg.jserr.push(String(e.message)));
  await pg.route("**/functions/v1/nexus-app**", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      const p = JSON.parse(req.postData() || "{}"); posts.push(p);
      if (p.action === "command_preview") return route.fulfill({ json: { ops: [{ op: "task.update", id: p.id, title: "ZZQA עדכון מהתגובה" }], summary: "ZZQA מה שיבוצע" } });
      return route.fulfill({ json: { ok: true, applied: 1 } });
    }
    return route.fulfill({ json: FIX });
  });
  await pg.route("**/functions/v1/nx-dec**", (r) => r.fulfill({ json: DECFIX }));
  await pg.route("**/functions/v1/nx-dash**", (r) => r.fulfill({ json: DASHFIX }));
  await pg.route("**/functions/v1/report**", (r) => r.fulfill({ json: REPFIX }));
  await pg.route("**/functions/v1/nx-act**", async (r) => { posts.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ json: { ok: true } }); });
  await pg.route("**/functions/v1/nx-file**", async (r) => {
    const p = JSON.parse(r.request().postData() || "{}"); posts.push(p);
    if (p.action === "unfiled_list") return r.fulfill({ json: { folders: [{ folder: "G:/דזירוב/ג2", short: "דזירוב/ג2", docs: 12, sample: "הסכם.pdf", suggest_arena_id: "ar3", suggest_arena: "ג2" }], arenas: ARENAS.map(a => ({ id: a.id, name: a.name })), count: { docs: 12, folders: 1 } } });
    return r.fulfill({ json: { ok: true, filed: 12 } });
  });
  await pg.route("**/functions/v1/nx-ask**", async (r) => {
    const p = JSON.parse(r.request().postData() || "{}"); posts.push(p);
    if (p.poll) return r.fulfill({ json: { status: "done", answer: "ZZQA תשובת המוח העמוק: הכל תקין." } });
    return r.fulfill({ json: { mode: "deep", log_id: "lg-zz" } });
  });
  await pg.goto(URL, { waitUntil: "domcontentloaded" });
  await pg.evaluate(() => localStorage.setItem("nx_k3", "ZZTEST"));
  await pg.reload({ waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(1800);
  return pg;
}

/* ── מסך מלא 393 — הסיור הראשי ── */
const pg = await makePage({ width: 393, height: 852 });
const shot = (n) => pg.screenshot({ path: `${OUT}/${n}.png` });

await T("בית נטען על 90 משימות · LIVE", async () => {
  await pg.getByText("LIVE").first().waitFor({ timeout: 5000 });
  await pg.getByText("התמונה המלאה").first().waitFor({ timeout: 4000 });
  await shot("01-home");
});
await T("צ'יפ מחזיק בבית ⟶ משימות מסוננות על האדם", async () => {
  try {
    await pg.getByLabel("המשימות של אהרון לואיס").click();
    await pg.getByText("אצל אהרון לואיס").first().waitFor({ timeout: 3000 });
    await pg.getByText("ZZQA משימה 3", { exact: false }).first().waitFor({ timeout: 3000 });
    await pg.waitForTimeout(1000); /* ‏כרטיסים יוצאים נשארים ב-DOM עד סוף האנימציה */
    if (await pg.getByText("ZZQA משימה 0 ", { exact: false }).count()) throw new Error("משימה של אדם אחר מוצגת בסינון");
    await pg.getByText("👤 אהרון לואיס").first().click();
    await pg.waitForTimeout(600);
    if (await pg.getByText("אצל אהרון לואיס").count()) throw new Error("הסינון לא ירד ב-✕");
  } finally {
    await pg.getByText("בית", { exact: true }).last().click();
    await pg.waitForTimeout(800);
  }
});
await T("משימה בתוך תיק זירה ⟶ פרטים + בוצע ⟶ task_done", async () => {
  await pg.getByText("זירות", { exact: true }).last().click();
  await pg.waitForTimeout(600);
  const dlg = pg.getByRole("dialog");
  await pg.getByText("השדרה", { exact: false }).first().click();
  await dlg.getByText("ZZQA משימה 0 ", { exact: false }).first().waitFor({ timeout: 4000 });
  await dlg.getByText("ZZQA משימה 0 ", { exact: false }).first().click();
  await dlg.getByText("בוצע ✓").first().waitFor({ timeout: 3000 });
  await dlg.getByText("💬 תגובה חופשית").first().waitFor({ timeout: 2000 });
  await dlg.getByText("בוצע ✓").first().click();
  await pg.waitForTimeout(900);
  if (!posts.some((p) => p.action === "task_done" && p.id === "t0")) throw new Error("לא נשלח task_done מהתיק");
  await pg.getByText("בית", { exact: true }).last().click(); await pg.waitForTimeout(700);
});
await T("צ'יפ זירה בבית ⟶ תיק הזירה נפתח", async () => {
  await pg.getByLabel(/תיק זירה/).first().click();
  await pg.waitForTimeout(900);
  await pg.getByText("משימות ·").first().waitFor({ timeout: 3000 });
  await shot("02-arena-file-from-home");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
});
await T("משימות — נפח מלא, מסננים", async () => {
  await pg.getByText("משימות", { exact: true }).last().click();
  await pg.waitForTimeout(700);
  await pg.getByText("שלי", { exact: false }).first().waitFor({ timeout: 3000 });
  await shot("03-tasks");
  await pg.getByText("קפואות", { exact: false }).first().click();
  await pg.waitForTimeout(500);
  await shot("04-tasks-frozen");
});
await T("נכסים + הלוואות", async () => {
  await pg.getByText("זירות", { exact: true }).last().click();
  await pg.waitForTimeout(500);
  await pg.getByText("נכסים ·", { exact: false }).first().click();
  await pg.waitForTimeout(600);
  await pg.getByText("ZZQA בנק לאומי").first().waitFor({ timeout: 3000 });
  await shot("05-assets-loans");
});
await T("שיחה שורדת מעבר טאב + מוח עמוק", async () => {
  await pg.getByText("אלפא", { exact: true }).last().click();
  await pg.waitForTimeout(600);
  await pg.getByPlaceholder("דבר איתי — שאלה, משימה, בקשה…").fill("מה מצב הגבייה?");
  await pg.getByLabel("שלח").click();
  await pg.waitForTimeout(600);
  // עוברים טאב באמצע הבדיקה העמוקה — התשובה חייבת לחכות כשחוזרים
  await pg.getByText("בית", { exact: true }).last().click();
  await pg.waitForTimeout(5200);
  await pg.getByText("אלפא", { exact: true }).last().click();
  await pg.getByText("ZZQA תשובת המוח העמוק").first().waitFor({ timeout: 9000 });
  await pg.getByText("מה מצב הגבייה?").first().waitFor({ timeout: 2000 });
  await shot("06-ask-survives-tab");
});
await T("פגישה ⟶ 'לסכם עם אלפא' ממלא את התיבה", async () => {
  await pg.getByText("פגישות", { exact: true }).last().click();
  await pg.waitForTimeout(600);
  await pg.getByText("ZZQA ועדת היתרים").first().click();
  await pg.getByText("לסכם את הפגישה עם אלפא ←").first().click();
  await pg.waitForTimeout(700);
  const v = await pg.getByPlaceholder("דבר איתי — שאלה, משימה, בקשה…").inputValue();
  if (!v.includes("סיכום פגישה — ZZQA ועדת היתרים")) throw new Error("התיבה לא מולאה: " + v);
  await shot("07-ask-prefill");
});
await T("תגובה חופשית במגירת משימה ⟶ preview ⟶ apply", async () => {
  await pg.getByText("משימות", { exact: true }).last().click();
  await pg.waitForTimeout(700);
  await pg.getByText("ZZQA משימה 0 ", { exact: false }).first().click();
  await pg.getByText("💬 תגובה חופשית").first().waitFor({ timeout: 3000 });
  await pg.getByPlaceholder(/למשל:/).fill("בוצע חלקית, נשאר ההיתר");
  await pg.getByLabel("שלח תגובה").click();
  await pg.getByText("ZZQA מה שיבוצע").first().waitFor({ timeout: 4000 });
  if (!posts.some((p) => p.action === "command_preview" && p.kind === "task" && p.id === "t0")) throw new Error("לא נשלח command_preview עם kind+id");
  await pg.getByText("אשר ובצע ✓").first().click();
  await pg.waitForTimeout(900);
  if (!posts.some((p) => p.action === "command_apply" && (p.ops || []).length)) throw new Error("לא נשלח command_apply");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(600);
  await pg.getByText("בית", { exact: true }).last().click(); await pg.waitForTimeout(700);
});
await T("☰ ⟶ דיווחים (fixture /report)", async () => {
  await pg.getByLabel("עוד").click();
  await pg.waitForTimeout(600);
  await shot("08-more-menu");
  await pg.getByText("דיווחים מהצוות").first().click();
  await pg.getByText("ZZQA גנרטור שבת").first().waitFor({ timeout: 4000 });
  await pg.getByText("נשמע מזמן").first().waitFor({ timeout: 2000 });
  await shot("09-reports");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
});
await T("☰ ⟶ אלפא: מנדט מוצע ⟶ אישור ⟶ payload", async () => {
  await pg.getByLabel("עוד").click();
  await pg.waitForTimeout(500);
  await pg.getByText("אלפא — מנדטים ופעולות").first().click();
  await pg.getByText("ZZQA מנדט מוצע", { exact: false }).first().waitFor({ timeout: 3000 });
  await shot("10-alpha");
  await pg.getByText("אשר מנדט ✓").first().click();
  await pg.waitForTimeout(700);
  if (!posts.some(p => p.action === "alpha_mandate_approve" && p.id === "am-p")) throw new Error("לא נשלח alpha_mandate_approve");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
});
await T("אנשים — צ'יפ מורח/אמין", async () => {
  await pg.getByLabel("עוד").click(); await pg.waitForTimeout(500);
  await pg.getByText("אנשים").first().click();
  await pg.getByText("מורח").first().waitFor({ timeout: 3000 });
  await pg.getByText("אמין", { exact: true }).first().waitFor({ timeout: 2000 });
  await shot("11-people");
});
await T("כרטיס אדם: לחיצה ⟶ אמינות + משימות פתוחות + חזרה", async () => {
  /* ‏בתוך הדיאלוג בלבד — "אהרון לואיס" קיים גם בצ'יפ בבית מאחורי המגירה */
  const dlg = pg.getByRole("dialog");
  await dlg.getByText("אהרון לואיס").first().click();
  await dlg.getByText("מורח, דורש נדנוד").first().waitFor({ timeout: 3000 });
  await dlg.getByText("משימות פתוחות ·").first().waitFor({ timeout: 2000 });
  await dlg.getByText("ZZQA משימה 3", { exact: false }).first().waitFor({ timeout: 2000 });
  await shot("11b-person-card");
  await dlg.getByText("‹ כל האנשים").first().click();
  await dlg.getByPlaceholder("חיפוש…").waitFor({ timeout: 2000 });
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(500);
});
await T("כפתור אחורה: סוגר מגירה ⟶ חוזר לבית ⟶ סוגר תפריט (לא יוצא)", async () => {
  await pg.getByText("משימות", { exact: true }).last().click();
  await pg.waitForTimeout(700);
  await pg.getByText("ZZQA משימה 0 ", { exact: false }).first().click();
  await pg.getByText("💬 תגובה חופשית").first().waitFor({ timeout: 3000 });
  await pg.goBack(); await pg.waitForTimeout(800);
  if (await pg.getByText("💬 תגובה חופשית").count()) throw new Error("אחורה לא סגר את המגירה");
  await pg.getByText("שלך —", { exact: false }).first().waitFor({ timeout: 2500 });
  await pg.goBack(); await pg.waitForTimeout(800);
  await pg.getByText("התמונה המלאה").first().waitFor({ timeout: 3000 });
  await pg.getByLabel("עוד").click(); await pg.waitForTimeout(600);
  await pg.getByText("שיוך מסמכים").first().waitFor({ timeout: 2000 });
  await pg.goBack(); await pg.waitForTimeout(800);
  if (await pg.getByText("שיוך מסמכים").count()) throw new Error("אחורה לא סגר את התפריט");
  await pg.getByText("התמונה המלאה").first().waitFor({ timeout: 2000 });
});
await T("אפס שגיאות JS בסיור המלא", async () => { if (pg.jserr.length) throw new Error(pg.jserr.join(" | ")); });
await pg.close();

/* ── באנר כשל רשת: מפתח יש, השרת נופל ── */
await T("כשל רשת עם מפתח ⟶ באנר ⛔ ולא הדגמה שקטה", async () => {
  const p2 = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p2.route("**/functions/v1/**", (r) => r.abort());
  await p2.goto(URL, { waitUntil: "domcontentloaded" });
  await p2.evaluate(() => localStorage.setItem("nx_k3", "ZZTEST"));
  await p2.reload({ waitUntil: "domcontentloaded" });
  await p2.waitForTimeout(2000);
  await p2.getByText("החיבור נכשל").first().waitFor({ timeout: 4000 });
  await p2.screenshot({ path: `${OUT}/12-net-error.png` });
  await p2.close();
});

/* ── ביקורת 3.9 (איתי: "הכפתורים לא אומרים מה הם עושים ואין משוב") ──
   ‏(א) כשל של מקור אחד אינו "אין ✓" · (ב) כרטיס החלטה מסביר מקור/✓/✖ ומוביל
   ‏למשימה שקטה · (ג) שמות פעולות, applied=0, סיבת כשל אמיתית, טיוטה. */
const mkPage = () => b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const goLive = async (p) => {
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.evaluate(() => localStorage.setItem("nx_k3", "ZZTEST"));
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.getByText("LIVE").first().waitFor({ timeout: 6000 });
};
await T("nx-dec/nx-dash נופלים ⟶ 'לא נטענו' + נסה שוב, לא 'אין החלטות ✓' / 'אין נכסים'", async () => {
  const p = await mkPage();
  await p.route("**/functions/v1/**", (r) => r.fulfill({ json: {} }));
  await p.route("**/functions/v1/nexus-app**", (r) => r.fulfill({ json: r.request().method() === "POST" ? { ok: true } : FIX }));
  await p.route("**/functions/v1/nx-dec**", (r) => r.fulfill({ status: 500, json: { error: "ZZQA boom" } }));
  await p.route("**/functions/v1/nx-dash**", (r) => r.abort());
  await goLive(p);
  await p.getByText("החלטות", { exact: true }).last().click();
  await p.getByText("ההחלטות לא נטענו").first().waitFor({ timeout: 4000 });
  let txt = await p.evaluate(() => document.body.innerText);
  if (/אין החלטות ממתינות/.test(txt)) throw new Error("כשל nx-dec הוצג כ'אין החלטות ממתינות'");
  await p.getByRole("button", { name: /נסה שוב/ }).first().click();
  await p.waitForTimeout(600);
  await p.getByText("זירות", { exact: true }).last().click();
  await p.getByText("נכסים ·", { exact: false }).first().click();
  await p.getByText("הנכסים לא נטענו").first().waitFor({ timeout: 4000 });
  txt = await p.evaluate(() => document.body.innerText);
  if (/אין נכסים בסינון הזה/.test(txt)) throw new Error("כשל nx-dash הוצג כ'אין נכסים בסינון הזה'");
  await p.screenshot({ path: `${OUT}/15-source-fail.png` });
  await p.close();
});
await T("כרטיס החלטה: מקור · ✓ = / ✖ = · חלופות · משימה שקטה ⟶ פתח את המשימה ⟶ ממתין לתשובה עם owner", async () => {
  const p = await mkPage(); const posts = [];
  const TID = "11111111-2222-3333-4444-555555555555";
  const DEC2 = { decisions: [
    { id: "d-esc", title: "ZZQA משימה שקטה — היתר עפר", arena_id: "ar1", status: "pending", needed_by: iso(1), source: "task-escalation", created_at: daysAgo(2),
      recommendation: "לתת יעד חדש", rationale: `אין תנועה 12 ימים. מזהה משימה: ${TID}`, alternatives: "ZZQA לבטל את המשימה", cost_of_delay: "ZZQA קנס יומי",
      effect: { source_label: "משימה שקטה", approve: "ZZQA ההחלטה תסומן כהוכרעה בלבד", drop: "ZZQA ההחלטה תרד מהתיבה" } },
    { id: "d-learn", title: "ZZQA כלל מוצע — בריף בבוקר", arena_id: "ar1", status: "pending", source: "learning-engine",
      effect: { source_label: "מנוע הלמידה", approve: "ZZQA הכלל ייכנס לפרומפט", drop: "ZZQA הכלל יידחה" } },
  ] };
  const FIX2 = { ...FIX, tasks: [...FIX.tasks, { id: TID, title: "ZZQA משימת ההיתר השקטה", arena_id: "ar1", owner_id: "p-ilona", status: "open", weight: "major", last_activity_at: daysAgo(12) }] };
  await p.route("**/functions/v1/**", (r) => r.fulfill({ json: {} }));
  await p.route("**/functions/v1/nexus-app**", (r) => r.fulfill({ json: r.request().method() === "POST" ? { ok: true } : FIX2 }));
  await p.route("**/functions/v1/nx-dec**", (r) => r.fulfill({ json: DEC2 }));
  await p.route("**/functions/v1/nx-dash**", (r) => r.fulfill({ json: DASHFIX }));
  await p.route("**/functions/v1/nx-act**", (r) => { posts.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill({ json: { ok: true } }); });
  await goLive(p);
  await p.getByText("החלטות", { exact: true }).last().click();
  /* ‏הכותרת מופיעה גם בבית ("צריך ממך") — ממתינים לכפתור שקיים רק במסך ההחלטות */
  await p.getByText("✓ אמץ כלל").first().waitFor({ timeout: 4000 });
  const txt = await p.evaluate(() => document.body.innerText);
  for (const s of ["משימה שקטה", "✓ = ZZQA ההחלטה תסומן", "✖ = ZZQA ההחלטה תרד", "המשימה עצמה לא משתנה מכאן", "✓ קבל המלצה", "✓ אמץ כלל", "✏️ תגובה חופשית", "מנוע הלמידה"]) if (!txt.includes(s)) throw new Error("חסר בכרטיס: " + s + " :: " + txt.replace(/\n/g, " ⏎ ").slice(0, 400));
  if (/הוכרע ✓/.test(txt)) throw new Error("התווית הישנה 'הוכרע ✓' עדיין מוצגת");
  await p.getByRole("button", { name: /חלופות/ }).first().click();
  await p.getByText("ZZQA לבטל את המשימה").first().waitFor({ timeout: 2000 });
  await p.getByText("ZZQA קנס יומי").first().waitFor({ timeout: 2000 });
  await p.screenshot({ path: `${OUT}/16-decision-card.png` });
  await p.getByRole("button", { name: /פתח את המשימה/ }).first().click();
  await p.getByText("ZZQA משימת ההיתר השקטה").first().waitFor({ timeout: 4000 });
  await p.getByText("⏳ ממתין לתשובה").first().click();
  await p.waitForTimeout(800);
  const w = posts.find((x) => x.action === "task_waiting");
  if (!w || w.id !== TID || w.owner !== "אילונה קפטש") throw new Error("task_waiting בלי owner נכון: " + JSON.stringify(w));
  await p.close();
});
await T("אלפא: שמות פעולות (labels · מפה) · applied=0 ⟶ 'לא בוצע דבר' · כשל עם סיבה · טיוטה", async () => {
  const p = await mkPage();
  await p.route("**/functions/v1/**", (r) => r.fulfill({ json: {} }));
  await p.route("**/functions/v1/nexus-app**", (r) => {
    const req = r.request();
    if (req.method() !== "POST") return r.fulfill({ json: FIX });
    const q = JSON.parse(req.postData() || "{}");
    if (q.action === "command_preview") {
      if (/טיוטה/.test(q.text)) return r.fulfill({ json: { ok: true, route: "draft", summary: "ZZQA", draft: { id: "dr1", to_name: "שירה", channel: "whatsapp", subject: null, body: "ZZQA היי שירה, מה עם הגבייה?" }, ops: [] } });
      if (/מפה/.test(q.text)) return r.fulfill({ json: { ops: [{ op: "person.note", id: "p-shira", note: "ZZQA הערה" }], summary: "ZZQA בלי labels" } });
      return r.fulfill({ json: { ops: [{ op: "task.update", id: "t1" }], labels: [{ title: "ZZQA עדכון משימה מהשרת", detail: "ZZQA יעד לחמישי" }], summary: "ZZQA עם labels" } });
    }
    if (q.action === "command_apply") {
      if (q.ops?.[0]?.op === "person.note") return r.fulfill({ json: { ok: false, applied: 0, errors: [{ op: "person.note", error: "ZZQA אין הרשאה לכתוב על אדם" }] } });
      return r.fulfill({ json: { ok: true, applied: 0, errors: [] } });
    }
    return r.fulfill({ json: { ok: true } });
  });
  await p.route("**/functions/v1/nx-dec**", (r) => r.fulfill({ json: DECFIX }));
  await p.route("**/functions/v1/nx-dash**", (r) => r.fulfill({ json: DASHFIX }));
  await goLive(p);
  await p.getByText("אלפא", { exact: true }).last().click();
  const input = p.getByPlaceholder("דבר איתי — שאלה, משימה, בקשה…");
  await input.fill("תעדכן את המשימה"); await p.keyboard.press("Enter");
  await p.getByText("ZZQA עדכון משימה מהשרת").first().waitFor({ timeout: 4000 });
  await p.getByText("ZZQA יעד לחמישי").first().waitFor({ timeout: 2000 });
  await p.getByText("אשר ובצע ✓").first().click();
  await p.getByText("לא בוצע דבר").first().waitFor({ timeout: 4000 });
  let txt = await p.evaluate(() => document.body.innerText);
  if (/בוצעו 0/.test(txt)) throw new Error("'בוצעו 0 ✓' עדיין מוצג");
  if (/task\.update/.test(txt)) throw new Error("שם פעולה גולמי מוצג במקום תווית");
  await input.fill("מפה בלי labels"); await p.keyboard.press("Enter");
  await p.getByText("הערה על אדם").first().waitFor({ timeout: 4000 });
  txt = await p.evaluate(() => document.body.innerText);
  if (/person\.note/.test(txt)) throw new Error("person.note גולמי במקום המפה העברית");
  await p.getByText("אשר ובצע ✓").last().click();
  await p.getByText("ZZQA אין הרשאה לכתוב על אדם").first().waitFor({ timeout: 4000 });
  txt = await p.evaluate(() => document.body.innerText);
  if (/http 200/.test(txt)) throw new Error("כשל הוצג כ-'http 200'");
  await input.fill("תכין טיוטה לשירה"); await p.keyboard.press("Enter");
  await p.getByText("הכנתי טיוטה").first().waitFor({ timeout: 4000 });
  txt = await p.evaluate(() => document.body.innerText);
  if (!/ZZQA היי שירה/.test(txt)) throw new Error("גוף הטיוטה לא מוצג");
  if (/לא זיהיתי פעולה/.test(txt)) throw new Error("טיוטה הוצגה כ'לא זיהיתי פעולה'");
  await p.screenshot({ path: `${OUT}/17-alpha-labels.png` });
  await p.close();
});

/* ── מסך צר 360 — הכותרת לא נשברת ── */
await T("360px: הכותרת נושמת (תת-כותרת מוסתרת)", async () => {
  const p3 = await b.newPage({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p3.goto(URL, { waitUntil: "domcontentloaded" });
  await p3.waitForTimeout(1600);
  const vis = await p3.evaluate(() => { const el = document.querySelector(".hdr-sub"); return el ? getComputedStyle(el).display : "gone"; });
  if (vis !== "none") throw new Error("תת-הכותרת מוצגת ב-360px: " + vis);
  const overflow = await p3.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error("גלילה אופקית: " + overflow + "px");
  await p3.screenshot({ path: `${OUT}/13-360-demo.png` });
  await p3.close();
});

/* ── טאבלט 768 ── */
await T("768px: פריסה מרוכזת, בלי שבירה", async () => {
  const p4 = await b.newPage({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2 });
  await p4.goto(URL, { waitUntil: "domcontentloaded" });
  await p4.waitForTimeout(1600);
  const overflow = await p4.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error("גלילה אופקית: " + overflow + "px");
  await p4.screenshot({ path: `${OUT}/14-tablet.png` });
  await p4.close();
});

await b.close();
console.log(`\nQA: ${pass} עברו · ${fails.length} נכשלו`);
if (fails.length) { fails.forEach((f) => console.log("  ✗ " + f)); process.exit(1); }
