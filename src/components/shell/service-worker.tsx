"use client";

import { useEffect } from "react";

/** Registers /sw.js (push only, no caching) and clears the Home Screen badge whenever the app is opened. */
export function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const clear = () => {
      if (document.visibilityState === "visible") navigator.clearAppBadge?.().catch(() => {});
    };
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, []);
  return null;
}
