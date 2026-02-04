import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbUserToUser } from '@/lib/db-mappers';
import { hashPassword } from '@/lib/password';

/**
 * GET /api/users
 * Returns users from public.users. Deprecated for auth: use Supabase Auth.
 * Kept for local-only mode (NEXT_PUBLIC_USE_BACKEND=false) and potential admin tooling.
 */
export async function GET() {
  try {
    const { data, error } = await supabase.from('users').select('id, email, name').order('email');
    if (error) {
      console.error('GET /api/users', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const users: User[] = (data ?? []).map((row) => ({
      ...dbUserToUser({ ...row, password_hash: '' }),
      password: '', // never expose password
    }));
    return NextResponse.json(users);
  } catch (err) {
    console.error('GET /api/users', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/users
 * Replace all users (data layer contract). Body: User[] with plain passwords.
 * Deprecated for auth. Kept for local-only mode when client calls saveUsers().
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const users: User[] = Array.isArray(body) ? body : [body];
    if (users.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }
    const rows = users.map((u) => ({
      id: u.id || crypto.randomUUID(),
      email: u.email,
      name: u.name ?? '',
      password_hash: hashPassword(u.password),
    }));
    const { error } = await supabase.from('users').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('PUT /api/users', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: users.length });
  } catch (err) {
    console.error('PUT /api/users', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
