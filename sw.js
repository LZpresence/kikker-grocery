// Caches the app shell so the list opens instantly, even with no signal in the store.
// The list itself is kept offline by Firebase (IndexedDB) and syncs when back online.
const CACHE = 'kikker-grocery-v1';
const SHELL = ['./', 'index.html', 'app.js', 'store.js', 'catalog.js', 'firebase-config.js', 'kikker.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const sdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (e.request.method !== 'GET' || (url.origin !== location.origin && !sdk)) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((m) => m || (url.origin === location.origin ? caches.match('index.html') : Response.error()))));
});
