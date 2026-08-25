import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";
import Aurora from "./gl/Aurora";
import Dock, { type Tab } from "./ui/Dock";
import Home from "./screens/Home";
import { Decisions, Tasks, Ask } from "./screens/Simple";
import { loadSnapshot, DEMO, type Snapshot } from "./lib/data";
import { PALS, applyPal, savedPal, type Pal } from "./lib/palettes";
import { toast } from "sonner";

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [D, setD] = useState<Snapshot>({ ...DEMO, now: "" });
  const [think, setThink] = useState(false);
  const [pal, setPal] = useState<Pal>(savedPal());
  useEffect(() => { applyPal(pal); }, [pal]);
  useEffect(() => { setThink(true); loadSnapshot().then((s) => { setD(s); setThink(false); }); }, []);
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
        <span style={{ fontSize: 11, color: "var(--mut)", letterSpacing: ".06em" }}>חדר מצב{D.now ? ` · ${D.now}` : ""}</span>
        <button onClick={cyclePal} aria-label="החלף פלטה"
          style={{ marginInlineStart: "auto", width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--surface2)", border: "1px solid var(--hair)", fontSize: 15, WebkitTapHighlightColor: "transparent" }}>🎨</button>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: ".1em", color: D.live ? "#8ce4b4" : "var(--gold)", background: D.live ? "rgba(94,196,140,.1)" : "color-mix(in srgb,var(--acc) 10%,transparent)", border: `1px solid ${D.live ? "rgba(94,196,140,.35)" : "color-mix(in srgb,var(--acc) 35%,transparent)"}`, borderRadius: 20, padding: "4px 11px" }}>
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
      <Toaster position="bottom-center" offset={92} mobileOffset={92} theme="dark" toastOptions={{ style: { background: "#1a150c", border: "1px solid color-mix(in srgb,var(--acc) 30%,transparent)", color: "var(--ink)" } }} />
    </>
  );
}
