import { getTimelinePreset } from "../timeline";
import {
  deriveMilestones,
  type ClientProgress,
  type DerivedMilestone,
} from "../timeline/schema";
import type { Deal } from "./schema";

export * from "./schema";

/**
 * A deal in the shape the timeline and share-link code already speaks.
 *
 * Keeps BuyerTimeline and share-link.ts untouched: they were written against
 * ClientProgress, and a deal carries everything they read.
 */
export function dealToProgress(deal: Deal): ClientProgress {
  return {
    id: deal.id,
    buyerName: deal.clientName,
    propertyAddress: deal.address,
    presetId: deal.presetId ?? "",
    acceptedDate: deal.acceptedDate,
    milestones: deal.milestones,
    createdAt: deal.createdAt,
  };
}

/** The deal's milestones with dates and status filled in. */
export function dealMilestones(deal: Deal): DerivedMilestone[] {
  return deriveMilestones(deal, getTimelinePreset(deal.presetId));
}
