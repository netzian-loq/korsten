"use client";

import {
  Building2,
  CalendarClock,
  FileText,
  House,
  Scale,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Route = "/" | "/clients" | "/offers";

type NavItem = {
  label: string;
  icon: LucideIcon;
  /** `null` until the section exists — rendered inert rather than as a dead link. */
  href: Route | null;
};

const NAV: NavItem[] = [
  { label: "Today", icon: House, href: "/" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Offers", icon: Scale, href: "/offers" },
  { label: "Schedule", icon: CalendarClock, href: null },
  { label: "Listings", icon: Building2, href: null },
  { label: "Documents", icon: FileText, href: null },
];

/**
 * Six items overflow a 375px bottom bar, and an inert item is no use on a
 * phone anyway — so the small-screen bar carries only the routes that exist.
 */
const ROUTED = NAV.filter(
  (item): item is NavItem & { href: Route } => item.href !== null,
);

const ITEM_BASE =
  "relative grid place-items-center rounded-tile transition-colors";
const ITEM_LINK = "text-mist-400 hover:bg-navy-700/70 hover:text-mist-100";
const ITEM_CURRENT = "bg-accent-500/15 text-accent-300 hover:bg-accent-500/20";
const ITEM_INERT = "text-mist-500/45";

const TOOLTIP =
  "pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-md border border-navy-600 bg-navy-950 px-2.5 py-1.5 text-xs font-medium text-mist-100 opacity-0 shadow-float transition-opacity duration-150 group-hover:opacity-100";

export function NavRail() {
  const pathname = usePathname();

  const railItem = (item: NavItem, size: string) => {
    const { label, icon: Icon, href } = item;
    const current = href !== null && pathname === href;
    const icon = <Icon className="size-5" strokeWidth={1.75} aria-hidden />;

    if (href === null) {
      return (
        <span
          key={label}
          aria-disabled="true"
          className={`group ${size} ${ITEM_BASE} ${ITEM_INERT}`}
        >
          {icon}
          <span className="sr-only">{label}, not built yet</span>
          <span aria-hidden className={TOOLTIP}>
            {label} · not built yet
          </span>
        </span>
      );
    }

    return (
      <Link
        key={label}
        href={href}
        aria-current={current ? "page" : undefined}
        className={`group ${size} ${ITEM_BASE} ${current ? ITEM_CURRENT : ITEM_LINK}`}
      >
        {icon}
        <span className="sr-only">{label}</span>
        <span aria-hidden className={TOOLTIP}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Tablet and up: a quiet vertical rail that stays put while you scroll. */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col items-center gap-1 border-r border-navy-700/80 bg-navy-850/60 px-3 pb-6 pl-safe pt-safe backdrop-blur-sm no-select md:flex">
        <Link
          href="/"
          className="mb-4 mt-5 grid size-11 place-items-center rounded-tile bg-accent-500/15 text-accent-300"
          aria-label="Realtor Suite, home"
        >
          <House className="size-5" strokeWidth={2.25} aria-hidden />
        </Link>

        <nav aria-label="Sections" className="flex flex-col gap-1">
          {NAV.map((item) => railItem(item, "size-12"))}
        </nav>

        <span
          aria-disabled="true"
          className={`mt-auto size-12 ${ITEM_BASE} ${ITEM_INERT}`}
        >
          <Settings className="size-5" strokeWidth={1.75} aria-hidden />
          <span className="sr-only">Settings, not built yet</span>
        </span>
      </aside>

      {/* Phone: the same sections, thumb-reachable, clear of the home indicator. */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-navy-700/80 bg-navy-900/85 px-2 pb-safe pt-2 backdrop-blur-lg no-select md:hidden"
      >
        {ROUTED.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`min-w-16 flex-1 gap-1 px-1 pb-2 pt-1.5 ${ITEM_BASE} ${
              pathname === href ? ITEM_CURRENT : ITEM_LINK
            }`}
          >
            <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            <span className="text-[0.6875rem] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
