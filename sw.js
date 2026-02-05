const CACHE_NAME = "tt-v1";
const assets = [
    "./",
    "./index.html",
    "./richard.html",
    "./style.css",
    "./404.html",
    "./script.js",
    "./manifest.json",
    "./icon.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(assets)));
});

self.addEventListener("fetch", (event) => {
    event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});
