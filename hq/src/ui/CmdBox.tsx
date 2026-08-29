import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { API, apiPost, getKey } from "../lib/api";

/* ‏"דבר עם זה" — תגובה בטקסט חופשי על פריט, בכל מקום שיש פריט (בקשת
   ‏איתי 29.8: "להגיב גם בטקסט חופשי שיעובד ויקלט נכון… בכל המקומות").
   ‏אותו מנוע כמו האפליקציה הקודמת: command_preview עם kind+id ⟶ תצוגה
   ‏מקדימה של הפעולות ⟶ אישור ⟶ command_apply. הממשק לא כותב — המנוע. */

type Kind = "task" | "decision" | "person" | "arena" | "commitment";
type St =
  | { s: "idle" }
  | { s: "busy" }
  | { s: "answer"; text: string }
  | { s: "ops"; ops: any[]; summary?: string; question?: string }
  | { s: "done"; text: string };

export default function CmdBox({ kind, id, placeholder, onDone }: { kind: Kind; id: string; placeholder?: string; onDone?: () => void }) {
  const [txt, setTxt] = useState("");
  const [st, setSt] = useState<St>({ s: "idle" });

  const send = async () => {
    const q = txt.trim(); if (!q || st.s === "busy") return;
    if (!getKey()) { toast("מצב הדגמה — התחבר כדי שהמערכת תקלוט"); return; }
    setSt({ s: "busy" });
    try {
      const r = await apiPost(API, { action: "command_preview", kind, id, text: q });
      if (r.route === "ask") { setSt({ s: "answer", text: r.answer || "לא הצלחתי לענות על זה." }); setTxt(""); return; }
      if ((r.ops || []).length) { setSt({ s: "ops", ops: r.ops, summary: r.summary, question: r.question }); return; }
      setSt({ s: "answer", text: r.question || "לא זיהיתי פעולה — נסח אחרת." });
    } catch (e: any) { setSt({ s: "idle" }); toast("לא נקלט — נסה שוב" + (e?.message ? ` (${e.message})` : "")); }
  };
  const apply = async () => {
    if (st.s !== "ops") return;
    const ops = st.ops; setSt({ s: "busy" });
    try {
      const r = await apiPost(API, { action: "command_apply", ops });
      const n = r.applied || 0, errs = r.errors || [];
      setSt({ s: "done", text: errs.length ? `בוצעו ${n} · ${errs.length} נכשלו` : "נקלט במערכת ✓" });
      setTxt(""); onDone?.();
    } catch { setSt({ s: "ops", ops }); toast("הביצוע נכשל — נסה שוב"); }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".12em", color: "var(--mut)", marginBottom: 6 }}>💬 תגובה חופשית — נקלטת דרך המנוע</div>
      <div style={{ display: "flex", gap: 7 }}>
        <input value={txt} onChange={(e) => { setTxt(e.target.value); if (st.s === "answer" || st.s === "done") setSt({ s: "idle" }); }}
          onKeyDown={(e) => e.key === "Enter" && send()} disabled={st.s === "busy" || st.s === "ops"}
          placeholder={placeholder || "למשל: דיברתי איתו — יסגור עד חמישי"}
          style={{ flex: 1, minWidth: 0, background: "var(--surface2)", border: "1px solid var(--hair)", color: "var(--ink)", borderRadius: 12, padding: "11px 13px", fontSize: 13.5, fontFamily: "inherit", outline: "none", opacity: st.s === "ops" ? 0.5 : 1 }} />
        <motion.button whileTap={{ scale: 0.92 }} onClick={send} aria-label="שלח תגובה" disabled={st.s === "busy" || st.s === "ops"}
          style={{ flex: "none", width: 46, borderRadius: 12, background: "var(--surface2)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)", color: "var(--acc-hi)", fontSize: 16, fontWeight: 800, opacity: st.s === "busy" ? 0.5 : 1, WebkitTapHighlightColor: "transparent" }}>
          {st.s === "busy" ? "…" : "↑"}
        </motion.button>
      </div>
      <AnimatePresence>
        {st.s === "answer" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.55, color: "var(--ink2)", background: "var(--surface2)", border: "1px solid var(--hair)", borderRadius: 12, padding: "10px 12px", whiteSpace: "pre-wrap" }}>{st.text}</div>
          </motion.div>
        )}
        {st.s === "done" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: "var(--good)" }}>{st.text}</motion.div>
        )}
        {st.s === "ops" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ marginTop: 8, background: "color-mix(in srgb,var(--acc) 8%,var(--surface2))", border: "1px solid color-mix(in srgb,var(--acc) 30%,transparent)", borderRadius: 12, padding: "11px 13px" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{st.summary || "הפעולות שיבוצעו:"}</div>
              {st.ops.map((o: any, j: number) => (
                <div key={j} style={{ fontSize: 12, color: "var(--ink2)", padding: "3px 0", borderTop: j ? "1px solid var(--hair)" : "none" }}>
                  <code style={{ color: "var(--gold)", fontSize: 10.5 }}>{o.op}</code> {o.title || o.note || ""}
                </div>
              ))}
              {st.question && <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 5 }}>❓ {st.question}</div>}
              <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={apply}
                  style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>אשר ובצע ✓</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSt({ s: "idle" })}
                  style={{ flex: 1, borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 700, color: "var(--ink2)", border: "1px solid var(--hair)" }}>בטל</motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
