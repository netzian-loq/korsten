import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clientProgress,
  createClient,
  filterClients,
  isTaskComplete,
  type Client,
} from "./clients.ts";
import type { Preset, PresetTask } from "./presets/schema.ts";

const task = (over: Partial<PresetTask> & Pick<PresetTask, "id" | "kind">): PresetTask => ({
  label: over.id,
  hint: "hint",
  ...over,
});

const PRESET: Preset = {
  id: "demo",
  name: "Demo",
  clientType: "Buyer",
  summary: "",
  categories: [
    {
      id: "one",
      name: "One",
      tasks: [
        task({ id: "field", kind: "field" }),
        task({ id: "doc", kind: "document" }),
        task({ id: "signed-doc", kind: "document", requiresSignature: true }),
        task({ id: "action", kind: "action" }),
      ],
    },
  ],
};

const base = (): Client =>
  createClient({ name: "Ada Okonkwo", type: "Buyer" }, "c1", "2026-09-13T00:00:00Z");

const attach = (status: "Attached" | "In review" | "Signed") => ({
  document: {
    fileId: "f1",
    name: "doc.pdf",
    size: 10,
    mimeType: "application/pdf",
    attachedAt: "2026-09-13T00:00:00Z",
    status,
  },
});

test("a new client starts blank, active, with no preset", () => {
  const client = base();
  assert.equal(client.status, "Active");
  assert.equal(client.presetId, null);
  assert.deepEqual(client.tasks, {});
});

test("a field task completes once it holds non-whitespace text", () => {
  const field = PRESET.categories[0].tasks[0];
  assert.equal(isTaskComplete(field, undefined), false);
  assert.equal(isTaskComplete(field, { value: "   " }), false);
  assert.equal(isTaskComplete(field, { value: "Marisol" }), true);
});

test("a plain document task completes as soon as a file is attached", () => {
  const doc = PRESET.categories[0].tasks[1];
  assert.equal(isTaskComplete(doc, undefined), false);
  assert.equal(isTaskComplete(doc, attach("Attached")), true);
});

test("a signature document is not complete until it is signed", () => {
  // Otherwise a file reads "complete" with nothing actually signed.
  const signable = PRESET.categories[0].tasks[2];
  assert.equal(isTaskComplete(signable, attach("Attached")), false);
  assert.equal(isTaskComplete(signable, attach("In review")), false);
  assert.equal(isTaskComplete(signable, attach("Signed")), true);
});

test("an action task completes when it is checked off", () => {
  const action = PRESET.categories[0].tasks[3];
  assert.equal(isTaskComplete(action, { checked: false }), false);
  assert.equal(isTaskComplete(action, { checked: true }), true);
});

test("progress counts completed tasks across the whole preset", () => {
  const client: Client = {
    ...base(),
    presetId: "demo",
    tasks: {
      field: { value: "Marisol" },
      doc: attach("Attached"),
      "signed-doc": attach("In review"),
    },
  };

  assert.deepEqual(clientProgress(client, PRESET), { done: 2, total: 4, percent: 50 });
});

test("a client with no preset reports no progress rather than dividing by zero", () => {
  assert.deepEqual(clientProgress(base(), null), { done: 0, total: 0, percent: 0 });
});

test("search matches name, email, phone, type and status", () => {
  const clients = [
    { ...base(), id: "a", name: "Ada Okonkwo", email: "ada@example.com" },
    { ...base(), id: "d", name: "Dana Whitfield", type: "Seller" as const, status: "Closed" as const },
  ];

  assert.deepEqual(filterClients(clients, "All", "ada@").map((c) => c.id), ["a"]);
  assert.deepEqual(filterClients(clients, "All", "seller").map((c) => c.id), ["d"]);
  assert.deepEqual(filterClients(clients, "All", "  OKONKWO ").map((c) => c.id), ["a"]);
  assert.deepEqual(filterClients(clients, "Closed", "").map((c) => c.id), ["d"]);
  assert.deepEqual(filterClients(clients, "All", "zzz"), []);
});
