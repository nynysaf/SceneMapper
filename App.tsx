import React, { useEffect, useState } from 'react';
import MapExperience from './components/MapExperience';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import type { User } from './types';
import { getUsers, getSession, saveUsers, saveSession, clearSession } from './lib/data';

type Route =
  | { page: 'landing' }
  | { page: 'map'; slug: string }
  | { page: 'dashboard' };

const parseLocation = (pathname: string): Route => {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/') {
    return { page: 'landing' };
  }

  if (normalized === '/dashboard') {
    return { page: 'dashboard' };
  }

  if (normalized.startsWith('/maps/')) {
    const slug = normalized.slice('/maps/'.length) || 'torontopia';
    return { page: 'map', slug };
  }

  return { page: 'landing' };
};

/**
 * App Shell with minimal client-side routing.
 *
 * Routes:
 * - `/`           → Scene Mapper landing page
 * - `/maps/:slug` → Map experience (Torontopia or future maps)
 * - `/dashboard`  → User dashboard
 */
const App: React.FC = () => {
  const [route, setRoute] = useState<Route>(() =>
    typeof window !== 'undefined' ? parseLocation(window.location.pathname) : { page: 'landing' },
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    Promise.all([getUsers(), getSession()])
      .then(([users, session]) => {
        if (!session) return;
        const user = users.find((u) => u.id === session.userId) ?? null;
        setCurrentUser(user);
      })
      .catch(() => setCurrentUser(null));

    const handlePopState = () => {
      setRoute(parseLocation(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (typeof window === 'undefined') return;
    if (path === window.location.pathname) return;
    window.history.pushState({}, '', path);
    setRoute(parseLocation(path));
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
    void clearSession();
    setCurrentUser(null);
  };

  if (route.page === 'dashboard') {
    return (
      <Dashboard
        onNavigate={navigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    );
  }

  if (route.page === 'map') {
    const isTorontopia = route.slug === 'torontopia';
    return (
      <MapExperience
        mapSlug={route.slug}
        mapTitle={isTorontopia ? 'Torontopia' : route.slug}
        mapSubtitle={isTorontopia ? 'Solarpunk Commons Map' : 'Scene Mapper'}
      />
    );
  }

  return <LandingPage onNavigate={navigate} currentUser={currentUser} />;
};

export default App;
