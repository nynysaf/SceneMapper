'use client';

import { useEffect, useState } from 'react';
import LandingPage from '../components/LandingPage';
import type { User, SceneMap } from '../types';
import { getSession, getMaps, getFeaturedMaps, isAbortError } from '../lib/data';

/**
 * Next.js App Router landing page for Scene Mapper.
 *
 * Fetches session and user; when logged in, fetches maps for the "Your Maps" panel.
 * Featured maps come from getFeaturedMaps() (DB); up to 6 with featuredActive shown on home, "More" links to /featured-maps.
 */
export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allMaps, setAllMaps] = useState<SceneMap[]>([]);
  const [featuredMapsAll, setFeaturedMapsAll] = useState<SceneMap[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ac = new AbortController();
    const opts = { signal: ac.signal };
    Promise.all([getMaps(opts), getSession(), getFeaturedMaps(opts)])
      .then(([maps, session, featured]) => {
        setAllMaps(maps);
        setFeaturedMapsAll(featured);
        if (session) {
          setCurrentUser({
            id: session.userId,
            email: session.email ?? '',
            name: session.name ?? 'User',
            password: '',
          });
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setCurrentUser(null);
          setAllMaps([]);
          setFeaturedMapsAll([]);
        }
      });
    return () => ac.abort();
  }, []);

  const userMaps = currentUser ? allMaps : [];
  const featuredForHome = featuredMapsAll.filter((m) => m.featuredActive !== false).slice(0, 6);
  const showMoreFeatured = featuredMapsAll.length > 6;

  const handleNavigate = (path: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = path;
  };

  return (
    <LandingPage
      onNavigate={handleNavigate}
      currentUser={currentUser}
      userMaps={userMaps}
      featuredMaps={featuredForHome}
      showMoreFeatured={showMoreFeatured}
    />
  );
}

