/**
 * The inspection report model, and the maths the organizer reads off it.
 *
 * Import-free so schema.test.ts can exercise it directly. Two things live here
 * that are worth getting right: what counts as "included" in a negotiation
 * draft, and the addendum text an agent will actually send to another agent.
 */

export type Severity = "critical" | "major" | "cosmetic";

export const SEVERITY_ORDER: readonly Severity[] = ["critical", "major", "cosmetic"];

/** Cosmetic items are kept out of the negotiation draft until asked for. */
export const INCLUDED_BY_DEFAULT: Record<Severity, boolean> = {
  critical: true,
  major: true,
  cosmetic: false,
};

export type ResolutionType = "repair" | "credit" | "price-reduction" | "none";

export const RESOLUTION_NEEDS_AMOUNT: Record<ResolutionType, boolean> = {
  repair: false,
  credit: true,
  "price-reduction": true,
  none: false,
};

export type InspectionFinding = {
  id: string;
  /** Short headline, e.g. "Double-tapped breakers in main panel". */
  title: string;
  location: string;
  /** What the report said, condensed. */
  detail: string;
  severity: Severity;
  /** Page or section of the source report, so the agent can check it. */
  reference: string;
  /**
   * Only set when the report itself states a figure. Never inferred — a made-up
   * repair cost in a document sent to the listing agent is a real liability.
   */
  estimatedCost: number | null;

  /* ---- Agent decisions below this line ---- */

  included: boolean;
  resolution: ResolutionType;
  /** What the agent is asking for. Agent-entered, never extracted. */
  requestedAmount: number | null;
  agentNote: string;
};

export type ReportSource = "claude" | "sample";

export type InspectionReport = {
  id: string;
  propertyAddress: string;
  inspectionDate: string;
  sourceFileName: string;
  extractedAt: string;
  source: ReportSource;
  findings: InspectionFinding[];
};

/* -------------------------------------------------------------------------- */
/* Grouping and totals                                                        */
/* -------------------------------------------------------------------------- */

export type SeverityBucket = {
  severity: Severity;
  findings: InspectionFinding[];
  includedCount: number;
};

/** Findings grouped into the preset buckets, always in severity order. */
export function bucketFindings(findings: InspectionFinding[]): SeverityBucket[] {
  return SEVERITY_ORDER.map((severity) => {
    const inBucket = findings.filter((finding) => finding.severity === severity);
    return {
      severity,
      findings: inBucket,
      includedCount: inBucket.filter((finding) => finding.included).length,
    };
  });
}

export type RequestTotals = {
  includedCount: number;
  /** Sum of what is actually being asked for in money. */
  requestedTotal: number;
  repairCount: number;
};

export function totals(findings: InspectionFinding[]): RequestTotals {
  const included = findings.filter((finding) => finding.included);

  return {
    includedCount: included.length,
    requestedTotal: included.reduce(
      (sum, finding) =>
        sum +
        (RESOLUTION_NEEDS_AMOUNT[finding.resolution] ? (finding.requestedAmount ?? 0) : 0),
      0,
    ),
    repairCount: included.filter((finding) => finding.resolution === "repair").length,
  };
}

/* -------------------------------------------------------------------------- */
/* Validating what the model returned                                         */
/* -------------------------------------------------------------------------- */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

/**
 * Turns one raw extracted item into a finding, applying the default
 * inclusion rule.
 *
 * Skips anything without a title rather than throwing: one malformed row
 * should not lose the other forty-nine.
 */
