"use client";

import { Download, LoaderCircle, Mail, Phone, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { removeClient, updateClient } from "@/lib/client-store";
import {
  CLIENT_STATUSES,
  clientDocuments,
  clientProgress,
  isTaskComplete,
  type Client,
  type ClientStatus,
} from "@/lib/clients";
import { deleteFile, downloadAll } from "@/lib/file-store";
import { getPreset } from "@/lib/presets";

import { PresetPicker } from "./preset-picker";
import { TaskRow } from "./task-row";

const HEADER_ACTION =
  "inline-flex items-center gap-1.5 rounded-md border border-navy-700 px-2.5 py-1.5 text-xs font-semibold text-mist-300 transition-colors hover:bg-navy-800 hover:text-mist-100 disabled:cursor-not-allowed disabled:opacity-50";

export function ClientWorkspace({
  client,
  onRemoved,
}: {
  client: Client;
  onRemoved: () => void;
}) {
  const preset = getPreset(client.presetId);
  const progress = clientProgress(client, preset);
  const documents = clientDocuments(client, preset);

  const [downloading, setDownloading] = useState(false);
  /** Two-step confirm, so one stray tap cannot wipe a file. */
  const [confirming, setConfirming] = useState<"remove" | "preset" | null>(null);

  async function discardFiles() {
    for (const { document } of documents) {
      try {
        await deleteFile(document.fileId);
      } catch {
        // A stray blob is harmless; the record is what matters.
      }
    }
  }

  async function handleRemoveClient() {
    await discardFiles();
    removeClient(client.id);
    onRemoved();
  }

  async function handleChangePreset() {
    await discardFiles();
    updateClient(client.id, { presetId: null, tasks: {} });
    setConfirming(null);
  }

  async function handleDownloadAll() {
    setDownloading(true);
    await downloadAll(documents.map((entry) => entry.document));
    setDownloading(false);
  }

  // Continuous 1-based numbering across categories, computed up front. A
  // counter incremented inside the render would mutate across renders.
  const stepNumber = new Map(
    (preset?.categories.flatMap((category) => category.tasks) ?? []).map(
      (task, index) => [task.id, index + 1] as const,
    ),
  );

  return (
    <div className="min-w-0">
      <header className="panel px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-title text-mist-50">{client.name}</h2>
              <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-300">
                {client.type}
              </span>
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist-400">
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-mist-100"
                >
                  <Mail className="size-3.5" strokeWidth={2} aria-hidden />
                  {client.email}
                </a>
              ) : null}
              {client.phone ? (
                <a
                  href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-1.5 font-mono hover:text-mist-100"
                >
                  <Phone className="size-3.5" strokeWidth={2} aria-hidden />
                  {client.phone}
                </a>
              ) : null}
              {!client.email && !client.phone && (
                <span className="text-mist-500">No contact details yet</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="client-status">
              Status
            </label>
            <select
              id="client-status"
              value={client.status}
              onChange={(event) =>
                updateClient(client.id, {
                  status: event.target.value as ClientStatus,
                })
              }
              className="rounded-md border border-navy-700 bg-navy-850 px-2.5 py-1.5 text-xs font-semibold text-mist-100 transition-colors focus:border-accent-400"
            >
              {CLIENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void handleDownloadAll()}
              disabled={documents.length === 0 || downloading}
              title={
                documents.length === 0
                  ? "Attach a document first"
                  : `Download ${documents.length} file${documents.length === 1 ? "" : "s"}`
              }
              className={HEADER_ACTION}
            >
              {downloading ? (
                <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2.5} aria-hidden />
              ) : (
                <Download className="size-3.5" strokeWidth={2.25} aria-hidden />
              )}
              Download All
              {documents.length > 0 && ` (${documents.length})`}
            </button>

            {preset && (
              <button
                type="button"
                onClick={() =>
                  confirming === "preset"
                    ? void handleChangePreset()
                    : setConfirming("preset")
                }
                onBlur={() => setConfirming((c) => (c === "preset" ? null : c))}
                className={HEADER_ACTION}
              >
                <RefreshCw className="size-3.5" strokeWidth={2.25} aria-hidden />
                {confirming === "preset" ? "Clears progress — confirm" : "Change preset"}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                confirming === "remove" ? void handleRemoveClient() : setConfirming("remove")
              }
              onBlur={() => setConfirming((c) => (c === "remove" ? null : c))}
              className={`${HEADER_ACTION} ${confirming === "remove" ? "border-alert-500/50 text-alert-300" : ""}`}
            >
              <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
              {confirming === "remove" ? "Delete for good — confirm" : "Remove"}
            </button>
          </div>
        </div>

        {preset && (
          <div className="mt-4 border-t border-navy-700 pt-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm text-mist-200">
                <span data-numeric className="font-semibold text-mist-50">
                  {progress.done} of {progress.total}
                </span>{" "}
                tasks complete for {client.name}
              </p>
              <p className="text-xs text-mist-500">{preset.name}</p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progress.done}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-label={`${progress.done} of ${progress.total} tasks complete`}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-800"
            >
              <div
                className="h-full rounded-full bg-good-500 transition-[width] duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {preset ? (
        <div className="mt-4 flex flex-col gap-4">
          {preset.categories.map((category) => (
            <section key={category.id} className="card p-4 md:p-5">
              <h3 className="text-eyebrow uppercase text-ink-400">{category.name}</h3>
              <ul className="mt-1 divide-y divide-card-edge">
                {category.tasks.map((task) => {
                  const state = client.tasks[task.id];
                  return (
                    <TaskRow
                      key={task.id}
                      clientId={client.id}
                      task={task}
                      state={state}
                      complete={isTaskComplete(task, state)}
                      step={stepNumber.get(task.id) ?? 0}
                    />
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <PresetPicker client={client} />
        </div>
      )}
    </div>
  );
}
