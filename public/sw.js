/* ==========================================================================
   Service worker — makes the app installable and usable offline.
   Strategy:
     • Navigations (HTML): network-first, fall back to the cached offline page.
       (Pages are per-tenant & auth-gated, so we never serve a stale page from
       cache — only the offline fallback when the network is truly unavailable.)
     • Static build assets (/_next/static, icons, fonts): cache-first
       (stale-while-revalidate) for instant repeat loads.
     • Everything else (APIs, POSTs, auth): passthrough, never cached.
   ========================================================================== */

const VERSION = "v1";
const CACHE = `lms-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/favicon.ico" ||
    /\.(?:css|js|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|webp|avif)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // don't touch cross-origin
  // Never cache the app icon or manifest (they're tenant-dynamic) or APIs.
  if (url.pathname.startsWith("/api/") || url.pathname === "/manifest.webmanifest") return;

  // App-shell navigations: network-first with offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE);
          const cached = await cache.match(OFFLINE_URL);
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Static assets: serve from cache, refresh in the background.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
});

// Let the page tell a waiting worker to take over immediately.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
