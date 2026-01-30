import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears session (e.g. cookie). Replace with real session clear when backend is connected.
 */
export async function POST() {
  // TODO: clear session cookie / invalidate server-side session
  return NextResponse.json({ ok: true });
}
