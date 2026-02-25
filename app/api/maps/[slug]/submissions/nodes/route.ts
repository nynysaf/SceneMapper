import { NextRequest, NextResponse } from 'next/server';
import type { MapNode } from '@/types';
import { NodeType } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { mapNodeToDbNode } from '@/lib/db-mappers';

const VALID_NODE_TYPES = Object.values(NodeType);
const DEFAULT_ENABLED_TYPES = [NodeType.EVENT, NodeType.PERSON, NodeType.SPACE, NodeType.COMMUNITY, NodeType.REGION, NodeType.MEDIA];

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST /api/maps/[slug]/submissions/nodes
 * Public submission: insert a single node with status=pending.
 * No auth required. Only allowed on public_view maps.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const { data: mapRow, error: mapError } = await supabase
      .from('maps')
      .select('id, public_view, enabled_node_types, connections_enabled')
      .eq('slug', slug)
      .maybeSingle();

    if (mapError || !mapRow) {
      if (mapError) console.error('POST /api/maps/[slug]/submissions/nodes map', mapError);
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    if (mapRow.public_view !== true) {
      return NextResponse.json({ error: 'This map does not accept public submissions' }, { status: 403 });
    }

    const enabledTypes =
      mapRow.enabled_node_types && Array.isArray(mapRow.enabled_node_types) && mapRow.enabled_node_types.length > 0
        ? (mapRow.enabled_node_types as string[])
        : DEFAULT_ENABLED_TYPES;

    const body = await request.json();
    const rawType = body?.type;
    const type = typeof rawType === 'string' ? rawType : 'EVENT';
    if (!VALID_NODE_TYPES.includes(type as NodeType)) {
      return NextResponse.json({ error: 'Invalid node type' }, { status: 400 });
    }
    if (!enabledTypes.includes(type)) {
      return NextResponse.json({ error: 'This node type is not enabled for this map' }, { status: 400 });
    }

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const x = Number(body?.x);
    const y = Number(body?.y);
    if (Number.isNaN(x) || Number.isNaN(y) || x < 0 || x > 100 || y < 0 || y > 100) {
      return NextResponse.json({ error: 'Invalid coordinates (x, y must be 0-100)' }, { status: 400 });
    }

    const description = typeof body?.description === 'string' ? body.description.trim() : '';
    let website: string | undefined;
    if (typeof body?.website === 'string' && body.website.trim()) {
      const w = body.website.trim();
      website = w.startsWith('http') ? w : `https://${w}`;
    }
    const tags = Array.isArray(body?.tags) ? (body.tags as string[]).filter((t: unknown) => typeof t === 'string') : [];
    const primaryTag = typeof body?.primaryTag === 'string' ? body.primaryTag : 'other';

    const collaboratorId = 'Public'; // Public submissions; name could be enhanced later

    const node: MapNode = {
      id: crypto.randomUUID(),
      type: type as NodeType,
      title,
      description,
      website,
      x,
      y,
      tags,
      primaryTag,
      collaboratorId,
      status: 'pending',
    };

    const mapId = mapRow.id;
    const row = mapNodeToDbNode(node, mapId);

    const { error: insertError } = await supabase.from('nodes').insert(row);

    if (insertError) {
      console.error('POST /api/maps/[slug]/submissions/nodes insert', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: node.id });
  } catch (err) {
    console.error('POST /api/maps/[slug]/submissions/nodes', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
