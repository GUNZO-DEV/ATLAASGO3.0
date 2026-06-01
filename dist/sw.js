/* AtlaasGo service worker — production hardened
 * Strategy:
 *   - Navigation (HTML): network-first, offline fallback to cached shell
 *   - Hashed assets (/assets/*): cache-first (immutable filenames)
 *   - Everything else: network-first with cache fallback
 *
 * Cache version must be bumped on every deploy. The deploy script
 * handles this automatically via sed, or bump manually.
 */
const CACHE = 'atlaasgo-6d69a550';
const PRECACHE = ['/manifest.webmanifest', '/favicon.svg'];

// ── Install: precache shell assets ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .catch(() => {}),
  );
  self.skipWaiting();
});

// ── Activate: evict old caches ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

// ── Fetch: routing strategy ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin (Clerk, Supabase, Stripe, analytics)
  if (url.origin !== self.location.origin) return;

  // Navigation & HTML → network-first (never serve stale HTML)
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Hashed assets → cache-first (filenames contain content hash)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else → network-first with cache fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
