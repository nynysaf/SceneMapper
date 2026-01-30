import React, { useState } from 'react';
import type { User } from '../types';

/** Example map entry for the landing page. Add thumbnailUrl when you have a link. */
export interface ExampleMapEntry {
  title: string;
  /** Path or full URL to open when the thumbnail is clicked */
  href: string;
  /** Optional thumbnail image URL. Omit for placeholder until you provide a link. */
  thumbnailUrl?: string;
  /** Optional short description */
  description?: string;
}

/** Populate this list when you have map links/thumbnails. */
const EXAMPLE_MAPS: ExampleMapEntry[] = [
  {
    title: 'Torontopia: Solarpunk Commons',
    href: '/maps/torontopia',
    description:
      'An interactive, crowd-sourced map of solarpunk communities, events, spaces, and people in Toronto.',
  },
  // Add more entries when you have links, e.g.:
  // { title: 'Your Map', href: '/maps/your-slug', thumbnailUrl: 'https://...', description: '...' },
];

interface LandingPageProps {
  onNavigate: (path: string) => void;
  currentUser: User | null;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, currentUser }) => {
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
            <>
              <span className="hidden md:inline text-xs text-emerald-800">
                Signed in as <span className="font-semibold">{currentUser.email}</span>
              </span>
              <button
                onClick={() => onNavigate('/dashboard')}
                className="text-sm font-semibold text-emerald-800 px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                Go to dashboard
              </button>
            </>
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

        <section className="flex-1 w-full max-w-md">
          <div className="glass rounded-[2.5rem] p-6 md:p-8 solarpunk-shadow relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-200 rounded-full opacity-40" />
            <div className="absolute -left-12 bottom-0 w-52 h-52 bg-sky-200 rounded-full opacity-40" />

            <div className="relative space-y-4">
              <h3 className="text-lg font-bold text-emerald-950">Featured maps</h3>
              <p className="text-xs text-emerald-700">
                Explore maps built by communities. Add your own and we&apos;ll feature it here when
                you provide a link and thumbnail.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EXAMPLE_MAPS.map((map) => (
                  <button
                    key={map.href + map.title}
                    type="button"
                    onClick={() => handleExampleHref(map.href)}
                    className="flex flex-col rounded-2xl overflow-hidden border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-md transition-all text-left bg-white/60"
                  >
                    <div className="aspect-video bg-emerald-100/80 flex items-center justify-center">
                      {map.thumbnailUrl ? (
                        <img
                          src={map.thumbnailUrl}
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
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
