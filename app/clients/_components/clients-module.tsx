"use client";

import { FolderOpen, ListChecks, MousePointerClick } from "lucide-react";
import { useState } from "react";

import { useClients } from "@/lib/client-store";

import { ClientDirectory } from "./client-directory";
import { ClientWorkspace } from "./client-workspace";

/**
 * Owns which client is open and nothing else. The directory and the workspace
 * read and write the store directly, so this module can be dropped into another
 * section of the app without carrying state plumbing with it.
 */
export function ClientsModule() {
  const clients = useClients();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Derived rather than synced in an effect: if the chosen client is gone (or
  // none was chosen yet), fall back to the first one.
  const selected =
    clients.find((client) => client.id === selectedId) ?? clients[0] ?? null;

  return (
    <div className="mt-7 grid grid-cols-1 items-start gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <ClientDirectory
        clients={clients}
        selectedId={selected?.id ?? null}
        onSelect={setSelectedId}
      />

      {selected ? (
        <ClientWorkspace
          key={selected.id}
          client={selected}
          onRemoved={() => setSelectedId(null)}
        />
      ) : (
        <GettingStarted />
      )}
    </div>
  );
}

/** What fills the right-hand pane before the first client exists. */
function GettingStarted() {
  const steps = [
    {
      icon: MousePointerClick,
      title: "Add a client",
      body: "Name them, mark them as a buyer or a seller, and add contact details if you have them.",
    },
    {
      icon: FolderOpen,
      title: "Pick a preset",
      body: "Their file opens blank. Choose a preset and it fills with the steps for that kind of client.",
    },
    {
      icon: ListChecks,
      title: "Work the checklist",
      body: "Each step says what goes there. Click to type a detail or attach a document, and the progress bar keeps count.",
    },
  ];

  return (
    <div className="card p-5 md:p-6">
      <h2 className="text-title text-ink-900">Start here</h2>
      <p className="mt-1 text-sm text-ink-500">
        Three steps, and you never face a blank screen.
      </p>

      <ol className="mt-5 flex flex-col gap-4">
        {steps.map(({ icon: Icon, title, body }, index) => (
          <li key={title} className="flex gap-3.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-tile bg-card-sunken text-ink-500"
            >
              <Icon className="size-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">
                <span className="mr-1.5 font-mono text-xs text-ink-400">
                  {index + 1}
                </span>
                {title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-500">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
