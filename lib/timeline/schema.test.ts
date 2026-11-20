import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeProgress,
  encodeProgress,
  fingerprint,
  shareUrl,
  tokenFromHash,
} from "./share-link.ts";
import {
  addStep,
  deriveMilestones,
  moveStep,
  outOfOrderSteps,
  parseTimelinePreset,
  removeStep,
  sanitizeSteps,
  setMilestoneDone,
  sortStepsByDay,
  summarize,
  updateStep,
  type ClientProgress,
  type TimelinePreset,
} from "./schema.ts";

const milestone = (id: string, offsetDays: number) => ({
  id,
  name: id,
  offsetDays,
  buyerNote: "note",
  waitingOn: "someone",
});

const PRESET: TimelinePreset = {
  id: "demo",
  name: "Demo",
  summary: "",
  closingDays: 30,
  milestones: [
    milestone("accepted", 0),
    milestone("inspection", 7),
    milestone("appraisal", 16),
    milestone("closing", 30),
  ],
};

const progress = (over: Partial<ClientProgress> = {}): ClientProgress => ({
  id: "p1",
  buyerName: "Ada Okonkwo",
  propertyAddress: "302 Bellwether Ave",
  presetId: "demo",
  acceptedDate: "2026-09-13",
  milestones: {},
  createdAt: "2026-09-13T00:00:00Z",
  ...over,
});

test("one accepted date populates every downstream target", () => {
  const dates = deriveMilestones(progress(), PRESET).map((m) => m.date);
  assert.deepEqual(dates, ["2026-09-13", "2026-09-20", "2026-09-29", "2026-10-13"]);
});

test("offsets roll across month boundaries correctly", () => {
  const derived = deriveMilestones(progress({ acceptedDate: "2026-12-20" }), PRESET);
  assert.equal(derived[3].date, "2027-01-19", "30 days on from 20 December");
});

test("an agent override replaces the calculated date and is flagged adjusted", () => {
  const derived = deriveMilestones(
    progress({ milestones: { inspection: { date: "2026-09-22" } } }),
    PRESET,
  );

  assert.equal(derived[1].date, "2026-09-22");
  assert.equal(derived[1].adjusted, true);
  assert.equal(derived[0].adjusted, false, "untouched milestones are not adjusted");
});

test("an override that matches the calculated date is not flagged adjusted", () => {
  const derived = deriveMilestones(
    progress({ milestones: { inspection: { date: "2026-09-20" } } }),
    PRESET,
  );
  assert.equal(derived[1].adjusted, false);
});

test("exactly one milestone is current — the first not done", () => {
  const derived = deriveMilestones(
    progress({ milestones: { accepted: { done: true } } }),
    PRESET,
  );

  assert.deepEqual(derived.map((m) => m.status), [
    "done",
    "current",
    "upcoming",
    "upcoming",
  ]);
  assert.equal(derived.filter((m) => m.status === "current").length, 1);
});

test("ticking a step completes everything before it", () => {
  // No gaps: a half-finished timeline would put "you are here" somewhere untrue.
  const next = setMilestoneDone(progress(), PRESET, "appraisal", true);
  const derived = deriveMilestones(next, PRESET);

  assert.deepEqual(derived.map((m) => m.done), [true, true, true, false]);
  assert.equal(derived[3].status, "current");
});

test("un-ticking a step reopens everything after it", () => {
  const allDone = setMilestoneDone(progress(), PRESET, "closing", true);
  const reopened = setMilestoneDone(allDone, PRESET, "inspection", false);
  const derived = deriveMilestones(reopened, PRESET);

  assert.deepEqual(derived.map((m) => m.done), [true, false, false, false]);
  assert.equal(derived[1].status, "current");
});

test("summarize counts progress and reports the closing date", () => {
  const done = setMilestoneDone(progress(), PRESET, "inspection", true);
  const summary = summarize(deriveMilestones(done, PRESET));

  assert.equal(summary.done, 2);
  assert.equal(summary.total, 4);
  assert.equal(summary.percent, 50);
  assert.equal(summary.current?.id, "appraisal");
  assert.equal(summary.closingDate, "2026-10-13");
});

test("a finished timeline has no current milestone", () => {
  const allDone = setMilestoneDone(progress(), PRESET, "closing", true);
  const summary = summarize(deriveMilestones(allDone, PRESET));

  assert.equal(summary.percent, 100);
  assert.equal(summary.current, null);
});

test("no preset yields an empty timeline rather than throwing", () => {
  assert.deepEqual(deriveMilestones(progress(), null), []);
  assert.deepEqual(summarize([]), {
    done: 0,
    total: 0,
    percent: 0,
    current: null,
    closingDate: null,
  });
});

