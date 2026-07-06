// Attune service worker — RETIRED (self-destructing).
//
// Earlier builds shipped a cache-first worker that could pin a stale JS bundle
// on a device across deploys, leaving the page painted but frozen (no typing,
// no taps, no save). Caching app code turned out not to be worth that risk for
// this app, so the worker is retired.
//
// This version exists only to *recover* any device still running an older
// worker. It caches nothing, deletes every cache, force-reloads open pages so
// they drop the stale in-memory bundle and fetch fresh assets, then unregisters
// itself. It reaches stuck devices because the browser fetches sw.js on its own
// update channel, which the old worker cannot intercept.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        // Reload each open page so it loads fresh, uncached JavaScript.
        client.navigate(client.url);
      }
      await self.registration.unregister();
    })(),
  );
});

// No fetch handler: this worker never intercepts a request again.
