import { NextRequest, NextResponse } from 'next/server';
import type { MapNode } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbNodeToMapNode, mapNodeToDbNode } from '@/lib/db-mappers';

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
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase.from('maps').select('id').eq('slug', slug).maybeSingle();
    if (mapError || !mapRow) {
      if (mapError) console.error('PUT /api/maps/[slug]/nodes map', mapError);
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }
    const mapId = mapRow.id;

    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array of nodes' }, { status: 400 });
    }
    const nodes: MapNode[] = body;

    await supabase.from('nodes').delete().eq('map_id', mapId);
    if (nodes.length > 0) {
      const rows = nodes.map((n) => mapNodeToDbNode(n, mapId));
      const { error: insertError } = await supabase.from('nodes').insert(rows);
      if (insertError) {
        console.error('PUT /api/maps/[slug]/nodes insert', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, count: nodes.length });
  } catch (err) {
    console.error('PUT /api/maps/[slug]/nodes', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
