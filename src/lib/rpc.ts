import type { PostgrestError } from "@supabase/supabase-js";

/** Codes our database functions raise with messages written for people. */
const EXPECTED = new Set(["P0001", "P0002", "22023", "42501"]);

/** The message to show for an expected database refusal; unexpected errors are rethrown. */
export function refusal(error: PostgrestError | null): string | null {
  if (!error) return null;
  if (EXPECTED.has(error.code)) return error.message;
  throw error;
}

/** Generated RPC argument types can't express SQL null for parameters without a default. */
export function sqlNull<T>(value: T | null): T {
  return value as T;
}
