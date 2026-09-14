"use client";

import { FileText, FlaskConical, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";

import { clearReport, updateReport, useInspectionReport } from "@/lib/inspection-store";

import { AddendumPreview } from "./addendum-preview";
import { FindingsMatrix } from "./findings-matrix";
import { UploadDropzone } from "./upload-dropzone";

const FIELD =
  "mt-1.5 w-full rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400";
const FIELD_LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500";

export function InspectionModule() {
  const report = useInspectionReport();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!report) return <UploadDropzone />;

  return (
    <>
      <section className="panel mt-6 px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={FIELD_LABEL}>Property</span>
              <input
                value={report.propertyAddress}
                onChange={(event) => updateReport({ propertyAddress: event.target.value })}
                placeholder="302 Bellwether Ave"
                className={FIELD}
              />
            </label>
            <label className="block">
              <span className={FIELD_LABEL}>Inspection date</span>
              <input
                type="date"
                value={report.inspectionDate}
                onChange={(event) => updateReport({ inspectionDate: event.target.value })}
                className={`${FIELD} font-mono tabular-nums`}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                report.source === "claude"
                  ? "border-good-500/30 bg-good-500/10 text-good-400"
                  : "border-navy-600 bg-navy-800/60 text-mist-400"
              }`}
            >
              {report.source === "claude" ? (
                <Sparkles className="size-3.5" strokeWidth={2.25} aria-hidden />
              ) : (
                <FlaskConical className="size-3.5" strokeWidth={2.25} aria-hidden />
              )}
              {report.source === "claude" ? "Read by Claude" : "Sample report"}
            </span>

            <button
              type="button"
              onClick={() => {
                if (confirmClear) {
                  clearReport();
                  setConfirmClear(false);
                } else {
                  setConfirmClear(true);
                }
              }}
              onBlur={() => setConfirmClear(false)}
              className={`inline-flex items-center gap-1.5 rounded-md border border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 hover:text-mist-100 ${
                confirmClear ? "border-alert-500/50 text-alert-300" : ""
              }`}
            >
              <RotateCcw className="size-3.5" strokeWidth={2.25} aria-hidden />
              {confirmClear ? "Discards your edits — confirm" : "New report"}
            </button>
          </div>
        </div>

        <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-navy-700 pt-3 text-xs text-mist-500">
          <FileText className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {report.sourceFileName || "Untitled report"} ·{" "}
          <span data-numeric>{report.findings.length}</span> findings ·{" "}
          {report.source === "claude"
            ? "Check each item against the report before sending."
            : "Worked example, not a real property."}
        </p>
      </section>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <FindingsMatrix findings={report.findings} />
        <AddendumPreview report={report} />
      </div>
    </>
  );
}
