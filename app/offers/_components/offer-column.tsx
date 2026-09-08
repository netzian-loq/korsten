"use client";

import {
  Banknote,
  HandCoins,
  Timer,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  formatDollars,
  formatISODateShort,
  formatSignedDollars,
} from "@/lib/format";
import {
  BADGE_LABEL,
  FINANCING_TYPES,
  isComplete,
  type BadgeKind,
  type FinancingType,
  type Offer,
  type OfferMath,
  type SellerCosts,
} from "@/lib/offers";

const BADGE_STYLE: Record<BadgeKind, { chip: string; icon: LucideIcon }> = {
  "highest-net": { chip: "bg-good-500/14 text-good-700", icon: HandCoins },
  "highest-price": {
    chip: "bg-accent-500/14 text-accent-600",
    icon: TrendingUp,
  },
  "fastest-close": { chip: "bg-alert-500/16 text-alert-700", icon: Zap },
  "shortest-inspection": {
    chip: "bg-card-sunken text-ink-700 ring-1 ring-card-edge ring-inset",
    icon: Timer,
  },
  "all-cash": { chip: "bg-navy-900 text-mist-50", icon: Banknote },
};

/** Bar segments, top to bottom. Net sits underneath them all. */
const DEDUCTIONS = [
  { key: "commission", label: "Commission", tone: "bg-navy-500/45" },
  { key: "closingCosts", label: "Title & escrow", tone: "bg-navy-500/25" },
  { key: "concessions", label: "Concessions", tone: "bg-alert-400" },
  { key: "payoff", label: "Loan payoff", tone: "bg-navy-500/15" },
] as const satisfies readonly {
  key: keyof OfferMath;
  label: string;
  tone: string;
}[];

const INPUT =
  "w-full rounded-md border border-card-edge bg-card-muted px-2.5 py-1.5 text-sm text-ink-900 transition-colors focus:border-accent-400 focus:bg-card";
const NUMERIC = `${INPUT} font-mono tabular-nums`;
const LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-ink-400";

type Props = {
  offer: Offer;
  math: OfferMath;
  costs: SellerCosts;
  badges: BadgeKind[];
  /** The highest price on the board — the scale every bar is drawn against. */
  scaleMax: number;
  bestNet: number;
  /** Days from today until closing; null before hydration or with no date. */
  daysOut: number | null;
  onChange: (patch: Partial<Offer>) => void;
  onRemove: () => void;
};

