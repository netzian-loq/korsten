/**
 * Preset shapes and the parser that validates them.
 *
 * Deliberately free of the JSON imports in ./index.ts so this can be exercised
 * directly by schema.test.ts — the parser is what tells you why a preset you
 * added does not load, so it is worth testing.
 */

export type ClientType = "Buyer" | "Seller";

export type TaskKind =
  /** The agent types a value in place of the placeholder. */
  | "field"
  /** The agent attaches a file. */
  | "document"
  /** A plain check-off with nothing to store. */
  | "action";

export type PresetTask = {
  id: string;
  kind: TaskKind;
  /** What the agent is being asked to do, e.g. "Add Buyer Name & Budget". */
  label: string;
  /** Shown under the label and as the tooltip — what goes here and why. */
  hint: string;
  /** Example text for a `field` task, shown greyed out until it is filled. */
  placeholder?: string;
  /** A `document` task that is not done until it comes back signed. */
  requiresSignature?: boolean;
};

export type PresetCategory = {
  id: string;
  name: string;
  tasks: PresetTask[];
};

export type Preset = {
  id: string;
  name: string;
  clientType: ClientType;
  summary: string;
  categories: PresetCategory[];
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const TASK_KINDS: readonly TaskKind[] = ["field", "document", "action"];
const CLIENT_TYPES: readonly ClientType[] = ["Buyer", "Seller"];

class PresetError extends Error {
  constructor(source: string, detail: string) {
    super(`Preset "${source}" is invalid: ${detail}`);
    this.name = "PresetError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function requireString(
  holder: Record<string, unknown>,
  key: string,
  source: string,
  where: string,
): string {
  const value = holder[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new PresetError(source, `${where} needs a non-empty "${key}".`);
  }
  return value;
}

/** Turns untyped JSON into a Preset, or explains precisely why it cannot. */
export function parsePreset(raw: unknown, source: string): Preset {
  if (!isRecord(raw)) throw new PresetError(source, "the file must be an object.");

  const clientType = requireString(raw, "clientType", source, "the preset");
  if (!CLIENT_TYPES.includes(clientType as ClientType)) {
    throw new PresetError(
      source,
      `clientType "${clientType}" must be one of ${CLIENT_TYPES.join(", ")}.`,
    );
  }

  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    throw new PresetError(source, "it needs at least one category.");
  }

  const seenTaskIds = new Set<string>();

  const categories = raw.categories.map((rawCategory, index): PresetCategory => {
    const where = `category ${index + 1}`;
    if (!isRecord(rawCategory)) throw new PresetError(source, `${where} must be an object.`);

    const categoryId = requireString(rawCategory, "id", source, where);

    if (!Array.isArray(rawCategory.tasks) || rawCategory.tasks.length === 0) {
      throw new PresetError(source, `category "${categoryId}" needs at least one task.`);
    }

    const tasks = rawCategory.tasks.map((rawTask, taskIndex): PresetTask => {
      const taskWhere = `task ${taskIndex + 1} in "${categoryId}"`;
      if (!isRecord(rawTask)) throw new PresetError(source, `${taskWhere} must be an object.`);

      const id = requireString(rawTask, "id", source, taskWhere);
      const kind = requireString(rawTask, "kind", source, taskWhere);

      if (!TASK_KINDS.includes(kind as TaskKind)) {
        throw new PresetError(
          source,
          `${taskWhere} has kind "${kind}"; expected one of ${TASK_KINDS.join(", ")}.`,
        );
      }

      // Task ids key the saved progress, so a duplicate would silently make two
      // tasks share one state.
      if (seenTaskIds.has(id)) {
        throw new PresetError(source, `task id "${id}" is used more than once.`);
      }
      seenTaskIds.add(id);

      return {
        id,
        kind: kind as TaskKind,
        label: requireString(rawTask, "label", source, taskWhere),
        hint: requireString(rawTask, "hint", source, taskWhere),
        placeholder: typeof rawTask.placeholder === "string" ? rawTask.placeholder : undefined,
        requiresSignature: rawTask.requiresSignature === true,
      };
    });

    return {
      id: categoryId,
      name: requireString(rawCategory, "name", source, where),
      tasks,
    };
  });

  return {
    id: requireString(raw, "id", source, "the preset"),
    name: requireString(raw, "name", source, "the preset"),
    clientType: clientType as ClientType,
    summary: requireString(raw, "summary", source, "the preset"),
    categories,
  };
}
