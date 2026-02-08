import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap } from '@/lib/db-mappers';
import { getCurrentUserIdFromRequest, canAccessMap } from '@/lib/auth-api';

type RouteContext = { params: Promise<{ slug: string }> };

function isMapAdmin(row: { admin_ids?: string[] }, userId: string | null): boolean {
  if (!userId) return false;
  const adminIds = row.admin_ids ?? [];
  return Array.isArray(adminIds) && adminIds.includes(userId);
}

/**
 * GET /api/maps/[slug]
 * Returns one map by slug. Returns 404 for private maps if user lacks access.
 */
export async function GET(request: NextRequest, context: RouteContext) {
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
    const userId = await getCurrentUserIdFromRequest(request);
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

/**
 * DELETE /api/maps/[slug]
 * Deletes the map and all related data (nodes, connections, views cascade).
 * Only map admins can delete. Returns 404 if not found or not admin.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: mapRow, error: fetchError } = await supabase
      .from('maps')
      .select('id, admin_ids')
      .eq('slug', slug)
      .maybeSingle();
    if (fetchError) {
      console.error('DELETE /api/maps/[slug]', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!mapRow) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }
    if (!isMapAdmin(mapRow, userId)) {
      return NextResponse.json({ error: 'Only map admins can delete this map' }, { status: 403 });
    }
    const { error: deleteError } = await supabase.from('maps').delete().eq('id', mapRow.id);
    if (deleteError) {
      console.error('DELETE /api/maps/[slug]', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('DELETE /api/maps/[slug]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
