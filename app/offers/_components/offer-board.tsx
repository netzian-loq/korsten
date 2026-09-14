"use client";

import { Plus, Presentation, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import type { Deal } from "@/lib/deals";
import { formatDollars } from "@/lib/format";
import {
  addOffer,
  resetBoard,
  updateBoard,
  updateSellerCosts,
  useOfferBoard,
} from "@/lib/offer-store";
import { awardBadges, isInPlay, MAX_OFFERS, offerMath } from "@/lib/offers";

import { OfferCard } from "./offer-card";

const TOOLBAR =
  "inline-flex items-center gap-1.5 rounded-md border border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 hover:text-mist-100 disabled:cursor-not-allowed disabled:opacity-50";

/** Comparing the offers on one listing, on the number the seller decides by. */
export function OfferBoard({ deal }: { deal: Deal }) {
  const board = useOfferBoard(deal.id);
  const [confirmReset, setConfirmReset] = useState(false);

  const presenting = board.presentationMode;
  const badges = awardBadges(board.offers, board.sellerCosts);

  const visible = presenting
    ? board.offers.filter((offer) => !offer.hidden)
    : board.offers;

  const counted = board.offers.filter(isInPlay).length;
  const bestNet = Math.max(
    0,
    ...board.offers
      .filter(isInPlay)
      .map((offer) => offerMath(offer, board.sellerCosts)?.netProceeds ?? 0),
  );

  return (
    <>
      <section className="panel px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          {presenting ? (
            <div className="min-w-0">
              <h3 className="text-title text-mist-50">
                {deal.address || "This property"}
              </h3>
              <p className="mt-1 text-sm text-mist-400">
                {deal.price !== null && <>Listed at {formatDollars(deal.price)} · </>}
                {visible.length} offer{visible.length === 1 ? "" : "s"} on the table
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div className="mr-2">
                <p className="text-eyebrow uppercase text-mist-500">Your costs</p>
                <p className="mt-1 text-xs text-mist-400">
                  Applied to every offer to work out your net.
                </p>
              </div>

              <CostField
                label="Commission"
                suffix="%"
                step={0.25}
                value={board.sellerCosts.commissionPct}
                onChange={(commissionPct) => updateSellerCosts(deal.id, { commissionPct })}
              />
              <CostField
                label="Title & escrow"
                suffix="%"
                step={0.1}
                value={board.sellerCosts.closingCostPct}
                onChange={(closingCostPct) => updateSellerCosts(deal.id, { closingCostPct })}
              />
              <CostField
                label="Loan payoff"
                prefix="$"
                step={5000}
                width="w-28"
                value={board.sellerCosts.mortgagePayoff}
                onChange={(mortgagePayoff) => updateSellerCosts(deal.id, { mortgagePayoff })}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!presenting && (
              <>
                <button
                  type="button"
                  onClick={() => addOffer(deal.id)}
                  disabled={board.offers.length >= MAX_OFFERS}
                  className={TOOLBAR}
                >
                  <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
                  Add offer ({board.offers.length}/{MAX_OFFERS})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirmReset) {
                      resetBoard(deal.id);
                      setConfirmReset(false);
                    } else {
                      setConfirmReset(true);
                    }
                  }}
                  onBlur={() => setConfirmReset(false)}
                  className={`${TOOLBAR} ${confirmReset ? "border-alert-500/50 text-alert-300" : ""}`}
                >
                  <RotateCcw className="size-3.5" strokeWidth={2.25} aria-hidden />
                  {confirmReset ? "Clears the board — confirm" : "Start over"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => updateBoard(deal.id, { presentationMode: !presenting })}
              aria-pressed={presenting}
              className={
                presenting
                  ? `${TOOLBAR} border-accent-500/60 bg-accent-500/15 text-accent-200`
                  : TOOLBAR
              }
            >
              {presenting ? (
                <X className="size-3.5" strokeWidth={2.5} aria-hidden />
              ) : (
                <Presentation className="size-3.5" strokeWidth={2.25} aria-hidden />
              )}
              {presenting ? "Exit presentation" : "Seller Presentation View"}
            </button>
          </div>
        </div>

        {!presenting && (
          <p className="mt-3.5 border-t border-navy-700 pt-3 text-xs text-mist-500">
            {counted < 2
              ? "Add a price to at least two offers and the badges start comparing."
              : "Highest Net leads, because the biggest number on the contract is not always the most money in the seller's pocket."}
          </p>
        )}
      </section>

      {/* `relative` is load-bearing: an overflow container only clips absolutely
          positioned descendants when it is itself positioned, and sr-only is
          position:absolute. Without it the page gets a sideways scrollbar. */}
      <div className="relative mt-4 flex items-stretch gap-3 overflow-x-auto pb-3">
        {visible.map((offer) => (
          <div key={offer.id} className="flex min-w-[14.5rem] flex-1 basis-0">
            <OfferCard
              dealId={deal.id}
              offer={offer}
              badges={badges[offer.id] ?? []}
              math={offerMath(offer, board.sellerCosts)}
              bestNet={bestNet}
              presenting={presenting}
            />
          </div>
        ))}

        {!presenting && board.offers.length < MAX_OFFERS && (
          <button
            type="button"
            onClick={() => addOffer(deal.id)}
            className="flex min-w-[14.5rem] flex-1 basis-0 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-navy-600 px-4 py-12 text-mist-400 transition-colors hover:border-accent-500/60 hover:bg-navy-800/40 hover:text-mist-100"
          >
            <span className="grid size-9 place-items-center rounded-full bg-navy-700/70">
              <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-sm font-semibold">Add Offer</span>
            <span className="text-xs text-mist-500">
              {MAX_OFFERS - board.offers.length} slot
              {MAX_OFFERS - board.offers.length === 1 ? "" : "s"} left
            </span>
          </button>
        )}

        {presenting && visible.length === 0 && (
          <p className="w-full rounded-card border border-dashed border-navy-600 px-6 py-12 text-center text-sm text-mist-400">
            Every offer is hidden. Exit presentation view to bring one back.
          </p>
        )}
      </div>
    </>
  );
}

function CostField({
  label,
  value,
  onChange,
  step,
  prefix,
  suffix,
  width = "w-20",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  prefix?: string;
  suffix?: string;
  width?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500">
        {label}
      </span>
      <span className="mt-1.5 flex items-center gap-1 rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 transition-colors focus-within:border-accent-400 focus-within:ring-2 focus-within:ring-accent-400/30">
        {prefix && <span className="text-xs text-mist-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value || ""}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className={`${width} bg-transparent font-mono text-sm tabular-nums text-mist-100 outline-none`}
        />
        {suffix && <span className="text-xs text-mist-500">{suffix}</span>}
      </span>
    </label>
  );
}
