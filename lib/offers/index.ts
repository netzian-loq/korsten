import blankBoard from "./blank-board.json";
import {
  DEFAULT_SELLER_COSTS,
  type ContingencyId,
  type Offer,
  type OfferComparison,
  type SellerCosts,
} from "./schema";

/**
 * The blank board template.
 *
 * blank-board.json is both the documented shape and the live seed — the
 * skeleton the agent sees on opening the screen comes straight out of it, so
 * editing the placeholders there changes what the form says.
 */

export * from "./schema";

export type FieldGuide = {
  label: string;
  placeholder?: string;
  hint: string;
};

export type ContingencyOption = {
  id: ContingencyId;
  label: string;
  hint: string;
};

type BoardTemplate = {
  id: string;
  name: string;
  maxOffers: number;
  initialSlots: number;
  contingencies: ContingencyOption[];
  fields: Record<string, FieldGuide>;
  blankOffer: Omit<Offer, "id">;
  sellerCosts: SellerCosts;
};

// A single internal template rather than a folder of user-authored files, so
// it is asserted rather than parsed. If this grows into several templates,
// give it a validator the way lib/presets does.
const TEMPLATE = blankBoard as BoardTemplate;

export const MAX_OFFERS = TEMPLATE.maxOffers;
export const CONTINGENCIES = TEMPLATE.contingencies;

/** Guided label, placeholder, and hint for one field of the offer form. */
export const fieldGuide = (key: string): FieldGuide =>
  TEMPLATE.fields[key] ?? { label: String(key), hint: "" };

export function blankOffer(index: number, id: string): Offer {
  return {
    ...structuredClone(TEMPLATE.blankOffer),
    id,
    label: `${TEMPLATE.blankOffer.label} ${index + 1}`,
  };
}

/** A fresh skeleton board for one listing: pre-formatted slots, nothing filled. */
export function createBlankBoard(
  dealId: string,
  id: string,
  now: string,
): OfferComparison {
  return {
    id,
    dealId,
    sellerCosts: { ...(TEMPLATE.sellerCosts ?? DEFAULT_SELLER_COSTS) },
    createdAt: now,
    presentationMode: false,
    offers: Array.from({ length: TEMPLATE.initialSlots }, (_, index) =>
      blankOffer(index, `offer-${index + 1}`),
    ),
  };
}
