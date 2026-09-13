import type { ClientType, Preset, PresetTask } from "./presets/schema";

/**
 * Client records and the arithmetic the dashboard reads off them.
 *
 * Only type-level imports from the preset schema, so this stays free of the
 * JSON registry and can be exercised directly by clients.test.ts. Functions
 * that need a preset take it as an argument rather than looking it up.
 */

export type ClientStatus = "Active" | "Under Contract" | "Closed";

export const CLIENT_STATUSES: readonly ClientStatus[] = [
  "Active",
  "Under Contract",
  "Closed",
];

export const CLIENT_TYPES: readonly ClientType[] = ["Buyer", "Seller"];

/** Where a document sits in the signing round-trip. */
export type DocumentStatus = "Attached" | "In review" | "Signed";

export type AttachedDocument = {
  /** Key into the browser file store holding the actual bytes. */
  fileId: string;
  name: string;
  size: number;
  mimeType: string;
  attachedAt: string;
  status: DocumentStatus;
};

/** What the agent has put in place of one preset placeholder. */
export type TaskState = {
  /** For a `field` task. */
  value?: string;
  /** For a `document` task. */
  document?: AttachedDocument;
  /** For an `action` task. */
  checked?: boolean;
};

export type Client = {
  id: string;
  name: string;
  type: ClientType;
  email: string;
  phone: string;
  status: ClientStatus;
  createdAt: string;
  /** null until a preset is assigned — the client file is still blank. */
  presetId: string | null;
  /** Keyed by preset task id. */
  tasks: Record<string, TaskState>;
};

export type NewClient = {
  name: string;
  type: ClientType;
  email?: string;
  phone?: string;
};

export function createClient(input: NewClient, id: string, now: string): Client {
  return {
    id,
    name: input.name.trim(),
    type: input.type,
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    status: "Active",
    createdAt: now,
    presetId: null,
    tasks: {},
  };
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Whether one step counts as done.
 *
 * A document task that requires a signature is not done just because a file is
 * attached — otherwise a file could read "9 of 9 complete" with nothing signed.
 */
export function isTaskComplete(
  task: PresetTask,
  state: TaskState | undefined,
): boolean {
  if (!state) return false;

  switch (task.kind) {
    case "field":
      return Boolean(state.value?.trim());
    case "document":
      if (!state.document) return false;
      return task.requiresSignature ? state.document.status === "Signed" : true;
    case "action":
      return state.checked === true;
  }
}

export type Progress = { done: number; total: number; percent: number };

export function clientProgress(client: Client, preset: Preset | null): Progress {
  if (!preset) return { done: 0, total: 0, percent: 0 };

  const tasks = preset.categories.flatMap((category) => category.tasks);
  const done = tasks.filter((task) =>
    isTaskComplete(task, client.tasks[task.id]),
  ).length;

  return {
    done,
    total: tasks.length,
    percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
}

/** Every file attached to a client, in the order the preset lists them. */
export function clientDocuments(
  client: Client,
  preset: Preset | null,
): { task: PresetTask; document: AttachedDocument }[] {
  if (!preset) return [];

  return preset.categories
    .flatMap((category) => category.tasks)
    .flatMap((task) => {
      const document = client.tasks[task.id]?.document;
      return document ? [{ task, document }] : [];
    });
}

/* -------------------------------------------------------------------------- */
/* Searching                                                                  */
/* -------------------------------------------------------------------------- */

export type StatusFilter = "All" | ClientStatus;

export function filterClients(
  clients: Client[],
  filter: StatusFilter,
  query: string,
): Client[] {
  const needle = query.trim().toLowerCase();

  return clients.filter((client) => {
    if (filter !== "All" && client.status !== filter) return false;
    if (needle === "") return true;

    return [client.name, client.email, client.phone, client.type, client.status]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}
