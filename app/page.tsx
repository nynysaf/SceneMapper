'use client';

import LandingPage from '../components/LandingPage';
import type { User } from '../types';

/**
 * Next.js App Router landing page for Scene Mapper.
 *
 * For now this reproduces the existing single-page landing experience
 * and uses client-side navigation until we fully migrate auth and maps
 * into server components.
 */
export default function HomePage() {
  const currentUser: User | null = null;

  const handleNavigate = (path: string) => {
    if (typeof window === 'undefined') return;
    window.location.href = path;
  };

  return <LandingPage onNavigate={handleNavigate} currentUser={currentUser} />;
}

