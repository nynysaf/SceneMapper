import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap } from '@/lib/db-mappers';
import { getCurrentUserFromRequest, isPlatformAdminEmail } from '@/lib/auth-api';

/**
 * GET /api/admin/feature-requests
 * Returns maps that requested to be featured and are not yet approved/denied. Platform admin only.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user || !isPlatformAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Platform admin only' }, { status: 403 });
    }
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .not('feature_requested_at', 'is', null)
      .is('featured_order', null)
      .order('feature_requested_at', { ascending: false });
    if (error) {
      console.error('GET /api/admin/feature-requests', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const maps: SceneMap[] = (data ?? []).map(dbMapToSceneMap);
    return NextResponse.json(maps);
  } catch (err) {
    console.error('GET /api/admin/feature-requests', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
