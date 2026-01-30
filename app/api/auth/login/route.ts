import { NextRequest, NextResponse } from 'next/server';
import type { AuthSession } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { verifyPassword } from '@/lib/password';
import { setSessionCookieOnResponse } from '@/lib/session-cookie';

/**
 * POST /api/auth/login
 * Body: { email, password }. Returns session on success and sets session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error || !userRow) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (!verifyPassword(password, userRow.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const session: AuthSession = { userId: userRow.id };
    const response = NextResponse.json(session);
    setSessionCookieOnResponse(response, userRow.id);
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
