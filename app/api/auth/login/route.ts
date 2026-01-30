import { NextRequest, NextResponse } from 'next/server';
import type { AuthSession } from '@/types';

/**
 * POST /api/auth/login
 * Body: { email, password }. Returns session on success.
 * Replace with Supabase Auth / DB when backend is connected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }
    // TODO: validate against DB, set session cookie, return AuthSession
    const session: AuthSession | null = null;
    if (!session) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    return NextResponse.json(session);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
