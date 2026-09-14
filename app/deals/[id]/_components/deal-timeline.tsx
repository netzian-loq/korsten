"use client";

import { Check, CircleDashed, Link2, RotateCcw } from "lucide-react";
import { useState } from "react";

import {
  assignTimeline,
  setDealMilestoneDate,
  setDealMilestoneDone,
} from "@/lib/deal-store";
import { dealMilestones, dealToProgress, type Deal } from "@/lib/deals";
import { formatISODateShort } from "@/lib/format";
import { getTimelinePreset, TIMELINE_PRESETS } from "@/lib/timeline";
import { shareUrl } from "@/lib/timeline/share-link";

const DATE_INPUT =
  "rounded-md border border-card-edge bg-card-muted px-2 py-1 font-mono text-xs tabular-nums text-ink-900 transition-colors focus:border-accent-400 focus:bg-card";

/** The contract dates: one input drives them all, and the client can see them. */
export function DealTimeline({ deal }: { deal: Deal }) {
  const preset = getTimelinePreset(deal.presetId);
  const milestones = dealMilestones(deal);
  const [copied, setCopied] = useState(false);

  if (!preset) {
    return (
      <div className="card p-5">
        <h3 className="text-title text-ink-900">Pick a timeline</h3>
        <p className="mt-1 text-sm text-ink-500">
          Every contract date is calculated from the accepted-offer date above.
          Choose the shape of this deal and the dates fill themselves in.
        </p>

        {!deal.acceptedDate && (
          <p className="mt-3 rounded-md bg-alert-500/10 px-3 py-2 text-xs text-alert-700">
            Set the accepted date first, or the dates will come out blank.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {TIMELINE_PRESETS.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => assignTimeline(deal.id, option.id)}
                className="w-full rounded-tile border border-card-edge p-3.5 text-left transition-colors hover:border-accent-400 hover:bg-card-muted"
              >
                <p className="font-semibold text-ink-900">{option.name}</p>
                <p className="mt-0.5 text-sm text-ink-500">{option.summary}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {option.milestones.length} milestones · closes in{" "}
                  {option.closingDays} days
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const done = milestones.filter((milestone) => milestone.done).length;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        shareUrl(window.location.origin, dealToProgress(deal)),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="card p-4 md:p-5">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="text-title text-ink-900">{preset.name}</h3>
          <p className="mt-0.5 text-sm text-ink-500">
            <span data-numeric className="font-semibold text-ink-900">
              {done} of {milestones.length}
            </span>{" "}
            done
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            title="A read-only snapshot for the client. Copy a fresh one after changing dates."
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-mist-50 transition-colors hover:bg-navy-800"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
            ) : (
              <Link2 className="size-3.5" strokeWidth={2.25} aria-hidden />
            )}
            {copied ? "Link copied" : "Copy client link"}
          </button>
          <button
            type="button"
            onClick={() => assignTimeline(deal.id, "")}
            className="inline-flex items-center gap-1.5 rounded-md border border-card-edge px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-card-muted"
          >
            <RotateCcw className="size-3.5" strokeWidth={2.25} aria-hidden />
            Change
          </button>
        </div>
      </header>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card-sunken">
        <div
          className="h-full rounded-full bg-good-500 transition-[width] duration-300"
          style={{ width: `${milestones.length ? (done / milestones.length) * 100 : 0}%` }}
        />
      </div>

      <ol className="mt-3 divide-y divide-card-edge">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="flex items-start gap-3 py-3">
            <button
              type="button"
              onClick={() =>
                setDealMilestoneDone(deal.id, preset, milestone.id, !milestone.done)
              }
              aria-pressed={milestone.done}
              aria-label={`Mark ${milestone.name} ${milestone.done ? "not done" : "done"}`}
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full transition-colors ${
                milestone.done
                  ? "bg-good-500 text-white"
                  : "bg-card-sunken text-ink-400 ring-1 ring-card-edge ring-inset"
              }`}
            >
              {milestone.done ? (
                <Check className="size-3" strokeWidth={3} aria-hidden />
              ) : (
                <CircleDashed className="size-3" strokeWidth={2.5} aria-hidden />
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  milestone.status === "current" ? "text-accent-600" : "text-ink-900"
                }`}
              >
                {milestone.name}
                {milestone.status === "current" && (
                  <span className="ml-2 rounded-full bg-accent-500/12 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-accent-600">
                    Now
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                {milestone.buyerNote}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <input
                type="date"
                value={milestone.date ?? ""}
                onChange={(event) =>
                  setDealMilestoneDate(deal.id, milestone.id, event.target.value)
                }
                aria-label={`Date for ${milestone.name}`}
                className={DATE_INPUT}
              />
              <p className="mt-0.5 text-[0.625rem] text-ink-400">
                {milestone.adjusted ? "adjusted" : formatISODateShort(milestone.date ?? "")}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