export function OfferColumn({
  offer,
  math,
  costs,
  badges,
  scaleMax,
  bestNet,
  daysOut,
  onChange,
  onRemove,
}: Props) {
  const price = Math.max(0, offer.purchasePrice);
  /** Share of the tallest bar on the board. */
  const ofScale = (amount: number) =>
    scaleMax > 0 ? (amount / scaleMax) * 100 : 0;
  /** Share of this column's own bar. */
  const ofPrice = (amount: number) => (price > 0 ? (amount / price) * 100 : 0);

  const gapToBest = math.netProceeds - bestNet;
  const isBestNet = badges.includes("highest-net");
  const underwater = math.netProceeds < 0;
  // No price yet: this is a placeholder column, not a losing offer.
  const incomplete = !isComplete(offer);

  const number = (value: string) => Number(value) || 0;

  return (
    <article className="card flex h-full w-full flex-col p-3.5">
      <header className="flex items-start gap-1">
        <input
          value={offer.label}
          onChange={(event) => onChange({ label: event.target.value })}
          aria-label={`Name for ${offer.label}`}
          className="-ml-1.5 min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-0.5 text-title text-ink-900 transition-colors hover:bg-card-muted focus:bg-card-muted"
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${offer.label}`}
          className="grid size-7 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-card-sunken hover:text-ink-900"
        >
          <X className="size-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      </header>

      {badges.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {badges.map((badge) => {
            const { chip, icon: Icon } = BADGE_STYLE[badge];
            return (
              <li
                key={badge}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.625rem] font-bold uppercase tracking-wide ${chip}`}
              >
                <Icon className="size-3" strokeWidth={2.5} aria-hidden />
                {BADGE_LABEL[badge]}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3.5">
        <p className={LABEL}>Est. net proceeds</p>
        {incomplete ? (
          <p className="mt-1.5 text-sm text-ink-400">
            Add a purchase price and this column joins the comparison.
          </p>
        ) : (
          <>
            <p
              data-numeric
              className={`mt-1 font-display text-metric ${underwater ? "text-alert-700" : "text-ink-900"}`}
            >
              {formatDollars(math.netProceeds)}
            </p>
            <p
              className={`mt-1 text-xs font-medium ${isBestNet ? "text-good-700" : "text-ink-500"}`}
            >
              {isBestNet
                ? "Best net on the board"
                : `${formatSignedDollars(gapToBest)} vs. best`}
            </p>
          </>
        )}
      </div>

      {/* Where the price goes. Every column shares one scale, and the dashed
          line marks the best net, so a taller bar landing lower is visible. */}
      {!incomplete && (
        <>
          <div className="relative mt-3 h-36 overflow-hidden rounded-md bg-card-sunken">
            <span
              aria-hidden
              className="absolute inset-x-0 z-10 border-t border-dashed border-good-600/60"
              style={{ bottom: `${ofScale(Math.max(bestNet, 0))}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 flex flex-col"
              style={{ height: `${ofScale(price)}%` }}
            >
              {DEDUCTIONS.map(({ key, label, tone }) => {
                const amount = math[key];
                if (amount <= 0) return null;
                return (
                  <div
                    key={key}
                    className={tone}
                    style={{ height: `${ofPrice(amount)}%` }}
                    title={`${label}: ${formatDollars(amount)}`}
                  />
                );
              })}
              <div
                className="bg-good-500"
                style={{ height: `${ofPrice(Math.max(math.netProceeds, 0))}%` }}
                title={`Net proceeds: ${formatDollars(math.netProceeds)}`}
              />
            </div>
          </div>

          {/* Legend for the bar, and the deduction breakdown — one list, both jobs. */}
          <dl className="mt-3 space-y-1 text-[0.6875rem]">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-ink-500">Purchase price</dt>
              <dd data-numeric className="font-mono font-semibold text-ink-900">
                {formatDollars(price)}
              </dd>
            </div>
            {DEDUCTIONS.map(({ key, label, tone }) => (
              <div key={key} className="flex items-baseline justify-between gap-2">
                <dt className="flex min-w-0 items-center gap-1.5 text-ink-500">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-[2px] ${tone}`}
                  />
                  <span className="truncate">
                    {label}
                    {key === "commission" && ` ${costs.commissionPct}%`}
                    {key === "closingCosts" && ` ${costs.closingCostPct}%`}
                  </span>
                </dt>
                <dd data-numeric className="font-mono text-ink-600">
                  {math[key] > 0 ? `−${formatDollars(math[key])}` : "—"}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-2 border-t border-card-edge pt-1.5">
              <dt className="flex items-center gap-1.5 font-semibold text-ink-700">
                <span aria-hidden className="size-2 rounded-[2px] bg-good-500" />
                Net
              </dt>
              <dd data-numeric className="font-mono font-bold text-ink-900">
                {formatDollars(math.netProceeds)}
              </dd>
            </div>
          </dl>
        </>
      )}

      {/* The input section for this offer. */}
      <div className="mt-4 space-y-2.5 border-t border-card-edge pt-3.5">
        <p className={LABEL}>Terms</p>

        <label className="block">
          <span className={LABEL}>Purchase price</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={offer.purchasePrice || ""}
            onChange={(event) =>
              onChange({ purchasePrice: number(event.target.value) })
            }
            placeholder="850000"
            className={`mt-1 ${NUMERIC}`}
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={LABEL}>Down %</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              value={offer.downPaymentPct || ""}
              onChange={(event) =>
                onChange({ downPaymentPct: number(event.target.value) })
              }
              className={`mt-1 ${NUMERIC}`}
            />
          </label>

          <label className="block">
            <span className={LABEL}>Insp. days</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={offer.contingencyDays || ""}
              onChange={(event) =>
                onChange({ contingencyDays: number(event.target.value) })
              }
              className={`mt-1 ${NUMERIC}`}
            />
          </label>
        </div>

        <label className="block">
          <span className={LABEL}>Closing date</span>
          <input
            type="date"
            value={offer.closingDate}
            onChange={(event) => onChange({ closingDate: event.target.value })}
            className={`mt-1 ${NUMERIC}`}
          />
          <span className="mt-1 block text-[0.625rem] text-ink-400">
            {formatISODateShort(offer.closingDate)}
            {daysOut !== null &&
              ` · ${daysOut < 0 ? "already past" : `${daysOut} days out`}`}
          </span>
        </label>

        <label className="block">
          <span className={LABEL}>Financing</span>
          <select
            value={offer.financingType}
            onChange={(event) => {
              const financingType = event.target.value as FinancingType;
              // Cash means the whole price is down, by definition.
              onChange(
                financingType === "Cash"
                  ? { financingType, downPaymentPct: 100 }
                  : { financingType },
              );
            }}
            className={`mt-1 ${INPUT}`}
          >
            {FINANCING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[0.625rem] text-ink-400">
            {math.loanAmount > 0
              ? `${formatDollars(math.loanAmount)} loan`
              : "No loan"}
          </span>
        </label>

        <label className="block">
          <span className={LABEL}>Seller concessions</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={offer.sellerConcessions || ""}
            onChange={(event) =>
              onChange({ sellerConcessions: number(event.target.value) })
            }
            placeholder="0"
            className={`mt-1 ${NUMERIC}`}
          />
        </label>
      </div>
    </article>
  );
}
