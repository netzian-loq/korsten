import Anthropic from "@anthropic-ai/sdk";

import {
  EXTRACTION_MAX_TOKENS,
  EXTRACTION_MODEL,
  SCHEMA,
  SYSTEM_PROMPT,
  TOOL_NAME,
  USER_INSTRUCTION,
} from "@/lib/inspection/extract-prompt";
import { toFindings } from "@/lib/inspection/schema";

/** A thorough report takes a while to read; well inside the platform ceiling. */
export const maxDuration = 300;

/**
 * Anthropic caps a request at 32 MB. Base64 inflates by about a third, so the
 * raw PDF has to stay meaningfully under that.
 */
const MAX_PDF_BYTES = 20 * 1024 * 1024;

type Failure = { error: string; code: string };

const fail = (status: number, code: string, error: string) =>
  Response.json({ error, code } satisfies Failure, { status });

export async function POST(request: Request) {
  // The key never reaches the browser, which is the whole reason this runs here.
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return fail(
      503,
      "no_api_key",
      "No ANTHROPIC_API_KEY is set, so reports cannot be read yet. Set one in .env.local, or load the sample report to try the rest of the tool.",
    );
  }

  let file: File;
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");

    if (!(candidate instanceof File)) {
      return fail(400, "no_file", "No file came through. Attach a PDF and try again.");
    }
    file = candidate;
  } catch {
    return fail(400, "bad_request", "That upload could not be read.");
  }

  if (file.type && file.type !== "application/pdf") {
    return fail(
      415,
      "not_pdf",
      `This reads PDFs, and that file is ${file.type}. Export the report as a PDF first.`,
    );
  }

  if (file.size > MAX_PDF_BYTES) {
    return fail(
      413,
      "too_large",
      `That PDF is ${Math.round(file.size / 1024 / 1024)} MB. The limit is 20 MB — most reports compress well under it.`,
    );
  }

  const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic();

  try {
    // Streamed because a long report plus a large max_tokens can outrun the
    // SDK's HTTP timeout on a single non-streaming request.
    const stream = client.messages.stream({
      model: EXTRACTION_MODEL,
      max_tokens: EXTRACTION_MAX_TOKENS,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description: "Record every finding extracted from the inspection report.",
          // Strict mode guarantees the arguments validate against SCHEMA, so
          // nothing downstream has to repair malformed JSON.
          strict: true,
          input_schema: SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            // The document block goes before the text, per the API docs.
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            { type: "text", text: USER_INSTRUCTION },
          ],
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return fail(
        422,
        "refused",
        "Claude declined to process that document. If it is a normal inspection report, try re-exporting it.",
      );
    }

    const toolUse = message.content.find(
      (block) => block.type === "tool_use" && block.name === TOOL_NAME,
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return fail(
        502,
        "no_findings",
        "The report was read but nothing came back in the expected shape. Try again.",
      );
    }

    // Strict mode already validated the shape; re-validating here keeps one bad
    // row from taking down the page, and applies the default inclusion rule.
    const extracted = toolUse.input as Record<string, unknown>;

    return Response.json({
      propertyAddress:
        typeof extracted.propertyAddress === "string" ? extracted.propertyAddress : "",
      inspectionDate:
        typeof extracted.inspectionDate === "string" ? extracted.inspectionDate : "",
      findings: toFindings(extracted.findings),
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    // Most specific first: a 400 about page count is not a retry, a 429 is.
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(401, "bad_key", "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "rate_limited", "Rate limited by the Anthropic API. Wait a moment and retry.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      return fail(
        400,
        "rejected",
        `The API rejected that document: ${error.message}. Very long reports may exceed the page limit.`,
      );
    }
    if (error instanceof Anthropic.APIError) {
      return fail(502, "api_error", `The Anthropic API returned ${error.status}: ${error.message}`);
    }

    return fail(500, "unknown", "Something went wrong reading that report.");
  }
}
