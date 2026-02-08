import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap } from '@/lib/db-mappers';
import { getCurrentUserFromRequest, getCurrentUserIdFromRequest, canAccessMap, isPlatformAdminEmail } from '@/lib/auth-api';

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

/**
 * PATCH /api/maps/[slug]/feature
 * Update featured state (platform admin only). Body: { featuredOrder?: number | null, featuredActive?: boolean, clearFeatureRequest?: boolean }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user || !isPlatformAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Platform admin only' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const featuredOrder = body.featuredOrder !== undefined ? (body.featuredOrder as number | null) : undefined;
    const featuredActive = body.featuredActive !== undefined ? !!body.featuredActive : undefined;
    const clearFeatureRequest = !!body.clearFeatureRequest;

    const { data: mapRow, error: fetchError } = await supabase
      .from('maps')
      .select('id, feature_requested_at, featured_order, featured_active')
      .eq('slug', slug)
      .maybeSingle();
    if (fetchError || !mapRow) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (featuredOrder !== undefined) updates.featured_order = featuredOrder;
    if (featuredActive !== undefined) updates.featured_active = featuredActive;
    if (clearFeatureRequest) updates.feature_requested_at = null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error: updateError } = await supabase.from('maps').update(updates).eq('id', mapRow.id);
    if (updateError) {
      console.error('PATCH /api/maps/[slug]/feature', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PATCH /api/maps/[slug]/feature', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
