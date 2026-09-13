"use client";

import { Check, Clock, Home } from "lucide-react";

import { formatISODateShort } from "@/lib/format";
import {
  daysUntil,
  deriveMilestones,
  summarize,
  type ClientProgress,
  type TimelinePreset,
} from "@/lib/timeline";

/**
 * The buyer's view of a deal: one progress bar, one "what we are waiting on",
 * and the milestones underneath.
 *
 * Presentational and read-only — the agent page renders it as a live preview,
 * and /track renders it from a shared link. Built narrow-first; a buyer opens
 * this on a phone.
 */
export function BuyerTimeline({
  progress,
  preset,
}: {
  progress: ClientProgress;
  preset: TimelinePreset | null;
}) {
  const milestones = deriveMilestones(progress, preset);
  const summary = summarize(milestones);

  // Safe to read the clock here: this subtree only ever renders on the client
  // (the server snapshot has no preset, so there are no milestones to draw).
  const today = new Date();

  if (milestones.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-ink-500">
          This timeline has not been set up yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <header className="border-b border-card-edge p-5">
        <p className="text-eyebrow uppercase text-ink-400">Your purchase</p>
        <h2 className="mt-1.5 text-title text-ink-900">
          {progress.buyerName || "Your new home"}
        </h2>
        {progress.propertyAddress && (
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
            <Home className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            {progress.propertyAddress}
          </p>
        )}

        {/* The headline answer to "what is happening right now?" */}
        {summary.current ? (
          <div className="mt-4 rounded-tile bg-accent-500/10 p-3.5 ring-1 ring-accent-500/25 ring-inset">
            <p className="text-eyebrow uppercase text-accent-600">
              What we are waiting on right now
            </p>
            <p className="mt-1.5 flex items-start gap-2 text-sm font-semibold text-ink-900">
              <Clock
                className="mt-0.5 size-4 shrink-0 text-accent-600"
                strokeWidth={2.25}
                aria-hidden
              />
              {summary.current.waitingOn}
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-tile bg-good-500/12 p-3.5 ring-1 ring-good-500/25 ring-inset">
            <p className="text-sm font-semibold text-good-700">
              Everything is done. Congratulations on your new home.
            </p>
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold text-ink-700">
              Step <span data-numeric>{summary.current?.step ?? summary.total}</span> of{" "}
              <span data-numeric>{summary.total}</span>
            </span>
            {summary.closingDate && (
              <span className="text-ink-500">
                Closing {formatISODateShort(summary.closingDate)}
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuenow={summary.done}
            aria-valuemin={0}
            aria-valuemax={summary.total}
            aria-label={`${summary.done} of ${summary.total} steps complete`}
            className="mt-2 h-2 overflow-hidden rounded-full bg-card-sunken"
          >
            <div
              className="h-full rounded-full bg-good-500 transition-[width] duration-500"
              style={{ width: `${summary.percent}%` }}
            />
          </div>
        </div>
      </header>

      <ol className="p-5">
        {milestones.map((milestone, index) => {
          const last = index === milestones.length - 1;
          const away = milestone.date ? daysUntil(milestone.date, today) : null;

          return (
            <li key={milestone.id} className="flex gap-3.5">
              {/* Marker plus the spine joining it to the next step. */}
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold ${
                    milestone.done
                      ? "bg-good-500 text-white"
                      : milestone.status === "current"
                        ? "bg-accent-500 text-white ring-4 ring-accent-500/20"
                        : "bg-card-sunken text-ink-400 ring-1 ring-card-edge ring-inset"
                  }`}
                >
                  {milestone.done ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : (
                    milestone.step
                  )}
                </span>
                {!last && (
                  <span
                    aria-hidden
                    className={`w-0.5 flex-1 ${milestone.done ? "bg-good-500/40" : "bg-card-edge"}`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${last ? "" : "pb-5"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      milestone.status === "upcoming" ? "text-ink-500" : "text-ink-900"
                    }`}
                  >
                    {milestone.name}
                  </p>
                  <p className="shrink-0 font-mono text-xs text-ink-400">
                    {formatISODateShort(milestone.date ?? "")}
                  </p>
                </div>

                {milestone.status === "current" && (
                  <>
                    <p className="mt-1 text-sm leading-relaxed text-ink-700">
                      {milestone.buyerNote}
                    </p>
                    {away !== null && (
                      <p className="mt-1.5 text-xs font-semibold text-accent-600">
                        {away === 0
                          ? "Today"
                          : away > 0
                            ? `In ${away} day${away === 1 ? "" : "s"}`
                            : `${Math.abs(away)} day${Math.abs(away) === 1 ? "" : "s"} ago`}
                      </p>
                    )}
                  </>
                )}

                {milestone.status === "upcoming" && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-400">
                    {milestone.buyerNote}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
