import assert from "node:assert/strict";
import { test } from "node:test";

import {
  collectDeadlines,
  createDeal,
  filterDeals,
  groupDeadlines,
  hasLiveDeadlines,
  pipeline,
  toolsFor,
  urgencyOf,
  type Deal,
  type DealStage,
} from "./schema.ts";
import type { DerivedMilestone } from "../timeline/schema.ts";

const deal = (over: Partial<Deal> = {}): Deal => ({
  ...createDeal(
    { address: "302 Bellwether Ave", side: "seller" },
    over.id ?? "d1",
    "2026-09-01T00:00:00Z",
  ),
  ...over,
});

const milestone = (over: Partial<DerivedMilestone> = {}): DerivedMilestone => ({
  id: "inspection",
  name: "Home inspection",
  offsetDays: 7,
  buyerNote: "",
  waitingOn: "the inspector",
  date: "2026-09-20",
  done: false,
  adjusted: false,
  status: "current",
  step: 3,
  ...over,
});

const TODAY = new Date(2026, 8, 15); // 15 September 2026

/* -------------------------------------------------------------------------- */
/* Which tools a deal shows                                                   */
/* -------------------------------------------------------------------------- */

test("the offer board is a listing tool, not a buyer tool", () => {
  // This is the fix: it only appears on a listing that is taking offers.
  assert.deepEqual(toolsFor(deal({ side: "seller", stage: "active" })), ["offers"]);
  assert.deepEqual(toolsFor(deal({ side: "buyer", stage: "active" })), []);
});

test("contract tools appear once something is under contract", () => {
  for (const side of ["buyer", "seller"] as const) {
    assert.deepEqual(toolsFor(deal({ side, stage: "under-contract" })), [
      "timeline",
      "inspection",
    ]);
  }
});

test("a listing under contract stops showing the offer board", () => {
  // The offers are decided; what matters now is the contract dates.
  assert.ok(!toolsFor(deal({ side: "seller", stage: "under-contract" })).includes("offers"));
});

test("a prospect shows no tools at all", () => {
  assert.deepEqual(toolsFor(deal({ side: "seller", stage: "prospect" })), []);
  assert.deepEqual(toolsFor(deal({ side: "buyer", stage: "prospect" })), []);
});

test("only deals under contract carry live deadlines", () => {
  const stages: DealStage[] = ["prospect", "active", "under-contract", "closed"];
  const live = stages.filter((stage) => hasLiveDeadlines(deal({ stage })));
  assert.deepEqual(live, ["under-contract"]);
});

/* -------------------------------------------------------------------------- */
/* Deadlines                                                                  */
/* -------------------------------------------------------------------------- */

test("urgency splits overdue, today, this week and later", () => {
  assert.equal(urgencyOf(-1), "overdue");
  assert.equal(urgencyOf(0), "today");
  assert.equal(urgencyOf(7), "soon");
  assert.equal(urgencyOf(8), "later");
});

test("deadlines come only from deals under contract", () => {
  const deals = [
    deal({ id: "live", stage: "under-contract" }),
    deal({ id: "listing", stage: "active" }),
    deal({ id: "done", stage: "closed" }),
  ];

  const found = collectDeadlines(deals, () => [milestone()], TODAY);
  assert.deepEqual(found.map((d) => d.dealId), ["live"]);
});

test("completed and undated milestones are not deadlines", () => {
  const deals = [deal({ stage: "under-contract" })];
  const milestones = [
    milestone({ id: "a", done: true }),
    milestone({ id: "b", date: null }),
    milestone({ id: "c", date: "2026-09-18" }),
  ];

  const found = collectDeadlines(deals, () => milestones, TODAY);
  assert.deepEqual(found.map((d) => d.milestone.id), ["c"]);
});

test("overdue always surfaces; the future is capped by the horizon", () => {
  const deals = [deal({ stage: "under-contract" })];
  const milestones = [
    milestone({ id: "ancient", date: "2026-06-01" }),
    milestone({ id: "far", date: "2027-01-01" }),
    milestone({ id: "soon", date: "2026-09-16" }),
  ];

  const found = collectDeadlines(deals, () => milestones, TODAY, 21);
  assert.deepEqual(found.map((d) => d.milestone.id), ["ancient", "soon"]);
  assert.equal(found[0].urgency, "overdue");
});

test("deadlines sort by date, then by step within a day", () => {
  const deals = [deal({ stage: "under-contract" })];
  const milestones = [
    milestone({ id: "later-step", date: "2026-09-18", step: 5 }),
    milestone({ id: "earlier-step", date: "2026-09-18", step: 2 }),
    milestone({ id: "tomorrow", date: "2026-09-16", step: 9 }),
  ];

  const found = collectDeadlines(deals, () => milestones, TODAY);
  assert.deepEqual(found.map((d) => d.milestone.id), [
    "tomorrow",
    "earlier-step",
    "later-step",
  ]);
});

test("deadlines carry the deal they belong to", () => {
  const deals = [
    deal({
      id: "bellwether",
      stage: "under-contract",
      address: "302 Bellwether Ave",
      clientName: "Ada Okonkwo",
      side: "buyer",
    }),
  ];

  const [found] = collectDeadlines(deals, () => [milestone()], TODAY);
  assert.equal(found.address, "302 Bellwether Ave");
  assert.equal(found.clientName, "Ada Okonkwo");
  assert.equal(found.side, "buyer");
  assert.equal(found.daysOut, 5);
});

test("grouping drops empty urgency buckets and keeps the order", () => {
  const deals = [deal({ stage: "under-contract" })];
  const groups = groupDeadlines(
    collectDeadlines(
      deals,
      () => [
        milestone({ id: "late", date: "2026-09-10" }),
        milestone({ id: "now", date: "2026-09-15" }),
      ],
      TODAY,
    ),
  );

  assert.deepEqual(groups.map((g) => g.urgency), ["overdue", "today"]);
});

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

test("pipeline counts by stage and totals what is under contract", () => {
  const summary = pipeline([
    deal({ id: "a", stage: "active", price: 500_000 }),
    deal({ id: "b", stage: "under-contract", price: 865_000 }),
    deal({ id: "c", stage: "under-contract", price: 420_000 }),
    deal({ id: "d", stage: "closed", price: 700_000 }),
  ]);

  assert.equal(summary.activeCount, 1);
  assert.equal(summary.underContractCount, 2);
  assert.equal(summary.underContractValue, 1_285_000);
  assert.equal(summary.byStage.closed.length, 1);
  assert.equal(summary.byStage.prospect.length, 0);
});

test("a deal with no price does not break the pipeline total", () => {
  const summary = pipeline([deal({ stage: "under-contract", price: null })]);
  assert.equal(summary.underContractValue, 0);
});

test("search matches address, client, side and stage", () => {
  const deals = [
    deal({ id: "a", address: "302 Bellwether Ave", clientName: "Ada Okonkwo" }),
    deal({ id: "b", address: "91 Sumac Rd", clientName: "Dana Whitfield", side: "buyer" }),
  ];

  assert.deepEqual(filterDeals(deals, "bellwether").map((d) => d.id), ["a"]);
  assert.deepEqual(filterDeals(deals, "whitfield").map((d) => d.id), ["b"]);
  assert.deepEqual(filterDeals(deals, "buyer").map((d) => d.id), ["b"]);
  assert.deepEqual(filterDeals(deals, "  ").length, 2);
  assert.deepEqual(filterDeals(deals, "zzz"), []);
});
