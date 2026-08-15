/* ============================================================
   Service Worker — Mayor de Stock
   - index.html / navegación: NETWORK-FIRST (siempre la última
     versión si hay internet; cache solo como respaldo offline).
   - iconos y estáticos: cache-first.
   - API (workers.dev): sin intervención (siempre a la red).
   - pdf.js (CDN): cache-first para importar offline.
   Igual conviene subir este string al cambiar la app, por prolijidad.
   ============================================================ */
const CACHE = "mayor-stock-v27";   // PDF import: freight + MSRP via Gemini

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/";   // pdf.js + jsPDF: cache-first offline

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  let url;
  try { url = new URL(req.url); } catch { return; }

  // API: no la tocamos, va siempre a la red
  if (url.hostname.endsWith("workers.dev")) return;

  // pdf.js (CDN): cache-first, guardando copia para offline
  if (req.url.startsWith(CDN)) {
    e.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  if (req.method !== "GET") return;

  // Navegación / index.html: NETWORK-FIRST
  const isNav = req.mode === "navigate" ||
                url.pathname.endsWith("/") ||
                url.pathname.endsWith("/index.html");
  if (isNav) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html").then(h => h || caches.match("./")))
    );
    return;
  }

  // Resto (iconos, manifest, etc.): cache-first con fallback a red
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
