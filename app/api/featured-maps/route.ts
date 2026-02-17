import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap } from '@/lib/db-mappers';
import { getCurrentUserFromRequest, isPlatformAdminEmail } from '@/lib/auth-api';

/**
 * GET /api/featured-maps
 * Returns all featured maps in order (for home page and Featured maps page). Public.
 *
 * Caching:
 * - Normal visitors (non-admin): cache for 60s at the CDN with stale-while-revalidate.
 * - Platform admins: no-store so they see updates (approvals/denials) immediately.
 */
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .not('featured_order', 'is', null)
      .order('featured_order', { ascending: true });
    if (error) {
      console.error('GET /api/featured-maps', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const maps: SceneMap[] = (data ?? []).map(dbMapToSceneMap);
    const res = NextResponse.json(maps);

    // Platform admins (who manage feature requests) should see immediate updates,
    // so we bypass CDN/browser caching for them.
    const user = await getCurrentUserFromRequest(request);
    if (user && isPlatformAdminEmail(user.email)) {
      res.headers.set('Cache-Control', 'no-store');
    } else {
      res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    }
    return res;
  } catch (err) {
    console.error('GET /api/featured-maps', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
