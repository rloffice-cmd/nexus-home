import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toaster, toast } from "sonner";
import Aurora from "./gl/Aurora";
import Dock, { type Tab } from "./ui/Dock";
import Home from "./screens/Home";
import { Decisions, Ask } from "./screens/Simple";
import Tasks from "./screens/Tasks";
import Arenas from "./screens/Arenas";
import Meetings from "./screens/Meetings";
import { AlphaSheet, ConnectSheet, DemoBanner, FilingSheet, LessonsSheet, MoreSheet, PeopleSheet, ReportsSheet, VerifySheet, type SheetId } from "./screens/Extras";
import { setAskPrefill } from "./screens/Simple";
import { loadSnapshot, DEMO, type Snapshot } from "./lib/data";
import { PALS, applyPal, savedPal, type Pal } from "./lib/palettes";
import { API, ACT, apiPost, getKey, dropKey } from "./lib/api";
import { useBackLayer } from "./lib/nav";

/* ‏פעולה עוברת דרך מנוע — לא כתיבה מהממשק. שלוש הפעולות שהמסכים צריכים,
   ‏על אותם קצוות שהאפליקציה הקודמת עבדה מולם. בהדגמה — טוסט בלבד. */
export type Act = (kind: "task_done" | "task_waiting" | "decision_decide", id: string, extra?: { verdict?: "decided" | "dropped"; owner?: string }) => Promise<boolean>;

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [D, setD] = useState<Snapshot>({ ...DEMO, now: "" });
  const [think, setThink] = useState(false);
  const [pal, setPal] = useState<Pal>(savedPal());
  const [sheet, setSheet] = useState<SheetId>(null);
  const [arenaFocus, setArenaFocus] = useState<string | null>(null);
  const [ownerFocus, setOwnerFocus] = useState<string | null>(null);
  useEffect(() => { applyPal(pal); }, [pal]);

  /* ‏"אחורה" של הטלפון: מסך שאינו הבית ⟶ חזרה הביתה · תפריט פתוח ⟶ נסגר.
     ‏מהבית עם כלום פתוח — יציאה רגילה. */
  useBackLayer(tab !== "home", () => setTab("home"));
  useBackLayer(sheet !== null, () => setSheet(null));

  const reload = useCallback(() => { loadSnapshot().then(setD); }, []);
  /* ‏רענון מפורש (כפתור LIVE / התחברות) — עם חיווי חשיבה, לא בשקט */
  const reloadVisible = useCallback(() => { setThink(true); loadSnapshot().then((s) => { setD(s); setThink(false); }); }, []);
  useEffect(() => { reloadVisible(); }, [reloadVisible]);

  const act: Act = useCallback(async (kind, id, extra) => {
    if (!getKey()) { toast("מצב הדגמה — הפעולה מדומה"); return true; }
    try {
      if (kind === "task_done") await apiPost(API, { action: "task_done", id });
      /* ‏ביקורת 3.9: nx-act מקבל body.owner (שם) — המגירה שמכירה את הבעלים שולחת אותו */
      else if (kind === "task_waiting") await apiPost(ACT, { action: "task_waiting", id, ...(extra?.owner ? { owner: extra.owner } : {}) });
      else await apiPost(ACT, { action: "decision_decide", id, verdict: extra?.verdict || "decided" });
      toast.success(kind === "decision_decide" ? (extra?.verdict === "dropped" ? "ירד מהפרק" : "הוכרע ✓") : kind === "task_done" ? "בוצע ✓ — נרשם במערכת" : "⏳ ממתין לתשובה — נרשם במערכת");
      reload();
      return true;
    } catch (e: any) { toast("לא נשמר — " + (e?.message || "נסה שוב")); return false; }
  }, [reload]);

  /* ‏התחברות במגירה אמיתית — window.prompt לא נפתח ב-PWA מותקן (פידבק איתי 28.8) */
  const connected = reloadVisible;
  const logout = () => {
    dropKey();
    try { localStorage.removeItem("nx_c3"); localStorage.removeItem("nx_deep_pending"); } catch { /* private */ }
    window.location.reload();
  };

  const cyclePal = () => {
    const i = PALS.findIndex((p) => p.id === pal);
    const nx = PALS[(i + 1) % PALS.length];
    setPal(nx.id); toast(`פלטה: ${nx.name}`);
  };
  const P = PALS.find((p) => p.id === pal) || PALS[0];

  return (
    <>
      <Aurora key={pal} c1={P.c1} c2={P.c2} />
      <header style={{
        position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 12,
        padding: "calc(env(safe-area-inset-top) + 12px) 18px 12px",
        background: "linear-gradient(180deg,color-mix(in srgb,var(--bg) 82%,transparent),color-mix(in srgb,var(--bg) 40%,transparent) 80%,transparent)",
        backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)",
      }}>
        <b style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900 }}>
          Nexus<i style={{ fontStyle: "normal", background: "linear-gradient(120deg,var(--acc-hi),var(--acc) 50%,var(--acc-lo))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>·</i>
        </b>
        <span className="hdr-sub" style={{ fontSize: 11, color: "var(--mut)", letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flex: "0 1 auto" }}>חדר מצב{D.now ? ` · ${D.now}` : ""}</span>
        <button onClick={() => setSheet("more")} aria-label="עוד"
          style={{ marginInlineStart: "auto", width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--surface2)", border: "1px solid var(--hair)", fontSize: 16, color: "var(--ink)", WebkitTapHighlightColor: "transparent" }}>☰</button>
        <button onClick={cyclePal} aria-label="החלף פלטה"
          style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--surface2)", border: "1px solid var(--hair)", fontSize: 15, WebkitTapHighlightColor: "transparent" }}>🎨</button>
        <button onClick={D.live ? reloadVisible : () => setSheet("connect")} aria-label={D.live ? "רענן" : "התחבר"}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: D.live ? "#8ce4b4" : "var(--gold)", background: D.live ? "rgba(94,196,140,.1)" : "color-mix(in srgb,var(--acc) 10%,transparent)", border: `1px solid ${D.live ? "rgba(94,196,140,.35)" : "color-mix(in srgb,var(--acc) 35%,transparent)"}`, borderRadius: 20, padding: "4px 11px", WebkitTapHighlightColor: "transparent" }}>
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "currentcolor" }} />
          {D.live ? "LIVE" : "התחבר 🔑"}
        </button>
      </header>

      {!D.live && !think && <DemoBanner err={D.err} onConnect={D.err === "net" ? reloadVisible : () => setSheet("connect")} />}

      <AnimatePresence mode="wait">
        <motion.main key={tab}
          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ type: "spring", duration: 0.45, bounce: 0 }}>
          {tab === "home" && <Home D={D} onAsk={() => setTab("ask")} think={think} onAct={act}
            onArena={(name) => { setArenaFocus(name); setTab("arenas"); }}
            onOwner={(name) => { setOwnerFocus(name); setTab("tasks"); }} onChanged={reload} />}
          {tab === "decisions" && <Decisions D={D} onDecide={(id, v) => act("decision_decide", id, { verdict: v })} onChanged={reload} onRetry={reloadVisible}
            onTask={(id) => { setOwnerFocus("task:" + id); setTab("tasks"); }} />}
          {tab === "tasks" && <Tasks D={D} onAct={act} focus={ownerFocus} onFocused={() => setOwnerFocus(null)} onChanged={reload} />}
          {tab === "arenas" && <Arenas D={D} focus={arenaFocus} onFocused={() => setArenaFocus(null)}
            onTasks={(arenaName) => { setOwnerFocus("arena:" + arenaName); setTab("tasks"); }} onChanged={reload} onRetry={reloadVisible}
            onAct={act} onDecisions={() => setTab("decisions")} />}
          {tab === "meetings" && <Meetings D={D} onAsk={(prefill) => { if (prefill) setAskPrefill(prefill); setTab("ask"); }} />}
          {tab === "ask" && <Ask think={think} onThink={setThink} onChanged={reload} />}
        </motion.main>
      </AnimatePresence>

      {/* ‏מעבר מגירה⟵מגירה: הסגירה של הקודמת לא מפילה את החדשה — כל onClose מנקה רק את עצמו */}
      <ConnectSheet open={sheet === "connect"} onClose={() => setSheet(s => s === "connect" ? null : s)} onConnected={connected} />
      <MoreSheet open={sheet === "more"} onClose={() => setSheet(s => s === "more" ? null : s)} D={D} go={setSheet} onLogout={logout} />
      <FilingSheet open={sheet === "filing"} onClose={() => setSheet(s => s === "filing" ? null : s)} />
      <ReportsSheet open={sheet === "reports"} onClose={() => setSheet(s => s === "reports" ? null : s)} />
      <AlphaSheet open={sheet === "alpha"} onClose={() => setSheet(s => s === "alpha" ? null : s)} D={D} onChanged={reload} />
      <VerifySheet open={sheet === "verify"} onClose={() => setSheet(s => s === "verify" ? null : s)} D={D} onChanged={reload} />
      <PeopleSheet open={sheet === "people"} onClose={() => setSheet(s => s === "people" ? null : s)} D={D} onChanged={reload} />
      <LessonsSheet open={sheet === "lessons"} onClose={() => setSheet(s => s === "lessons" ? null : s)} D={D} />

      <Dock tab={tab} onTab={setTab} badge={{ decisions: D.decisions.length, meetings: D.meetings.filter(m => m.dayOffset === 0).length }} />
      <Toaster position="bottom-center" offset={92} mobileOffset={92} theme="dark" toastOptions={{ style: { background: "#1a150c", border: "1px solid color-mix(in srgb,var(--acc) 30%,transparent)", color: "var(--ink)" } }} />
    </>
  );
}
