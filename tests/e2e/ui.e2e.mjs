// ‏סוללת ה-e2e של Nexus HQ (25.8) — 32 בדיקות על מצב הדגמה: שער · עדשות ·
// טאבים · גלולת ניווט · מתג תאורה · לכידה · זרימת החלטה · נכסים · אלפא ·
// דסקטופ · reduced-motion · אפס שגיאות קונסול. דורשת דפדפן מקומי:
//   python3 -m http.server 8123   (מתיקיית הריפו)
//   SCRATCH=/tmp node tests/e2e/ui.e2e.mjs
// ‏נתיב ה-playwright מוחלף לפי הסביבה; ב-CI אין דפדפן — הסוללה ידנית/סוכן.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch();
const results = [];
const t = (name, ok, info='') => results.push({name, ok: !!ok, info: String(info).slice(0,90)});

async function newPage(vp, opts={}) {
  const pg = await b.newPage({ viewport: vp, colorScheme: opts.dark?'dark':'light', reducedMotion: opts.rm?'reduce':'no-preference' });
  pg._errs = [];
  pg.on('pageerror', e => pg._errs.push(String(e)));
  pg.on('console', m => { if (m.type()==='error' && !/net::|Failed to load resource/.test(m.text())) pg._errs.push(m.text()); });
  await pg.goto('http://localhost:8123/index.html', { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(900);
  return pg;
}
async function enterDemo(pg) {
  const demo = pg.locator('text=צפה בהדגמה');
  if (await demo.count()) { await demo.click(); await pg.waitForTimeout(900); }
}
const M = {width:390,height:844}, DT = {width:1440,height:900};

// ── 1. שער + כניסה להדגמה ──
let pg = await newPage(M);
t('gate: מוצג עם לוגו וכפתור הדגמה', await pg.locator('.gate').count() && await pg.locator('text=צפה בהדגמה').count());
await enterDemo(pg);
t('demo: הבית נטען', await pg.locator('.hero, .vitals, .sec').first().count());
t('demo: תג הדגמה דולק', await pg.evaluate(() => document.getElementById('demoDot')?.style.display !== 'none'));

// ── 2. חמש עדשות הבית ──
for (const v of ['all','focus','ops','fin','move']) {
  await pg.evaluate(v => setHomeView(v), v).catch(()=>{});
  await pg.waitForTimeout(350);
  const has = await pg.evaluate(() => document.querySelector('#main').children.length > 0);
  t(`lens ${v}: תוכן מוצג`, has);
}
await pg.evaluate(() => setHomeView('all')); await pg.waitForTimeout(300);

// ── 3. כל הטאבים ──
for (const tab of ['meetings','arenas','decisions','assets','ask','home']) {
  await pg.evaluate(t => go(t), tab);
  await pg.waitForTimeout(350);
  const has = await pg.evaluate(() => document.querySelector('#main').children.length > 0 || document.querySelector('#main').innerHTML.length > 50);
  t(`tab ${tab}: מוצג`, has);
}

// ── 4. גלולת הניווט על הטאב הפעיל ──
const pillBg = await pg.evaluate(() => {
  const p = document.querySelector('nav button.on .pill');
  return p ? getComputedStyle(p).backgroundColor : 'missing';
});
t('nav: גלולה מאחורי הטאב הפעיל', pillBg !== 'missing' && pillBg !== 'rgba(0, 0, 0, 0)', pillBg);

// ── 5. מתג התאורה בכותרת ──
const th0 = await pg.evaluate(() => document.documentElement.getAttribute('data-theme'));
await pg.click('#themeBtn'); await pg.waitForTimeout(250);
const th1 = await pg.evaluate(() => document.documentElement.getAttribute('data-theme'));
t('theme: המתג מחליף ערכה', th0 !== th1, `${th0}→${th1}`);
await pg.click('#themeBtn'); await pg.waitForTimeout(250);

// ── 6. FAB ⟶ גיליון לכידה ⟶ סגירה ──
await pg.click('#fab'); await pg.waitForTimeout(500);
t('capture: הגיליון נפתח', await pg.evaluate(() => document.querySelector('.sheet').classList.contains('on')));
await pg.evaluate(() => closeSheet()); await pg.waitForTimeout(400);
t('capture: הגיליון נסגר', await pg.evaluate(() => !document.querySelector('.sheet').classList.contains('on')));

// ── 7. זרימת החלטה בהדגמה ──
await pg.evaluate(() => go('home')); await pg.waitForTimeout(300);
await pg.evaluate(() => openDecision('d1')); await pg.waitForTimeout(500);
t('decision: גיליון עם המלצה על במה', await pg.locator('.sheet.on .blk.rec').count());
await pg.evaluate(() => decide('d1','decided',1)); await pg.waitForTimeout(500);
t('decision: טוסט אישור', await pg.evaluate(() => document.querySelector('#toast')?.classList.contains('on') || document.querySelector('#toast .m')?.textContent.length > 0));
t('decision: ירדה מהממתינות', await pg.evaluate(() => !(D.decisions.find(x=>x.id==='d1').status==='pending')));

// ── 8. נכסים: חיפוש · סינון · פתיחת תיק ──
await pg.evaluate(() => go('assets')); await pg.waitForTimeout(400);
await pg.evaluate(() => assetSearch('מרכז')); await pg.waitForTimeout(250);
const found = await pg.evaluate(() => document.querySelectorAll('#assetList .asset').length);
t('assets: חיפוש מסנן', found >= 1 && found < 9, `נמצאו ${found}`);
await pg.evaluate(() => assetSearch('')); await pg.waitForTimeout(250);
await pg.evaluate(() => toggleAsset('s1')); await pg.waitForTimeout(350);
t('assets: תיק נפתח', await pg.evaluate(() => document.getElementById('as_s1')?.classList.contains('open')));
await pg.evaluate(() => setAssetF('sale')); await pg.waitForTimeout(250);
t('assets: סינון למכירה', await pg.evaluate(() => document.querySelectorAll('#assetList .asset').length === 3));
await pg.evaluate(() => setAssetF('all'));

// ── 9. אלפא (הדגמה) ──
await pg.evaluate(() => go('ask')); await pg.waitForTimeout(400);
t('ask: פיד עם פתיח והצעות', await pg.locator('.ask-feed .a-bub').count() && await pg.locator('.ak-sug .c').first().count());

t('mobile: אפס שגיאות דף', pg._errs.length===0, pg._errs[0]||'');
await pg.close();

// ── 10. דסקטופ ──
pg = await newPage(DT, {dark:true});
await enterDemo(pg);
const railW = await pg.evaluate(() => getComputedStyle(document.querySelector('nav')).width);
t('desktop: סרגל צד', parseInt(railW) > 200, railW);
t('desktop: רשת הבית', await pg.evaluate(() => !!document.querySelector('.hgrid')));
await pg.evaluate(() => openDecision('d2')); await pg.waitForTimeout(500);
const centered = await pg.evaluate(() => { const s=document.querySelector('.sheet.on'); return s && Math.abs(s.getBoundingClientRect().left - (innerWidth - s.getBoundingClientRect().right)) < 250; });
t('desktop: גיליון כחלון ממורכז', centered);
await pg.evaluate(() => closeSheet());
t('desktop: אפס שגיאות', pg._errs.length===0, pg._errs[0]||'');
await pg.close();

// ── 11. reduced-motion + כהה בנייד ──
pg = await newPage(M, {dark:true, rm:true});
await enterDemo(pg);
await pg.evaluate(() => go('decisions')); await pg.waitForTimeout(250);
await pg.evaluate(() => go('home')); await pg.waitForTimeout(250);
const bgDark = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor);
t('dark: הבמה החדשה', bgDark === 'rgb(16, 14, 9)', bgDark);
t('reduced-motion: אפס שגיאות', pg._errs.length===0, pg._errs[0]||'');
await pg.close();

await b.close();
const fails = results.filter(r=>!r.ok);
for (const r of results) console.log((r.ok?'✓':'✗')+' '+r.name+(r.info&&!r.ok?` [${r.info}]`:''));
console.log(`\n${results.length-fails.length}/${results.length} עברו`);
process.exit(fails.length ? 1 : 0);
