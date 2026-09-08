import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Trimmed, because a variable that exists but holds "" or whitespace is
// unconfigured — the same trap that broke the build on metadataBase.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/**
 * Whether the app has credentials to reach Supabase at all. NEXT_PUBLIC_ vars
 * are inlined at build time, so this is a constant in both the server render
 * and the browser bundle — the dashboard uses it to say honestly whether an
 * edit is being persisted or only held in memory.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/** The shared client, or `null` when the app is running on seed data. */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;

  try {
    cached ??= createClient(url, anonKey);
    return cached;
  } catch {
    // A malformed URL should drop the roster back to seed data, the way an
    // unreachable Supabase already does — not throw a 500 from the page.
    return null;
  }
}
