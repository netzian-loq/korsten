"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useNow } from "@/app/_components/use-now";
import { formatDollars } from "@/lib/format";
import {
  awardBadges,
  blankOffer,
  boardVerdict,
  calculateOffer,
  daysUntil,
  DEFAULT_SELLER_COSTS,
  isComplete,
  MAX_OFFERS,
  SEED_OFFERS,
  type Offer,
  type SellerCosts,
} from "@/lib/offers";

import { OfferColumn } from "./offer-column";

export function OffersBoard() {
  const reduceMotion = useReducedMotion();
  const now = useNow();

  const [offers, setOffers] = useState<Offer[]>(SEED_OFFERS);
  const [costs, setCosts] = useState<SellerCosts>(DEFAULT_SELLER_COSTS);
  const nextId = useRef(0);

  const maths = useMemo(
    () =>
      new Map(offers.map((offer) => [offer.id, calculateOffer(offer, costs)])),
    [offers, costs],
  );

  const badges = useMemo(() => awardBadges(offers, costs), [offers, costs]);
  const verdict = useMemo(() => boardVerdict(offers, costs), [offers, costs]);

  /** One scale for every bar, so the columns can be read against each other. */
  const scaleMax = useMemo(
    () => Math.max(1, ...offers.map((offer) => offer.purchasePrice)),
    [offers],
  );

  // Unpriced columns would otherwise drag the reference line down to a
  // negative net the size of the payoff.
  const bestNet = useMemo(() => {
    const priced = offers.filter(isComplete);
    return priced.length === 0
      ? 0
      : Math.max(...priced.map((offer) => maths.get(offer.id)!.netProceeds));
  }, [offers, maths]);

  const updateOffer = (id: string, patch: Partial<Offer>) =>
    setOffers((current) =>
      current.map((offer) => (offer.id === id ? { ...offer, ...patch } : offer)),
    );

  const addOffer = () =>
    setOffers((current) =>
      current.length >= MAX_OFFERS
        ? current
        : [
            ...current,
            blankOffer(current.length, `offer-added-${nextId.current++}`),
          ],
    );

  const removeOffer = (id: string) =>
    setOffers((current) => current.filter((offer) => offer.id !== id));

  const updateCosts = (patch: Partial<SellerCosts>) =>
    setCosts((current) => ({ ...current, ...patch }));

  return (
    <>
      <header>
        <p className="text-eyebrow font-mono uppercase text-accent-400">
          Offers · 302 Bellwether
        </p>

        <h1 className="mt-2.5 text-display text-mist-50">
          {verdict.kind === "split" && "The top bid isn’t the top net."}
          {verdict.kind === "aligned" &&
            `${verdict.label} leads on price and net.`}
          {verdict.kind === "single" && "One offer on the board."}
          {verdict.kind === "empty" && "Nothing to compare yet."}
        </h1>

        <p className="mt-2 max-w-xl text-[0.9375rem] text-mist-400">
          {verdict.kind === "split" && (
            <>
              {verdict.topPriceLabel} bids the most.{" "}
              <span className="text-mist-100">{verdict.topNetLabel}</span> puts{" "}
              <span className="font-mono text-mist-100">
                {formatDollars(verdict.gap)}
              </span>{" "}
              more in the seller&rsquo;s pocket.
            </>
          )}
          {verdict.kind === "aligned" &&
            "The strongest number is also the strongest take-home. Weigh the close date and inspection window before calling it."}
          {verdict.kind === "single" &&
            "Add a second offer and the badges start comparing."}
          {verdict.kind === "empty" &&
            "Add up to four offers to compare them side by side."}
        </p>
      </header>

      <section
        aria-labelledby="seller-costs-heading"
        className="panel mt-7 flex flex-wrap items-end gap-x-6 gap-y-4 px-5 py-4"
      >
        <div className="mr-auto">
          <h2
            id="seller-costs-heading"
            className="text-eyebrow uppercase text-mist-500"
          >
            Seller costs
          </h2>
          <p className="mt-1.5 text-xs text-mist-400">
            Shared by every offer. The payoff moves all four nets together.
          </p>
        </div>

        <CostField
          label="Commission"
          suffix="%"
          step={0.25}
          value={costs.commissionPct}
          onChange={(commissionPct) => updateCosts({ commissionPct })}
        />
        <CostField
          label="Title & escrow"
          suffix="%"
          step={0.1}
          value={costs.closingCostPct}
          onChange={(closingCostPct) => updateCosts({ closingCostPct })}
        />
        <CostField
          label="Loan payoff"
          prefix="$"
          step={5000}
          width="w-28"
          value={costs.mortgagePayoff}
          onChange={(mortgagePayoff) => updateCosts({ mortgagePayoff })}
        />
      </section>

      {offers.length > 0 && (
        <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-mist-500">
          <span
            aria-hidden
            className="inline-block w-7 border-t border-dashed border-good-600/60"
          />
          Best net on the board. Bars share one scale, so a taller price landing
          below the line is losing money somewhere.
        </p>
      )}

      <div className="mt-3 flex items-stretch gap-3 overflow-x-auto pb-3">
        <AnimatePresence initial={false} mode="popLayout">
          {offers.map((offer) => (
            <motion.div
              key={offer.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }
              }
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-w-[13rem] flex-1 basis-0"
            >
              <OfferColumn
                offer={offer}
                math={maths.get(offer.id)!}
                costs={costs}
                badges={badges[offer.id] ?? []}
                scaleMax={scaleMax}
                bestNet={bestNet}
                daysOut={now ? daysUntil(offer.closingDate, now) : null}
                onChange={(patch) => updateOffer(offer.id, patch)}
                onRemove={() => removeOffer(offer.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {offers.length < MAX_OFFERS && (
          <button
            type="button"
            onClick={addOffer}
            className="flex min-w-[13rem] flex-1 basis-0 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-navy-600 px-4 py-10 text-mist-400 transition-colors hover:border-accent-500/60 hover:bg-navy-800/40 hover:text-mist-100"
          >
            <span className="grid size-9 place-items-center rounded-full bg-navy-700/70">
              <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-sm font-semibold">Add offer</span>
            <span className="text-xs text-mist-500">
              {MAX_OFFERS - offers.length} slot
              {MAX_OFFERS - offers.length === 1 ? "" : "s"} left
            </span>
          </button>
        )}
      </div>

      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-mist-500">
        Estimates only. Net proceeds apply the seller costs above and exclude
        prorated taxes, HOA dues, home warranty, and any repair credits
        negotiated after inspection. Confirm against the settlement statement
        before advising a client.
      </p>
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
