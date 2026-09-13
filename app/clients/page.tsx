import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ClientsModule } from "./_components/clients-module";

export const metadata: Metadata = {
  title: "Clients",
  description:
    "Client directory and document management, built from preset workflows.",
};

export default function ClientsPage() {
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
              Clients &amp; Documents
            </p>
            <h1 className="mt-2.5 text-display text-mist-50">
              Every client, every document.
            </h1>
            <p className="mt-2 max-w-xl text-[0.9375rem] text-mist-400">
              Add a client, assign a preset, and work through the steps. Each one
              tells you what goes where.
            </p>
          </header>

          <ClientsModule />
        </div>
      </div>
    </main>
  );
}
