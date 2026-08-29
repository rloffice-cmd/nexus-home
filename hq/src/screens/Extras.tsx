import { motion, AnimatePresence } from "motion/react";
import { Drawer } from "vaul";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Snapshot } from "../lib/data";
import { API, FILE, REPORT, apiGet, apiPost, getKey } from "../lib/api";

/* ‏"עוד" — הפונקציות שחיו בהמבורגר של האפליקציה הקודמת (פידבק איתי 28.8):
   ‏שיוך מסמכים (nx-file, אותו מנוע) · מה לא ברור (verify_commit) · אנשים ·
   ‏לקחים · האפליקציה הקודמת · התנתקות. וההתחברות עצמה — מסך אמיתי במקום
   ‏window.prompt, שב-PWA מותקן פשוט לא נפתח. */

export type SheetId = null | "connect" | "more" | "filing" | "people" | "lessons" | "verify" | "reports" | "alpha";

const spring = { type: "spring" as const, duration: 0.55, bounce: 0.14 };
const drawerStyle: React.CSSProperties = { position: "fixed", insetInline: 0, bottom: 0, zIndex: 51, maxHeight: "88dvh", display: "flex", flexDirection: "column", borderRadius: "26px 26px 0 0", background: "color-mix(in srgb,var(--acc) 7%,var(--bg))", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderBottom: 0, padding: "0 20px calc(24px + env(safe-area-inset-bottom))", maxWidth: 660, margin: "0 auto", color: "var(--ink)" };
const grab = <div aria-hidden style={{ flex: "none", width: 44, height: 5, borderRadius: 5, background: "color-mix(in srgb,var(--acc) 35%,transparent)", margin: "12px auto 14px" }} />;
const btnGold: React.CSSProperties = { borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 800, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 55%,var(--acc-lo))", color: "var(--acc-ink)" };
const btnLine: React.CSSProperties = { borderRadius: 13, padding: "13px 0", fontSize: 13.5, fontWeight: 700, color: "var(--ink2)", border: "1px solid var(--hair)" };

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(5,4,2,.6)", zIndex: 50 }} />
        <Drawer.Content style={drawerStyle}>{grab}<div style={{ overflowY: "auto", minHeight: 0 }}>{children}</div></Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* ── התחברות: שדה אמיתי, הסבר אמיתי, אפס prompt ── */
export function ConnectSheet({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: () => void }) {
  const [v, setV] = useState("");
  const save = () => {
    const k = v.trim(); if (!k) return;
    try { localStorage.setItem("nx_k3", k); } catch { toast("הדפדפן חוסם שמירה — נסה מחוץ למצב פרטי"); return; }
    setV(""); onClose(); onConnected();
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 6px" }}>🔑 התחברות</Drawer.Title>
      <p style={{ color: "var(--ink2)", fontSize: 13, lineHeight: 1.55, margin: "0 0 14px" }}>
        הדבק את מפתח הגישה שלך — אותו מפתח מהאפליקציה הקודמת. הוא נשמר במכשיר הזה בלבד ולא נשלח לאף אחד מלבד השרת שלך.
      </p>
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="מפתח Nexus…" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        style={{ width: "100%", background: "var(--surface2)", border: "1px solid color-mix(in srgb,var(--acc) 35%,transparent)", color: "var(--ink)", borderRadius: 14, padding: "14px 15px", fontSize: 15, fontFamily: "inherit", outline: "none", marginBottom: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <motion.button whileTap={{ scale: 0.96 }} onClick={save} style={btnGold}>התחבר ✓</motion.button>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onClose} style={btnLine}>ביטול</motion.button>
      </div>
    </Sheet>
  );
}

/* ── באנר הדגמה: נתוני דוגמה לעולם לא מתחזים לאמת. שלוש אמיתות שונות:
   ‏אין מפתח ⟶ "התחבר" · הרשת נפלה ⟶ "נסה שוב" · המפתח נדחה ⟶ "התחבר מחדש".
   ‏כשל תקשורת שנראה כמו מצב הדגמה רגיל הוא §6 — הבאנר אומר בדיוק מה קרה. */
export function DemoBanner({ onConnect, err }: { onConnect: () => void; err?: "net" | "key" }) {
  const isErr = !!err;
  const col = isErr ? "var(--crit)" : "var(--warn)";
  return (
    <motion.button initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={spring} onClick={onConnect}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "calc(100% - 32px)", maxWidth: 628, margin: "6px auto 0", textAlign: "start", padding: "11px 15px", borderRadius: 14, background: `color-mix(in srgb,${col} 13%,var(--bg))`, border: `1px solid color-mix(in srgb,${col} 40%,transparent)`, WebkitTapHighlightColor: "transparent" }}>
      <span style={{ fontSize: 17 }}>{isErr ? "⛔" : "⚠️"}</span>
      <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink)" }}>
        <b>{err === "net" ? "החיבור נכשל — מוצגים נתוני דוגמה, לא המצב שלך."
          : err === "key" ? "המפתח נדחה — מוצגים נתוני דוגמה, לא המצב שלך."
          : "מצב הדגמה — אלה נתוני דוגמה, לא המצב האמיתי שלך."}</b>
        <span style={{ display: "block", color: "var(--ink2)", fontSize: 11.5 }}>
          {err === "net" ? "הקש כאן לנסות שוב" : err === "key" ? "הקש כאן והדבק מפתח תקף" : "הקש כאן והדבק את המפתח כדי להתחבר"}
        </span>
      </span>
    </motion.button>
  );
}

