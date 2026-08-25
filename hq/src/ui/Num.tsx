import { useEffect, useRef } from "react";
import { animate, useMotionValue, useTransform, motion } from "motion/react";

/* ‏מספר חי: נספר לערכו בקפיץ. מערכת חיה, לא דוח. */
export default function Num({ value, dur = 0.9 }: { value: number; dur?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  const done = useRef(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || done.current) { mv.set(value); return; }
    done.current = true;
    const c = animate(mv, value, { duration: dur, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value]);
  return <motion.span className="num">{text}</motion.span>;
}
