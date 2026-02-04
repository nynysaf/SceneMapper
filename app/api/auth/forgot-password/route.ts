import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function getBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (appUrl) {
    const url = String(appUrl).trim();
    return url.startsWith('http') ? url.replace(/\/+$/, '') : `https://${url.replace(/\/+$/, '')}`;
  }
  return 'https://scenemapper.ca';
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }. Sends password reset email via Supabase. Always returns success (don't reveal if email exists).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email?.trim?.();
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const supabase = await createClient();
    const redirectTo = `${getBaseUrl()}/account`;
    await supabase.auth.resetPasswordForEmail(email.toLowerCase(), { redirectTo });

    return NextResponse.json({ ok: true, message: 'If an account exists, we\'ve sent a reset link to that email.' });
  } catch (err) {
    console.error('POST /api/auth/forgot-password', err);
    return NextResponse.json({ ok: true }); // Don't reveal errors to avoid email enumeration
  }
}
