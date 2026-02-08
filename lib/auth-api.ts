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

export interface CurrentUser {
  id: string;
  email: string | null;
}

/**
 * Get current user with email (for platform admin check).
 */
export async function getCurrentUserFromRequest(request: NextRequest): Promise<CurrentUser | null> {
  const { supabase } = await createClientForRouteHandler(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/** Platform admin emails (env: comma-separated, or default naryan@gmail.com). */
function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? 'naryan@gmail.com';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(email.trim().toLowerCase());
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
