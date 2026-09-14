import categoriesJson from "./categories.json";
import sampleJson from "./sample-report.json";
import {
  toFindings,
  type InspectionReport,
  type ResolutionType,
  type Severity,
} from "./schema";

/**
 * Preset buckets, resolution presets, and the sample report.
 *
 * The sample runs through the same `toFindings` the API response does, so the
 * two paths cannot drift apart.
 */

export * from "./schema";

export type SeverityPreset = {
  id: Severity;
  label: string;
  short: string;
  guidance: string;
  includedByDefault: boolean;
};

export type ResolutionPreset = {
  id: ResolutionType;
  label: string;
  phrasing: string;
  needsAmount: boolean;
};

type Categories = {
  severities: SeverityPreset[];
  resolutions: ResolutionPreset[];
};

const CATEGORIES = categoriesJson as Categories;

export const SEVERITY_PRESETS = CATEGORIES.severities;
export const RESOLUTION_PRESETS = CATEGORIES.resolutions;

export const severityPreset = (severity: Severity): SeverityPreset =>
  SEVERITY_PRESETS.find((preset) => preset.id === severity) ?? SEVERITY_PRESETS[1];

export const resolutionPreset = (resolution: ResolutionType): ResolutionPreset =>
  RESOLUTION_PRESETS.find((preset) => preset.id === resolution) ?? RESOLUTION_PRESETS[0];

/** The worked example, for trying the tool before an API key exists. */
export function sampleReport(dealId: string, id: string, now: string): InspectionReport {
  return {
    id,
    dealId,
    propertyAddress: sampleJson.propertyAddress,
    inspectionDate: sampleJson.inspectionDate,
    sourceFileName: sampleJson.sourceFileName,
    extractedAt: now,
    source: "sample",
    findings: toFindings(sampleJson.findings),
  };
}
