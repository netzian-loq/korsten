"use client";

import {
  Check,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  LoaderCircle,
  Paperclip,
  PencilLine,
  Send,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { setTaskState } from "@/lib/client-store";
import type { DocumentStatus, TaskState } from "@/lib/clients";
import { deleteFile, downloadDocument, putFile } from "@/lib/file-store";
import type { PresetTask } from "@/lib/presets";

const STATUS_CHIP: Record<DocumentStatus, string> = {
  Attached: "bg-card-sunken text-ink-500",
  "In review": "bg-alert-500/16 text-alert-700",
  Signed: "bg-good-500/14 text-good-700",
};

const ACTION =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const ACTION_QUIET = `${ACTION} bg-card-sunken text-ink-700 hover:bg-mist-200`;
const ACTION_PRIMARY = `${ACTION} bg-navy-900 text-mist-50 hover:bg-navy-800`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

type Props = {
  clientId: string;
  task: PresetTask;
  state: TaskState | undefined;
  complete: boolean;
  /** 1-based position across the whole preset, for "Step 3". */
  step: number;
};

export function TaskRow({ clientId, task, state, complete, step }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const document_ = state?.document;

  async function attach(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fileId = await putFile(file);
      setTaskState(clientId, task.id, {
        document: {
          fileId,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          attachedAt: new Date().toISOString(),
          status: "Attached",
        },
      });
    } catch {
      setError("Could not save that file on this device. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function detach() {
    if (!document_) return;
    setBusy(true);
    try {
      await deleteFile(document_.fileId);
    } catch {
      // The record still clears; a stray blob is harmless.
    }
    setTaskState(clientId, task.id, { document: undefined });
    setBusy(false);
  }

  const setStatus = (status: DocumentStatus) => {
    if (!document_) return;
    setTaskState(clientId, task.id, { document: { ...document_, status } });
  };

  function saveField() {
    setTaskState(clientId, task.id, { value: draft.trim() });
    setEditing(false);
  }

  return (
    <li className="flex gap-3 py-3.5">
      <span
        aria-hidden
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
          complete
            ? "bg-good-500 text-white"
            : "bg-card-sunken text-ink-400 ring-1 ring-card-edge ring-inset"
        }`}
      >
        {complete ? <Check className="size-3.5" strokeWidth={3} /> : step}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900">
          <span className="sr-only">
            Step {step}, {complete ? "complete" : "not started"}:{" "}
          </span>
          {task.label}
        </p>
        {/* The instruction that tells the agent what goes here. */}
        <p className="mt-0.5 text-xs leading-relaxed text-ink-500" title={task.hint}>
          {task.hint}
        </p>

        {task.kind === "field" && (
          <div className="mt-2.5">
            {editing ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveField();
                    if (event.key === "Escape") {
                      setDraft(state?.value ?? "");
                      setEditing(false);
                    }
                  }}
                  placeholder={task.placeholder}
                  aria-label={task.label}
                  className="min-w-0 flex-1 rounded-md border border-card-edge bg-card-muted px-2.5 py-1.5 text-sm text-ink-900 transition-colors focus:border-accent-400 focus:bg-card"
                />
                <button type="button" onClick={saveField} className={ACTION_PRIMARY}>
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(state?.value ?? "");
                  setEditing(true);
                }}
                className="group flex w-full items-center gap-2 rounded-md border border-dashed border-card-edge px-2.5 py-1.5 text-left text-sm transition-colors hover:border-accent-400 hover:bg-card-muted"
              >
                <PencilLine
                  className="size-3.5 shrink-0 text-ink-400"
                  strokeWidth={2}
                  aria-hidden
                />
                <span
                  className={`min-w-0 flex-1 truncate ${
                    state?.value ? "text-ink-900" : "text-ink-400"
                  }`}
                >
                  {state?.value || task.placeholder || "Click to add"}
                </span>
              </button>
            )}
          </div>
        )}

        {task.kind === "document" && (
          <div className="mt-2.5">
            {document_ ? (
              <div className="rounded-md border border-card-edge bg-card-muted p-2.5">
                <div className="flex items-start gap-2">
                  <FileText
                    className="mt-0.5 size-4 shrink-0 text-ink-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {document_.name}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatBytes(document_.size)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${STATUS_CHIP[document_.status]}`}
                  >
                    {document_.status}
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {document_.status !== "In review" && document_.status !== "Signed" && (
                    <button
                      type="button"
                      onClick={() => setStatus("In review")}
                      className={ACTION_QUIET}
                    >
                      <Send className="size-3.5" strokeWidth={2.25} aria-hidden />
                      Send for Review
                    </button>
                  )}
                  {document_.status !== "Signed" && (
                    <button
                      type="button"
                      onClick={() => setStatus("Signed")}
                      className={ACTION_QUIET}
                    >
                      <CheckCircle2 className="size-3.5" strokeWidth={2.25} aria-hidden />
                      Mark as Signed
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void downloadDocument(document_)}
                    className={ACTION_QUIET}
                  >
                    <Download className="size-3.5" strokeWidth={2.25} aria-hidden />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void detach()}
                    disabled={busy}
                    aria-label={`Remove ${document_.name}`}
                    className={`${ACTION_QUIET} text-ink-500`}
                  >
                    <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-card-edge px-2.5 py-2 text-sm transition-colors hover:border-accent-400 hover:bg-card-muted ${
                  busy ? "pointer-events-none opacity-60" : ""
                }`}
              >
                <input
                  type="file"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    // Clear the input so re-picking the same file still fires.
                    event.target.value = "";
                    if (file) void attach(file);
                  }}
                />
                {busy ? (
                  <LoaderCircle
                    className="size-3.5 shrink-0 animate-spin text-ink-400"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : (
                  <Paperclip
                    className="size-3.5 shrink-0 text-ink-400"
                    strokeWidth={2}
                    aria-hidden
                  />
                )}
                <span className="text-ink-400">
                  {busy ? "Saving…" : "Click to Attach"}
                </span>
                {task.requiresSignature && !busy && (
                  <span className="ml-auto text-[0.625rem] font-semibold uppercase tracking-wide text-alert-700">
                    Signature needed
                  </span>
                )}
              </label>
            )}

            {error && (
              <p role="alert" className="mt-1.5 text-xs text-alert-700">
                {error}
              </p>
            )}
          </div>
        )}

        {task.kind === "action" && (
          <button
            type="button"
            onClick={() => setTaskState(clientId, task.id, { checked: !state?.checked })}
            aria-pressed={state?.checked === true}
            className="mt-2.5 inline-flex items-center gap-2 rounded-md border border-card-edge px-2.5 py-1.5 text-sm text-ink-700 transition-colors hover:bg-card-muted"
          >
            {state?.checked ? (
              <CheckCircle2 className="size-4 text-good-600" strokeWidth={2.25} aria-hidden />
            ) : (
              <Circle className="size-4 text-ink-400" strokeWidth={2} aria-hidden />
            )}
            {state?.checked ? "Done" : "Mark done"}
          </button>
        )}
      </div>
    </li>
  );
}