test("milestones out of date order are rejected by name", () => {
  const raw = {
    id: "bad",
    name: "Bad",
    summary: "s",
    milestones: [milestone("first", 10), milestone("second", 3)],
  };
  assert.throws(() => parseTimelinePreset(raw, "bad.json"), /before the milestone above it/);
});

test("duplicate milestone ids and missing fields are rejected", () => {
  const dupe = {
    id: "bad",
    name: "Bad",
    summary: "s",
    milestones: [milestone("same", 1), milestone("same", 2)],
  };
  assert.throws(() => parseTimelinePreset(dupe, "bad.json"), /used more than once/);

  const missing = {
    id: "bad",
    name: "Bad",
    summary: "s",
    milestones: [{ id: "x", offsetDays: 1, waitingOn: "w" }],
  };
  assert.throws(() => parseTimelinePreset(missing, "bad.json"), /"name"/);
});

test("closingDays comes from the last milestone", () => {
  const preset = parseTimelinePreset(
    {
      id: "p",
      name: "P",
      summary: "s",
      milestones: [milestone("a", 0), milestone("b", 21)],
    },
    "p.json",
  );
  assert.equal(preset.closingDays, 21);
});

/* -------------------------------------------------------------------------- */
/* Share links                                                                */
/* -------------------------------------------------------------------------- */

test("everything the buyer sees survives a round trip", () => {
  const original = setMilestoneDone(progress(), PRESET, "inspection", true);
  const decoded = decodeProgress(encodeProgress(original, "2026-09-14"))!;

  assert.equal(decoded.buyerName, original.buyerName);
  assert.equal(decoded.propertyAddress, original.propertyAddress);
  assert.equal(decoded.presetId, original.presetId);
  assert.equal(decoded.acceptedDate, original.acceptedDate);
  assert.deepEqual(decoded.milestones, original.milestones);
  assert.equal(decoded.sharedAt, "2026-09-14", "so the buyer can date it");
});

test("agent bookkeeping never rides along in a client link", () => {
  const original = progress();
  original.sharedFingerprint = "whatever-was-last-sent";

  const decoded = decodeProgress(encodeProgress(original, "2026-09-14"))!;
  assert.equal(decoded.sharedFingerprint, undefined);
});

test("the fingerprint tracks what the buyer would see, and nothing else", () => {
  const base = progress();
  assert.equal(fingerprint(base), fingerprint({ ...base }), "same content, same signature");

  // Recording a send must not itself look like a change.
  assert.equal(
    fingerprint({ ...base, sharedAt: "2026-09-14", sharedFingerprint: "x" }),
    fingerprint(base),
  );

  // A real edit must.
  const moved = setMilestoneDone(base, PRESET, "inspection", true);
  assert.notEqual(fingerprint(moved), fingerprint(base));
});

test("milestone key order does not change the fingerprint", () => {
  // Otherwise a re-save would falsely read as "out of date".
  const a = progress();
  a.milestones = { inspection: { done: true }, appraisal: { done: false } };
  const b = progress();
  b.milestones = { appraisal: { done: false }, inspection: { done: true } };

  assert.equal(fingerprint(a), fingerprint(b));
});

test("names outside ASCII survive encoding", () => {
  const original = progress({ buyerName: "José Müller-Nakamura 中村", propertyAddress: "12 Café Ln" });
  assert.equal(
    decodeProgress(encodeProgress(original, "2026-09-14"))?.buyerName,
    original.buyerName,
  );
});

test("the token is URL safe", () => {
  const token = encodeProgress(progress({ buyerName: "?&=#/+ tricky" }), "2026-09-14");
  assert.equal(/^[A-Za-z0-9_-]+$/.test(token), true, `not url safe: ${token}`);
});

