"use client";

import { useSyncExternalStore } from "react";

import { createDeal, type Deal } from "./deals/schema";
import { setMilestoneDone, type TimelinePreset } from "./timeline/schema";

/**
 * Every deal the agent has, kept in localStorage.
 *
 * A collection, not a singleton — an agent working both sides runs several
 * files at once, which is exactly what the old one-board-at-a-time screens
 * could not represent.
 */

const KEY = "realtor-suite:deals:v1";

const EMPTY: Deal[] = [];

let cache: Deal[] | null = null;
const listeners = new Set<() => void>();

function read(): Deal[] {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as Deal[]) : [];
  } catch {
    cache = [];
  }

  return cache;
}

function write(next: Deal[]) {
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

export function useDeals(): Deal[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export function useDeal(dealId: string): Deal | null {
  return useDeals().find((deal) => deal.id === dealId) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export function addDeal(input: Parameters<typeof createDeal>[0]): Deal {
  const deal = createDeal(input, crypto.randomUUID(), new Date().toISOString());
  write([...read(), deal]);
  return deal;
}

export function updateDeal(dealId: string, patch: Partial<Deal>) {
  write(read().map((deal) => (deal.id === dealId ? { ...deal, ...patch } : deal)));
}

export function removeDeal(dealId: string) {
  write(read().filter((deal) => deal.id !== dealId));
}

/** Assigning a timeline preset resets any milestone overrides. */
export function assignTimeline(dealId: string, presetId: string) {
  updateDeal(dealId, { presetId, milestones: {} });
}

export function setDealMilestoneDate(dealId: string, milestoneId: string, date: string) {
  const deal = read().find((candidate) => candidate.id === dealId);
  if (!deal) return;

  updateDeal(dealId, {
    milestones: {
      ...deal.milestones,
      [milestoneId]: { ...deal.milestones[milestoneId], date },
    },
  });
}

/**
 * Ticking a step also ticks everything before it — the contract runs in order,
 * and a gap in the middle would put the buyer's "you are here" somewhere false.
 */
export function setDealMilestoneDone(
  dealId: string,
  preset: TimelinePreset | null,
  milestoneId: string,
  done: boolean,
) {
  const deal = read().find((candidate) => candidate.id === dealId);
  if (!deal) return;

  write(
    read().map((candidate) =>
      candidate.id === dealId
        ? setMilestoneDone(deal, preset, milestoneId, done)
        : candidate,
    ),
  );
}
