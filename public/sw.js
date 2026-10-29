/* Service worker de LANA: permite usar la app sin conexion (PWA). */
const CACHE = 'lana-v2';
const ASSETS = ['/', '/index.html', '/favicon.ico', '/manifest.webmanifest', '/icon.svg', '/datos-demo.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(ASSETS).catch(() => {
        /* Si algun asset falta, no bloquea la instalacion. */
      }),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // No cachear el backend de mercado ni nada externo: solo el mismo origen.
  if (url.origin !== self.location.origin) return;

  // Navegacion (SPA): network-first, fallback a cache (offline).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Assets (js, css, etc.): network-first. Cache solo como respaldo offline.
  // Nunca devolver index.html para un asset que fallo: eso rompe los modulos.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
