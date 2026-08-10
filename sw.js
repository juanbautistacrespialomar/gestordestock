/* ============================================================
   Service Worker — Mayor de Stock
   CONVENCIÓN: cada vez que tocás index.html, subí este string
   (mayor-stock-v1 -> mayor-stock-v3) y pusheá los dos archivos
   juntos, o el navegador sigue sirviendo la versión cacheada.
   ============================================================ */
const CACHE = "mayor-stock-v3";

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

// pdf.js se sirve desde CDN: se cachea en runtime al primer uso (para import offline)
const CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/";

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
  const url = e.request.url;

  // pdf.js desde CDN: cache-first, y guardo copia para poder importar sin conexión
  if (url.startsWith(CDN)) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        }).catch(() => hit)
      )
    );
    return;
  }

  // Assets propios: cache-first con fallback a red
  if (e.request.method === "GET") {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request))
    );
  }
});
