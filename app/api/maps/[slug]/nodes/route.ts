import { NextRequest, NextResponse } from 'next/server';
import type { MapNode } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbNodeToMapNode, mapNodeToDbNode } from '@/lib/db-mappers';
import { getCurrentUserIdFromRequest, canEditMap } from '@/lib/auth-api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function ensureUuid(id: string | undefined): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/maps/[slug]/nodes
 * Returns nodes for the map identified by slug.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase.from('maps').select('id').eq('slug', slug).maybeSingle();
    if (mapError || !mapRow) {
      if (mapError) console.error('GET /api/maps/[slug]/nodes map', mapError);
      return NextResponse.json([], { status: 200 });
    }
    const { data, error } = await supabase.from('nodes').select('*').eq('map_id', mapRow.id).order('created_at', { ascending: true });
    if (error) {
      console.error('GET /api/maps/[slug]/nodes', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const nodes: MapNode[] = (data ?? []).map(dbNodeToMapNode);
    return NextResponse.json(nodes);
  } catch (err) {
    console.error('GET /api/maps/[slug]/nodes', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/maps/[slug]/nodes
 * Replace all nodes for the map. Body: MapNode[].
 * Preserves connections: connections reference nodes with ON DELETE CASCADE, so we
 * fetch connections first, delete nodes (which would cascade-delete connections),
 * insert nodes, then re-insert connections so they are not lost.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const userId = await getCurrentUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { data: mapRow, error: mapError } = await supabase
      .from('maps')
      .select('id, admin_ids, collaborator_ids')
      .eq('slug', slug)
      .maybeSingle();
    if (mapError || !mapRow) {
      if (mapError) console.error('PUT /api/maps/[slug]/nodes map', mapError);
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }
    if (!canEditMap(mapRow, userId)) {
      return NextResponse.json({ error: 'You must be an admin or collaborator to edit this map' }, { status: 403 });
    }
    const mapId = mapRow.id;

    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array of nodes' }, { status: 400 });
    }
    const nodes: MapNode[] = body;

    const connectionsResult = await supabase
      .from('connections')
      .select('*')
      .eq('map_id', mapId);
    if (connectionsResult.error) {
      console.error('PUT /api/maps/[slug]/nodes fetch connections', connectionsResult.error);
      return NextResponse.json(
        { error: 'Failed to load existing connections; nodes were not updated.' },
        { status: 500 }
      );
    }
    const connectionRows = connectionsResult.data ?? [];

    await supabase.from('connections').delete().eq('map_id', mapId);
    await supabase.from('nodes').delete().eq('map_id', mapId);
    if (nodes.length > 0) {
      const rows = nodes.map((n) => ({ ...mapNodeToDbNode(n, mapId), id: ensureUuid(n.id) }));
      const { error: insertError } = await supabase.from('nodes').insert(rows);
      if (insertError) {
        console.error('PUT /api/maps/[slug]/nodes insert', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
    if (connectionRows.length > 0) {
      const { error: connError } = await supabase.from('connections').insert(connectionRows);
      if (connError) {
        console.error('PUT /api/maps/[slug]/nodes re-insert connections', connError);
        return NextResponse.json({ error: connError.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, count: nodes.length });
  } catch (err) {
    console.error('PUT /api/maps/[slug]/nodes', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
