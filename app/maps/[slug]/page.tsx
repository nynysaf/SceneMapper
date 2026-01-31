'use client';

import { use, useEffect, useMemo, useState } from 'react';
import MapExperience from '../../../components/MapExperience';
import type { SceneMap, MapNode, MapConnection } from '../../../types';
import { getMapBySlug, getNodes, getConnections, isAbortError } from '../../../lib/data';
import { INITIAL_NODES } from '../../../constants';

/**
 * Next.js App Router page for individual Scene Mapper maps.
 *
 * Tier 2: Fetches map, nodes, connections in parallel at page level.
 * Renders MapExperience shell immediately with loading state.
 */
export default function MapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [map, setMap] = useState<SceneMap | null>(null);
  const [nodes, setNodes] = useState<MapNode[] | null>(null);
  const [connections, setConnections] = useState<MapConnection[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Parallel fetch: map, nodes, connections in one batch (abort on unmount)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLoaded(false);
    const ac = new AbortController();
    const opts = { signal: ac.signal };
    Promise.all([
      getMapBySlug(slug, opts),
      getNodes(slug, opts),
      getConnections(slug, opts),
    ])
      .then(([m, loadedNodes, loadedConnections]) => {
        if (ac.signal.aborted) return;
        setMap(m);
        setNodes(
          loadedNodes.length ? loadedNodes : slug === 'torontopia' ? INITIAL_NODES : []
        );
        setConnections(loadedConnections);
        setLoaded(true);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setMap(null);
          setNodes(slug === 'torontopia' ? INITIAL_NODES : []);
          setConnections([]);
          setLoaded(true);
        }
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

  // Render MapExperience shell immediately; pass data when loaded (Tier 2: show shell first)
  return (
    <MapExperience
      map={map}
      mapSlug={slug}
      mapTitle={title}
      mapSubtitle={subtitle}
      mapBackgroundImageUrl={backgroundImageUrl}
      mapTheme={theme}
      mapDescription={description}
      initialNodes={nodes ?? undefined}
      initialConnections={connections ?? undefined}
      isDataLoading={!loaded}
    />
  );
}
