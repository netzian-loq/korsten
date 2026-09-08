import type { Metadata } from "next";

import { NavRail } from "../_components/nav-rail";
import { OffersBoard } from "./_components/offers-board";

export const metadata: Metadata = {
  title: "Offers",
  description:
    "Compare up to four offers side by side on estimated net proceeds.",
};

export default function OffersPage() {
  return (
    <div className="flex min-h-dvh">
      <NavRail />

      <main className="min-w-0 flex-1 px-safe">
        <div className="pt-safe">
          <div className="mx-auto max-w-7xl px-5 pb-32 pt-6 md:px-8 md:pb-16 md:pt-10">
            <OffersBoard />
          </div>
        </div>
      </main>
    </div>
  );
}
