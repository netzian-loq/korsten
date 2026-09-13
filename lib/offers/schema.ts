/**
 * The offer comparison model, and the badge arithmetic the board reads off it.
 *
 * Import-free so schema.test.ts can exercise it directly — the badges are the
 * part a seller reads off the screen, so they need to be right.
 */

export type FinancingType = "Cash" | "Conventional" | "FHA" | "VA" | "Other";

export const FINANCING_TYPES: readonly FinancingType[] = [
  "Cash",
  "Conventional",
  "FHA",
  "VA",
  "Other",
];

export type ContingencyId = "appraisal" | "inspection" | "financing" | "home-sale";

export type Offer = {
  id: string;
  /** "Offer 1" until the agent renames it to the buyer. */
  label: string;
  /** Quick-toggled off: stays on the board, drops out of the comparison. */
  hidden: boolean;
  purchasePrice: number | null;
  /** Percent down. Cash sits at 100. */
  downPaymentPct: number | null;
  financingType: FinancingType;
  /** ISO `yyyy-mm-dd`. */
  closingDate: string;
  /** Contingencies the buyer is KEEPING. Waived ones are simply absent. */
  contingencies: ContingencyId[];
  specialTerms: string;
  /** For the agent and seller. Hidden in presentation view. */
  agentNotes: string;
};

export type OfferComparison = {
  id: string;
  propertyAddress: string;
  listPrice: number | null;
  createdAt: string;
  /** Presentation view: input controls and agent notes are hidden. */
  presentationMode: boolean;
  offers: Offer[];
};

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

/** Parses `yyyy-mm-dd` as a local date. `new Date(iso)` would read it as UTC. */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const [year, month, day] = [+match[1], +match[2], +match[3]];
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Sortable numeric form of a date — no timezone involved. */
export function dateRank(iso: string): number | null {
  return parseISODate(iso) ? Number(iso.replaceAll("-", "")) : null;
}

/** Whole days from `today` to the closing date, for "30-day close". */
export function daysUntil(iso: string, today: Date): number | null {
  const target = parseISODate(iso);
  if (!target) return null;

  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - midnight.getTime()) / 86_400_000);
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                     */
/* -------------------------------------------------------------------------- */

export type BadgeKind =
  | "highest-price"
  | "fastest-close"
  | "all-cash"
  | "fewest-contingencies";

export const BADGE_LABEL: Record<BadgeKind, string> = {
  "highest-price": "Highest Price",
  "fastest-close": "Fastest Close",
  "all-cash": "All Cash",
  "fewest-contingencies": "Fewest Contingencies",
};

/** Fixed render order, so a card's badges never reshuffle as terms change. */
export const BADGE_ORDER: BadgeKind[] = [
  "highest-price",
  "fastest-close",
  "all-cash",
  "fewest-contingencies",
];

/** An offer with no price is still a blank slot, not something to rank. */
export const isFilled = (offer: Offer) =>
  offer.purchasePrice !== null && offer.purchasePrice > 0;

/** Filled, and not toggled out of the comparison. */
export const isInPlay = (offer: Offer) => isFilled(offer) && !offer.hidden;

/**
 * Ids that win on one measure. Ties win together, and a measure every offer
 * ties on awards nothing — a badge the whole board earns distinguishes nothing.
 */
function awardBy(
  offers: Offer[],
  score: (offer: Offer) => number | null,
  direction: "max" | "min",
): string[] {
  const scored = offers.flatMap((offer) => {
    const value = score(offer);
    return value === null || !Number.isFinite(value) ? [] : [{ id: offer.id, value }];
  });

  if (scored.length < 2) return [];

  const values = scored.map((entry) => entry.value);
  const best = direction === "max" ? Math.max(...values) : Math.min(...values);
  const winners = scored.filter((entry) => entry.value === best).map((entry) => entry.id);

  return winners.length === offers.length ? [] : winners;
}

/**
 * Badges per offer id. Hidden and unpriced offers take no part, so toggling an
 * offer off genuinely removes it from the comparison rather than just hiding it.
 */
export function awardBadges(offers: Offer[]): Record<string, BadgeKind[]> {
  const badges: Record<string, BadgeKind[]> = Object.fromEntries(
    offers.map((offer) => [offer.id, [] as BadgeKind[]]),
  );

  const ranked = offers.filter(isInPlay);
  if (ranked.length < 2) return badges;

  const give = (kind: BadgeKind, ids: string[]) => {
    for (const id of ids) badges[id].push(kind);
  };

  give("highest-price", awardBy(ranked, (o) => o.purchasePrice, "max"));
  give("fastest-close", awardBy(ranked, (o) => dateRank(o.closingDate), "min"));
  give(
    "fewest-contingencies",
    awardBy(ranked, (o) => o.contingencies.length, "min"),
  );

  // Not a ranking: every cash offer earns it, unless they all do.
  const cash = ranked.filter((offer) => offer.financingType === "Cash");
  if (cash.length > 0 && cash.length < ranked.length) {
    give("all-cash", cash.map((offer) => offer.id));
  }

  for (const id of Object.keys(badges)) {
    badges[id].sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b));
  }

  return badges;
}
