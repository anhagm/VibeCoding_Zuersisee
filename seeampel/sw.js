// Service Worker. Nach jeder Änderung an App-Dateien VERSION erhöhen,
// sonst sehen installierte Apps die alte Version.
const VERSION = 'seeampel-v6';
const DATEN = 'seeampel-daten';

const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/css/animation.css",
  "/css/base.css",
  "/css/components.css",
  "/css/layout.css",
  "/css/tokens.css",
  "/fonts/fraunces.woff2",
  "/fonts/manrope.woff2",
  "/js/app.js",
  "/js/config.js",
  "/js/data/forecast.js",
  "/js/data/measurement.js",
  "/js/data/scenarios.js",
  "/js/logic/best-window.js",
  "/js/logic/compare.js",
  "/js/logic/diary-validation.js",
  "/js/logic/rating.js",
  "/js/logic/scene.js",
  "/js/logic/sea-color.js",
  "/js/logic/tips.js",
  "/js/storage/diary-db.js",
  "/js/storage/export-import.js",
  "/js/storage/profile.js",
  "/js/ui/background.js",
  "/js/ui/calendar.js",
  "/js/ui/diary-view.js",
  "/js/ui/fisch.js",
  "/js/ui/home-view.js",
  "/js/ui/intro.js",
  "/js/ui/loader.js",
  "/js/ui/modal.js",
  "/js/ui/profile-view.js",
  "/js/ui/rating-card.js",
  "/js/ui/stats-chart.js",
  "/js/ui/time-wheel.js",
  "/js/util/dom.js",
  "/js/util/format.js",
  "/js/util/zeit.js",
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== DATEN).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Daten: zuerst Netz, offline die letzte Antwort. Die App zeigt dann "veraltet".
async function netzZuerst(req) {
  const cache = await caches.open(DATEN);
  try {
    const antwort = await fetch(req);
    if (antwort.ok) cache.put(req, antwort.clone());
    return antwort;
  } catch (err) {
    const alt = await cache.match(req, { ignoreSearch: false });
    if (alt) return alt;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (url.hostname === 'api.open-meteo.com' || (url.origin === location.origin && url.pathname === '/api/messung' && !url.searchParams.has('zeit'))) {
    e.respondWith(netzZuerst(e.request));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((treffer) => treffer || fetch(e.request)),
    );
  }
});
