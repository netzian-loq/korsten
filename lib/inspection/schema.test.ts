import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bucketFindings,
  buildAddendum,
  resolutionSentence,
  toFinding,
  toFindings,
  totals,
  type InspectionFinding,
  type InspectionReport,
} from "./schema.ts";

const raw = (over: Record<string, unknown> = {}) => ({
  title: "Double-tapped breakers",
  location: "Garage",
  detail: "Two circuits on one lug.",
  severity: "critical",
  reference: "p. 14",
  estimatedCost: 0,
  ...over,
});

const finding = (over: Partial<InspectionFinding> = {}): InspectionFinding => ({
  ...toFinding(raw(), 0)!,
  ...over,
});

test("critical and major default to included, cosmetic does not", () => {
  assert.equal(toFinding(raw({ severity: "critical" }), 0)?.included, true);
  assert.equal(toFinding(raw({ severity: "major" }), 1)?.included, true);
  assert.equal(toFinding(raw({ severity: "cosmetic" }), 2)?.included, false);
});

test("cosmetic items default to no action, others to repair", () => {
  assert.equal(toFinding(raw({ severity: "cosmetic" }), 0)?.resolution, "none");
  assert.equal(toFinding(raw({ severity: "major" }), 1)?.resolution, "repair");
});

test("a cost is kept only when the report stated one", () => {
  assert.equal(toFinding(raw({ estimatedCost: 14500 }), 0)?.estimatedCost, 14500);
  assert.equal(toFinding(raw({ estimatedCost: 0 }), 0)?.estimatedCost, null);
  assert.equal(toFinding(raw({ estimatedCost: "lots" }), 0)?.estimatedCost, null);
});

test("an unknown severity lands in major rather than being dropped or escalated", () => {
  const parsed = toFinding(raw({ severity: "urgent" }), 0);
  assert.equal(parsed?.severity, "major");
  assert.equal(parsed?.included, true);
});

test("a row with no title is skipped without losing the rest", () => {
  const parsed = toFindings([raw(), { location: "Nowhere" }, raw({ title: "Roof" })]);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed.map((f) => f.title), ["Double-tapped breakers", "Roof"]);
});

test("non-array input yields no findings rather than throwing", () => {
  assert.deepEqual(toFindings(null), []);
  assert.deepEqual(toFindings("nope"), []);
});

test("buckets come back in severity order with their included counts", () => {
  const buckets = bucketFindings([
    finding({ id: "a", severity: "cosmetic", included: false }),
    finding({ id: "b", severity: "critical", included: true }),
    finding({ id: "c", severity: "major", included: true }),
    finding({ id: "d", severity: "major", included: false }),
  ]);

  assert.deepEqual(buckets.map((b) => b.severity), ["critical", "major", "cosmetic"]);
  assert.equal(buckets[1].findings.length, 2);
  assert.equal(buckets[1].includedCount, 1);
});

test("totals only count money from resolutions that ask for money", () => {
  const summary = totals([
    finding({ id: "a", included: true, resolution: "credit", requestedAmount: 3000 }),
    finding({ id: "b", included: true, resolution: "price-reduction", requestedAmount: 1500 }),
    // A repair asks for work, not dollars — its amount must not be counted.
    finding({ id: "c", included: true, resolution: "repair", requestedAmount: 9999 }),
    // Excluded items never count.
    finding({ id: "d", included: false, resolution: "credit", requestedAmount: 5000 }),
  ]);

  assert.equal(summary.includedCount, 3);
  assert.equal(summary.requestedTotal, 4500);
  assert.equal(summary.repairCount, 1);
});

test("a credit with no amount reads as to-be-agreed rather than $0", () => {
  assert.match(
    resolutionSentence(finding({ resolution: "credit", requestedAmount: null })),
    /an amount to be agreed/,
  );
  assert.match(
    resolutionSentence(finding({ resolution: "credit", requestedAmount: 3000 })),
    /\$3,000/,
  );
});

/* -------------------------------------------------------------------------- */
/* The addendum                                                               */
/* -------------------------------------------------------------------------- */

const report = (findings: InspectionFinding[]): InspectionReport => ({
  id: "r1",
  propertyAddress: "302 Bellwether Ave",
  inspectionDate: "2026-09-21",
  sourceFileName: "report.pdf",
  extractedAt: "2026-09-22T00:00:00Z",
  source: "sample",
  findings,
});

test("the addendum carries only included items", () => {
  const text = buildAddendum(
    report([
      finding({ id: "a", title: "Panel is unsafe", included: true }),
      finding({ id: "b", title: "Scuffed paint", severity: "cosmetic", included: false }),
    ]),
  );

  assert.match(text, /Panel is unsafe/);
  assert.doesNotMatch(text, /Scuffed paint/);
});

test("agent notes never reach the addendum", () => {
  // They are the agent's own shorthand, not something to send the other side.
  const text = buildAddendum(
    report([finding({ included: true, agentNote: "seller is desperate, push hard" })]),
  );
  assert.doesNotMatch(text, /desperate/);
});

test("items are numbered continuously across sections", () => {
  const text = buildAddendum(
    report([
      finding({ id: "a", title: "Alpha", severity: "critical", included: true }),
      finding({ id: "b", title: "Bravo", severity: "major", included: true }),
      finding({ id: "c", title: "Charlie", severity: "cosmetic", included: true }),
    ]),
  );

  assert.match(text, /1\. Alpha/);
  assert.match(text, /2\. Bravo/);
  assert.match(text, /3\. Charlie/);
});

test("the addendum totals the money actually requested", () => {
  const text = buildAddendum(
    report([
      finding({ id: "a", included: true, resolution: "credit", requestedAmount: 2500 }),
      finding({ id: "b", included: true, resolution: "repair", requestedAmount: 999 }),
    ]),
  );

  assert.match(text, /Total credits and reductions requested: \$2,500/);
});

test("an addendum with nothing selected says so instead of looking broken", () => {
  const text = buildAddendum(report([finding({ included: false })]));
  assert.match(text, /No items are being requested/);
  assert.doesNotMatch(text, /Total credits/);
});

test("a missing address leaves a fill-in blank rather than an empty line", () => {
  const text = buildAddendum({ ...report([]), propertyAddress: "", inspectionDate: "" });
  assert.match(text, /\[property address\]/);
  assert.match(text, /\[inspection date\]/);
});
