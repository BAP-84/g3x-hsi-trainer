const CACHE = 'g3x-hsi-trainer-v18';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png'];
self.addEventListener('install', (event) => {
  // cache: 'reload' bypasses the browser HTTP cache so a new version never precaches a stale copy
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const nav = event.request.mode === 'navigate' || (event.request.headers.get('accept') || '').includes('text/html');
  if (nav || url.pathname.endsWith('.webmanifest')) {
    // network-first, bypassing the HTTP cache (GitHub Pages sends max-age=600); offline falls back to the cached copy
    event.respondWith(
      fetch(event.request.url, { cache: 'no-store', credentials: 'same-origin' }).then((resp) => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(event.request, copy.clone());
            if (nav) cache.put('./index.html', copy);
          });
        }
        return resp;
      }).catch(() => caches.match(event.request, { ignoreSearch: true }).then((c) => c || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
