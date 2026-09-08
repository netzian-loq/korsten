/**
 * Resolving the absolute origin that `metadataBase` is built from.
 *
 * Import-free so `lib/site-url.test.ts` can exercise it directly. This runs at
 * module scope during the build, so it must never throw: a bad value here
 * fails the entire deployment rather than one page.
 */

export const LOCAL_ORIGIN = "http://localhost:3000";

/**
 * The first candidate that parses as a URL, else localhost.
 *
 * An env var that is *defined but empty* is the common failure: `??` treats
 * `""` as present and hands it to `new URL()`, which throws ERR_INVALID_URL.
 * So each candidate is trimmed, skipped when blank, and skipped again if it
 * does not parse.
 *
 * Bare hosts get an `https://` prefix, because Vercel's system variables
 * (VERCEL_URL, VERCEL_PROJECT_PRODUCTION_URL) carry no scheme.
 */
export function resolveSiteOrigin(
  candidates: readonly (string | undefined)[],
): URL {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;

    const absolute = /^https?:\/\//i.test(value) ? value : `https://${value}`;

    try {
      const url = new URL(absolute);
      // `new URL("https://")` throws, but other odd inputs can parse with an
      // empty host — those are no use as an origin either.
      if (url.hostname) return url;
    } catch {
      // Unparseable; fall through to the next candidate.
    }
  }

  return new URL(LOCAL_ORIGIN);
}
