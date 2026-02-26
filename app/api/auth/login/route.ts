import { NextRequest, NextResponse } from 'next/server';
import { createClientForRouteHandler } from '@/lib/supabase/route-handler';
import { getSupabase } from '@/lib/supabase-server';
import { resolveInvitedEmails } from '@/lib/resolve-invites';

/**
 * POST /api/auth/login
 * Body: { email, password }. Signs in via Supabase Auth; session stored in cookies.
 * After login, resolves any pending invited_admin_emails / invited_collaborator_emails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { supabase, setCookiesOnResponse } = await createClientForRouteHandler(request);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }

    // Resolve pending admin/collaborator invitations for this user's email
    await resolveInvitedEmails(getSupabase(), user.id, user.email ?? '');

    const session = {
      userId: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.name ?? user.email ?? 'User',
    };
    const response = NextResponse.json({ ok: true, userId: user.id, user: session });
    setCookiesOnResponse(response);
    return response;
  } catch (err) {
    console.error('POST /api/auth/login', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
