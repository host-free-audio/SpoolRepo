// Minimal service worker: makes the app installable and lets the app shell
// (HTML/CSS/JS) load offline. Shell files are fetched network-first so
// updates show up immediately; the cache is only a fallback when offline.
// Songs and songs/manifest.json are NEVER touched — they go straight to
// the network so the library is always current.

const CACHE_NAME = 'spool-shell-v3';
const SHELL_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];
const SHELL_URLS = SHELL_FILES.map((f) => new URL(f, self.registration.scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const urlNoQuery = req.url.split('?')[0];
  if (!SHELL_URLS.includes(urlNoQuery)) return; // songs, manifest.json, fonts: straight to network

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
