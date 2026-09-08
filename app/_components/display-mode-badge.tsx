"use client";

import { Maximize2, SquareArrowOutUpRight } from "lucide-react";
import { useEffect, useState } from "react";

/** iOS marks Home Screen apps here instead of via the display-mode query. */
type IosNavigator = Navigator & { standalone?: boolean };

export function DisplayModeBadge() {
  const [standalone, setStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(display-mode: standalone)");
    const read = () =>
      setStandalone(
        query.matches || (navigator as IosNavigator).standalone === true,
      );

    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  if (standalone === null) return null;

  const Icon = standalone ? Maximize2 : SquareArrowOutUpRight;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium no-select ${
        standalone
          ? "border-good-500/30 bg-good-500/10 text-good-400"
          : "border-navy-600 bg-navy-800/60 text-mist-400"
      }`}
    >
      <Icon className="size-3.5" strokeWidth={2.25} aria-hidden />
      {standalone ? "Running full screen" : "Share → Add to Home Screen"}
    </span>
  );
}
