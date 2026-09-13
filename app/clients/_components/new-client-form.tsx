"use client";

import { UserPlus, X } from "lucide-react";
import { useState } from "react";

import { addClient } from "@/lib/client-store";
import { CLIENT_TYPES } from "@/lib/clients";
import type { ClientType } from "@/lib/presets";

const INPUT =
  "w-full rounded-md border border-navy-700 bg-navy-850 px-3 py-2 text-sm text-mist-100 transition-colors placeholder:text-mist-500 focus:border-accent-400";
const LABEL =
  "block text-[0.625rem] font-semibold uppercase tracking-wider text-mist-500";

type Props = {
  onCreated: (clientId: string) => void;
  onCancel: () => void;
};

export function NewClientForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ClientType>("Buyer");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const canSave = name.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSave) return;

    const client = addClient({ name, type, email, phone });
    onCreated(client.id);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel flex flex-col gap-3 p-4"
      aria-label="Add a client"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-mist-100">Add a client</h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid size-6 place-items-center rounded-md text-mist-400 transition-colors hover:bg-navy-700 hover:text-mist-100"
        >
          <X className="size-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      </div>

      <label className="block">
        <span className={LABEL}>Full name</span>
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ada Okonkwo"
          required
          className={`mt-1 ${INPUT}`}
        />
      </label>

      <fieldset>
        <legend className={LABEL}>They are a</legend>
        <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-md bg-navy-850 p-1">
          {CLIENT_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              aria-pressed={type === option}
              className={`rounded px-2 py-1.5 text-xs font-semibold transition-colors ${
                type === option
                  ? "bg-accent-400 text-navy-950"
                  : "text-mist-400 hover:text-mist-100"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={LABEL}>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ada@example.com"
          className={`mt-1 ${INPUT}`}
        />
      </label>

      <label className="block">
        <span className={LABEL}>Phone</span>
        <input
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(971) 555-0188"
          className={`mt-1 ${INPUT}`}
        />
      </label>

      <button
        type="submit"
        disabled={!canSave}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-md bg-accent-500 px-3 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserPlus className="size-4" strokeWidth={2.5} aria-hidden />
        Add client
      </button>
    </form>
  );
}
