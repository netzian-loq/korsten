/**
 * The client domain: shapes, and the arithmetic the dashboard reads off them.
 *
 * Deliberately free of imports — no Supabase, no React — so the roster maths can
 * be exercised directly by `lib/client-model.test.ts` without a browser or a
 * network. `lib/clients.ts` re-exports all of it alongside the data access.
 */

export type ClientStatus = "Lead" | "Viewing" | "Under Contract";

export const CLIENT_STATUSES = [
  "Lead",
  "Viewing",
  "Under Contract",
] as const satisfies readonly ClientStatus[];

/**
 * A client counts as an active deal once they are past the lead stage: there is
 * a live transaction to shepherd rather than a name to chase.
 */
export const ACTIVE_DEAL_STATUSES: readonly ClientStatus[] = [
  "Viewing",
  "Under Contract",
];

export const HOUSE_STYLES = [
  "Bungalow",
  "Colonial",
  "Contemporary",
  "Craftsman",
  "Foursquare",
  "Mid-century",
  "Ranch",
  "Split-level",
  "Tudor",
  "Victorian",
] as const;

export type Client = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  /** Target budget range, in whole dollars. */
  budgetMin: number;
  budgetMax: number;
  preferredLocations: string[];
  houseStyles: string[];
  status: ClientStatus;
};

export const isActiveDeal = (client: Client) =>
  ACTIVE_DEAL_STATUSES.includes(client.status);

/* -------------------------------------------------------------------------- */
/* Searching and filtering                                                    */
/* -------------------------------------------------------------------------- */

/** `active` spans every status in ACTIVE_DEAL_STATUSES; the rest are exact. */
export type ClientFilter = "all" | "active" | ClientStatus;

/** Everything one client can be found by, lowercased once per comparison. */
export function clientHaystack(client: Client): string {
  return [
    client.fullName,
    client.email,
    client.phone,
    client.status,
    ...client.preferredLocations,
    ...client.houseStyles,
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesFilter(client: Client, filter: ClientFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return isActiveDeal(client);
  return client.status === filter;
}

export function matchesQuery(client: Client, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return needle === "" || clientHaystack(client).includes(needle);
}

export function filterClients(
  clients: Client[],
  filter: ClientFilter,
  query: string,
): Client[] {
  return clients.filter(
    (client) => matchesFilter(client, filter) && matchesQuery(client, query),
  );
}

/* -------------------------------------------------------------------------- */
/* Roster arithmetic                                                          */
/* -------------------------------------------------------------------------- */

export type BudgetDomain = { min: number; max: number };

/**
 * The span every row's budget bar is drawn against, so the roster reads as one
 * picture. Falls back to a unit range so callers can divide by it safely.
 */
export function budgetDomain(clients: Client[]): BudgetDomain {
  if (clients.length === 0) return { min: 0, max: 1 };
  return {
    min: Math.min(...clients.map((c) => c.budgetMin)),
    max: Math.max(...clients.map((c) => c.budgetMax)),
  };
}

export type ActiveDealSummary = {
  deals: Client[];
  /** Combined budget of every live deal — the money actually in motion. */
  inPlay: BudgetDomain;
  countsByStatus: Record<ClientStatus, number>;
};

export function summarizeActiveDeals(clients: Client[]): ActiveDealSummary {
  const countsByStatus: Record<ClientStatus, number> = {
    Lead: 0,
    Viewing: 0,
    "Under Contract": 0,
  };
  for (const client of clients) countsByStatus[client.status] += 1;

  const deals = clients.filter(isActiveDeal);
  const inPlay = deals.reduce(
    (total, client) => ({
      min: total.min + client.budgetMin,
      max: total.max + client.budgetMax,
    }),
    { min: 0, max: 0 },
  );

  return { deals, inPlay, countsByStatus };
}
