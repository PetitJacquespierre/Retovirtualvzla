const CACHE_NAME = 'retovirtual-cache-v3';

// Instalar el Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Activar el Service Worker y purgar cachés viejos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => clients.claim())
  );
});

// Responder a las peticiones (Siempre red primero para asegurar frescura)
self.addEventListener('fetch', (e) => {
  // Ignorar peticiones a APIs y métodos no GET
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});