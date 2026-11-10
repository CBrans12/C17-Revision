/* Caches the whole app on first visit so it works with no signal afterwards. */
const VERSION = 'c17rev-v2';
const ASSETS = [
  './', './index.html', './styles.css', './data.js', './extra.js', './cap413.js', './nat007.js', './app.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './icon-maskable.png', './icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(ASSETS.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) {
      // refresh in the background so a redeploy is picked up next launch
      e.waitUntil((async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) (await caches.open(VERSION)).put(req, fresh.clone());
        } catch (err) {}
      })());
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    } catch (err) {
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
      throw err;
    }
  })());
});
