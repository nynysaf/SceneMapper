/**
 * Supabase client for auth Route Handlers (signup, login).
 * Ensures session cookies are written to the Response we return, which is
 * required for cookies to reach the browser in Route Handlers.
 */
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export interface RouteHandlerAuthResult {
  supabase: ReturnType<typeof createServerClient>;
  /** Call this to attach auth cookies to your response before returning */
  setCookiesOnResponse: (response: NextResponse) => void;
}

export async function createClientForRouteHandler(
  request: NextRequest
): Promise<RouteHandlerAuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  const cookiesToSet: { name: string; value: string; options?: object }[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach((c) => cookiesToSet.push(c));
      },
    },
  });

  const setCookiesOnResponse = (response: NextResponse) => {
    cookiesToSet.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, (options as Record<string, unknown>) ?? {})
    );
  };

  return { supabase, setCookiesOnResponse };
}
