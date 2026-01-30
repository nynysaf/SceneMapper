import { NextRequest, NextResponse } from 'next/server';
import type { MapNode } from '@/types';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/maps/[slug]/nodes
 * Returns nodes for a map. Replace with DB query when backend is connected.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  // TODO: fetch nodes from Supabase/DB by map slug
  const nodes: MapNode[] = [];
  return NextResponse.json(nodes);
}

/**
 * PUT /api/maps/[slug]/nodes
 * Replace all nodes for a map. Body: MapNode[].
 * Replace with DB write when backend is connected.
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const nodes = await request.json();
    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Body must be an array of nodes' }, { status: 400 });
    }
    // TODO: validate MapNode[] and persist to Supabase/DB for this map (slug)
    return NextResponse.json({ ok: true, count: nodes.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
