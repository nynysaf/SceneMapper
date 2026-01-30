import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/types';

/**
 * GET /api/users
 * Returns all users (or current user when auth is wired).
 * Replace with DB query when backend is connected.
 */
export async function GET() {
  // TODO: fetch from Supabase/DB; with auth, return only current user or list for admin
  const users: User[] = [];
  return NextResponse.json(users);
}

/**
 * POST /api/users
 * Signup: create user. Body: { name, email, password }.
 * Replace with Supabase Auth / DB when backend is connected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }
    // TODO: create user in DB, hash password, return user + session
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
