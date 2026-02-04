import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase-server';

/**
 * POST /api/account/delete
 * Deletes the current user's account. Removes from maps, deletes sole-admin maps, deletes auth user.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getSupabase();
    const { data: maps } = await adminSupabase.from('maps').select('id, admin_ids');
    const userMaps = (maps ?? []).filter(
      (m) => Array.isArray(m.admin_ids) && m.admin_ids.includes(user.id),
    );

    const soleAdminMaps = userMaps.filter((m) => (m.admin_ids as string[]).length === 1);
    const otherMaps = userMaps.filter((m) => (m.admin_ids as string[]).length > 1);

    for (const m of otherMaps) {
      const adminIds = (m.admin_ids as string[]).filter((id) => id !== user.id);
      const { data: fullMap } = await adminSupabase
        .from('maps')
        .select('collaborator_ids')
        .eq('id', m.id)
        .single();
      const collaboratorIds = ((fullMap?.collaborator_ids as string[]) ?? []).filter((id) => id !== user.id);
      await adminSupabase
        .from('maps')
        .update({ admin_ids: adminIds, collaborator_ids: collaboratorIds })
        .eq('id', m.id);
    }

    for (const m of soleAdminMaps) {
      await adminSupabase.from('maps').delete().eq('id', m.id);
    }

    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('POST /api/account/delete', deleteError);
      return NextResponse.json({ error: 'Could not delete account' }, { status: 500 });
    }

    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/account/delete', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
