// Service Worker - MiEconomía
// IMPORTANTE: subí el número de versión en cada deploy (v2, v3, v4...).
// Eso es lo que dispara el aviso de "Nueva versión disponible".
const CACHE_NAME = 'mieconomia-v4.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap'
];

// Install: cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log('Cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: limpiar cachés viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch:
//  - Navegación / HTML  → NETWORK-FIRST (siempre busca la versión nueva, cae al caché si no hay internet)
//  - Resto (fuentes, libs, assets) → CACHE-FIRST (rápido y offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const isHTML = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // NETWORK-FIRST: intentar la red, guardar copia fresca, caer al caché si falla
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
        }
        return response;
      }).catch(() => {
        return caches.match('./index.html').then((c) => c || caches.match('./'));
      })
    );
    return;
  }

  // CACHE-FIRST para todo lo demás
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      });
    })
  );
});
