"use client";

import { Plus, Presentation, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { formatDollars } from "@/lib/format";
import {
  addOffer,
  resetBoard,
  updateBoard,
  useOfferBoard,
} from "@/lib/offer-store";
import { awardBadges, fieldGuide, isInPlay, MAX_OFFERS } from "@/lib/offers";

import { OfferCard } from "./offer-card";

const TOOLBAR =
  "inline-flex items-center gap-1.5 rounded-md border border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 hover:text-mist-100 disabled:cursor-not-allowed disabled:opacity-50";

const HEADER_INPUT =
  "rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400";

export function OfferBoard() {
  const board = useOfferBoard();
  const [confirmReset, setConfirmReset] = useState(false);

  const presenting = board.presentationMode;
  const badges = awardBadges(board.offers);

  // Hiding an offer removes it from the seller's view entirely; while editing
  // it stays on the board, dimmed, so it can be toggled back.
  const visible = presenting
    ? board.offers.filter((offer) => !offer.hidden)
    : board.offers;

  const counted = board.offers.filter(isInPlay).length;

  return (
    <>
      <section className="panel mt-6 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          {presenting ? (
            <div className="min-w-0">
              <h2 className="text-title text-mist-50">
                {board.propertyAddress || "This property"}
              </h2>
              <p className="mt-1 text-sm text-mist-400">
                {board.listPrice !== null && (
                  <>Listed at {formatDollars(board.listPrice)} · </>
                )}
                {visible.length} offer{visible.length === 1 ? "" : "s"} on the table
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500">
                  Property
                </span>
                <input
                  value={board.propertyAddress}
                  onChange={(event) =>
                    updateBoard({ propertyAddress: event.target.value })
                  }
                  placeholder="302 Bellwether Ave"
                  className={`mt-1.5 w-56 ${HEADER_INPUT}`}
                />
              </label>

              <label className="block">
                <span className="block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500">
                  List price
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={board.listPrice ?? ""}
                  onChange={(event) =>
                    updateBoard({
                      listPrice:
                        event.target.value === ""
                          ? null
                          : Number(event.target.value) || 0,
                    })
                  }
                  placeholder="865000"
                  className={`mt-1.5 w-32 font-mono tabular-nums ${HEADER_INPUT}`}
                />
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!presenting && (
              <>
                <button
                  type="button"
                  onClick={addOffer}
                  disabled={board.offers.length >= MAX_OFFERS}
                  title={
                    board.offers.length >= MAX_OFFERS
                      ? `The board holds ${MAX_OFFERS} offers`
                      : "Add another offer slot"
                  }
                  className={TOOLBAR}
                >
                  <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
                  Add offer ({board.offers.length}/{MAX_OFFERS})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirmReset) {
                      resetBoard();
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
              onClick={() => updateBoard({ presentationMode: !presenting })}
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
              : `Comparing ${counted} offer${counted === 1 ? "" : "s"}. ${fieldGuide("agentNotes").hint}`}
          </p>
        )}
      </section>

      {/* Side by side, scrolling horizontally when four will not fit.
          `relative` is load-bearing: an overflow container only clips
          absolutely positioned descendants when it is itself positioned, and
          Tailwind's sr-only is position:absolute. Without it those spans escape
          the scroller and give the whole page a sideways scrollbar. */}
      <div className="relative mt-4 flex items-stretch gap-3 overflow-x-auto pb-3">
        {visible.map((offer) => (
          <div key={offer.id} className="flex min-w-[14.5rem] flex-1 basis-0">
            <OfferCard
              offer={offer}
              badges={badges[offer.id] ?? []}
              presenting={presenting}
            />
          </div>
        ))}

        {!presenting && board.offers.length < MAX_OFFERS && (
          <button
            type="button"
            onClick={addOffer}
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
