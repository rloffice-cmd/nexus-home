const CACHE = "nexus-hq-v5";
const FONTS = "nexus-fonts-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);

  // גופנים: קודם מהמטמון. כתובות הגופנים כוללות גרסה ולכן לא מתיישנות,
  // ובלי זה הטיפוגרפיה נעלמת בכל פתיחה בלי רשת.
  if (FONT_HOSTS.includes(u.host)) {
    e.respondWith(
      caches.match(e.request).then((m) => m || fetch(e.request).then((r) => {
        const cp = r.clone();
        caches.open(FONTS).then((c) => c.put(e.request, cp)).catch(() => {});
        return r;
      }).catch(() => m))
    );
    return;
  }

  // ה-API לעולם לא מהמטמון: נתונים עסקיים ישנים גרועים מהודעת שגיאה.
  if (u.origin !== location.origin) return;

  e.respondWith(
    fetch(e.request).then((r) => {
      const cp = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html")))
  );
});
