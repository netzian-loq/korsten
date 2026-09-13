"use client";

import { useSyncExternalStore } from "react";

import type { InspectionFinding, InspectionReport, Severity } from "./inspection";

/**
 * The report currently open, kept in localStorage.
 *
 * `null` until one is extracted or the sample is loaded — that null is what
 * puts the upload screen on the page.
 */

const KEY = "realtor-suite:inspection:v1";

let cache: InspectionReport | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function read(): InspectionReport | null {
  if (loaded) return cache;
  loaded = true;

  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as InspectionReport) : null;
    cache = parsed && Array.isArray(parsed.findings) ? parsed : null;
  } catch {
    cache = null;
  }

  return cache;
}

function write(next: InspectionReport | null) {
  cache = next;
  loaded = true;

  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Quota or private mode: the change still applies for this session.
  }

  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    loaded = false;
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => null;

export function useInspectionReport(): InspectionReport | null {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export const setReport = (report: InspectionReport) => write(report);
export const clearReport = () => write(null);

export function updateReport(patch: Partial<InspectionReport>) {
  const report = read();
  if (report) write({ ...report, ...patch });
}

export function updateFinding(findingId: string, patch: Partial<InspectionFinding>) {
  const report = read();
  if (!report) return;

  write({
    ...report,
    findings: report.findings.map((finding) =>
      finding.id === findingId ? { ...finding, ...patch } : finding,
    ),
  });
}

/** Reads `included` from the store, so rapid toggles cannot clobber each other. */
export function toggleFinding(findingId: string) {
  const report = read();
  const finding = report?.findings.find((candidate) => candidate.id === findingId);
  if (finding) updateFinding(findingId, { included: !finding.included });
}

/** Include or drop a whole bucket — "add all the cosmetic items" in one click. */
export function setBucketIncluded(severity: Severity, included: boolean) {
  const report = read();
  if (!report) return;

  write({
    ...report,
    findings: report.findings.map((finding) =>
      finding.severity === severity ? { ...finding, included } : finding,
    ),
  });
}
