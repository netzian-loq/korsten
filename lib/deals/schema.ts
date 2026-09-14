import { daysUntil, parseISODate } from "../dates.ts";
import type { DerivedMilestone, MilestoneState } from "../timeline/schema.ts";

/**
 * The deal — the spine everything else hangs off.
 *
 * Real transaction software organises around the file, not around tools: a
 * deal has an address, a side, a client, and a set of contract deadlines. The
 * offer board, the inspection report and the buyer timeline are all views onto
 * one of these, which is what stops them being five disconnected screens.
 *
 * Import-free apart from date helpers and types, so schema.test.ts can run it.
 */

/** Which side of the table the agent is on. Changes what the deal even shows. */
export type DealSide = "buyer" | "seller";

export type DealStage = "prospect" | "active" | "under-contract" | "closed";

export const DEAL_STAGES: readonly DealStage[] = [
  "prospect",
  "active",
  "under-contract",
  "closed",
];

export const STAGE_LABEL: Record<DealStage, string> = {
  prospect: "Prospect",
  active: "Active",
  "under-contract": "Under contract",
  closed: "Closed",
};

/** What the agent is doing at each stage, per side — the app says it out loud. */
export const STAGE_MEANING: Record<DealSide, Record<DealStage, string>> = {
  seller: {
    prospect: "Chasing the listing appointment.",
    active: "Listed and taking offers.",
    "under-contract": "Offer accepted. Working the contract dates.",
    closed: "Sold and closed.",
  },
  buyer: {
    prospect: "Not yet signed as a client.",
    active: "Touring and writing offers.",
    "under-contract": "Offer accepted. Working the contract dates.",
    closed: "Keys handed over.",
  },
};

export type Deal = {
  id: string;
  address: string;
  side: DealSide;
  stage: DealStage;
  /** Links to the client directory. */
  clientId: string | null;
  /** Denormalised so a deal still reads correctly if the client is removed. */
  clientName: string;
  /** List price on a listing; contract price on a buyer deal. */
  price: number | null;
  /** Mutual acceptance. Every contract deadline is calculated from this. */
  acceptedDate: string;
  /** Which timeline preset drives the deadlines. */
  presetId: string | null;
  /** Agent overrides, keyed by milestone id. */
  milestones: Record<string, MilestoneState>;
  createdAt: string;
};

export function createDeal(
  input: Pick<Deal, "address" | "side"> & Partial<Deal>,
  id: string,
  now: string,
): Deal {
  return {
    id,
    address: input.address.trim(),
    side: input.side,
    stage: input.stage ?? "active",
    clientId: input.clientId ?? null,
    clientName: input.clientName ?? "",
    price: input.price ?? null,
    acceptedDate: input.acceptedDate ?? "",
    presetId: input.presetId ?? null,
    milestones: input.milestones ?? {},
    createdAt: now,
  };
}

/* -------------------------------------------------------------------------- */
/* What a deal shows                                                          */
/* -------------------------------------------------------------------------- */

export type DealTool = "offers" | "timeline" | "inspection";

/**
 * Which tools belong on this deal right now.
 *
 * The offer board is a listing tool: it only appears on a seller deal that is
 * actually taking offers. Timeline and inspection are contract tools — they
 * mean nothing until something is under contract.
 */
export function toolsFor(deal: Deal): DealTool[] {
  if (deal.stage === "under-contract" || deal.stage === "closed") {
    return ["timeline", "inspection"];
  }
  return deal.side === "seller" && deal.stage === "active" ? ["offers"] : [];
}

/** Under contract is where deadlines live, and deadlines are the job. */
export const hasLiveDeadlines = (deal: Deal) => deal.stage === "under-contract";

/* -------------------------------------------------------------------------- */
/* Deadlines                                                                  */
/* -------------------------------------------------------------------------- */

export type Urgency = "overdue" | "today" | "soon" | "later";

export type Deadline = {
  dealId: string;
  address: string;
  side: DealSide;
  clientName: string;
  milestone: DerivedMilestone;
  /** Negative once the date has passed. */
  daysOut: number;
  urgency: Urgency;
};

export function urgencyOf(daysOut: number): Urgency {
  if (daysOut < 0) return "overdue";
  if (daysOut === 0) return "today";
  return daysOut <= 7 ? "soon" : "later";
}

export const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue",
  today: "Today",
  soon: "This week",
  later: "Coming up",
};

export const URGENCY_ORDER: readonly Urgency[] = ["overdue", "today", "soon", "later"];

/**
 * Every unfinished, dated milestone across the deals that are under contract,
 * soonest first.
 *
 * Milestones without a date are skipped rather than dropped to the bottom — an
 * undated step is not a deadline, and padding the list with them buries the
 * ones that are real.
 */
export function collectDeadlines(
  deals: Deal[],
  milestonesFor: (deal: Deal) => DerivedMilestone[],
  today: Date,
  horizonDays = 21,
): Deadline[] {
  const found: Deadline[] = [];

  for (const deal of deals) {
    if (!hasLiveDeadlines(deal)) continue;

    for (const milestone of milestonesFor(deal)) {
      if (milestone.done || !milestone.date) continue;

      const daysOut = daysUntil(milestone.date, today);
      if (daysOut === null) continue;
      // Overdue always surfaces, however old; the future is capped.
      if (daysOut > horizonDays) continue;

      found.push({
        dealId: deal.id,
        address: deal.address,
        side: deal.side,
        clientName: deal.clientName,
        milestone,
        daysOut,
        urgency: urgencyOf(daysOut),
      });
    }
  }

  return found.sort((a, b) => {
    const byDate = (dateOf(a) ?? 0) - (dateOf(b) ?? 0);
    // Same day: the earlier step in the contract comes first.
    return byDate !== 0 ? byDate : a.milestone.step - b.milestone.step;
  });
}

const dateOf = (deadline: Deadline): number | null => {
  const parsed = deadline.milestone.date
    ? parseISODate(deadline.milestone.date)
    : null;
  return parsed ? parsed.getTime() : null;
};

/** Deadlines grouped under their urgency heading, empty groups omitted. */
export function groupDeadlines(
  deadlines: Deadline[],
): { urgency: Urgency; deadlines: Deadline[] }[] {
  return URGENCY_ORDER.map((urgency) => ({
    urgency,
    deadlines: deadlines.filter((deadline) => deadline.urgency === urgency),
  })).filter((group) => group.deadlines.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Pipeline                                                                   */
/* -------------------------------------------------------------------------- */

export type Pipeline = {
  byStage: Record<DealStage, Deal[]>;
  activeCount: number;
  underContractCount: number;
  /** Combined price of everything under contract — the money in flight. */
  underContractValue: number;
};

export function pipeline(deals: Deal[]): Pipeline {
  const byStage = Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, deals.filter((deal) => deal.stage === stage)]),
  ) as Record<DealStage, Deal[]>;

  const underContract = byStage["under-contract"];

  return {
    byStage,
    activeCount: byStage.active.length,
    underContractCount: underContract.length,
    underContractValue: underContract.reduce((sum, deal) => sum + (deal.price ?? 0), 0),
  };
}

export function filterDeals(deals: Deal[], query: string): Deal[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return deals;

  return deals.filter((deal) =>
    [deal.address, deal.clientName, deal.side, STAGE_LABEL[deal.stage]]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}
