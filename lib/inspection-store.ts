"use client";

import { useSyncExternalStore } from "react";

import type { InspectionFinding, InspectionReport, Severity } from "./inspection";

/**
 * Inspection reports, one per deal, kept in localStorage.
 *
 * `null` for a deal with no report yet — that null is what puts the upload
 * screen on the page.
 */

const KEY = "realtor-suite:inspections:v1";

type Reports = Record<string, InspectionReport>;

const EMPTY: Reports = {};

let cache: Reports | null = null;
const listeners = new Set<() => void>();

function read(): Reports {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Reports)
        : {};
  } catch {
    cache = {};
  }

  return cache;
}

function write(next: Reports) {
  cache = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the change still applies for this session.
  }

  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => EMPTY;

export function useInspectionReport(dealId: string): InspectionReport | null {
  return useSyncExternalStore(subscribe, read, getServerSnapshot)[dealId] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

const save = (report: InspectionReport) =>
  write({ ...read(), [report.dealId]: report });

export const setReport = (report: InspectionReport) => save(report);

export function clearReport(dealId: string) {
  const remaining = { ...read() };
  delete remaining[dealId];
  write(remaining);
}

export function updateReport(dealId: string, patch: Partial<InspectionReport>) {
  const report = read()[dealId];
  if (report) save({ ...report, ...patch });
}

export function updateFinding(
  dealId: string,
  findingId: string,
  patch: Partial<InspectionFinding>,
) {
  const report = read()[dealId];
  if (!report) return;

  save({
    ...report,
    findings: report.findings.map((finding) =>
      finding.id === findingId ? { ...finding, ...patch } : finding,
    ),
  });
}

/** Reads `included` from the store, so rapid toggles cannot clobber each other. */
export function toggleFinding(dealId: string, findingId: string) {
  const finding = read()[dealId]?.findings.find((c) => c.id === findingId);
  if (finding) updateFinding(dealId, findingId, { included: !finding.included });
}

/** Include or drop a whole bucket — "add all the cosmetic items" in one click. */
export function setBucketIncluded(dealId: string, severity: Severity, included: boolean) {
  const report = read()[dealId];
  if (!report) return;

  save({
    ...report,
    findings: report.findings.map((finding) =>
      finding.severity === severity ? { ...finding, included } : finding,
    ),
  });
}
