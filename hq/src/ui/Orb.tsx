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
          background: "conic-gradient(from 0deg,#f0d9ae,#d9a85c 30%,#8e5a14 55%,#e0b57e 78%,#f0d9ae)",
          boxShadow: "0 0 34px rgba(217,168,92,.5), inset 0 0 16px rgba(255,255,255,.4)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: think ? 1.6 : 14, repeat: Infinity, ease: "linear" }}
      />
      <span style={{ position: "absolute", inset: "14%", borderRadius: "50%", background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,.75), rgba(255,255,255,0) 42%)", mixBlendMode: "screen" }} />
      <span style={{ position: "absolute", inset: "18%", borderRadius: "50%", background: "#0a0908", opacity: .26, filter: "blur(3px)" }} />
    </motion.span>
  );
}
