// CODE CLEVER - Production Progressive Web App (PWA) Service Worker
const CACHE_NAME = 'code-clever-pwa-v1';

// Static application assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icons/code-clever-192.png',
  '/icons/code-clever-512.png',
  '/icons/code-clever-512-maskable.png',
  '/icons/code-clever-180.png',
  '/assets/logo.jpeg'
];

// 1. Install Event - Cache essential static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical asset cache skip:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event - Clean up stale legacy caches & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Intelligent Caching Strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL RULE: NEVER cache API calls, authenticated data, or private user information
  // Any request to /api/* or non-GET requests are NETWORK ONLY
  if (url.pathname.startsWith('/api') || request.method !== 'GET') {
    return event.respondWith(fetch(request));
  }

  // Chrome extension, analytics, or external schemes - bypass
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Navigation requests (HTML pages): Network-first with Cache fallback to ensure fresh auth state
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Static Assets (Images, Icons, Fonts, JS/CSS bundles): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
