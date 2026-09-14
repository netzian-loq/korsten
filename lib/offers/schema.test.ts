import assert from "node:assert/strict";
import { test } from "node:test";

import {
  awardBadges,
  DEFAULT_SELLER_COSTS,
  offerMath,
  daysUntil,
  isInPlay,
  parseISODate,
  type Offer,
} from "./schema.ts";

const offer = (id: string, over: Partial<Offer> = {}): Offer => ({
  id,
  label: id,
  hidden: false,
  purchasePrice: 865_000,
  downPaymentPct: 20,
  financingType: "Conventional",
  closingDate: "2026-10-15",
  contingencies: ["appraisal", "inspection", "financing"],
  sellerConcessions: null,
  specialTerms: "",
  agentNotes: "",
  ...over,
});

const badgesOf = (offers: Offer[], id: string) => awardBadges(offers)[id];

test("the highest price wins Highest Price", () => {
  const offers = [
    offer("a", { purchasePrice: 880_000 }),
    offer("b", { purchasePrice: 865_000 }),
  ];
  assert.ok(badgesOf(offers, "a").includes("highest-price"));
  assert.deepEqual(badgesOf(offers, "b"), []);
});

test("the earliest closing date wins Fastest Close", () => {
  const offers = [
    offer("a", { closingDate: "2026-11-20" }),
    offer("b", { closingDate: "2026-10-02" }),
  ];
  assert.ok(badgesOf(offers, "b").includes("fastest-close"));
  assert.ok(!badgesOf(offers, "a").includes("fastest-close"));
});

test("cash offers win All Cash, unless every offer is cash", () => {
  const mixed = [offer("cash", { financingType: "Cash" }), offer("loan")];
  assert.ok(badgesOf(mixed, "cash").includes("all-cash"));

  const allCash = [
    offer("one", { financingType: "Cash" }),
    offer("two", { financingType: "Cash" }),
  ];
  assert.ok(!badgesOf(allCash, "one").includes("all-cash"));
});

test("the shortest contingency list wins Fewest Contingencies", () => {
  const offers = [
    offer("clean", { contingencies: [] }),
    offer("normal"),
  ];
  assert.ok(badgesOf(offers, "clean").includes("fewest-contingencies"));
  assert.ok(!badgesOf(offers, "normal").includes("fewest-contingencies"));
});

test("ties award the badge to everyone tied", () => {
  const offers = [
    offer("a", { purchasePrice: 900_000 }),
    offer("b", { purchasePrice: 900_000 }),
    offer("c", { purchasePrice: 800_000 }),
  ];
  assert.ok(badgesOf(offers, "a").includes("highest-price"));
  assert.ok(badgesOf(offers, "b").includes("highest-price"));
  assert.ok(!badgesOf(offers, "c").includes("highest-price"));
});

test("a measure every offer ties on awards nothing", () => {
  const offers = [offer("a"), offer("b"), offer("c")];
  assert.deepEqual(badgesOf(offers, "a"), []);
  assert.deepEqual(badgesOf(offers, "b"), []);
});

test("a hidden offer drops out of the comparison entirely", () => {
  // Hiding the top bid should hand Highest Price to the next one down.
  const offers = [
    offer("top", { purchasePrice: 900_000, hidden: true }),
    offer("mid", { purchasePrice: 870_000 }),
    offer("low", { purchasePrice: 840_000 }),
  ];

  assert.deepEqual(badgesOf(offers, "top"), [], "hidden offers earn nothing");
  assert.ok(badgesOf(offers, "mid").includes("highest-price"));
});

test("a slot with no price is still blank and takes no part", () => {
  const offers = [
    offer("filled", { purchasePrice: 870_000, contingencies: ["appraisal"] }),
    offer("other", { purchasePrice: 850_000 }),
    offer("blank", { purchasePrice: null, contingencies: [] }),
  ];

  assert.equal(isInPlay(offers[2]), false);
  assert.deepEqual(badgesOf(offers, "blank"), []);
  // The blank slot's empty contingency list must not steal the badge.
  assert.ok(badgesOf(offers, "filled").includes("fewest-contingencies"));
});

test("fewer than two offers in play means no badges at all", () => {
  assert.deepEqual(badgesOf([offer("solo", { financingType: "Cash" })], "solo"), []);

  const oneHidden = [offer("a"), offer("b", { hidden: true })];
  assert.deepEqual(badgesOf(oneHidden, "a"), []);
});

test("badges always come back in a fixed order", () => {
  const offers = [
    offer("best", {
      purchasePrice: 900_000,
      closingDate: "2026-09-30",
      financingType: "Cash",
      contingencies: [],
    }),
    offer("rest", { purchasePrice: 820_000, closingDate: "2026-12-01" }),
  ];

  assert.deepEqual(badgesOf(offers, "best"), [
    "highest-net",
    "highest-price",
    "fastest-close",
    "all-cash",
    "fewest-contingencies",
  ]);
});

test("dates parse locally and count whole days", () => {
  const date = parseISODate("2026-10-15");
  assert.equal(date?.getMonth(), 9, "October, not shifted by a timezone");
  assert.equal(parseISODate("2026-02-31"), null);

  const today = new Date(2026, 8, 15); // 15 September 2026
  assert.equal(daysUntil("2026-10-15", today), 30, "a 30-day close");
  assert.equal(daysUntil("", today), null);
});

/* -------------------------------------------------------------------------- */
/* Net proceeds — what the seller is actually choosing on                      */
/* -------------------------------------------------------------------------- */

test("net proceeds subtract commission, title and escrow, concessions and payoff", () => {
  const math = offerMath(offer("a", { purchasePrice: 800_000, sellerConcessions: 10_000 }), {
    commissionPct: 5,
    closingCostPct: 1.2,
    mortgagePayoff: 300_000,
  })!;

  assert.equal(math.commission, 40_000);
  assert.equal(math.closingCosts, 9_600);
  assert.equal(math.concessions, 10_000);
  assert.equal(math.payoff, 300_000);
  assert.equal(math.netProceeds, 440_400);
});

test("an unpriced slot has no net at all", () => {
  assert.equal(offerMath(offer("blank", { purchasePrice: null }), DEFAULT_SELLER_COSTS), null);
});

test("the top bid can lose on net once concessions land", () => {
  // The whole reason a listing agent needs this board rather than a price list.
  const offers = [
    offer("loud", { purchasePrice: 900_000, sellerConcessions: 25_000 }),
    offer("quiet", { purchasePrice: 885_000, sellerConcessions: 0 }),
  ];

  const badges = awardBadges(offers, DEFAULT_SELLER_COSTS);
  assert.deepEqual(badges.loud, ["highest-price"], "bids the most");
  assert.deepEqual(badges.quiet, ["highest-net"], "but this one pays the seller more");
});

test("the payoff shifts every net equally and never changes the winner", () => {
  const offers = [
    offer("a", { purchasePrice: 900_000 }),
    offer("b", { purchasePrice: 850_000 }),
  ];
  const withPayoff = awardBadges(offers, { ...DEFAULT_SELLER_COSTS, mortgagePayoff: 400_000 });
  const without = awardBadges(offers, DEFAULT_SELLER_COSTS);

  assert.deepEqual(withPayoff.a, without.a);
  assert.deepEqual(withPayoff.b, without.b);
});
