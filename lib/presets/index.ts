import buyerOnboarding from "./buyer-onboarding.json";
import sellerListing from "./seller-listing.json";
import { parsePreset, type ClientType, type Preset, type PresetTask } from "./schema";

/**
 * The preset registry.
 *
 * A preset is a blank workflow: categories of tasks with instructional
 * placeholders. Assigning one to a client turns it into that client's active
 * file. To add a workflow, drop a .json file in this folder and list it in
 * SOURCES below — parsePreset will say exactly what is wrong with it.
 */

export * from "./schema";

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

/** Add a new workflow by importing its .json file and listing it here. */
const SOURCES: { source: string; raw: unknown }[] = [
  { source: "buyer-onboarding.json", raw: buyerOnboarding },
  { source: "seller-listing.json", raw: sellerListing },
];

export const PRESETS: Preset[] = SOURCES.map(({ source, raw }) =>
  parsePreset(raw, source),
);

export const getPreset = (id: string | null): Preset | null =>
  PRESETS.find((preset) => preset.id === id) ?? null;

export const presetsForType = (clientType: ClientType): Preset[] =>
  PRESETS.filter((preset) => preset.clientType === clientType);

/** Every task in a preset, flattened — categories are for display only. */
export const presetTasks = (preset: Preset): PresetTask[] =>
  preset.categories.flatMap((category) => category.tasks);
