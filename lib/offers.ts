/**
 * Offer comparison: the terms, the seller-side arithmetic, and the badges.
 *
 * Import-free on purpose — no React, no Supabase — so every number the board
 * shows can be exercised directly by `lib/offers.test.ts`. The point of the
 * board is that the highest price is often not the highest net, and that only
 * holds up if the arithmetic is right.
 */

export const MAX_OFFERS = 4;

export type FinancingType = "Cash" | "Conventional" | "VA" | "FHA" | "USDA";

export const FINANCING_TYPES = [
  "Cash",
  "Conventional",
  "VA",
  "FHA",
  "USDA",
] as const satisfies readonly FinancingType[];

export type Offer = {
  id: string;
  /** Whose offer it is. Columns are anonymous without it. */
  label: string;
  purchasePrice: number;
  /** 0–100. Cash offers sit at 100. */
  downPaymentPct: number;
  /** Inspection / due-diligence window, in days. */
  contingencyDays: number;
  /** ISO `yyyy-mm-dd`. */
  closingDate: string;
  financingType: FinancingType;
  sellerConcessions: number;
};

/**
 * Costs that apply to the sale rather than to any one offer, so they are
 * entered once and shared. The payoff shifts every net equally and never
 * changes the ranking, but without it the number on screen is not what the
 * seller actually walks away with.
 */
export type SellerCosts = {
  commissionPct: number;
  /** Title, escrow, and transfer taxes, as a share of price. */
  closingCostPct: number;
  mortgagePayoff: number;
};

export const DEFAULT_SELLER_COSTS: SellerCosts = {
  commissionPct: 5,
  closingCostPct: 1.2,
  mortgagePayoff: 415_000,
};

/* -------------------------------------------------------------------------- */
/* Arithmetic                                                                 */
/* -------------------------------------------------------------------------- */

export type OfferMath = {
  commission: number;
  closingCosts: number;
  concessions: number;
  payoff: number;
  totalDeductions: number;
  /** What the seller nets. Can go negative on an underwater payoff. */
  netProceeds: number;
  downPayment: number;
  loanAmount: number;
};

export function calculateOffer(offer: Offer, costs: SellerCosts): OfferMath {
  const price = Math.max(0, offer.purchasePrice);

  const commission = price * (costs.commissionPct / 100);
  const closingCosts = price * (costs.closingCostPct / 100);
  const concessions = Math.max(0, offer.sellerConcessions);
  const payoff = Math.max(0, costs.mortgagePayoff);

  const totalDeductions = commission + closingCosts + concessions + payoff;
  const downPayment = price * (clampPct(offer.downPaymentPct) / 100);

  return {
    commission,
    closingCosts,
    concessions,
    payoff,
    totalDeductions,
    netProceeds: price - totalDeductions,
    downPayment,
    loanAmount: Math.max(0, price - downPayment),
  };
}

const clampPct = (value: number) => Math.min(Math.max(value, 0), 100);

/**
 * A column with no price is a placeholder someone has just added, not an offer.
 * It is kept out of every ranking — otherwise a blank column wins "shortest
 * inspection" on its default, and its net reads as a loss the size of the
 * payoff.
 */
export const isComplete = (offer: Offer) => offer.purchasePrice > 0;

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

/** Parses `yyyy-mm-dd` as a local date. `new Date(iso)` would read it as UTC. */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const [year, month, day] = [+match[1], +match[2], +match[3]];
  const date = new Date(year, month - 1, day);
  // Rejects impossible dates that would otherwise roll over (e.g. 2026-02-31).
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Whole days from `today` to the closing date. Negative once it is past. */
export function daysUntil(iso: string, today: Date): number | null {
  const target = parseISODate(iso);
  if (!target) return null;

  const midnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((target.getTime() - midnight.getTime()) / 86_400_000);
}

/** Sortable numeric form of a `yyyy-mm-dd` date — no timezone involved. */
export function dateRank(iso: string): number | null {
  return parseISODate(iso) ? Number(iso.replaceAll("-", "")) : null;
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                     */
/* -------------------------------------------------------------------------- */

export type BadgeKind =
  | "highest-net"
  | "highest-price"
  | "fastest-close"
  | "shortest-inspection"
  | "all-cash";

export const BADGE_LABEL: Record<BadgeKind, string> = {
  "highest-net": "Highest net",
  "highest-price": "Highest price",
  "fastest-close": "Fastest close",
  "shortest-inspection": "Shortest inspection",
  "all-cash": "All cash",
};

/** Render order, so a column's badges never reshuffle between updates. */
export const BADGE_ORDER: BadgeKind[] = [
  "highest-net",
  "highest-price",
  "fastest-close",
  "shortest-inspection",
  "all-cash",
];

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
  const winners = scored
    .filter((entry) => entry.value === best)
    .map((entry) => entry.id);

  return winners.length === offers.length ? [] : winners;
}

