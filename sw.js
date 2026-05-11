const CACHE_NAME = 'gibira-cache-v9';

const ASSETS = [
  '/GibiraGroceryList/',
  '/GibiraGroceryList/index.html',
  '/GibiraGroceryList/css/style.css',
  '/GibiraGroceryList/app.js',
  '/GibiraGroceryList/translations.js',
  '/GibiraGroceryList/manifest.json',
  '/GibiraGroceryList/lightbulb.svg',
  '/GibiraGroceryList/lightbulb-off.svg',
  '/GibiraGroceryList/header-logo.png',
  '/GibiraGroceryList/icon-512.png',
  '/GibiraGroceryList/screenshot-mobile.png',
  '/GibiraGroceryList/screenshot-desktop.png',
  '/GibiraGroceryList/css/bootstrap.min.css',
  '/GibiraGroceryList/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
