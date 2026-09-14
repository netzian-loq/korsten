"use client";

import { useSyncExternalStore } from "react";

import {
  blankOffer,
  createBlankBoard,
  MAX_OFFERS,
  type ContingencyId,
  type Offer,
  type OfferComparison,
} from "./offers";

/**
 * The offer board, kept in localStorage.
 *
 * One board at a time — the screen compares offers on a single property. Read
 * through useSyncExternalStore so a reload keeps the work and every mounted
 * component re-renders on a write.
 */

const KEY = "realtor-suite:offer-board:v1";

/**
 * What the server renders: the blank skeleton, with a fixed id so the
 * reference is stable and hydration matches. The stored board replaces it on
 * the first client read.
 */
const SERVER_BOARD = createBlankBoard("server", "");

let cache: OfferComparison | null = null;
const listeners = new Set<() => void>();

function read(): OfferComparison {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OfferComparison;
      if (Array.isArray(parsed?.offers)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // Private mode or corrupt JSON — fall through to a fresh board.
  }

  cache = createBlankBoard(crypto.randomUUID(), new Date().toISOString());
  return cache;
}

function write(next: OfferComparison) {
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

const getServerSnapshot = () => SERVER_BOARD;

export function useOfferBoard(): OfferComparison {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export function updateBoard(patch: Partial<OfferComparison>) {
  write({ ...read(), ...patch });
}

export function updateOffer(offerId: string, patch: Partial<Offer>) {
  const board = read();
  write({
    ...board,
    offers: board.offers.map((offer) =>
      offer.id === offerId ? { ...offer, ...patch } : offer,
    ),
  });
}

export function addOffer() {
  const board = read();
  if (board.offers.length >= MAX_OFFERS) return;

  write({
    ...board,
    offers: [
      ...board.offers,
      blankOffer(board.offers.length, `offer-${crypto.randomUUID()}`),
    ],
  });
}

export function removeOffer(offerId: string) {
  const board = read();
  write({
    ...board,
    offers: board.offers.filter((offer) => offer.id !== offerId),
  });
}

/** Quick-toggle: keeps the card, drops it out of the comparison. */
export function toggleOfferHidden(offerId: string) {
  const board = read();
  const offer = board.offers.find((candidate) => candidate.id === offerId);
  if (offer) updateOffer(offerId, { hidden: !offer.hidden });
}

/**
 * Toggles one contingency.
 *
 * Reads the list from the store rather than from the rendered props: several
 * chips tapped before React re-renders would otherwise each compute from the
 * same stale array and overwrite one another.
 */
export function toggleContingency(offerId: string, contingency: ContingencyId) {
  const board = read();
  const offer = board.offers.find((candidate) => candidate.id === offerId);
  if (!offer) return;

  updateOffer(offerId, {
    contingencies: offer.contingencies.includes(contingency)
      ? offer.contingencies.filter((current) => current !== contingency)
      : [...offer.contingencies, contingency],
  });
}

export function resetBoard() {
  write(createBlankBoard(crypto.randomUUID(), new Date().toISOString()));
}
