'use client';

import { useEffect, useState } from 'react';
import Dashboard from '../../components/Dashboard';
import type { User, SceneMap } from '../../types';
import { getSession, getMaps, clearSession } from '../../lib/data';

export default function DashboardPage() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialMaps, setInitialMaps] = useState<SceneMap[]>([]);
  const [initialEditSlug, setInitialEditSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const editSlug = new URLSearchParams(window.location.search).get('edit') ?? undefined;
    setInitialEditSlug(editSlug);

    Promise.all([getSession(), getMaps()])
      .then(([session, maps]) => {
        const user = session
          ? {
              id: session.userId,
              email: session.email ?? '',
              name: session.name ?? 'User',
              password: '',
            }
          : null;
        setCurrentUser(user);
        setInitialMaps(maps);
      })
      .catch(() => {
        setCurrentUser(null);
        setInitialMaps([]);
      })
      .finally(() => setSessionLoading(false));
  }, []);

  const navigate = (path: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = path;
  };

  const handleSignup = async (name: string, email: string, password: string) => {
    const useBackend = process.env.NEXT_PUBLIC_USE_BACKEND === 'true';

    if (useBackend) {
      try {
        const r = await fetch('/api/auth/signup', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() || 'Explorer', email: email.trim(), password }),
        });
        const data = await r.json();
        if (!r.ok) {
          return { ok: false as const, error: (data as { error?: string }).error || 'Signup failed' };
        }
        const user = (data as { user?: { userId: string; email: string; name: string } }).user;
        if (user) setCurrentUser({ id: user.userId, email: user.email, name: user.name, password: '' });
        navigate('/');
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: 'Network error. Please try again.' };
      }
    }

    const { getUsers, saveUsers, saveSession } = await import('../../lib/data');
    const users = await getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return { ok: false as const, error: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: Math.random().toString(36).slice(2),
      email,
      name,
      password,
    };

    await saveUsers([...users, newUser]);
    await saveSession({ userId: newUser.id });
    setCurrentUser(newUser);
    navigate('/');
    return { ok: true as const };
  };

  const handleLogin = async (email: string, password: string) => {
    const useBackend = process.env.NEXT_PUBLIC_USE_BACKEND === 'true';

    if (useBackend) {
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await r.json();
        if (!r.ok) {
          return { ok: false as const, error: (data as { error?: string }).error || 'Invalid email or password.' };
        }
        const user = (data as { user?: { userId: string; email: string; name: string } }).user;
        if (user) setCurrentUser({ id: user.userId, email: user.email, name: user.name, password: '' });
        navigate('/');
        return { ok: true as const };
      } catch {
        return { ok: false as const, error: 'Network error. Please try again.' };
      }
    }

    const { getUsers, saveSession } = await import('../../lib/data');
    const users = await getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return { ok: false as const, error: 'Invalid email or password.' };
    }

    await saveSession({ userId: user.id });
    setCurrentUser(user);
    navigate('/');
    return { ok: true as const };
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    void clearSession();
    setCurrentUser(null);
  };

  if (sessionLoading) {
    return (
      <div className="w-screen h-screen bg-[#fdfcf0] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-emerald-800">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <Dashboard
      onNavigate={navigate}
      currentUser={currentUser}
      onLogout={handleLogout}
      onLogin={handleLogin}
      onSignup={handleSignup}
      showForgotPassword={process.env.NEXT_PUBLIC_USE_BACKEND === 'true'}
      initialEditSlug={initialEditSlug}
      initialMaps={initialMaps}
    />
  );
}
