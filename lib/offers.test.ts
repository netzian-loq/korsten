import assert from "node:assert/strict";
import { test } from "node:test";

import {
  awardBadges,
  boardVerdict,
  calculateOffer,
  dateRank,
  isComplete,
  daysUntil,
  DEFAULT_SELLER_COSTS,
  parseISODate,
  SEED_OFFERS,
  type Offer,
  type SellerCosts,
} from "./offers.ts";

/** Money maths in floating point: compare to the cent, not to the bit. */
const closeTo = (actual: number, expected: number, message?: string) =>
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    message ?? `expected ${actual} to be within a cent of ${expected}`,
  );

const COSTS: SellerCosts = DEFAULT_SELLER_COSTS;

const offerOf = (id: string, overrides: Partial<Offer> = {}): Offer => ({
  id,
  label: id,
  purchasePrice: 800_000,
  downPaymentPct: 20,
  contingencyDays: 10,
  closingDate: "2026-10-01",
  financingType: "Conventional",
  sellerConcessions: 0,
  ...overrides,
});

const badgesFor = (offers: Offer[], id: string) => awardBadges(offers, COSTS)[id];

test("net proceeds subtract commission, closing costs, concessions and payoff", () => {
  const [nakamura] = SEED_OFFERS;
  const math = calculateOffer(nakamura, COSTS);

  closeTo(math.commission, 43_600, "5% of 872,000");
  closeTo(math.closingCosts, 10_464, "1.2% of 872,000");
  closeTo(math.concessions, 0);
  closeTo(math.payoff, 415_000);
  closeTo(math.totalDeductions, 469_064);
  closeTo(math.netProceeds, 402_936);
});

test("concessions come straight off the seller's net", () => {
  const base = offerOf("base");
  const withConcessions = offerOf("with", { sellerConcessions: 12_000 });

  const delta =
    calculateOffer(base, COSTS).netProceeds -
    calculateOffer(withConcessions, COSTS).netProceeds;

  closeTo(delta, 12_000);
});

test("down payment splits the price into cash down and loan", () => {
  const conventional = calculateOffer(offerOf("c", { downPaymentPct: 25 }), COSTS);
  closeTo(conventional.downPayment, 200_000);
  closeTo(conventional.loanAmount, 600_000);

  const cash = calculateOffer(offerOf("cash", { downPaymentPct: 100 }), COSTS);
  closeTo(cash.downPayment, 800_000);
  closeTo(cash.loanAmount, 0);
});

test("a down payment percentage outside 0-100 is clamped", () => {
  closeTo(calculateOffer(offerOf("hi", { downPaymentPct: 140 }), COSTS).downPayment, 800_000);
  closeTo(calculateOffer(offerOf("lo", { downPaymentPct: -20 }), COSTS).downPayment, 0);
});

test("net proceeds go negative when the payoff exceeds the sale", () => {
  const underwater = calculateOffer(offerOf("u", { purchasePrice: 300_000 }), COSTS);
  assert.ok(underwater.netProceeds < 0, "300k sale against a 415k payoff");
});

test("the highest price is not the highest net — the whole point of the board", () => {
  const byNet = SEED_OFFERS.map((offer) => ({
    label: offer.label,
    price: offer.purchasePrice,
    net: calculateOffer(offer, COSTS).netProceeds,
  }));

  const topPrice = byNet.reduce((a, b) => (b.price > a.price ? b : a));
  const topNet = byNet.reduce((a, b) => (b.net > a.net ? b : a));

  assert.equal(topPrice.label, "Whitmore", "Whitmore bids the most");
  assert.equal(topNet.label, "Nakamura", "Nakamura still nets the most");
  assert.notEqual(topPrice.label, topNet.label);
  closeTo(topNet.net - byNet.find((o) => o.label === "Whitmore")!.net, 6_426);
});

test("the seed board awards each badge to the right offer", () => {
  assert.deepEqual(badgesFor(SEED_OFFERS, "offer-nakamura"), ["highest-net"]);
  assert.deepEqual(badgesFor(SEED_OFFERS, "offer-whitmore"), ["highest-price"]);
  assert.deepEqual(badgesFor(SEED_OFFERS, "offer-delgado"), [
    "fastest-close",
    "shortest-inspection",
    "all-cash",
  ]);
});

test("ties award the badge to everyone tied", () => {
  const offers = [
    offerOf("a", { purchasePrice: 900_000 }),
    offerOf("b", { purchasePrice: 900_000 }),
    offerOf("c", { purchasePrice: 700_000 }),
  ];
  const badges = awardBadges(offers, COSTS);

  assert.ok(badges.a.includes("highest-price"));
  assert.ok(badges.b.includes("highest-price"));
  assert.ok(!badges.c.includes("highest-price"));
});

test("a measure every offer ties on awards nothing", () => {
  const offers = [offerOf("a"), offerOf("b"), offerOf("c")];
  const badges = awardBadges(offers, COSTS);

  // Identical terms: no price, net, close, or inspection badge anywhere.
  assert.deepEqual(badges.a, []);
  assert.deepEqual(badges.b, []);
  assert.deepEqual(badges.c, []);
});

