"use client";

import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Check,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { editProgress, replaceProgress, setMilestoneDate } from "@/lib/progress-store";
import {
  addStep,
  moveStep,
  outOfOrderSteps,
  removeStep,
  sameSteps,
  setMilestoneDone,
  sortStepsByDay,
  timelineSteps,
  updateStep,
  type ClientProgress,
  type DerivedMilestone,
  type StepPatch,
  type TimelinePreset,
} from "@/lib/timeline";
import {
  clearDefaultSteps,
  saveDefaultSteps,
  useTimelineDefaults,
} from "@/lib/timeline-defaults-store";

/**
 * The agent's milestone list.
 *
 * Normally: tick a step, or nudge a date off the one the preset calculated.
 * In edit mode: rename, re-time, reword, add, remove and reorder the steps.
 */
export function MilestoneEditor({
  progress,
  preset,
  milestones,
  editing,
}: {
  progress: ClientProgress;
  preset: TimelinePreset;
  milestones: DerivedMilestone[];
  editing: boolean;
}) {
  if (editing) {
    return <StepsEditor progress={progress} preset={preset} milestones={milestones} />;
  }

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
              {milestone.done ? "Completed" : "Not done"}: {stepName(milestone)}
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <p
                className={`text-sm font-semibold ${
                  milestone.status === "upcoming" ? "text-ink-600" : "text-ink-900"
                }`}
              >
                {stepName(milestone)}
                {milestone.status === "current" && (
                  <span className="ml-2 rounded-full bg-accent-500/12 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent-600">
                    Now
                  </span>
                )}
              </p>

              <span className="flex items-center gap-1.5">
                <label className="sr-only" htmlFor={`date-${milestone.id}`}>
                  Target date for {stepName(milestone)}
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
                    title={`Back to day ${milestone.offsetDays}`}
                    className="grid size-6 place-items-center rounded-md text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
                  >
                    <RotateCcw className="size-3" strokeWidth={2.5} aria-hidden />
                    <span className="sr-only">
                      Reset {stepName(milestone)} to the calculated date
                    </span>
                  </button>
                )}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-ink-400">
              {milestone.adjusted
                ? `Moved off day ${milestone.offsetDays}`
                : [`Day ${milestone.offsetDays}`, milestone.waitingOn]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A blank name still needs something on screen. */
const stepName = (step: { name: string }) => step.name.trim() || "Untitled step";

const EDIT_FIELD =
  "w-full rounded-md border border-card-edge bg-card-muted px-2 py-1 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-accent-400 focus:bg-card";
const EDIT_LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-ink-400";
const ICON_BUTTON =
  "grid size-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30";

function StepsEditor({
  progress,
  preset,
  milestones,
}: {
  progress: ClientProgress;
  preset: TimelinePreset;
  milestones: DerivedMilestone[];
}) {
  const defaults = useTimelineDefaults();
  const [confirmRestore, setConfirmRestore] = useState(false);

  const steps = timelineSteps(progress, preset);
  const outOfOrder = outOfOrderSteps(steps);

  const savedDefault = defaults[preset.id];
  const isSavedDefault = savedDefault !== undefined && sameSteps(savedDefault, steps);
  const isOriginal = sameSteps(preset.milestones, steps);

  const patch = (stepId: string, change: StepPatch) =>
    editProgress((current) => updateStep(current, preset, stepId, change));

  return (
    <div>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">
        Changes apply to this deal straight away, and to the buyer&rsquo;s link
        the next time you send it.
      </p>

      <ol className="mt-2 divide-y divide-card-edge">
        {milestones.map((step, index) => (
          <li key={step.id} className="flex items-start gap-3 py-3.5">
            <span
              aria-hidden
              className="mt-5 grid size-6 shrink-0 place-items-center rounded-full bg-card-sunken text-[0.625rem] font-bold text-ink-400 ring-1 ring-card-edge ring-inset"
            >
              {index + 1}
            </span>

            <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_4.5rem] gap-x-2 gap-y-2">
              <label className="block">
                <span className={EDIT_LABEL}>Step name</span>
                <input
                  value={step.name}
                  onChange={(event) => patch(step.id, { name: event.target.value })}
                  placeholder="e.g. Proof of Funds Verified"
                  className={`${EDIT_FIELD} mt-1 font-semibold`}
                />
              </label>

              <label className="block">
                <span className={EDIT_LABEL}>Day</span>
                <DayInput
                  value={step.offsetDays}
                  onChange={(offsetDays) => patch(step.id, { offsetDays })}
                  invalid={outOfOrder.has(step.id)}
                />
              </label>

              <label className="col-span-2 block">
                <span className={EDIT_LABEL}>Waiting on</span>
                <input
                  value={step.waitingOn}
                  onChange={(event) => patch(step.id, { waitingOn: event.target.value })}
                  placeholder="e.g. You — send the statement"
                  className={`${EDIT_FIELD} mt-1`}
                />
              </label>

              <label className="col-span-2 block">
                <span className={EDIT_LABEL}>What the buyer reads</span>
                <textarea
                  value={step.buyerNote}
                  onChange={(event) => patch(step.id, { buyerNote: event.target.value })}
                  rows={2}
                  placeholder="A sentence or two, in plain English, on what this step means for them."
                  className={`${EDIT_FIELD} mt-1 resize-y leading-relaxed`}
                />
              </label>

              {outOfOrder.has(step.id) && (
                <p className="col-span-2 flex items-start gap-1.5 text-xs text-alert-600">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  Day {step.offsetDays} is earlier than the step above it.
                </p>
              )}
            </div>

            <div className="mt-4 flex shrink-0 flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => editProgress((current) => moveStep(current, preset, step.id, -1))}
                disabled={index === 0}
                className={ICON_BUTTON}
              >
                <ArrowUp className="size-3.5" strokeWidth={2.5} aria-hidden />
                <span className="sr-only">Move {stepName(step)} up</span>
              </button>
              <button
                type="button"
                onClick={() => editProgress((current) => moveStep(current, preset, step.id, 1))}
                disabled={index === milestones.length - 1}
                className={ICON_BUTTON}
              >
                <ArrowDown className="size-3.5" strokeWidth={2.5} aria-hidden />
                <span className="sr-only">Move {stepName(step)} down</span>
              </button>
              <button
                type="button"
                onClick={() => editProgress((current) => removeStep(current, preset, step.id))}
                disabled={milestones.length <= 1}
                title="Remove this step"
                className={`${ICON_BUTTON} hover:bg-alert-500/10 hover:text-alert-600`}
              >
                <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
                <span className="sr-only">Remove {stepName(step)}</span>
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 border-t border-card-edge pt-3">
        <button
          type="button"
          onClick={() =>
            editProgress((current) => addStep(current, preset, crypto.randomUUID()))
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-navy-950 transition-colors hover:bg-accent-400"
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
          Add step
        </button>

        {outOfOrder.size > 0 && (
          <button
            type="button"
            onClick={() => editProgress((current) => sortStepsByDay(current, preset))}
            className="inline-flex items-center gap-1.5 rounded-md border border-card-edge px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-card-sunken"
          >
            <ArrowDownUp className="size-3.5" strokeWidth={2.25} aria-hidden />
            Sort by day
          </button>
        )}
      </div>

      <div className="mt-4 rounded-tile bg-card-muted p-3.5">
        <p className="text-xs leading-relaxed text-ink-700">
          {isSavedDefault
            ? `Every new ${preset.name} deal starts with these steps.`
            : `Want these steps every time? Save them, and each new ${preset.name} deal will start with them.`}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveDefaultSteps(preset.id, steps)}
            disabled={isSavedDefault}
            className="inline-flex items-center gap-1.5 rounded-md border border-card-edge bg-card px-3 py-1.5 text-xs font-semibold text-ink-900 transition-colors hover:border-accent-400 disabled:pointer-events-none disabled:opacity-60"
          >
            <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
            {isSavedDefault ? "Saved as your default" : `Save as my ${preset.name} steps`}
          </button>

          {(!isOriginal || savedDefault !== undefined) && (
            <button
              type="button"
              onClick={() => {
                if (!confirmRestore) {
                  setConfirmRestore(true);
                  return;
                }
                clearDefaultSteps(preset.id);
                editProgress((current) => {
                  // Ticks and moved dates on steps that no longer exist go too.
                  const keep = new Set(preset.milestones.map((m) => m.id));
                  const milestones = Object.fromEntries(
                    Object.entries(current.milestones).filter(([id]) => keep.has(id)),
                  );
                  return { ...current, steps: undefined, milestones };
                });
                setConfirmRestore(false);
              }}
              onBlur={() => setConfirmRestore(false)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                confirmRestore
                  ? "border-alert-500/50 bg-alert-500/10 text-alert-700"
                  : "border-card-edge text-ink-700 hover:bg-card-sunken hover:text-ink-900"
              }`}
            >
              <RotateCcw className="size-3.5" strokeWidth={2.25} aria-hidden />
              {confirmRestore
                ? "Replaces your steps — confirm"
                : "Restore the original steps"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A day offset that can be cleared while typing.
 *
 * Bound straight to the number, deleting the last digit would snap the field
 * back to 0 under the agent's cursor. The draft holds what is typed; only a
 * whole, non-negative number is committed.
 */
function DayInput({
  value,
  onChange,
  invalid,
}: {
  value: number;
  onChange: (value: number) => void;
  invalid: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      value={draft ?? String(value)}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        const parsed = Number(text);
        if (text !== "" && Number.isInteger(parsed) && parsed >= 0) onChange(parsed);
      }}
      onBlur={() => setDraft(null)}
      className={`${EDIT_FIELD} mt-1 font-mono tabular-nums ${
        invalid ? "border-alert-500/60" : ""
      }`}
    />
  );
}
