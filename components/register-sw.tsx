"use client";

import { useEffect } from "react";

// Register the service worker in production only, so local dev never serves
// cached assets.
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
