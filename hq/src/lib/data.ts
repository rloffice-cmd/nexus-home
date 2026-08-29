/* ‏שכבת הנתונים: אותם מנועים, אפס לוגיקה בממשק. מפתח חי נמשך מאותו
   ‏localStorage של האפליקציה הקיימת — מי שמחובר שם מחובר גם כאן.
   ‏בלי מפתח או בכשל רשת ⟶ הדגמה, בלי לשקר על זה.

   ‏העיקרון של הבית (הכרעת איתי 27.8): לא "הדבר האחד" אלא כיסוי מלא —
   ‏כל משימה גלויה, לכל אחת מטפל (איתי · צוות · יניב) ואות-חיים
   ‏(תנועה או הבטחה עתידית). מה שאין לו — הוא החריג, והוא היחיד שאדום.

   ‏החיווט החי (27.8, לילה 2): nexus-app v34 מגיש weight · waiting_on ·
   ‏expected_by · last_activity_at · date_source, והכיסוי נגזר מהם כאן —
   ‏אותו כלל השתקה כמו הנדנוד של אלפא: הבטחה עתידית משתיקה. */
import { API, DEC, DASH, apiGet, getKey } from "./api";

export type Decision = { id: string; title: string; arena?: string; needed_by?: string | null; recommendation?: string };
export type Arena = { id: string; name: string; state: "ok" | "warn" | "crit"; note?: string; open: number };
export type Meeting = { id: string; title: string; when: string; dayLabel: string; dayOffset: number; location?: string; arena?: string; prepBody?: string; prepDepth?: string; debrief?: string };
export type Asset = { id: string; code?: string; name: string; arena?: string; type?: string; rented: boolean; rent?: number | null; forSale: boolean; price?: number | null; valuation?: number | null; area?: number | null };
export type ArenaEvent = { arena: string; text: string; when: string };
export type Person = { id: string; name: string; role?: string; organization?: string; phone?: string; rel?: "crit" | "good"; reliabilityNotes?: string; workNotes?: string };
export type Loan = { id: string; lender: string; principal?: number | null; interest?: string; collateral?: string };
export type Mandate = { id: string; title: string; goal?: string; status: string; expires?: string };
export type AlphaAction = { id: string; body: string; outcome?: string; when?: string };
export type AlphaState = { mandates: Mandate[]; shiftsToday: number; actions: AlphaAction[] };
export type Lesson = { text: string; when?: string };
export type Verification = { id: string; kind?: string; subject?: string; question: string };

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
export type Bucket = "ownerless" | "broken" | "overdue" | "frozen";
export type Uncovered = { id: string; title: string; arena: string; owner: string; mine?: boolean; reason: string; bucket: Bucket };
export type Coverage = { total: number; covered: number; handlers: Handler[]; uncovered: Uncovered[] };

/* ‏ארבעת הדליים, בסדר הפעולה: שיוך ⟶ רדיפת הבטחה ⟶ תאריך חדש ⟶ הנעה.
   ‏עם ~85 קפואות חיות רשימה שטוחה היא קיר — הדלי אומר מה הצעד, לא רק שיש בעיה. */
export const BUCKETS: { key: Bucket; label: string; hint: string }[] = [
  { key: "ownerless", label: "אין בעלים", hint: "אף אחד לא מחזיק — שיוך הוא הצעד" },
  { key: "broken", label: "הבטחה חלפה", hint: "הבטיחו ולא קרה — אלפא רודפת יומית" },
  { key: "overdue", label: "באיחור בלי הבטחה", hint: "המועד עבר ואין תאריך חדש" },
  { key: "frozen", label: "קיפאון", hint: "10+ ימים בלי תנועה" },
];

/* ‏"בלי טיפול חי" = הבטחה שחלפה · קיפאון ≥10 ימים · איחור בלי הבטחה חדשה.
   ‏הבטחה עתידית משתיקה — אותו כלל בדיוק כמו הנדנוד של אלפא. */
export function stuckReason(t: T): { bucket: Bucket; reason: string } | null {
  if (t.waiting?.broken) return { bucket: "broken", reason: `הבטחה חלפה (${t.waiting.promised})` };
  if ((t.frozen ?? 0) >= 10) return { bucket: "frozen", reason: `${t.frozen} ימים בלי תנועה` };
  if (t.overdue && !t.waiting?.promised) return { bucket: "overdue", reason: "באיחור · בלי הבטחה חדשה" };
  return null;
}

