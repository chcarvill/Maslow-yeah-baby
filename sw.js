const CACHE = 'mirror-v1';
const ASSETS = [
  '/Maslow-yeah-baby/',
  '/Maslow-yeah-baby/index.html',
  '/Maslow-yeah-baby/app.js',
  '/Maslow-yeah-baby/style.css',
  '/Maslow-yeah-baby/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
