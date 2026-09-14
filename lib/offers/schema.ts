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
  /** Seller-paid closing costs. The term that makes top price lose on net. */
  sellerConcessions: number | null;
  specialTerms: string;
  /** For the agent and seller. Hidden in presentation view. */
  agentNotes: string;
};

/** Costs that apply to the sale, not to any one offer, so entered once. */
export type SellerCosts = {
  commissionPct: number;
  /** Title, escrow and transfer taxes, as a share of price. */
  closingCostPct: number;
  /** What the seller still owes. Shifts every net equally. */
  mortgagePayoff: number;
};

export const DEFAULT_SELLER_COSTS: SellerCosts = {
  commissionPct: 5,
  closingCostPct: 1.2,
  mortgagePayoff: 0,
};

export type OfferMath = {
  commission: number;
  closingCosts: number;
  concessions: number;
  payoff: number;
  /** What the seller actually walks away with. */
  netProceeds: number;
};

/**
 * Net proceeds for one offer.
 *
 * This is the number a seller decides on. The highest bid routinely loses here
 * once concessions and a percentage commission land, which is the entire reason
 * the board exists rather than a list of prices.
 */
export function offerMath(offer: Offer, costs: SellerCosts): OfferMath | null {
  if (!isFilled(offer)) return null;

  const price = offer.purchasePrice ?? 0;
  const commission = price * (costs.commissionPct / 100);
  const closingCosts = price * (costs.closingCostPct / 100);
  const concessions = Math.max(0, offer.sellerConcessions ?? 0);
  const payoff = Math.max(0, costs.mortgagePayoff);

  return {
    commission,
    closingCosts,
    concessions,
    payoff,
    netProceeds: price - commission - closingCosts - concessions - payoff,
  };
}

export type OfferComparison = {
  id: string;
  /** The listing this board belongs to. */
  dealId: string;
  sellerCosts: SellerCosts;
  createdAt: string;
  /** Presentation view: input controls and agent notes are hidden. */
  presentationMode: boolean;
  offers: Offer[];
};

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

// Shared with the timeline module. Imported for use below *and* re-exported,
// since `export … from` alone would not bind the name in this module.
import { dateRank } from "../dates.ts";

export { dateRank, daysUntil, parseISODate } from "../dates.ts";

/* -------------------------------------------------------------------------- */
/* Badges                                                                     */
/* -------------------------------------------------------------------------- */

export type BadgeKind =
  | "highest-net"
  | "highest-price"
  | "fastest-close"
  | "all-cash"
  | "fewest-contingencies";

export const BADGE_LABEL: Record<BadgeKind, string> = {
  "highest-net": "Highest Net",
  "highest-price": "Highest Price",
  "fastest-close": "Fastest Close",
  "all-cash": "All Cash",
  "fewest-contingencies": "Fewest Contingencies",
};

/** Fixed render order, so a card's badges never reshuffle as terms change. */
/** Net leads: it is the number the seller is actually choosing on. */
export const BADGE_ORDER: BadgeKind[] = [
  "highest-net",
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
export function awardBadges(
  offers: Offer[],
  costs: SellerCosts = DEFAULT_SELLER_COSTS,
): Record<string, BadgeKind[]> {
  const badges: Record<string, BadgeKind[]> = Object.fromEntries(
    offers.map((offer) => [offer.id, [] as BadgeKind[]]),
  );

  const ranked = offers.filter(isInPlay);
  if (ranked.length < 2) return badges;

  const give = (kind: BadgeKind, ids: string[]) => {
    for (const id of ids) badges[id].push(kind);
  };

  give(
    "highest-net",
    awardBy(ranked, (o) => offerMath(o, costs)?.netProceeds ?? null, "max"),
  );
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
