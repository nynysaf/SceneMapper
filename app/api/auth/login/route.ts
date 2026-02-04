import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/login
 * Body: { email, password }. Signs in via Supabase Auth; session stored in cookies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabase = await createClient();
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

    const session = {
      userId: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.name ?? user.email ?? 'User',
    };
    return NextResponse.json({ ok: true, userId: user.id, user: session });
  } catch (err) {
    console.error('POST /api/auth/login', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