/* ── שיוך מסמכים — אותו מנוע (nx-file), אותה אסימטריה ── */
type Folder = { folder: string; short?: string; docs: number; sample?: string; suggest_arena_id?: string; suggest_arena?: string };
type FArena = { id: string; name: string; status?: string };
export function FilingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [st, setSt] = useState<{ loading: boolean; err: string; folders: Folder[]; arenas: FArena[]; count: { docs: number; folders: number } | null }>({ loading: true, err: "", folders: [], arenas: [], count: null });
  const [pick, setPick] = useState<Folder | null>(null);
  const [newArena, setNewArena] = useState("");

  const load = async () => {
    if (!getKey()) { setSt(s => ({ ...s, loading: false, err: "demo" })); return; }
    setSt(s => ({ ...s, loading: true, err: "" }));
    try {
      const r = await apiPost(FILE, { action: "unfiled_list", limit: 60 });
      setSt({ loading: false, err: "", folders: r.folders || [], arenas: r.arenas || [], count: r.count || null });
    } catch (e: any) { setSt(s => ({ ...s, loading: false, err: String(e?.message || e) })); }
  };
  useEffect(() => { if (open) { setPick(null); load(); } /* eslint-disable-next-line */ }, [open]);

  const drop = (f: Folder, docs: number) => setSt(s => ({ ...s, folders: s.folders.filter(x => x.folder !== f.folder), count: s.count ? { docs: s.count.docs - docs, folders: s.count.folders - 1 } : null }));
  const fileTo = async (f: Folder, arenaId: string, arenaName: string) => {
    setPick(null); drop(f, f.docs);
    try {
      const r = await apiPost(FILE, { action: "file_folder", folder: f.folder, arena_id: arenaId });
      toast.success(`שויכו ${r.filed ?? f.docs} מסמכים ל${arenaName}${r.rule ? " · נלמד כלל" : ""}`);
    } catch { toast("השיוך נכשל — התיקייה חוזרת"); load(); }
  };
  const ignore = async (f: Folder) => {
    drop(f, f.docs);
    try { await apiPost(FILE, { action: "ignore_folder", folder: f.folder }); toast("סומן כלא רלוונטי"); }
    catch { toast("לא נשמר"); load(); }
  };
  const createAndFile = async (f: Folder) => {
    const name = newArena.trim(); if (!name) return;
    setNewArena("");
    try {
      const r = await apiPost(FILE, { action: "arena_create", name });
      if (r?.id) { setSt(s => ({ ...s, arenas: [{ id: r.id, name }, ...s.arenas] })); await fileTo(f, r.id, name); }
      else toast("יצירת הזירה נכשלה");
    } catch (e: any) { toast("יצירת הזירה נכשלה: " + (e?.message || "")); }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 4px" }}>
        🗂 שיוך מסמכים{st.count ? <span style={{ color: "var(--gold)" }}> · {st.count.docs}</span> : null}
      </Drawer.Title>
      {st.err === "demo" && <p style={{ color: "var(--ink2)", fontSize: 13 }}>המסך עובד מול הנתונים האמיתיים בלבד — התחבר עם המפתח כדי לשייך.</p>}
      {st.err && st.err !== "demo" && (
        <div style={{ color: "var(--crit)", fontSize: 13 }}>שגיאה: {st.err} <button onClick={load} style={{ ...btnLine, padding: "8px 14px", marginInlineStart: 8 }}>נסה שוב</button></div>
      )}
      {st.loading && <p style={{ color: "var(--mut)", fontSize: 13 }}>טוען את הארגז…</p>}
      {!st.loading && !st.err && !st.folders.length && (
        <p style={{ color: "var(--good)", fontSize: 13.5, fontWeight: 700 }}>✓ הארגז ריק — כל המסמכים משויכים לזירות</p>
      )}
      {!st.loading && !st.err && st.folders.length > 0 && (
        <p style={{ color: "var(--ink2)", fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>
          שיוך תיקייה מסדר את כל המסמכים שבה בבת אחת, ומלמד את המערכת לשייך משם גם בעתיד.
        </p>
      )}
      <AnimatePresence mode="popLayout">
        {st.folders.map((f) => (
          <motion.div layout key={f.folder} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={spring}
            className="glass" style={{ padding: "13px 15px", borderRadius: 16, marginBottom: 9 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, wordBreak: "break-word" }}><bdi>{f.short || f.folder}</bdi></div>
            <div style={{ fontSize: 11, color: "var(--mut)", margin: "4px 0 9px" }}><b className="num">{f.docs}</b> מסמכים{f.sample ? <> · <bdi>{String(f.sample).slice(0, 46)}</bdi></> : null}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {f.suggest_arena_id && (
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => fileTo(f, f.suggest_arena_id!, (f.suggest_arena || "").split(" — ")[0])}
                  style={{ ...btnGold, padding: "9px 14px", fontSize: 12.5, borderRadius: 11 }}>✓ {(f.suggest_arena || "").split(" — ")[0]}</motion.button>
              )}
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setPick(f)} style={{ ...btnLine, padding: "9px 14px", fontSize: 12.5, borderRadius: 11 }}>{f.suggest_arena_id ? "זירה אחרת" : "בחר זירה"}</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => ignore(f)} style={{ ...btnLine, padding: "9px 14px", fontSize: 12.5, borderRadius: 11, color: "var(--crit)", borderColor: "color-mix(in srgb,var(--crit) 35%,transparent)" }}>לא רלוונטי</motion.button>
            </div>
            <AnimatePresence>
              {pick?.folder === f.folder && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
                  <div style={{ marginTop: 10, borderTop: "1px solid var(--hair)", paddingTop: 8, maxHeight: 220, overflowY: "auto" }}>
                    {st.arenas.map(a => (
                      <button key={a.id} onClick={() => fileTo(f, a.id, String(a.name).split(" — ")[0])}
                        style={{ display: "flex", width: "100%", textAlign: "start", padding: "9px 4px", fontSize: 13, fontWeight: 600, color: "var(--ink)", borderBottom: "1px solid var(--hair)", WebkitTapHighlightColor: "transparent" }}>
                        <span style={{ flex: 1 }}>{String(a.name).split(" — ")[0]}</span><span style={{ color: "var(--mut)" }}>‹</span>
                      </button>
                    ))}
                    <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                      <input value={newArena} onChange={e => setNewArena(e.target.value)} placeholder="זירה חדשה…" maxLength={80}
                        onKeyDown={e => e.key === "Enter" && createAndFile(f)}
                        style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--hair)", color: "var(--ink)", borderRadius: 11, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => createAndFile(f)} style={{ ...btnGold, padding: "9px 14px", fontSize: 12.5, borderRadius: 11 }}>צור ושייך</motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </Sheet>
  );
}

/* ── מה לא ברור: שאלות האימות, אותו מנוע (nexus_verify_commit) ── */
export function VerifySheet({ open, onClose, D, onChanged }: { open: boolean; onClose: () => void; D: Snapshot; onChanged: () => void }) {
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [explain, setExplain] = useState<{ id: string; text: string } | null>(null);
  const list = D.verifications.filter(v => !gone.has(v.id));
  const commit = async (id: string, verdict: "confirm" | "dismiss" | "truth", answer?: string) => {
    setGone(s => new Set([...s, id])); setExplain(null);
    if (!getKey()) { toast("מצב הדגמה — הפעולה מדומה"); return; }
    try { await apiPost(API, { action: "verify_commit", id, verdict, answer }); toast.success(verdict === "confirm" ? "אושר ✓" : verdict === "dismiss" ? "סומן לא רלוונטי" : "ההסבר נקלט ✓"); onChanged(); }
    catch { toast("לא נשמר — נסה שוב"); setGone(s => { const n = new Set(s); n.delete(id); return n; }); }
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 10px" }}>❓ מה לא ברור · <span style={{ color: "var(--gold)" }}>{list.length}</span></Drawer.Title>
      {!list.length && <p style={{ color: "var(--good)", fontSize: 13.5, fontWeight: 700 }}>✓ אין שאלות פתוחות — המערכת מבינה את התמונה</p>}
      {list.map(v => (
        <div key={v.id} className="glass" style={{ padding: "13px 15px", borderRadius: 16, marginBottom: 9 }}>
          {v.subject && <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "var(--gold)", marginBottom: 4 }}>{v.subject}</div>}
          <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{v.question}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => commit(v.id, "confirm")} style={{ ...btnGold, padding: "9px 14px", fontSize: 12.5, borderRadius: 11 }}>✓ נכון כמו שכתוב</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setExplain(explain?.id === v.id ? null : { id: v.id, text: "" })} style={{ ...btnLine, padding: "9px 14px", fontSize: 12.5, borderRadius: 11 }}>✏️ אני אסביר</motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => commit(v.id, "dismiss")} style={{ ...btnLine, padding: "9px 14px", fontSize: 12.5, borderRadius: 11, color: "var(--mut)" }}>לא רלוונטי</motion.button>
          </div>
          {explain?.id === v.id && (
            <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
              <input value={explain.text} onChange={e => setExplain({ id: v.id, text: e.target.value })} placeholder="מה נכון באמת…" autoFocus
                onKeyDown={e => e.key === "Enter" && explain.text.trim() && commit(v.id, "truth", explain.text.trim())}
                style={{ flex: 1, background: "var(--surface2)", border: "1px solid var(--hair)", color: "var(--ink)", borderRadius: 11, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => explain.text.trim() && commit(v.id, "truth", explain.text.trim())} style={{ ...btnGold, padding: "9px 14px", fontSize: 12.5, borderRadius: 11 }}>שלח</motion.button>
            </div>
          )}
        </div>
      ))}
    </Sheet>
  );
}

