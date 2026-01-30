import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';

/**
 * GET /api/maps
 * Returns all maps. Replace with DB query when backend is connected.
 */
export async function GET() {
  // TODO: fetch from Supabase/DB
  const maps: SceneMap[] = [];
  return NextResponse.json(maps);
}

/**
 * POST /api/maps
 * Create or replace maps. Body: SceneMap[].
 * Replace with DB write when backend is connected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const maps = Array.isArray(body) ? body : [body];
    // TODO: validate SceneMap[] and persist to Supabase/DB
    return NextResponse.json({ ok: true, count: maps.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
