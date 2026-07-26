import { chromium } from "playwright";
const b = await chromium.launch();
const issues = [];
for (const vp of [{n:"se",w:360,h:640},{n:"14",w:390,h:844},{n:"max",w:430,h:932},{n:"tab",w:768,h:1024}]) {
  const ctx = await b.newContext({viewport:{width:vp.w,height:vp.h},locale:"he-IL"});
  const p = await ctx.newPage();
  await p.goto((process.env.APP_URL || "http://127.0.0.1:8099") + "/index.html",{waitUntil:"domcontentloaded"});
  await p.click("text=צפה בהדגמה"); await p.waitForSelector("nav button");
  for (const tab of ["home","arenas","decisions","assets","ask"]) {
    await p.click(`nav button[data-tab="${tab}"]`); await p.waitForTimeout(150);
    // גלילה עד הסוף: בנקודה הזו שום תוכן לא אמור להישאר מתחת לכפתור
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
      const f=document.querySelector("#fab");
      const tucked=f.classList.contains("tucked");
      const fr=f.getBoundingClientRect(); const hidden=[];
      if(!tucked){
        for(const el of document.querySelectorAll("#main .t,#main .l,#main .m,#main .k,#main .chip,#main .li")){
          const q=el.getBoundingClientRect(); if(q.width<1||q.height<1)continue;
          const ox=Math.min(fr.right,q.right)-Math.max(fr.left,q.left);
          const oy=Math.min(fr.bottom,q.bottom)-Math.max(fr.top,q.top);
          if(ox>10&&oy>10) hidden.push((el.innerText||"").replace(/\s+/g," ").slice(0,20));
        }
      }
      return {tucked,hidden};
    });
    if (!r.tucked && r.hidden.length) issues.push(`[${vp.n}/${tab}] בתחתית הגלילה הכפתור עדיין מסתיר: ${r.hidden.slice(0,2).join(" | ")}`);
  }
  await ctx.close();
}
await b.close();
console.log(issues.length ? issues.map(i=>"  ✗ "+i).join("\n") : "  ✓ בתחתית הגלילה שום תוכן אינו מוסתר בכל ארבעת הגדלים");

if (issues.length) process.exit(1);
