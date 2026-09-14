"use client";

import {
  Banknote,
  Eye,
  HandCoins,
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
  fieldGuide,
  FINANCING_TYPES,
  type BadgeKind,
  type FinancingType,
  type Offer,
  type OfferMath,
} from "@/lib/offers";

/** Their spec asks for green tags; the icon is what tells them apart. */
const BADGE_ICON: Record<BadgeKind, LucideIcon> = {
  "highest-net": HandCoins,
  "highest-price": TrendingUp,
  "fastest-close": Zap,
  "all-cash": Banknote,
  "fewest-contingencies": ShieldCheck,
};

const INPUT =
  "w-full rounded-md border border-card-edge bg-card-muted px-2.5 py-1.5 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-accent-400 focus:bg-card";
const NUMERIC = `${INPUT} font-mono tabular-nums`;
const LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-ink-400";

type Props = {
  dealId: string;
  offer: Offer;
  badges: BadgeKind[];
  /** Null while the slot has no price. */
  math: OfferMath | null;
  /** The best net on the board, so each card can show the gap to it. */
  bestNet: number;
  /** Seller Presentation view: no inputs, no agent notes, no card controls. */
  presenting: boolean;
};

export function OfferCard({ dealId, offer, badges, math, bestNet, presenting }: Props) {
  const guide = fieldGuide;
  const number = (value: string) => (value === "" ? null : Number(value) || 0);

  // Only ever reached after hydration: the server renders the blank skeleton,
  // whose offers carry no closing date, so this never runs during hydration.
  const daysOut = offer.closingDate ? daysUntil(offer.closingDate, new Date()) : null;

  return (
    <article
      className={`card flex h-full w-full flex-col p-4 transition-opacity ${
        offer.hidden ? "opacity-45" : ""
      }`}
    >
      <header className="flex items-start gap-1.5">
        {presenting ? (
          <h3 className="min-w-0 flex-1 truncate text-title text-ink-900">
            {offer.label}
          </h3>
        ) : (
          <input
            value={offer.label}
            onChange={(event) => updateOffer(dealId, offer.id, { label: event.target.value })}
            aria-label={`Name for ${offer.label}`}
            placeholder={guide("label").placeholder}
            className="-ml-1.5 min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-0.5 text-title text-ink-900 transition-colors hover:bg-card-muted focus:bg-card-muted"
          />
        )}

        {!presenting && (
          <>
            <button
              type="button"
              onClick={() => toggleOfferHidden(dealId, offer.id)}
              aria-pressed={offer.hidden}
              title={
                offer.hidden
                  ? "Show in the comparison"
                  : "Hide from the comparison"
              }
              className="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
            >
              {offer.hidden ? (
                <EyeOff className="size-3.5" strokeWidth={2.25} aria-hidden />
              ) : (
                <Eye className="size-3.5" strokeWidth={2.25} aria-hidden />
              )}
              <span className="sr-only">
                {offer.hidden ? "Show" : "Hide"} {offer.label}
              </span>
            </button>
            <button
              type="button"
              onClick={() => removeOffer(dealId, offer.id)}
              aria-label={`Remove ${offer.label}`}
              className="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
            >
              <X className="size-3.5" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        )}
      </header>

      {badges.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {badges.map((badge) => {
            const Icon = BADGE_ICON[badge];
            return (
              <li
                key={badge}
                className="inline-flex items-center gap-1 rounded-full bg-good-500/14 px-2 py-1 text-[0.625rem] font-bold uppercase tracking-wide text-good-700"
              >
                <Icon className="size-3" strokeWidth={2.5} aria-hidden />
                {BADGE_LABEL[badge]}
              </li>
            );
          })}
        </ul>
      )}

      {offer.hidden && !presenting && (
        <p className="mt-2 rounded-md bg-card-sunken px-2 py-1.5 text-[0.6875rem] text-ink-500">
          Hidden — not counted in the comparison.
        </p>
      )}

      {math && (
        <div className="mt-3 rounded-md bg-card-sunken px-3 py-2.5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-ink-400">
            {fieldGuide("netProceeds").label}
          </p>
          <p
            data-numeric
            className={`mt-0.5 font-display text-metric ${
              math.netProceeds < 0 ? "text-alert-700" : "text-ink-900"
            }`}
          >
            {formatDollars(math.netProceeds)}
          </p>
          {bestNet > 0 && (
            <p className="mt-0.5 text-[0.6875rem] font-medium text-ink-500">
              {math.netProceeds >= bestNet
                ? "Best net on the board"
                : `${formatDollars(bestNet - math.netProceeds)} less than the best`}
            </p>
          )}
        </div>
      )}

      <dl className="mt-3.5 flex flex-1 flex-col gap-3">
        <Row guide={guide("purchasePrice")} presenting={presenting} value={formatDollars(offer.purchasePrice)}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={offer.purchasePrice ?? ""}
            onChange={(event) =>
              updateOffer(dealId, offer.id, { purchasePrice: number(event.target.value) })
            }
            placeholder={guide("purchasePrice").placeholder}
            className={NUMERIC}
          />
          {offer.purchasePrice !== null && (
            <p data-numeric className="mt-1 font-mono text-xs text-ink-500">
              {formatDollars(offer.purchasePrice)}
            </p>
          )}
        </Row>

        <div className="grid grid-cols-2 gap-2">
          <Row
            guide={guide("downPaymentPct")}
            presenting={presenting}
            value={
              offer.financingType === "Cash"
                ? "All cash"
                : offer.downPaymentPct === null
                  ? "—"
                  : `${offer.downPaymentPct}%`
            }
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={offer.downPaymentPct ?? ""}
              onChange={(event) =>
                updateOffer(dealId, offer.id, { downPaymentPct: number(event.target.value) })
              }
              placeholder={guide("downPaymentPct").placeholder}
              className={NUMERIC}
            />
          </Row>

          <Row guide={guide("financingType")} presenting={presenting} value={offer.financingType}>
            <select
              value={offer.financingType}
              onChange={(event) => {
                const financingType = event.target.value as FinancingType;
                // Cash means the whole price is down, by definition.
                updateOffer(
                  dealId,
                  offer.id,
                  financingType === "Cash"
                    ? { financingType, downPaymentPct: 100 }
                    : { financingType },
                );
              }}
              className={INPUT}
            >
              {FINANCING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Row>
        </div>

        <Row
          guide={guide("sellerConcessions")}
          presenting={presenting}
          value={
            offer.sellerConcessions ? formatDollars(offer.sellerConcessions) : "None"
          }
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={offer.sellerConcessions ?? ""}
            onChange={(event) =>
              updateOffer(dealId, offer.id, {
                sellerConcessions: number(event.target.value),
              })
            }
            placeholder={guide("sellerConcessions").placeholder}
            className={NUMERIC}
          />
        </Row>

        <Row
          guide={guide("closingDate")}
          presenting={presenting}
          value={formatISODateShort(offer.closingDate)}
        >
          <input
            type="date"
            value={offer.closingDate}
            onChange={(event) => updateOffer(dealId, offer.id, { closingDate: event.target.value })}
            className={NUMERIC}
          />
        </Row>

        {daysOut !== null && (
          <p className="-mt-2 text-[0.6875rem] text-ink-400">
            {daysOut < 0 ? "Already past" : `${daysOut}-day close`}
          </p>
        )}

        <div>
          <dt className={LABEL}>{guide("contingencies").label}</dt>
          {!presenting && (
            <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-ink-400">
              {guide("contingencies").hint}
            </p>
          )}
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {CONTINGENCIES.map((contingency) => {
              const kept = offer.contingencies.includes(contingency.id);

              if (presenting) {
                return kept ? (
                  <span
                    key={contingency.id}
                    className="rounded-full bg-card-sunken px-2 py-0.5 text-[0.6875rem] font-medium text-ink-700"
                  >
                    {contingency.label}
                  </span>
                ) : null;
              }

              return (
                <button
                  key={contingency.id}
                  type="button"
                  onClick={() => toggleContingency(dealId, offer.id, contingency.id)}
                  aria-pressed={kept}
                  title={contingency.hint}
                  className={`rounded-full px-2 py-1 text-[0.6875rem] font-semibold transition-colors ${
                    kept
                      ? "bg-navy-900 text-mist-50"
                      : "bg-card-sunken text-ink-400 line-through hover:text-ink-700"
                  }`}
                >
                  {contingency.label}
                </button>
              );
            })}
            {presenting && offer.contingencies.length === 0 && (
              <span className="text-sm font-semibold text-good-700">
                All contingencies waived
              </span>
            )}
          </dd>
        </div>

        <Row
          guide={guide("specialTerms")}
          presenting={presenting}
          value={offer.specialTerms || "—"}
        >
          <textarea
            rows={2}
            value={offer.specialTerms}
            onChange={(event) => updateOffer(dealId, offer.id, { specialTerms: event.target.value })}
            placeholder={guide("specialTerms").placeholder}
            className={`${INPUT} resize-y`}
          />
        </Row>

        {/* Agent notes are for the agent and seller, never the presentation. */}
        {!presenting && (
          <Row guide={guide("agentNotes")} presenting={false} value="">
            <textarea
              rows={2}
              value={offer.agentNotes}
              onChange={(event) => updateOffer(dealId, offer.id, { agentNotes: event.target.value })}
              placeholder={guide("agentNotes").placeholder}
              className={`${INPUT} resize-y`}
            />
          </Row>
        )}
      </dl>
    </article>
  );
}

/** One labelled field: the guided form control, or its value when presenting. */
function Row({
  guide,
  presenting,
  value,
  children,
}: {
  guide: { label: string; hint: string };
  presenting: boolean;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className={LABEL} title={guide.hint}>
        {guide.label}
      </dt>
      <dd className="mt-1">
        {presenting ? (
          <p className="text-sm font-medium text-ink-900">{value}</p>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
