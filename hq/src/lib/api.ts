/* ‏שכבת הרשת: אותם קצוות של האפליקציה הקיימת, אותו מפתח (nx_k3 באותו
   origin), header בלבד — לעולם לא ?k= (חוק 16). אפס לוגיקה עסקית כאן. */
const REF = "eygeouunxwsrdsijkczh";
const BASE = `https://${REF}.supabase.co/functions/v1`;
export const API = `${BASE}/nexus-app`;
export const ACT = `${BASE}/nx-act`;
export const ASK = `${BASE}/nx-ask`;
export const DEC = `${BASE}/nx-dec`;
export const DASH = `${BASE}/nx-dash`;
export const FILE = `${BASE}/nx-file`;
export const REPORT = `${BASE}/report`;

export const getKey = () => { try { return localStorage.getItem("nx_k3") || ""; } catch { return ""; } };
export const dropKey = () => { try { localStorage.removeItem("nx_k3"); } catch { /* private mode */ } };

export async function apiGet(url: string) {
  const r = await fetch(url, { headers: { "x-nexus-key": getKey() }, cache: "no-store" });
  if (r.status === 403) { dropKey(); throw new Error("forbidden"); }
  if (!r.ok) throw new Error(`http ${r.status}`);
  return r.json();
}

export async function apiPost(url: string, payload: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-nexus-key": getKey() },
    body: JSON.stringify(payload),
  });
  /* ‏P0-1 29.8: גם הסטטוס וגם הגוף — 200 עם {error} או ok:false הוא כשל.
     ‏בלעדיו טוסט "בוצע ✓" יכול לרכוב על תשובה שמודה בכישלון. */
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.error || j?.ok === false) throw new Error(failText(j, r.status));
  return j;
}

/* ‏ביקורת 3.9: command_apply שנכשל חוזר כ-{ok:false, applied, errors:[…]} על
   ‏200 — והמשתמש ראה "http 200", שאינו הודעה. הסיבה מ-errors[0] קודמת;
   ‏הסטטוס הוא המוצא האחרון. */
export function errText(e: unknown): string {
  if (!e) return "";
  if (typeof e === "string") return e;
  const o = e as Record<string, unknown>;
  return String(o.error || o.message || o.reason || JSON.stringify(e));
}
export function failText(j: any, status?: number): string {
  if (j?.error) return errText(j.error);
  if (Array.isArray(j?.errors) && j.errors.length) return errText(j.errors[0]);
  return status ? `http ${status}` : "שגיאה לא ידועה";
}
