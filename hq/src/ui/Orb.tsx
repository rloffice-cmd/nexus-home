import { motion } from "motion/react";

/* ‏האורב — הנוכחות של המוח. שלוש שכבות: ליבה conic מסתובבת, עדשת specular,
   ‏והילת זוהר נושמת. think=true ⟶ הליבה מאיצה. */
export default function Orb({ size = 52, think = false }: { size?: number; think?: boolean }) {
  return (
    <motion.span
      aria-hidden
      style={{ position: "relative", width: size, height: size, borderRadius: "50%", display: "inline-block", flex: "none" }}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <motion.span
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg,var(--acc-hi),var(--acc) 30%,var(--acc-lo) 55%,var(--acc-hi) 78%,var(--acc-hi))",
          boxShadow: "0 0 34px color-mix(in srgb,var(--acc) 50%,transparent), inset 0 0 16px rgba(255,255,255,.4)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: think ? 1.6 : 14, repeat: Infinity, ease: "linear" }}
      />
      <span style={{ position: "absolute", inset: "14%", borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,.75), rgba(255,255,255,0) 42%)", mixBlendMode: "screen" }} />
      <span style={{ position: "absolute", inset: "18%", borderRadius: "50%", background: "var(--bg)", opacity: .3, filter: "blur(3px)" }} />
    </motion.span>
  );
}
