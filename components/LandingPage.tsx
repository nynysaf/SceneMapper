import React, { useState } from 'react';
import Link from 'next/link';
import type { User, SceneMap } from '../types';

/**
 * Featured map links. Add map URLs here to feature them on the home page.
 * Links open in public view; users with access see collaborator/admin features when logged in.
 * Format: /maps/slug or https://scenemapper.ca/maps/slug
 */
export const FEATURED_MAP_HREFS: string[] = [
  '/maps/torontopia',
  '/maps/emerging-scene-toronto',
  // Add more when you have links, e.g.: '/maps/another-map',
];

export function slugFromHref(href: string): string {
  const match = href.match(/\/maps\/([^/?#]+)/);
  return match ? match[1] : href;
}

function roleForMap(map: SceneMap, user: User | null): 'Admin' | 'Collaborator' | 'Viewed' {
  if (!user) return 'Viewed';
  if (map.adminIds?.includes(user.id)) return 'Admin';
  if (map.collaboratorIds?.includes(user.id)) return 'Collaborator';
  return 'Viewed';
}

interface LandingPageProps {
  onNavigate: (path: string) => void;
  currentUser: User | null;
  userMaps?: SceneMap[];
  /** Maps to show in the Featured section (up to 6 on home). */
  featuredMaps?: SceneMap[];
  /** When true, show a "More" button linking to /featured-maps. */
  showMoreFeatured?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, currentUser, userMaps = [], featuredMaps = [], showMoreFeatured = false }) => {
  const [logoError, setLogoError] = useState(false);

  const handleExampleHref = (href: string) => {
    if (href.startsWith('http')) {
      window.open(href, '_blank');
    } else {
      onNavigate(href);
    }
  };

  return (
    <div className="w-screen min-h-screen bg-[#fdfcf0] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {!logoError ? (
            <img
              src="/logo.png"
              alt="Scene Mapper"
              className="w-10 h-10 rounded-xl object-cover solarpunk-shadow"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg solarpunk-shadow">
              SM
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-emerald-900">Scene Mapper</h1>
            <p className="text-xs text-emerald-700 font-medium">
              Collaborative maps for living communities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <button
              onClick={() => onNavigate('/account')}
              className="hidden md:inline text-xs text-emerald-800 hover:underline text-left"
            >
              Signed in as <span className="font-semibold">{currentUser.email}</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/dashboard')}
              className="text-sm font-semibold text-emerald-800 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Log in / Create account
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row px-6 md:px-16 py-8 gap-10 items-center">
        <section className="flex-1 max-w-xl space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-emerald-950 leading-tight">
            Map the people, spaces, and stories that compose your scene.
          </h2>
          <p className="text-emerald-800 text-sm md:text-base leading-relaxed">
            Scene Mapper lets communities create living visual maps of their worlds – helping a
            scene to see itself in a new way. Start a new map, invite collaborators, and let the
            public contribute nodes and connections.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('/dashboard')}
              className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-semibold text-sm solarpunk-shadow hover:bg-emerald-700 transition-colors"
            >
              Create a map
            </button>
            <button
              onClick={() => onNavigate('/why-scene-mapping')}
              className="glass px-5 py-3 rounded-2xl font-semibold text-sm text-emerald-900 hover:bg-white/90 transition-colors"
            >
              Why scene mapping?
            </button>
          </div>
          <p className="text-xs text-emerald-700 max-w-md">
            No sign-up required to explore or contribute. Log in to create a map.
          </p>
        </section>

        <section className="flex-1 w-full max-w-md space-y-6">
          {currentUser && (
            <div className="glass rounded-[2.5rem] p-6 md:p-8 solarpunk-shadow relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200 rounded-full opacity-40" />
              <div className="absolute -left-12 bottom-0 w-52 h-52 bg-sky-200 rounded-full opacity-40" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-emerald-950">Your maps</h3>
                  <button
                    onClick={() => onNavigate('/dashboard')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                  >
                    Create map
                  </button>
                </div>
                {userMaps.length === 0 ? (
                  <p className="text-sm text-emerald-700">
                    You haven&apos;t created any maps yet.{' '}
                    <button
                      onClick={() => onNavigate('/dashboard')}
                      className="font-semibold text-emerald-800 hover:underline"
                    >
                      Create your first map
                    </button>
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...userMaps]
                      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
                      .map((map) => (
                        <button
                          key={map.id}
                          type="button"
                          onClick={() => onNavigate(`/maps/${map.slug}`)}
                          className="flex flex-col rounded-2xl overflow-hidden border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-left bg-white/60"
                        >
                          <div className="aspect-video bg-emerald-100/80 flex items-center justify-center overflow-hidden">
                            {map.backgroundImageUrl ? (
                              <img
                                src={map.backgroundImageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl font-serif text-emerald-400">map</span>
                            )}
                          </div>
                          <div className="p-2 min-h-[3rem]">
                            <span className="text-xs font-semibold text-emerald-900 line-clamp-2">
                              {map.title}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                              {roleForMap(map, currentUser)}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass rounded-[2.5rem] p-6 md:p-8 solarpunk-shadow relative overflow-hidden bg-amber-50/20">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-200 rounded-full opacity-50" />
            <div className="absolute -left-12 bottom-0 w-52 h-52 bg-sky-300 rounded-full opacity-35" />

            <div className="relative space-y-4">
              <h3 className="text-lg font-bold text-emerald-950">Featured maps</h3>
              <p className="text-xs text-emerald-700">
                Explore maps built by communities.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {featuredMaps.length === 0 ? (
                  <p className="text-sm text-emerald-700 col-span-2 sm:col-span-3">
                    No featured maps yet.
                  </p>
                ) : (
                  featuredMaps.map((map) => (
                    <button
                      key={map.id}
                      type="button"
                      onClick={() => handleExampleHref(`/maps/${map.slug}`)}
                      className="flex flex-col rounded-2xl overflow-hidden border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-left bg-white/60"
                    >
                      <div className="aspect-video bg-emerald-100/80 flex items-center justify-center overflow-hidden">
                        {map.backgroundImageUrl ? (
                          <img
                            src={map.backgroundImageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-serif text-emerald-400">map</span>
                        )}
                      </div>
                      <div className="p-2 min-h-[3rem]">
                        <span className="text-xs font-semibold text-emerald-900 line-clamp-2">
                          {map.title}
                        </span>
                        {map.description && (
                          <span className="text-[10px] text-emerald-600 line-clamp-2 block mt-0.5">
                            {map.description}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              {showMoreFeatured && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('/featured-maps')}
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    More featured maps →
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 md:px-16 py-12 border-t border-emerald-100 bg-white/40">
        <p className="text-emerald-800 text-sm md:text-base leading-relaxed max-w-2xl">
          Take your scene & network mapping to the next level:{' '}
          <Link
            href="/contact"
            className="font-semibold text-emerald-700 hover:text-emerald-900 underline"
          >
            contact our guild
          </Link>
          {' '}for workshops, consulting, and custom software.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
