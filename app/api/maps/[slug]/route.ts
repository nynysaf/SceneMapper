import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/maps/[slug]
 * Returns one map by slug. Replace with DB query when backend is connected.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  // TODO: fetch from Supabase/DB by slug
  const map: SceneMap | null = null;
  if (!map) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(map);
}