test("a malformed or tampered token decodes to null rather than throwing", () => {
  for (const bad of ["", "!!!!", "abc", toBase64("not json"), toBase64('{"nope":1}')]) {
    assert.doesNotThrow(() => decodeProgress(bad));
    assert.equal(decodeProgress(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

function toBase64(text: string): string {
  return btoa(text).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

test("shareUrl points at /track and round-trips through the hash", () => {
  const deal = progress();
  const url = shareUrl("http://localhost:3000/", deal, "2026-09-14");

  assert.equal(url.startsWith("http://localhost:3000/track#d="), true, url);
  const hash = url.slice(url.indexOf("#"));
  assert.equal(decodeProgress(tokenFromHash(hash))?.acceptedDate, deal.acceptedDate);
});

test("a hash that is not ours yields no token", () => {
  assert.equal(tokenFromHash("#something-else"), "");
  assert.equal(tokenFromHash(""), "");
});

/* -------------------------------------------------------------------------- */
/* Editing the steps                                                          */
/* -------------------------------------------------------------------------- */

const names = (p: ClientProgress) => deriveMilestones(p, PRESET).map((m) => m.name);

test("renaming a step copies the preset onto the deal and leaves the preset alone", () => {
  const edited = updateStep(progress(), PRESET, "inspection", { name: "Walk-through with inspector" });

  assert.deepEqual(names(edited), ["accepted", "Walk-through with inspector", "appraisal", "closing"]);
  assert.equal(PRESET.milestones[1].name, "inspection", "the preset is never mutated");
});

test("a re-timed step moves its calculated date", () => {
  const edited = updateStep(progress(), PRESET, "inspection", { offsetDays: 10 });
  assert.equal(deriveMilestones(edited, PRESET)[1].date, "2026-09-23");
});

test("a new step lands at the end, on the last step's day", () => {
  const edited = addStep(progress(), PRESET, "keys");
  const derived = deriveMilestones(edited, PRESET);

  assert.equal(derived.length, 5);
  assert.equal(derived[4].id, "keys");
  assert.equal(derived[4].offsetDays, 30);
  assert.equal(derived[4].step, 5);
});

test("removing a step drops its recorded state too", () => {
  const ticked = setMilestoneDone(progress(), PRESET, "inspection", true);
  const edited = removeStep(ticked, PRESET, "inspection");

  assert.deepEqual(names(edited), ["accepted", "appraisal", "closing"]);
  assert.equal(edited.milestones.inspection, undefined);
});

test("the last remaining step cannot be removed", () => {
  let deal = progress({ steps: [milestone("only", 0)] });
  deal = removeStep(deal, PRESET, "only");
  assert.equal(deal.steps?.length, 1);
});

test("steps move up and down, and not off either end", () => {
  const up = moveStep(progress(), PRESET, "appraisal", -1);
  assert.deepEqual(names(up), ["accepted", "appraisal", "inspection", "closing"]);

  const stuck = moveStep(progress(), PRESET, "accepted", -1);
  assert.deepEqual(names(stuck), names(progress()));
});

test("out-of-order days are flagged, and sorting fixes them", () => {
  const moved = moveStep(progress(), PRESET, "appraisal", -1);
  const steps = moved.steps!;
  assert.deepEqual([...outOfOrderSteps(steps)], ["inspection"]);

  const sorted = sortStepsByDay(moved, PRESET);
  assert.deepEqual(names(sorted), ["accepted", "inspection", "appraisal", "closing"]);
  assert.equal(outOfOrderSteps(sorted.steps!).size, 0);
});

test("ticking a step works on the deal's own steps", () => {
  const edited = addStep(progress(), PRESET, "keys");
  const done = setMilestoneDone(edited, PRESET, "keys", true);
  assert.equal(summarize(deriveMilestones(done, PRESET)).done, 5);
});

test("custom steps ride along in the buyer's link", () => {
  const edited = updateStep(progress(), PRESET, "inspection", { name: "Inspector visit" });
  const decoded = decodeProgress(encodeProgress(edited, "2026-09-14"))!;

  assert.deepEqual(decoded.steps, edited.steps);
  // The buyer's page has no saved customisations; the link alone must do it.
  assert.equal(deriveMilestones(decoded, null)[1].name, "Inspector visit");
});

test("editing a step makes a sent link read as out of date", () => {
  const base = progress();
  const renamed = updateStep(base, PRESET, "closing", { name: "Keys!" });
  assert.notEqual(fingerprint(renamed), fingerprint(base));
});

test("a link without custom steps decodes with none", () => {
  assert.equal(decodeProgress(encodeProgress(progress(), "2026-09-14"))!.steps, undefined);
});

test("malformed steps are cleaned or dropped, never trusted", () => {
  assert.equal(sanitizeSteps("nope"), null);
  assert.equal(sanitizeSteps([]), null);
  assert.equal(sanitizeSteps([{ id: "x" }]), null, "no offset, no step");

  const clean = sanitizeSteps([
    { id: "a", name: "A", offsetDays: 2.6, buyerNote: 5, waitingOn: "w" },
    { id: "a", name: "duplicate", offsetDays: 3 },
    { id: "b", offsetDays: -4 },
  ]);
  assert.deepEqual(clean, [
    { id: "a", name: "A", offsetDays: 3, buyerNote: "", waitingOn: "w" },
    { id: "b", name: "", offsetDays: 0, buyerNote: "", waitingOn: "" },
  ]);
});
