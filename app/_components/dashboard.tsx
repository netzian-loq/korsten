"use client";

import { ArrowRight, Plus, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { addDeal, useDeals } from "@/lib/deal-store";
import {
  collectDeadlines,
  dealMilestones,
  DEAL_STAGES,
  pipeline,
  STAGE_LABEL,
  type Deal,
  type DealSide,
  type DealStage,
} from "@/lib/deals";
import { formatDollars } from "@/lib/format";

import { DeadlineList } from "./deadline-list";

export const STAGE_CHIP: Record<DealStage, string> = {
  prospect: "bg-navy-700 text-mist-300",
  active: "bg-accent-500/15 text-accent-300",
  "under-contract": "bg-alert-500/15 text-alert-300",
  closed: "bg-good-500/15 text-good-400",
};

const FIELD =
  "w-full rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400";
const FIELD_LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500";

export function Dashboard() {
  const deals = useDeals();
  const [adding, setAdding] = useState(false);

  // Only ever runs on the client: the server snapshot has no deals, so there
  // are no deadlines to draw during hydration.
  const deadlines = collectDeadlines(deals, dealMilestones, new Date());
  const summary = pipeline(deals);

  return (
    <>
      <div className="mt-7 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="due-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="due-heading" className="text-title text-mist-50">
              What&rsquo;s due
            </h2>
            <p className="text-xs text-mist-500">
              Across {summary.underContractCount} deal
              {summary.underContractCount === 1 ? "" : "s"} under contract
            </p>
          </div>
          <div className="mt-3">
            <DeadlineList deadlines={deadlines} />
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="panel px-4 py-4" aria-labelledby="pipeline-heading">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="pipeline-heading" className="text-eyebrow uppercase text-mist-500">
                Pipeline
              </h2>
              {summary.underContractValue > 0 && (
                <p data-numeric className="font-mono text-xs text-mist-300">
                  {formatDollars(summary.underContractValue)} in flight
                </p>
              )}
            </div>

            <ul className="mt-3 flex flex-col gap-1">
              {DEAL_STAGES.map((stage) => (
                <li key={stage} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-mist-300">{STAGE_LABEL[stage]}</span>
                  <span data-numeric className="font-mono text-mist-100">
                    {summary.byStage[stage].length}
                  </span>
                </li>
              ))}
            </ul>

            {adding ? (
              <NewDealForm onDone={() => setAdding(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-tile bg-accent-500 px-3 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-400"
              >
                <Plus className="size-4" strokeWidth={2.75} aria-hidden />
                New deal
              </button>
            )}
          </section>

          <Link
            href="/clients"
            className="panel flex items-center gap-3 px-4 py-3 transition-colors hover:border-navy-600"
          >
            <Users className="size-4 shrink-0 text-mist-400" strokeWidth={2} aria-hidden />
            <span className="min-w-0 flex-1 text-sm font-semibold text-mist-100">
              Clients &amp; documents
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-mist-500" strokeWidth={2.25} aria-hidden />
          </Link>
        </aside>
      </div>

      <section className="mt-8" aria-labelledby="deals-heading">
        <h2 id="deals-heading" className="text-title text-mist-50">
          Deals
        </h2>

        {deals.length === 0 ? (
          <p className="mt-3 rounded-tile border border-dashed border-navy-700 px-5 py-10 text-center text-sm text-mist-500">
            No deals yet. Add one and the deadlines, offers, and inspection all
            hang off it.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {deals.map((deal) => (
              <li key={deal.id}>
                <DealCard deal={deal} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const milestones = dealMilestones(deal);
  const current = milestones.find((milestone) => milestone.status === "current");
  const done = milestones.filter((milestone) => milestone.done).length;

  return (
    <Link
      href={`/deals/${deal.id}`}
      className="group flex h-full flex-col rounded-tile border border-navy-700/70 px-4 py-3 transition-colors hover:border-navy-600 hover:bg-navy-800/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mist-100">
          {deal.address || "Untitled deal"}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${STAGE_CHIP[deal.stage]}`}
        >
          {STAGE_LABEL[deal.stage]}
        </span>
      </div>

      <p className="mt-1 truncate text-xs text-mist-500">
        {deal.side === "seller" ? "Listing" : "Buyer"}
        {deal.clientName && ` · ${deal.clientName}`}
        {deal.price !== null && ` · ${formatDollars(deal.price)}`}
      </p>

      {milestones.length > 0 && (
        <p className="mt-2 truncate text-xs text-mist-400">
          <span data-numeric className="font-mono text-mist-300">
            {done}/{milestones.length}
          </span>
          {current && ` · next: ${current.name}`}
        </p>
      )}
    </Link>
  );
}

function NewDealForm({ onDone }: { onDone: () => void }) {
  const [address, setAddress] = useState("");
  const [side, setSide] = useState<DealSide>("buyer");
  const [clientName, setClientName] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!address.trim()) return;
        addDeal({ address, side, clientName: clientName.trim(), stage: "active" });
        onDone();
      }}
      className="mt-4 flex flex-col gap-2.5 border-t border-navy-700 pt-3.5"
      aria-label="New deal"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-mist-100">New deal</span>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancel"
          className="grid size-6 place-items-center rounded-md text-mist-400 transition-colors hover:bg-navy-700"
        >
          <X className="size-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <label className="block">
        <span className={FIELD_LABEL}>Property</span>
        <input
          autoFocus
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="302 Bellwether Ave"
          required
          className={`mt-1 ${FIELD}`}
        />
      </label>

      <fieldset>
        <legend className={FIELD_LABEL}>Representing</legend>
        <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-md bg-navy-850 p-1">
          {(["buyer", "seller"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSide(option)}
              aria-pressed={side === option}
              className={`rounded px-2 py-1.5 text-xs font-semibold capitalize transition-colors ${
                side === option
                  ? "bg-accent-400 text-navy-950"
                  : "text-mist-400 hover:text-mist-100"
              }`}
            >
              {option === "seller" ? "Seller (listing)" : "Buyer"}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={FIELD_LABEL}>Client</span>
        <input
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder="Ada Okonkwo"
          className={`mt-1 ${FIELD}`}
        />
      </label>

      <button
        type="submit"
        disabled={!address.trim()}
        className="mt-1 rounded-md bg-accent-500 px-3 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Add deal
      </button>
    </form>
  );
}
