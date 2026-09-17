const CACHE_NAME = 'retovirtual-cache-v1';

// Instalar el Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Activar el Service Worker
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Responder a las peticiones (Requisito obligatorio para PWA)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});