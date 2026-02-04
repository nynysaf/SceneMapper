import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { getCurrentUserId } from '@/lib/auth-api';
import { verifyPassword } from '@/lib/password';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * POST /api/maps/[slug]/join
 * Body: { password }. Verifies collaborator password and adds current user to collaborator_ids.
 * Requires authentication.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'You need to be logged in to join as a collaborator.' }, { status: 401 });
    }

    const body = await request.json();
    const password = body?.password?.trim?.();
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const { data: mapRow, error: mapError } = await supabase
      .from('maps')
      .select('id, collaborator_password_hash, collaborator_ids')
      .eq('slug', slug)
      .maybeSingle();

    if (mapError || !mapRow) {
      return NextResponse.json({ error: 'Map not found' }, { status: 404 });
    }

    const hash = mapRow.collaborator_password_hash;
    if (!hash) {
      return NextResponse.json({ error: 'This map does not require a collaborator password.' }, { status: 400 });
    }

    if (!verifyPassword(password, hash)) {
      return NextResponse.json({ error: 'Incorrect collaborator password. Please try again.' }, { status: 401 });
    }

    const collaboratorIds = (mapRow.collaborator_ids ?? []) as string[];
    if (collaboratorIds.includes(userId)) {
      return NextResponse.json({ ok: true, message: 'Already a collaborator' });
    }

    const { error: updateError } = await supabase
      .from('maps')
      .update({ collaborator_ids: [...collaboratorIds, userId] })
      .eq('id', mapRow.id);

    if (updateError) {
      console.error('POST /api/maps/[slug]/join', updateError);
      return NextResponse.json({ error: 'Could not add you as collaborator' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/maps/[slug]/join', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
