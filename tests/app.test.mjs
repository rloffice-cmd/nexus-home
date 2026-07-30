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
  // nexus-app v13 — מסלול הניסוח בתיבת הפקודה. draft_sent כבר היה ברשימה
  // (עדכון הזירה השתמש בו), ונשאר אותו שם בדיוק: הטיוטה היא אותה טבלה.
  "draft_refine", "draft_discard",
  // nexus-app v14 — "זו לא פגישה" (ניטרול דרישת הסיכום). שתי השורות האחרונות
  // נבנו בשני סשנים במקביל, שניהם קראו לגרסה שלהם v13, ופריסה אחת מחקה את
  // השנייה מהייצור. v14 מחזיק את שתיהן.
  "meeting_waive_debrief", "meeting_unwaive_debrief",
  // nexus-app v19 — מסך "מה לא ברור". הכתיבה כולה ב-nexus_verify_commit,
  // שמזהה kind='gap' ומאציל ל-nexus_spine_commit: נקודת כניסה אחת בשרת,
  // ולכן גם פעולה אחת כאן. verify_refresh מריץ nexus_verify_queue.
  "verify_commit", "verify_refresh",
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

// 6. שכבת הדסקטופ והגרפים.
// נקודת השבירה יושבת מעל 768 בכוונה — זה הרוחב שבדיקת הפריסה בודקת כטאבלט,
// והפריסה שם חייבת להישאר זהה לנייד.
const bp = [...html.matchAll(/@media\s*\(min-width:\s*(\d+)px\)/g)].map(m => +m[1]);
check("קיימת נקודת שבירה לדסקטופ", bp.length > 0, "אין @media min-width — האפליקציה נעולה לרוחב נייד");
check("נקודת השבירה מעל רוחב הטאבלט הנבדק (768)", bp.every(w => w > 768),
      "נקודת שבירה ב-" + bp.filter(w => w <= 768).join(",") + " תשנה גם את הנייד");

// הפלטה של הגרפים אינה עניין של טעם: הערכים האלה עברו validate_palette
// (--ordinal) מול המשטח האמיתי בשני המצבים. שינוי בעין מחזיר את הבדיקה.
const VALIDATED = ["#dca363", "#c18a4a", "#a77231", "#8e5a14", "#8a560c", "#a36d2c", "#e2ab6c"];
const missingHue = VALIDATED.filter(h => !html.includes(h));
check("סולם הגרפים הוא הסולם שאומת", missingHue.length === 0,
      "גוונים שאינם בקובץ: " + missingHue.join(", ") + " — להריץ מחדש את הוולידטור לפני שינוי");

// כל מסלול שמצייר מחדש את הבית חייב לחווט את שכבת הריחוף. setHomeView לא
// עובר דרך render(), ובלעדי הקריאה המפורשת הגרפים בעדשת הניתוח מתו בשקט.
// נחתך עד ההגדרה הבאה ולא לפי סוגר-סוגר: גוף הפונקציה נגמר ב-`} }` באותה
// שורה, וחיפוש `\n}` פשוט לא מצא אותו והבדיקה נכשלה על קוד תקין.
const setHV = js.match(/function setHomeView\([\s\S]*?(?=\nfunction )/);
check("setHomeView מחווט את הגרפים", !!setHV && /vzWire\(\)/.test(setHV[0]),
      "החלפת עדשה מציירת גרפים בלי שכבת ריחוף");
check("render מחווט את הגרפים", /badges\(\);\s*vzWire\(\)/.test(js), "render לא קורא ל-vzWire");

// יעד מגע: מקטע מוערם הוא 16px גובה. הלחיצה שייכת למקרא שמתחתיו.
check("מקטע מוערם אינו יעד לחיצה", !/vzstack[\s\S]{0,400}?<i[^`]*onclick/.test(js),
      "מקטע דק הוא יעד לחיצה — הכפתור הצף מכסה אותו בנייד");

// 7. אין סודות בקוד הלקוח. הקוד הזה נשלח לכל מי שפותח את האפליקציה.
const secrets = [/sk-ant-[\w-]{20,}/, /sbp_[0-9a-f]{40}/, /\d{9,10}:AA[\w-]{30,}/, /eyJhbGciOi[\w-]{40,}/];
const leaked = secrets.filter(re => re.test(html));
check("אין סודות בקוד הלקוח", leaked.length === 0, `${leaked.length} תבניות נמצאו`);

console.log(ok.map(s => "  ✓ " + s).join("\n"));
if (fails.length) { console.error("\nנכשל:\n" + fails.map(s => "  ✗ " + s).join("\n")); process.exit(1); }
console.log(`\n${ok.length} בדיקות עברו.`);
