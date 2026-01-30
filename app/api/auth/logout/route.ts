import { NextResponse } from 'next/server';
import { clearSessionCookieOnResponse } from '@/lib/session-cookie';

/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookieOnResponse(response);
  return response;
}
