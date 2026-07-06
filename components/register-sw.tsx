"use client";

import { useEffect } from "react";

// The PWA service worker caused stale-bundle freezes, so it's been retired.
// This component now does the opposite of registering one: it evicts any
// service worker still installed on a device (from an earlier deploy), clears
// its caches, and reloads once so the page runs fresh, uncached code. It runs
// as soon as the app's JavaScript is alive, healing the device without waiting
// on the browser's own service-worker update check.
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    (async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length === 0) return;
      await Promise.all(regs.map((r) => r.unregister()));
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      // Only reload if a worker was actually controlling this page; after the
      // reload there's no controller, so this can never loop.
      if (navigator.serviceWorker.controller) window.location.reload();
    })().catch(() => {});
  }, []);
  return null;
}
