/**
 * Server-only Supabase client for API routes.
 * Uses SUPABASE_SERVICE_ROLE_KEY; never use this from the client.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local for API routes.'
  );
}

export const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
