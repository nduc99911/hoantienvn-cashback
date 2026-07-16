/* Network-first SW — tránh cache index.html cũ → JS hash lệch → màn trắng */
const CACHE = 'hoantienvn-v3';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // API / redirect short link — không đụng
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/r/')) return;

  // HTML navigation: luôn network-first, không cache lâu
  const isNav =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNav || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Asset hashed: cache-first sau khi fetch thành công
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
  }
});
