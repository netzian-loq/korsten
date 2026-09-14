"use client";

import { useSyncExternalStore } from "react";

import { createProgress, type ClientProgress } from "./timeline";

/**
 * The deal currently under contract, kept in localStorage.
 *
 * One deal at a time, matching the screen. Same useSyncExternalStore pattern as
 * the other modules, so a reload keeps the work and tabs stay in sync.
 */

const KEY = "realtor-suite:progress:v1";

/** Stable blank deal for the server render, so hydration matches. */
const SERVER_PROGRESS = createProgress("server", "");

let cache: ClientProgress | null = null;
const listeners = new Set<() => void>();

function read(): ClientProgress {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClientProgress;
      if (parsed && typeof parsed.presetId === "string") {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // Private mode or corrupt JSON — fall through to a fresh deal.
  }

  cache = createProgress(crypto.randomUUID(), new Date().toISOString());
  return cache;
}

function write(next: ClientProgress) {
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

const getServerSnapshot = () => SERVER_PROGRESS;

export function useProgress(): ClientProgress {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export function updateProgress(patch: Partial<ClientProgress>) {
  write({ ...read(), ...patch });
}

/** Replaces the whole record — used by the maths in timeline/schema. */
export function replaceProgress(next: ClientProgress) {
  write(next);
}

/** Choosing a preset starts the timeline fresh, clearing any ticked steps. */
export function assignTimelinePreset(presetId: string) {
  write({ ...read(), presetId, milestones: {} });
}

/** Moves one milestone off its calculated date. */
export function setMilestoneDate(milestoneId: string, date: string) {
  const progress = read();
  write({
    ...progress,
    milestones: {
      ...progress.milestones,
      [milestoneId]: { ...progress.milestones[milestoneId], date: date || undefined },
    },
  });
}

export function resetProgress() {
  write(createProgress(crypto.randomUUID(), new Date().toISOString()));
}
