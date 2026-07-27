// בדיקות רגרסיה לאפליקציה. נכתבו כדי לתפוס את התקלות האמיתיות שהתגלו ידנית
// ב-25.7: מטפל שנקרא ולא קיים, פעולה שנשלחת לשרת ואינה מוכרת, וכל תלות חיצונית
// שתשבור את האפליקציה כשאין רשת.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const fails = [];
const ok = [];
const check = (name, cond, detail = "") => (cond ? ok : fails).push(name + (cond ? "" : " — " + detail));

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
check("נמצא סקריפט אחד באפליקציה", scripts.length === 1, `נמצאו ${scripts.length}`);
const js = scripts.join("\n");

// 1. תחביר. שבירה כאן משביתה את כל האפליקציה בלי שום הודעת שגיאה למשתמש.
try { new vm.Script(js); check("תחביר JavaScript תקין", true); }
catch (e) { check("תחביר JavaScript תקין", false, e.message); }

// 2. כל onclick מצביע על פונקציה שקיימת. טעות כתיב כאן = כפתור מת בשקט.
const handlers = [...html.matchAll(/onclick="([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]);
const defined = new Set([...js.matchAll(/function\s+([a-zA-Z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const missing = [...new Set(handlers)].filter(h => !defined.has(h));
check(`כל ${new Set(handlers).size} מטפלי onclick מוגדרים`, missing.length === 0, "חסרים: " + missing.join(", "));

// 3. כל פעולה שנשלחת לשרת מוכרת. הרשימה משקפת את nexus-app, nx-act ו-nx-file בפועל.
const SERVER_ACTIONS = new Set([
  "arena_draft", "capture_add", "commitment_done", "decision_decide", "draft_sent",
  "focus_approve", "focus_done", "focus_set", "idea_add", "task_create", "task_done",
  "task_important", "task_reopen", "task_urgency", "task_waiting",
  // nexus-app v9/v10 — מרכז הפגישות
  "prep_request", "debrief_submit", "meeting_create", "meeting_open_items",
  // nx-file — מסך שיוך המסמכים
  "unfiled_list", "file_folder", "ignore_folder", "undo", "arena_create",
  // nexus-app v11/v12 — תיבת הפקודה (שיחה עם אובייקט)
  "command_preview", "command_apply",
]);
const sent = [...new Set([...js.matchAll(/action:\s*"([a-z_]+)"/g)].map(m => m[1]))];
const unknown = sent.filter(a => !SERVER_ACTIONS.has(a));
check(`כל ${sent.length} הפעולות מוכרות בשרת`, unknown.length === 0, "לא מוכרות: " + unknown.join(", "));

// 4. אין תלות חיצונית. האפליקציה חייבת לעבוד גם בלי רשת ובלי CDN.
// גופני Google מותרים במפורש — עם נפילה-אחורה מלאה ב-CSS ועם מטמון ב-sw.js,
// כך שהאפליקציה עובדת גם בלי רשת. כל מארח חיצוני אחר הוא תקלה.
const ALLOWED_HOSTS = /^https?:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|api\.telegram\.org|[a-z0-9-]+\.supabase\.co)/;
const ext = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map(m => m[1])
  .filter(u => !ALLOWED_HOSTS.test(u));
check("אין משאבים חיצוניים לא מאושרים ב-HTML", ext.length === 0, ext.join(", "));

// אם משתמשים בגופנים חיצוניים, ה-service worker חייב לשמור אותם במטמון,
// אחרת הטיפוגרפיה נעלמת בכל פתיחה בלי רשת.
const sw = readFileSync(join(root, "sw.js"), "utf8");
const usesFonts = /fonts\.googleapis\.com/.test(html);
check("sw.js שומר את הגופנים במטמון", !usesFonts || /fonts\.gstatic\.com/.test(sw),
      "האפליקציה טוענת גופנים חיצוניים אך ה-service worker לא שומר אותם");

// ה-API חייב להישאר תמיד מהרשת. נתונים עסקיים ישנים גרועים מהודעת שגיאה.
check("sw.js לא שומר את ה-API במטמון", /u\.origin !== location\.origin/.test(sw),
      "חסרה ההגנה שמונעת הגשת נתונים ישנים");

// 5. קבצי ה-PWA קיימים ותקינים.
try { JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")); check("manifest.json תקין", true); }
catch (e) { check("manifest.json תקין", false, e.message); }
try { readFileSync(join(root, "sw.js"), "utf8"); check("sw.js קיים", true); }
catch { check("sw.js קיים", false, "חסר"); }
try { readFileSync(join(root, "report.html"), "utf8"); check("report.html קיים (קישורי הצוות)", true); }
catch { check("report.html קיים (קישורי הצוות)", false, "חסר — קישורי הנדנוד לצוות ישברו"); }

// 6. אין סודות בקוד הלקוח. הקוד הזה נשלח לכל מי שפותח את האפליקציה.
const secrets = [/sk-ant-[\w-]{20,}/, /sbp_[0-9a-f]{40}/, /\d{9,10}:AA[\w-]{30,}/, /eyJhbGciOi[\w-]{40,}/];
const leaked = secrets.filter(re => re.test(html));
check("אין סודות בקוד הלקוח", leaked.length === 0, `${leaked.length} תבניות נמצאו`);

console.log(ok.map(s => "  ✓ " + s).join("\n"));
if (fails.length) { console.error("\nנכשל:\n" + fails.map(s => "  ✗ " + s).join("\n")); process.exit(1); }
console.log(`\n${ok.length} בדיקות עברו.`);
