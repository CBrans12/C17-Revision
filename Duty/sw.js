/* Caches the app so it runs with no signal, plus any map tiles already viewed. */
const VERSION = 'crewduty-v1';
const TILES   = 'crewduty-tiles-v1';
const TILE_CAP = 400;
const ASSETS = ['./','./index.html','./stations.js','./manifest.webmanifest',
                './icon-192.png','./icon-512.png','./icon-maskable.png','./icon-180.png'];

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
    await Promise.all(keys.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* keep the tile cache from growing without bound */
async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  if (keys.length > TILE_CAP) {
    await Promise.all(keys.slice(0, keys.length - TILE_CAP).map(k => c.delete(k)));
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* map tiles: serve from cache when offline, store what we fetch */
  if (/basemaps\.cartocdn\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) { const c = await caches.open(TILES); await c.put(req, res.clone()); trimTiles(); }
        return res;
      } catch (err) {
        return new Response('', { status: 504 });   /* the page drops the image and shows the plot */
      }
    })());
    return;
  }

  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) {
      e.waitUntil((async () => {
        try { const f = await fetch(req); if (f && f.ok) (await caches.open(VERSION)).put(req, f.clone()); }
        catch (err) {}
      })());
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    } catch (err) {
      const fb = await caches.match('./index.html');
      if (fb) return fb;
      throw err;
    }
  })());
});
