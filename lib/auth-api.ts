/**
 * Helpers for auth in API routes.
 */
import { createClient } from '@/lib/supabase/server';

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
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
