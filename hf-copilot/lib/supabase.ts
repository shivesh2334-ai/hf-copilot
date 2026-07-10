import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Returns a Supabase client, or null if env vars are not configured.
 * Persistence is optional — the app works without Supabase; cases just
 * won't be saved for later review.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
