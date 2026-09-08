"use client";

import { useSyncExternalStore } from "react";

/*
 * One shared minute-ticker for the whole app. Subscribing through an external
 * store rather than an effect keeps the server and client first render
 * identical — the server has no business guessing what o'clock it is where the
 * agent is — and stops two consumers drifting apart on separate intervals.
 */
const listeners = new Set<() => void>();
let snapshot: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  if (timer === undefined) {
    // React re-reads the snapshot straight after subscribing, so seeding it
    // here is enough to move off the null first render.
    snapshot = Date.now();
    timer = setInterval(() => {
      snapshot = Date.now();
      for (const listener of listeners) listener();
    }, 60_000);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

/** The current time in the viewer's timezone, or `null` before hydration. */
export function useNow(): Date | null {
  const ms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return ms === null ? null : new Date(ms);
}
