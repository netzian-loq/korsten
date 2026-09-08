import assert from "node:assert/strict";
import { test } from "node:test";

import {
  budgetDomain,
  filterClients,
  isActiveDeal,
  summarizeActiveDeals,
  type Client,
} from "./client-model.ts";

const make = (
  id: string,
  fullName: string,
  status: Client["status"],
  budgetMin: number,
  budgetMax: number,
  preferredLocations: string[] = [],
  houseStyles: string[] = [],
): Client => ({
  id,
  fullName,
  phone: "(503) 555-0100",
  email: `${id}@example.com`,
  budgetMin,
  budgetMax,
  preferredLocations,
  houseStyles,
  status,
});

const ROSTER: Client[] = [
  make("ada", "Ada Okonkwo", "Viewing", 540_000, 680_000, ["Sellwood"], ["Ranch"]),
  make("dana", "Dana Whitfield", "Viewing", 1_200_000, 1_600_000, ["Irvington"], ["Tudor"]),
  make("marisol", "Marisol Reyes", "Under Contract", 780_000, 950_000, ["Alberta"], ["Craftsman"]),
  make("priya", "Priya Raghunathan", "Lead", 425_000, 525_000, ["St. Johns"], ["Bungalow"]),
  make("tobias", "Tobias Lindqvist", "Lead", 2_100_000, 2_800_000, ["West Hills"], ["Contemporary"]),
];

const names = (clients: Client[]) => clients.map((c) => c.fullName);

test("isActiveDeal covers everything past the lead stage", () => {
  assert.equal(isActiveDeal(ROSTER[0]), true, "Viewing is active");
  assert.equal(isActiveDeal(ROSTER[2]), true, "Under Contract is active");
  assert.equal(isActiveDeal(ROSTER[3]), false, "Lead is not active");
});

test("the all filter with an empty query returns the whole roster", () => {
  assert.deepEqual(filterClients(ROSTER, "all", ""), ROSTER);
  assert.deepEqual(filterClients(ROSTER, "all", "   "), ROSTER);
});

test("status filters return only that status", () => {
  assert.deepEqual(names(filterClients(ROSTER, "Lead", "")), [
    "Priya Raghunathan",
    "Tobias Lindqvist",
  ]);
  assert.deepEqual(names(filterClients(ROSTER, "Under Contract", "")), [
    "Marisol Reyes",
  ]);
});

test("the active filter spans Viewing and Under Contract", () => {
  assert.deepEqual(names(filterClients(ROSTER, "active", "")), [
    "Ada Okonkwo",
    "Dana Whitfield",
    "Marisol Reyes",
  ]);
});

test("search matches name, email, neighbourhood, style and status", () => {
  assert.deepEqual(names(filterClients(ROSTER, "all", "sellwood")), [
    "Ada Okonkwo",
  ]);
  assert.deepEqual(names(filterClients(ROSTER, "all", "craftsman")), [
    "Marisol Reyes",
  ]);
  assert.deepEqual(names(filterClients(ROSTER, "all", "whitfield")), [
    "Dana Whitfield",
  ]);
  assert.deepEqual(names(filterClients(ROSTER, "all", "priya@example.com")), [
    "Priya Raghunathan",
  ]);
  assert.deepEqual(names(filterClients(ROSTER, "all", "under contract")), [
    "Marisol Reyes",
  ]);
});

test("search is case and whitespace insensitive, and can miss", () => {
  assert.deepEqual(names(filterClients(ROSTER, "all", "  ALBERTA ")), [
    "Marisol Reyes",
  ]);
  assert.deepEqual(filterClients(ROSTER, "all", "zzzz"), []);
});

test("search and filter compose", () => {
  // Tobias matches the query but is a Lead, so the active filter excludes him.
  assert.deepEqual(filterClients(ROSTER, "active", "west hills"), []);
  assert.deepEqual(names(filterClients(ROSTER, "Lead", "west hills")), [
    "Tobias Lindqvist",
  ]);
});

test("budgetDomain spans the lowest floor to the highest ceiling", () => {
  assert.deepEqual(budgetDomain(ROSTER), { min: 425_000, max: 2_800_000 });
});

test("budgetDomain stays divisible when the roster is empty", () => {
  const domain = budgetDomain([]);
  assert.equal(domain.max - domain.min > 0, true);
});

test("summarizeActiveDeals counts every status and totals the live budgets", () => {
  const { deals, inPlay, countsByStatus } = summarizeActiveDeals(ROSTER);

  assert.deepEqual(countsByStatus, {
    Lead: 2,
    Viewing: 2,
    "Under Contract": 1,
  });
  assert.equal(deals.length, 3);

  // 540k + 1.2M + 780k, and 680k + 1.6M + 950k.
  assert.deepEqual(inPlay, { min: 2_520_000, max: 3_230_000 });
});

test("summarizeActiveDeals handles an empty roster", () => {
  assert.deepEqual(summarizeActiveDeals([]), {
    deals: [],
    inPlay: { min: 0, max: 0 },
    countsByStatus: { Lead: 0, Viewing: 0, "Under Contract": 0 },
  });
});
