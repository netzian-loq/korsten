"use client";

import { ArrowRight, Check, Share } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

/** iOS marks Home Screen apps here rather than through the display-mode query. */
type IosNavigator = Navigator & { standalone?: boolean };

const STANDALONE = "(display-mode: standalone)";

const SECONDARY_LINK =
  "inline-flex items-center gap-2 rounded-full border border-navy-600 px-5 py-2.5 text-sm font-semibold text-mist-200 transition-colors hover:border-accent-500/60 hover:bg-navy-800/60 hover:text-mist-50";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(STANDALONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isInstalled = () =>
  window.matchMedia(STANDALONE).matches ||
  (navigator as IosNavigator).standalone === true;

/** The server cannot know, so it assumes a browser tab — the first visit. */
const assumeBrowser = () => false;

export default function Home() {
  // Reading through an external store rather than an effect keeps the server
  // and client first render identical, and re-renders if the app is launched
  // from the Home Screen while open.
  const installed = useSyncExternalStore(
    subscribe,
    isInstalled,
    assumeBrowser,
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 pb-safe pt-safe text-center">
      <Image
        src="/icons/icon-192.png"
        alt=""
        width={192}
        height={192}
        priority
        className="size-20 rounded-[1.375rem] shadow-float"
      />

      <p className="mt-7 text-eyebrow font-mono uppercase text-accent-400">
        Welcome to
      </p>
      <h1 className="mt-2.5 text-display text-mist-50">Realtor Suite</h1>
      {/* Balanced so the last word does not orphan onto its own line. */}
      <p className="mt-3 text-balance text-mist-400">
        Showings, pipeline, and paperwork in one place.
      </p>

      <nav aria-label="Sections" className="mt-8 flex flex-wrap justify-center gap-2.5">
        <Link
          href="/clients"
          className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-400"
        >
          Clients &amp; Documents
          <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
        </Link>
        <Link
          href="/offers"
          className={SECONDARY_LINK}
        >
          Offer comparison
          <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
        </Link>
        <Link
          href="/progress"
          className={SECONDARY_LINK}
        >
          Buyer progress
          <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
        </Link>
        <Link
          href="/inspection"
          className={SECONDARY_LINK}
        >
          Inspection reports
          <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
        </Link>
      </nav>

      {installed ? (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-good-500/30 bg-good-500/10 px-4 py-2 text-sm font-medium text-good-400">
          <Check className="size-4" strokeWidth={2.5} aria-hidden />
          Running full screen
        </p>
      ) : (
        <section className="card mt-6 w-full p-5 text-left">
          <h2 className="text-eyebrow uppercase text-ink-400">
            Add to Home Screen
          </h2>
          {/* Explicit {" "} between elements: JSX drops a newline separator
              entirely, which would leave the text reading "Sharethen". */}
          <p className="mt-2.5 text-sm leading-relaxed text-ink-700">
            Tap{" "}
            <span className="inline-flex translate-y-0.5 items-center gap-1 rounded-md bg-card-sunken px-1.5 py-0.5 font-semibold text-ink-900">
              <Share className="size-3.5" strokeWidth={2.25} aria-hidden />
              Share
            </span>{" "}
            then{" "}
            <strong className="font-semibold text-ink-900">
              Add to Home Screen
            </strong>
            . It opens full screen from there, with no address or tab bar.
          </p>
        </section>
      )}
    </main>
  );
}
