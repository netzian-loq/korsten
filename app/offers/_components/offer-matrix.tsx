"use client";

import {
  Banknote,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { formatDollars, formatISODateShort } from "@/lib/format";
import {
  removeOffer,
  toggleContingency,
  toggleOfferHidden,
  updateOffer,
} from "@/lib/offer-store";
import {
  BADGE_LABEL,
  CONTINGENCIES,
  daysUntil,
  FINANCING_TYPES,
  isInPlay,
  type BadgeKind,
  type FinancingType,
  type Offer,
} from "@/lib/offers";

const BADGE_ICON: Record<BadgeKind, LucideIcon> = {
  "highest-price": TrendingUp,
  "fastest-close": Zap,
  "all-cash": Banknote,
  "fewest-contingencies": ShieldCheck,
};

/** Which row each badge decides, so the winning cell can light up. */
const ROW_FOR_BADGE = {
  price: "highest-price",
  closing: "fastest-close",
  financing: "all-cash",
  contingencies: "fewest-contingencies",
} as const;

const INPUT =
  "w-full rounded-md border border-card-edge bg-card-muted px-2 py-1 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-accent-400 focus:bg-card";
const NUMERIC = `${INPUT} font-mono tabular-nums`;

const LABEL_CELL =
  "sticky left-0 z-10 flex items-center border-t border-card-edge bg-card px-3 py-3 text-[0.625rem] font-bold uppercase tracking-wider text-ink-400";

type Props = {
  offers: Offer[];
  badges: Record<string, BadgeKind[]>;
  presenting: boolean;
};

/**
 * The comparison board.
 *
 * A matrix, not a row of forms: every term is a row that runs straight across
 * the offers, so price lines up with price and the eye compares in one sweep.
 * The best cell in each row is highlighted — that is the comparison, visible
 * without reading anything.
 */
export function OfferMatrix({ offers, badges, presenting }: Props) {
  const ranked = offers.filter(isInPlay);
  const topPrice = Math.max(0, ...ranked.map((offer) => offer.purchasePrice ?? 0));

  // Safe to read the clock: the board only renders with offers after hydration.
  const today = new Date();

  const wins = (offer: Offer, row: keyof typeof ROW_FOR_BADGE) =>
    (badges[offer.id] ?? []).includes(ROW_FOR_BADGE[row]);

  const columns = `9rem repeat(${offers.length}, minmax(11rem, 1fr))`;

  return (
    <div className="card overflow-x-auto">
      {/* No min-w-max: the columns share the width available and only push
          the container into scrolling once they hit their 11rem minimum. */}
      <div className="grid" style={{ gridTemplateColumns: columns }}>
        {/* ---- header: who each offer is ---- */}
        <div className="sticky left-0 z-10 bg-card px-3 pb-2 pt-3" />
        {offers.map((offer) => (
          <div
            key={`head-${offer.id}`}
            className={`px-3 pb-2 pt-3 ${offer.hidden ? "opacity-40" : ""}`}
          >
            <div className="flex items-start gap-1">
              {presenting ? (
                <h3 className="min-w-0 flex-1 truncate text-title text-ink-900">
                  {offer.label}
                </h3>
              ) : (
                <input
                  value={offer.label}
                  onChange={(event) =>
                    updateOffer(offer.id, { label: event.target.value })
                  }
                  aria-label={`Name for ${offer.label}`}
                  className="-ml-1.5 min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-0.5 text-title text-ink-900 transition-colors hover:bg-card-muted focus:bg-card-muted"
                />
              )}

              {!presenting && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleOfferHidden(offer.id)}
                    aria-pressed={offer.hidden}
                    title={offer.hidden ? "Show in the comparison" : "Hide from the comparison"}
                    className="grid size-6 shrink-0 place-items-center rounded text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
                  >
                    {offer.hidden ? (
                      <EyeOff className="size-3" strokeWidth={2.25} aria-hidden />
                    ) : (
                      <Eye className="size-3" strokeWidth={2.25} aria-hidden />
                    )}
                    <span className="sr-only">
                      {offer.hidden ? "Show" : "Hide"} {offer.label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOffer(offer.id)}
                    aria-label={`Remove ${offer.label}`}
                    className="grid size-6 shrink-0 place-items-center rounded text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
                  >
                    <X className="size-3" strokeWidth={2.5} aria-hidden />
                  </button>
                </>
              )}
            </div>

            <ul className="mt-1.5 flex min-h-[1.5rem] flex-wrap gap-1">
              {(badges[offer.id] ?? []).map((badge) => {
                const Icon = BADGE_ICON[badge];
                return (
                  <li
                    key={badge}
                    className="inline-flex items-center gap-1 rounded-full bg-good-500/14 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wide text-good-700"
                  >
                    <Icon className="size-2.5" strokeWidth={2.75} aria-hidden />
                    {BADGE_LABEL[badge]}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* ---- price ---- */}
        <div className={LABEL_CELL}>Price</div>
        {offers.map((offer) => (
          <Cell key={`price-${offer.id}`} win={wins(offer, "price")} dim={offer.hidden}>
            {presenting ? (
              <p data-numeric className="font-display text-metric text-ink-900">
                {formatDollars(offer.purchasePrice)}
              </p>
            ) : (
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={offer.purchasePrice ?? ""}
                onChange={(event) =>
                  updateOffer(offer.id, {
                    purchasePrice: event.target.value === "" ? null : Number(event.target.value) || 0,
                  })
                }
                placeholder="865000"
                aria-label={`Purchase price for ${offer.label}`}
                className={`${NUMERIC} text-lg`}
              />
            )}

            {/* The bar is the comparison: length is price against the top bid. */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-sunken">
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  wins(offer, "price") ? "bg-good-500" : "bg-navy-500/50"
                }`}
                style={{
                  width:
                    topPrice > 0 && offer.purchasePrice
                      ? `${(offer.purchasePrice / topPrice) * 100}%`
                      : "0%",
                }}
              />
            </div>
          </Cell>
        ))}

        {/* ---- closing ---- */}
        <div className={LABEL_CELL}>Closing</div>
        {offers.map((offer) => {
          const daysOut = offer.closingDate ? daysUntil(offer.closingDate, today) : null;
          return (
            <Cell key={`close-${offer.id}`} win={wins(offer, "closing")} dim={offer.hidden}>
              {presenting ? (
                <p className="text-lg font-semibold text-ink-900">
                  {formatISODateShort(offer.closingDate)}
                </p>
              ) : (
                <input
                  type="date"
                  value={offer.closingDate}
                  onChange={(event) =>
                    updateOffer(offer.id, { closingDate: event.target.value })
                  }
                  aria-label={`Closing date for ${offer.label}`}
                  className={NUMERIC}
                />
              )}
              <p className="mt-1 text-xs text-ink-500">
                {daysOut === null
                  ? "No date set"
                  : daysOut < 0
                    ? "Already past"
                    : `${daysOut}-day close`}
              </p>
            </Cell>
          );
        })}

        {/* ---- financing ---- */}
        <div className={LABEL_CELL}>Financing</div>
        {offers.map((offer) => (
          <Cell key={`fin-${offer.id}`} win={wins(offer, "financing")} dim={offer.hidden}>
            {presenting ? (
              <p className="text-lg font-semibold text-ink-900">{offer.financingType}</p>
            ) : (
              <select
                value={offer.financingType}
                onChange={(event) => {
                  const financingType = event.target.value as FinancingType;
                  // Cash means the whole price is down, by definition.
                  updateOffer(
                    offer.id,
                    financingType === "Cash"
                      ? { financingType, downPaymentPct: 100 }
                      : { financingType },
                  );
                }}
                aria-label={`Financing for ${offer.label}`}
                className={INPUT}
              >
                {FINANCING_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-ink-500">
              {offer.financingType === "Cash" ? (
                "No loan, no appraisal"
              ) : presenting ? (
                `${offer.downPaymentPct ?? 0}% down`
              ) : (
                <label className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={offer.downPaymentPct ?? ""}
                    onChange={(event) =>
                      updateOffer(offer.id, {
                        downPaymentPct:
                          event.target.value === "" ? null : Number(event.target.value) || 0,
                      })
                    }
                    aria-label={`Down payment percent for ${offer.label}`}
                    className="w-14 rounded border border-card-edge bg-card-muted px-1 py-0.5 font-mono tabular-nums text-ink-900"
                  />
                  % down
                </label>
              )}
            </p>
          </Cell>
        ))}

        {/* ---- contingencies ---- */}
        <div className={LABEL_CELL}>Contingencies</div>
        {offers.map((offer) => (
          <Cell key={`cont-${offer.id}`} win={wins(offer, "contingencies")} dim={offer.hidden}>
            <div className="flex flex-wrap gap-1">
              {CONTINGENCIES.map((contingency) => {
                const kept = offer.contingencies.includes(contingency.id);
                const face = kept
                  ? "bg-navy-900 text-mist-50"
                  : "bg-card-sunken text-ink-400 line-through";

                return presenting ? (
                  <span
                    key={contingency.id}
                    className={`rounded px-1.5 py-0.5 text-[0.625rem] font-semibold ${face}`}
                  >
                    {contingency.label}
                  </span>
                ) : (
                  <button
                    key={contingency.id}
                    type="button"
                    onClick={() => toggleContingency(offer.id, contingency.id)}
                    aria-pressed={kept}
                    title={contingency.hint}
                    className={`rounded px-1.5 py-0.5 text-[0.625rem] font-semibold transition-colors ${face}`}
                  >
                    {contingency.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              {offer.contingencies.length === 0
                ? "All waived"
                : `${offer.contingencies.length} kept, ${
                    CONTINGENCIES.length - offer.contingencies.length
                  } waived`}
            </p>
          </Cell>
        ))}

        {/* ---- special terms ---- */}
        <div className={LABEL_CELL}>Special terms</div>
        {offers.map((offer) => (
          <Cell key={`terms-${offer.id}`} win={false} dim={offer.hidden}>
            {presenting ? (
              <p className="text-xs leading-relaxed text-ink-700">
                {offer.specialTerms || "—"}
              </p>
            ) : (
              <textarea
                rows={2}
                value={offer.specialTerms}
                onChange={(event) =>
                  updateOffer(offer.id, { specialTerms: event.target.value })
                }
                placeholder="Escalates to $890k · 14-day rent-back"
                aria-label={`Special terms for ${offer.label}`}
                className={`${INPUT} resize-y text-xs`}
              />
            )}
          </Cell>
        ))}

        {/* ---- agent notes: never shown to the client ---- */}
        {!presenting && (
          <>
            <div className={LABEL_CELL}>
              Your notes
              <span className="sr-only"> (hidden in presentation view)</span>
            </div>
            {offers.map((offer) => (
              <Cell key={`notes-${offer.id}`} win={false} dim={offer.hidden}>
                <textarea
                  rows={2}
                  value={offer.agentNotes}
                  onChange={(event) =>
                    updateOffer(offer.id, { agentNotes: event.target.value })
                  }
                  placeholder="Local lender, responsive"
                  aria-label={`Your notes on ${offer.label}`}
                  className={`${INPUT} resize-y text-xs`}
                />
              </Cell>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** One cell. The green wash plus the tick is the whole comparison signal. */
function Cell({
  win,
  dim,
  children,
}: {
  win: boolean;
  dim: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative border-t border-card-edge px-3 py-3 ${
        win ? "bg-good-500/10" : ""
      } ${dim ? "opacity-40" : ""}`}
    >
      {win && (
        <span
          aria-label="Best on this row"
          className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-good-500 text-white"
        >
          <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
        </span>
      )}
      {children}
    </div>
  );
}
