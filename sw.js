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
  const url = new URL(event.request.url);
  const accept = event.request.headers.get('accept') || '';
  const isHtmlRequest = event.request.mode === 'navigate' || event.request.destination === 'document' || accept.includes('text/html');

  // Only handle navigation/HTML requests in the service worker during development.
  // Let stylesheet, script, image, font and other asset requests go directly to network
  // to avoid the service worker returning malformed fallbacks for binary/text assets.
  if (!isHtmlRequest) {
    return;
  }

  // Skip ServiceWorker interception for external vendor resources (TomTom, etc.)
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' &&
      !url.hostname.endsWith(new URL(self.location).hostname.split('.').pop()) &&
      (url.pathname.includes('/vendor/') || url.pathname.includes('/maps/'))) {
    return;
  }

  const fallback404Response = async () => {
    try {
      const cached404 = await caches.match('/pages/404.html');
      if (cached404) return cached404;
    } catch (e) {
      console.warn('Error checking cache for 404 fallback:', e);
    }

    try {
      const network404 = await fetch('/pages/404.html');
      if (network404.ok) return network404;
    } catch (e) {
      console.warn('Could not fetch 404 page fallback:', e);
    }

    return new Response('<h1>Page not found</h1>', {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  };

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.status === 404 && isHtmlRequest) {
        return fallback404Response();
      }
      return response;
    } catch (err) {
      console.warn('Fetch failed (service worker):', err, event.request.url);
      return fallback404Response();
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
