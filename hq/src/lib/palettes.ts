/* ‏שלוש הפלטות — שם עברי, ערכי האורורה (RGB 0..1), וצבע ה-theme-color. */
export type Pal = "obsidian" | "migdalor" | "ice";
export const PALS: { id: Pal; name: string; bg: string; c1: number[]; c2: number[] }[] = [
  { id: "obsidian", name: "אובסידיאן", bg: "#0a0908", c1: [0.85, 0.66, 0.36], c2: [0.56, 0.35, 0.08] },
  { id: "migdalor", name: "מגדלור", bg: "#0b1020", c1: [1.0, 0.71, 0.33], c2: [0.33, 0.55, 0.95] },
  { id: "ice", name: "קרח", bg: "#0b0d11", c1: [0.44, 0.76, 0.91], c2: [0.35, 0.42, 0.72] },
];
export function applyPal(id: Pal) {
  const p = PALS.find((x) => x.id === id) || PALS[0];
  if (p.id === "obsidian") document.documentElement.removeAttribute("data-pal");
  else document.documentElement.setAttribute("data-pal", p.id);
  document.querySelector('meta[name=theme-color]')?.setAttribute("content", p.bg);
  try { localStorage.setItem("nx_pal", p.id); } catch {}
  return p;
}
export function savedPal(): Pal {
  const v = (() => { try { return localStorage.getItem("nx_pal"); } catch { return null; } })();
  return (PALS.some((p) => p.id === v) ? v : "obsidian") as Pal;
}
