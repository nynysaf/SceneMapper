'use client';

import { use, useEffect, useMemo, useState } from 'react';
import MapExperience from '../../../components/MapExperience';
import type { SceneMap } from '../../../types';
import { getMapBySlug, isAbortError } from '../../../lib/data';

/**
 * Next.js App Router page for individual Scene Mapper maps.
 *
 * This keeps the existing Torontopia behavior while allowing
 * additional maps to be accessed via /maps/:slug.
 */
export default function MapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [map, setMap] = useState<SceneMap | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ac = new AbortController();
    getMapBySlug(slug, { signal: ac.signal })
      .then(setMap)
      .catch((err) => {
        if (!isAbortError(err)) setMap(null);
      });
    return () => ac.abort();
  }, [slug]);

  const { title, subtitle, backgroundImageUrl, theme, description } = useMemo(() => {
    const isTorontopia = slug === 'torontopia';

    if (isTorontopia) {
      return {
        title: 'Torontopia',
        subtitle: 'Solarpunk Commons Map',
        backgroundImageUrl: undefined,
        theme: undefined,
        description:
          'An interactive, crowd-sourced map tracking the emerging solarpunk communities, events, spaces, and people in Toronto.',
      } as const;
    }

    if (map) {
      return {
        title: map.title,
        subtitle: map.description || 'Scene Mapper',
        backgroundImageUrl: map.backgroundImageUrl,
        theme: map.theme,
        description: map.description,
      } as const;
    }

    return {
      title: slug,
      subtitle: 'Scene Mapper',
      backgroundImageUrl: undefined,
      theme: undefined,
      description: undefined,
    } as const;
  }, [slug, map]);

  // Map not found (404 from API) – show message once load has finished
  const mapNotFound = loaded && !map && slug !== 'torontopia';

  if (mapNotFound) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center p-6 text-emerald-950">
        <h1 className="text-xl font-bold text-emerald-900 mb-2">Map not found</h1>
        <p className="text-emerald-800 mb-4 text-center max-w-md">
          There is no map with the address <strong>/maps/{slug}</strong>. It may not exist in this environment yet, or the link may be outdated.
        </p>
        <a
          href="/dashboard"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline"
        >
          Go to Dashboard
        </a>
      </div>
    );
  }

  return (
    <MapExperience
      mapSlug={slug}
      mapTitle={title}
      mapSubtitle={subtitle}
      mapBackgroundImageUrl={backgroundImageUrl}
      mapTheme={theme}
      mapDescription={description}
    />
  );
}
