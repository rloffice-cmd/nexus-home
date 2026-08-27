/* ‏שכבת הנתונים: אותם מנועים, אפס לוגיקה בממשק. מפתח חי נמשך מאותו
   ‏localStorage של האפליקציה הקיימת (אותו origin ב-Pages) — מי שמחובר שם
   ‏מחובר גם כאן. בלי מפתח או בכשל רשת ⟶ הדגמה, בלי לשקר על זה.

   ‏העיקרון של הבית (הכרעת איתי 27.8): לא "הדבר האחד" אלא כיסוי מלא —
   ‏כל משימה גלויה, לכל אחת מטפל (איתי · צוות · יניב) ואות-חיים
   ‏(תנועה או הבטחה עתידית). מה שאין לו — הוא החריג, והוא היחיד שאדום. */

export type Decision = { id: string; title: string; arena?: string; needed_by?: string | null; recommendation?: string };
export type Arena = { id: string; name: string; state: "ok" | "warn" | "crit"; note?: string; open: number };

/* ‏מודל המשימה — אחד לעמוד המשימות ולכיסוי בבית */
export type T = {
  id: string; title: string; arena: string; owner: string; mine?: boolean;
  weight: "critical" | "major" | "normal" | "minor";
  due?: string; dueKind?: "אמת" | "פנימי"; overdue?: boolean;
  frozen?: number;                    /* ‏ימים בלי תנועה */
  waiting?: { who: string; promised?: string; broken?: boolean };
};

export const DEMO_TASKS: T[] = [
  { id: "m1", title: "עפולה — לסגור את המחיר המבוקש מול אוהד", arena: "עפולה", owner: "איתי", mine: true, weight: "critical", frozen: 39, overdue: true, due: "17.08", dueKind: "פנימי" },
  { id: "m2", title: "לאתר את הסכם המכר הסופי החתום — אלמליח", arena: "רובין לנדסמן", owner: "איתי", mine: true, weight: "critical", frozen: 39 },
  { id: "m3", title: "להחליף את טוקן הוואטסאפ הקבוע (System User)", arena: "תשתית", owner: "איתי", mine: true, weight: "critical", due: "20.09", dueKind: "אמת" },
  { id: "w1", title: "התחשבנות מול NBS — הסכם השתתפות ברווחים", arena: "מע\"ר בית שמש", owner: "שירה", weight: "critical", frozen: 39, waiting: { who: "שירה", promised: "17.08", broken: true } },
  { id: "w2", title: "נתוני גבייה — חובות עבר להסכם הפשרה", arena: "השדרה", owner: "שירה", weight: "major", overdue: true, due: "17.08", dueKind: "פנימי", waiting: { who: "שירה" } },
  { id: "w3", title: "היתר עבודות עפר — להוציא בהקדם", arena: "פסגת שלמה", owner: "אילונה", weight: "major", overdue: true, due: "19.08", dueKind: "אמת", waiting: { who: "אילונה", promised: "28.08" } },
  { id: "w4", title: "מכרז קבלן עבודות עפר — הריסה ויסודות", arena: "פסגת שלמה", owner: "אילונה", weight: "major", due: "19.08", dueKind: "פנימי", overdue: true, waiting: { who: "אילונה" } },
  { id: "w5", title: "טבלת ריכוז הלוואות מכל החברות", arena: "פיננסי", owner: "שירה", weight: "normal", frozen: 8, waiting: { who: "שירה", promised: "27.08" } },
  { id: "w6", title: "מסירה לוועדה המקומית לפני היציאה", arena: "תב\"ע השדרה", owner: "יניב", weight: "major", waiting: { who: "דובי קרן", promised: "01.09" } },
  { id: "n1", title: "השכרת דוכנים בכניסה לקניון", arena: "השדרה", owner: "אהרון", weight: "normal", frozen: 17, waiting: { who: "אהרון" } },
  { id: "n2", title: "ג2 — השלמת חוזים על יתרת הנכסים", arena: "ג2", owner: "שייקה", weight: "normal", due: "31.08", dueKind: "אמת", waiting: { who: "שייקה", promised: "31.08" } },
];

/* ── כיסוי: מי מחזיק מה, ומה נשאר בלי אות-חיים ── */
export type Handler = { name: string; me?: boolean; open: number; stuck: number };
export type Uncovered = { id: string; title: string; arena: string; owner: string; mine?: boolean; reason: string };
export type Coverage = { total: number; covered: number; handlers: Handler[]; uncovered: Uncovered[] };

/* ‏"בלי טיפול חי" = הבטחה שחלפה · קיפאון ≥10 ימים · איחור בלי הבטחה חדשה.
   ‏הבטחה עתידית משתיקה — אותו כלל בדיוק כמו הנדנוד של אלפא. */
export function stuckReason(t: T): string | null {
  if (t.waiting?.broken) return `הבטחה חלפה (${t.waiting.promised})`;
  if ((t.frozen ?? 0) >= 10) return `${t.frozen} ימים בלי תנועה`;
  if (t.overdue && !t.waiting?.promised) return "באיחור · בלי הבטחה חדשה";
  return null;
}

