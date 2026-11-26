const CACHE_NAME = 'retovirtual-cache-v25';

// Recursos estáticos clave para precachear inmediatamente
const STATIC_PRECACHE = [
  '/',
  '/index.html',
  '/css/wow-effects.css',
  '/js/wow-effects.js',
  '/img/favicon.webp',
  '/img/RV-Isotipo-sinfondo.webp'
];

// Instalar el Service Worker y precachear recursos base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch(() => {});
    }).then(() => self.skipWaiting())
  );
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

// Responder a las peticiones (Stale-While-Revalidate para CDNs/Assets y Network First para navegación)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }

  const url = new URL(e.request.url);

  // CDNs estáticos (Tailwind, Fonts, FontAwesome, jsdelivr) y assets locales (.css, .js, .webp, .png, .jpg)
  const isStaticAsset = url.hostname.includes('cdn.tailwindcss.com') ||
                        url.hostname.includes('fonts.googleapis.com') ||
                        url.hostname.includes('fonts.gstatic.com') ||
                        url.hostname.includes('cdnjs.cloudflare.com') ||
                        url.hostname.includes('cdn.jsdelivr.net') ||
                        url.pathname.match(/\.(css|js|webp|png|jpg|jpeg|svg|woff2|ico)$/i);

  if (isStaticAsset) {
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Network First con persistencia en caché para páginas HTML
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
        }
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
