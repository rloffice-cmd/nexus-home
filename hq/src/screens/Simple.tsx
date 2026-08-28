import { motion } from "motion/react";
import type { Snapshot } from "../lib/data";
import Orb from "../ui/Orb";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { API, ASK, apiPost, getKey } from "../lib/api";

const spring = { type: "spring" as const, duration: 0.6, bounce: 0.15 };
const rise = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay: 0.04 * i } });

export function Decisions({ D, onDecide }: { D: Snapshot; onDecide: (id: string, verdict: "decided" | "dropped") => Promise<boolean> }) {
  return (
    <div className="page">
      <div className="sec" style={{ marginTop: 12 }}>החלטות ממתינות · <b className="num">{D.decisions.length}</b></div>
      {D.decisions.length === 0 && (
        <div className="glass" style={{ padding: "16px 18px", borderRadius: 18, color: "var(--good)", fontSize: 13.5, fontWeight: 700 }}>
          ✓ אין החלטות ממתינות — הכל הוכרע
        </div>
      )}
      {D.decisions.map((d, i) => (
        <motion.div key={d.id} {...rise(i)} className="glass" style={{ padding: "16px 18px", borderRadius: 18, marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</div>
          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 5 }}>{d.arena}{d.needed_by ? ` · עד ${d.needed_by}` : ""}</div>
          {d.recommendation && <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 9, borderInlineStart: "2px solid var(--gold)", paddingInlineStart: 10 }}>{d.recommendation}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => onDecide(d.id, "decided")}
              style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>הוכרע ✓</motion.button>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => onDecide(d.id, "dropped")}
              style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, color: "var(--ink2)", border: "1px solid var(--hair)" }}>ירד מהפרק</motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── אלפא: המוח האמיתי. שאלה ⟶ מוח עמוק (עם polling) או סינכרוני;
   ‏פקודה ⟶ command_preview ⟶ כרטיס פעולות עם אישור ⟶ command_apply.
   ‏אותם מנועים ואותו חוזה כמו האפליקציה הקודמת — אפס לוגיקה חדשה. */
type Msg = { q?: string; a?: string; ops?: any[]; summary?: string; question?: string; pending?: boolean; done?: string; err?: boolean };
const DEEP_RE = /^(?:מה|מהו|מהי|מהם|מי|כמה|איזה|איזו|אילו|מתי|היכן|איפה|למה|מדוע|האם)(?=\s)/u;

