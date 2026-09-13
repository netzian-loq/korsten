"use client";

import { CircleAlert } from "lucide-react";
import { useSyncExternalStore } from "react";

import { BuyerTimeline } from "@/app/_components/buyer-timeline";
import { getTimelinePreset } from "@/lib/timeline";
import { decodeProgress, tokenFromHash } from "@/lib/timeline/share-link";

/**
 * Reads the deal out of the URL hash.
 *
 * Through an external store rather than an effect, so the server and client
 * first render agree and a pasted-in hash change re-renders.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = () => window.location.hash;
const getServerHash = () => "";

export function TrackedDeal() {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const progress = decodeProgress(tokenFromHash(hash));

  if (!progress) {
    return (
      <div className="card p-6 text-center">
        <CircleAlert
          className="mx-auto size-6 text-ink-400"
          strokeWidth={1.75}
          aria-hidden
        />
        <h1 className="mt-3 text-title text-ink-900">This link is incomplete</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
          The part after the <span className="font-mono">#</span> carries your
          timeline, and it did not come through. Links sometimes get cut short
          by messaging apps — ask your agent to send it again.
        </p>
      </div>
    );
  }

  return (
    <BuyerTimeline
      progress={progress}
      preset={getTimelinePreset(progress.presetId)}
    />
  );
}
