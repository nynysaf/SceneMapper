import { NextRequest, NextResponse } from 'next/server';
import { createClientForRouteHandler } from '@/lib/supabase/route-handler';
import { getSupabase } from '@/lib/supabase-server';
import { resolveInvitedEmails } from '@/lib/resolve-invites';

/**
 * POST /api/auth/signup
 * Body: { name, email, password }. Creates Supabase Auth user and applies
 * invited_admin_emails / invited_collaborator_emails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { supabase, setCookiesOnResponse } = await createClientForRouteHandler(request);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: (name ?? '').trim() || 'Explorer' },
        emailRedirectTo: undefined, // no email confirmation
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const user = data.user;
    if (!user) {
      return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
    }

    // Resolve pending admin/collaborator invitations for this user's email
    await resolveInvitedEmails(getSupabase(), user.id, user.email ?? '');

    const session = {
      userId: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.name ?? user.email ?? 'User',
    };
    const response = NextResponse.json({ ok: true, user: session });
    setCookiesOnResponse(response);
    return response;
  } catch (err) {
    console.error('POST /api/auth/signup', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
