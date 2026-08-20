/* ============================================================
   Service Worker — Mayor de Stock
   - index.html / navegación: NETWORK-FIRST (siempre la última
     versión si hay internet; cache solo como respaldo offline).
   - iconos y estáticos: cache-first.
   - API (workers.dev): sin intervención (siempre a la red).
   - pdf.js (CDN): cache-first para importar offline.

   ACTUALIZACIÓN CONTROLADA (v39+):
   Ya NO auto-activamos la versión nueva con skipWaiting en install.
   Cuando hay una versión nueva, el SW queda "waiting" y la app muestra
   un botón "Update". Recién cuando el usuario lo toca, la app le manda
   el mensaje {type:"SKIP_WAITING"} y ahí sí se activa y recarga. Así
   nadie pierde una carga a medias por un refresh sorpresa.
   ============================================================ */
const CACHE = "mayor-stock-v43";   // v43: fix orden asc/desc en todas las pestañas (wireClientes pisaba los headers) + barra de filtros de Compras/Ventas en una sola linea

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
  // Precargamos el cache nuevo, pero NO llamamos skipWaiting: quedamos "waiting"
  // hasta que el usuario apriete "Update" en la app.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// La app pide activarse cuando el usuario toca "Update".
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
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
