import { motion } from "motion/react";
import { Drawer } from "vaul";
import { useState } from "react";
import { toast } from "sonner";
import type { Snapshot, Uncovered } from "../lib/data";
import type { Act } from "../App";
import Orb from "../ui/Orb";
import Num from "../ui/Num";
import CmdBox from "../ui/CmdBox";
import { useBackLayer } from "../lib/nav";

/* ‏הבית של איתי — התמונה המלאה, לא "הדבר האחד" (הכרעתו 27.8):
   ‏"אני תמיד חייב לראות את כל התמונה… הרעיון הוא שהכל!!! יטופל —
   ‏על ידי, על ידי הצוות או יניב." ולכן הבית עונה על שאלה אחת:
   ‏האם כל משימה מוחזקת בידי מישהו עם אות-חיים? מה שלא — אדום, למעלה. */

const spring = { type: "spring" as const, duration: 0.7, bounce: 0.18 };
const rise = (i: number) => ({
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { ...spring, delay: 0.05 * i },
});

/* ‏טבעת הכיסוי — נמלאת פעם אחת בכניסה, בלי לולאה אין-סופית */
function Ring({ pct }: { pct: number }) {
  const R = 31, C = 2 * Math.PI * R;
  return (
    <div style={{ position: "relative", width: 88, height: 88, flex: "none" }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx="44" cy="44" r={R} fill="none" stroke="var(--surface2)" strokeWidth="7.5" />
        <defs>
          <linearGradient id="covg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--acc-hi)" /><stop offset="1" stopColor="var(--acc-lo)" />
          </linearGradient>
        </defs>
        <motion.circle cx="44" cy="44" r={R} fill="none" stroke="url(#covg)" strokeWidth="7.5" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1], delay: 0.25 }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 800 }}><Num value={Math.round(pct * 100)} />%</div>
          <div style={{ fontSize: 8.5, color: "var(--mut)", fontWeight: 700, letterSpacing: ".08em", marginTop: 3 }}>בטיפול</div>
        </div>
      </div>
    </div>
  );
}

