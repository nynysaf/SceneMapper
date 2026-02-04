/**
 * Helpers for auth in API routes.
 */
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClientForRouteHandler } from '@/lib/supabase/route-handler';

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Use in Route Handlers for reliable session reads.
 * cookies() from next/headers can miss session in some Route Handler contexts;
 * passing the request ensures cookies are read from the incoming request.
 */
export async function getCurrentUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const { supabase } = await createClientForRouteHandler(request);
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function canAccessMap(
  row: { public_view: boolean; admin_ids?: string[]; collaborator_ids?: string[] },
  userId: string | null,
): boolean {
  if (row.public_view === true) return true;
  if (!userId) return false;
  const adminIds = row.admin_ids ?? [];
  const collaboratorIds = row.collaborator_ids ?? [];
  return adminIds.includes(userId) || collaboratorIds.includes(userId);
}