export function toFinding(raw: unknown, index: number): InspectionFinding | null {
  if (!isRecord(raw)) return null;

  const title = asString(raw.title);
  if (title === "") return null;

  const severity = SEVERITY_ORDER.includes(raw.severity as Severity)
    ? (raw.severity as Severity)
    : // An unrecognised severity is treated as major, not dropped and not
      // promoted to critical: it still reaches the agent, without crying wolf.
      "major";

  const cost = raw.estimatedCost;

  return {
    id: `finding-${index + 1}`,
    title,
    location: asString(raw.location, "Not stated"),
    detail: asString(raw.detail),
    severity,
    reference: asString(raw.reference, "—"),
    estimatedCost: typeof cost === "number" && Number.isFinite(cost) && cost > 0 ? cost : null,
    included: INCLUDED_BY_DEFAULT[severity],
    resolution: severity === "cosmetic" ? "none" : "repair",
    requestedAmount: null,
    agentNote: "",
  };
}

export function toFindings(raw: unknown): InspectionFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item, index) => {
    const finding = toFinding(item, index);
    return finding ? [finding] : [];
  });
}

/* -------------------------------------------------------------------------- */
/* The addendum                                                               */
/* -------------------------------------------------------------------------- */

const RESOLUTION_PHRASING: Record<ResolutionType, string> = {
  repair:
    "Seller to repair prior to closing, by a licensed contractor, with receipts provided at final walkthrough.",
  credit: "Seller to issue a closing credit of {amount} in lieu of repair.",
  "price-reduction": "Purchase price to be reduced by {amount}.",
  none: "Noted for the buyer's awareness. No action requested.",
};

const money = (amount: number) =>
  `$${Math.round(amount).toLocaleString("en-US")}`;

export function resolutionSentence(finding: InspectionFinding): string {
  const phrase = RESOLUTION_PHRASING[finding.resolution];
  if (!RESOLUTION_NEEDS_AMOUNT[finding.resolution]) return phrase;

  return phrase.replace(
    "{amount}",
    finding.requestedAmount ? money(finding.requestedAmount) : "an amount to be agreed",
  );
}

const SEVERITY_HEADING: Record<Severity, string> = {
  critical: "Safety and habitability",
  major: "Major systems",
  cosmetic: "Additional items",
};

/**
 * The Buyer's Inspection Notice, as plain text ready to paste into an email.
 *
 * Only included findings appear. Agent notes stay out — they are the agent's
 * own shorthand, not something to send to the other side.
 */
export function buildAddendum(report: InspectionReport): string {
  const included = report.findings.filter((finding) => finding.included);
  const summary = totals(report.findings);

  const lines: string[] = [
    "BUYER'S INSPECTION NOTICE AND REQUEST FOR REPAIRS",
    "",
    `Property: ${report.propertyAddress || "[property address]"}`,
    `Inspection date: ${report.inspectionDate || "[inspection date]"}`,
    `Source report: ${report.sourceFileName || "[report file]"}`,
    "",
    "Following the inspection, the buyer requests the following items be",
    "addressed prior to closing. Items not listed are accepted as-is.",
    "",
  ];

  if (included.length === 0) {
    lines.push("No items are being requested at this time.", "");
  }

  let itemNumber = 0;

  for (const severity of SEVERITY_ORDER) {
    const inSection = included.filter((finding) => finding.severity === severity);
    if (inSection.length === 0) continue;

    lines.push(SEVERITY_HEADING[severity].toUpperCase(), "");

    for (const finding of inSection) {
      itemNumber += 1;
      lines.push(`${itemNumber}. ${finding.title}`);
      lines.push(`   Location: ${finding.location}`);
      if (finding.detail) lines.push(`   Finding: ${finding.detail}`);
      lines.push(`   Report reference: ${finding.reference}`);
      lines.push(`   Requested: ${resolutionSentence(finding)}`);
      lines.push("");
    }
  }

  if (summary.requestedTotal > 0) {
    lines.push(
      `Total credits and reductions requested: ${money(summary.requestedTotal)}`,
      "",
    );
  }

  lines.push(
    "This notice is submitted in accordance with the inspection contingency",
    "in the purchase agreement. Please respond in writing by the contingency",
    "deadline.",
    "",
    "Buyer's agent: ______________________    Date: ____________",
  );

  return lines.join("\n");
}
