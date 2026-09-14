"use client";

import { ArrowRight, CalendarCheck2 } from "lucide-react";
import Link from "next/link";

import { formatISODateShort } from "@/lib/format";
import {
  groupDeadlines,
  URGENCY_LABEL,
  type Deadline,
  type Urgency,
} from "@/lib/deals";

const URGENCY_STYLE: Record<Urgency, { dot: string; text: string }> = {
  overdue: { dot: "bg-alert-500", text: "text-alert-300" },
  today: { dot: "bg-accent-400", text: "text-accent-300" },
  soon: { dot: "bg-mist-300", text: "text-mist-200" },
  later: { dot: "bg-navy-500", text: "text-mist-400" },
};

const countdown = (daysOut: number) => {
  if (daysOut < 0) return `${Math.abs(daysOut)} day${Math.abs(daysOut) === 1 ? "" : "s"} late`;
  if (daysOut === 0) return "today";
  return `in ${daysOut} day${daysOut === 1 ? "" : "s"}`;
};

/** What is due, across every deal under contract. The reason to open the app. */
export function DeadlineList({ deadlines }: { deadlines: Deadline[] }) {
  const groups = groupDeadlines(deadlines);

  if (groups.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-2 px-6 py-10 text-center">
        <CalendarCheck2 className="size-6 text-mist-500" strokeWidth={1.75} aria-hidden />
        <p className="text-sm text-mist-300">Nothing due in the next three weeks.</p>
        <p className="text-xs text-mist-500">
          Deadlines appear once a deal is under contract with a timeline set.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <section key={group.urgency}>
          <h3 className="flex items-center gap-2 text-eyebrow uppercase text-mist-500">
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${URGENCY_STYLE[group.urgency].dot}`}
            />
            {URGENCY_LABEL[group.urgency]}
            <span data-numeric className="text-mist-500">
              ({group.deadlines.length})
            </span>
          </h3>

          <ul className="mt-2 flex flex-col gap-1.5">
            {group.deadlines.map((deadline) => (
              <li key={`${deadline.dealId}-${deadline.milestone.id}`}>
                <Link
                  href={`/deals/${deadline.dealId}`}
                  className="group flex items-center gap-3 rounded-tile border border-navy-700/70 px-3.5 py-2.5 transition-colors hover:border-navy-600 hover:bg-navy-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-mist-100">
                      {deadline.milestone.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-mist-500">
                      {deadline.address}
                      {deadline.clientName && ` · ${deadline.clientName}`}
                      {deadline.milestone.waitingOn && (
                        <> · waiting on {deadline.milestone.waitingOn}</>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`font-mono text-xs font-semibold ${URGENCY_STYLE[deadline.urgency].text}`}
                    >
                      {formatISODateShort(deadline.milestone.date ?? "")}
                    </p>
                    <p className="text-[0.6875rem] text-mist-500">
                      {countdown(deadline.daysOut)}
                    </p>
                  </div>

                  <ArrowRight
                    className="size-3.5 shrink-0 text-mist-500 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