/* ── 📋 דיווחים — מערכת הדיווח הדו-צדדית (/report, מצב בעלים) ── */
type RepData = { pulse: { pending?: number; stuck?: number; silent?: number }; silent: any[]; reports: any[]; team: any[] };
export function ReportsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [st, setSt] = useState<{ loading: boolean; err: string; d: RepData | null }>({ loading: true, err: "", d: null });
  const load = async () => {
    if (!getKey()) { setSt({ loading: false, err: "demo", d: null }); return; }
    setSt(s => ({ ...s, loading: true, err: "" }));
    try {
      const r = await apiGet(REPORT);
      if (r?.mode !== "owner") { setSt({ loading: false, err: "אין נתוני דיווחים", d: null }); return; }
      setSt({ loading: false, err: "", d: { pulse: r.pulse || {}, silent: r.silent || [], reports: r.reports || [], team: r.team || [] } });
    } catch (e: any) { setSt({ loading: false, err: String(e?.message || e), d: null }); }
  };
  useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);
  const d = st.d;
  const fmtAgo = (ts?: string) => { if (!ts) return ""; const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000); return days <= 0 ? "היום" : days === 1 ? "אתמול" : `לפני ${days} ימים`; };
  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 4px" }}>📋 דיווחים</Drawer.Title>
      <p style={{ color: "var(--ink2)", fontSize: 12, margin: "0 0 12px" }}>מערכת הדיווח הדו-צדדית — מה חזר מהצוות, ומי שקט מדי.</p>
      {st.err === "demo" && <p style={{ color: "var(--ink2)", fontSize: 13 }}>זמין במצב מחובר בלבד — התחבר עם המפתח.</p>}
      {st.err && st.err !== "demo" && <div style={{ color: "var(--crit)", fontSize: 13 }}>שגיאה: {st.err} <button onClick={load} style={{ ...btnLine, padding: "8px 14px", marginInlineStart: 8 }}>נסה שוב</button></div>}
      {st.loading && <p style={{ color: "var(--mut)", fontSize: 13 }}>טוען…</p>}
      {d && (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { n: d.pulse.pending || 0, t: "דיווחים אחרונים", c: "var(--gold)" },
            { n: d.pulse.stuck || 0, t: "נתקעו", c: d.pulse.stuck ? "var(--crit)" : "var(--good)" },
            { n: d.pulse.silent || 0, t: "שקטים", c: d.pulse.silent ? "var(--warn)" : "var(--good)" },
          ].map(k => (
            <div key={k.t} className="glass" style={{ padding: "11px 12px 9px", borderRadius: 14, textAlign: "center" }}>
              <div className="num" style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 800, color: k.c }}>{k.n}</div>
              <div style={{ fontSize: 9.5, color: "var(--mut)", fontWeight: 700, marginTop: 3 }}>{k.t}</div>
            </div>
          ))}
        </div>
        {d.silent.length > 0 && (<>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--warn)", margin: "0 0 6px" }}>🔇 נשמע מזמן (מעל 5 ימים)</div>
          {d.silent.slice(0, 8).map((s, i) => (
            <div key={i} style={{ padding: "8px 2px", borderBottom: "1px solid var(--hair)", fontSize: 12.5, lineHeight: 1.45 }}>
              {s.title}<span style={{ color: "var(--mut)" }}>{s.person ? ` — ${s.person}` : ""}{s.last_report_at ? ` · ${fmtAgo(s.last_report_at)}` : ""}</span>
            </div>
          ))}
        </>)}
        {d.reports.length > 0 && (<>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gold)", margin: "14px 0 6px" }}>דיווחים אחרונים</div>
          {d.reports.slice(0, 10).map((rp, i) => (
            <div key={i} style={{ padding: "8px 2px", borderBottom: "1px solid var(--hair)", fontSize: 12.5, lineHeight: 1.5 }}>
              <span className={"chip " + (rp.status === "done" ? "good" : rp.status === "stuck" ? "crit" : "mut")} style={{ marginInlineEnd: 7 }}>{rp.status === "done" ? "בוצע" : rp.status === "stuck" ? "תקוע" : "בתהליך"}</span>
              {rp.title}
              {rp.note && <span style={{ display: "block", color: "var(--mut)", fontSize: 11.5, marginTop: 2 }}>{String(rp.note).slice(0, 110)}</span>}
            </div>
          ))}
        </>)}
        {!d.silent.length && !d.reports.length && <p style={{ color: "var(--good)", fontSize: 13, fontWeight: 700 }}>✓ אין דיווחים פתוחים</p>}
      </>)}
    </Sheet>
  );
}

