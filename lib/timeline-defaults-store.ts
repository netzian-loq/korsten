"use client";

import { useSyncExternalStore } from "react";

import { sanitizeSteps, type TimelineMilestone } from "./timeline";

/**
 * The agent's own default steps for each deal skeleton, in localStorage.
 *
 * Saving here means every new Cash Offer (or 30-day, or FHA/VA) deal starts
 * from the agent's version instead of the built-in one. The preset JSON is
 * never changed, so "restore the original" always has something to go back to.
 */

const KEY = "realtor-suite:timeline-defaults:v1";

type Defaults = Record<string, TimelineMilestone[]>;

const EMPTY: Defaults = {};

let cache: Defaults | null = null;
const listeners = new Set<() => void>();

function read(): Defaults {
  if (cache) return cache;

  const next: Defaults = {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [presetId, steps] of Object.entries(parsed)) {
        const clean = sanitizeSteps(steps);
        if (clean) next[presetId] = clean;
      }
    }
  } catch {
    // Private mode or corrupt JSON — fall back to the built-in steps.
  }

  cache = next;
  return cache;
}

function write(next: Defaults) {
  cache = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the change still applies for this session.
  }

  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => EMPTY;

export function useTimelineDefaults(): Defaults {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/** The saved steps for one skeleton, or undefined for the built-in ones. */
export function savedSteps(presetId: string): TimelineMilestone[] | undefined {
  return read()[presetId];
}

export function saveDefaultSteps(presetId: string, steps: TimelineMilestone[]) {
  write({ ...read(), [presetId]: steps });
}

export function clearDefaultSteps(presetId: string) {
  const next = { ...read() };
  delete next[presetId];
  write(next);
}
