"use client";

import { Paintbrush, ShieldAlert, Wrench, type LucideIcon } from "lucide-react";

import { formatDollars } from "@/lib/format";
import { setBucketIncluded, toggleFinding, updateFinding } from "@/lib/inspection-store";
import {
  bucketFindings,
  RESOLUTION_NEEDS_AMOUNT,
  RESOLUTION_PRESETS,
  severityPreset,
  type InspectionFinding,
  type ResolutionType,
  type Severity,
} from "@/lib/inspection";

const SEVERITY_ICON: Record<Severity, LucideIcon> = {
  critical: ShieldAlert,
  major: Wrench,
  cosmetic: Paintbrush,
};

const SEVERITY_CHIP: Record<Severity, string> = {
  critical: "bg-alert-500/16 text-alert-700",
  major: "bg-accent-500/14 text-accent-600",
  cosmetic: "bg-card-sunken text-ink-500",
};

const INPUT =
  "rounded-md border border-card-edge bg-card-muted px-2 py-1 text-xs text-ink-900 transition-colors focus:border-accent-400 focus:bg-card";

/** The categorized issue matrix: preset buckets, one toggle per finding. */
export function FindingsMatrix({
  dealId,
  findings,
}: {
  dealId: string;
  findings: InspectionFinding[];
}) {
  const buckets = bucketFindings(findings);

  return (
    <div className="flex flex-col gap-4">
      {buckets.map((bucket) => {
        const preset = severityPreset(bucket.severity);
        const Icon = SEVERITY_ICON[bucket.severity];
        const allIn = bucket.findings.length > 0 && bucket.includedCount === bucket.findings.length;

        if (bucket.findings.length === 0) return null;

        return (
          <section key={bucket.severity} className="card p-4 md:p-5">
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-title text-ink-900">
                  <Icon className="size-4 shrink-0 text-ink-400" strokeWidth={2} aria-hidden />
                  {preset.label}
                </h3>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-ink-500">
                  {preset.guidance}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-xs text-ink-500">
                  <span data-numeric className="font-semibold text-ink-900">
                    {bucket.includedCount}
                  </span>{" "}
                  of {bucket.findings.length} in the draft
                </span>
                <button
                  type="button"
                  onClick={() => setBucketIncluded(dealId, bucket.severity, !allIn)}
                  className="rounded-md bg-card-sunken px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-mist-200"
                >
                  {allIn ? "Drop all" : "Include all"}
                </button>
              </div>
            </header>

            <ul className="mt-3 divide-y divide-card-edge">
              {bucket.findings.map((finding) => (
                <FindingRow key={finding.id} dealId={dealId} finding={finding} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function FindingRow({
  dealId,
  finding,
}: {
  dealId: string;
  finding: InspectionFinding;
}) {
  const needsAmount = RESOLUTION_NEEDS_AMOUNT[finding.resolution];

  return (
    <li className={`flex gap-3 py-3.5 ${finding.included ? "" : "opacity-55"}`}>
      {/* Include / exclude, one click. */}
      <button
        type="button"
        role="switch"
        aria-checked={finding.included}
        onClick={() => toggleFinding(dealId, finding.id)}
        aria-label={`${finding.included ? "Remove" : "Add"} ${finding.title} ${finding.included ? "from" : "to"} the repair request`}
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          finding.included ? "bg-good-500" : "bg-card-sunken ring-1 ring-card-edge ring-inset"
        }`}
      >
        <span
          aria-hidden
          className={`size-4 rounded-full bg-white shadow-sm transition-transform ${
            finding.included ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-ink-900">{finding.title}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${SEVERITY_CHIP[finding.severity]}`}
          >
            {severityPreset(finding.severity).short}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-ink-400">
          {finding.location} · {finding.reference}
          {finding.estimatedCost !== null && (
            <> · report states {formatDollars(finding.estimatedCost)}</>
          )}
        </p>

        {finding.detail && (
          <p className="mt-1 text-xs leading-relaxed text-ink-600">{finding.detail}</p>
        )}

        {finding.included && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`resolution-${finding.id}`}>
              Resolution for {finding.title}
            </label>
            <select
              id={`resolution-${finding.id}`}
              value={finding.resolution}
              onChange={(event) =>
                updateFinding(dealId, finding.id, {
                  resolution: event.target.value as ResolutionType,
                })
              }
              className={INPUT}
            >
              {RESOLUTION_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>

            {needsAmount && (
              <span className="inline-flex items-center gap-1">
                <span className="text-xs text-ink-400">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  value={finding.requestedAmount ?? ""}
                  onChange={(event) =>
                    updateFinding(dealId, finding.id, {
                      requestedAmount:
                        event.target.value === "" ? null : Number(event.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  aria-label={`Amount requested for ${finding.title}`}
                  className={`w-24 font-mono tabular-nums ${INPUT}`}
                />
              </span>
            )}

            <input
              value={finding.agentNote}
              onChange={(event) => updateFinding(dealId, finding.id, { agentNote: event.target.value })}
              placeholder="Private note (never sent)"
              aria-label={`Private note for ${finding.title}`}
              className={`min-w-0 flex-1 ${INPUT}`}
            />
          </div>
        )}
      </div>
    </li>
  );
}
