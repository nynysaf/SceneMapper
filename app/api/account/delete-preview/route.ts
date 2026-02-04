import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase-server';

/**
 * GET /api/account/delete-preview
 * Returns count of maps that would be deleted (sole-admin maps) if user deletes account.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = getSupabase();
    const { data: maps } = await adminSupabase
      .from('maps')
      .select('id, admin_ids')
      .contains('admin_ids', [user.id]);

    const soleAdminCount = (maps ?? []).filter(
      (m) => Array.isArray(m.admin_ids) && m.admin_ids.length === 1,
    ).length;

    return NextResponse.json({ soleAdminMapCount: soleAdminCount });
  } catch (err) {
    console.error('GET /api/account/delete-preview', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
