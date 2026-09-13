"use client";

import { CalendarDays, ChevronRight, ListChecks, RotateCcw } from "lucide-react";
import { useState } from "react";

import { BuyerTimeline } from "@/app/_components/buyer-timeline";
import {
  assignTimelinePreset,
  resetProgress,
  updateProgress,
  useProgress,
} from "@/lib/progress-store";
import {
  deriveMilestones,
  getTimelinePreset,
  summarize,
  TIMELINE_PRESETS,
} from "@/lib/timeline";

import { MilestoneEditor } from "./milestone-editor";
import { SharePanel } from "./share-panel";

const FIELD =
  "mt-1.5 w-full rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400";
const FIELD_LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500";

export function ProgressModule() {
  const progress = useProgress();
  const [confirmReset, setConfirmReset] = useState(false);

  const preset = getTimelinePreset(progress.presetId);
  const milestones = deriveMilestones(progress, preset);
  const summary = summarize(milestones);

  const needsDate = preset !== null && progress.acceptedDate === "";

  return (
    <>
      <section className="panel mt-6 px-5 py-4" aria-labelledby="deal-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <h2 id="deal-heading" className="sr-only">
            Deal details
          </h2>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={FIELD_LABEL}>Buyer</span>
              <input
                value={progress.buyerName}
                onChange={(event) => updateProgress({ buyerName: event.target.value })}
                placeholder="Ada Okonkwo"
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className={FIELD_LABEL}>Property</span>
              <input
                value={progress.propertyAddress}
                onChange={(event) =>
                  updateProgress({ propertyAddress: event.target.value })
                }
                placeholder="302 Bellwether Ave"
                className={FIELD}
              />
            </label>

            <label className="block">
              <span className={FIELD_LABEL}>Offer accepted</span>
              <input
                type="date"
                value={progress.acceptedDate}
                onChange={(event) =>
                  updateProgress({ acceptedDate: event.target.value })
                }
                className={`${FIELD} font-mono tabular-nums ${
                  needsDate ? "border-alert-500/60" : ""
                }`}
              />
            </label>
          </div>

          {preset && (
            <button
              type="button"
              onClick={() => {
                if (confirmReset) {
                  resetProgress();
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                }
              }}
              onBlur={() => setConfirmReset(false)}
              className={`inline-flex items-center gap-1.5 rounded-md border border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 hover:text-mist-100 ${
                confirmReset ? "border-alert-500/50 text-alert-300" : ""
              }`}
            >
              <RotateCcw className="size-3.5" strokeWidth={2.25} aria-hidden />
              {confirmReset ? "Clears the deal — confirm" : "Start over"}
            </button>
          )}
        </div>

        {needsDate && (
          <p className="mt-3.5 border-t border-navy-700 pt-3 text-xs text-alert-300">
            Add the accepted-offer date and every milestone below fills in at
            once.
          </p>
        )}
      </section>

      {preset === null ? (
        <PresetPicker />
      ) : (
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-4">
            <section className="card p-4 md:p-5" aria-labelledby="milestones-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="milestones-heading" className="text-eyebrow uppercase text-ink-400">
                  {preset.name}
                </h2>
                <p className="text-xs text-ink-500">
                  <span data-numeric className="font-semibold text-ink-900">
                    {summary.done} of {summary.total}
                  </span>{" "}
                  complete
                </p>
              </div>

              <MilestoneEditor
                progress={progress}
                preset={preset}
                milestones={milestones}
              />
            </section>

            <SharePanel progress={progress} />
          </div>

          <div>
            <p className="mb-2 text-eyebrow uppercase text-mist-500">
              What the buyer sees
            </p>
            <BuyerTimeline progress={progress} preset={preset} />
          </div>
        </div>
      )}
    </>
  );
}

/** Choosing the deal skeleton. */
function PresetPicker() {
  return (
    <div className="card mt-4 p-5 md:p-6">
      <h2 className="text-title text-ink-900">Pick a deal skeleton</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">
        Each one lays out the milestones for that kind of close, with the
        timings already filled in. Add the accepted-offer date and every target
        date falls into place.
      </p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {TIMELINE_PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              onClick={() => assignTimelinePreset(preset.id)}
              className="group flex w-full items-center gap-3 rounded-tile border border-card-edge p-3.5 text-left transition-colors hover:border-accent-400 hover:bg-card-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{preset.name}</p>
                <p className="mt-0.5 text-sm text-ink-500">{preset.summary}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" strokeWidth={2} aria-hidden />
                    {preset.closingDays} days to close
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="size-3.5" strokeWidth={2} aria-hidden />
                    {preset.milestones.length} milestones
                  </span>
                </p>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
