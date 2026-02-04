import { NextRequest, NextResponse } from 'next/server';
import { createClientForRouteHandler } from '@/lib/supabase/route-handler';
import { getSupabase } from '@/lib/supabase-server';

/**
 * POST /api/auth/signup
 * Body: { name, email, password }. Creates Supabase Auth user and applies invited_admin_emails.
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

    // Add user to admin_ids for maps where their email is in invited_admin_emails
    const adminSupabase = getSupabase();
    const { data: maps } = await adminSupabase
      .from('maps')
      .select('id, admin_ids, invited_admin_emails');
    const emailLower = user.email?.toLowerCase() ?? '';
    const toUpdate: { id: string; admin_ids: string[] }[] = [];
    for (const m of maps ?? []) {
      const invited = (m.invited_admin_emails ?? []) as string[];
      if (invited.some((e: string) => e.toLowerCase() === emailLower)) {
        const adminIds = (m.admin_ids ?? []) as string[];
        if (!adminIds.includes(user.id)) {
          toUpdate.push({ id: m.id, admin_ids: [...adminIds, user.id] });
        }
      }
    }
    for (const { id, admin_ids } of toUpdate) {
      await adminSupabase.from('maps').update({ admin_ids }).eq('id', id);
    }

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
