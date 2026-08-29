import { useEffect, useRef } from "react";

/* ‏כפתור "אחורה" של הטלפון (בקשת איתי 29.8: "מעיף אותי מהאפליקציה").
   ‏כל שכבה פתוחה — מגירה · תפריט · מסך שאינו הבית — נרשמת כרשומת
   ‏היסטוריה. popstate סוגר את השכבה העליונה במקום לצאת; סגירה מתוך
   ‏הממשק צורכת את הרשומה בשקט (history.back מדוכא) כדי שהשתיים לא
   ‏יתנגשו. כשאין שכבות — "אחורה" מתנהג רגיל ויוצא, כמו שאפליקציה
   ‏אמורה להתנהג מהבית. */

type Layer = { id: number; close: () => void };
let layers: Layer[] = [];
let nextId = 1;
let suppress = 0;

function onPop() {
  if (suppress > 0) { suppress--; return; }
  const l = layers.pop();
  if (l) l.close();
  /* ‏אין שכבות ⟶ לא מתערבים: הדפדפן יוצא כרגיל */
}
if (typeof window !== "undefined") window.addEventListener("popstate", onPop);

function openLayer(close: () => void): number {
  const id = nextId++;
  layers.push({ id, close });
  try { history.pushState({ nxl: id }, ""); } catch { /* private mode */ }
  return id;
}
function closeLayer(id: number) {
  const i = layers.findIndex((l) => l.id === id);
  if (i < 0) return;
  layers.splice(i, 1);
  suppress++;
  try { history.back(); } catch { suppress--; }
}

/* ‏open=true רושם שכבה; "אחורה" מפעיל את onBack; סגירה מהממשק מנקה בשקט */
export function useBackLayer(open: boolean, onBack: () => void) {
  const cb = useRef(onBack); cb.current = onBack;
  const idRef = useRef<number | null>(null);
  useEffect(() => {
    if (open && idRef.current == null) {
      idRef.current = openLayer(() => { idRef.current = null; cb.current(); });
    } else if (!open && idRef.current != null) {
      const id = idRef.current; idRef.current = null; closeLayer(id);
    }
  }, [open]);
  useEffect(() => () => {
    if (idRef.current != null) { const id = idRef.current; idRef.current = null; closeLayer(id); }
  }, []);
}
