import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap, MapNode, MapConnection } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap, dbNodeToMapNode, dbConnectionToMapConnection } from '@/lib/db-mappers';
import { getCurrentUserId, canAccessMap } from '@/lib/auth-api';

type RouteContext = { params: Promise<{ slug: string }> };

export interface MapPageResponse {
  map: SceneMap | null;
  nodes: MapNode[];
  connections: MapConnection[];
}

/**
 * GET /api/maps/[slug]/page
 * Returns map, nodes, and connections in one response (Tier 3: combined API).
 * Returns 404 for private maps if user lacks access.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase
      .from('maps')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (mapError) {
      console.error('GET /api/maps/[slug]/page map', mapError);
      return NextResponse.json({ error: mapError.message }, { status: 500 });
    }

    if (!mapRow) {
      return NextResponse.json<MapPageResponse>({ map: null, nodes: [], connections: [] }, { status: 404 });
    }

    const userId = await getCurrentUserId();
    if (!canAccessMap(mapRow, userId)) {
      return NextResponse.json<MapPageResponse>({ map: null, nodes: [], connections: [] }, { status: 404 });
    }

    const map: SceneMap | null = dbMapToSceneMap(mapRow);
    const mapId = mapRow?.id ?? null;

    if (!mapId) {
      return NextResponse.json<MapPageResponse>({ map: null, nodes: [], connections: [] });
    }

    const [nodesResult, connectionsResult] = await Promise.all([
      supabase.from('nodes').select('*').eq('map_id', mapId).order('created_at', { ascending: true }),
      supabase
        .from('connections')
        .select('*')
        .eq('map_id', mapId)
        .order('created_at', { ascending: true }),
    ]);

    if (nodesResult.error) {
      console.error('GET /api/maps/[slug]/page nodes', nodesResult.error);
      return NextResponse.json({ error: nodesResult.error.message }, { status: 500 });
    }
    if (connectionsResult.error) {
      console.error('GET /api/maps/[slug]/page connections', connectionsResult.error);
      return NextResponse.json({ error: connectionsResult.error.message }, { status: 500 });
    }

    const nodes: MapNode[] = (nodesResult.data ?? []).map(dbNodeToMapNode);
    const connections: MapConnection[] = (connectionsResult.data ?? []).map(dbConnectionToMapConnection);

    const res = NextResponse.json<MapPageResponse>({ map, nodes, connections });
    if (mapRow.public_view === true) {
      res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    }
    return res;
  } catch (err) {
    console.error('GET /api/maps/[slug]/page', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
