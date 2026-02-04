import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap } from '@/lib/db-mappers';
import { getCurrentUserId, canAccessMap } from '@/lib/auth-api';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/maps/[slug]
 * Returns one map by slug. Returns 404 for private maps if user lacks access.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data, error } = await supabase.from('maps').select('*').eq('slug', slug).maybeSingle();
    if (error) {
      console.error('GET /api/maps/[slug]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(null, { status: 404 });
    }
    const userId = await getCurrentUserId();
    if (!canAccessMap(data, userId)) {
      return NextResponse.json(null, { status: 404 });
    }
    const map: SceneMap = dbMapToSceneMap(data);
    return NextResponse.json(map);
  } catch (err) {
    console.error('GET /api/maps/[slug]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