/* ── α אלפא — המנדטים והפעולות. אישור/עצירה דרך המנוע בלבד ── */
export function AlphaSheet({ open, onClose, D, onChanged }: { open: boolean; onClose: () => void; D: Snapshot; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const A = D.alpha;
  const proposed = A.mandates.filter(m => m.status === "proposed");
  const active = A.mandates.filter(m => m.status === "active");
  const act = async (kind: "alpha_mandate_approve" | "alpha_mandate_stop", id: string) => {
    if (!getKey()) { toast("מצב הדגמה — הפעולה מדומה"); return; }
    setBusy(id);
    try { await apiPost(API, { action: kind, id }); toast.success(kind === "alpha_mandate_approve" ? "המנדט אושר ✓" : "המנדט נעצר"); onChanged(); }
    catch { toast("לא נשמר — נסה שוב"); }
    finally { setBusy(null); }
  };
  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 4px" }}>α אלפא — העוזרת הדיגיטלית</Drawer.Title>
      <p style={{ color: "var(--ink2)", fontSize: 12, margin: "0 0 12px" }}>
        משמרות היום: <b className="num">{A.shiftsToday}</b>/3 · פועלת רק בתוך מנדט שאישרת · תזכורות לצוות יוצאות בשמה, לא בשמך.
      </p>
      {proposed.length > 0 && (<>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--warn)", margin: "0 0 6px" }}>ממתין לאישורך</div>
        {proposed.map(m => (
          <div key={m.id} className="glass" style={{ padding: "12px 14px", borderRadius: 15, marginBottom: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{m.title}</div>
            {m.goal && <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 4, lineHeight: 1.5 }}>{String(m.goal).slice(0, 160)}…</div>}
            <motion.button whileTap={{ scale: 0.95 }} disabled={busy === m.id} onClick={() => act("alpha_mandate_approve", m.id)}
              style={{ ...btnGold, padding: "10px 16px", fontSize: 12.5, borderRadius: 11, marginTop: 9, opacity: busy === m.id ? 0.6 : 1 }}>אשר מנדט ✓</motion.button>
          </div>
        ))}
      </>)}
      <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gold)", margin: "4px 0 6px" }}>מנדטים פעילים · <span className="num">{active.length}</span></div>
      {!active.length && <p style={{ color: "var(--mut)", fontSize: 12.5 }}>אין מנדטים פעילים.</p>}
      {active.map(m => (
        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 2px", borderBottom: "1px solid var(--hair)" }}>
          <span aria-hidden style={{ flex: "none", width: 7, height: 7, borderRadius: "50%", background: "var(--good)" }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>
            {m.title}{m.expires && <span style={{ color: "var(--mut)", fontWeight: 400 }}> · עד {m.expires}</span>}
          </span>
          <button onClick={() => act("alpha_mandate_stop", m.id)} disabled={busy === m.id}
            style={{ ...btnLine, padding: "6px 11px", fontSize: 11, borderRadius: 9, color: "var(--crit)", borderColor: "color-mix(in srgb,var(--crit) 35%,transparent)", opacity: busy === m.id ? 0.6 : 1 }}>עצור</button>
        </div>
      ))}
      {A.actions.length > 0 && (<>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gold)", margin: "14px 0 6px" }}>פעולות אחרונות</div>
        {A.actions.map(a => (
          <div key={a.id} style={{ padding: "7px 2px", borderBottom: "1px solid var(--hair)", fontSize: 12, lineHeight: 1.5, color: "var(--ink2)" }}>
            {a.body}
            <span style={{ color: "var(--mut)", fontSize: 10.5 }}>{a.when ? ` · ${a.when}` : ""}{a.outcome === "delivered" ? " · נמסר" : a.outcome === "failed" ? " · כשל מסירה" : a.outcome === "replied" ? " · נענה" : ""}</span>
          </div>
        ))}
      </>)}
    </Sheet>
  );
}

