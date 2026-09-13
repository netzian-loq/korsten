const DOLLARS = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Whole dollars: $865,000. Fixed locale, so server and client agree. */
export function formatDollars(amount: number | null): string {
  if (amount === null || !Number.isFinite(amount)) return "—";
  return DOLLARS.format(Math.round(amount));
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `yyyy-mm-dd` as "Oct 2, 2026", formatted by hand so it never shifts zone. */
export function formatISODateShort(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "—";

  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return "—";

  return `${month} ${Number(match[3])}, ${match[1]}`;
}
