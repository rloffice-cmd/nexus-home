import { motion } from "motion/react";
import type { Snapshot } from "../lib/data";
import Orb from "../ui/Orb";
import { useState } from "react";

const spring = { type: "spring" as const, duration: 0.6, bounce: 0.15 };
const rise = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay: 0.04 * i } });

export function Decisions({ D }: { D: Snapshot }) {
  return (
    <div className="page">
      <div className="sec" style={{ marginTop: 12 }}>החלטות ממתינות · <b className="num">{D.decisions.length}</b></div>
      {D.decisions.map((d, i) => (
        <motion.div key={d.id} {...rise(i)} className="glass" style={{ padding: "16px 18px", borderRadius: 18, marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 5 }}>{d.arena}{d.needed_by ? ` · עד ${d.needed_by}` : ""}</div>
          {d.recommendation && <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 9, borderInlineStart: "2px solid var(--gold)", paddingInlineStart: 10 }}>{d.recommendation}</div>}
        </motion.div>
      ))}
    </div>
  );
}

export function Ask({ think, onThink }: { think: boolean; onThink: (v: boolean) => void }) {
  const [msgs, setMsgs] = useState<{ q?: string; a?: string }[]>([
    { a: "היי איתי! אני כאן — שאלה, משימה, בקשה. הכול עובר דרך המנועים של נקסוס." },
  ]);
  const [txt, setTxt] = useState("");
  const send = () => {
    const q = txt.trim(); if (!q) return;
    setTxt(""); setMsgs((m) => [...m, { q }]); onThink(true);
    setTimeout(() => { onThink(false); setMsgs((m) => [...m, { a: "בגרסת התצוגה אני עונה רק במצב מחובר — בלילה 2 המוח העמוק מתחבר לכאן, כולל שאלות ארוכות שרצות ברקע." }]); }, 1600);
  };
  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 40px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px 16px" }}>
        <Orb size={44} think={think} />
        <div><b style={{ fontSize: 15 }}>אלפא</b><div style={{ fontSize: 11, color: "var(--mut)" }}>{think ? "חושבת…" : "העוזרת הדיגיטלית שלך"}</div></div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            style={m.q
              ? { alignSelf: "flex-start", maxWidth: "85%", background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 60%,var(--acc-lo))", color: "var(--acc-ink)", borderRadius: "16px 5px 16px 16px", padding: "10px 14px", fontSize: 14, fontWeight: 700 }
              : { alignSelf: "flex-end", maxWidth: "92%", background: "var(--surface2)", border: "1px solid var(--hair)", borderRadius: "5px 16px 16px 16px", padding: "11px 15px", fontSize: 14, lineHeight: 1.55 }}>
            {m.q || m.a}
          </motion.div>
        ))}
        {think && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ alignSelf: "flex-end", display: "flex", gap: 5, padding: "12px 16px" }}>
            {[0, 1, 2].map((i) => (
              <motion.span key={i} animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gold)" }} />
            ))}
          </motion.div>
        )}
      </div>
      <div style={{ position: "sticky", bottom: "calc(var(--nav-h) + env(safe-area-inset-bottom) + 14px)", display: "flex", gap: 8, paddingTop: 12 }}>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="דבר איתי — שאלה, משימה, בקשה…"
          style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--hair)", color: "var(--ink)", borderRadius: 14, padding: "13px 15px", fontSize: 15, fontFamily: "inherit", outline: "none" }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={send} aria-label="שלח"
          style={{ width: 50, borderRadius: 14, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)", fontSize: 18, fontWeight: 800 }}>↑</motion.button>
      </div>
    </div>
  );
}
