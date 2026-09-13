"use client";

import { ChevronRight, FileText, FolderOpen, ListChecks } from "lucide-react";

import { assignPreset } from "@/lib/client-store";
import type { Client } from "@/lib/clients";
import { PRESETS, presetsForType, presetTasks } from "@/lib/presets";

/**
 * The blank-file state: a client exists but has no workflow yet. Rather than an
 * empty screen, the agent picks a preset and the file fills with its steps.
 */
export function PresetPicker({ client }: { client: Client }) {
  const matching = presetsForType(client.type);
  const options = matching.length > 0 ? matching : PRESETS;

  return (
    <div className="card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-tile bg-accent-500/12 text-accent-600"
        >
          <FolderOpen className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-title text-ink-900">Choose a starting point</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            {client.name}&rsquo;s file is blank. Pick a preset and it fills with
            the steps for a {client.type.toLowerCase()} — each one telling you
            what goes where. You can switch preset later.
          </p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {options.map((preset) => {
          const tasks = presetTasks(preset);
          const documents = tasks.filter((task) => task.kind === "document").length;

          return (
            <li key={preset.id}>
              <button
                type="button"
                onClick={() => assignPreset(client.id, preset.id)}
                className="group flex w-full items-center gap-3 rounded-tile border border-card-edge p-3.5 text-left transition-colors hover:border-accent-400 hover:bg-card-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{preset.name}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{preset.summary}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3.5" strokeWidth={2} aria-hidden />
                      {tasks.length} steps
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3.5" strokeWidth={2} aria-hidden />
                      {documents} documents
                    </span>
                    <span className="rounded-full bg-card-sunken px-2 py-0.5 font-medium text-ink-500">
                      {preset.clientType}
                    </span>
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
