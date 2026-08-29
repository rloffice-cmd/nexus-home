import { motion, AnimatePresence } from "motion/react";
import { Drawer } from "vaul";
import { useEffect, useMemo, useState } from "react";

import Num from "../ui/Num";

/* ‏עמוד המשימות של איתי — לפי מה שהמערכת מדדה עליו:
   ‏משקל לפני דחיפות (מה על הכף) · "שלי" נפרד מ"ממתין לאחרים" · הבטחה חיה
   ‏שקטה, הבטחה שחלפה צועקת · קפואות כבדות למעלה, לא קבורות · פעולות אצבע.
   ‏מ-27.8 (לילה 2) העמוד חי: הנתונים מ-nexus-app v34, הפעולות דרך
   ‏המנועים (task_done · task_waiting). מקור אחד לעמוד הזה ולכיסוי בבית. */
import { type Snapshot, type T } from "../lib/data";
import type { Act } from "../App";

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

export default function Tasks({ D, onAct, focus, onFocused }: { D: Snapshot; onAct: Act; focus?: string | null; onFocused?: () => void }) {
  const [view, setView] = useState<"mine" | "others" | "frozen" | "all">("mine");
  const [arena, setArena] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [open, setOpen] = useState<T | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  /* ‏הגעה מבחוץ: צ'יפ מחזיק בבית ("__mine__" או שם אדם) או תיק זירה ("arena:<שם>") */
  useEffect(() => {
    if (!focus) return;
    if (focus === "__mine__") { setView("mine"); setOwner(null); setArena(null); }
    else if (focus.startsWith("arena:")) { setView("all"); setArena(focus.slice(6)); setOwner(null); }
    else { setView("all"); setOwner(focus); setArena(null); }
    onFocused?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  const all = D.tasks.filter((t) => !done.has(t.id));
  const arenas = [...new Set(all.map((t) => t.arena))];
  const shown = useMemo(() => {
    let l = all;
    if (view === "mine") l = l.filter((t) => t.mine);
    if (view === "others") l = l.filter((t) => !t.mine);
    if (view === "frozen") l = l.filter((t) => (t.frozen ?? 0) >= 10);
    if (arena) l = l.filter((t) => t.arena === arena);
    if (owner) l = owner === "ללא בעלים" ? l.filter((t) => !t.owner) : l.filter((t) => t.owner === owner);
    return [...l].sort((a, b) =>
      (wOrder[a.weight] - wOrder[b.weight]) ||
      ((b.overdue ? 1 : 0) - (a.overdue ? 1 : 0)) ||
      ((b.frozen ?? 0) - (a.frozen ?? 0)));
  }, [view, arena, owner, done, D.tasks]);

  const counts = {
    mine: all.filter((t) => t.mine).length,
    others: all.filter((t) => !t.mine).length,
    frozen: all.filter((t) => (t.frozen ?? 0) >= 10).length,
    all: all.length,
  };
  /* ‏אופטימי: הכרטיס יוצא מיד, המנוע מאשר; כשל ⟶ הכרטיס חוזר */
  const doAct = async (kind: "task_done" | "task_waiting", t: T) => {
    setOpen(null);
    if (kind === "task_done") setDone(new Set([...done, t.id]));
    const ok = await onAct(kind, t.id);
    if (!ok && kind === "task_done") setDone((s) => { const n = new Set(s); n.delete(t.id); return n; });
  };

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

      {owner && (
        <motion.button initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.95 }} onClick={() => setOwner(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 12, padding: "8px 14px", borderRadius: 18, fontSize: 12.5, fontWeight: 800, background: "color-mix(in srgb,var(--acc) 16%,transparent)", border: "1px solid color-mix(in srgb,var(--acc) 42%,transparent)", color: "var(--acc-hi)", WebkitTapHighlightColor: "transparent" }}>
          👤 {owner} <span style={{ opacity: 0.7 }}>✕</span>
        </motion.button>
      )}
      <div className="sec" style={{ marginTop: 14 }}>
        {owner ? `אצל ${owner}` : view === "mine" ? "שלך — לפי מה שעומד על הכף" : view === "others" ? "ממתין לאחרים — הבטחה חיה שקטה" : view === "frozen" ? "קפוא מעל 10 ימים" : "הכול"} · <b className="num"><Num value={shown.length} /></b>
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => doAct("task_done", open)}
                  style={{ borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>בוצע ✓</motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => doAct("task_waiting", open)}
                  style={{ borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>⏳ ממתין ל{open.mine ? "אחרים" : "הם"}</motion.button>
              </div>
              <p style={{ color: "var(--mut)", fontSize: 10.5, margin: "12px 2px 0", textAlign: "center" }}>{open.mine ? "הפעולה נרשמת דרך המנוע" : `אלפא רודפת את ${open.owner} אוטומטית — נדנוד יומי עד הבטחה חיה`}</p>
            </>)}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
