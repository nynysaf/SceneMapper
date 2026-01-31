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