export function deriveCoverage(ts: T[]): Coverage {
  const uncovered: Uncovered[] = [];
  const by = new Map<string, Handler>();
  for (const t of ts) {
    const name = t.owner || "ללא בעלים";
    const h = by.get(name) || { name, me: !!t.mine, open: 0, stuck: 0 };
    h.open++;
    const r = t.owner ? stuckReason(t) : { bucket: "ownerless" as Bucket, reason: "אין בעלים — אף אחד לא מחזיק" };
    if (r) { h.stuck++; uncovered.push({ id: t.id, title: t.title, arena: t.arena, owner: name, mine: t.mine, ...r }); }
    by.set(name, h);
  }
  const handlers = [...by.values()].sort((a, b) => (b.me ? 1 : 0) - (a.me ? 1 : 0) || b.open - a.open);
  return { total: ts.length, covered: ts.length - uncovered.length, handlers, uncovered };
}

export type Snapshot = {
  live: boolean; now: string;
  /* ‏כנות בכשל: "net" = יש מפתח אבל הרשת נפלה · "key" = המפתח נדחה.
     ‏נתוני הדגמה לעולם לא מוצגים בשקט כשהחיבור בעצם נכשל. */
  err?: "net" | "key";
  k: { openTotal: number; closedToday: number };
  coverage: Coverage;
  needsYou: { id: string; kind: "החלטה" | "קריטי"; title: string; meta: string; recommendation?: string }[];
  arenas: Arena[];
  decisions: Decision[];
  tasks: T[];
  meetings: Meeting[];
  assets: Asset[];
  events: ArenaEvent[];
  people: Person[];
  lessons: Lesson[];
  verifications: Verification[];
  loans: Loan[];
  alpha: AlphaState;
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
  meetings: [
    { id: "mt1", title: "ועדת היתרים — פסגת שלמה", when: "09:30", dayLabel: "היום", dayOffset: 0, location: "מודיעין עילית", arena: "פסגת שלמה", prepBody: "· ההיתר בבדיקה אצל הוועדה\n· קבלן ההריסות ממתין להצעת מחיר\n· נקודת המפתח: לוח הזמנים לעבודות העפר", prepDepth: "מלא" },
    { id: "mt2", title: "שיחת התחשבנות עם NBS", when: "14:00", dayLabel: "מחר", dayOffset: 1, arena: "מע\"ר בית שמש" },
  ],
  assets: [
    { id: "as1", code: "60", name: "משרדי הנהלה — קומה 2-", arena: "השדרה", rented: true, rent: 12000, forSale: false, valuation: 2400000, area: 114 },
    { id: "as2", code: "500", name: "חנות הסופר — קומה 0", arena: "מע\"ר בית שמש", rented: true, rent: 41000, forSale: true, price: 9000000, area: 480 },
    { id: "as3", name: "מגרש 227 — אודם", arena: "אודם", rented: false, forSale: false, valuation: 1800000 },
  ],
  events: [
    { arena: "השדרה", text: "דיון בוררות נקבע", when: "אתמול" },
    { arena: "פסגת שלמה", text: "הצעת מחיר לקבלן הריסות התקבלה", when: "לפני יומיים" },
  ],
  people: [
    { id: "p1", name: "שירה אבן צור", role: "כספים", organization: "רם ישראל", rel: "good", reliabilityNotes: "אמינה ויסודית — עומדת בהבטחות" },
    { id: "p2", name: "אילונה קפטש", role: "פרויקטים" },
    { id: "p3", name: "יניב מידן", role: "שותף" },
  ],
  lessons: [
    { text: "ג זה ג2 זה דזירוב", when: "29.07" },
    { text: "איכות קודמת לעלות — מוכן לשלם כשזה מוצדק", when: "01.08" },
  ],
  verifications: [
    { id: "v1", kind: "contradiction", subject: "ODEM-227", question: "אי-התאמה בת.ז — שומת קושניר משייכת 034543678 לאיתי, הפוך מהסכם השכירות" },
  ],
  loans: [
    { id: "l1", lender: "בנק לאומי", principal: 4200000, interest: "P+1.2%", collateral: "השדרה — קומה 2-" },
    { id: "l2", lender: "מלווה פרטי", principal: 950000, interest: "7%", collateral: "מגרש 227" },
  ],
  alpha: {
    shiftsToday: 1,
    mandates: [
      { id: "am1", title: "רדיפת משימות באיחור", status: "active", expires: "12.10" },
      { id: "am2", title: "הסלמה לאחראי — פריט תקוע מגיע למטפל בזירה", status: "active", expires: "01.10" },
    ],
    actions: [
      { id: "aa1", body: "• יניב — \"התחשבנות שכ\"ט אלי מור\" · באיחור 7 ימים · 2 תזכורות, אפס תשובות", outcome: "delivered", when: "אתמול" },
    ],
  },
};

