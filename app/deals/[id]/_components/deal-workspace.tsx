"use client";

import { ArrowLeft, ClipboardCheck, Scale, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InspectionModule } from "@/app/inspection/_components/inspection-module";
import { OfferBoard } from "@/app/offers/_components/offer-board";
import { removeDeal, updateDeal, useDeal } from "@/lib/deal-store";
import {
  DEAL_STAGES,
  STAGE_LABEL,
  STAGE_MEANING,
  toolsFor,
  type DealSide,
  type DealStage,
  type DealTool,
} from "@/lib/deals";

import { DealTimeline } from "./deal-timeline";

const FIELD =
  "mt-1 w-full rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400";
const FIELD_LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500";

const TOOL_LABEL: Record<DealTool, string> = {
  timeline: "Timeline",
  offers: "Offers",
  inspection: "Inspection",
};

const TOOL_ICON = {
  timeline: ClipboardCheck,
  offers: Scale,
  inspection: ClipboardCheck,
} as const;

export function DealWorkspace({ dealId }: { dealId: string }) {
  const deal = useDeal(dealId);
  const router = useRouter();
  const [tab, setTab] = useState<DealTool | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!deal) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <p className="text-mist-300">That deal is not on this device.</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400 hover:underline"
        >
          <ArrowLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
          Back to today
        </Link>
      </main>
    );
  }

  const tools = toolsFor(deal);
  const active = tab && tools.includes(tab) ? tab : (tools[0] ?? null);

  return (
    <main className="min-w-0 px-safe">
      <div className="pt-safe">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-6 md:px-8 md:pb-16 md:pt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-mist-400 transition-colors hover:text-mist-100"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
            Today
          </Link>

          <header className="panel mt-4 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
              <div className="min-w-0 flex-1">
                <input
                  value={deal.address}
                  onChange={(event) => updateDeal(deal.id, { address: event.target.value })}
                  aria-label="Property address"
                  placeholder="302 Bellwether Ave"
                  className="-ml-1.5 w-full rounded-md bg-transparent px-1.5 py-0.5 text-display text-mist-50 transition-colors hover:bg-navy-800/60 focus:bg-navy-800/60"
                />
                <p className="mt-1.5 pl-0.5 text-sm text-mist-400">
                  {STAGE_MEANING[deal.side][deal.stage]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirmDelete) {
                    removeDeal(deal.id);
                    router.push("/");
                  } else {
                    setConfirmDelete(true);
                  }
                }}
                onBlur={() => setConfirmDelete(false)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 ${
                  confirmDelete ? "border-alert-500/50 text-alert-300" : ""
                }`}
              >
                <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
                {confirmDelete ? "Delete for good — confirm" : "Delete"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-navy-700 pt-3.5 md:grid-cols-5">
              <label className="block">
                <span className={FIELD_LABEL}>Representing</span>
                <select
                  value={deal.side}
                  onChange={(event) =>
                    updateDeal(deal.id, { side: event.target.value as DealSide })
                  }
                  className={FIELD}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller (listing)</option>
                </select>
              </label>

              <label className="block">
                <span className={FIELD_LABEL}>Stage</span>
                <select
                  value={deal.stage}
                  onChange={(event) =>
                    updateDeal(deal.id, { stage: event.target.value as DealStage })
                  }
                  className={FIELD}
                >
                  {DEAL_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABEL[stage]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={FIELD_LABEL}>Client</span>
                <input
                  value={deal.clientName}
                  onChange={(event) =>
                    updateDeal(deal.id, { clientName: event.target.value })
                  }
                  placeholder="Ada Okonkwo"
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className={FIELD_LABEL}>
                  {deal.side === "seller" ? "List price" : "Price"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={deal.price ?? ""}
                  onChange={(event) =>
                    updateDeal(deal.id, {
                      price:
                        event.target.value === "" ? null : Number(event.target.value) || 0,
                    })
                  }
                  placeholder="865000"
                  className={`${FIELD} font-mono tabular-nums`}
                />
              </label>

              <label className="block">
                <span className={FIELD_LABEL}>Accepted</span>
                <input
                  type="date"
                  value={deal.acceptedDate}
                  onChange={(event) =>
                    updateDeal(deal.id, { acceptedDate: event.target.value })
                  }
                  title="Mutual acceptance. Every contract deadline is calculated from this."
                  className={`${FIELD} font-mono tabular-nums`}
                />
              </label>
            </div>
          </header>

          {tools.length === 0 ? (
            <NextStep side={deal.side} stage={deal.stage} />
          ) : (
            <>
              {tools.length > 1 && (
                <div
                  role="group"
                  aria-label="Deal tools"
                  className="mt-5 flex gap-1 self-start rounded-full border border-navy-700 bg-navy-850/70 p-1 no-select"
                >
                  {tools.map((tool) => {
                    const Icon = TOOL_ICON[tool];
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => setTab(tool)}
                        aria-pressed={active === tool}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          active === tool
                            ? "bg-mist-100 text-navy-900"
                            : "text-mist-400 hover:text-mist-100"
                        }`}
                      >
                        <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
                        {TOOL_LABEL[tool]}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-4">
                {active === "timeline" && <DealTimeline deal={deal} />}
                {active === "offers" && <OfferBoard deal={deal} />}
                {active === "inspection" && <InspectionModule deal={deal} />}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/** When a deal carries no tools yet, say what would unlock them. */
function NextStep({ side, stage }: { side: DealSide; stage: DealStage }) {
  const message =
    stage === "prospect"
      ? side === "seller"
        ? "Win the listing and move this to Active. The offer board opens up once you are taking offers."
        : "Sign them as a client and move this to Active."
      : "Move this to Under contract once an offer is accepted, and the timeline and inspection open up.";

  return (
    <div className="panel mt-5 px-6 py-10 text-center">
      <p className="text-sm text-mist-300">{message}</p>
    </div>
  );
}
