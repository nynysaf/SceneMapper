import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-server';

/**
 * POST /api/admin/migrate-users
 * One-time migration: creates Supabase Auth users for each public.users row,
 * updates maps.admin_ids and maps.collaborator_ids with new auth IDs,
 * sends password reset email to each user.
 *
 * Secured by MIGRATION_SECRET (pass in Authorization: Bearer <secret>).
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const secret = process.env.MIGRATION_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const { data: legacyUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name');

    if (usersError) {
      console.error('migrate-users: fetch users', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const users = legacyUsers ?? [];
    const idMap = new Map<string, string>();

    for (const u of users) {
      const tempPassword = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: u.name ?? '' },
      });

      if (error) {
        if (error.message?.toLowerCase().includes('already been registered')) {
          const { data: existing } = await supabase.auth.admin.listUsers();
          const userEmail = (u as { email?: string }).email?.toLowerCase();
          const match = existing?.users?.find((x) => (x as { email?: string }).email?.toLowerCase() === userEmail);
          if (match) {
            idMap.set(u.id, match.id);
            continue;
          }
        }
        console.error('migrate-users: create user', u.email, error);
        return NextResponse.json({ error: `Failed to create user ${u.email}: ${error.message}` }, { status: 500 });
      }

      if (data.user) {
        idMap.set(u.id, data.user.id);
      }
    }

    const { data: maps } = await supabase.from('maps').select('id, admin_ids, collaborator_ids');
    for (const m of maps ?? []) {
      const adminIds = ((m.admin_ids ?? []) as string[]).map((oldId) => idMap.get(oldId) ?? oldId).filter(Boolean);
      const collaboratorIds = ((m.collaborator_ids ?? []) as string[]).map((oldId) => idMap.get(oldId) ?? oldId).filter(Boolean);
      await supabase.from('maps').update({ admin_ids: adminIds, collaborator_ids: collaboratorIds }).eq('id', m.id);
    }

    for (const u of users) {
      await supabase.auth.resetPasswordForEmail(u.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://scenemapper.ca'}/account`,
      });
    }

    return NextResponse.json({
      ok: true,
      migrated: users.length,
      message: `Migrated ${users.length} users. Password reset emails sent.`,
    });
  } catch (err) {
    console.error('POST /api/admin/migrate-users', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
