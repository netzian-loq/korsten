import type Anthropic from "@anthropic-ai/sdk";

/**
 * Extraction pipeline: 50-page PDF in, categorized findings out.
 *
 *   1. Browser posts the PDF to /api/inspection/extract as multipart form data.
 *      Nothing is parsed client-side.
 *   2. The route base64-encodes it into a `document` content block. Claude reads
 *      PDFs natively, so there is no PDF text-extraction library in this stack —
 *      layout, tables, and the photo captions inspectors rely on all survive,
 *      which a text scrape would flatten.
 *   3. One call to Claude with a strict tool schema. Strict mode guarantees the
 *      arguments validate against SCHEMA below, so the route never hand-parses
 *      prose or repairs malformed JSON.
 *   4. `toFindings` in schema.ts re-validates anyway — the model is one input
 *      among several, and a bad row should not take the page down — and applies
 *      the default inclusion rule (cosmetic items off).
 *   5. The agent's toggles and resolutions are layered on top and never sent
 *      back to the model. Extraction runs once; editing is local and instant.
 *
 * Cost shape: input dominates. A 50-page report is roughly 25-40k tokens, the
 * output a few thousand. If this is ever run repeatedly against one report,
 * cache the document block rather than re-uploading.
 */

/** Pinned deliberately: miscategorising a safety hazard is the expensive error. */
export const EXTRACTION_MODEL = "claude-opus-5";

/** Generous — a thorough report can carry 60+ findings. Streamed, so no timeout. */
export const EXTRACTION_MAX_TOKENS = 32_000;

export const TOOL_NAME = "record_findings";

export const SYSTEM_PROMPT = `You read residential home-inspection reports and pull out every finding a buyer's agent would act on, sorted into three buckets.

BUCKETS

critical — Safety and habitability. Unsafe or actively failing: exposed or double-tapped wiring, missing GFCI near water, gas leaks or improper venting, structural movement, failed heat, active water intrusion, mould, missing or dead smoke and CO alarms, trip and fall hazards.

major — Major systems and capital expense. Real dollars and a service life: roof, HVAC, water heater, sewer and supply lines, foundation drainage and grading, windows, electrical panel capacity, major appliances at end of life.

cosmetic — Wear, appearance, and small maintenance: scuffed paint, sticking doors, loose handles, worn caulk, dirty filters, minor landscaping, small drywall cracks with no structural note.

RULES

1. Report what the document says. Never add a finding the report does not contain, and never soften or dramatise one that it does.
2. Do not estimate repair costs. Set estimatedCost only when the report itself states a figure; otherwise use 0. A guessed number here ends up in a document sent to the other side's agent.
3. One finding per distinct issue. Do not merge two rooms' problems into one row, and do not split one issue across rows.
4. When an item sits between major and cosmetic, choose major. The agent can demote it with one click; a missed major item costs their buyer money.
5. When an item sits between critical and major, choose critical only if there is a stated safety or habitability concern. Crying wolf costs the agent credibility in the negotiation.
6. Never drop an item because it looks minor. Cosmetic findings are collected too — they are simply held out of the negotiation draft by default.
7. detail should be a single condensed sentence in the report's own terms, not a quote of the whole paragraph.
8. reference should locate the item in the source: a page number, section name, or item number exactly as printed.
9. If the report states the property address or inspection date, return them. If not, return an empty string rather than inventing one.`;

/**
 * Strict tool schema — `strict: true` requires `additionalProperties: false`
 * and a complete `required` list at every level.
 *
 * estimatedCost is a plain number with 0 meaning "not stated", rather than a
 * nullable union, which keeps the schema inside what strict mode accepts.
 */
export const SCHEMA: Anthropic.Tool["input_schema"] = {
  type: "object",
  properties: {
    propertyAddress: {
      type: "string",
      description: "Property address as printed in the report, or an empty string.",
    },
    inspectionDate: {
      type: "string",
      description: "Inspection date as printed, or an empty string. Prefer YYYY-MM-DD.",
    },
    findings: {
      type: "array",
      description: "Every actionable finding in the report, in the order they appear.",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short headline, e.g. 'Double-tapped breakers in main panel'.",
          },
          location: {
            type: "string",
            description: "Where in the property, e.g. 'Garage — main electrical panel'.",
          },
          detail: {
            type: "string",
            description: "One condensed sentence describing the finding.",
          },
          severity: {
            type: "string",
            enum: ["critical", "major", "cosmetic"],
            description: "Which bucket this belongs in.",
          },
          reference: {
            type: "string",
            description: "Page number, section, or item number in the source report.",
          },
          estimatedCost: {
            type: "number",
            description:
              "Cost in whole dollars ONLY if the report states one. Otherwise 0. Never estimate.",
          },
        },
        required: ["title", "location", "detail", "severity", "reference", "estimatedCost"],
        additionalProperties: false,
      },
    },
  },
  required: ["propertyAddress", "inspectionDate", "findings"],
  additionalProperties: false,
};

export const USER_INSTRUCTION =
  "Read this inspection report and record every finding using the record_findings tool.";
