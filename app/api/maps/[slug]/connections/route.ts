import { NextRequest, NextResponse } from 'next/server';
import type { MapConnection } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbConnectionToMapConnection, mapConnectionToDbConnection } from '@/lib/db-mappers';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/maps/[slug]/connections
 * Returns connections for the map identified by slug.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase.from('maps').select('id').eq('slug', slug).maybeSingle();
    if (mapError || !mapRow) {
      if (mapError) console.error('GET /api/maps/[slug]/connections map', mapError);
      return NextResponse.json([], { status: 200 });
    }
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .eq('map_id', mapRow.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('GET /api/maps/[slug]/connections', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const connections: MapConnection[] = (data ?? []).map(dbConnectionToMapConnection);
    return NextResponse.json(connections);
  } catch (err) {
    console.error('GET /api/maps/[slug]/connections', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/maps/[slug]/connections
 * Replace all connections for the map. Body: MapConnection[].
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase.from('maps').select('id').eq('slug', slug).maybeSingle();
    if (mapError || !mapRow) {
      if (mapError) console.error('PUT /api/maps/[slug]/connections map', mapError);
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }
    const mapId = mapRow.id;

    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be an array of connections' }, { status: 400 });
    }
    const connections: MapConnection[] = body;

    await supabase.from('connections').delete().eq('map_id', mapId);
    if (connections.length > 0) {
      const rows = connections.map((c) => mapConnectionToDbConnection(c, mapId));
      const { error: insertError } = await supabase.from('connections').insert(rows);
      if (insertError) {
        console.error('PUT /api/maps/[slug]/connections insert', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, count: connections.length });
  } catch (err) {
    console.error('PUT /api/maps/[slug]/connections', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
