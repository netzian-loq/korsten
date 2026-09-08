import { ChevronRight, TriangleAlert } from "lucide-react";

import { DaySpine } from "./_components/day-spine";
import { DisplayModeBadge } from "./_components/display-mode-badge";
import { LiveDate } from "./_components/live-date";
import { NavRail } from "./_components/nav-rail";

const PIPELINE = [
  { stage: "Prospects", count: 14, tone: "bg-accent-500" },
  { stage: "Showing", count: 9, tone: "bg-accent-500" },
  { stage: "Offer out", count: 3, tone: "bg-accent-500" },
  { stage: "In escrow", count: 2, tone: "bg-good-500", note: "$2.4M" },
];

const BLOCKERS = [
  { what: "Counter expires 4:00 PM", where: "302 Bellwether" },
  { what: "Disclosure unsigned", where: "91 Sumac" },
  { what: "Photographer unconfirmed", where: "1820 Hale St" },
];

const WIDEST = Math.max(...PIPELINE.map((s) => s.count));

export default function Today() {
  return (
    <div className="flex min-h-dvh">
      <NavRail />

      <main className="min-w-0 flex-1 px-safe">
        <div className="pt-safe">
          <div className="mx-auto max-w-6xl px-5 pb-32 pt-6 md:px-8 md:pb-16 md:pt-10">
            <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
              <div>
                <LiveDate />
                <h1 className="mt-2.5 text-display text-mist-50">
                  Three doors, one deadline.
                </h1>
                <p className="mt-2 max-w-md text-[0.9375rem] text-mist-400">
                  302 Bellwether needs a counter before four. Everything else
                  runs on time.
                </p>
              </div>
              <DisplayModeBadge />
            </header>

            <div className="mt-9 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
              <section aria-labelledby="schedule-heading">
                <h2
                  id="schedule-heading"
                  className="mb-4 pl-1 text-eyebrow uppercase text-mist-500"
                >
                  Schedule
                </h2>
                <DaySpine />
              </section>

              <aside className="flex flex-col gap-5">
                <section className="card p-5" aria-labelledby="pipeline-heading">
                  <h2
                    id="pipeline-heading"
                    className="text-eyebrow uppercase text-ink-400"
                  >
                    Pipeline
                  </h2>

                  <ul className="mt-4 flex flex-col gap-3.5">
                    {PIPELINE.map(({ stage, count, tone, note }) => (
                      <li key={stage}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-ink-700">
                            {stage}
                          </span>
                          <span className="flex items-baseline gap-2">
                            {note && (
                              <span className="font-mono text-xs text-ink-400">
                                {note}
                              </span>
                            )}
                            <span
                              data-numeric
                              className="text-sm font-semibold text-ink-900"
                            >
                              {count}
                            </span>
                          </span>
                        </div>
                        {/* The bar is the point: a pipeline narrows or it stalls. */}
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-card-sunken">
                          <div
                            className={`h-full rounded-full ${tone}`}
                            style={{ width: `${(count / WIDEST) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-4 border-t border-card-edge pt-3.5 text-xs text-ink-500">
                    Both escrows close inside 30 days.
                  </p>
                </section>

                <section className="card p-5" aria-labelledby="blockers-heading">
                  <h2
                    id="blockers-heading"
                    className="flex items-center gap-2 text-eyebrow uppercase text-alert-700"
                  >
                    <TriangleAlert className="size-3.5" strokeWidth={2.25} aria-hidden />
                    Needs you
                  </h2>

                  <ul className="mt-3 -mx-2">
                    {BLOCKERS.map(({ what, where }) => (
                      <li key={where}>
                        <a
                          href="#"
                          className="flex items-center gap-3 rounded-tile px-2 py-2.5 transition-colors hover:bg-card-muted"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-ink-900">
                              {what}
                            </span>
                            <span className="block truncate text-xs text-ink-500">
                              {where}
                            </span>
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-ink-400"
                            aria-hidden
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
