"use client";

import { useSyncExternalStore } from "react";

import {
  blankOffer,
  createBlankBoard,
  MAX_OFFERS,
  type ContingencyId,
  type Offer,
  type OfferComparison,
  type SellerCosts,
} from "./offers";

/**
 * Offer boards, one per listing, kept in localStorage.
 *
 * Keyed by deal id rather than being a single global board: a listing agent
 * with two listings taking offers had nowhere to put the second one.
 */

const KEY = "realtor-suite:offer-boards:v1";

type Boards = Record<string, OfferComparison>;

const EMPTY: Boards = {};

let cache: Boards | null = null;
const listeners = new Set<() => void>();

/**
 * Blank boards for listings that have not been touched yet.
 *
 * Memoised so `getSnapshot` keeps returning the same object — creating one on
 * each read would be a new reference every render and spin React forever. They
 * are only persisted once the agent actually edits something.
 */
const blanks = new Map<string, OfferComparison>();

function read(): Boards {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Boards)
        : {};
  } catch {
    cache = {};
  }

  return cache;
}

function write(next: Boards) {
  cache = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the change still applies for this session.
  }

  for (const listener of listeners) listener();
}

function boardFor(dealId: string): OfferComparison {
  const stored = read()[dealId];
  if (stored) return stored;

  let blank = blanks.get(dealId);
  if (!blank) {
    // Deterministic id and no timestamp, so server and client agree.
    blank = createBlankBoard(dealId, `board-${dealId}`, "");
    blanks.set(dealId, blank);
  }
  return blank;
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

const serverBoards = () => EMPTY;

export function useOfferBoard(dealId: string): OfferComparison {
  useSyncExternalStore(subscribe, read, serverBoards);
  return boardFor(dealId);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

function save(board: OfferComparison) {
  write({ ...read(), [board.dealId]: board });
}

export function updateBoard(dealId: string, patch: Partial<OfferComparison>) {
  save({ ...boardFor(dealId), ...patch });
}

export function updateSellerCosts(dealId: string, patch: Partial<SellerCosts>) {
  const board = boardFor(dealId);
  save({ ...board, sellerCosts: { ...board.sellerCosts, ...patch } });
}

export function updateOffer(dealId: string, offerId: string, patch: Partial<Offer>) {
  const board = boardFor(dealId);
  save({
    ...board,
    offers: board.offers.map((offer) =>
      offer.id === offerId ? { ...offer, ...patch } : offer,
    ),
  });
}

export function addOffer(dealId: string) {
  const board = boardFor(dealId);
  if (board.offers.length >= MAX_OFFERS) return;

  save({
    ...board,
    offers: [...board.offers, blankOffer(board.offers.length, `offer-${crypto.randomUUID()}`)],
  });
}

export function removeOffer(dealId: string, offerId: string) {
  const board = boardFor(dealId);
  save({ ...board, offers: board.offers.filter((offer) => offer.id !== offerId) });
}

/** Quick-toggle: keeps the card, drops it out of the comparison. */
export function toggleOfferHidden(dealId: string, offerId: string) {
  const offer = boardFor(dealId).offers.find((candidate) => candidate.id === offerId);
  if (offer) updateOffer(dealId, offerId, { hidden: !offer.hidden });
}

/** Reads the list from the store, so several taps cannot clobber each other. */
export function toggleContingency(
  dealId: string,
  offerId: string,
  contingency: ContingencyId,
) {
  const offer = boardFor(dealId).offers.find((candidate) => candidate.id === offerId);
  if (!offer) return;

  updateOffer(dealId, offerId, {
    contingencies: offer.contingencies.includes(contingency)
      ? offer.contingencies.filter((current) => current !== contingency)
      : [...offer.contingencies, contingency],
  });
}

export function resetBoard(dealId: string) {
  blanks.delete(dealId);
  const remaining = { ...read() };
  delete remaining[dealId];
  write(remaining);
}
