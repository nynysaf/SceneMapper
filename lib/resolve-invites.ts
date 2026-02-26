/**
 * Resolves pending invited_admin_emails and invited_collaborator_emails
 * into admin_ids and collaborator_ids for a given user.
 *
 * Called at both signup and login so invitations work regardless of
 * whether the user already had an account when invited.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveInvitedEmails(
  supabase: SupabaseClient,
  userId: string,
  userEmail: string,
): Promise<void> {
  if (!userEmail) return;
  const emailLower = userEmail.toLowerCase();

  const { data: maps } = await supabase
    .from('maps')
    .select('id, admin_ids, collaborator_ids, invited_admin_emails, invited_collaborator_emails');

  if (!maps) return;

  for (const m of maps) {
    const invitedAdmins = (m.invited_admin_emails ?? []) as string[];
    const invitedCollabs = (m.invited_collaborator_emails ?? []) as string[];
    const adminIds = (m.admin_ids ?? []) as string[];
    const collaboratorIds = (m.collaborator_ids ?? []) as string[];
    const updates: Record<string, string[]> = {};

    if (invitedAdmins.some((e: string) => e.toLowerCase() === emailLower) && !adminIds.includes(userId)) {
      updates.admin_ids = [...adminIds, userId];
    }

    if (invitedCollabs.some((e: string) => e.toLowerCase() === emailLower) && !collaboratorIds.includes(userId)) {
      updates.collaborator_ids = [...collaboratorIds, userId];
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('maps').update(updates).eq('id', m.id);
    }
  }
}
