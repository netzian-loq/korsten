/**
 * Calendar-date helpers, shared by the modules that work in `yyyy-mm-dd`.
 *
 * Import-free, and deliberately never touches `new Date(iso)` — that parses a
 * bare date as UTC, which lands a day early for anyone west of Greenwich.
 */

/** Parses `yyyy-mm-dd` as a local date, rejecting impossible ones. */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const [year, month, day] = [+match[1], +match[2], +match[3]];
  const date = new Date(year, month - 1, day);
  // 2026-02-31 would otherwise roll over into March.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Formats a local Date back to `yyyy-mm-dd`. */
export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** `yyyy-mm-dd` plus a whole number of days, rolling months and years. */
export function addDays(iso: string, days: number): string | null {
  const date = parseISODate(iso);
  if (date === null || !Number.isFinite(days)) return null;

  date.setDate(date.getDate() + Math.trunc(days));
  return toISODate(date);
}

/** Sortable numeric form of a date — no timezone involved. */
export function dateRank(iso: string): number | null {
  return parseISODate(iso) ? Number(iso.replaceAll("-", "")) : null;
}

/** Whole days from `today` to `iso`. Negative once the date is past. */
export function daysUntil(iso: string, today: Date): number | null {
  const target = parseISODate(iso);
  if (!target) return null;

  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - midnight.getTime()) / 86_400_000);
}
