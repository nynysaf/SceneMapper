import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabase } from '@/lib/supabase-server';

/**
 * GET /api/account/notification-prefs
 * Returns notification prefs for maps the current user admins.
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
      .select('id, title, slug')
      .contains('admin_ids', [user.id]);

    const { data: prefs } = await adminSupabase
      .from('user_map_notification_prefs')
      .select('map_id, enabled')
      .eq('user_id', user.id);

    const prefsMap = new Map((prefs ?? []).map((p) => [p.map_id, p.enabled]));
    const result = (maps ?? []).map((m) => ({
      mapId: m.id,
      mapTitle: m.title,
      mapSlug: m.slug,
      enabled: prefsMap.get(m.id) ?? true,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/account/notification-prefs', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/account/notification-prefs
 * Body: { mapId: string, enabled: boolean }. Upserts a single pref.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { mapId, enabled } = body;
    if (!mapId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'mapId and enabled required' }, { status: 400 });
    }

    const adminSupabase = getSupabase();
    const { error } = await adminSupabase
      .from('user_map_notification_prefs')
      .upsert(
        { user_id: user.id, map_id: mapId, enabled },
        { onConflict: 'user_id,map_id' },
      );

    if (error) {
      console.error('PUT /api/account/notification-prefs', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/account/notification-prefs', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
