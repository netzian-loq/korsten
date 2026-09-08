"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ClipboardList,
  DoorOpen,
  Gavel,
  Handshake,
  MapPin,
  PenLine,
  type LucideIcon,
} from "lucide-react";

import { useNow } from "./use-now";

type Tone = "neutral" | "good" | "alert";

type Appointment = {
  /** 24-hour "HH:MM". */
  at: string;
  title: string;
  where: string;
  icon: LucideIcon;
  chip?: { label: string; tone: Tone };
};

const TODAY: Appointment[] = [
  {
    at: "08:30",
    title: "Pull comps for 44 Alder",
    where: "Ridgeview · 6 sales in 90 days",
    icon: ClipboardList,
    chip: { label: "30 min", tone: "neutral" },
  },
  {
    at: "09:30",
    title: "Showing — 44 Alder Ct",
    where: "The Okonkwos, buyers",
    icon: DoorOpen,
    chip: { label: "Confirmed", tone: "good" },
  },
  {
    at: "11:00",
    title: "Listing appointment — 1820 Hale St",
    where: "Dana Whitfield, seller",
    icon: Handshake,
  },
  {
    at: "13:15",
    title: "Walkthrough — 7 Quarry Ln",
    where: "Stager meets you on site",
    icon: DoorOpen,
  },
  {
    at: "16:00",
    title: "Offer deadline — 302 Bellwether",
    where: "3 offers in, 1 outstanding",
    icon: Gavel,
    chip: { label: "Counter by 4:00", tone: "alert" },
  },
  {
    at: "17:30",
    title: "Send escrow packet — 91 Sumac",
    where: "Buyer disclosure still unsigned",
    icon: PenLine,
    chip: { label: "Blocked", tone: "alert" },
  },
];

const CHIP: Record<Tone, string> = {
  neutral: "bg-card-sunken text-ink-500",
  good: "bg-good-500/12 text-good-700",
  alert: "bg-alert-500/15 text-alert-700",
};

const minutesOf = (at: string) => {
  const [h, m] = at.split(":").map(Number);
  return h * 60 + m;
};

/** Formatted by hand, not by locale, so server and client agree. */
const clockLabel = (minutes: number) => {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
};

export function DaySpine() {
  const now = useNow();
  const reduceMotion = useReducedMotion();

  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const nextIndex =
    nowMinutes === null
      ? -1
      : (() => {
          const i = TODAY.findIndex((a) => minutesOf(a.at) > nowMinutes);
          return i === -1 ? TODAY.length : i;
        })();

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
  };

  const row: Variants = reduceMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
        },
      };

  return (
    <motion.ol
      variants={container}
      initial="hidden"
      animate="show"
      className="relative"
    >
      {/* The spine itself. Offsets track the time column + gutter widths below. */}
      <span
        aria-hidden
        className="absolute bottom-5 left-[4.75rem] top-5 w-px bg-navy-700 md:left-[5.5rem]"
      />

      {TODAY.map((item, index) => {
        const past = nextIndex !== -1 && index < nextIndex;
        const isNext = index === nextIndex;
        const Icon = item.icon;

        return (
          <motion.li key={item.at} variants={row} className="relative">
            {index === nextIndex && nowMinutes !== null && (
              <NowMarker minutes={nowMinutes} />
            )}

            <div className="flex items-start gap-3 pb-3 md:gap-4">
              <time
                dateTime={item.at}
                className={`w-14 shrink-0 pt-4 text-right font-mono text-xs font-medium tabular-nums md:w-16 ${
                  past ? "text-mist-500" : "text-mist-400"
                }`}
              >
                {clockLabel(minutesOf(item.at))}
              </time>

              <span className="flex w-4 shrink-0 justify-center">
                <span
                  aria-hidden
                  className={`mt-[1.375rem] size-2.5 rounded-full ring-4 ring-navy-900 ${
                    isNext
                      ? "bg-accent-400 shadow-glow"
                      : past
                        ? "bg-navy-600"
                        : "bg-navy-500"
                  }`}
                />
              </span>

              <article
                className={`card min-w-0 flex-1 p-4 transition-opacity md:p-5 ${
                  past ? "card-quiet opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-tile bg-card-sunken text-ink-500">
                    <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-title text-ink-900">
                      {item.title}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                      <MapPin className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{item.where}</span>
                    </p>
                  </div>

                  {item.chip && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${CHIP[item.chip.tone]}`}
                    >
                      {item.chip.label}
                    </span>
                  )}
                </div>
              </article>
            </div>
          </motion.li>
        );
      })}

      {/* Everything on the list has started. Close the day out. */}
      {nextIndex === TODAY.length && nowMinutes !== null && (
        <NowMarker minutes={nowMinutes} />
      )}
    </motion.ol>
  );
}

function NowMarker({ minutes }: { minutes: number }) {
  return (
    <div className="flex items-center gap-3 pb-3 md:gap-4">
      <span className="w-14 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-accent-300 md:w-16">
        {clockLabel(minutes)}
      </span>
      <span className="flex w-4 shrink-0 justify-center">
        <span
          aria-hidden
          className="size-2 rounded-full bg-accent-400 shadow-glow"
        />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span
          aria-hidden
          className="h-px flex-1 bg-gradient-to-r from-accent-400/70 to-accent-400/0"
        />
        <span className="text-eyebrow uppercase text-accent-400">Now</span>
        <span aria-hidden className="h-px w-6 bg-accent-400/25" />
      </span>
    </div>
  );
}
