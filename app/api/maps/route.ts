import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap, sceneMapToDbMap } from '@/lib/db-mappers';
import { hashPassword } from '@/lib/password';
import { sendInvitationEmail } from '@/lib/invitation-email';

/**
 * GET /api/maps
 * Returns all maps from the database.
 */
export async function GET() {
  try {
    const { data, error } = await supabase.from('maps').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('GET /api/maps', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const maps: SceneMap[] = (data ?? []).map(dbMapToSceneMap);
    return NextResponse.json(maps);
  } catch (err) {
    console.error('GET /api/maps', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function normalizeEmails(list: string[] | undefined): string[] {
  if (!list || !Array.isArray(list)) return [];
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * POST /api/maps
 * Create or replace maps. Body: SceneMap[] or single SceneMap.
 * After upsert, sends invitation emails to newly added admin/collaborator emails (when RESEND_API_KEY is set).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawMaps = Array.isArray(body) ? body : [body];
    if (rawMaps.length === 0) {
      return NextResponse.json({ error: 'At least one map required' }, { status: 400 });
    }
    const maps: SceneMap[] = rawMaps.map((m: SceneMap & { collaboratorPassword?: string }) => ({
      ...m,
      id: m.id || crypto.randomUUID(),
    }));

    // Fetch existing maps (by id) to diff invited emails before upsert
    const existingById: Record<string, { invitedAdminEmails: string[]; invitedCollaboratorEmails: string[] }> = {};
    for (const m of maps) {
      if (!m.id) continue;
      const { data: existing } = await supabase
        .from('maps')
        .select('invited_admin_emails, invited_collaborator_emails')
        .eq('id', m.id)
        .single();
      if (existing) {
        existingById[m.id] = {
          invitedAdminEmails: normalizeEmails((existing as { invited_admin_emails?: string[] }).invited_admin_emails),
          invitedCollaboratorEmails: normalizeEmails((existing as { invited_collaborator_emails?: string[] }).invited_collaborator_emails),
        };
      } else {
        existingById[m.id] = { invitedAdminEmails: [], invitedCollaboratorEmails: [] };
      }
    }

    const rows = maps.map((m, i) => {
      const row = sceneMapToDbMap(m);
      const raw = rawMaps[i] as SceneMap & { collaboratorPassword?: string };
      if (raw?.collaboratorPassword != null && raw.collaboratorPassword !== '') {
        return { ...row, collaborator_password_hash: hashPassword(raw.collaboratorPassword) };
      }
      return row;
    });

    const { error } = await supabase.from('maps').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('POST /api/maps', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send invitation emails to newly added addresses (only when Resend is configured)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    for (const m of maps) {
      const prev = existingById[m.id] ?? { invitedAdminEmails: [], invitedCollaboratorEmails: [] };
      const currentAdmins = normalizeEmails(m.invitedAdminEmails);
      const currentCollaborators = normalizeEmails(m.invitedCollaboratorEmails);
      const newAdminEmails = currentAdmins.filter((e) => !prev.invitedAdminEmails.includes(e));
      const newCollaboratorEmails = currentCollaborators.filter((e) => !prev.invitedCollaboratorEmails.includes(e));

      for (const to of newAdminEmails) {
        const result = await sendInvitationEmail({
          map: m,
          to,
          role: 'admin',
          fromEmail,
        });
        if (!result.sent) console.error('Invitation email (admin)', to, result.error);
      }
      for (const to of newCollaboratorEmails) {
        const result = await sendInvitationEmail({
          map: m,
          to,
          role: 'collaborator',
          fromEmail,
        });
        if (!result.sent) console.error('Invitation email (collaborator)', to, result.error);
      }
    }

    return NextResponse.json({ ok: true, count: maps.length });
  } catch (err) {
    console.error('POST /api/maps', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
