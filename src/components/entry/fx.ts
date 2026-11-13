"use client";

import { useSyncExternalStore } from "react";

// Rates from open.er-api.com, one fetch per base currency per page load, and only when a non-base currency is picked.
const tables = new Map<string, Promise<Record<string, number>>>();

/** Units of `base` per 1 unit of `cur` (the fx_rate the DB stores), or null when the API has no answer. */
export function baseRate(cur: string, base: string): Promise<number | null> {
  let table = tables.get(base);
  if (!table) {
    table = fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { rates?: Record<string, number> }) => j.rates ?? {})
      .catch(() => {
        tables.delete(base); // let a later pick retry
        return {};
      });
    tables.set(base, table);
  }
  return table.then((rates) => (rates[cur] > 0 ? Number((1 / rates[cur]).toPrecision(6)) : null));
}

const DESKTOP = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(DESKTOP);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** lg+ viewport. False during SSR; the drawers are closed then, so nothing flips visibly. */
export function useDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);
}
