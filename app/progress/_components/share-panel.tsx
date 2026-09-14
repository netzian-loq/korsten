"use client";

import { Check, Copy, ExternalLink, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { formatISODateShort } from "@/lib/format";
import { markShared } from "@/lib/progress-store";
import type { ClientProgress } from "@/lib/timeline";
import { fingerprint, shareUrl } from "@/lib/timeline/share-link";

/**
 * The read-only link handed to the buyer.
 *
 * The timeline is packed into the link itself, so it works with no login and
 * no database — but that also means the link is a snapshot, frozen at the
 * moment it was copied. Rather than disclaim that once and hope, the panel
 * remembers what was sent and says plainly when the deal has moved past it.
 *
 * Only rendered once a preset is chosen, which cannot happen in the server
 * snapshot — so reading window.location here is safe.
 */
export function SharePanel({ progress }: { progress: ClientProgress }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const current = fingerprint(progress);
  const sent = progress.sharedFingerprint;

  const state = !sent ? "never" : sent === current ? "current" : "stale";

  const url = shareUrl(
    window.location.origin,
    progress,
    new Date().toISOString().slice(0, 10),
  );

  async function copy() {
    setFailed(false);

    // Recorded on the click, not inside the success path: when the clipboard
    // is blocked the agent copies the selected field by hand and the link
    // still goes out. Tying this to the API would leave staleness tracking
    // silently dead for anyone whose browser refuses clipboard access.
    markShared(new Date().toISOString().slice(0, 10), current);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Needs a secure context and permission; fall back to select-and-copy.
      setFailed(true);
    }
  }

  return (
    <section className="panel px-5 py-4" aria-labelledby="share-heading">
      <h2 id="share-heading" className="text-eyebrow uppercase text-mist-500">
        Shareable buyer link
      </h2>

      {state === "stale" ? (
        <p
          role="status"
          className="mt-2 flex items-start gap-2 rounded-md border border-alert-500/30 bg-alert-500/10 px-3 py-2.5 text-xs leading-relaxed text-alert-200"
        >
          <TriangleAlert
            className="mt-px size-3.5 shrink-0"
            strokeWidth={2.25}
            aria-hidden
          />
          <span>
            <span className="font-semibold">Your buyer is looking at old dates.</span>{" "}
            The link you sent on {formatISODateShort(progress.sharedAt ?? "")} is a
            snapshot, and this deal has moved since. Copy a fresh link and send
            it over.
          </span>
        </p>
      ) : state === "current" ? (
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-good-400">
          <Check className="mt-px size-3.5 shrink-0" strokeWidth={2.75} aria-hidden />
          <span>
            The link you sent on {formatISODateShort(progress.sharedAt ?? "")} still
            matches this deal. Nothing to resend.
          </span>
        </p>
      ) : (
        <p className="mt-1.5 text-xs leading-relaxed text-mist-400">
          Read-only, and built for a phone. The timeline is packed into the link
          itself, so it opens with no login — which also makes it a snapshot.
          This panel will tell you when it needs resending.
        </p>
      )}

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
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            state === "stale"
              ? "bg-alert-500 text-navy-950 hover:bg-alert-400"
              : "bg-accent-500 text-navy-950 hover:bg-accent-400"
          }`}
        >
          {copied ? (
            <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
          ) : (
            <Copy className="size-3.5" strokeWidth={2.25} aria-hidden />
          )}
          {copied ? "Copied" : state === "stale" ? "Copy fresh link" : "Copy link"}
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
          Could not reach the clipboard. The link is selected above — copy it
          by hand. This panel has recorded it as sent.
        </p>
      )}
    </section>
  );
}