export default function Home({ D, onAsk, think, onAct, onArena, onOwner, onChanged }: { D: Snapshot; onAsk: () => void; think: boolean; onAct: Act; onArena: (name: string) => void; onOwner: (name: string) => void; onChanged: () => void }) {
  const [open, setOpen] = useState<null | (typeof D.needsYou)[number]>(null);
  const [openU, setOpenU] = useState<Uncovered | null>(null);
  useBackLayer(!!open, () => setOpen(null));
  useBackLayer(!!openU, () => setOpenU(null));
  const cov = D.coverage;
  const allGood = cov.uncovered.length === 0;
  const pct = cov.total ? cov.covered / cov.total : 1;
  const doU = async (kind: "task_done" | "task_waiting", id: string) => { setOpenU(null); await onAct(kind, id); };

  return (
    <div className="page">
      {/* ── רצועת המוח ── */}
      <motion.button {...rise(0)} onClick={onAsk}
        style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "start", padding: "6px 2px 2px", WebkitTapHighlightColor: "transparent" }}>
        <Orb size={50} think={think} />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.35, minWidth: 0 }}>
          <b style={{ fontSize: 14.5 }}>נקסוס · המוח פעיל</b>
          <span style={{ fontSize: 11.5, color: "var(--mut)" }}>
            {D.live ? "מחובר חי" : "הדגמה"} · <Num value={D.k.openTotal} /> משימות · <Num value={D.decisions.length} /> להכרעה
          </span>
        </span>
        <span style={{ marginInlineStart: "auto", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", background: "var(--surface2)", border: "1px solid var(--hair)", borderRadius: 20, padding: "9px 15px", whiteSpace: "nowrap" }}>
          שאל אותי <i style={{ fontStyle: "normal", color: "var(--gold)" }}>↖</i>
        </span>
      </motion.button>

      {/* ── התמונה המלאה: הכל גלוי, הכל מוחזק ── */}
      <motion.section {...rise(1)} style={{ position: "relative", marginTop: 16, borderRadius: 24, padding: "20px 20px 16px", overflow: "hidden", background: "linear-gradient(160deg,color-mix(in srgb,var(--acc) 11%,var(--bg)),color-mix(in srgb,var(--bg) 96%,#000) 70%)", boxShadow: "inset 0 0 0 1px color-mix(in srgb,var(--acc) 32%,transparent), inset 0 0 46px color-mix(in srgb,var(--acc) 6%,transparent), 0 22px 48px rgba(0,0,0,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Ring pct={pct} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".2em", marginBottom: 7, background: "linear-gradient(90deg,var(--acc-hi),var(--acc) 60%,var(--acc-lo))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              התמונה המלאה
            </div>
            <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 23, fontWeight: 900, lineHeight: 1.18, letterSpacing: "-.015em", textWrap: "balance" }}>
              {allGood ? "הכל בטיפול ✓" : <>‏<span style={{ color: "var(--crit)", textShadow: "0 0 18px color-mix(in srgb,var(--crit) 45%,transparent)" }}><Num value={cov.uncovered.length} /></span> בלי טיפול חי</>}
            </h1>
            <p style={{ margin: "7px 0 0", fontSize: 11.5, color: "var(--ink2)", lineHeight: 1.5 }}>
              <b className="num">{cov.covered}</b> מתוך <b className="num">{cov.total}</b> מוחזקות — בעלים + תנועה או הבטחה עתידית
            </p>
          </div>
        </div>

        {/* ‏מי מחזיק מה — כל הידיים על השולחן. לחיצה ⟶ המשימות שלו
            ‏(פידבק איתי 29.8: "לדוגמה כאן שום דבר לא נלחץ") */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 15 }}>
          {cov.handlers.map((h) => (
            <motion.button key={h.name} whileTap={{ scale: 0.94 }} onClick={() => onOwner(h.me ? "__mine__" : h.name)}
              aria-label={`המשימות של ${h.me ? "איתי" : h.name}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 18, fontSize: 11.5, fontWeight: 700,
                background: h.me ? "color-mix(in srgb,var(--acc) 14%,transparent)" : "var(--surface2)",
                border: `1px solid ${h.me ? "color-mix(in srgb,var(--acc) 40%,transparent)" : "var(--hair)"}`,
                color: h.me ? "var(--acc-hi)" : "var(--ink2)", WebkitTapHighlightColor: "transparent",
              }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: "50%", background: h.stuck ? "var(--crit)" : "var(--good)", boxShadow: h.stuck ? "0 0 8px var(--crit)" : "none" }} />
              {h.me ? "אצלי" : h.name}
              <b className="num" style={{ fontWeight: 600, opacity: 0.75 }}>{h.open}</b>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── החריגים: מה שאין לו אות-חיים ── */}
      <motion.div {...rise(2)}>
        {allGood ? (
          <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 17, marginTop: 12, color: "var(--good)", fontSize: 13, fontWeight: 700 }}>
            ✓ כל משימה פתוחה מוחזקת — אין חריגים כרגע
          </div>
        ) : (<>
          <div className="sec">בלי טיפול חי — כאן נכנסים · <b className="num">{cov.uncovered.length}</b></div>
          {cov.uncovered.map((u, i) => (
            <motion.button key={u.id} {...rise(2 + i * 0.5)} whileTap={{ scale: 0.985 }} onClick={() => setOpenU(u)}
              className="glass"
              style={{ display: "block", width: "100%", textAlign: "start", padding: "13px 16px 11px", borderRadius: 17, marginBottom: 9, WebkitTapHighlightColor: "transparent", borderColor: "color-mix(in srgb,var(--crit) 26%,transparent)" }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{u.title}</span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 7, fontSize: 11 }}>
                <span className="chip crit">{u.reason}</span>
                <span style={{ color: "var(--mut)", fontWeight: 600 }}>{u.arena}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink2)", fontWeight: 700 }}>
                  <span style={{ width: 17, height: 17, borderRadius: "50%", background: "var(--surface2)", border: "1px solid var(--hair)", display: "grid", placeItems: "center", fontSize: 9.5 }}>{u.owner[0]}</span>
                  {u.mine ? "אצלך" : u.owner}
                </span>
              </span>
            </motion.button>
          ))}
        </>)}
      </motion.div>

      {/* ── המגרש שלך: מה שרק אתה יכול ── */}
      <motion.div {...rise(4)}>
        <div className="sec">רק אתה — הכרעות וקריטי · <b className="num">{D.needsYou.length}</b></div>
        {!D.needsYou.length && (
          <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 16, color: "var(--good)", fontSize: 13, fontWeight: 700 }}>
            ✓ שולחן נקי — אין הכרעות או קריטי שממתינים רק לך
          </div>
        )}
        {D.needsYou.map((x, i) => (
          <motion.button key={x.id} {...rise(4 + i * 0.5)} whileTap={{ scale: 0.985 }} onClick={() => setOpen(x)}
            className="glass"
            style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "start", padding: "14px 16px", borderRadius: 17, marginBottom: 9, WebkitTapHighlightColor: "transparent" }}>
            <span className={"chip " + (x.kind === "החלטה" ? "warn" : "crit")}>{x.kind}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{x.title}</span>
              {x.meta && <span style={{ display: "block", fontSize: 11, color: "var(--mut)", marginTop: 2 }}>{x.meta}</span>}
            </span>
            <span style={{ marginInlineStart: "auto", color: "var(--mut)" }}>‹</span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── זירות ── */}
      <motion.div {...rise(6)}>
        <div className="sec">מצב הזירות</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {D.arenas.map((a) => (
            <motion.button key={a.id} whileTap={{ scale: 0.95 }} onClick={() => onArena(a.name)} className="glass"
              aria-label={`תיק זירה ${a.name}`}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 22, fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", WebkitTapHighlightColor: "transparent" }}>
              <motion.span animate={a.state !== "ok" ? { opacity: [1, .45, 1] } : {}} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: a.state === "crit" ? "var(--crit)" : a.state === "warn" ? "var(--warn)" : "var(--good)", boxShadow: a.state === "crit" ? "0 0 10px var(--crit)" : "none" }} />
              {a.name}
              <b className="num" style={{ color: "var(--mut)", fontWeight: 600 }}>{a.open}</b>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── מגירת חריג: להחזיר לו אות-חיים ── */}
      <Drawer.Root open={!!openU} onOpenChange={(o) => !o && setOpenU(null)}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(5,4,2,.6)", zIndex: 50 }} />
          <Drawer.Content style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 51, borderRadius: "26px 26px 0 0", background: "color-mix(in srgb,var(--acc) 7%,var(--bg))", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderBottom: 0, padding: "0 20px calc(24px + env(safe-area-inset-bottom))", maxWidth: 660, margin: "0 auto", color: "var(--ink)" }}>
            <div aria-hidden style={{ width: 44, height: 5, borderRadius: 5, background: "color-mix(in srgb,var(--acc) 35%,transparent)", margin: "12px auto 14px" }} />
            {openU && (<>
              <span className="chip crit">{openU.reason}</span>
              <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 900, lineHeight: 1.28, margin: "10px 0 4px" }}>{openU.title}</Drawer.Title>
              <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 16px" }}>{openU.arena} · {openU.mine ? "אצלך" : openU.owner}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => doU("task_done", openU.id)}
                  style={{ borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>בוצע ✓</motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => doU("task_waiting", openU.id)}
                  style={{ borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>⏳ ממתין ל{openU.mine ? "אחרים" : "הם"}</motion.button>
              </div>
              <p style={{ color: "var(--mut)", fontSize: 10.5, margin: "12px 2px 0", textAlign: "center" }}>{openU.mine ? "הפעולה נרשמת דרך המנוע" : `אלפא רודפת את ${openU.owner} אוטומטית במשמרות — נדנוד יומי עד הבטחה`}</p>
              <CmdBox kind="task" id={openU.id} onDone={() => { setOpenU(null); onChanged(); }}
                placeholder={openU.mine ? "למשל: בוצע חלקית — נשאר רק ההיתר" : `למשל: דיברתי עם ${openU.owner} — יסגור עד חמישי`} />
            </>)}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ── מגירת פריט "רק אתה" ── */}
      <Drawer.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(5,4,2,.6)", zIndex: 50 }} />
          <Drawer.Content style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 51, borderRadius: "26px 26px 0 0", background: "color-mix(in srgb,var(--acc) 7%,var(--bg))", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderBottom: 0, padding: "0 20px calc(24px + env(safe-area-inset-bottom))", maxWidth: 660, margin: "0 auto", color: "var(--ink)" }}>
            <div aria-hidden style={{ width: 44, height: 5, borderRadius: 5, background: "color-mix(in srgb,var(--acc) 35%,transparent)", margin: "12px auto 14px" }} />
            {open && (<>
              <span className={"chip " + (open.kind === "החלטה" ? "warn" : "crit")}>{open.kind}</span>
              <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: "10px 0 6px" }}>{open.title}</Drawer.Title>
              <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 14px" }}>{open.meta}</p>
              {open.recommendation && (
                <div style={{ background: "color-mix(in srgb,var(--acc) 10%,transparent)", border: "1px solid color-mix(in srgb,var(--acc) 30%,transparent)", borderRadius: 14, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".14em", color: "var(--gold)", marginBottom: 5 }}>המלצת המערכת</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{open.recommendation}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 9 }}>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { const o = open; setOpen(null); if (o) onAct(o.kind === "החלטה" ? "decision_decide" : "task_done", o.id); }}
                  style={{ flex: 1, borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>
                  {open.kind === "החלטה" ? "הוכרע ✓" : "טופל ✓"}
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setOpen(null)}
                  style={{ flex: 1, borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>
                  אחר כך
                </motion.button>
              </div>
              <CmdBox kind={open.kind === "החלטה" ? "decision" : "task"} id={open.id} onDone={() => { setOpen(null); onChanged(); }}
                placeholder={open.kind === "החלטה" ? "למשל: מאשר, אבל רק אחרי חוות דעת של שירה" : "למשל: קבע יעד ל-15.9 והעבר לשירה"} />
            </>)}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
