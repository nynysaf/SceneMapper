import { NextRequest, NextResponse } from 'next/server';
import type { SceneMap } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbMapToSceneMap, sceneMapToDbMap } from '@/lib/db-mappers';
import { hashPassword } from '@/lib/password';

/**
 * GET /api/maps
 * Returns all maps from the database.
 */
export async function GET() {
  try {
    const { data, error } = await supabase.from('maps').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('GET /api/maps', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const maps: SceneMap[] = (data ?? []).map(dbMapToSceneMap);
    return NextResponse.json(maps);
  } catch (err) {
    console.error('GET /api/maps', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/maps
 * Create or replace maps. Body: SceneMap[] or single SceneMap.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawMaps = Array.isArray(body) ? body : [body];
    if (rawMaps.length === 0) {
      return NextResponse.json({ error: 'At least one map required' }, { status: 400 });
    }
    const maps: SceneMap[] = rawMaps.map((m: SceneMap & { collaboratorPassword?: string }) => ({
      ...m,
      id: m.id || crypto.randomUUID(),
    }));

    const rows = maps.map((m, i) => {
      const row = sceneMapToDbMap(m);
      const raw = rawMaps[i] as SceneMap & { collaboratorPassword?: string };
      if (raw?.collaboratorPassword != null && raw.collaboratorPassword !== '') {
        return { ...row, collaborator_password_hash: hashPassword(raw.collaboratorPassword) };
      }
      return row;
    });

    const { error } = await supabase.from('maps').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('POST /api/maps', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: maps.length });
  } catch (err) {
    console.error('POST /api/maps', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
