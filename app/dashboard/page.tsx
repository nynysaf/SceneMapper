'use client';

import { useEffect, useState } from 'react';
import Dashboard from '../../components/Dashboard';
import type { User } from '../../types';
import { getUsers, getSession, saveUsers, saveSession, clearSession } from '../../lib/data';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialEditSlug, setInitialEditSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    Promise.all([getUsers(), getSession()])
      .then(([users, session]) => {
        if (!session) return;
        const user = users.find((u) => u.id === session.userId) ?? null;
        setCurrentUser(user);
      })
      .catch(() => setCurrentUser(null));

    try {
      const params = new URLSearchParams(window.location.search);
      setInitialEditSlug(params.get('edit') ?? undefined);
    } catch {
      setInitialEditSlug(undefined);
    }
  }, []);

  const navigate = (path: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = path;
  };

  const handleSignup = async (name: string, email: string, password: string) => {
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
    return { ok: true as const };
  };

  const handleLogin = async (email: string, password: string) => {
    const users = await getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return { ok: false as const, error: 'Invalid email or password.' };
    }

    await saveSession({ userId: user.id });
    setCurrentUser(user);
    return { ok: true as const };
  };

  const handleLogout = () => {
    if (typeof window === 'undefined') return;
    void clearSession();
    setCurrentUser(null);
  };

  return (
    <Dashboard
      onNavigate={navigate}
      currentUser={currentUser}
      onLogout={handleLogout}
      onLogin={handleLogin}
      onSignup={handleSignup}
      initialEditSlug={initialEditSlug}
    />
  );
}
