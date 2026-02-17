import { NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap } from '@/lib/db-mappers';

/**
 * GET /api/featured-maps
 * Returns all featured maps in order (for home page and Featured maps page). Public.
 */
export async function GET() {
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
    return NextResponse.json(maps, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('GET /api/featured-maps', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
