import { motion, AnimatePresence } from "motion/react";
import { Drawer } from "vaul";
import { useMemo, useState } from "react";
import type { Snapshot, Arena } from "../lib/data";
import Num from "../ui/Num";

/* ‏זירות + נכסים — מסך אחד, שני מבטים על אותו נדל"ן. הזירה עונה "מה קורה
   שם", הנכס עונה "מה יש לי שם". לחיצה על זירה פותחת את התיק: משימות ·
   החלטות · אירועים אחרונים — הכל מהצילום החי, אפס קריאות נוספות. */

const spring = { type: "spring" as const, duration: 0.55, bounce: 0.14 };
const rise = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...spring, delay: 0.04 * Math.min(i, 8) } });
const ils = (n?: number | null) => n == null ? "" : "₪" + Math.round(n).toLocaleString("en-US");

export default function Arenas({ D }: { D: Snapshot }) {
  const [seg, setSeg] = useState<"arenas" | "assets">("arenas");
  const [open, setOpen] = useState<Arena | null>(null);
  const [af, setAf] = useState<"all" | "rented" | "vacant" | "sale">("all");

  const assets = useMemo(() => {
    let l = D.assets;
    if (af === "rented") l = l.filter(a => a.rented);
    if (af === "vacant") l = l.filter(a => !a.rented);
    if (af === "sale") l = l.filter(a => a.forSale);
    return l;
  }, [D.assets, af]);
  const kpi = {
    total: D.assets.length,
    rented: D.assets.filter(a => a.rented).length,
    sale: D.assets.filter(a => a.forSale).length,
    rent: D.assets.reduce((s, a) => s + (a.rented ? (a.rent || 0) : 0), 0),
  };
  const inArena = (name: string) => ({
    tasks: D.tasks.filter(t => t.arena === name),
    decisions: D.decisions.filter(d => d.arena === name),
    events: D.events.filter(e => e.arena === name).slice(0, 4),
    assets: D.assets.filter(a => a.arena === name).length,
  });

  return (
    <div className="page">
      {/* ‏מתג מבט */}
      <div style={{ display: "flex", gap: 5, background: "var(--surface2)", border: "1px solid var(--hair)", borderRadius: 15, padding: 4, marginTop: 10 }}>
        {([["arenas", `זירות · ${D.arenas.length}`], ["assets", `נכסים · ${D.assets.length}`]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setSeg(id)}
            style={{ flex: 1, position: "relative", padding: "9px 0", borderRadius: 11, fontSize: 12.5, fontWeight: 800, color: seg === id ? "var(--acc-ink)" : "var(--mut)", WebkitTapHighlightColor: "transparent" }}>
            {seg === id && <motion.span layoutId="arenaseg" transition={spring}
              style={{ position: "absolute", inset: 0, borderRadius: 11, background: "linear-gradient(150deg,var(--acc-hi),var(--acc) 58%,var(--acc-lo))" }} />}
            <span style={{ position: "relative" }} className="num">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {seg === "arenas" ? (
          <motion.div key="ar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
            <div className="sec">מצב הזירות — אדום צועק, ירוק זורם</div>
            {D.arenas.map((a, i) => {
              const x = inArena(a.name);
              const stuck = x.tasks.filter(t => t.waiting?.broken || (t.frozen ?? 0) >= 10).length;
              return (
                <motion.button key={a.id} {...rise(i)} whileTap={{ scale: 0.985 }} onClick={() => setOpen(a)} className="glass"
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "start", padding: "14px 16px", borderRadius: 17, marginBottom: 9, WebkitTapHighlightColor: "transparent" }}>
                  <motion.span animate={a.state !== "ok" ? { opacity: [1, .45, 1] } : {}} transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", background: a.state === "crit" ? "var(--crit)" : a.state === "warn" ? "var(--warn)" : "var(--good)", boxShadow: a.state === "crit" ? "0 0 12px var(--crit)" : "none" }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 800 }}>{a.name}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                      <b className="num">{a.open}</b> פתוחות{stuck ? <> · <b className="num" style={{ color: "var(--crit)" }}>{stuck}</b> תקועות</> : null}{x.decisions.length ? <> · <b className="num">{x.decisions.length}</b> להכרעה</> : null}{x.assets ? <> · <b className="num">{x.assets}</b> נכסים</> : null}
                    </span>
                  </span>
                  <span style={{ color: "var(--mut)" }}>‹</span>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="as" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
            {/* ‏KPI — שלושה מספרים, בלי קישוט */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
              {[
                { n: kpi.rented + "/" + kpi.total, t: "מושכרים" },
                { n: ils(kpi.rent), t: "שכ\"ד חודשי" },
                { n: String(kpi.sale), t: "למכירה" },
              ].map(k => (
                <div key={k.t} className="glass" style={{ padding: "13px 14px 11px", borderRadius: 16 }}>
                  <div className="num" style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 800, lineHeight: 1 }}>{k.n}</div>
                  <div style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700, marginTop: 5 }}>{k.t}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "10px 2px 2px", margin: "0 -2px" }}>
              {([["all", "הכל"], ["rented", "מושכרים"], ["vacant", "פנויים"], ["sale", "למכירה"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setAf(id)} className="chip"
                  style={{ flex: "none", padding: "7px 13px", borderRadius: 18, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                    background: af === id ? "color-mix(in srgb,var(--acc) 18%,transparent)" : "var(--surface2)",
                    color: af === id ? "var(--acc-hi)" : "var(--ink2)",
                    border: `1px solid ${af === id ? "color-mix(in srgb,var(--acc) 45%,transparent)" : "var(--hair)"}` }}>{label}</button>
              ))}
            </div>
            <div className="sec" style={{ marginTop: 10 }}>נכסים · <b className="num"><Num value={assets.length} /></b></div>
            {assets.map((a, i) => (
              <motion.div key={a.id} {...rise(i)} className="glass" style={{ padding: "13px 16px 11px", borderRadius: 17, marginBottom: 9 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  {a.code && <span className="num" style={{ fontSize: 11, color: "var(--gold)", fontWeight: 800 }}>{a.code}</span>}
                  <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{a.name}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7, fontSize: 11 }}>
                  <span className={"chip " + (a.rented ? "good" : "mut")}>{a.rented ? `מושכר${a.rent ? " · " + ils(a.rent) : ""}` : "פנוי"}</span>
                  {a.forSale && <span className="chip warn">למכירה{a.price ? " · " + ils(a.price) : ""}</span>}
                  {a.arena && <span style={{ color: "var(--mut)", fontWeight: 600 }}>{a.arena}</span>}
                  {a.area ? <span className="num" style={{ color: "var(--mut)" }}>{Math.round(a.area)} מ"ר</span> : null}
                </div>
              </motion.div>
            ))}
            {!assets.length && <div style={{ color: "var(--mut)", fontSize: 13, textAlign: "center", padding: "24px 0" }}>אין נכסים בסינון הזה</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ‏תיק זירה */}
      <Drawer.Root open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <Drawer.Portal>
          <Drawer.Overlay style={{ position: "fixed", inset: 0, background: "rgba(5,4,2,.6)", zIndex: 50 }} />
          <Drawer.Content style={{ position: "fixed", insetInline: 0, bottom: 0, zIndex: 51, maxHeight: "86dvh", display: "flex", flexDirection: "column", borderRadius: "26px 26px 0 0", background: "color-mix(in srgb,var(--acc) 7%,var(--bg))", border: "1px solid color-mix(in srgb,var(--acc) 25%,transparent)", borderBottom: 0, padding: "0 20px calc(24px + env(safe-area-inset-bottom))", maxWidth: 660, margin: "0 auto", color: "var(--ink)" }}>
            <div aria-hidden style={{ flex: "none", width: 44, height: 5, borderRadius: 5, background: "color-mix(in srgb,var(--acc) 35%,transparent)", margin: "12px auto 14px" }} />
            {open && (() => { const x = inArena(open.name); return (
              <div style={{ overflowY: "auto", minHeight: 0 }}>
                <Drawer.Title style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 900, margin: "0 0 3px" }}>{open.name}</Drawer.Title>
                {open.note && <p style={{ color: "var(--mut)", fontSize: 12.5, margin: "0 0 12px" }}>{open.note}</p>}
                {x.decisions.length > 0 && <>
                  <div className="sec" style={{ marginTop: 8 }}>להכרעה · <b className="num">{x.decisions.length}</b></div>
                  {x.decisions.map(d => <div key={d.id} style={{ fontSize: 13, fontWeight: 700, padding: "7px 0", borderBottom: "1px solid var(--hair)" }}>✦ {d.title}</div>)}
                </>}
                <div className="sec" style={{ marginTop: 12 }}>משימות · <b className="num">{x.tasks.length}</b></div>
                {x.tasks.slice(0, 12).map(t => (
                  <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid var(--hair)", fontSize: 13 }}>
                    <span style={{ flex: 1, fontWeight: 600, lineHeight: 1.35 }}>{t.title}</span>
                    <span style={{ flex: "none", fontSize: 10.5, color: t.waiting?.broken || (t.frozen ?? 0) >= 10 ? "var(--crit)" : "var(--mut)", fontWeight: 700 }}>{t.owner}</span>
                  </div>
                ))}
                {x.tasks.length === 0 && <div style={{ color: "var(--mut)", fontSize: 12.5, padding: "6px 0" }}>אין משימות פתוחות</div>}
                {x.events.length > 0 && <>
                  <div className="sec" style={{ marginTop: 12 }}>קרה לאחרונה</div>
                  {x.events.map((e, i) => <div key={i} style={{ fontSize: 12, color: "var(--ink2)", padding: "6px 0", lineHeight: 1.45 }}><span className="num" style={{ color: "var(--mut)" }}>{e.when}</span> · {e.text}</div>)}
                </>}
              </div>
            ); })()}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
