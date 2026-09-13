"use client";

import { useSyncExternalStore } from "react";

import {
  createClient,
  type Client,
  type NewClient,
  type TaskState,
} from "./clients";

/**
 * The client roster, kept in localStorage.
 *
 * Read through useSyncExternalStore rather than an effect so the server and
 * client first render agree, and so every mounted component re-renders on a
 * write. Records only — file bytes live in file-store.ts.
 */

const KEY = "realtor-suite:clients:v1";

/** Stable identity for the server render; React requires a steady reference. */
const EMPTY: Client[] = [];

let cache: Client[] | null = null;
const listeners = new Set<() => void>();

function read(): Client[] {
  if (cache) return cache;

  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as Client[]) : [];
  } catch {
    // Private mode, cleared storage, or corrupt JSON — start empty rather
    // than taking the page down.
    cache = [];
  }

  return cache;
}

function write(next: Client[]) {
  cache = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private mode: the change still applies for this session.
  }

  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  // Another tab wrote; drop the cache so the next read picks it up.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    onStoreChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerSnapshot = () => EMPTY;

export function useClients(): Client[] {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export function addClient(input: NewClient): Client {
  const client = createClient(
    input,
    crypto.randomUUID(),
    new Date().toISOString(),
  );
  write([...read(), client]);
  return client;
}

export function updateClient(id: string, patch: Partial<Client>) {
  write(read().map((client) => (client.id === id ? { ...client, ...patch } : client)));
}

export function removeClient(id: string) {
  write(read().filter((client) => client.id !== id));
}

/** Assigns a preset, turning a blank client into an active file. */
export function assignPreset(id: string, presetId: string) {
  updateClient(id, { presetId, tasks: {} });
}

/** Merges a patch into one task's state, leaving the rest untouched. */
export function setTaskState(
  clientId: string,
  taskId: string,
  patch: Partial<TaskState>,
) {
  write(
    read().map((client) =>
      client.id === clientId
        ? {
            ...client,
            tasks: {
              ...client.tasks,
              [taskId]: { ...client.tasks[taskId], ...patch },
            },
          }
        : client,
    ),
  );
}
