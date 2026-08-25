/* ‏שכבת הנתונים: אותם מנועים, אפס לוגיקה בממשק. מפתח חי נמשך מאותו
   ‏localStorage של האפליקציה הקיימת (אותו origin ב-Pages) — מי שמחובר שם
   ‏מחובר גם כאן. בלי מפתח או בכשל רשת ⟶ הדגמה, בלי לשקר על זה. */
export type Task = { id: string; title: string; arena?: string; urgency?: string; due?: string | null; owner?: string };
export type Decision = { id: string; title: string; arena?: string; needed_by?: string | null; recommendation?: string };
export type Arena = { id: string; name: string; state: "ok" | "warn" | "crit"; note?: string; open: number };
export type Snapshot = {
  live: boolean; now: string;
  focus: { title: string; sub: string; days: number } | null;
  k: { needsYou: number; waitingOthers: number; closedToday: number; openTotal: number };
  needsYou: { id: string; kind: "החלטה" | "קריטי" | "באיחור"; title: string; meta: string; recommendation?: string }[];
  arenas: Arena[];
  decisions: Decision[];
  tasks: Task[];
};

export const DEMO: Snapshot = {
  live: false, now: "",
  focus: { title: "עפולה — לסגור את המחיר המבוקש מול אוהד", sub: "הכי מוזנח שנדחה שוב ושוב — היום סוגרים אותו", days: 39 },
  k: { needsYou: 10, waitingOthers: 44, closedToday: 2, openTotal: 107 },
  needsYou: [
    { id: "d1", kind: "החלטה", title: "לגבות 60% מחשבונות האנרגיה דרך הבוררות?", meta: "השדרה · עד 25.07", recommendation: "כן — לדחוף להחלטה דחופה; זה חמצן תזרימי של מאות אלפי ₪." },
    { id: "t1", kind: "קריטי", title: "להחליף את טוקן הוואטסאפ הקבוע — פג 2.10", meta: "תשתית · יעד 20.09" },
    { id: "t2", kind: "באיחור", title: "התחשבנות מול NBS — הסכם השתתפות ברווחים", meta: "מע\"ר בית שמש · שירה · 39 ימים" },
    { id: "t3", kind: "באיחור", title: "לאתר את הסכם המכר הסופי החתום — אלמליח", meta: "רובין לנדסמן · 39 ימים" },
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
  tasks: [
    { id: "t10", title: "היתר עבודות עפר — להוציא בהקדם", arena: "פסגת שלמה", urgency: "היום", owner: "אילונה" },
    { id: "t11", title: "מכרז קבלן עבודות עפר", arena: "פסגת שלמה", urgency: "השבוע", owner: "אילונה" },
    { id: "t12", title: "נתוני גבייה — חובות עבר להסכם הפשרה", arena: "השדרה", urgency: "היום", owner: "שירה" },
    { id: "t13", title: "טבלת ריכוז הלוואות מכל החברות", arena: "פיננסי", urgency: "השבוע", owner: "שירה" },
  ],
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
    /* ‏מיפוי מינימלי מהצורה החיה של nexus-app — נרחיב בלילה 2 */
    const open = (D.tasks || []).filter((t: any) => t.status === "open" || t.status === "waiting");
    const hb = D.home_brief || {}; const red = hb.red || {};
    const redCount = (red.pending_decisions?.length || 0) + (red.itay_overdue?.length || 0) +
      (red.escalations_48h?.length || 0) + (red.critical_path?.length || 0);
    return {
      live: true, now,
      focus: D.focus ? { title: D.focus.title, sub: "הכי מוזנח שנדחה שוב ושוב", days: 0 } : null,
      k: { needsYou: redCount, waitingOthers: (hb.yellow?.team_open ?? 0) + (hb.yellow?.open_commitments ?? 0), closedToday: hb.green?.closed_since_yesterday ?? 0, openTotal: open.length },
      needsYou: [
        ...(red.pending_decisions || []).map((d: any) => ({ id: d.id, kind: "החלטה" as const, title: d.title, meta: "" })),
        ...(red.itay_overdue || []).map((t: any) => ({ id: t.id, kind: "באיחור" as const, title: t.title, meta: t.due || "" })),
      ],
      arenas: (D.arenas || []).filter((a: any) => a.status === "active").slice(0, 8).map((a: any) => ({
        id: a.id, name: (a.name || "").split(" — ")[0], state: "ok" as const, note: a.summary || "", open: open.filter((t: any) => t.arena_id === a.id).length,
      })),
      decisions: (D.decisions || []).filter((d: any) => d.status === "pending").map((d: any) => ({ id: d.id, title: d.title, recommendation: d.recommendation })),
      tasks: open.slice(0, 30).map((t: any) => ({ id: t.id, title: t.title, urgency: t.urgency })),
    };
  } catch { return { ...DEMO, now }; }
}
