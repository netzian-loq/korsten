"use client";

import { useNow } from "./use-now";

const FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function LiveDate() {
  const now = useNow();

  return (
    <p className="text-eyebrow font-mono uppercase text-accent-400">
      {/* Reserve the line before mount so the heading below never jumps. */}
      {now ? FORMAT.format(now) : "\u00a0"}
    </p>
  );
}
