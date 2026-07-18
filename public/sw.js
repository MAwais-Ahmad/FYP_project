const CACHE_NAME = 'aita-cache-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/brain.svg',
  '/manifest.json'
];

// 1. Install event: Cache essential shells
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('👷 PWA Service Worker caching precache assets...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('👷 PWA Service Worker clearing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch event: Stale-While-Revalidate for UI, Network-Only for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching completely for backend API calls or external OpenAI calls
  if (url.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return; // Let the browser fetch directly from the network
  }

  // UI assets & fonts: Stale-while-revalidate strategy
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If valid response, clone and cache it dynamically
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Offline fallback
          return cachedResponse;
        });

        // Return cache first, fall back to network/cache update in background
        return cachedResponse || fetchPromise;
      });
    })
  );
});
