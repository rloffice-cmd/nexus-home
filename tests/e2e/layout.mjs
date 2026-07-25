import { chromium } from "playwright";
const URL = (process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html";
const OUT = process.env.SHOT_DIR || "/tmp/nexus-shots";
const issues = [], notes = [];

// בדיקות פריסה שרצות בתוך הדף עצמו
const AUDIT = () => {
  const out = [];
  const vw = window.innerWidth, vh = window.innerHeight;
  const vis = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0" && r.width > 0 && r.height > 0; };

  // 1. גלילה אופקית — הסימן הכי מובהק לפריסה שבורה בנייד
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.push(`גלילה אופקית: ${de.scrollWidth} > ${de.clientWidth}`);

  // 2. אלמנט שחורג מגבולות המסך
  for (const el of document.querySelectorAll("#main *, header *, nav *")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width > vw + 2) out.push(`רוחב חורג: ${el.className||el.tagName} ${Math.round(r.width)}px > ${vw}`);
    if (r.right > vw + 2) out.push(`גולש ימינה: ${el.className||el.tagName} עד ${Math.round(r.right)}`);
    if (r.left < -2) out.push(`גולש שמאלה: ${el.className||el.tagName} מ-${Math.round(r.left)}`);
  }

  // 3. תוכן שמסתתר מאחורי הניווט הקבוע בתחתית
  const nav = document.querySelector("nav");
  const main = document.querySelector("#main");
  if (nav && main) {
    const navTop = nav.getBoundingClientRect().top;
    const rows = [...main.querySelectorAll(".row, .li, .vt, .btn, .foot")].filter(vis);
    const last = rows[rows.length - 1];
    if (last) {
      // נמדד בקואורדינטות המסמך, בלי להסתמך על גלילה: מדידה מיד אחרי
      // scrollTo תלויה בתזמון ובגובה הגופנים, ולכן הבדיקה נכשלה רק
      // בסביבה שבה הגופנים באמת נטענים.
      const navH = nav.getBoundingClientRect().height;
      const lastBottomDoc = last.getBoundingClientRect().bottom + window.scrollY;
      const clearance = document.documentElement.scrollHeight - lastBottomDoc;
      if (clearance < navH)
        out.push(`מרווח לא מספיק מתחת לתוכן האחרון: ${Math.round(clearance)}px מול ניווט של ${Math.round(navH)}px`);
    }
  }

  // 4. כפתור הלכידה הצף מול הניווט
  const fab = document.querySelector("#fab");
  if (fab && nav && vis(fab)) {
    const f = fab.getBoundingClientRect(), n = nav.getBoundingClientRect();
    if (f.bottom > n.top && f.right > n.left && f.left < n.right) out.push("כפתור הלכידה חופף לסרגל הניווט");
    if (f.right > vw || f.left < 0) out.push("כפתור הלכידה חורג מהמסך");
  }

  // 4ב. הכפתור הצף מעל אלמנט אינטראקטיבי — חוסם פעולה, לא רק מפריע ויזואלית
  if (fab && vis(fab) && !fab.classList.contains("tucked")) {
    const f = fab.getBoundingClientRect();
    for (const el of document.querySelectorAll("#main button, #main [onclick]")) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      // חסימה אמיתית = הכפתור מכסה את הנקודה שאליה מכוונים, או נתח משמעותי
      // מהאלמנט. השקה בפינה אינה חוסמת לחיצה ואינה תקלה.
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      const coversCenter = cx > f.left && cx < f.right && cy > f.top && cy < f.bottom;
      const ox = Math.max(0, Math.min(f.right,r.right)-Math.max(f.left,r.left));
      const oy = Math.max(0, Math.min(f.bottom,r.bottom)-Math.max(f.top,r.top));
      const pct = (ox*oy)/(r.width*r.height);
      if (coversCenter || pct > 0.2)
        out.push(`הכפתור הצף חוסם פעולה: "${(el.innerText||el.className).replace(/\s+/g," ").slice(0,24)}" (${Math.round(pct*100)}%${coversCenter?", כולל המרכז":""})`);
    }
  }

  // 5. יעדי מגע קטנים מדי לאצבע
  for (const el of document.querySelectorAll("button, [onclick], a")) {
    if (!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 30 && r.width < 30) out.push(`יעד מגע קטן: ${(el.innerText||el.className||"").slice(0,22)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }

  // 6. טקסט שנחתך בתוך אלמנט עם הסתרת גלישה
  for (const el of document.querySelectorAll("#main .t, #main .l, #main h2, #main h4, .chip, .vt .k")) {
    if (!vis(el)) continue;
    const s = getComputedStyle(el);
    if (s.overflow === "hidden" && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== "ellipsis")
      out.push(`טקסט נחתך בלי חיווי: "${(el.innerText||"").slice(0,28)}"`);
  }

  // 7. חפיפה בין אחים ברשימות ובאריחים
  const groups = [[...document.querySelectorAll("#main .vitals > .vt")], [...document.querySelectorAll("#main .card > .row")]];
  for (const g of groups) {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const a = g[i].getBoundingClientRect(), b = g[j].getBoundingClientRect();
      const ox = Math.min(a.right,b.right) - Math.max(a.left,b.left);
      const oy = Math.min(a.bottom,b.bottom) - Math.max(a.top,b.top);
      if (ox > 3 && oy > 3) out.push(`חפיפה בין ${g[i].className} ל-${g[j].className}`);
    }
  }
  return out;
};

const browser = await chromium.launch();
const VIEWPORTS = [
  { name: "iphone-se", width: 360, height: 640 },
  { name: "iphone-14", width: 390, height: 844 },
  { name: "iphone-max", width: 430, height: 932 },
  { name: "tablet",    width: 768, height: 1024 },
];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: "he-IL", deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.click("text=צפה בהדגמה");
  await page.waitForSelector("nav button");

  for (const tab of ["home","arenas","decisions","assets","ask"]) {
    await page.click(`nav button[data-tab="${tab}"]`);
    await page.waitForTimeout(180);
    const found = await page.evaluate(AUDIT);
    found.forEach(f => issues.push(`[${vp.name}/${tab}] ${f}`));
    if (vp.name === "iphone-14") await page.screenshot({ path: `${OUT}/${tab}.png`, fullPage: false }).catch(()=>{});
  }

  // גיליונות — השכבה שהכי נוטה לחפוף
  await page.click('nav button[data-tab="home"]');
  await page.waitForTimeout(150);
  const row = await page.$('.row[onclick^="openTask"]');
  if (row) {
    await row.click(); await page.waitForSelector(".sheet.on"); await page.waitForTimeout(250);
    const sheetIssues = await page.evaluate(() => {
      const o = [];
      const sh = document.querySelector("#sheet"), ov = document.querySelector("#ov"), nav = document.querySelector("nav");
      const r = sh.getBoundingClientRect();
      if (r.bottom > window.innerHeight + 2) o.push(`הגיליון גולש מתחת למסך ב-${Math.round(r.bottom-window.innerHeight)}px`);
      if (r.top < 0) o.push(`ראש הגיליון מעל המסך (${Math.round(r.top)})`);
      if (sh.scrollHeight > sh.clientHeight && getComputedStyle(sh).overflowY === "hidden") o.push("תוכן הגיליון ארוך מהמכל ואי אפשר לגלול");
      const zs = +getComputedStyle(sh).zIndex, zo = +getComputedStyle(ov).zIndex, zn = +getComputedStyle(nav).zIndex;
      if (!(zs > zo)) o.push(`הגיליון לא מעל הכהות (${zs} vs ${zo})`);
      if (!(zs > zn)) o.push(`הגיליון לא מעל הניווט (${zs} vs ${zn})`);
      const btns = [...sh.querySelectorAll(".btn")].filter(b => b.getBoundingClientRect().height > 0);
      for (let i=0;i<btns.length;i++) for (let j=i+1;j<btns.length;j++) {
        const a=btns[i].getBoundingClientRect(), b=btns[j].getBoundingClientRect();
        if (Math.min(a.right,b.right)-Math.max(a.left,b.left) > 3 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top) > 3)
          o.push(`כפתורים חופפים בגיליון: "${btns[i].innerText.slice(0,14)}" / "${btns[j].innerText.slice(0,14)}"`);
      }
      return o;
    });
    sheetIssues.forEach(s => issues.push(`[${vp.name}/גיליון-משימה] ${s}`));
    if (vp.name === "iphone-14") await page.screenshot({ path: `${OUT}/sheet-task.png` }).catch(()=>{});
    const gap = await page.evaluate(() => window.innerHeight - document.querySelector("#sheet").getBoundingClientRect().top);
    const strip = await page.evaluate(() => document.querySelector("#sheet").getBoundingClientRect().top);
    if (strip < 70) issues.push(`[${vp.name}] רצועת סגירה מעל הגיליון קטנה מדי: ${Math.round(strip)}px`);
    await page.mouse.click(vp.width/2, 20); await page.waitForTimeout(300);
    const stillOpen = await page.$(".sheet.on");
    if (stillOpen) issues.push(`[${vp.name}] לחיצה על הכהות מעל הגיליון לא סוגרת`);
    // גרירה למטה לסגירה
    if (!stillOpen) {
      const row2 = await page.$('.row[onclick^="openTask"]');
      if (row2) { await row2.click(); await page.waitForSelector(".sheet.on"); await page.waitForTimeout(250);
        const top = await page.evaluate(() => document.querySelector("#sheet").getBoundingClientRect().top);
        await page.touchscreen.tap(vp.width/2, top+14).catch(()=>{});
        await page.evaluate(async (t) => {
          const s=document.querySelector("#sheet");
          const mk=(n,y)=>new TouchEvent(n,{bubbles:true,cancelable:true,touches:n==="touchend"?[]:[new Touch({identifier:1,target:s,clientY:y,clientX:100})]});
          s.dispatchEvent(mk("touchstart",t+10));
          await new Promise(r=>setTimeout(r,30));
          document.dispatchEvent(mk("touchmove",t+180));
          await new Promise(r=>setTimeout(r,30));
          document.dispatchEvent(mk("touchend",t+180));
        }, top);
        await page.waitForTimeout(400);
        const afterSwipe = await page.$(".sheet.on");
        if (afterSwipe) issues.push(`[${vp.name}] גרירה למטה לא סוגרת את הגיליון`);
      }
    }
  }
  notes.push(`${vp.name} (${vp.width}x${vp.height}) נבדק`);
  await ctx.close();
}

await browser.close();
console.log(notes.map(n => "· " + n).join("\n"));
console.log("\n===== ממצאי פריסה =====");
if (!issues.length) console.log("  ✓ אין חפיפות, חריגות, חיתוכים או יעדי מגע קטנים");
else { console.log(issues.map(i => "  ✗ " + i).join("\n")); process.exit(1); }
