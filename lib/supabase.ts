import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  cached ??= createClient(url, anonKey);
  return cached;
}
