import cash14Day from "./cash-14-day.json";
import fhaVa45Day from "./fha-va-45-day.json";
import standard30Day from "./standard-30-day.json";
import { parseTimelinePreset, type ClientProgress, type TimelinePreset } from "./schema";

/**
 * The timeline preset registry.
 *
 * To add a deal skeleton, drop a .json file in this folder and list it in
 * SOURCES — parseTimelinePreset will say exactly what is wrong with it,
 * including milestones left out of date order.
 */

export * from "./schema";

const SOURCES: { source: string; raw: unknown }[] = [
  { source: "standard-30-day.json", raw: standard30Day },
  { source: "cash-14-day.json", raw: cash14Day },
  { source: "fha-va-45-day.json", raw: fhaVa45Day },
];

export const TIMELINE_PRESETS: TimelinePreset[] = SOURCES.map(({ source, raw }) =>
  parseTimelinePreset(raw, source),
);

export const getTimelinePreset = (id: string | null): TimelinePreset | null =>
  TIMELINE_PRESETS.find((preset) => preset.id === id) ?? null;

/** A fresh deal, with no preset chosen yet. */
export function createProgress(id: string, now: string): ClientProgress {
  return {
    id,
    buyerName: "",
    propertyAddress: "",
    presetId: "",
    acceptedDate: "",
    milestones: {},
    createdAt: now,
  };
}
