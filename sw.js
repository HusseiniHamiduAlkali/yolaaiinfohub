// Service Worker for Yola AI Info Hub PWA
const CACHE_NAME = 'yola-ai-hub-v1';
const RUNTIME_CACHE = 'yola-runtime-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/styles/global.css',
  '/styles/navbar.css',
  '/styles/home.css',
  '/styles/dark-mode.css',
  '/styles/settings.css',
  '/styles/eduinfo.css',
  '/styles/agroinfo.css',
  '/styles/mediinfo.css',
  '/styles/naviinfo.css',
  '/styles/ecoinfo.css',
  '/styles/serviinfo.css',
  '/styles/communityinfo.css',
  '/styles/aboutinfo.css',
  '/styles/auth.css',
  '/styles/ecoAI.css',
  '/styles/tomtom-controls-fallback.css',
  '/components/navbar.js',
  '/components/auth.js',
  '/components/home.js',
  '/components/eduinfo.js',
  '/components/agroinfo.js',
  '/components/mediinfo.js',
  '/components/naviinfo.js',
  '/components/ecoinfo.js',
  '/components/serviinfo.js',
  '/components/communityinfo.js',
  '/components/aboutinfo.js',
  '/components/commonAI.js',
  '/components/chatHandler.js',
  '/Data/General/general.txt'
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
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external CDN resources (let them fail if offline)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only clone if response hasn't been consumed
          if (response.ok && response.status === 200) {
            // Clone before using the response
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => {
                // Put the cloned response in cache asynchronously
                cache.put(request, responseToCache).catch(err => {
                  console.warn('Failed to cache response:', err);
                });
              })
              .catch(err => {
                console.warn('Failed to open cache:', err);
              });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(request)
            .then(cached => cached || new Response('Offline - Resource unavailable', { status: 503 }));
        })
    );
    return;
  }

  // For local resources: cache first, then network
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;
        
        return fetch(request)
          .then(response => {
            // Only cache successful responses
            if (!response || response.status !== 200) {
              return response;
            }

            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(request, responseClone);
              });

            return response;
          })
          .catch(() => {
            // Return offline fallback for HTML pages
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
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
