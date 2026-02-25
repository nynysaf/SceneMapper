import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST /api/maps/[slug]/submissions/connections
 * Public submission: insert a single connection with status=pending.
 * No auth required. Only allowed on public_view maps with connections_enabled.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase
      .from('maps')
      .select('id, public_view, connections_enabled')
      .eq('slug', slug)
      .maybeSingle();

    if (mapError || !mapRow) {
      if (mapError) console.error('POST /api/maps/[slug]/submissions/connections map', mapError);
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    if (mapRow.public_view !== true) {
      return NextResponse.json({ error: 'This map does not accept public submissions' }, { status: 403 });
    }

    if (mapRow.connections_enabled === false) {
      return NextResponse.json({ error: 'Connections are disabled for this map' }, { status: 400 });
    }

    const body = await request.json();
    const fromNodeId = typeof body?.fromNodeId === 'string' ? body.fromNodeId.trim() : '';
    const toNodeId = typeof body?.toNodeId === 'string' ? body.toNodeId.trim() : '';

    if (!fromNodeId || !toNodeId) {
      return NextResponse.json({ error: 'fromNodeId and toNodeId are required' }, { status: 400 });
    }

    if (fromNodeId === toNodeId) {
      return NextResponse.json({ error: 'A connection cannot link a node to itself' }, { status: 400 });
    }

    const mapId = mapRow.id;

    const { data: nodes } = await supabase
      .from('nodes')
      .select('id')
      .eq('map_id', mapId)
      .in('id', [fromNodeId, toNodeId]);

    const nodeIds = (nodes ?? []).map((n) => n.id);
    if (!nodeIds.includes(fromNodeId) || !nodeIds.includes(toNodeId)) {
      return NextResponse.json({ error: 'Both nodes must exist on this map' }, { status: 400 });
    }

    const description = typeof body?.description === 'string' ? body.description.trim() : '';

    const collaboratorId = 'Public'; // Public submissions

    const id = crypto.randomUUID();
    const row = {
      id,
      map_id: mapId,
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      description,
      collaborator_id: collaboratorId,
      status: 'pending',
      curve_offset_x: null,
      curve_offset_y: null,
    };

    const { error: insertError } = await supabase.from('connections').insert(row);

    if (insertError) {
      console.error('POST /api/maps/[slug]/submissions/connections insert', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error('POST /api/maps/[slug]/submissions/connections', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
