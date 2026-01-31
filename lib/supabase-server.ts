/**
 * Server-only Supabase client for API routes.
 * Uses SUPABASE_SERVICE_ROLE_KEY; never use this from the client.
 * Lazy-initialized so the Next.js build (e.g. in CI without env) does not throw at import time.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase client. Throws only when called at runtime without env vars.
 * Call this inside API route handlers, not at module top level.
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or Vercel env for API routes.'
    );
  }
  _client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return _client;
}

/** @deprecated Use getSupabase() inside request handlers. Kept for backward compatibility during migration. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string, unknown>)[prop as string];
  },
});
