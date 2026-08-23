// Network-first service worker for the Faye Coins PWA.
//
// It caches the app shell only, and only as a fallback for when the network is unavailable.
// It never intercepts the cross-origin API, so data is always fresh, and network-first means
// a new deploy is served as soon as it is reachable (no stale code). skipWaiting + clients.claim
// make a new worker take control on the next load.

const CACHE = 'faye-coins-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop old shell caches from previous deploys.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs (the app shell). Let the cross-origin API and non-GETs
  // go straight to the network.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const isNavigation = request.mode === 'navigate';

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        // Cache a copy of successful shell responses for offline fallback.
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        // Offline: serve the cached request, or fall back to the SPA entry for navigations.
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isNavigation) {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        throw err;
      }
    })(),
  );
});
