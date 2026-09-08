"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Database,
  HardDrive,
  Search,
  SearchX,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  budgetDomain,
  CLIENT_STATUSES,
  filterClients,
  saveClient,
  summarizeActiveDeals,
  type Client,
  type ClientFilter,
  type ClientSource,
} from "@/lib/clients";
import { formatMoney } from "@/lib/format";

import { ClientRow } from "./client-row";
import { QuickEditPanel } from "./quick-edit-panel";
import { STATUS_STYLE } from "./status-styles";

type Props = {
  initialClients: Client[];
  source: ClientSource;
  loadError?: string;
};

export function ClientsDashboard({
  initialClients,
  source,
  loadError,
}: Props) {
  const reduceMotion = useReducedMotion();

  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  // Where focus came from, so closing the panel puts it back on that row.
  const triggerRef = useRef<HTMLElement | null>(null);

  const {
    deals: activeDeals,
    inPlay,
    countsByStatus: counts,
  } = useMemo(() => summarizeActiveDeals(clients), [clients]);

  const domain = useMemo(() => budgetDomain(clients), [clients]);

  const visible = useMemo(
    () => filterClients(clients, filter, query),
    [clients, filter, query],
  );

  // "/" jumps to search, the way it does in every tool an agent already uses.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const editing = editingId
    ? (clients.find((client) => client.id === editingId) ?? null)
    : null;

  const openEditor = (id: string, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setEditingId(id);
  };

  const closeEditor = useCallback(() => {
    setEditingId(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  }, []);

  /** Applies the edit immediately, then rolls that one client back if the write fails. */
  const handleSave = useCallback(
    async (next: Client) => {
      const original = clients.find((client) => client.id === next.id);

      setClients((current) =>
        current.map((client) => (client.id === next.id ? next : client)),
      );

      const result = await saveClient(next);

      if (!result.ok) {
        if (original) {
          setClients((current) =>
            current.map((client) =>
              client.id === next.id ? original : client,
            ),
          );
        }
        return { ok: false, message: result.message };
      }

      return { ok: true };
    },
    [clients],
  );

  const activeFilterOn = filter === "active";

  const TABS: { key: ClientFilter; label: string; count: number; pill: string }[] = [
    {
      key: "all",
      label: "All",
      count: clients.length,
      pill: "bg-mist-100 text-navy-900",
    },
    ...CLIENT_STATUSES.map((status) => ({
      key: status as ClientFilter,
      label: status,
      count: counts[status],
      pill: STATUS_STYLE[status].tab,
    })),
  ];

  return (
    <>
      <header>
        <p className="text-eyebrow font-mono uppercase text-accent-400">
          Clients
        </p>

        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-display text-mist-50">
              <span data-numeric>{clients.length}</span> names,{" "}
              <span data-numeric>{activeDeals.length}</span> live.
            </h1>
            <p className="mt-2 max-w-md text-[0.9375rem] text-mist-400">
              Tap any client to change their budget, neighbourhoods, style, or
              stage.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium no-select ${
              source === "supabase"
                ? "border-good-500/30 bg-good-500/10 text-good-400"
                : "border-navy-600 bg-navy-800/60 text-mist-400"
            }`}
          >
            {source === "supabase" ? (
              <Database className="size-3.5" strokeWidth={2.25} aria-hidden />
            ) : (
              <HardDrive className="size-3.5" strokeWidth={2.25} aria-hidden />
            )}
            {source === "supabase"
              ? "Saving to Supabase"
              : "Seed data · edits stay in this tab"}
          </span>
        </div>

        {loadError && (
          <p
            role="alert"
            className="mt-4 rounded-tile border border-alert-500/30 bg-alert-500/10 px-4 py-3 text-sm text-alert-300"
          >
            Supabase is configured but the read failed, so this is seed data.{" "}
            <span className="font-mono text-xs text-alert-400">
              {loadError}
            </span>
          </p>
        )}
      </header>

      {/* Active deals: the headline number, and a filter for it. */}
      <button
        type="button"
        onClick={() => setFilter(activeFilterOn ? "all" : "active")}
        aria-pressed={activeFilterOn}
        className={`panel mt-7 flex w-full flex-wrap items-center gap-x-5 gap-y-4 px-5 py-4 text-left transition-colors ${
          activeFilterOn
            ? "border-accent-500/60 bg-accent-500/10"
            : "hover:border-navy-600"
        }`}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-tile bg-accent-500/15 text-accent-300">
          <TrendingUp className="size-5" strokeWidth={2} aria-hidden />
        </span>

        <span className="min-w-0">
          <span className="block text-eyebrow uppercase text-mist-500">
            Active deals
          </span>
          <span className="mt-1.5 flex items-baseline gap-2">
            <span data-numeric className="text-metric text-mist-50">
              {activeDeals.length}
            </span>
            <span data-numeric className="text-sm text-mist-400">
              of {clients.length}
            </span>
          </span>
        </span>

        <span className="flex items-center gap-4 text-xs text-mist-400">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-accent-400"
            />
            <span data-numeric>{counts.Viewing}</span> Viewing
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-good-400" />
            <span data-numeric>{counts["Under Contract"]}</span> Under Contract
          </span>
        </span>

        <span className="ml-auto text-right">
          <span
            data-numeric
            className="block font-mono text-sm font-semibold text-mist-100"
          >
            {formatMoney(inPlay.min)} – {formatMoney(inPlay.max)}
          </span>
          <span className="block text-xs text-mist-500">
            {activeFilterOn ? "Showing these only" : "In play"}
          </span>
        </span>
      </button>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="search" className="relative lg:max-w-sm lg:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-mist-500"
          />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, neighbourhood, style"
            aria-label="Search clients"
            className="w-full rounded-full border border-navy-700 bg-navy-850/70 py-2.5 pl-10 pr-11 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-mist-400 transition-colors hover:bg-navy-700 hover:text-mist-100"
            >
              <X className="size-3.5" strokeWidth={2.5} aria-hidden />
            </button>
          ) : (
            <kbd
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-navy-600 px-1.5 py-0.5 font-mono text-[0.625rem] text-mist-500 lg:block"
            >
              /
            </kbd>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter by status"
          className="flex gap-1 self-start rounded-full border border-navy-700 bg-navy-850/70 p-1 no-select"
        >
          {TABS.map((tab) => {
            const selected = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                aria-pressed={selected}
                className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  selected ? "" : "text-mist-400 hover:text-mist-100"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="filter-pill"
                    aria-hidden
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", damping: 30, stiffness: 400 }
                    }
                    className={`absolute inset-0 rounded-full ${tab.pill}`}
                  />
                )}
                <span
                  className={`relative whitespace-nowrap ${selected ? tab.pill.split(" ").find((c) => c.startsWith("text-")) : ""}`}
                >
                  {tab.label}{" "}
                  <span data-numeric className="opacity-55">
                    {tab.count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length > 0 ? (
        <>
          {/* Legend for the shared axis. Widths mirror ClientRow's bar row. */}
          <div className="mb-2.5 mt-6 flex items-center gap-3 px-4 md:px-5">
            <span aria-hidden className="w-[3.375rem] shrink-0" />
            <span className="flex min-w-0 flex-1 items-baseline justify-between font-mono text-[0.625rem] text-mist-500">
              <span data-numeric>{formatMoney(domain.min)}</span>
              <span className="hidden uppercase tracking-wider sm:inline">
                Budget axis, shared by every row
              </span>
              <span data-numeric>{formatMoney(domain.max)}</span>
            </span>
            <span aria-hidden className="w-28 shrink-0" />
          </div>

          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {visible.map((client) => (
                <motion.li
                  key={client.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ClientRow
                    client={client}
                    domain={domain}
                    onEdit={(trigger) => openEditor(client.id, trigger)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      ) : (
        <div className="panel mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <SearchX className="size-7 text-mist-500" strokeWidth={1.75} aria-hidden />
          <p className="text-mist-200">
            {query
              ? `No clients match “${query}”.`
              : "No clients at this stage yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="rounded-full bg-navy-700 px-4 py-2 text-xs font-semibold text-mist-100 transition-colors hover:bg-navy-600"
          >
            Show all clients
          </button>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <QuickEditPanel
            key={editing.id}
            client={editing}
            onClose={closeEditor}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </>
  );
}
