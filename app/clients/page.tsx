import type { Metadata } from "next";

import { fetchClients } from "@/lib/clients";

import { NavRail } from "../_components/nav-rail";
import { ClientsDashboard } from "./_components/clients-dashboard";

export const metadata: Metadata = {
  title: "Clients",
  description: "The client book: budgets, neighbourhoods, and live deals.",
};

// The roster is per-request data. Without this the page would be prerendered at
// build time and every visitor would see whatever the table held that morning.
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const { clients, source, error } = await fetchClients();

  return (
    <div className="flex min-h-dvh">
      <NavRail />

      <main className="min-w-0 flex-1 px-safe">
        <div className="pt-safe">
          <div className="mx-auto max-w-5xl px-5 pb-32 pt-6 md:px-8 md:pb-16 md:pt-10">
            <ClientsDashboard
              initialClients={clients}
              source={source}
              loadError={error}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
