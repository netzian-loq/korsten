"use client";

import { Plus, Search, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CLIENT_STATUSES,
  clientProgress,
  filterClients,
  type Client,
  type StatusFilter,
} from "@/lib/clients";
import { getPreset } from "@/lib/presets";

import { NewClientForm } from "./new-client-form";

const FILTERS: StatusFilter[] = ["All", ...CLIENT_STATUSES];

const STATUS_DOT: Record<string, string> = {
  Active: "bg-accent-400",
  "Under Contract": "bg-alert-400",
  Closed: "bg-mist-500",
};

type Props = {
  clients: Client[];
  selectedId: string | null;
  onSelect: (clientId: string) => void;
};

export function ClientDirectory({ clients, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [adding, setAdding] = useState(false);

  const visible = useMemo(
    () => filterClients(clients, filter, query),
    [clients, filter, query],
  );

  return (
    <div className="flex flex-col gap-3">
      {adding ? (
        <NewClientForm
          onCreated={(clientId) => {
            setAdding(false);
            onSelect(clientId);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center justify-center gap-2 rounded-tile bg-accent-500 px-3 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-400"
        >
          <Plus className="size-4" strokeWidth={2.75} aria-hidden />
          Add client
        </button>
      )}

      <div role="search" className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-mist-500"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search clients"
          aria-label="Search clients"
          className="w-full rounded-full border border-navy-700 bg-navy-850/70 py-2 pl-9 pr-9 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-mist-400 transition-colors hover:bg-navy-700 hover:text-mist-100"
          >
            <X className="size-3" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>

      <div
        role="group"
        aria-label="Filter by status"
        className="flex gap-1 rounded-full border border-navy-700 bg-navy-850/70 p-1 no-select"
      >
        {FILTERS.map((option) => {
          const count =
            option === "All"
              ? clients.length
              : clients.filter((client) => client.status === option).length;

          return (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`flex-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[0.6875rem] font-semibold transition-colors ${
                filter === option
                  ? "bg-mist-100 text-navy-900"
                  : "text-mist-400 hover:text-mist-100"
              }`}
            >
              {option === "Under Contract" ? "Contract" : option}{" "}
              <span data-numeric className="opacity-60">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {visible.map((client) => {
            const progress = clientProgress(client, getPreset(client.presetId));
            const selected = client.id === selectedId;

            return (
              <li key={client.id}>
                <button
                  type="button"
                  onClick={() => onSelect(client.id)}
                  aria-current={selected ? "true" : undefined}
                  className={`w-full rounded-tile border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-accent-500/60 bg-accent-500/10"
                      : "border-navy-700/70 hover:border-navy-600 hover:bg-navy-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[client.status]}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-mist-100">
                      {client.name}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center justify-between gap-2 pl-3.5 text-xs text-mist-500">
                    <span>
                      {client.type} · {client.status}
                    </span>
                    <span data-numeric>
                      {client.presetId
                        ? `${progress.done}/${progress.total}`
                        : "No preset"}
                    </span>
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-tile border border-dashed border-navy-700 px-4 py-8 text-center text-sm text-mist-500">
          {clients.length === 0 ? (
            <>
              <Users
                className="mx-auto mb-2 size-5 text-mist-500"
                strokeWidth={1.75}
                aria-hidden
              />
              No clients yet.
            </>
          ) : (
            "Nothing matches that search."
          )}
        </p>
      )}
    </div>
  );
}
