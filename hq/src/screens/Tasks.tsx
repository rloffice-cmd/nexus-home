import { motion, AnimatePresence } from "motion/react";
import { Drawer } from "vaul";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Num from "../ui/Num";

/* ‏עמוד המשימות של איתי — לפי מה שהמערכת מדדה עליו:
   ‏משקל לפני דחיפות (מה על הכף) · "שלי" נפרד מ"ממתין לאחרים" · הבטחה חיה
   ‏שקטה, הבטחה שחלפה צועקת · קפואות כבדות למעלה, לא קבורות · פעולות אצבע.
   ‏בהדגמה הפעולות מציגות טוסט; בלילה 2 הן נקשרות ל-nexus_command_apply. */

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

const W: Record<T["weight"], { c: string; t: string }> = {
  critical: { c: "var(--crit)", t: "קריטי" },
  major: { c: "var(--warn)", t: "כבד" },
  normal: { c: "var(--info)", t: "רגיל" },
  minor: { c: "var(--mut)", t: "קל" },
};
const wOrder = { critical: 0, major: 1, normal: 2, minor: 3 };

const spring = { type: "spring" as const, duration: 0.55, bounce: 0.14 };

function Card({ t, onOpen }: { t: T; onOpen: (t: T) => void }) {
  return (
    <motion.button layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={spring}
      whileTap={{ scale: 0.985 }} onClick={() => onOpen(t)} className="glass"
      style={{ position: "relative", display: "block", width: "100%", textAlign: "start", padding: "13px 16px 12px", borderRadius: 17, marginBottom: 9, overflow: "hidden", WebkitTapHighlightColor: "transparent" }}>
      <span aria-hidden style={{ position: "absolute", insetBlock: 0, insetInlineStart: 0, width: 3.5, background: W[t.weight].c, boxShadow: t.weight === "critical" ? `0 0 12px ${W[t.weight].c}` : "none" }} />
      <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, lineHeight: 1.35 }}>{t.title}</span>
      <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 7, fontSize: 11 }}>
        <span className="chip" style={{ background: `color-mix(in srgb,${W[t.weight].c} 13%,transparent)`, color: W[t.weight].c, border: `1px solid color-mix(in srgb,${W[t.weight].c} 32%,transparent)` }}>{W[t.weight].t}</span>
        <span style={{ color: "var(--mut)", fontWeight: 600 }}>{t.arena}</span>
        {!t.mine && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink2)", fontWeight: 700 }}>
          <span style={{ width: 17, height: 17, borderRadius: "50%", background: "var(--surface2)", border: "1px solid var(--hair)", display: "grid", placeItems: "center", fontSize: 9.5 }}>{t.owner[0]}</span>{t.owner}
        </span>}
        {t.due && <span className={"chip " + (t.overdue ? "crit" : "mut")}>{t.overdue ? "באיחור · " : ""}{t.dueKind === "פנימי" ? "יעד פנימי " : "עד "}{t.due}</span>}
        {t.waiting?.promised && !t.waiting.broken && <span className="chip good">🤝 הובטח {t.waiting.promised}</span>}
        {t.waiting?.broken && <span className="chip crit">הבטחה חלפה ({t.waiting.promised})</span>}
        {!!t.frozen && t.frozen >= 10 && <span className="chip warn">🧊 {t.frozen} ימים</span>}
      </span>
    </motion.button>
  );
}

