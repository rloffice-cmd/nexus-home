/* ‏שמות פעולות לאדם, ואמת על מה שבוצע (ביקורת 3.9: "הכפתורים לא אומרים
   ‏מה הם עושים, ואין משוב"). nexus-app command_preview מחזיר labels[]
   ‏מיושר ל-ops — הוא המקור; המפה כאן היא גיבוי לגרסה שלא שולחת, והשם
   ‏הגולמי (task.update) הוא המוצא האחרון ולא ברירת המחדל. */
import { errText } from "./api";

export const OP_LABELS: Record<string, string> = {
  "task.update": "עדכון משימה",
  "task.create": "משימה חדשה",
  "person.note": "הערה על אדם",
  "message.relay": "הודעה לאדם",
  "document.file": "תיוק מסמך",
  "reminder.create": "תזכורת",
  "asset.update": "עדכון נכס",
  "decision.decide": "הכרעה",
  "commitment.close": "סגירת התחייבות",
  "keydate.close": "סגירת מועד",
};

export type OpLabel = { title: string; detail?: string };
export function opLabel(o: any, l?: any): OpLabel {
  if (l && typeof l === "object" && l.title) return { title: String(l.title), detail: l.detail ? String(l.detail) : undefined };
  const op = String(o?.op || "");
  const detail = o?.title || o?.note || o?.id;
  return { title: OP_LABELS[op] || op || "פעולה", detail: detail ? String(detail) : undefined };
}

/* ‏תוצאת command_apply: "בוצע" רק כשמשהו באמת בוצע. applied=0 בלי שגיאות
   ‏אינו הצלחה — הוא "לא בוצע דבר", וזה מה שמוצג. */
export function applyText(r: any): { ok: boolean; applied: number; text: string } {
  const applied = Number(r?.applied) || 0;
  const errs: unknown[] = Array.isArray(r?.errors) ? r.errors : [];
  if (applied === 0) {
    const why = errs.length ? errText(errs[0]) : "";
    return { ok: false, applied, text: "לא בוצע דבר" + (why ? ` — ${why}` : "") };
  }
  if (errs.length) return { ok: false, applied, text: `בוצעו ${applied} · ${errs.length} נכשלו` };
  return { ok: true, applied, text: applied === 1 ? "בוצע ✓" : `בוצעו ${applied} ✓` };
}

/* ‏מסלול draft של command_preview: הטיוטה נשמרה ב-drafts. האפליקציה מציגה
   ‏אותה ואינה ממציאה כפתור שליחה — השליחה/העריכה מהבוט (פקודת "טיוטות"). */
export function draftText(d: any): string {
  const head = "✍️ הכנתי טיוטה — היא שמורה; שליחה/עריכה מהבוט (פקודת 'טיוטות')";
  const meta = [d?.to_name ? `אל: ${d.to_name}` : "", d?.subject ? `נושא: ${d.subject}` : ""].filter(Boolean).join(" · ");
  return head + (meta ? `\n${meta}` : "") + "\n\n" + String(d?.body || "");
}
