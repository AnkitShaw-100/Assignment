"use client";

import { useSyncExternalStore } from "react";

// A shared clock that ticks every 30s so relative times ("2 minutes ago") and
// today/overdue classification stay current without a reload.
let snapshot = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      listeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * Current time in ms, or `null` during server rendering/hydration. Dates depend
 * on the viewer's timezone, so they are only computed in the browser.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null,
  );
}
