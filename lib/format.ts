/** Compact money, the way agents say it out loud: $425k, $1.2M, $2.8M. */
export function formatMoney(dollars: number): string {
  if (!Number.isFinite(dollars) || dollars <= 0) return "—";

  if (dollars >= 1_000_000) {
    // One decimal, but drop it when it rounds away: $4M, not $4.0M.
    const millions = (dollars / 1_000_000).toFixed(1).replace(/\.0$/, "");
    return `$${millions}M`;
  }

  return `$${Math.round(dollars / 1000)}k`;
}

export function formatBudgetRange(min: number, max: number): string {
  if (!min && !max) return "No budget set";
  if (!max || max === min) return formatMoney(min);
  return `${formatMoney(min)} – ${formatMoney(max)}`;
}

/** Up to two initials, for the roster avatars. */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const DOLLARS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Whole dollars, for figures a seller will actually check: $402,936. */
export function formatDollars(dollars: number): string {
  if (!Number.isFinite(dollars)) return "—";
  return DOLLARS.format(Math.round(dollars));
}

/** A gap against another offer, signed. Reads "Even" when it rounds to zero. */
export function formatSignedDollars(dollars: number): string {
  if (!Number.isFinite(dollars)) return "—";
  const rounded = Math.round(dollars);
  if (rounded === 0) return "Even";
  return `${rounded > 0 ? "+" : "−"}${formatDollars(Math.abs(rounded))}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `yyyy-mm-dd` as "Oct 2, 2026", formatted by hand so it never shifts zone. */
export function formatISODateShort(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "Not set";

  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return "Not set";

  return `${month} ${Number(match[3])}, ${match[1]}`;
}
