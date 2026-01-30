import { NextResponse } from 'next/server';
import type { AuthSession } from '@/types';

/**
 * GET /api/auth/session
 * Returns current session (e.g. from cookie or Authorization header).
 * Replace with real session lookup when backend is connected.
 */
export async function GET() {
  // TODO: read session from cookie/JWT and validate against DB
  const session: AuthSession | null = null;
  return NextResponse.json(session);
}
