import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase-server';
import { dbUserToUser } from '@/lib/db-mappers';
import { hashPassword } from '@/lib/password';
import { setSessionCookieOnResponse } from '@/lib/session-cookie';

/**
 * GET /api/users
 * Returns all users (for now; with auth you might return only current user).
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
 * POST /api/users
 * Signup: create user. Body: { name, email, password }. Returns created user and sets session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 });
    }

    const password_hash = hashPassword(password);
    const { data, error } = await supabase
      .from('users')
      .insert({ email, name: name ?? '', password_hash })
      .select('id, email, name')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
      console.error('POST /api/users', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const user: User = {
      id: data.id,
      email: data.email,
      name: data.name ?? '',
      password: '',
    };
    const res = NextResponse.json({ ok: true, user });
    setSessionCookieOnResponse(res, data.id);
    return res;
  } catch (err) {
    console.error('POST /api/users', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * PUT /api/users
 * Replace all users (data layer contract). Body: User[] with plain passwords.
 * Hashes passwords and upserts. Used when NEXT_PUBLIC_USE_BACKEND and client calls saveUsers().
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
