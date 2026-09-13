"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

import type { ClientProgress } from "@/lib/timeline";
import { shareUrl } from "@/lib/timeline/share-link";

/**
 * The read-only link handed to the buyer.
 *
 * Only rendered once a preset is chosen, which cannot happen in the server
 * snapshot — so reading window.location here is safe.
 */
export function SharePanel({ progress }: { progress: ClientProgress }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const url = shareUrl(window.location.origin, progress);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard needs a secure context and permission; fall back to select.
      setFailed(true);
    }
  }

  return (
    <section className="panel px-5 py-4" aria-labelledby="share-heading">
      <h2 id="share-heading" className="text-eyebrow uppercase text-mist-500">
        Shareable buyer link
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-mist-400">
        Read-only, and built for a phone. The deal is packed into the link
        itself, so it works with no login — but that also makes it a snapshot.
        Copy a fresh link after you change a date.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Buyer link"
          className="min-w-0 flex-1 truncate rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 font-mono text-xs text-mist-300"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-navy-950 transition-colors hover:bg-accent-400"
        >
          {copied ? (
            <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
          ) : (
            <Copy className="size-3.5" strokeWidth={2.25} aria-hidden />
          )}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-navy-700 px-3 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 hover:text-mist-100"
        >
          <ExternalLink className="size-3.5" strokeWidth={2.25} aria-hidden />
          Open
        </a>
      </div>

      {failed && (
        <p role="alert" className="mt-2 text-xs text-alert-300">
          Could not reach the clipboard. The link is selected above — copy it by
          hand.
        </p>
      )}
    </section>
  );
}