export function Ask({ think, onThink, onChanged }: { think: boolean; onThink: (v: boolean) => void; onChanged: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { a: getKey() ? "היי איתי! שאלה — אבדוק במערכת (שאלה גדולה ⟶ בדיקה לעומק). פקודה — אציג מה יקרה ואחכה לאישורך." : "מצב הדגמה — בלי מפתח אין מוח. התחבר באפליקציה ואחזור לעצמי." },
  ]);
  const [txt, setTxt] = useState("");
  const hist = useRef<{ role: string; content: string }[]>([]);
  const push = (m: Msg) => setMsgs(s => [...s, m]);
  const patch = (i: number, m: Partial<Msg>) => setMsgs(s => s.map((x, j) => j === i ? { ...x, ...m } : x));

  /* ‏מוח עמוק ששרד סגירת אפליקציה: ה-log_id נשמר במכשיר, ובפתיחה הבאה
     ‏ההמתנה מתחדשת מאותה נקודה — התשובה לא הולכת לאיבוד עם המסך. */
  const answerRef = useRef<(a: string, err?: boolean) => void>(() => {});
  const pollDeep = async (logId: string) => {
    const t0 = Date.now();
    while (Date.now() - t0 < 200000) {
      await new Promise(rs => setTimeout(rs, 4000));
      let p: any = null; try { p = await apiPost(ASK, { poll: logId }); } catch { /* ממשיכים */ }
      if (p?.status === "done") { try { localStorage.removeItem("nx_deep_pending"); } catch { /* אין אחסון */ } answerRef.current(p.answer || "לא הצלחתי לגבש תשובה."); return true; }
      if (p?.status === "failed") { try { localStorage.removeItem("nx_deep_pending"); } catch { /* אין אחסון */ } answerRef.current("⚠️ הבדיקה לעומק נכשלה — נסה שוב, ואם זה חוזר שאל בטלגרם.", true); return true; }
    }
    answerRef.current("⚠️ הבדיקה לעומק לא הסתיימה בזמן — נסה שוב בעוד רגע.", true); return false;
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nx_deep_pending");
      if (!raw || !getKey()) return;
      const pend = JSON.parse(raw);
      if (!pend?.log_id || Date.now() - (pend.t || 0) > 15 * 60000) { localStorage.removeItem("nx_deep_pending"); return; }
      push({ q: pend.q }); push({ a: "🔍 ממשיך בדיקה לעומק שהתחלת קודם…" });
      onThink(true); pollDeep(pend.log_id).finally(() => onThink(false));
    } catch { /* אין אחסון */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    const q = txt.trim(); if (!q || think) return;
    setTxt(""); push({ q }); onThink(true);
    hist.current = [...hist.current.slice(-6), { role: "user", content: q }];
    const answer = (a: string, err = false) => { push({ a, err }); hist.current.push({ role: "assistant", content: a }); onThink(false); };
    answerRef.current = answer;

    if (!getKey()) { setTimeout(() => answer("במצב הדגמה אני עונה רק כשמחוברים — המפתח נקלט אוטומטית מהאפליקציה."), 900); return; }

    const isDeep = (/[?？]\s*$/.test(q) || DEEP_RE.test(q)) && q.length >= 8;
    try {
      if (isDeep) {
        const r = await apiPost(ASK, { q, deep: true, history: hist.current.slice(-4) });
        if (r?.mode === "deep" && r.log_id) {
          push({ a: "🔍 בודק לעומק — כמה שאילתות וכמה מחשבה. עד שתי דקות… (אפשר לסגור — אמשיך בפתיחה הבאה)" });
          try { localStorage.setItem("nx_deep_pending", JSON.stringify({ log_id: r.log_id, q, t: Date.now() })); } catch { /* אין אחסון */ }
          await pollDeep(r.log_id); return;
        }
        if (r?.reply) { answer(r.reply); return; }
      }
      const r = await apiPost(API, { action: "command_preview", kind: "general", id: null, text: q, history: hist.current.slice(-4) });
      if (r.route === "ask") answer(r.answer || "לא הצלחתי לענות על זה כרגע.");
      else if ((r.ops || []).length) { push({ ops: r.ops, summary: r.summary, question: r.question, pending: true }); onThink(false); }
      else answer(r.question || "לא זיהיתי פעולה — נסח אחרת, או שאל אותי.");
    } catch (e: any) {
      answer("⚠️ " + (e?.message || "שגיאה בתקשורת — נסה שוב."), true);
    }
  };

  const apply = async (i: number) => {
    const m = msgs[i]; if (!m?.ops || !m.pending) return;
    patch(i, { pending: false });
    try {
      const r = await apiPost(API, { action: "command_apply", ops: m.ops });
      const n = r.applied || 0, errs = r.errors || [];
      patch(i, { done: errs.length ? `בוצעו ${n} · ${errs.length} נכשלו` : n === 1 ? "בוצע ✓" : `בוצעו ${n} ✓` });
      if (errs.length) push({ a: "מה שנכשל: " + errs.map((e: any) => e.error || "שגיאה").join(" · "), err: true });
      onChanged();
    } catch (e: any) { patch(i, { pending: true }); toast("הביצוע נכשל — נסה שוב"); }
  };

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 40px)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px 16px" }}>
        <Orb size={44} think={think} />
        <div><b style={{ fontSize: 15 }}>אלפא</b><div style={{ fontSize: 11, color: "var(--mut)" }}>{think ? "חושבת…" : getKey() ? "מחוברת למוח" : "מצב הדגמה"}</div></div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => m.ops ? (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            style={{ alignSelf: "flex-end", maxWidth: "94%", width: "94%", background: "color-mix(in srgb,var(--acc) 8%,var(--surface2))", border: "1px solid color-mix(in srgb,var(--acc) 30%,transparent)", borderRadius: 16, padding: "13px 15px" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{m.summary || "הפעולות שיבוצעו:"}</div>
            {(m.ops || []).map((o: any, j: number) => (
              <div key={j} style={{ fontSize: 12.5, color: "var(--ink2)", padding: "4px 0", borderTop: j ? "1px solid var(--hair)" : "none" }}>
                <code style={{ color: "var(--gold)", fontSize: 11 }}>{o.op}</code> {o.title || o.note || o.id || ""}
              </div>
            ))}
            {m.question && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>❓ {m.question}</div>}
            {m.done ? (
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "var(--good)" }}>{m.done}</div>
            ) : m.pending && (
              <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => apply(i)}
                  style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 13, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>אשר ובצע ✓</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => patch(i, { pending: false, done: "בוטל" })}
                  style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "var(--ink2)", border: "1px solid var(--hair)" }}>בטל</motion.button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring}
            style={m.q
              ? { alignSelf: "flex-start", maxWidth: "85%", background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 60%,var(--acc-lo))", color: "var(--acc-ink)", borderRadius: "16px 5px 16px 16px", padding: "10px 14px", fontSize: 14, fontWeight: 700, whiteSpace: "pre-wrap" }
              : { alignSelf: "flex-end", maxWidth: "92%", background: m.err ? "color-mix(in srgb,var(--crit) 12%,var(--surface2))" : "var(--surface2)", border: "1px solid var(--hair)", borderRadius: "5px 16px 16px 16px", padding: "11px 15px", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
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
