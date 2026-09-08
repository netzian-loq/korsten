import type { Client, ClientStatus } from "@/lib/client-model";
import { getSupabase } from "@/lib/supabase";

// The domain lives in client-model.ts, which stays import-free so it can be
// unit tested. Re-exported here so callers have one place to import from.
export * from "@/lib/client-model";

/* -------------------------------------------------------------------------- */
/* Supabase row mapping                                                       */
/* -------------------------------------------------------------------------- */

type ClientRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_locations: string[] | null;
  house_styles: string[] | null;
  status: ClientStatus;
};

const fromRow = (row: ClientRow): Client => ({
  id: row.id,
  fullName: row.full_name,
  phone: row.phone ?? "",
  email: row.email ?? "",
  budgetMin: row.budget_min ?? 0,
  budgetMax: row.budget_max ?? 0,
  preferredLocations: row.preferred_locations ?? [],
  houseStyles: row.house_styles ?? [],
  status: row.status,
});

const toRow = (client: Client): Omit<ClientRow, "id"> => ({
  full_name: client.fullName,
  phone: client.phone || null,
  email: client.email || null,
  budget_min: client.budgetMin,
  budget_max: client.budgetMax,
  preferred_locations: client.preferredLocations,
  house_styles: client.houseStyles,
  status: client.status,
});

/* -------------------------------------------------------------------------- */
/* Data access                                                                */
/* -------------------------------------------------------------------------- */

export type ClientSource = "supabase" | "local";

export type ClientsResult = {
  clients: Client[];
  source: ClientSource;
  /** Set when Supabase is configured but the read failed. */
  error?: string;
};

/**
 * Reads the roster, falling back to the seed list whenever Supabase is
 * unconfigured or unreachable — the dashboard stays usable before anyone
 * provisions a table, and says which of the two it is.
 */
export async function fetchClients(): Promise<ClientsResult> {
  const supabase = getSupabase();
  if (!supabase) return { clients: SEED_CLIENTS, source: "local" };

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("full_name");

  if (error) {
    return { clients: SEED_CLIENTS, source: "local", error: error.message };
  }

  return { clients: (data as ClientRow[]).map(fromRow), source: "supabase" };
}

export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * Persists one client. Reports success without writing anything when running on
 * seed data: the caller has already applied the edit optimistically, and there
 * is nowhere to send it.
 */
export async function saveClient(client: Client): Promise<SaveResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: true };

  const { error } = await supabase
    .from("clients")
    .update(toRow(client))
    .eq("id", client.id);

  return error ? { ok: false, message: error.message } : { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Seed roster                                                                */
/* -------------------------------------------------------------------------- */

export const SEED_CLIENTS: Client[] = [
  {
    id: "c1f4a2b0-0000-4000-8000-000000000001",
    fullName: "Ada Okonkwo",
    phone: "(971) 555-0188",
    email: "ada.okonkwo@example.com",
    budgetMin: 540_000,
    budgetMax: 680_000,
    preferredLocations: ["Sellwood", "Woodstock"],
    houseStyles: ["Ranch", "Mid-century"],
    status: "Viewing",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000002",
    fullName: "Dana Whitfield",
    phone: "(503) 555-0119",
    email: "d.whitfield@example.com",
    budgetMin: 1_200_000,
    budgetMax: 1_600_000,
    preferredLocations: ["Irvington", "Laurelhurst"],
    houseStyles: ["Colonial", "Tudor"],
    status: "Viewing",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000003",
    fullName: "Gwen Achterberg",
    phone: "(503) 555-0131",
    email: "gwen.a@example.com",
    budgetMin: 900_000,
    budgetMax: 1_100_000,
    preferredLocations: ["Eastmoreland", "Reed"],
    houseStyles: ["Tudor", "Colonial"],
    status: "Viewing",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000004",
    fullName: "Marisol Reyes",
    phone: "(503) 555-0142",
    email: "marisol.reyes@example.com",
    budgetMin: 780_000,
    budgetMax: 950_000,
    preferredLocations: ["Alberta", "Concordia"],
    houseStyles: ["Craftsman", "Bungalow"],
    status: "Under Contract",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000005",
    fullName: "Priya Raghunathan",
    phone: "(503) 555-0173",
    email: "priya.r@example.com",
    budgetMin: 425_000,
    budgetMax: 525_000,
    preferredLocations: ["St. Johns", "Kenton"],
    houseStyles: ["Bungalow", "Foursquare"],
    status: "Lead",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000006",
    fullName: "Renata Alvarez",
    phone: "(503) 555-0166",
    email: "renata.alvarez@example.com",
    budgetMin: 615_000,
    budgetMax: 740_000,
    preferredLocations: ["Buckman", "Hosford-Abernethy"],
    houseStyles: ["Victorian", "Foursquare"],
    status: "Under Contract",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000007",
    fullName: "Samuel Ortiz",
    phone: "(971) 555-0157",
    email: "sam.ortiz@example.com",
    budgetMin: 350_000,
    budgetMax: 460_000,
    preferredLocations: ["Lents", "Montavilla"],
    houseStyles: ["Ranch", "Split-level"],
    status: "Lead",
  },
  {
    id: "c1f4a2b0-0000-4000-8000-000000000008",
    fullName: "Tobias Lindqvist",
    phone: "(971) 555-0204",
    email: "t.lindqvist@example.com",
    budgetMin: 2_100_000,
    budgetMax: 2_800_000,
    preferredLocations: ["West Hills", "Dunthorpe"],
    houseStyles: ["Contemporary"],
    status: "Lead",
  },
];