/* ── תפריט עוד + אנשים + לקחים ── */
export function MoreSheet({ open, onClose, D, go, onLogout }: { open: boolean; onClose: () => void; D: Snapshot; go: (s: SheetId) => void; onLogout: () => void }) {
  const item = (ic: string, label: string, badge: number | null, fn: () => void) => (
    <motion.button whileTap={{ scale: 0.98 }} onClick={fn} className="glass"
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "start", padding: "14px 16px", borderRadius: 15, marginBottom: 8, fontSize: 14, fontWeight: 700, color: "var(--ink)", WebkitTapHighlightColor: "transparent" }}>
      <span style={{ fontSize: 17 }}>{ic}</span><span style={{ flex: 1 }}>{label}</span>
      {badge ? <span className="num" style={{ color: "var(--gold)", fontWeight: 800 }}>{badge}</span> : null}
      <span style={{ color: "var(--mut)" }}>‹</span>
    </motion.button>
  );
  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 12px" }}>עוד</Drawer.Title>
      {item("🗂", "שיוך מסמכים", null, () => go("filing"))}
      {item("📋", "דיווחים מהצוות", null, () => go("reports"))}
      {item("α", "אלפא — מנדטים ופעולות", D.alpha.mandates.filter(m => m.status === "proposed").length || null, () => go("alpha"))}
      {item("❓", "מה לא ברור", D.verifications.length || null, () => go("verify"))}
      {item("👥", "אנשים", D.people.length || null, () => go("people"))}
      {item("🧠", "לקחים", D.lessons.length || null, () => go("lessons"))}
      {item("🕰", "האפליקציה הקודמת", null, () => { window.location.href = "./classic.html"; })}
      {getKey() && item("🚪", "התנתקות", null, onLogout)}
      <div style={{ color: "var(--mut)", fontSize: 10.5, textAlign: "center", marginTop: 8 }}>Nexus HQ{D.now ? ` · ${D.now}` : ""}</div>
    </Sheet>
  );
}

