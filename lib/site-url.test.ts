import assert from "node:assert/strict";
import { test } from "node:test";

import { LOCAL_ORIGIN, resolveSiteOrigin } from "./site-url.ts";

const origin = (candidates: readonly (string | undefined)[]) =>
  resolveSiteOrigin(candidates).origin;

test("an explicit absolute URL wins", () => {
  assert.equal(origin(["https://korsten.example"]), "https://korsten.example");
  assert.equal(origin(["http://localhost:4000"]), "http://localhost:4000");
});

test("a defined-but-empty variable is skipped, not passed to new URL", () => {
  // The deployment failure: `??` treats "" as present, `new URL("")` throws.
  assert.equal(origin([""]), LOCAL_ORIGIN);
  assert.equal(origin(["", "https://fallback.example"]), "https://fallback.example");
});

test("whitespace-only and undefined variables are skipped", () => {
  assert.equal(origin(["   "]), LOCAL_ORIGIN);
  assert.equal(origin([undefined]), LOCAL_ORIGIN);
  assert.equal(origin([undefined, "  ", "https://third.example"]), "https://third.example");
});

test("surrounding whitespace is trimmed rather than rejected", () => {
  assert.equal(origin(["  https://spaced.example  "]), "https://spaced.example");
});

test("a bare host gets https, the way Vercel supplies it", () => {
  // VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL carry no scheme.
  assert.equal(origin(["korsten.vercel.app"]), "https://korsten.vercel.app");
  assert.equal(
    origin(["korsten-git-main-netzian-loq.vercel.app"]),
    "https://korsten-git-main-netzian-loq.vercel.app",
  );
});

test("an existing scheme is preserved, not double-prefixed", () => {
  assert.equal(origin(["HTTPS://Upper.Example"]), "https://upper.example");
  assert.equal(origin(["http://plain.example"]), "http://plain.example");
});

test("unparseable values fall through instead of throwing", () => {
  assert.doesNotThrow(() => resolveSiteOrigin(["http://"]));
  assert.equal(origin(["http://"]), LOCAL_ORIGIN);
  assert.equal(origin([":::"]), LOCAL_ORIGIN);
  assert.equal(origin(["not a url"]), LOCAL_ORIGIN);
  assert.equal(origin(["///"]), LOCAL_ORIGIN);
  assert.equal(origin(["http://", "https://good.example"]), "https://good.example");
});

test("no candidates at all still yields a usable origin", () => {
  assert.equal(origin([]), LOCAL_ORIGIN);
  assert.equal(origin([undefined, undefined]), LOCAL_ORIGIN);
});

test("resolveSiteOrigin never throws for any candidate shape", () => {
  const nasty = ["", "   ", "http://", "https://", "///", "not a url", ":::", "\n", undefined];
  for (const value of nasty) {
    assert.doesNotThrow(
      () => resolveSiteOrigin([value]),
      `threw on ${JSON.stringify(value)}`,
    );
  }
});

test("the result is a URL usable as metadataBase", () => {
  const url = resolveSiteOrigin(["korsten.vercel.app"]);
  assert.ok(url instanceof URL);
  assert.equal(new URL("/icons/icon-192.png", url).href,
    "https://korsten.vercel.app/icons/icon-192.png");
});
