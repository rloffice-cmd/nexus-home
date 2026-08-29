import { motion } from "motion/react";
import { Drawer } from "vaul";
import { useState } from "react";
import type { Snapshot, Meeting } from "../lib/data";
import { useBackLayer } from "../lib/nav";

/* ‏פגישות — החלון הקדימה (±14 יום מגיע מהמערכת; כאן מוצג מהיום והלאה).
   תיק פגישה שהוכן ע"י nexus-meeting-prep נפתח במגירה; פגישה בלי תיק
   אומרת זאת ביושר. סיכום פגישה נשאר בצ'אט עם אלפא — שם המנוע. */

const spring = { type: "spring" as const, duration: 0.55, bounce: 0.14 };
const rise = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay: 0.04 * Math.min(i, 8) } });

export default function Meetings({ D, onAsk }: { D: Snapshot; onAsk: (prefill?: string) => void }) {
  const [open, setOpen] = useState<Meeting | null>(null);
  useBackLayer(!!open, () => setOpen(null));
  const groups: { label: string; items: Meeting[] }[] = [];
  for (const m of D.meetings) {
    const g = groups.find(x => x.label === m.dayLabel);
    if (g) g.items.push(m); else groups.push({ label: m.dayLabel, items: [m] });
  }
  return (
    <div className="page">
      <div className="sec" style={{ marginTop: 12 }}>פגישות קרובות · <b className="num">{D.meetings.length}</b></div>
      {!D.meetings.length && (
        <div className="glass" style={{ padding: "16px 18px", borderRadius: 18, color: "var(--good)", fontSize: 13.5, fontWeight: 700 }}>
          ✓ אין פגישות בחלון הקרוב — היומן פנוי
        </div>
      )}
      {groups.map((g, gi) => (
        <div key={g.label}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".12em", color: g.label === "היום" ? "var(--gold)" : "var(--mut)", margin: "14px 2px 8px" }}>{g.label}</div>
          {g.items.map((m, i) => (
            <motion.button key={m.id} {...rise(gi * 2 + i)} whileTap={{ scale: 0.985 }} onClick={() => setOpen(m)} className="glass"
              style={{ display: "flex", gap: 13, alignItems: "center", width: "100%", textAlign: "start", padding: "13px 16px", borderRadius: 17, marginBottom: 9, WebkitTapHighlightColor: "transparent" }}>
              <span className="num" style={{ flex: "none", fontFamily: "var(--serif)", fontSize: 17, fontWeight: 800, color: "var(--acc-hi)", minWidth: 46 }}>{m.when}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{m.title}</span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, fontSize: 10.5 }}>
                  {m.prepBody ? <span className="chip good">📋 תיק מוכן</span> : <span className="chip mut">בלי תיק</span>}
                  {m.arena && <span style={{ color: "var(--mut)", fontWeight: 600 }}>{m.arena}</span>}
                  {m.location && <span style={{ color: "var(--mut)" }}>📍 {m.location}</span>}
                </span>
              </span>
              <span style={{ color: "var(--mut)" }}>‹</span>
            </motion.button>
          ))}
        </div>
      ))}

      <Drawer.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(5,4,2,.6)", zIndex: 50 }} />
          <Drawer.Content style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 51, maxHeight: "86dvh", display: "flex", flexDirection: "column", borderRadius: "26px 26px 0 0", background: "color-mix(in srgb,var(--acc) 7%,var(--bg))", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderBottom: 0, padding: "0 20px calc(24px + env(safe-area-inset-bottom))", maxWidth: 660, margin: "0 auto", color: "var(--ink)" }}>
            <div aria-hidden style={{ flex: "none", width: 44, height: 5, borderRadius: 5, background: "color-mix(in srgb,var(--acc) 35%,transparent)", margin: "12px auto 14px" }} />
            {open && (
              <div style={{ overflowY: "auto", minHeight: 0 }}>
                <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: "0 0 4px" }}>{open.title}</Drawer.Title>
                <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 14px" }}>
                  {open.dayLabel} · {open.when}{open.arena ? ` · ${open.arena}` : ""}{open.location ? ` · ${open.location}` : ""}
                </p>
                {open.prepBody ? (
                  <div style={{ background: "color-mix(in srgb,var(--acc) 8%,transparent)", border: "1px solid color-mix(in srgb,var(--acc) 26%,transparent)", borderRadius: 14, padding: "13px 15px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".14em", color: "var(--gold)", marginBottom: 7 }}>📋 תיק הפגישה{open.prepDepth ? ` · ${open.prepDepth}` : ""}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{open.prepBody}</div>
                  </div>
                ) : (
                  <div style={{ color: "var(--mut)", fontSize: 13, marginBottom: 14 }}>אין תיק לפגישה הזאת — המערכת מכינה תיקים אוטומטית לקראת פגישות מזוהות.</div>
                )}
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => { const m = open; setOpen(null); onAsk(m.dayOffset === 0 ? `סיכום פגישה — ${m.title}: ` : `לגבי הפגישה "${m.title}": `); }}
                  style={{ width: "100%", borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" }}>
                  {open.dayOffset === 0 ? "לסכם את הפגישה עם אלפא ←" : "לשאול את אלפא על הפגישה ←"}
                </motion.button>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
