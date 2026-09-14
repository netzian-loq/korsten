import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InspectionModule } from "./_components/inspection-module";

export const metadata: Metadata = {
  title: "Inspection reports",
  description:
    "Turn a 50-page inspection PDF into a structured, editable repair request.",
};

export default function InspectionPage() {
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
              Inspection reports
            </p>
            <h1 className="mt-2.5 text-display text-mist-50">
              Fifty pages, thirty seconds.
            </h1>
            <p className="mt-2 max-w-xl text-[0.9375rem] text-mist-400">
              Drop the PDF in. Findings come back sorted by severity, ready to
              toggle into a repair request you can send as it stands.
            </p>
          </header>

          <InspectionModule />
        </div>
      </div>
    </main>
  );
}
