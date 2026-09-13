import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePreset } from "./schema.ts";

const valid = {
  id: "demo",
  name: "Demo",
  clientType: "Buyer",
  summary: "A preset.",
  categories: [
    {
      id: "intake",
      name: "Intake",
      tasks: [
        { id: "basics", kind: "field", label: "Add basics", hint: "What goes here." },
      ],
    },
  ],
};

const withTasks = (tasks: unknown[]) => ({
  ...valid,
  categories: [{ id: "intake", name: "Intake", tasks }],
});

test("a well-formed preset parses", () => {
  const preset = parsePreset(valid, "demo.json");
  assert.equal(preset.id, "demo");
  assert.equal(preset.clientType, "Buyer");
  assert.equal(preset.categories[0].tasks[0].kind, "field");
});

test("requiresSignature defaults to false rather than undefined", () => {
  const preset = parsePreset(valid, "demo.json");
  assert.equal(preset.categories[0].tasks[0].requiresSignature, false);
});

test("an unknown task kind is rejected by name", () => {
  const bad = withTasks([
    { id: "x", kind: "upload", label: "Upload", hint: "..." },
  ]);
  assert.throws(() => parsePreset(bad, "bad.json"), /kind "upload"/);
});

test("a duplicate task id is rejected — it would share saved progress", () => {
  const bad = withTasks([
    { id: "same", kind: "field", label: "One", hint: "..." },
    { id: "same", kind: "field", label: "Two", hint: "..." },
  ]);
  assert.throws(() => parsePreset(bad, "bad.json"), /used more than once/);
});

test("a missing label or hint is rejected", () => {
  assert.throws(
    () => parsePreset(withTasks([{ id: "x", kind: "field", hint: "..." }]), "bad.json"),
    /"label"/,
  );
  assert.throws(
    () => parsePreset(withTasks([{ id: "x", kind: "field", label: "L" }]), "bad.json"),
    /"hint"/,
  );
});

test("an unknown clientType is rejected", () => {
  assert.throws(
    () => parsePreset({ ...valid, clientType: "Renter" }, "bad.json"),
    /clientType "Renter"/,
  );
});

test("empty categories and empty task lists are rejected", () => {
  assert.throws(() => parsePreset({ ...valid, categories: [] }, "bad.json"), /at least one category/);
  assert.throws(() => parsePreset(withTasks([]), "bad.json"), /at least one task/);
});

test("every error names the file it came from", () => {
  assert.throws(
    () => parsePreset({ ...valid, clientType: "Renter" }, "my-new-preset.json"),
    /my-new-preset\.json/,
  );
});