/* ── עזרי תאריך: ISO ⟷ תצוגה, בשעון ישראל ── */
const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
const fmtDay = (iso?: string | null) => {
  if (!iso) return undefined;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}` : String(iso);
};
const daysSince = (ts?: string | null) => {
  if (!ts) return undefined;
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  return d >= 0 ? d : 0;
};

export async function loadSnapshot(): Promise<Snapshot> {
  const now = new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  if (!getKey()) return { ...DEMO, now };
  try {
    /* ‏שני קצוות כמו האפליקציה הקיימת: nexus-app (הגוף) + nx-dec (החלטות
       ‏עם status/needed_by/recommendation — הגוף שולח אותן בלי status). */
    const [D, dec, dash] = await Promise.all([apiGet(API), apiGet(DEC).catch(() => null), apiGet(DASH).catch(() => null)]);
    const today = todayISO();
    const people = new Map<string, string>((D.people || []).map((p: any) => [p.id, p.name]));
    const itayId = (D.people || []).find((p: any) => p.name === "איתי רובין")?.id || null;
    const arenaName = new Map<string, string>((D.arenas || []).map((a: any) => [a.id, String(a.name || "").split(" — ")[0]]));

    const ts: T[] = (D.tasks || []).map((t: any) => {
      const ownerName = people.get(t.owner_id) || "";
      const mine = !!itayId && t.owner_id === itayId;
      const promisedISO = t.expected_by ? String(t.expected_by).slice(0, 10) : null;
      const overdue = !!t.due_date && String(t.due_date).slice(0, 10) < today;
      /* ‏29.8 (ביקורת): waiting_on הוא UUID של אדם — התצוגה הציגה אותו גולמי.
         ‏המיפוי דרך רשימת האנשים; מזהה שאינו מוכר לא מוצג כג'יבריש. */
      const waitingWho = (t.waiting_on ? people.get(String(t.waiting_on)) || "" : "") || (t.status === "waiting" ? ownerName : "");
      const w = String(t.weight || "");
      return {
        id: t.id, title: t.title,
        arena: arenaName.get(t.arena_id) || "",
        owner: mine ? "איתי" : ownerName,
        mine,
        weight: (w === "critical" || w === "major" || w === "minor" ? w : "normal") as T["weight"],
        due: fmtDay(t.due_date),
        dueKind: t.due_date ? (["anchor", "itay", "report"].includes(t.date_source) ? "אמת" : "פנימי") : undefined,
        overdue,
        frozen: daysSince(t.last_activity_at),
        waiting: (waitingWho || promisedISO) ? {
          who: waitingWho || ownerName,
          promised: fmtDay(promisedISO),
          broken: !!promisedISO && promisedISO < today,
        } : undefined,
      };
    });

    const cov = deriveCoverage(ts);
    const stuckArena = new Set(cov.uncovered.map(u => u.arena));
    const overdueArena = new Set(ts.filter(t => t.overdue).map(t => t.arena));

    const pend: Decision[] = ((dec?.decisions || []) as any[])
      .filter(d => d.status === "pending")
      .map(d => ({ id: d.id, title: d.title, arena: arenaName.get(d.arena_id) || "", needed_by: fmtDay(d.needed_by), recommendation: d.recommendation || undefined }));

    return {
      live: true, now,
      k: { openTotal: ts.length, closedToday: (D.closed_today || []).length },
      coverage: cov,
      needsYou: [
        ...pend.slice(0, 4).map(d => ({ id: d.id, kind: "החלטה" as const, title: d.title, meta: [d.arena, d.needed_by ? `עד ${d.needed_by}` : ""].filter(Boolean).join(" · "), recommendation: d.recommendation })),
        ...ts.filter(t => t.mine && t.weight === "critical").slice(0, 4)
          .map(t => ({ id: t.id, kind: "קריטי" as const, title: t.title, meta: [t.arena, t.due ? `יעד ${t.due}` : ""].filter(Boolean).join(" · ") })),
      ],
      arenas: (D.arenas || []).filter((a: any) => a.status === "active").map((a: any) => {
        const nm = arenaName.get(a.id) || a.name;
        const open = ts.filter(t => t.arena === nm).length;
        return { id: a.id, name: nm, note: a.goal || "", open,
          state: (stuckArena.has(nm) ? "crit" : overdueArena.has(nm) ? "warn" : "ok") as Arena["state"] };
      }).filter((a: Arena) => a.open > 0).sort((a: Arena, b: Arena) => b.open - a.open).slice(0, 10),
      decisions: pend,
      tasks: ts,
      meetings: ((D.meetings || []) as any[])
        .filter(m => (m.day_offset ?? 0) >= 0)
        .sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""))
        .slice(0, 20)
        .map(m => {
          const prep = (D.preps || []).find((p: any) => p.event_id === m.id);
          const t = m.starts_at ? new Date(m.starts_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jerusalem" }) : "";
          const off = m.day_offset ?? 0;
          return {
            id: m.id, title: m.title || "", when: m.all_day ? "כל היום" : t,
            dayLabel: off === 0 ? "היום" : off === 1 ? "מחר" : fmtDay(m.on_date) || "",
            dayOffset: off, location: m.location || undefined,
            arena: m.arena ? String(m.arena).split(" — ")[0] : undefined,
            prepBody: prep?.body || undefined, prepDepth: prep?.depth || undefined,
            debrief: m.debrief_status || undefined,
          };
        }),
      assets: ((dash?.assets || []) as any[]).map(a => ({
        id: a.id, code: a.code || undefined, name: a.name || a.property || "",
        arena: arenaName.get(a.arena_id) || undefined, type: a.asset_type || undefined,
        rented: !!a.is_rented, rent: a.asking_rent ?? null,
        forSale: !!a.for_sale, price: a.asking_price ?? null,
        valuation: a.valuation ?? null, area: a.area_gross ?? a.area_sold ?? null,
      })),
      events: ((D.events || []) as any[]).slice(0, 40).map(e => ({
        arena: arenaName.get(e.arena_id) || "",
        text: e.description || "",
        when: fmtDay(String(e.happened_at || "").slice(0, 10)) || "",
      })),
      people: ((D.people || []) as any[]).map(p => {
        /* ‏כיול פולו-אפ כמו באפליקציה הקודמת: "מורח" ⟶ נדנוד יזום · "אמין" ⟶ מרחב */
        const notes = String(p.reliability_notes || "") + String(p.work_notes || "");
        const rel = /מורח|לא אמין|מתמהמה/.test(notes) ? "crit" as const : /אמין|מהיר|יסודי/.test(String(p.reliability_notes || "")) ? "good" as const : undefined;
        return { id: p.id, name: p.name, role: p.role || undefined, organization: p.organization || undefined, phone: p.phone || undefined, rel,
          reliabilityNotes: p.reliability_notes || undefined, workNotes: p.work_notes || undefined };
      }),
      lessons: ((D.lessons || []) as any[]).map(l => ({ text: l.lesson || "", when: fmtDay(String(l.created_at || "").slice(0, 10)) })).filter(l => l.text),
      verifications: ((D.verifications || []) as any[]).map(v => ({ id: v.id, kind: v.kind || undefined, subject: v.subject || undefined, question: v.question || "" })),
      loans: ((dash?.loans || []) as any[]).map((l, i) => ({ id: l.id || String(i), lender: l.lender || "", principal: l.principal ?? null, interest: l.interest || undefined, collateral: l.collateral || undefined })),
      alpha: {
        shiftsToday: D.alpha?.shifts_today ?? 0,
        mandates: ((D.alpha?.mandates || []) as any[]).map(m => ({ id: m.id, title: m.title || "", goal: m.goal || undefined, status: m.status || "", expires: fmtDay(String(m.expires_at || "").slice(0, 10)) })),
        actions: ((D.alpha?.recent_actions || []) as any[]).slice(0, 8).map(a => ({ id: a.id, body: a.body || "", outcome: a.outcome || undefined, when: fmtDay(String(a.sent_at || "").slice(0, 10)) })),
      },
    };
  } catch (e: any) {
    /* ‏יש מפתח והטעינה נפלה — לא מציגים הדגמה בשקט: הדגל מגיע לבאנר. */
    const err: "net" | "key" = String(e?.message || "") === "forbidden" ? "key" : "net";
    return { ...DEMO, now, err };
  }
}
