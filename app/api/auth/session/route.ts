import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/session
 * Returns current Supabase Auth user, or null. Compatible with legacy { userId } shape.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      userId: user.id,
      email: user.email ?? '',
      name: user.user_metadata?.name ?? user.email ?? 'User',
    });
  } catch {
    return NextResponse.json(null);
  }
}
