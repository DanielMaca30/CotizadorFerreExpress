/* ═══════════════════════════════════════════════════════════════
   Service Worker — FerreExpress Cotizador
   · Archivos de /assets/ (llevan huella en el nombre y nunca cambian)
     → primero la caché: abren al instante y sirven sin internet.
   · Todo lo demás (la página, el logo, el manifiesto) → primero la red,
     y la caché solo si no hay conexión. Así una actualización llega a
     todos los equipos en la siguiente recarga, sin quedarse pegada.
   · La caché de /assets/ se poda: antes crecía con cada despliegue.
═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = "ferreexpress-v2";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const ASSETS_CACHE  = `${CACHE_VERSION}-assets`;
const MAX_ASSETS    = 80;

const PRECACHE_URLS = ["/", "/index.html", "/manifest.json", "/icon-192.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => { /* sin red al instalar: no bloquear */ })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith("ferreexpress-") && k !== STATIC_CACHE && k !== ASSETS_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const podar = async () => {
  const cache = await caches.open(ASSETS_CACHE);
  const keys = await cache.keys();
  const sobran = keys.length - MAX_ASSETS;
  for (let i = 0; i < sobran; i++) await cache.delete(keys[i]);
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* Archivos con huella → caché primero */
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(ASSETS_CACHE).then((c) => c.put(request, copia)).then(podar);
        }
        return resp;
      }))
    );
    return;
  }

  /* Navegación → red primero; sin red, la última página guardada */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put("/index.html", copia));
          }
          return resp;
        })
        .catch(() => caches.match("/index.html").then((r) => r || new Response("Sin conexión", { status: 503 })))
    );
    return;
  }

  /* Lo demás (logo, íconos) → red primero, caché si no hay conexión */
  event.respondWith(
    fetch(request)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(request).then((r) => r || new Response("", { status: 503 })))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
