import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";
import Aurora from "./gl/Aurora";
import Dock, { type Tab } from "./ui/Dock";
import Home from "./screens/Home";
import { Decisions, Tasks, Ask } from "./screens/Simple";
import { loadSnapshot, DEMO, type Snapshot } from "./lib/data";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [D, setD] = useState<Snapshot>({ ...DEMO, now: "" });
  const [think, setThink] = useState(false);
  useEffect(() => { setThink(true); loadSnapshot().then((s) => { setD(s); setThink(false); }); }, []);

  return (
    <>
      <Aurora />
      <header style={{
        position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", gap: 12,
        padding: "calc(env(safe-area-inset-top) + 12px) 18px 12px",
        background: "linear-gradient(180deg,rgba(10,9,8,.82),rgba(10,9,8,.4) 80%,transparent)",
        backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)",
      }}>
        <b style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 900 }}>
          Nexus<i style={{ fontStyle: "normal", background: "linear-gradient(120deg,#f0d9ae,#d9a85c 50%,#8e5a14)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>·</i>
        </b>
        <span style={{ fontSize: 11, color: "var(--mut)", letterSpacing: ".06em" }}>חדר מצב{D.now ? ` · ${D.now}` : ""}</span>
        <span style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: D.live ? "#8ce4b4" : "var(--gold)", background: D.live ? "rgba(94,196,140,.1)" : "rgba(217,168,92,.1)", border: `1px solid ${D.live ? "rgba(94,196,140,.35)" : "rgba(217,168,92,.35)"}`, borderRadius: 20, padding: "4px 11px" }}>
          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "currentcolor" }} />
          {D.live ? "LIVE" : "הדגמה"}
        </span>
      </header>

      <AnimatePresence mode="wait">
        <motion.main key={tab}
          initial={{ opacity: 0, y: 10, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ type: "spring", duration: 0.45, bounce: 0 }}>
          {tab === "home" && <Home D={D} onAsk={() => setTab("ask")} think={think} />}
          {tab === "decisions" && <Decisions D={D} />}
          {tab === "tasks" && <Tasks D={D} />}
          {tab === "ask" && <Ask think={think} onThink={setThink} />}
        </motion.main>
      </AnimatePresence>

      <Dock tab={tab} onTab={setTab} badge={{ decisions: D.decisions.length }} />
      <Toaster position="top-center" theme="dark" toastOptions={{ style: { background: "#1a150c", border: "1px solid rgba(217,168,92,.3)", color: "var(--ink)" } }} />
    </>
  );
}
