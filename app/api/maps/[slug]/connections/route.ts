import { NextRequest, NextResponse } from 'next/server';
import type { MapConnection } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbConnectionToMapConnection, mapConnectionToDbConnection } from '@/lib/db-mappers';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function ensureUuid(id: string | undefined): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

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
      const rows = connections.map((c) => {
        const row = mapConnectionToDbConnection(c, mapId);
        return { ...row, id: ensureUuid(c.id) };
      });
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
