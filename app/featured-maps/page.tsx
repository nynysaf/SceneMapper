'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SceneMap } from '../../types';
import { getFeaturedMaps, isAbortError } from '../../lib/data';

export default function FeaturedMapsPage() {
  const [maps, setMaps] = useState<SceneMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ac = new AbortController();
    getFeaturedMaps({ signal: ac.signal })
      .then(setMaps)
      .catch((err) => {
        if (!isAbortError(err)) setMaps([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const handleOpen = (slug: string) => {
    window.location.href = `/maps/${slug}`;
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-white/70 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 text-emerald-900 hover:text-emerald-700">
          <img src="/logo.png" alt="Scene Mapper" className="w-8 h-8 rounded-xl object-cover" />
          <span className="text-sm font-bold">Scene Mapper</span>
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
        >
          ← Home
        </Link>
      </header>

      <main className="flex-1 px-6 py-8 md:px-12 md:py-12">
        <h1 className="text-2xl md:text-3xl font-bold text-emerald-950 mb-2">Featured maps</h1>
        <p className="text-emerald-700 text-sm mb-8">
          Explore maps built by communities.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : maps.length === 0 ? (
          <p className="text-emerald-700">No featured maps yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map((map) => (
              <button
                key={map.id}
                type="button"
                onClick={() => handleOpen(map.slug)}
                className="flex flex-col rounded-2xl overflow-hidden border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-lg transition-all text-left bg-white/80"
              >
                <div className="aspect-video bg-emerald-100/80 flex items-center justify-center overflow-hidden">
                  {map.backgroundImageUrl ? (
                    <img
                      src={map.backgroundImageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-serif text-emerald-400">map</span>
                  )}
                </div>
                <div className="p-4 min-h-[4rem]">
                  <span className="text-base font-semibold text-emerald-900 line-clamp-2 block">
                    {map.title}
                  </span>
                  {map.description && (
                    <span className="text-xs text-emerald-600 line-clamp-2 block mt-1">
                      {map.description}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
