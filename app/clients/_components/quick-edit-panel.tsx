"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, CircleAlert, LoaderCircle, Mail, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  CLIENT_STATUSES,
  HOUSE_STYLES,
  type Client,
  type ClientStatus,
} from "@/lib/clients";
import { formatBudgetRange } from "@/lib/format";

import { STATUS_STYLE } from "./status-styles";

const INPUT =
  "w-full rounded-tile border border-card-edge bg-card-muted px-3 py-2.5 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-accent-400 focus:bg-card";

const LABEL = "text-eyebrow uppercase text-ink-400";

/*
 * AnimatePresence keeps an outgoing panel mounted while it slides away, so two
 * panels can overlap for a few hundred milliseconds. Counting holders means the
 * last one out unlocks the page — an outgoing panel restoring the value it
 * captured would otherwise free the scroll while a new panel is still open.
 */
let scrollLockCount = 0;

function lockBodyScroll() {
  if (scrollLockCount === 0) document.body.style.overflow = "hidden";
  scrollLockCount += 1;

  return () => {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) document.body.style.overflow = "";
  };
}

type Props = {
  client: Client;
  onClose: () => void;
  /** Resolves once the edit has been persisted (or rejected). */
  onSave: (next: Client) => Promise<{ ok: boolean; message?: string }>;
};

