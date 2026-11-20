"use client";

import { Check, RotateCcw } from "lucide-react";

import { replaceProgress, setMilestoneDate } from "@/lib/progress-store";
import {
  setMilestoneDone,
  type ClientProgress,
  type DerivedMilestone,
  type TimelinePreset,
} from "@/lib/timeline";

/**
 * The agent's editable milestone list: tick a step, or nudge a date off the
 * one the preset calculated.
 */
export function MilestoneEditor({
  progress,
  preset,
  milestones,
}: {
  progress: ClientProgress;
  preset: TimelinePreset;
  milestones: DerivedMilestone[];
}) {
  return (
    <ol className="divide-y divide-card-edge">
      {milestones.map((milestone) => (
        <li key={milestone.id} className="flex items-start gap-3 py-3">
          <button
            type="button"
            onClick={() =>
              replaceProgress(
                setMilestoneDone(progress, preset, milestone.id, !milestone.done),
              )
            }
            aria-pressed={milestone.done}
            title={
              milestone.done
                ? "Mark this step, and everything after it, not done"
                : "Mark this step and everything before it done"
            }
            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold transition-colors ${
              milestone.done
                ? "bg-good-500 text-white"
                : milestone.status === "current"
                  ? "bg-accent-500 text-white"
                  : "bg-card-sunken text-ink-400 ring-1 ring-card-edge ring-inset hover:bg-mist-200"
            }`}
          >
            {milestone.done ? (
              <Check className="size-3.5" strokeWidth={3} aria-hidden />
            ) : (
              milestone.step
            )}
            <span className="sr-only">
              {milestone.done ? "Completed" : "Not done"}: {milestone.name}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <p
                className={`text-sm font-semibold ${
                  milestone.status === "upcoming" ? "text-ink-600" : "text-ink-900"
                }`}
              >
                {milestone.name}
                {milestone.status === "current" && (
                  <span className="ml-2 rounded-full bg-accent-500/12 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent-600">
                    Now
                  </span>
                )}
              </p>

              <span className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={`date-${milestone.id}`}>
                  Target date for {milestone.name}
                </label>
                <input
                  id={`date-${milestone.id}`}
                  type="date"
                  value={milestone.date ?? ""}
                  onChange={(event) =>
                    setMilestoneDate(milestone.id, event.target.value)
                  }
                  className="rounded-md border border-card-edge bg-card-muted px-2 py-1 font-mono text-xs tabular-nums text-ink-900 transition-colors focus:border-accent-400 focus:bg-card"
                />
                {milestone.adjusted && (
                  <button
                    type="button"
                    onClick={() => setMilestoneDate(milestone.id, "")}
                    title={`Back to day ${milestone.offsetDays} of the preset`}
                    className="grid size-6 place-items-center rounded-md text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
                  >
                    <RotateCcw className="size-3" strokeWidth={2.5} aria-hidden />
                    <span className="sr-only">
                      Reset {milestone.name} to the calculated date
                    </span>
                  </button>
                )}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-ink-400">
              {milestone.adjusted
                ? `Moved off the preset's day ${milestone.offsetDays}`
                : `Day ${milestone.offsetDays} · ${milestone.waitingOn}`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
