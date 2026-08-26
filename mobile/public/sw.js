// Network-first service worker for the Faye Coins PWA.
//
// It caches the app shell only, and only as a fallback for when the network is unavailable.
// It never intercepts the cross-origin API, so data is always fresh, and network-first means
// a new deploy is served as soon as it is reachable (no stale code). skipWaiting + clients.claim
// make a new worker take control on the next load.

const CACHE = 'faye-coins-shell-v3';

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

// --- Web Push ---

// A push arrived from the backend: show the notification. Payload is JSON { title, body, url }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Faye Coins';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // An app-update push must NOT hard-refresh an open tab (a kid could be mid proof upload);
      // the in-app update banner handles open tabs. Only chore updates auto-refresh so a kid
      // staring at the screen never sees stale chores or balance.
      if (data.type === 'app-update') return;
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        client.postMessage({ type: 'chore-update', url: options.data.url });
      }
    })(),
  );
});

// Tapping the notification focuses an open tab (or opens one) at the target url.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          try {
            await client.navigate(url);
          } catch (e) {
            /* cross-origin or unsupported; just focus */
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