export default function Tasks() {
  const [view, setView] = useState<"mine" | "others" | "frozen" | "all">("mine");
  const [arena, setArena] = useState<string | null>(null);
  const [open, setOpen] = useState<T | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const all = DEMO_TASKS.filter((t) => !done.has(t.id));
  const arenas = [...new Set(all.map((t) => t.arena))];
  const shown = useMemo(() => {
    let l = all;
    if (view === "mine") l = l.filter((t) => t.mine);
    if (view === "others") l = l.filter((t) => !t.mine);
    if (view === "frozen") l = l.filter((t) => (t.frozen ?? 0) >= 10);
    if (arena) l = l.filter((t) => t.arena === arena);
    return [...l].sort((a, b) =>
      (wOrder[a.weight] - wOrder[b.weight]) ||
      ((b.overdue ? 1 : 0) - (a.overdue ? 1 : 0)) ||
      ((b.frozen ?? 0) - (a.frozen ?? 0)));
  }, [view, arena, done]);

  const counts = {
    mine: all.filter((t) => t.mine).length,
    others: all.filter((t) => !t.mine).length,
    frozen: all.filter((t) => (t.frozen ?? 0) >= 10).length,
    all: all.length,
  };
  const act = (msg: string) => { setOpen(null); toast.success(msg); };

  return (
    <div className="page">
      {/* ‏מסננים ראשיים — שלי קודם: העמוד נפתח על מה שדורש אותו */}
      <div style={{ display: "flex", gap: 5, background: "var(--surface2)", border: "1px solid var(--hair)", borderRadius: 15, padding: 4, marginTop: 10 }}>
        {([["mine", "שלי"], ["others", "אצל אחרים"], ["frozen", "קפואות"], ["all", "הכל"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setView(id)}
            style={{ flex: 1, position: "relative", padding: "9px 0", borderRadius: 11, fontSize: 12.5, fontWeight: 800, color: view === id ? "var(--acc-ink)" : "var(--mut)", WebkitTapHighlightColor: "transparent" }}>
            {view === id && <motion.span layoutId="taskseg" transition={spring}
              style={{ position: "absolute", inset: 0, borderRadius: 11, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 58%,var(--acc-lo))" }} />}
            <span style={{ position: "relative" }}>{label} <b className="num">{counts[id]}</b></span>
          </button>
        ))}
      </div>

      {/* ‏זירות — שורת סינון משנית */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 2px 2px", margin: "0 -2px" }}>
        {arenas.map((a) => (
          <button key={a} onClick={() => setArena(arena === a ? null : a)}
            className="chip" style={{ flex: "none", padding: "7px 13px", borderRadius: 18, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              background: arena === a ? "color-mix(in srgb,var(--acc) 18%,transparent)" : "var(--surface2)",
              color: arena === a ? "var(--acc-hi)" : "var(--ink2)",
              border: `1px solid ${arena === a ? "color-mix(in srgb,var(--acc) 45%,transparent)" : "var(--hair)"}` }}>
            {a}
          </button>
        ))}
      </div>

      <div className="sec" style={{ marginTop: 14 }}>
        {view === "mine" ? "שלך — לפי מה שעומד על הכף" : view === "others" ? "ממתין לאחרים — הבטחה חיה שקטה" : view === "frozen" ? "קפוא מעל 10 ימים" : "הכול"} · <b className="num"><Num value={shown.length} /></b>
      </div>
      <AnimatePresence mode="popLayout">
        {shown.map((t) => <Card key={t.id} t={t} onOpen={setOpen} />)}
        {!shown.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: "var(--mut)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>
            נקי ✨ — אין כאן כלום בסינון הזה
          </motion.div>
        )}
      </AnimatePresence>

      {/* ‏מגירת פעולות — האצבע עושה, המנוע מבצע */}
      <Drawer.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(5,4,2,.6)", zIndex: 50 }} />
          <Drawer.Content style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 51, borderRadius: "26px 26px 0 0", background: "color-mix(in srgb,var(--acc) 7%,var(--bg))", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderBottom: 0, padding: "0 20px calc(24px + env(safe-area-inset-bottom))", maxWidth: 660, margin: "0 auto", color: "var(--ink)" }}>
            <div aria-hidden style={{ width: 44, height: 5, borderRadius: 5, background: "color-mix(in srgb,var(--acc) 35%,transparent)", margin: "12px auto 14px" }} />
            {open && (<>
              <span className="chip" style={{ background: `color-mix(in srgb,${W[open.weight].c} 13%,transparent)`, color: W[open.weight].c, border: `1px solid color-mix(in srgb,${W[open.weight].c} 32%,transparent)` }}>{W[open.weight].t}</span>
              <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 900, lineHeight: 1.28, margin: "10px 0 4px" }}>{open.title}</Drawer.Title>
              <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 16px" }}>
                {open.arena} · {open.owner}{open.frozen ? ` · ${open.frozen} ימים בלי תנועה` : ""}{open.waiting?.promised ? ` · הובטח ${open.waiting.promised}` : ""}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: open.mine ? "1fr 1fr" : "1fr 1fr 1fr", gap: 8 }}>
                {open.mine ? (<>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setDone(new Set([...done, open.id])); act("בוצע — נרשם דרך המנוע"); }}
                    style={{ borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>בוצע ✓</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => act("נדחה בשבוע — המועד עודכן")}
                    style={{ borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>דחה שבוע</motion.button>
                </>) : (<>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => act(`אלפא תנדנד את ${open.owner} עכשיו`)}
                    style={{ borderRadius: 13, padding: "13px 0", fontSize: 13, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>🔔 נדנד</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setDone(new Set([...done, open.id])); act("סומן כבוצע"); }}
                    style={{ borderRadius: 13, padding: "13px 0", fontSize: 13, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>בוצע ✓</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => act("עבר אליך — נוסף ל'דורש אותך'")}
                    style={{ borderRadius: 13, padding: "13px 0", fontSize: 13, fontWeight: 700, color: "var(--ink2)", border: "1px solid var(--hair)" }}>קח אליי</motion.button>
                </>)}
              </div>
              <p style={{ color: "var(--mut)", fontSize: 10.5, margin: "12px 2px 0", textAlign: "center" }}>בהדגמה הפעולות מדומות · במצב חי הכול עובר דרך nexus_command_apply</p>
            </>)}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