export function QuickEditPanel({ client, onClose, onSave }: Props) {
  const reduceMotion = useReducedMotion();

  // The parent keys this component by client id, so a fresh client remounts it
  // and these initialisers run again. No syncing effect required.
  const [draft, setDraft] = useState<Client>(client);
  const [locationsText, setLocationsText] = useState(
    client.preferredLocations.join(", "),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Stop the roster behind the panel from scrolling under the finger.
  useEffect(lockBodyScroll, []);

  const budgetInvalid = draft.budgetMax > 0 && draft.budgetMax < draft.budgetMin;

  // A client may already carry a style that predates the preset list.
  const styleOptions = Array.from(
    new Set<string>([...HOUSE_STYLES, ...client.houseStyles]),
  ).sort();

  const toggleStyle = (style: string) =>
    setDraft((current) => ({
      ...current,
      houseStyles: current.houseStyles.includes(style)
        ? current.houseStyles.filter((s) => s !== style)
        : [...current.houseStyles, style],
    }));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || budgetInvalid) return;

    const next: Client = {
      ...draft,
      fullName: draft.fullName.trim(),
      phone: draft.phone.trim(),
      email: draft.email.trim(),
      preferredLocations: locationsText
        .split(",")
        .map((place) => place.trim())
        .filter(Boolean),
    };

    setSaving(true);
    setError(null);

    const result = await onSave(next);
    if (result.ok) {
      onClose();
      return;
    }

    setSaving(false);
    setError(result.message ?? "Could not save. Try again.");
  }

  const backdrop: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const panel: Variants = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { x: "100%" }, visible: { x: 0 } };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <motion.div
        variants={backdrop}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        aria-hidden
        className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm"
      />

      <motion.aside
        variants={panel}
        transition={{ type: "spring", damping: 32, stiffness: 340 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-edit-title"
        className="relative flex h-full w-full max-w-md flex-col bg-card shadow-float"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-card-edge px-5 pb-4 pt-safe">
          <div className="min-w-0 pt-5">
            <p className={LABEL}>Quick edit</p>
            <h2
              id="quick-edit-title"
              className="mt-1.5 truncate text-title text-ink-900"
            >
              {client.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick edit"
            className="mt-5 grid size-9 shrink-0 place-items-center rounded-tile text-ink-500 transition-colors hover:bg-card-sunken hover:text-ink-900"
          >
            <X className="size-4.5" strokeWidth={2} aria-hidden />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <label className="block">
              <span className={LABEL}>Full name</span>
              <input
                ref={firstFieldRef}
                value={draft.fullName}
                onChange={(event) =>
                  setDraft((c) => ({ ...c, fullName: event.target.value }))
                }
                required
                className={`mt-2 ${INPUT}`}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Phone</span>
                <input
                  type="tel"
                  inputMode="tel"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, phone: event.target.value }))
                  }
                  placeholder="(503) 555-0100"
                  className={`mt-2 ${INPUT}`}
                />
              </label>

              <label className="block">
                <span className={LABEL}>Email</span>
                <input
                  type="email"
                  inputMode="email"
                  value={draft.email}
                  onChange={(event) =>
                    setDraft((c) => ({ ...c, email: event.target.value }))
                  }
                  placeholder="name@example.com"
                  className={`mt-2 ${INPUT}`}
                />
              </label>
            </div>

            {(client.phone || client.email) && (
              <div className="flex flex-wrap gap-2">
                {client.phone && (
                  <a
                    href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-full bg-card-sunken px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-mist-200"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    Call
                  </a>
                )}
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-2 rounded-full bg-card-sunken px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:bg-mist-200"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    Email
                  </a>
                )}
              </div>
            )}

            <fieldset>
              <legend className={LABEL}>Target budget range</legend>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5000}
                  value={draft.budgetMin || ""}
                  onChange={(event) =>
                    setDraft((c) => ({
                      ...c,
                      budgetMin: Number(event.target.value) || 0,
                    }))
                  }
                  aria-label="Minimum budget"
                  placeholder="425000"
                  className={`${INPUT} font-mono tabular-nums`}
                />
                <span aria-hidden className="text-ink-400">
                  –
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5000}
                  value={draft.budgetMax || ""}
                  onChange={(event) =>
                    setDraft((c) => ({
                      ...c,
                      budgetMax: Number(event.target.value) || 0,
                    }))
                  }
                  aria-label="Maximum budget"
                  placeholder="525000"
                  className={`${INPUT} font-mono tabular-nums`}
                />
              </div>
              <p
                className={`mt-2 text-xs ${budgetInvalid ? "text-alert-700" : "text-ink-500"}`}
              >
                {budgetInvalid
                  ? "The top of the range is below the bottom."
                  : `Shows on the roster as ${formatBudgetRange(draft.budgetMin, draft.budgetMax)}.`}
              </p>
            </fieldset>

            <label className="block">
              <span className={LABEL}>Preferred locations</span>
              <input
                value={locationsText}
                onChange={(event) => setLocationsText(event.target.value)}
                placeholder="Alberta, Concordia"
                className={`mt-2 ${INPUT}`}
              />
              <span className="mt-1.5 block text-xs text-ink-400">
                Separate neighbourhoods with commas.
              </span>
            </label>

            <fieldset>
              <legend className={LABEL}>House style preferences</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {styleOptions.map((style) => {
                  const picked = draft.houseStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => toggleStyle(style)}
                      aria-pressed={picked}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        picked
                          ? "bg-navy-900 text-mist-50"
                          : "bg-card-sunken text-ink-500 hover:bg-mist-200 hover:text-ink-700"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className={LABEL}>Status</legend>
              <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-tile bg-card-sunken p-1.5">
                {CLIENT_STATUSES.map((status: ClientStatus) => {
                  const picked = draft.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setDraft((c) => ({ ...c, status }))}
                      aria-pressed={picked}
                      className={`rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
                        picked
                          ? STATUS_STYLE[status].tab
                          : "text-ink-500 hover:text-ink-900"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <footer className="shrink-0 border-t border-card-edge px-5 pb-safe pt-4">
            {error && (
              <p
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-tile bg-alert-500/10 px-3 py-2.5 text-xs text-alert-700"
              >
                <CircleAlert
                  className="mt-px size-3.5 shrink-0"
                  strokeWidth={2.25}
                  aria-hidden
                />
                {error}
              </p>
            )}

            <div className="flex gap-2.5 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-tile border border-card-edge px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-card-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || budgetInvalid}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-tile bg-navy-900 px-4 py-2.5 text-sm font-semibold text-mist-50 transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : (
                  <Check className="size-4" strokeWidth={2.5} aria-hidden />
                )}
                {saving ? "Saving" : "Save changes"}
              </button>
            </div>
          </footer>
        </form>
      </motion.aside>
    </motion.div>
  );
}
