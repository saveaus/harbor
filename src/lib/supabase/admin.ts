import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

let client: AdminSupabase | undefined;

/**
 * Service-role client that bypasses row-level security. Only for server paths with no signed-in user
 * (Stripe webhooks, public checkout); every query must scope rows itself. Null when the key isn't set.
 */
export function getAdminClient(): AdminSupabase | null {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  client ??= createClient<Database>(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type AdminSupabase = ReturnType<typeof createClient<Database>>;
