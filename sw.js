// Service Worker for Yola AI Info Hub PWA
const CACHE_NAME = 'yola-ai-hub-v2';
const RUNTIME_CACHE = 'yola-runtime-v2';
const ASSETS_TO_CACHE = [
  // Disabled caching - empty array for development
];

// Install event - cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching essential assets');
        return cache.addAll(ASSETS_TO_CACHE.filter(url => !url.includes('https://')))
          .catch(err => console.warn('Some assets could not be cached:', err));
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - network first, then cache
self.addEventListener('fetch', event => {
  // Development mode: attempt network fetch, but never let respondWith reject.
  // If network fails, return cached response (if any) or a 503 fallback.
  event.respondWith((async () => {
    try {
      return await fetch(event.request);
    } catch (err) {
      console.warn('Fetch failed (service worker):', err, event.request.url);
      // If navigation request (HTML), try cached index.html fallback first
      try {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      } catch (e) {
        console.warn('Error checking cache for HTML fallback:', e);
      }

      // Try to serve from cache for other requests (fonts, scripts, images)
      try {
        const cached = await caches.match(event.request);
        if (cached) return cached;
      } catch (e) {
        console.warn('Error checking cache for request fallback:', e);
      }

      // Final fallback: return a generic 503 response so respondWith never rejects
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Yola AI Info Hub',
    icon: '/Data/Images/jippujam.jpg',
    badge: '/Data/Images/jippujam.jpg',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Yola AI Info Hub', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if app is already open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification.tag);
});