export function deriveCoverage(ts: T[]): Coverage {
  const uncovered: Uncovered[] = [];
  const by = new Map<string, Handler>();
  for (const t of ts) {
    const name = t.owner || "ללא בעלים";
    const h = by.get(name) || { name, me: !!t.mine, open: 0, stuck: 0 };
    h.open++;
    const r = t.owner ? stuckReason(t) : "אין בעלים — אף אחד לא מחזיק";
    if (r) { h.stuck++; uncovered.push({ id: t.id, title: t.title, arena: t.arena, owner: name, mine: t.mine, reason: r }); }
    by.set(name, h);
  }
  const handlers = [...by.values()].sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0) || b.open - a.open);
  return { total: ts.length, covered: ts.length - uncovered.length, handlers, uncovered };
}

export type Snapshot = {
  live: boolean; now: string;
  k: { openTotal: number; closedToday: number };
  coverage: Coverage;
  needsYou: { id: string; kind: "החלטה" | "קריטי"; title: string; meta: string; recommendation?: string }[];
  arenas: Arena[];
  decisions: Decision[];
  tasks: T[];
};

export const DEMO: Snapshot = {
  live: false, now: "",
  k: { openTotal: DEMO_TASKS.length, closedToday: 2 },
  coverage: deriveCoverage(DEMO_TASKS),
  needsYou: [
    { id: "d1", kind: "החלטה", title: "לגבות 60% מחשבונות האנרגיה דרך הבוררות?", meta: "השדרה · עד 25.07", recommendation: "כן — לדחוף להחלטה דחופה; זה חמצן תזרימי של מאות אלפי ₪." },
    { id: "t1", kind: "קריטי", title: "להחליף את טוקן הוואטסאפ הקבוע — פג 2.10", meta: "תשתית · יעד 20.09" },
  ],
  arenas: [
    { id: "a1", name: "השדרה", state: "crit", note: "בוררות גבייה פתוחה", open: 21 },
    { id: "a2", name: "פסגת שלמה", state: "crit", note: "היתר עבודות עפר", open: 14 },
    { id: "a3", name: "תב\"ע השדרה", state: "warn", note: "ממתין לוועדה", open: 6 },
    { id: "a4", name: "ג2", state: "ok", note: "חוזים בהשלמה", open: 9 },
    { id: "a5", name: "אגרו-אנרגיה", state: "ok", note: "העברת זכויות בסגירה", open: 5 },
  ],
  decisions: [
    { id: "d1", title: "לגבות 60% מחשבונות האנרגיה דרך הבוררות?", arena: "השדרה", needed_by: "25.07", recommendation: "כן — לדחוף להחלטה דחופה." },
    { id: "d2", title: "עתירה מנהלית או המתנה מול העירייה?", arena: "פינוי בינוי", needed_by: "30.07", recommendation: "להכין עתירה כמנוף לחץ." },
  ],
  tasks: DEMO_TASKS,
};

const API = "https://eygeouunxwsrdsijkczh.supabase.co/functions/v1/nexus-app";

export async function loadSnapshot(): Promise<Snapshot> {
  const key = localStorage.getItem("nx_k3") || "";
  const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (!key) return { ...DEMO, now };
  try {
    const r = await fetch(`${API}?k=${encodeURIComponent(key)}`, { headers: { "x-nexus-key": key } });
    if (!r.ok) throw 0;
    const D = await r.json();
    /* ‏מיפוי מינימלי מהצורה החיה של nexus-app. בלייב אין עדיין אותות
       ‏הבטחה/קיפאון בקצה הזה — הכיסוי נגזר מבעלות+איחור בלבד, ובלילה 2
       ‏מתחבר לשדות ההבטחה האמיתיים (waiting_on · expected_by). */
    const open = (D.tasks || []).filter((t: any) => t.status === "open" || t.status === "waiting");
    const hb = D.home_brief || {}; const red = hb.red || {};
    const ts: T[] = open.map((t: any) => ({
      id: t.id, title: t.title, arena: t.arena_name || "", weight: "normal" as const,
      owner: t.owner_name || t.owner || "", mine: (t.owner_name || "") === "איתי רובין" || t.owner === "itay",
      overdue: !!t.overdue,
    }));
    return {
      live: true, now,
      k: { openTotal: ts.length, closedToday: hb.green?.closed_since_yesterday ?? 0 },
      coverage: deriveCoverage(ts),
      needsYou: [
        ...(red.pending_decisions || []).map((d: any) => ({ id: d.id, kind: "החלטה" as const, title: d.title, meta: "" })),
        ...(red.itay_overdue || []).map((t: any) => ({ id: t.id, kind: "קריטי" as const, title: t.title, meta: t.due || "" })),
      ],
      arenas: (D.arenas || []).filter((a: any) => a.status === "active").slice(0, 8).map((a: any) => ({
        id: a.id, name: (a.name || "").split(" — ")[0], state: "ok" as const, note: a.summary || "", open: open.filter((t: any) => t.arena_id === a.id).length,
      })),
      decisions: (D.decisions || []).filter((d: any) => d.status === "pending").map((d: any) => ({ id: d.id, title: d.title, recommendation: d.recommendation })),
      tasks: ts.slice(0, 60),
    };
  } catch { return { ...DEMO, now }; }
}
