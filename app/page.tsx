"use client";

import { ArrowRight, Check, Share } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Dashboard } from "./_components/dashboard";

/** iOS marks Home Screen apps here rather than through the display-mode query. */
type IosNavigator = Navigator & { standalone?: boolean };

const STANDALONE = "(display-mode: standalone)";

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
  const installed = useSyncExternalStore(subscribe, isInstalled, assumeBrowser);

  return (
    <main className="min-w-0 px-safe">
      <div className="pt-safe">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-6 md:px-8 md:pb-16 md:pt-10">
          <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex items-center gap-3">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={192}
                height={192}
                priority
                className="size-10 rounded-[0.75rem] shadow-float"
              />
              <div>
                <p className="text-eyebrow font-mono uppercase text-accent-400">
                  Realtor Suite
                </p>
                <h1 className="mt-1 text-title text-mist-50">Today</h1>
              </div>
            </div>

            <Link
              href="/clients"
              className="inline-flex items-center gap-2 rounded-full border border-navy-600 px-4 py-2 text-xs font-semibold text-mist-200 transition-colors hover:border-accent-500/60 hover:bg-navy-800/60 hover:text-mist-50"
            >
              Clients
              <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
            </Link>
          </header>

          <Dashboard />

          {installed ? (
            <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-good-500/30 bg-good-500/10 px-4 py-2 text-xs font-medium text-good-400">
              <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
              Running full screen
            </p>
          ) : (
            <p className="mt-10 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-mist-500">
              Tap
              <span className="inline-flex translate-y-0.5 items-center gap-1 rounded-md bg-navy-800 px-1.5 py-0.5 font-semibold text-mist-200">
                <Share className="size-3" strokeWidth={2.25} aria-hidden />
                Share
              </span>
              then
              <strong className="font-semibold text-mist-300">
                Add to Home Screen
              </strong>
              to open this full screen, with no address or tab bar.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
