/* ═══════════════════════════════════════════════════════════════
   Service Worker — FerreExpress Cotizador
   Estrategia: Cache-First para assets estáticos,
               Network-First para navegación y API.
   Permite usar la app sin conexión con los datos guardados
   en localStorage (cotizaciones, clientes, productos).
═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = "ferreexpress-v1";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/* Assets que se pre-cachean al instalar */
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.json",
];

/* ── Instalar: pre-cachear shell ─────────────────────────── */
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        /* Si algún asset no existe aún (ej. en dev), no bloquear */
      })
    )
  );
});

/* ── Activar: limpiar caches viejos ─────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("ferreexpress-") && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Cache-First para assets, Network-First para nav ─ */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Solo interceptar misma origen */
  if (url.origin !== self.location.origin) return;

  /* Assets estáticos (JS, CSS, imágenes, fuentes) → Cache-First */
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response("", { status: 503 }));
      })
    );
    return;
  }

  /* Navegación (HTML) → Network-First, fallback al shell cacheado */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
  }
});

/* ── Mensajes del cliente ────────────────────────────────── */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
