const CACHE_NAME = 'tt-v100'; // Jump to a high version number
const assets = [
  './index.html',
  './richard.html',
  './404.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.png'
];

// Force the new Service Worker to take over immediately
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});