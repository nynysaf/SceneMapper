import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { getCurrentUserId } from '@/lib/auth-api';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST /api/maps/[slug]/view
 * Records that the current user has viewed this map.
 * Used to include the map in "Your Maps" for non-admin/non-collaborator users.
 * No-op if user is not logged in.
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ ok: true }); // No-op when not logged in
    }

    const { data: mapRow, error: mapError } = await supabase
      .from('maps')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (mapError || !mapRow) {
      return NextResponse.json({ ok: true }); // Silently ignore if map not found
    }

    await supabase.from('user_map_views').upsert(
      { user_id: userId, map_id: mapRow.id, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,map_id' }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/maps/[slug]/view', err);
    return NextResponse.json({ ok: true }); // Non-fatal; don't break map load
  }
}
