import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { OfferBoard } from "./_components/offer-board";

export const metadata: Metadata = {
  title: "Offers",
  description:
    "Compare up to four competing offers side by side and present them to a seller.",
};

export default function OffersPage() {
  return (
    <main className="min-w-0 px-safe">
      <div className="pt-safe">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-6 md:px-8 md:pb-16 md:pt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-mist-400 transition-colors hover:text-mist-100"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
            Home
          </Link>

          <header className="mt-4">
            <p className="text-eyebrow font-mono uppercase text-accent-400">
              Offer comparison
            </p>
            <h1 className="mt-2.5 text-display text-mist-50">
              Four offers, one board.
            </h1>
            <p className="mt-2 max-w-xl text-[0.9375rem] text-mist-400">
              Fill in the slots and the badges sort themselves out. Switch to
              presentation view when the seller is looking.
            </p>
          </header>

          <OfferBoard />
        </div>
      </div>
    </main>
  );
}
