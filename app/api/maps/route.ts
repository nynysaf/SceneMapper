import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap, sceneMapToDbMap } from '@/lib/db-mappers';
import { hashPassword } from '@/lib/password';
import { sendInvitationEmail } from '@/lib/invitation-email';
import { getCurrentUserIdFromRequest } from '@/lib/auth-api';

/**
 * GET /api/maps
 * Returns maps for "Your Maps": only maps where the user is admin, collaborator, or has viewed.
 * For non-logged-in users, returns public maps (for landing/explore). For logged-in users,
 * returns only maps they have a relationship with.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    const { data, error } = await supabase.from('maps').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('GET /api/maps', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    let rows = data ?? [];
    if (!userId) {
      rows = rows.filter((r) => r.public_view === true);
    } else {
      // Your Maps: only admin, collaborator, or has viewed
      const { data: viewedRows } = await supabase
        .from('user_map_views')
        .select('map_id')
        .eq('user_id', userId);
      const viewedMapIds = new Set((viewedRows ?? []).map((r) => r.map_id));
      rows = rows.filter((r) => {
        const isAdmin = Array.isArray(r.admin_ids) && r.admin_ids.includes(userId);
        const isCollaborator = Array.isArray(r.collaborator_ids) && r.collaborator_ids.includes(userId);
        const hasViewed = viewedMapIds.has(r.id);
        return isAdmin || isCollaborator || hasViewed;
      });
    }
    const maps: SceneMap[] = rows.map(dbMapToSceneMap);
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

/** PostgreSQL maps.id is uuid; reject non-UUID to avoid 500 on upsert. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function ensureUuid(id: string | undefined): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
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
      id: ensureUuid(m.id),
    }));

    // Fetch existing maps (by id) to diff invited emails before upsert.
    // Use ensureUuid so we never pass a non-UUID to Postgres (avoids 500 when client sends old short ids).
    const existingById: Record<string, { invitedAdminEmails: string[]; invitedCollaboratorEmails: string[] }> = {};
    for (const m of maps) {
      const mapId = ensureUuid(m.id);
      const { data: existing } = await supabase
        .from('maps')
        .select('invited_admin_emails, invited_collaborator_emails')
        .eq('id', mapId)
        .maybeSingle();
      if (existing) {
        existingById[mapId] = {
          invitedAdminEmails: normalizeEmails((existing as { invited_admin_emails?: string[] }).invited_admin_emails),
          invitedCollaboratorEmails: normalizeEmails((existing as { invited_collaborator_emails?: string[] }).invited_collaborator_emails),
        };
      } else {
        existingById[mapId] = { invitedAdminEmails: [], invitedCollaboratorEmails: [] };
      }
    }

    const rows = maps.map((m, i) => {
      const mapId = ensureUuid(m.id);
      const row = { ...sceneMapToDbMap(m), id: mapId };
      const raw = rawMaps[i] as SceneMap & { collaboratorPassword?: string };
      if (raw?.collaboratorPassword != null && raw.collaboratorPassword !== '') {
        return { ...row, collaborator_password_hash: hashPassword(raw.collaboratorPassword) };
      }
      return row;
    });

    const { error } = await supabase.from('maps').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('POST /api/maps', error);
      const message = error.message || 'Database error';
      return NextResponse.json({ error: message, code: error.code }, { status: 500 });
    }

    // Send invitation emails to newly added addresses (only when Resend is configured)
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
    const hasResendKey = !!process.env.RESEND_API_KEY;
    for (const m of maps) {
      const mapId = ensureUuid(m.id);
      const prev = existingById[mapId] ?? { invitedAdminEmails: [], invitedCollaboratorEmails: [] };
      const currentAdmins = normalizeEmails(m.invitedAdminEmails);
      const currentCollaborators = normalizeEmails(m.invitedCollaboratorEmails);
      const newAdminEmails = currentAdmins.filter((e) => !prev.invitedAdminEmails.includes(e));
      const newCollaboratorEmails = currentCollaborators.filter((e) => !prev.invitedCollaboratorEmails.includes(e));

      if (!hasResendKey) continue;

      for (const to of newAdminEmails) {
        const result = await sendInvitationEmail({
          map: m,
          to,
          role: 'admin',
          fromEmail,
        });
        if ('error' in result) {
          console.error('Invitation email (admin)', to, result.error);
        }
      }
      for (const to of newCollaboratorEmails) {
        const result = await sendInvitationEmail({
          map: m,
          to,
          role: 'collaborator',
          fromEmail,
        });
        if ('error' in result) {
          console.error('Invitation email (collaborator)', to, result.error);
        }
      }
    }

    return NextResponse.json({ ok: true, count: maps.length });
  } catch (err) {
    console.error('POST /api/maps', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
