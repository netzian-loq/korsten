"use client";

import { Blocks, MapPin, PencilLine } from "lucide-react";

import { isActiveDeal, type BudgetDomain, type Client } from "@/lib/clients";
import { formatBudgetRange, initials } from "@/lib/format";

import { STATUS_STYLE } from "./status-styles";

type Props = {
  client: Client;
  domain: BudgetDomain;
  onEdit: (trigger: HTMLElement) => void;
};

export function ClientRow({ client, domain, onEdit }: Props) {
  const style = STATUS_STYLE[client.status];
  const active = isActiveDeal(client);

  // Every row plots its range on the same axis, so the roster can be read as
  // one picture: who is shopping where, and how far apart they are.
  const span = Math.max(domain.max - domain.min, 1);
  const rawLeft = ((client.budgetMin - domain.min) / span) * 100;
  const left = Math.min(Math.max(rawLeft, 0), 100);
  const width = Math.min(
    Math.max(((client.budgetMax - client.budgetMin) / span) * 100, 1.5),
    100 - left,
  );

  return (
    <button
      type="button"
      onClick={(event) => onEdit(event.currentTarget)}
      aria-label={`Edit ${client.fullName}`}
      className="card group relative w-full overflow-hidden p-4 text-left transition-shadow hover:shadow-float md:p-5"
    >
      {active && (
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${style.bar}`}
        />
      )}

      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-card-sunken font-display text-sm font-semibold text-ink-700"
        >
          {initials(client.fullName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-title text-ink-900">
                {client.fullName}
              </h3>
              <p className="mt-1 truncate text-sm text-ink-500">
                <span className="font-mono text-xs tabular-nums">
                  {client.phone || "No phone"}
                </span>
                <span aria-hidden className="mx-2 text-ink-400">
                  ·
                </span>
                {client.email || "No email"}
              </p>
            </div>

            <span className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.chip}`}
              >
                {client.status}
              </span>
              <PencilLine
                aria-hidden
                className="size-4 text-ink-400 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 pl-[3.375rem]">
        <span
          aria-hidden
          className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-card-sunken"
        >
          <span
            className={`absolute inset-y-0 rounded-full ${style.bar}`}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </span>
        {/* Fixed width so the figures form a column down the roster, and so the
            axis legend above the list can line up with the bars. */}
        <span
          data-numeric
          className="w-28 shrink-0 text-right font-mono text-xs font-semibold text-ink-700"
        >
          {formatBudgetRange(client.budgetMin, client.budgetMax)}
        </span>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-card-edge pt-3.5 pl-[3.375rem]">
        <MapPin
          aria-hidden
          className="size-3.5 shrink-0 text-ink-400"
          strokeWidth={2}
        />
        <span className="sr-only">Preferred locations:</span>
        {client.preferredLocations.length > 0 ? (
          client.preferredLocations.map((place) => (
            <span
              key={place}
              className="rounded-full bg-card-muted px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-card-edge ring-inset"
            >
              {place}
            </span>
          ))
        ) : (
          <span className="text-xs text-ink-400">Anywhere</span>
        )}

        <span aria-hidden className="mx-1 h-3.5 w-px bg-card-edge" />

        <Blocks
          aria-hidden
          className="size-3.5 shrink-0 text-ink-400"
          strokeWidth={2}
        />
        <span className="sr-only">House styles:</span>
        {client.houseStyles.length > 0 ? (
          client.houseStyles.map((style_) => (
            <span
              key={style_}
              className="rounded-full bg-card-muted px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-card-edge ring-inset"
            >
              {style_}
            </span>
          ))
        ) : (
          <span className="text-xs text-ink-400">Open to anything</span>
        )}
      </div>
    </button>
  );
}
