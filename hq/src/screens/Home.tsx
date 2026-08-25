import { motion } from "motion/react";
import { Drawer } from "vaul";
import { useState } from "react";
import { toast } from "sonner";
import type { Snapshot } from "../lib/data";
import Orb from "../ui/Orb";
import Num from "../ui/Num";

const spring = { type: "spring" as const, duration: 0.7, bounce: 0.18 };
const rise = (i: number) => ({
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { ...spring, delay: 0.05 * i },
});

export default function Home({ D, onAsk, think }: { D: Snapshot; onAsk: () => void; think: boolean }) {
  const [open, setOpen] = useState<null | (typeof D.needsYou)[number]>(null);
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

      {/* ── הדבר האחד: טבעת אור חיה ── */}
      {D.focus && (
        <motion.section {...rise(1)} style={{ position: "relative", marginTop: 16, borderRadius: 24, padding: "24px 22px 20px", overflow: "hidden", background: "linear-gradient(160deg,color-mix(in srgb,var(--acc) 12%,var(--bg)),color-mix(in srgb,var(--bg) 96%,#000) 70%)", boxShadow: "inset 0 0 0 1px color-mix(in srgb,var(--acc) 35%,transparent), inset 0 0 46px color-mix(in srgb,var(--acc) 6%,transparent), 0 22px 48px rgba(0,0,0,.55)" }}>
          <motion.span aria-hidden initial={{ rotate: 0, opacity: 1 }} animate={{ rotate: 360, opacity: 0 }}
            transition={{ rotate: { duration: 1.5, ease: [0.23, 1, 0.32, 1] }, opacity: { delay: 1.15, duration: 0.45 } }}
            style={{ position: "absolute", inset: -110, background: "conic-gradient(transparent 0 76%, color-mix(in srgb,var(--acc-hi) 50%,transparent) 88%, transparent 96%)", mixBlendMode: "screen", pointerEvents: "none" }} />
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".22em", marginBottom: 10, background: "linear-gradient(90deg,var(--acc-hi),var(--acc) 60%,var(--acc-lo))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            ⭐ הדבר האחד של היום
          </div>
          <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 27, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-.015em", textWrap: "balance" }}>{D.focus.title}</h1>
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink2)" }}>
            {D.focus.days > 0 && <span className="chip crit" style={{ marginInlineEnd: 8 }}>{D.focus.days} ימים בלי תנועה</span>}
            {D.focus.sub}
          </p>
          <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => toast.success("סומן כבוצע — נרשם במערכת")}
              style={{ flex: 1, borderRadius: 13, padding: "12px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)", boxShadow: "0 8px 20px color-mix(in srgb,var(--acc) 30%,transparent)" }}>
              בוצע ✓
            </motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => toast("אבקש מהמוח הצעה חדשה")}
              style={{ flex: 1, borderRadius: 13, padding: "12px 0", fontSize: 13.5, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>
              החלף
            </motion.button>
          </div>
        </motion.section>
      )}

      {/* ── שלושת המספרים ── */}
      <motion.div {...rise(2)} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
        {[
          { n: D.k.needsYou, t: "דורש אותך", c: "var(--crit)" },
          { n: D.k.waitingOthers, t: "אצל אחרים", c: "var(--gold)" },
          { n: D.k.closedToday, t: "נסגרו היום", c: "var(--good)" },
        ].map((k) => (
          <div key={k.t} className="glass" style={{ padding: "14px 15px 12px", borderRadius: 18 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 30, fontWeight: 700, lineHeight: 1, color: k.c }}><Num value={k.n} /></div>
            <div style={{ fontSize: 10.5, color: "var(--mut)", fontWeight: 700, marginTop: 6 }}>{k.t}</div>
          </div>
        ))}
      </motion.div>

      {/* ── דורש אותך עכשיו ── */}
      <motion.div {...rise(3)}>
        <div className="sec">דורש אותך עכשיו · <b className="num">{D.k.needsYou}</b></div>
        {D.needsYou.map((x, i) => (
          <motion.button key={x.id} {...rise(3 + i * 0.6)} whileTap={{ scale: 0.985 }} onClick={() => setOpen(x)}
            className="glass"
            style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "start", padding: "14px 16px", borderRadius: 17, marginBottom: 9, WebkitTapHighlightColor: "transparent" }}>
            <span className={"chip " + (x.kind === "החלטה" ? "warn" : x.kind === "קריטי" ? "crit" : "crit")}>{x.kind}</span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{x.title}</span>
              {x.meta && <span style={{ display: "block", fontSize: 11, color: "var(--mut)", marginTop: 2 }}>{x.meta}</span>}
            </span>
            <span style={{ marginInlineStart: "auto", color: "var(--mut)" }}>‹</span>
          </motion.button>
        ))}
      </motion.div>

      {/* ── זירות ── */}
      <motion.div {...rise(5)}>
        <div className="sec">מצב הזירות</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {D.arenas.map((a) => (
            <motion.span key={a.id} whileTap={{ scale: 0.95 }} className="glass"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 15px", borderRadius: 22, fontSize: 12.5, fontWeight: 700, color: "var(--ink2)" }}>
              <motion.span animate={a.state !== "ok" ? { opacity: [1, .45, 1] } : {}} transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 8, height: 8, borderRadius: "50%", background: a.state === "crit" ? "var(--crit)" : a.state === "warn" ? "var(--warn)" : "var(--good)", boxShadow: a.state === "crit" ? "0 0 10px var(--crit)" : "none" }} />
              {a.name}
              <b className="num" style={{ color: "var(--mut)", fontWeight: 600 }}>{a.open}</b>
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* ── מגירת פריט (Vaul — הפיזיקה של אמיל) ── */}
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
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setOpen(null); toast.success("נרשם — עובר דרך המנוע"); }}
                  style={{ flex: 1, borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>
                  {open.kind === "החלטה" ? "הוכרע ✓" : "טופל ✓"}
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setOpen(null)}
                  style={{ flex: 1, borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 700, color: "var(--acc-hi)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)" }}>
                  אחר כך
                </motion.button>
              </div>
            </>)}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
