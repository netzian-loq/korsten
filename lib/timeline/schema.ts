import { addDays } from "../dates.ts";

/**
 * Timeline presets and the live progress state derived from them.
 *
 * Only the date helpers are imported, so schema.test.ts can exercise this
 * directly. The agent types one date — the accepted-offer date — and every
 * downstream target comes from the preset's day offsets.
 */

export type TimelineMilestone = {
  id: string;
  /** Agent-facing name, e.g. "Home Inspection". */
  name: string;
  /** Days after the accepted-offer date. */
  offsetDays: number;
  /** Plain-English explanation shown to the buyer. */
  buyerNote: string;
  /** Who the ball is with — the "What We Are Waiting On Right Now" badge. */
  waitingOn: string;
};

export type TimelinePreset = {
  id: string;
  name: string;
  summary: string;
  /** Headline length, for the picker. */
  closingDays: number;
  milestones: TimelineMilestone[];
};

/** What the agent has changed about one milestone. */
export type MilestoneState = {
  done?: boolean;
  /** Overrides the date the preset calculated. */
  date?: string;
};

export type ClientProgress = {
  id: string;
  buyerName: string;
  propertyAddress: string;
  presetId: string;
  /** The single input everything downstream is calculated from. */
  acceptedDate: string;
  /** Keyed by milestone id. Absent means untouched. */
  milestones: Record<string, MilestoneState>;
  createdAt: string;
  /** When the agent last copied a link, and the signature of what it held. */
  sharedAt?: string;
  sharedFingerprint?: string;
};

export type MilestoneStatus = "done" | "current" | "upcoming";

export type DerivedMilestone = TimelineMilestone & {
  /** The target date: the agent's override, else offset from acceptance. */
  date: string | null;
  done: boolean;
  /** The agent moved this off the preset's calculated date. */
  adjusted: boolean;
  status: MilestoneStatus;
  /** 1-based, for "Step 3 of 9". */
  step: number;
};

/* -------------------------------------------------------------------------- */
/* Deriving the live timeline                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The preset's milestones with dates and status filled in.
 *
 * Exactly one milestone is "current": the first that is not done. Everything
 * before it reads as done, everything after as upcoming — so the buyer always
 * sees a single "you are here".
 */
export function deriveMilestones(
  progress: ClientProgress,
  preset: TimelinePreset | null,
): DerivedMilestone[] {
  if (!preset) return [];

  const currentIndex = preset.milestones.findIndex(
    (milestone) => progress.milestones[milestone.id]?.done !== true,
  );

  return preset.milestones.map((milestone, index) => {
    const state = progress.milestones[milestone.id];
    const calculated = addDays(progress.acceptedDate, milestone.offsetDays);
    const date = state?.date ?? calculated;

    return {
      ...milestone,
      date,
      done: state?.done === true,
      adjusted: Boolean(state?.date) && state?.date !== calculated,
      status:
        state?.done === true
          ? "done"
          : index === currentIndex
            ? "current"
            : "upcoming",
      step: index + 1,
    };
  });
}

export type ProgressSummary = {
  done: number;
  total: number;
  percent: number;
  current: DerivedMilestone | null;
  /** The last milestone's date — the one the buyer actually cares about. */
  closingDate: string | null;
};

export function summarize(milestones: DerivedMilestone[]): ProgressSummary {
  const done = milestones.filter((milestone) => milestone.done).length;
  const total = milestones.length;

  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    current: milestones.find((milestone) => milestone.status === "current") ?? null,
    closingDate: total === 0 ? null : (milestones[total - 1].date ?? null),
  };
}

/**
 * Marks a milestone done or not.
 *
 * Completing a step also completes everything before it, and un-completing one
 * reopens everything after: a timeline with a gap in the middle would put the
 * buyer's "you are here" marker somewhere that is not true.
 */
export function setMilestoneDone(
  progress: ClientProgress,
  preset: TimelinePreset | null,
  milestoneId: string,
  done: boolean,
): ClientProgress {
  if (!preset) return progress;

  const index = preset.milestones.findIndex((m) => m.id === milestoneId);
  if (index === -1) return progress;

  const milestones = { ...progress.milestones };

  preset.milestones.forEach((milestone, position) => {
    const shouldBeDone = done ? position <= index : position < index;
    milestones[milestone.id] = { ...milestones[milestone.id], done: shouldBeDone };
  });

  return { ...progress, milestones };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

class TimelineError extends Error {
  constructor(source: string, detail: string) {
    super(`Timeline preset "${source}" is invalid: ${detail}`);
    this.name = "TimelineError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function str(
  holder: Record<string, unknown>,
  key: string,
  source: string,
  where: string,
): string {
  const value = holder[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TimelineError(source, `${where} needs a non-empty "${key}".`);
  }
  return value;
}

/** Turns untyped JSON into a TimelinePreset, or explains why it cannot. */
export function parseTimelinePreset(raw: unknown, source: string): TimelinePreset {
  if (!isRecord(raw)) throw new TimelineError(source, "the file must be an object.");

  if (!Array.isArray(raw.milestones) || raw.milestones.length === 0) {
    throw new TimelineError(source, "it needs at least one milestone.");
  }

  const seen = new Set<string>();
  let previousOffset = -Infinity;

  const milestones = raw.milestones.map((rawMilestone, index): TimelineMilestone => {
    const where = `milestone ${index + 1}`;
    if (!isRecord(rawMilestone)) throw new TimelineError(source, `${where} must be an object.`);

    const id = str(rawMilestone, "id", source, where);
    if (seen.has(id)) {
      // Ids key the saved progress; a duplicate would share one state.
      throw new TimelineError(source, `milestone id "${id}" is used more than once.`);
    }
    seen.add(id);

    const offsetDays = rawMilestone.offsetDays;
    if (typeof offsetDays !== "number" || !Number.isFinite(offsetDays) || offsetDays < 0) {
      throw new TimelineError(source, `${where} needs a non-negative "offsetDays".`);
    }
    if (offsetDays < previousOffset) {
      // The board reads top to bottom; out-of-order offsets would show the
      // buyer a later step above an earlier one.
      throw new TimelineError(
        source,
        `${where} ("${id}") is at day ${offsetDays}, before the milestone above it.`,
      );
    }
    previousOffset = offsetDays;

    return {
      id,
      name: str(rawMilestone, "name", source, where),
      offsetDays,
      buyerNote: str(rawMilestone, "buyerNote", source, where),
      waitingOn: str(rawMilestone, "waitingOn", source, where),
    };
  });

  return {
    id: str(raw, "id", source, "the preset"),
    name: str(raw, "name", source, "the preset"),
    summary: str(raw, "summary", source, "the preset"),
    closingDays: milestones[milestones.length - 1].offsetDays,
    milestones,
  };
}

export { addDays, dateRank, daysUntil, parseISODate } from "../dates.ts";
