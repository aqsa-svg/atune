// Attune service worker — deliberately conservative so it never serves stale
// auth/dynamic pages or touches the Cohesivity API.
const CACHE = "attune-v1";
const PRECACHE = ["/offline.html", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never intercept cross-origin (e.g. the Cohesivity API / gateway).
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the offline page only when offline.
  // This keeps dynamic + authenticated pages always fresh.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // Immutable static assets + icons: cache-first.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else: try network, fall back to any cached copy.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