test("all-cash is suppressed when every offer is cash", () => {
  const mixed = [
    offerOf("cash", { financingType: "Cash" }),
    offerOf("loan", { financingType: "FHA" }),
  ];
  assert.ok(awardBadges(mixed, COSTS).cash.includes("all-cash"));

  const allCash = [
    offerOf("one", { financingType: "Cash" }),
    offerOf("two", { financingType: "Cash" }),
  ];
  assert.ok(!awardBadges(allCash, COSTS).one.includes("all-cash"));
});

test("a single offer earns no badges", () => {
  const solo = [offerOf("only", { financingType: "Cash" })];
  assert.deepEqual(awardBadges(solo, COSTS).only, []);
});

test("offers with no closing date are skipped for fastest close", () => {
  const offers = [
    offerOf("dated", { closingDate: "2026-09-10" }),
    offerOf("blank", { closingDate: "" }),
  ];
  const badges = awardBadges(offers, COSTS);

  assert.ok(!badges.dated.includes("fastest-close"), "only one comparable date");
  assert.ok(!badges.blank.includes("fastest-close"));
});

test("changing the commission rate moves every net together", () => {
  const cheaper: SellerCosts = { ...COSTS, commissionPct: 4 };

  for (const offer of SEED_OFFERS) {
    const delta =
      calculateOffer(offer, cheaper).netProceeds -
      calculateOffer(offer, COSTS).netProceeds;
    closeTo(delta, offer.purchasePrice * 0.01);
  }
});

test("parseISODate reads local dates and rejects impossible ones", () => {
  const date = parseISODate("2026-10-02");
  assert.equal(date?.getFullYear(), 2026);
  assert.equal(date?.getMonth(), 9, "October is month 9");
  assert.equal(date?.getDate(), 2, "not shifted by a timezone");

  assert.equal(parseISODate("2026-02-31"), null, "February has no 31st");
  assert.equal(parseISODate("not-a-date"), null);
  assert.equal(parseISODate(""), null);
});

test("daysUntil counts whole days from today", () => {
  const today = new Date(2026, 8, 1); // 1 September 2026
  assert.equal(daysUntil("2026-09-18", today), 17);
  assert.equal(daysUntil("2026-10-02", today), 31);
  assert.equal(daysUntil("2026-09-01", today), 0);
  assert.equal(daysUntil("2026-08-30", today), -2, "a date already past");
  assert.equal(daysUntil("", today), null);
});

test("daysUntil is unaffected by the time of day", () => {
  const morning = new Date(2026, 8, 1, 6, 0, 0);
  const night = new Date(2026, 8, 1, 23, 59, 0);
  assert.equal(daysUntil("2026-09-18", morning), daysUntil("2026-09-18", night));
});

test("dateRank sorts dates without touching timezones", () => {
  assert.ok(dateRank("2026-09-18")! < dateRank("2026-10-02")!);
  assert.equal(dateRank("bad"), null);
});

test("the verdict reports a split when the top bid is not the top net", () => {
  const verdict = boardVerdict(SEED_OFFERS, COSTS);

  assert.equal(verdict.kind, "split");
  if (verdict.kind !== "split") return;
  assert.equal(verdict.topPriceLabel, "Whitmore");
  assert.equal(verdict.topNetLabel, "Nakamura");
  closeTo(verdict.gap, 6_426);
});

test("the verdict reports alignment once the top bid also nets the most", () => {
  // Drop Whitmore's concessions and the highest price wins on net too.
  const offers = SEED_OFFERS.map((offer) =>
    offer.id === "offer-whitmore" ? { ...offer, sellerConcessions: 0 } : offer,
  );
  const verdict = boardVerdict(offers, COSTS);

  assert.equal(verdict.kind, "aligned");
  if (verdict.kind !== "aligned") return;
  assert.equal(verdict.label, "Whitmore");
});

test("the verdict degrades cleanly with nothing to compare", () => {
  assert.deepEqual(boardVerdict([], COSTS), { kind: "empty" });
  assert.deepEqual(boardVerdict([offerOf("solo")], COSTS), { kind: "single" });
});

test("a column with no price takes no part in the ranking", () => {
  const placeholder = offerOf("blank", { purchasePrice: 0, contingencyDays: 1 });
  const offers = [...SEED_OFFERS, placeholder];
  const badges = awardBadges(offers, COSTS);

  // Its default 1-day window would otherwise steal the inspection badge.
  assert.deepEqual(badges.blank, [], "placeholder earns nothing");
  assert.deepEqual(badges["offer-delgado"], [
    "fastest-close",
    "shortest-inspection",
    "all-cash",
  ]);
  assert.deepEqual(badges["offer-nakamura"], ["highest-net"]);
  assert.deepEqual(badges["offer-whitmore"], ["highest-price"]);
});

test("the verdict ignores unpriced columns", () => {
  const blank = offerOf("blank", { purchasePrice: 0 });

  assert.deepEqual(boardVerdict([blank], COSTS), { kind: "empty" });
  assert.deepEqual(boardVerdict([blank, offerOf("one")], COSTS), {
    kind: "single",
  });
  assert.equal(boardVerdict([...SEED_OFFERS, blank], COSTS).kind, "split");
});

test("isComplete gates on a price being entered", () => {
  assert.equal(isComplete(offerOf("priced")), true);
  assert.equal(isComplete(offerOf("blank", { purchasePrice: 0 })), false);
});
