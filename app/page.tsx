'use client';

import { useEffect, useState } from 'react';
import LandingPage, { FEATURED_MAP_HREFS, slugFromHref } from '../components/LandingPage';
import type { User, SceneMap } from '../types';
import { getUsers, getSession, getMaps, isAbortError } from '../lib/data';

/**
 * Next.js App Router landing page for Scene Mapper.
 *
 * Fetches session and user; when logged in, fetches maps for the "Your Maps" panel.
 */
export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allMaps, setAllMaps] = useState<SceneMap[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ac = new AbortController();
    Promise.all([
      getMaps({ signal: ac.signal }),
      getUsers(),
      getSession(),
    ])
      .then(([maps, users, session]) => {
        setAllMaps(maps);
        if (session) {
          const user = users.find((u) => u.id === session.userId) ?? null;
          setCurrentUser(user);
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setCurrentUser(null);
          setAllMaps([]);
        }
      });
    return () => ac.abort();
  }, []);

  const userMaps = currentUser ? allMaps : [];
  const featuredMaps = FEATURED_MAP_HREFS.map((href) =>
    allMaps.find((m) => m.slug === slugFromHref(href)),
  ).filter((m): m is SceneMap => m != null);

  const handleNavigate = (path: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = path;
  };

  return (
    <LandingPage
      onNavigate={handleNavigate}
      currentUser={currentUser}
      userMaps={userMaps}
      featuredMaps={featuredMaps}
    />
  );
}

