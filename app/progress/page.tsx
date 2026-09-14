import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProgressModule } from "./_components/progress-module";

export const metadata: Metadata = {
  title: "Buyer progress",
  description:
    "Milestone timelines for deals under contract, with a shareable buyer link.",
};

export default function ProgressPage() {
  return (
    <main className="min-w-0 px-safe">
      <div className="pt-safe">
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8 md:pb-16 md:pt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-mist-400 transition-colors hover:text-mist-100"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
            Home
          </Link>

          <header className="mt-4">
            <p className="text-eyebrow font-mono uppercase text-accent-400">
              What&rsquo;s next
            </p>
            <h1 className="mt-2.5 text-display text-mist-50">
              From accepted to keys.
            </h1>
            <p className="mt-2 max-w-xl text-[0.9375rem] text-mist-400">
              Pick a skeleton, type the accepted date once, and send the buyer a
              link that answers &ldquo;what happens now?&rdquo; without a phone
              call.
            </p>
          </header>

          <ProgressModule />
        </div>
      </div>
    </main>
  );
}
