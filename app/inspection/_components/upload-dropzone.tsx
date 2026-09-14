"use client";

import { CircleAlert, CloudUpload, FlaskConical, LoaderCircle } from "lucide-react";
import { useState } from "react";

import type { Deal } from "@/lib/deals";
import { setReport } from "@/lib/inspection-store";
import { sampleReport, toFindings, type InspectionReport } from "@/lib/inspection";

/** The pre-formatted skeleton the agent lands on. */
export function UploadDropzone({ deal }: { deal: Deal }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    setHint(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/inspection/extract", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "That report could not be read.");
        // Without a key the rest of the tool is still worth seeing.
        if (payload.code === "no_api_key") setHint("sample");
        return;
      }

      const report: InspectionReport = {
        id: crypto.randomUUID(),
        dealId: deal.id,
        // The report's own address wins; the deal's is the fallback.
        propertyAddress: payload.propertyAddress || deal.address,
        inspectionDate: payload.inspectionDate ?? "",
        sourceFileName: file.name,
        extractedAt: new Date().toISOString(),
        source: "claude",
        findings: toFindings(payload.findings),
      };

      if (report.findings.length === 0) {
        setError("No findings came back from that document. Is it an inspection report?");
        return;
      }

      setReport(report);
    } catch {
      setError("Could not reach the server. Check that the app is still running.");
    } finally {
      setBusy(false);
    }
  }

  const loadSample = () =>
    setReport(sampleReport(deal.id, crypto.randomUUID(), new Date().toISOString()));

  return (
    <div className="mt-6">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-panel border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging
            ? "border-accent-400 bg-accent-500/10"
            : "border-navy-600 hover:border-accent-500/60 hover:bg-navy-800/40"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />

        <span className="grid size-12 place-items-center rounded-full bg-navy-700/70 text-mist-200">
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" strokeWidth={2.25} aria-hidden />
          ) : (
            <CloudUpload className="size-5" strokeWidth={2} aria-hidden />
          )}
        </span>

        <span className="mt-4 text-title text-mist-50">
          {busy ? "Reading the report…" : "Drag the inspection PDF here"}
        </span>
        <span className="mt-2 max-w-md text-sm leading-relaxed text-mist-400">
          {busy
            ? "A 50-page report takes about a minute. Minor cosmetic items are filed separately, not thrown away."
            : "It gets sorted into safety hazards, major systems, and cosmetic items — with cosmetic items held out of the negotiation draft until you ask for them."}
        </span>
        {!busy && (
          <span className="mt-3 text-xs text-mist-500">PDF, up to 20 MB · or click to browse</span>
        )}
      </label>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-tile border border-alert-500/30 bg-alert-500/10 px-4 py-3"
        >
          <CircleAlert
            className="mt-0.5 size-4 shrink-0 text-alert-300"
            strokeWidth={2.25}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm text-alert-200">{error}</p>
            {hint === "sample" && (
              <button
                type="button"
                onClick={loadSample}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-500 px-2.5 py-1.5 text-xs font-semibold text-navy-950 transition-colors hover:bg-accent-400"
              >
                <FlaskConical className="size-3.5" strokeWidth={2.25} aria-hidden />
                Load the sample report instead
              </button>
            )}
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-mist-500">
        No report to hand?{" "}
        <button
          type="button"
          onClick={loadSample}
          className="font-semibold text-accent-400 underline-offset-2 hover:underline"
        >
          Load a worked sample
        </button>{" "}
        to see the rest of the tool.
      </p>
    </div>
  );
}
