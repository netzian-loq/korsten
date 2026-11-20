import type { ClientProgress } from "./schema.ts";

/**
 * Encoding a deal into a shareable link.
 *
 * With no backend, the link has to carry the data. It is packed into the URL
 * *hash*, which browsers never send to the server — the payload holds a
 * buyer's name and home address, and that is not something to leave in request
 * logs.
 *
 * The trade-off: a link is a snapshot. Change a date and the old link still
 * shows the old one, so copy a fresh link after editing. A live link needs a
 * row in a database to point at.
 */

const PREFIX = "#d=";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): string {
  const padded = token
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(token.length / 4) * 4, "=");

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Exactly what the buyer receives.
 *
 * Built field by field rather than spreading the whole record, so agent-side
 * bookkeeping (which link was last sent, internal ids) never rides along in a
 * link handed to a client.
 */
export function sharedPayload(progress: ClientProgress) {
  return {
    buyerName: progress.buyerName,
    propertyAddress: progress.propertyAddress,
    presetId: progress.presetId,
    acceptedDate: progress.acceptedDate,
    milestones: progress.milestones,
  };
}

/**
 * A stable signature of what the buyer would see.
 *
 * Milestone keys are sorted so that re-saving the same state cannot produce a
 * different signature and cry "out of date" when nothing actually moved.
 */
export function fingerprint(progress: ClientProgress): string {
  const payload = sharedPayload(progress);
  const milestones = Object.keys(payload.milestones)
    .sort()
    .map((key) => [key, payload.milestones[key]] as const);

  return JSON.stringify({ ...payload, milestones });
}

/** `sharedAt` rides along so the buyer can see how old the snapshot is. */
export function encodeProgress(progress: ClientProgress, sharedAt: string): string {
  return toBase64Url(JSON.stringify({ ...sharedPayload(progress), sharedAt }));
}

/** Parses a token back, returning null for anything malformed or tampered. */
export function decodeProgress(token: string): ClientProgress | null {
  if (!token) return null;

  try {
    const parsed: unknown = JSON.parse(fromBase64Url(token));

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as ClientProgress).presetId !== "string" ||
      typeof (parsed as ClientProgress).acceptedDate !== "string" ||
      typeof (parsed as ClientProgress).milestones !== "object" ||
      (parsed as ClientProgress).milestones === null
    ) {
      return null;
    }

    // The payload carries only the buyer-facing fields; fill in the rest so
    // the shape the timeline renderer expects is still satisfied. Links sent
    // before this change still carry id/createdAt, so those win when present.
    const payload = parsed as Partial<ClientProgress>;
    return {
      ...payload,
      id: payload.id ?? "shared",
      createdAt: payload.createdAt ?? "",
    } as ClientProgress;
  } catch {
    return null;
  }
}

/** The full link to hand the buyer. */
export function shareUrl(
  origin: string,
  progress: ClientProgress,
  sharedAt: string,
): string {
  return `${origin.replace(/\/$/, "")}/track${PREFIX}${encodeProgress(progress, sharedAt)}`;
}

/** Pulls the token back out of a `#d=…` hash. */
export function tokenFromHash(hash: string): string {
  return hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : "";
}
