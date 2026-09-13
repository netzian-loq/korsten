"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

import { formatDollars } from "@/lib/format";
import { buildAddendum, totals, type InspectionReport } from "@/lib/inspection";

/** Live preview of the notice, and the one-click export. */
export function AddendumPreview({ report }: { report: InspectionReport }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const text = buildAddendum(report);
  const summary = totals(report.findings);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  function download() {
    const slug =
      report.propertyAddress.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      "inspection";

    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}-repair-request.txt`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <section className="card flex flex-col overflow-hidden" aria-labelledby="addendum-heading">
      <header className="border-b border-card-edge p-4">
        <h2 id="addendum-heading" className="text-eyebrow uppercase text-ink-400">
          Repair request · live preview
        </h2>

        <p className="mt-2 text-sm text-ink-700">
          <span data-numeric className="font-semibold text-ink-900">
            {summary.includedCount}
          </span>{" "}
          item{summary.includedCount === 1 ? "" : "s"} in the draft
          {summary.requestedTotal > 0 && (
            <>
              {" · "}
              <span data-numeric className="font-semibold text-ink-900">
                {formatDollars(summary.requestedTotal)}
              </span>{" "}
              requested
            </>
          )}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1.5 rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-mist-50 transition-colors hover:bg-navy-800"
          >
            {copied ? (
              <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
            ) : (
              <Copy className="size-3.5" strokeWidth={2.25} aria-hidden />
            )}
            {copied ? "Copied" : "Copy notice"}
          </button>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-md border border-card-edge px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-card-muted"
          >
            <Download className="size-3.5" strokeWidth={2.25} aria-hidden />
            Download
          </button>
        </div>

        {failed && (
          <p role="alert" className="mt-2 text-xs text-alert-700">
            Could not reach the clipboard — select the text below and copy it by hand.
          </p>
        )}
      </header>

      {/* Monospace, because this gets pasted into an email as plain text. */}
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words bg-card-muted p-4 font-mono text-[0.6875rem] leading-relaxed text-ink-700">
        {text}
      </pre>
    </section>
  );
}
