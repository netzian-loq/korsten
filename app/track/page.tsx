import type { Metadata } from "next";

import { TrackedDeal } from "./_components/tracked-deal";

export const metadata: Metadata = {
  title: "Your purchase",
  description: "Where your home purchase stands, and what happens next.",
  // The link carries a buyer's name and address. Keep it out of search results.
  robots: { index: false, follow: false },
};

export default function TrackPage() {
  return (
    <main className="min-w-0 px-safe">
      <div className="pt-safe">
        <div className="mx-auto max-w-lg px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <TrackedDeal />

          <p className="mt-5 text-center text-xs text-mist-500">
            Questions about any step? Message your agent — that is what they are
            for.
          </p>
        </div>
      </div>
    </main>
  );
}
