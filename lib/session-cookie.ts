/**
 * Simple cookie-based session for API routes.
 * Cookie name: scene_session. Value: userId.
 */
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'scene_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookieOnResponse(response: NextResponse, userId: string): void {
  response.cookies.set(COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function clearSessionCookieOnResponse(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
