import { motion } from "motion/react";

export type Tab = "home" | "tasks" | "decisions" | "arenas" | "meetings" | "ask";
const TABS: { id: Tab; ic: string; label: string }[] = [
  { id: "home", ic: "◈", label: "בית" },
  { id: "tasks", ic: "▤", label: "משימות" },
  { id: "decisions", ic: "✦", label: "החלטות" },
  { id: "arenas", ic: "▦", label: "זירות" },
  { id: "meetings", ic: "◔", label: "פגישות" },
  { id: "ask", ic: "α", label: "אלפא" },
];

/* ‏הדוק: זכוכית צפה, והגלולה *נוסעת* בין הטאבים (layoutId — magic move). */
export default function Dock({ tab, onTab, badge }: { tab: Tab; onTab: (t: Tab) => void; badge?: Partial<Record<Tab, number>> }) {
  return (
    <nav style={{
      position: "fixed", insetInline: 12, bottom: "calc(10px + env(safe-area-inset-bottom))", zIndex: 40,
      display: "flex", height: "var(--nav-h)", borderRadius: 28, maxWidth: 636, margin: "0 auto",
      background: "color-mix(in srgb, color-mix(in srgb,var(--acc) 9%,var(--bg)) 86%, transparent)",
      border: "1px solid color-mix(in srgb,var(--acc) 22%,transparent)",
      boxShadow: "0 18px 44px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)",
      backdropFilter: "blur(20px) saturate(1.4)", WebkitBackdropFilter: "blur(20px) saturate(1.4)",
    }}>
      {TABS.map((t) => (
        <button key={t.id} onClick={() => onTab(t.id)} aria-label={t.label}
          style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: tab === t.id ? "var(--gold-hi)" : "var(--mut)", fontSize: 9.5, fontWeight: 700, WebkitTapHighlightColor: "transparent" }}>
          {tab === t.id && (
            <motion.span layoutId="dockpill" transition={{ type: "spring", duration: 0.5, bounce: 0.25 }}
              style={{ position: "absolute", inset: "7px 8px", borderRadius: 20, background: "linear-gradient(150deg,color-mix(in srgb,var(--acc) 22%,transparent),color-mix(in srgb,var(--acc-lo) 14%,transparent))", boxShadow: "inset 0 0 0 1px color-mix(in srgb,var(--acc) 30%,transparent)" }} />
          )}
          <motion.span whileTap={{ scale: 0.82 }} style={{ position: "relative", fontSize: 17, lineHeight: 1 }}>{t.ic}</motion.span>
          <span style={{ position: "relative" }}>{t.label}</span>
          {badge?.[t.id] ? (
            <span className="num" style={{ position: "absolute", top: 6, insetInlineStart: "56%", background: "var(--crit)", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 20, minWidth: 15, height: 15, display: "grid", placeItems: "center", padding: "0 4px" }}>{badge[t.id]}</span>
          ) : null}
        </button>
      ))}
    </nav>
  );
}
