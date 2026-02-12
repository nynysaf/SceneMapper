/**
 * Simple cookie-based session for API routes.
 * Cookie name: scene_session. Value: userId.
 *
 * For custom domains with apex + www (e.g. scenemapper.ca and www.scenemapper.ca),
 * set SESSION_COOKIE_DOMAIN=scenemapper.ca so the cookie is shared across both.
 */
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'scene_session';
const MAX_AGE = 60 * 60 * 24 * 365; // 12 months

function getCookieDomain(): string | undefined {
  const domain = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (!domain) return undefined;
  return domain.startsWith('.') ? domain : `.${domain}`;
}

export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookieOnResponse(response: NextResponse, userId: string): void {
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  };
  const domain = getCookieDomain();
  if (domain) options.domain = domain;

  response.cookies.set(COOKIE_NAME, userId, options);
}

export function clearSessionCookieOnResponse(response: NextResponse): void {
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  };
  const domain = getCookieDomain();
  if (domain) options.domain = domain;

  response.cookies.set(COOKIE_NAME, '', options);
}
