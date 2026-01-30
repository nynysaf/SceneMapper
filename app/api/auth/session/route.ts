import { NextRequest, NextResponse } from 'next/server';
import type { AuthSession } from '@/types';
import { getSessionCookie } from '@/lib/session-cookie';

/**
 * GET /api/auth/session
 * Returns current session from cookie, or null.
 */
export async function GET(request: NextRequest) {
  const userId = getSessionCookie(request);
  const session: AuthSession | null = userId ? { userId } : null;
  return NextResponse.json(session);
}