/** Badges per offer id. Needs at least two offers to mean anything. */
export function awardBadges(
  offers: Offer[],
  costs: SellerCosts,
): Record<string, BadgeKind[]> {
  const badges: Record<string, BadgeKind[]> = Object.fromEntries(
    offers.map((offer) => [offer.id, [] as BadgeKind[]]),
  );

  // Placeholder columns keep their (empty) entry but take no part in ranking.
  const ranked = offers.filter(isComplete);
  if (ranked.length < 2) return badges;

  const give = (kind: BadgeKind, ids: string[]) => {
    for (const id of ids) badges[id].push(kind);
  };

  give(
    "highest-net",
    awardBy(ranked, (o) => calculateOffer(o, costs).netProceeds, "max"),
  );
  give(
    "highest-price",
    awardBy(ranked, (o) => o.purchasePrice, "max"),
  );
  give(
    "fastest-close",
    awardBy(ranked, (o) => dateRank(o.closingDate), "min"),
  );
  give(
    "shortest-inspection",
    awardBy(ranked, (o) => o.contingencyDays, "min"),
  );

  // Not a ranking: every cash offer earns it, unless they all do.
  const cash = ranked.filter((o) => o.financingType === "Cash");
  if (cash.length > 0 && cash.length < ranked.length) {
    give(
      "all-cash",
      cash.map((o) => o.id),
    );
  }

  // Keep each column's badges in a stable, meaningful order.
  for (const id of Object.keys(badges)) {
    badges[id].sort(
      (a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b),
    );
  }

  return badges;
}

/* -------------------------------------------------------------------------- */
/* Seeds                                                                      */
/* -------------------------------------------------------------------------- */

const COLUMN_NAMES = ["Offer A", "Offer B", "Offer C", "Offer D"];

export function blankOffer(index: number, id: string): Offer {
  return {
    id,
    label: COLUMN_NAMES[index] ?? `Offer ${index + 1}`,
    purchasePrice: 0,
    downPaymentPct: 20,
    contingencyDays: 10,
    closingDate: "",
    financingType: "Conventional",
    sellerConcessions: 0,
  };
}

/** The three offers on 302 Bellwether, the deadline sitting on the Today page. */
export const SEED_OFFERS: Offer[] = [
  {
    id: "offer-nakamura",
    label: "Nakamura",
    purchasePrice: 872_000,
    downPaymentPct: 25,
    contingencyDays: 10,
    closingDate: "2026-10-02",
    financingType: "Conventional",
    sellerConcessions: 0,
  },
  {
    id: "offer-whitmore",
    label: "Whitmore",
    purchasePrice: 895_000,
    downPaymentPct: 5,
    contingencyDays: 17,
    closingDate: "2026-10-24",
    financingType: "FHA",
    sellerConcessions: 28_000,
  },
  {
    id: "offer-delgado",
    label: "Delgado",
    purchasePrice: 855_000,
    downPaymentPct: 100,
    contingencyDays: 7,
    closingDate: "2026-09-18",
    financingType: "Cash",
    sellerConcessions: 0,
  },
];

/* -------------------------------------------------------------------------- */
/* Verdict                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * What the board currently says, as data rather than copy. The headline claims
 * the top bid is not the top net, which stops being true the moment someone
 * edits a term — so it is derived, never hardcoded.
 */
export type BoardVerdict =
  | { kind: "empty" }
  | { kind: "single" }
  | { kind: "aligned"; label: string }
  | { kind: "split"; topPriceLabel: string; topNetLabel: string; gap: number };

export function boardVerdict(
  offers: Offer[],
  costs: SellerCosts,
): BoardVerdict {
  // Only priced columns have anything to say.
  const ranked = offers.filter(isComplete);
  if (ranked.length === 0) return { kind: "empty" };
  if (ranked.length === 1) return { kind: "single" };

  const scored = ranked.map((offer) => ({
    offer,
    net: calculateOffer(offer, costs).netProceeds,
  }));

  // Strict `>` keeps the earliest column on a tie, so the verdict is stable.
  const topPrice = scored.reduce((best, entry) =>
    entry.offer.purchasePrice > best.offer.purchasePrice ? entry : best,
  );
  const topNet = scored.reduce((best, entry) =>
    entry.net > best.net ? entry : best,
  );

  if (topPrice.offer.id === topNet.offer.id) {
    return { kind: "aligned", label: topNet.offer.label };
  }

  return {
    kind: "split",
    topPriceLabel: topPrice.offer.label,
    topNetLabel: topNet.offer.label,
    gap: topNet.net - topPrice.net,
  };
}
