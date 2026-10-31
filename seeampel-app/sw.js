// Service Worker: macht die App installierbar und offline nutzbar.
// - App-Hülle (HTML, CSS, JS, Icons): aus dem Cache, damit die App sofort startet.
// - Daten (Messung, Prognose): zuerst Netz, bei Fehler die letzte gespeicherte Antwort.
//   Die App erkennt dann am Messzeitpunkt, dass die Daten "veraltet" sind.

const VERSION = "seeampel-v1"            // bei jeder Änderung an der Hülle erhöhen
const HUELLE = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
]

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(HUELLE)))
  self.skipWaiting()
})

self.addEventListener("activate", event => {
  // alte Cache-Versionen löschen
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

const istDaten = url => url.pathname.startsWith("/api/") || url.hostname === "api.open-meteo.com"

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url)
  if (event.request.method !== "GET") return

  if (istDaten(url)) {
    // Netz zuerst, Kopie speichern; offline → letzte Kopie
    event.respondWith(
      fetch(event.request)
        .then(antwort => {
          if (antwort.ok) {
            const kopie = antwort.clone()
            caches.open(VERSION).then(c => c.put(event.request, kopie))
          }
          return antwort
        })
        .catch(() => caches.match(event.request).then(r => r || Response.error()))
    )
    return
  }

  // App-Hülle: Cache zuerst, sonst Netz
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)))
})
