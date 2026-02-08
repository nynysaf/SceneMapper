import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPlatformAdminEmail } from '@/lib/auth-api';

/**
 * GET /api/auth/session
 * Returns current Supabase Auth user, or null. Compatible with legacy { userId } shape.
 * Includes platformAdmin when user email is in PLATFORM_ADMIN_EMAILS (default naryan@gmail.com).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(null);
    }

    const email = user.email ?? '';
    return NextResponse.json({
      userId: user.id,
      email,
      name: user.user_metadata?.name ?? email || 'User',
      platformAdmin: isPlatformAdminEmail(email || null),
    });
  } catch {
    return NextResponse.json(null);
  }
}
