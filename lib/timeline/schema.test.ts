import assert from "node:assert/strict";
import { test } from "node:test";

import { decodeProgress, encodeProgress, shareUrl, tokenFromHash } from "./share-link.ts";
import {
  deriveMilestones,
  parseTimelinePreset,
  setMilestoneDone,
  summarize,
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

test("a deal survives a round trip through a share link", () => {
  const original = setMilestoneDone(progress(), PRESET, "inspection", true);
  const decoded = decodeProgress(encodeProgress(original));

  assert.deepEqual(decoded, original);
});

test("names outside ASCII survive encoding", () => {
  const original = progress({ buyerName: "José Müller-Nakamura 中村", propertyAddress: "12 Café Ln" });
  assert.equal(decodeProgress(encodeProgress(original))?.buyerName, original.buyerName);
});

test("the token is URL safe", () => {
  const token = encodeProgress(progress({ buyerName: "?&=#/+ tricky" }));
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
  const url = shareUrl("http://localhost:3000/", deal);

  assert.equal(url.startsWith("http://localhost:3000/track#d="), true, url);
  const hash = url.slice(url.indexOf("#"));
  assert.deepEqual(decodeProgress(tokenFromHash(hash)), deal);
});

test("a hash that is not ours yields no token", () => {
  assert.equal(tokenFromHash("#something-else"), "");
  assert.equal(tokenFromHash(""), "");
});
