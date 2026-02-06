const CACHE_NAME = 'tt-v201'; // Incremented version
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './richard.html',
  './game.html',
  './404.html',
  './css/main.css',
  './css/map.css',
  './css/login.css',
  './js/config.js',
  './js/auth.js',
  './js/database.js',
  './manifest.json',
  './icon.png'
  // Note: external CDNs (mapbox, confetti) are usually not cached here 
  // unless you configure runtime caching, but this is enough for install.
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch Event: Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests like Mapbox tiles for simple caching strategies
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});