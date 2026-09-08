import type { ClientStatus } from "@/lib/clients";

/**
 * One colour per status, reused by the chips, the budget bars, the filter tabs
 * and the quick-edit control — so a colour means the same thing everywhere.
 * Text tones are the darker ramp steps: these all sit on white cards.
 */
export const STATUS_STYLE: Record<
  ClientStatus,
  { chip: string; bar: string; tab: string }
> = {
  Lead: {
    chip: "bg-card-sunken text-ink-500",
    bar: "bg-ink-400",
    tab: "bg-mist-100 text-navy-900",
  },
  Viewing: {
    chip: "bg-accent-500/12 text-accent-600",
    bar: "bg-accent-500",
    tab: "bg-accent-400 text-navy-950",
  },
  "Under Contract": {
    chip: "bg-good-500/12 text-good-700",
    bar: "bg-good-500",
    tab: "bg-good-400 text-navy-950",
  },
};