/* ‏אנשים: הרשימה היא שער — לחיצה פותחת את כרטיס האדם (כמו openPerson
   ‏באפליקציה הקודמת): טלפון · אמינות · עבודה איתו · המשימות הפתוחות שלו. */
export function PeopleSheet({ open, onClose, D }: { open: boolean; onClose: () => void; D: Snapshot }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Snapshot["people"][number] | null>(null);
  useEffect(() => { if (open) { setSel(null); setQ(""); } }, [open]);
  const list = D.people.filter(p => !q || p.name.includes(q) || (p.organization || "").includes(q) || (p.role || "").includes(q));

  if (sel) {
    const mine = D.tasks.filter(t => t.owner === sel.name || (sel.name === "איתי רובין" && t.owner === "איתי"));
    return (
      <Sheet open={open} onClose={onClose}>
        <button onClick={() => setSel(null)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--gold)", padding: "2px 0 10px", WebkitTapHighlightColor: "transparent" }}>‹ כל האנשים</button>
        <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 900, margin: "0 0 3px" }}>{sel.name}</Drawer.Title>
        {(sel.role || sel.organization) && <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 10px" }}>{[sel.role, sel.organization].filter(Boolean).join(" · ")}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {sel.phone && <a href={`tel:${sel.phone}`} className="chip mut" style={{ textDecoration: "none", padding: "7px 12px", fontSize: 12 }}>☎ <span className="num">{sel.phone}</span></a>}
          {sel.rel && <span className={"chip " + sel.rel} style={{ padding: "7px 12px", fontSize: 12 }}>{sel.rel === "crit" ? "מורח — נדנוד יזום" : "אמין"}</span>}
          <span className="chip mut" style={{ padding: "7px 12px", fontSize: 12 }}><span className="num">{mine.length}</span> משימות</span>
        </div>
        {sel.reliabilityNotes && (
          <div style={{ background: "color-mix(in srgb,var(--acc) 8%,transparent)", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderRadius: 13, padding: "11px 13px", marginBottom: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", color: "var(--gold)", marginBottom: 4 }}>אמינות</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{sel.reliabilityNotes}</div>
          </div>
        )}
        {sel.workNotes && (
          <div style={{ background: "var(--surface2)", border: "1px solid var(--hair)", borderRadius: 13, padding: "11px 13px", marginBottom: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".12em", color: "var(--mut)", marginBottom: 4 }}>עבודה איתו</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{sel.workNotes}</div>
          </div>
        )}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gold)", margin: "10px 0 6px" }}>משימות פתוחות · <span className="num">{mine.length}</span></div>
        {!mine.length && <p style={{ color: "var(--good)", fontSize: 12.5, fontWeight: 700 }}>✓ אין משימות פתוחות</p>}
        {mine.map(t => (
          <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "8px 2px", borderBottom: "1px solid var(--hair)", fontSize: 12.5 }}>
            <span style={{ flex: 1, fontWeight: 600, lineHeight: 1.4 }}>{t.title}</span>
            {t.waiting?.promised && <span className="num" style={{ flex: "none", fontSize: 10.5, color: t.waiting.broken ? "var(--crit)" : "var(--good)", fontWeight: 700 }}>🤝 {t.waiting.promised}</span>}
            {!t.waiting?.promised && t.due && <span className="num" style={{ flex: "none", fontSize: 10.5, color: t.overdue ? "var(--crit)" : "var(--mut)", fontWeight: 700 }}>{t.due}</span>}
          </div>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 10px" }}>👥 אנשים · <span style={{ color: "var(--gold)" }}>{list.length}</span></Drawer.Title>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש…"
        style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--hair)", color: "var(--ink)", borderRadius: 12, padding: "11px 13px", fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 10 }} />
      {list.map(p => (
        /* ‏div ולא button — בתוך השורה יש עוגן טלפון, ואינטראקטיבי בתוך אינטראקטיבי אסור */
        <div key={p.id} role="button" tabIndex={0} onClick={() => setSel(p)} onKeyDown={e => e.key === "Enter" && setSel(p)}
          style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "start", padding: "10px 2px", borderBottom: "1px solid var(--hair)", color: "var(--ink)", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          <span style={{ flex: "none", width: 32, height: 32, borderRadius: "50%", background: "var(--surface2)", border: "1px solid var(--hair)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800, color: "var(--gold)" }}>{p.name[0]}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
            {(p.role || p.organization) && <span style={{ display: "block", fontSize: 11, color: "var(--mut)" }}>{[p.role, p.organization].filter(Boolean).join(" · ")}</span>}
          </span>
          {p.rel && <span className={"chip " + p.rel}>{p.rel === "crit" ? "מורח" : "אמין"}</span>}
          {p.phone && <a href={`tel:${p.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize: 16, textDecoration: "none" }}>📞</a>}
          <span style={{ color: "var(--mut)" }}>‹</span>
        </div>
      ))}
    </Sheet>
  );
}

export function LessonsSheet({ open, onClose, D }: { open: boolean; onClose: () => void; D: Snapshot }) {
  return (
    <Sheet open={open} onClose={onClose}>
      <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900, margin: "0 0 10px" }}>🧠 לקחים · <span style={{ color: "var(--gold)" }}>{D.lessons.length}</span></Drawer.Title>
      {D.lessons.map((l, i) => (
        <div key={i} style={{ padding: "10px 2px", borderBottom: "1px solid var(--hair)", fontSize: 13, lineHeight: 1.55 }}>
          {l.when && <span className="num" style={{ color: "var(--mut)", fontSize: 11, marginInlineEnd: 8 }}>{l.when}</span>}
          {l.text}
        </div>
      ))}
    </Sheet>
  );
}
