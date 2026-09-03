import { motion } from "motion/react";
import type { Snapshot } from "../lib/data";
import Orb from "../ui/Orb";
import CmdBox from "../ui/CmdBox";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { API, ASK, apiPost, errText, getKey } from "../lib/api";
import { applyText, draftText, opLabel } from "../lib/ops";

const spring = { type: "spring" as const, duration: 0.6, bounce: 0.15 };
const rise = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay: 0.04 * i } });

/* ‏ביקורת 3.9 (איתי: "הכפתורים לא אומרים מה הם עושים"): הכרטיס אומר מאיפה
   ‏ההחלטה באה, מה ✓ עושה ומה ✖ עושה (effect מ-nx-dec), ומציג חלופות ומחיר
   ‏דחייה שכבר נשלחו ונזרקו. משימה שקטה (task-escalation) אומרת במפורש
   ‏שהמשימה עצמה לא משתנה מכאן — ומובילה אליה. */
export function Decisions({ D, onDecide, onChanged, onRetry, onTask }: { D: Snapshot; onDecide: (id: string, verdict: "decided" | "dropped") => Promise<boolean>; onChanged: () => void; onRetry: () => void; onTask?: (id: string) => void }) {
  const [cmdFor, setCmdFor] = useState<string | null>(null);
  const [more, setMore] = useState<string | null>(null);
  const failed = D.live && !D.decisions_ok;
  return (
    <div className="page">
      <div className="sec" style={{ marginTop: 12 }}>החלטות ממתינות · <b className="num">{failed ? "—" : D.decisions.length}</b></div>
      {failed && (
        <div className="glass" style={{ padding: "16px 18px", borderRadius: 18, border: "1px solid color-mix(in srgb,var(--crit) 40%,transparent)" }}>
          <div style={{ color: "var(--crit)", fontSize: 13.5, fontWeight: 800 }}>⛔ ההחלטות לא נטענו</div>
          <div style={{ color: "var(--ink2)", fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>שגיאת רשת מול מקור ההחלטות — זה לא אומר שהכול הוכרע. משוך לרענון או נסה שוב.</div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onRetry}
            style={{ marginTop: 10, borderRadius: 12, padding: "9px 16px", fontSize: 12.5, fontWeight: 800, background: "var(--surface2)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)", color: "var(--acc-hi)" }}>נסה שוב ↻</motion.button>
        </div>
      )}
      {!failed && D.decisions.length === 0 && (
        <div className="glass" style={{ padding: "16px 18px", borderRadius: 18, color: "var(--good)", fontSize: 13.5, fontWeight: 700 }}>
          ✓ אין החלטות ממתינות — הכל הוכרע
        </div>
      )}
      {D.decisions.map((d, i) => {
        const learn = d.source === "learning-engine", esc = d.source === "task-escalation";
        const extra = [d.alternatives ? "חלופות" : "", d.cost_of_delay ? "מחיר הדחייה" : ""].filter(Boolean);
        return (
          <motion.div key={d.id} {...rise(i)} className="glass" style={{ padding: "16px 18px", borderRadius: 18, marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 17.5, fontWeight: 700, lineHeight: 1.3 }}>{d.title}</div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--mut)", marginTop: 6 }}>
              {d.effect?.source_label && <span className="chip mut" style={{ fontSize: 10 }}>{d.effect.source_label}</span>}
              <span>{[d.arena, d.needed_by ? `עד ${d.needed_by}` : "", d.created ? `נפתחה ${d.created}` : ""].filter(Boolean).join(" · ")}</span>
            </div>
            {d.recommendation && <div style={{ fontSize: 13, color: "var(--ink2)", marginTop: 9, borderInlineStart: "2px solid var(--gold)", paddingInlineStart: 10 }}>{d.recommendation}</div>}
            {extra.length > 0 && (more === d.id ? (
              <div style={{ marginTop: 9, fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5 }}>
                {d.alternatives && <div><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--mut)" }}>חלופות</div><div style={{ whiteSpace: "pre-wrap" }}>{d.alternatives}</div></div>}
                {d.cost_of_delay && <div style={{ marginTop: 6 }}><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".1em", color: "var(--mut)" }}>מחיר הדחייה</div><div style={{ whiteSpace: "pre-wrap" }}>{d.cost_of_delay}</div></div>}
              </div>
            ) : (
              <button onClick={() => setMore(d.id)} style={{ marginTop: 8, padding: 0, fontSize: 11.5, fontWeight: 700, color: "var(--acc-hi)" }}>{extra.join(" · ")} ▾</button>
            ))}
            {esc && (
              <div style={{ marginTop: 9, fontSize: 12, color: "var(--warn)", lineHeight: 1.45 }}>
                המשימה עצמה לא משתנה מכאן — כדי לסגור/לבטל/לתת יעד, פתח את המשימה
                {d.taskId && onTask && <> · <button onClick={() => onTask(d.taskId!)} style={{ padding: 0, fontSize: 12, fontWeight: 800, color: "var(--acc-hi)" }}>פתח את המשימה ‹</button></>}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 13 }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => onDecide(d.id, "decided")}
                style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>{learn ? "✓ אמץ כלל" : "✓ קבל המלצה"}</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => onDecide(d.id, "dropped")}
                style={{ flex: 1, borderRadius: 12, padding: "11px 0", fontSize: 13, fontWeight: 700, color: "var(--ink2)", border: "1px solid var(--hair)" }}>ירד מהפרק</motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={() => setCmdFor(cmdFor === d.id ? null : d.id)} aria-label="תגובה חופשית"
                style={{ flex: "none", padding: "0 11px", borderRadius: 12, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap", color: cmdFor === d.id ? "var(--acc-hi)" : "var(--mut)", border: `1px solid ${cmdFor === d.id ? "color-mix(in srgb,var(--acc) 40%,transparent)" : "var(--hair)"}` }}>✏️ תגובה חופשית</motion.button>
            </div>
            {(d.effect?.approve || d.effect?.drop) && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--mut)", lineHeight: 1.5 }}>
                {d.effect.approve && <div>✓ = {d.effect.approve}</div>}
                {d.effect.drop && <div>✖ = {d.effect.drop}</div>}
              </div>
            )}
            {cmdFor === d.id && <CmdBox kind="decision" id={d.id} onDone={() => { setCmdFor(null); onChanged(); }}
              placeholder="למשל: מאשר, אבל רק אחרי חוות דעת של שירה" />}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── אלפא: המוח האמיתי. שאלה ⟶ מוח עמוק (עם polling) או סינכרוני;
   ‏פקודה ⟶ command_preview ⟶ כרטיס פעולות עם אישור ⟶ command_apply.
   ‏אותם מנועים ואותו חוזה כמו האפליקציה הקודמת — אפס לוגיקה חדשה. */
type Msg = { q?: string; a?: string; ops?: any[]; labels?: any[]; summary?: string; question?: string; pending?: boolean; done?: string; fail?: boolean; err?: boolean };
const DEEP_RE = /^(?:מה|מהו|מהי|מהם|מי|כמה|איזה|איזו|אילו|מתי|היכן|איפה|למה|מדוע|האם)(?=\s)/u;

/* ‏השיחה חיה מחוץ לקומפוננטה: מעבר טאב לא מוחק אותה, ותשובת מוח עמוק
   ‏שמגיעה כשהמסך סגור נוחתת בחנות ולא נזרקת. (הכשל שנתפס ב-QA 28.8:
   ‏שאלה לעומק + מעבר לטאב אחר = התשובה אבדה וה-pending נמחק.) */
const GREET_LIVE = "היי איתי! שאלה — אבדוק במערכת (שאלה גדולה ⟶ בדיקה לעומק). פקודה — אציג מה יקרה ואחכה לאישורך.";
const GREET_DEMO = "מצב הדגמה — בלי מפתח אין מוח. התחבר באפליקציה ואחזור לעצמי.";
const chat = {
  msgs: [{ a: getKey() ? GREET_LIVE : GREET_DEMO }] as Msg[],
  hist: [] as { role: string; content: string }[],
  listeners: new Set<() => void>(),
  emit() { for (const fn of this.listeners) fn(); },
  push(m: Msg) { this.msgs = [...this.msgs, m]; this.emit(); },
  patch(i: number, p: Partial<Msg>) { this.msgs = this.msgs.map((x, j) => (j === i ? { ...x, ...p } : x)); this.emit(); },
};
const pollingIds = new Set<string>();
let pendingPrefill = "";
/* ‏"לסכם עם אלפא" מפגישה ⟶ הטקסט מחכה בתיבה כשעוברים לטאב */
export function setAskPrefill(t: string) { pendingPrefill = t; }

function deliver(a: string, err = false) {
  chat.push({ a, err });
  chat.hist.push({ role: "assistant", content: a });
}
async function pollDeep(logId: string, onThink: (v: boolean) => void) {
  if (pollingIds.has(logId)) return; /* ‏מעבר טאב לא פותח לולאה שנייה על אותו log */
  pollingIds.add(logId); onThink(true);
  try {
    const t0 = Date.now();
    while (Date.now() - t0 < 200000) {
      await new Promise(rs => setTimeout(rs, 4000));
      let p: any = null; try { p = await apiPost(ASK, { poll: logId }); } catch { /* ממשיכים */ }
      if (p?.status === "done") { try { localStorage.removeItem("nx_deep_pending"); } catch { /* אין אחסון */ } deliver(p.answer || "לא הצלחתי לגבש תשובה."); return; }
      if (p?.status === "failed") { try { localStorage.removeItem("nx_deep_pending"); } catch { /* אין אחסון */ } deliver("⚠️ הבדיקה לעומק נכשלה — נסה שוב, ואם זה חוזר שאל בטלגרם.", true); return; }
    }
    deliver("⚠️ הבדיקה לעומק לא הסתיימה בזמן — נסה שוב בעוד רגע.", true);
  } finally { pollingIds.delete(logId); onThink(false); }
}

export function Ask({ think, onThink, onChanged }: { think: boolean; onThink: (v: boolean) => void; onChanged: () => void }) {
  const msgs = useSyncExternalStore(
    (cb) => { chat.listeners.add(cb); return () => { chat.listeners.delete(cb); }; },
    () => chat.msgs,
  );
  const [txt, setTxt] = useState(() => { const p = pendingPrefill; pendingPrefill = ""; return p; });

  useEffect(() => {
    /* ‏התחברות אחרי שהברכה כבר נכתבה ⟶ מעדכנים אותה במקום לשקר */
    if (getKey() && chat.msgs.length === 1 && chat.msgs[0].a === GREET_DEMO) chat.patch(0, { a: GREET_LIVE });
    try {
      const raw = localStorage.getItem("nx_deep_pending");
      if (!raw || !getKey()) return;
      const pend = JSON.parse(raw);
      if (!pend?.log_id || Date.now() - (pend.t || 0) > 15 * 60000) { localStorage.removeItem("nx_deep_pending"); return; }
      if (pollingIds.has(pend.log_id)) return; /* ‏הלולאה כבר רצה ברקע */
      chat.push({ q: pend.q }); chat.push({ a: "🔍 ממשיך בדיקה לעומק שהתחלת קודם…" });
      pollDeep(pend.log_id, onThink);
    } catch { /* אין אחסון */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    const q = txt.trim(); if (!q || think) return;
    setTxt(""); chat.push({ q }); onThink(true);
    chat.hist = [...chat.hist.slice(-6), { role: "user", content: q }];
    const answer = (a: string, err = false) => { deliver(a, err); onThink(false); };

    if (!getKey()) { setTimeout(() => answer("במצב הדגמה אני עונה רק כשמחוברים — המפתח נקלט אוטומטית מהאפליקציה."), 900); return; }

    const isDeep = (/[?？]\s*$/.test(q) || DEEP_RE.test(q)) && q.length >= 8;
    try {
      if (isDeep) {
        const r = await apiPost(ASK, { q, deep: true, history: chat.hist.slice(-4) });
        if (r?.mode === "deep" && r.log_id) {
          chat.push({ a: "🔍 בודק לעומק — כמה שאילתות וכמה מחשבה. עד שתי דקות… (אפשר לעבור מסך — התשובה תחכה כאן)" });
          try { localStorage.setItem("nx_deep_pending", JSON.stringify({ log_id: r.log_id, q, t: Date.now() })); } catch { /* אין אחסון */ }
          onThink(false); pollDeep(r.log_id, onThink); return;
        }
        if (r?.reply) { answer(r.reply); return; }
      }
      const r = await apiPost(API, { action: "command_preview", kind: "general", id: null, text: q, history: chat.hist.slice(-4) });
      if (r.route === "ask") answer(r.answer || "לא הצלחתי לענות על זה כרגע.");
      /* ‏ביקורת 3.9: route=draft נקרא כ"לא זיהיתי פעולה" בזמן שהטיוטה כבר נשמרה ב-drafts */
      else if (r.route === "draft" && r.draft?.body) answer(draftText(r.draft));
      else if ((r.ops || []).length) { chat.push({ ops: r.ops, labels: Array.isArray(r.labels) ? r.labels : undefined, summary: r.summary, question: r.question, pending: true }); onThink(false); }
      else answer(r.question || "לא זיהיתי פעולה — נסח אחרת, או שאל אותי.");
    } catch (e: any) {
      answer("⚠️ " + (e?.message || "שגיאה בתקשורת — נסה שוב."), true);
    }
  };

  const apply = async (i: number) => {
    const m = chat.msgs[i]; if (!m?.ops || !m.pending) return;
    chat.patch(i, { pending: false });
    try {
      const r = await apiPost(API, { action: "command_apply", ops: m.ops });
      /* ‏ביקורת 3.9: "בוצעו 0 ✓" אינו הצלחה — applied=0 מוצג כ"לא בוצע דבר" */
      const a = applyText(r), errs: unknown[] = Array.isArray(r.errors) ? r.errors : [];
      chat.patch(i, { done: a.text, fail: !a.ok });
      if (errs.length) chat.push({ a: "מה שנכשל: " + errs.map((e) => errText(e) || "שגיאה").join(" · "), err: true });
      if (a.applied > 0) onChanged();
    } catch (e: any) { chat.patch(i, { pending: true }); toast("הביצוע נכשל — " + (e?.message || "נסה שוב")); }
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
            {(m.ops || []).map((o: any, j: number) => {
              const l = opLabel(o, m.labels?.[j]);
              return (
                <div key={j} style={{ fontSize: 12.5, color: "var(--ink2)", padding: "4px 0", borderTop: j ? "1px solid var(--hair)" : "none" }}>
                  <b style={{ color: "var(--gold)" }}>{l.title}</b>{l.detail ? <span> — {l.detail}</span> : null}
                </div>
              );
            })}
            {m.question && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>❓ {m.question}</div>}
            {m.done ? (
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: m.fail ? "var(--crit)" : "var(--good)" }}>{m.done}</div>
            ) : m.pending && (
              <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => apply(i)}
                  style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 13, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>אשר ובצע ✓</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => chat.patch(i, { pending: false, done: "בוטל" })}
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
