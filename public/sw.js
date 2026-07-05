// Attune service worker — v2.
//
// Deliberately minimal. It NEVER caches app code (HTML, or /_next JS/CSS), so it
// can never freeze the app by serving a stale or mismatched bundle after a
// deploy. Its only job is to show an on-brand offline page when a navigation
// fails with no connection.
//
// v1 was cache-first on /_next/static, which could pin outdated JavaScript on a
// device across deploys and leave the page painted but dead. Bumping the cache
// name below makes this worker delete that old cache on activate, self-healing
// any device that still has v1 installed.
const CACHE = "attune-v2";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(OFFLINE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Purge every previous cache (including the aggressive "attune-v1"). This is
  // what unbricks devices stuck on the old worker.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only handle top-level navigations. Everything else (JS, CSS, data, the
  // Cohesivity API) goes straight to the network as normal — the worker never
  // intercepts app code, so it can never serve it stale.
  if (request.mode !== "navigate") return;
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
});
