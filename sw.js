const CACHE_NAME = 'retovirtual-cache-v5';

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

// Responder a las peticiones (Network First con fallback a caché)
self.addEventListener('fetch', (e) => {
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

// Soporte para Notificaciones Push Web
self.addEventListener('push', (e) => {
  let data = {
    title: 'Reto Virtual Venezuela 2026',
    body: '¡Atención corredor! Novedades en la ruta y asignación de dorsales.',
    icon: '/img/favicon.webp',
    badge: '/img/favicon.webp',
    data: { url: '/index.html' }
  };

  if (e.data) {
    try {
      data = Object.assign(data, e.data.json());
    } catch (err) {
      data.body = e.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/img/favicon.webp',
    badge: data.badge || '/img/favicon.webp',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/index.html' },
    actions: [
      { action: 'open_url', title: 'Ver Detalles' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejo del clic en la Notificación Push
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) ? e.notification.data.url : '/index.html';

  if (e.action === 'close') {
    return;
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
