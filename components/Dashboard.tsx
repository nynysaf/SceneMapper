import React, { useState, useEffect } from 'react';
import type { User, SceneMap, MapTheme } from '../types';
import { NodeType } from '../types';
import { getMaps, saveMaps, copyNodesToSlug, saveNodes } from '../lib/data';
import { Trash2, Link2, QrCode } from 'lucide-react';

interface DashboardProps {
  onNavigate: (path: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onLogin: (email: string, password: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onSignup: (name: string, email: string, password: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  /**
   * Optional slug used to pre-open a map in edit mode when
   * navigating from a map back to the dashboard.
   */
  initialEditSlug?: string;
}

const THEME_PRESETS: { id: string; label: string; description: string; theme: MapTheme }[] = [
  {
    id: 'solarpunk-emerald',
    label: 'Solarpunk Emerald',
    description: 'Bright greens, warm neutrals – like nature on M',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#047857',
      accentColor: '#22c55e',
      backgroundColor: '#fdfcf0',
      fontBody: 'system-ui, sans-serif',
      fontDisplay: '"Playfair Display", serif',
      categoryColors: {
        [NodeType.EVENT]: '#F97316',
        [NodeType.PERSON]: '#FACC15',
        [NodeType.SPACE]: '#34D399',
        [NodeType.COMMUNITY]: '#38BDF8',
      },
    },
  },
  {
    id: 'night-orbit',
    label: 'Night Orbit',
    description: 'Deep blues with neon accents for nightlife scenes.',
    theme: {
      primaryColor: '#0f172a',
      secondaryColor: '#1e293b',
      accentColor: '#38bdf8',
      backgroundColor: '#020617',
      fontBody: 'system-ui, sans-serif',
      fontDisplay: '"Space Grotesk", system-ui, sans-serif',
      categoryColors: {
        [NodeType.EVENT]: '#38BDF8',
        [NodeType.PERSON]: '#F97316',
        [NodeType.SPACE]: '#22C55E',
        [NodeType.COMMUNITY]: '#E5E7EB',
      },
    },
  },
  {
    id: 'paper-zine',
    label: 'Paper Zine',
    description: 'Warm off-whites and ink blacks for DIY zine vibes.',
    theme: {
      primaryColor: '#111827',
      secondaryColor: '#4b5563',
      accentColor: '#f97316',
      backgroundColor: '#fffbeb',
      fontBody: '"Inter", system-ui, sans-serif',
      fontDisplay: '"Playfair Display", serif',
      categoryColors: {
        [NodeType.EVENT]: '#B91C1C',
        [NodeType.PERSON]: '#7C2D12',
        [NodeType.SPACE]: '#15803D',
        [NodeType.COMMUNITY]: '#1D4ED8',
      },
    },
  },
  {
    id: 'neon-circuit',
    label: 'Neon Circuit',
    description: 'High-contrast magentas and teals for cyberpunk or club scenes.',
    theme: {
      primaryColor: '#BE185D',
      secondaryColor: '#4C1D95',
      accentColor: '#14F4C9',
      backgroundColor: '#020617',
      fontBody: '"Space Grotesk", system-ui, sans-serif',
      fontDisplay: '"Playfair Display", serif',
      categoryColors: {
        [NodeType.EVENT]: '#F97316',
        [NodeType.PERSON]: '#E11D48',
        [NodeType.SPACE]: '#22C55E',
        [NodeType.COMMUNITY]: '#38BDF8',
      },
    },
  },
  {
    id: 'forest-commons',
    label: 'Forest Commons',
    description: 'Deep greens and earth tones for ecological or rural scenes.',
    theme: {
      primaryColor: '#166534',
      secondaryColor: '#14532D',
      accentColor: '#FBBF24',
      backgroundColor: '#ECFDF5',
      fontBody: '"Inter", system-ui, sans-serif',
      fontDisplay: '"Playfair Display", serif',
      categoryColors: {
        [NodeType.EVENT]: '#92400E',
        [NodeType.PERSON]: '#0EA5E9',
        [NodeType.SPACE]: '#16A34A',
        [NodeType.COMMUNITY]: '#065F46',
      },
    },
  },
];

const DEFAULT_THEME = THEME_PRESETS[0];

const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  currentUser,
  onLogout,
  onLogin,
  onSignup,
  initialEditSlug,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [maps, setMaps] = useState<SceneMap[]>([]);
  const [mapTitle, setMapTitle] = useState('');
  const [mapSlug, setMapSlug] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(DEFAULT_THEME.id);
  const [collaboratorPassword, setCollaboratorPassword] = useState('');
  const [invitedAdmins, setInvitedAdmins] = useState('');
  const [invitedCollaborators, setInvitedCollaborators] = useState('');
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingOriginalSlug, setEditingOriginalSlug] = useState<string | null>(null);
  const [customEventColor, setCustomEventColor] = useState<string>(
    DEFAULT_THEME.theme.categoryColors?.[NodeType.EVENT] || '#E67E22',
  );
  const [customPersonColor, setCustomPersonColor] = useState<string>(
    DEFAULT_THEME.theme.categoryColors?.[NodeType.PERSON] || '#F1C40F',
  );
  const [customSpaceColor, setCustomSpaceColor] = useState<string>(
    DEFAULT_THEME.theme.categoryColors?.[NodeType.SPACE] || '#8BA888',
  );
  const [customCommunityColor, setCustomCommunityColor] = useState<string>(
    DEFAULT_THEME.theme.categoryColors?.[NodeType.COMMUNITY] || '#3498DB',
  );
  const [baseThemeId, setBaseThemeId] = useState<string>(DEFAULT_THEME.id);
  const [mapListSort, setMapListSort] = useState<'name-asc' | 'name-desc'>('name-asc');
  const [copiedMapId, setCopiedMapId] = useState<string | null>(null);
  const [qrMapSlug, setQrMapSlug] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const copyMapLink = (map: SceneMap) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/maps/${map.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedMapId(map.id);
      setTimeout(() => setCopiedMapId(null), 2000);
    });
  };

  const sortedMaps = React.useMemo(() => {
    const copy = [...maps];
    copy.sort((a, b) => {
      const cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      return mapListSort === 'name-asc' ? cmp : -cmp;
    });
    return copy;
  }, [maps, mapListSort]);

  // Hydrate maps from data layer
  useEffect(() => {
    getMaps()
      .then(setMaps)
      .catch(() => setMaps([]));
  }, []);

  // If we arrive with an ?edit=slug query, populate the form for that map
  useEffect(() => {
    if (!initialEditSlug || maps.length === 0 || editingMapId) return;
    const match = maps.find((m) => m.slug === initialEditSlug);
    if (!match) return;

    setEditingMapId(match.id);
    setEditingOriginalSlug(match.slug);
    setMapTitle(match.title);
    setMapSlug(match.slug);
    setMapDescription(match.description);
    setSelectedThemeId(match.themeId || DEFAULT_THEME.id);
    setCollaboratorPassword(match.collaboratorPassword || '');
    setInvitedAdmins((match.invitedAdminEmails || []).join(', '));
    setInvitedCollaborators((match.invitedCollaboratorEmails || []).join(', '));
    setBackgroundFile(null);
    setBackgroundError(null);
    setMapError(null);
    const presetForMap = THEME_PRESETS.find((p) => p.id === match.themeId);
    const themeToUse = match.theme || presetForMap?.theme || DEFAULT_THEME.theme;
    setBaseThemeId(match.themeId || DEFAULT_THEME.id);
    if (themeToUse.categoryColors) {
      setCustomEventColor(themeToUse.categoryColors[NodeType.EVENT] || customEventColor);
      setCustomPersonColor(themeToUse.categoryColors[NodeType.PERSON] || customPersonColor);
      setCustomSpaceColor(themeToUse.categoryColors[NodeType.SPACE] || customSpaceColor);
      setCustomCommunityColor(themeToUse.categoryColors[NodeType.COMMUNITY] || customCommunityColor);
    }
  }, [initialEditSlug, maps, editingMapId]);

  const persistMaps = (next: SceneMap[]) => {
    setMaps(next);
    void saveMaps(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (mode === 'signup') {
      const result = await Promise.resolve(onSignup(name.trim() || 'Explorer', email.trim(), password));
      if (!result.ok) {
        setAuthError(result.error || 'Could not create account.');
        return;
      }
      setName('');
      setPassword('');
    } else {
      const result = await Promise.resolve(onLogin(email.trim(), password));
      if (!result.ok) {
        setAuthError(result.error || 'Could not log in.');
        return;
      }
      setPassword('');
    }
  };

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'new-map';

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Could not read file'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('File read error'));
      reader.readAsDataURL(file);
    });

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapError(null);
    setBackgroundError(null);

    if (!currentUser) {
      setMapError('You need an account to create and save maps.');
      return;
    }

    const title = mapTitle.trim() || 'Untitled map';
    const slug = (mapSlug.trim() || slugify(title)).toLowerCase();

    const exists = maps.some((m) => m.slug === slug);
    if (exists && (!editingMapId || maps.find((m) => m.slug === slug)?.id !== editingMapId)) {
      setMapError('A map with this URL already exists. Try a different slug.');
      return;
    }

    let backgroundImageUrl: string | undefined;
    if (backgroundFile) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      const maxBytes = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(backgroundFile.type)) {
        setBackgroundError('Use PNG, JPG, or WebP for the background image.');
        return;
      }
      if (backgroundFile.size > maxBytes) {
        setBackgroundError('Background image is too large. Maximum size is 5MB.');
        return;
      }

      try {
        backgroundImageUrl = await readFileAsDataUrl(backgroundFile);
      } catch {
        setBackgroundError('Could not read background image. Please try again.');
        return;
      }
    }

    const selectedPreset =
      THEME_PRESETS.find((preset) => preset.id === selectedThemeId) ?? DEFAULT_THEME;

    const selectedTheme: MapTheme = {
      ...selectedPreset.theme,
      categoryColors: {
        [NodeType.EVENT]: customEventColor,
        [NodeType.PERSON]: customPersonColor,
        [NodeType.SPACE]: customSpaceColor,
        [NodeType.COMMUNITY]: customCommunityColor,
      },
    };

    const parseEmails = (value: string): string[] =>
      value
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

    const baseFields: Partial<SceneMap> = {
      slug,
      title,
      description: mapDescription.trim(),
      theme: selectedTheme,
      collaboratorPassword: collaboratorPassword.trim() || undefined,
      publicView: true,
      themeId: selectedThemeId === baseThemeId ? selectedPreset.id : 'custom',
      invitedAdminEmails: parseEmails(invitedAdmins),
      invitedCollaboratorEmails: parseEmails(invitedCollaborators),
    };

    if (backgroundImageUrl !== undefined) {
      baseFields.backgroundImageUrl = backgroundImageUrl;
    }

    let nextMaps: SceneMap[];
    let targetMapId = editingMapId;

    if (editingMapId) {
      nextMaps = maps.map((m) =>
        m.id === editingMapId
          ? {
              ...m,
              ...baseFields,
            }
          : m,
      );
    } else {
      const newMap: SceneMap = {
        id: Math.random().toString(36).slice(2),
        slug,
        title,
        description: baseFields.description || '',
        backgroundImageUrl: baseFields.backgroundImageUrl,
        theme: baseFields.theme || selectedTheme,
        collaboratorPassword: baseFields.collaboratorPassword,
        adminIds: [currentUser.id],
        collaboratorIds: [],
        publicView: true,
        themeId: baseFields.themeId,
        invitedAdminEmails: baseFields.invitedAdminEmails,
        invitedCollaboratorEmails: baseFields.invitedCollaboratorEmails,
      };
      nextMaps = [...maps, newMap];
      targetMapId = newMap.id;
    }
    persistMaps(nextMaps);

    // Initialize or migrate node collection for this map
    const oldSlug = editingOriginalSlug && editingMapId ? editingOriginalSlug : null;
    if (oldSlug && oldSlug !== slug) {
      void copyNodesToSlug(oldSlug, slug);
    } else if (!editingMapId) {
      void saveNodes(slug, []).catch(() => {});
    }

    setMapTitle('');
    setMapSlug('');
    setMapDescription('');
    setSelectedThemeId(DEFAULT_THEME.id);
    setCollaboratorPassword('');
    setInvitedAdmins('');
    setInvitedCollaborators('');
    setBackgroundFile(null);
    setEditingMapId(null);
    setEditingOriginalSlug(null);

    // Jump straight into the map we just created or edited
    onNavigate(`/maps/${slug}`);
  };
  return (
    <div className="w-screen h-screen bg-[#fdfcf0] flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-white/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-emerald-900 hover:text-emerald-700"
          >
            {logoError ? (
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm solarpunk-shadow">
                SM
              </div>
            ) : (
              <img
                src="/logo.png"
                alt="Scene Mapper"
                className="w-8 h-8 rounded-xl object-cover solarpunk-shadow"
                onError={() => setLogoError(true)}
              />
            )}
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold">Scene Mapper</span>
              <span className="text-[10px] text-emerald-700 font-medium">Dashboard</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-emerald-800">
          {currentUser ? (
            <>
              <span className="hidden md:inline">
                Signed in as <span className="font-semibold">{currentUser.email}</span>
              </span>
              <button
                onClick={onLogout}
                className="px-3 py-1 rounded-full bg-emerald-100 font-semibold hover:bg-emerald-200 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <span className="px-3 py-1 rounded-full bg-emerald-100 font-semibold">
              Guest • Sign up to save maps
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row px-6 md:px-12 py-8 gap-8">
        <section className="flex-1 max-w-xl space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-emerald-950">
            {editingMapId ? 'Edit your map' : 'Map your scene, your way.'}
          </h2>
          {!editingMapId && (
            <p className="text-sm text-emerald-800 leading-relaxed">
              Build your map to inspire your scene. Get the vibes right and the map will find a life
              of its own.
              <ul className="list-disc list-inside space-y-2 mt-3 text-emerald-800">
                <li>
                  Find a playful <strong>name</strong> that is recognizably &apos;your scene&apos;
                </li>
                <li>
                  <strong>Describe</strong> your attractor – what is the thing that connects the elements on
                  your map? A resonant description helps contributors know what fits and what
                  doesn&apos;t.
                </li>
                <li>
                  Your <strong>background image</strong> is a visual metaphor that adds meaning to the
                  floating dots. The vibe of the image should match the vibe of your scene. Ask a
                  local artist or AI to create something that matches your vision.
                </li>
              </ul>
            </p>
          )}
          {currentUser && maps.length > 0 && (
            <div className="p-4 rounded-2xl glass max-w-md space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                  YOUR MAPS
                </h4>
                {maps.length > 1 && (
                  <select
                    className="text-[10px] font-medium text-emerald-800 bg-white/70 border border-emerald-100 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-400"
                    value={mapListSort}
                    onChange={(e) => setMapListSort(e.target.value as 'name-asc' | 'name-desc')}
                  >
                    <option value="name-asc">Name A–Z</option>
                    <option value="name-desc">Name Z–A</option>
                  </select>
                )}
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {sortedMaps.map((map) => (
                  <div
                    key={map.id}
                    className="w-full flex items-start justify-between gap-2 text-left px-3 py-2 rounded-xl bg-white/60 hover:bg-emerald-50 border border-emerald-100"
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate(`/maps/${map.slug}`)}
                      className="flex-1 text-left"
                    >
                      <p className="text-xs font-semibold text-emerald-900">{map.title}</p>
                      {map.description && (
                        <p className="text-[10px] text-emerald-700 line-clamp-2">
                          {map.description}
                        </p>
                      )}
                      <p className="text-[10px] text-emerald-600 mt-1">
                        /maps/{map.slug}
                      </p>
                    </button>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                          map.adminIds.includes(currentUser.id)
                            ? 'bg-emerald-100 text-emerald-800'
                            : map.collaboratorIds.includes(currentUser.id)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {map.adminIds.includes(currentUser.id)
                          ? 'Admin'
                          : map.collaboratorIds.includes(currentUser.id)
                            ? 'Collaborator'
                            : 'Viewed'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyMapLink(map)}
                          className={`p-1 rounded-full ${copiedMapId === map.id ? 'text-emerald-600 bg-emerald-100' : 'text-emerald-700 hover:bg-emerald-50'}`}
                          title={copiedMapId === map.id ? 'Copied!' : 'Copy link'}
                        >
                          <Link2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrMapSlug(map.slug)}
                          className="p-1 rounded-full text-emerald-700 hover:bg-emerald-50"
                          title="Show QR code"
                        >
                          <QrCode size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMapId(map.id);
                            setEditingOriginalSlug(map.slug);
                            setMapTitle(map.title);
                            setMapSlug(map.slug);
                            setMapDescription(map.description);
                            setSelectedThemeId(map.themeId || DEFAULT_THEME.id);
                            setCollaboratorPassword(map.collaboratorPassword || '');
                            setInvitedAdmins((map.invitedAdminEmails || []).join(', '));
                            setInvitedCollaborators(
                              (map.invitedCollaboratorEmails || []).join(', '),
                            );
                            setBackgroundFile(null);
                            setBackgroundError(null);
                            setMapError(null);
                          }}
                          className="text-[10px] font-semibold text-emerald-800 px-2 py-1 rounded-full hover:bg-emerald-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete "${map.title}"? This cannot be undone.`)) return;
                            const next = maps.filter((m) => m.id !== map.id);
                            persistMaps(next);
                            if (editingMapId === map.id) {
                              setEditingMapId(null);
                              setEditingOriginalSlug(null);
                              setMapTitle('');
                              setMapSlug('');
                              setMapDescription('');
                            }
                          }}
                          className="p-1 rounded-full text-rose-600 hover:bg-rose-50"
                          title="Delete map"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="flex-1 max-w-md space-y-4">
          <div className="glass rounded-3xl p-6 solarpunk-shadow">
            {currentUser ? (
              <>
                {/* Create / Edit map form */}
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-emerald-900 uppercase tracking-wide mb-2">
                    {editingMapId ? 'Edit map' : 'Create a new map'}
                  </h4>
                  <form onSubmit={handleCreateMap} className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Title
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="Torontopia: Solarpunk Commons"
                        value={mapTitle}
                        onChange={(e) => setMapTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        URL slug
                        <span className="ml-1 text-[10px] font-normal text-emerald-700">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="torontopia"
                        value={mapSlug}
                        onChange={(e) => setMapSlug(e.target.value)}
                      />
                      <p className="text-[10px] text-emerald-700">
                        Your map will live at <span className="font-mono">/maps/{mapSlug || (mapTitle ? slugify(mapTitle) : 'your-slug')}</span>.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Description
                        <span className="ml-1 text-[10px] font-normal text-emerald-700">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-400 resize-none h-20"
                        placeholder="A living map of the people, spaces, and events that compose this scene."
                        maxLength={1200}
                        value={mapDescription}
                        onChange={(e) => setMapDescription(e.target.value)}
                      />
                      <p className="text-[10px] text-emerald-600 text-right">
                        {mapDescription.length}/1200
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Background map image
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="block w-full text-[11px] text-emerald-800 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setBackgroundFile(file);
                          setBackgroundError(null);
                        }}
                      />
                      <p className="text-[10px] text-emerald-700">
                        PNG, JPG, or WebP · up to 5MB · recommended between 1600×900 and 4000×4000
                        pixels.
                      </p>
                      {backgroundError && (
                        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                          {backgroundError}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Theme
                      </label>
                      <select
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-400"
                        value={selectedThemeId}
                        onChange={(e) => {
                          const id = e.target.value;
                          setSelectedThemeId(id);
                          setBaseThemeId(id);
                          const preset = THEME_PRESETS.find((p) => p.id === id) ?? DEFAULT_THEME;
                          const cat = preset.theme.categoryColors;
                          if (cat) {
                            setCustomEventColor(cat[NodeType.EVENT] || customEventColor);
                            setCustomPersonColor(cat[NodeType.PERSON] || customPersonColor);
                            setCustomSpaceColor(cat[NodeType.SPACE] || customSpaceColor);
                            setCustomCommunityColor(
                              cat[NodeType.COMMUNITY] || customCommunityColor,
                            );
                          }
                        }}
                      >
                        {THEME_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-emerald-700">
                        {selectedThemeId === baseThemeId
                          ? THEME_PRESETS.find((preset) => preset.id === selectedThemeId)
                              ?.description
                          : 'Custom palette based on your selected theme.'}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-emerald-900">
                            Event color
                          </label>
                          <input
                            type="color"
                            className="h-8 w-full rounded-md border border-emerald-100 bg-white/70"
                            value={customEventColor}
                            onChange={(e) => {
                              setCustomEventColor(e.target.value);
                              if (selectedThemeId === baseThemeId) {
                                setSelectedThemeId('custom');
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-emerald-900">
                            Person color
                          </label>
                          <input
                            type="color"
                            className="h-8 w-full rounded-md border border-emerald-100 bg-white/70"
                            value={customPersonColor}
                            onChange={(e) => {
                              setCustomPersonColor(e.target.value);
                              if (selectedThemeId === baseThemeId) {
                                setSelectedThemeId('custom');
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-emerald-900">
                            Space color
                          </label>
                          <input
                            type="color"
                            className="h-8 w-full rounded-md border border-emerald-100 bg-white/70"
                            value={customSpaceColor}
                            onChange={(e) => {
                              setCustomSpaceColor(e.target.value);
                              if (selectedThemeId === baseThemeId) {
                                setSelectedThemeId('custom');
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-emerald-900">
                            Community color
                          </label>
                          <input
                            type="color"
                            className="h-8 w-full rounded-md border border-emerald-100 bg-white/70"
                            value={customCommunityColor}
                            onChange={(e) => {
                              setCustomCommunityColor(e.target.value);
                              if (selectedThemeId === baseThemeId) {
                                setSelectedThemeId('custom');
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Collaborator password
                        <span className="ml-1 text-[10px] font-normal text-emerald-700">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="Share this with trusted collaborators"
                        value={collaboratorPassword}
                        onChange={(e) => setCollaboratorPassword(e.target.value)}
                      />
                      <p className="text-[10px] text-emerald-700">
                        People with this password will be able to join this map as collaborators in
                        a future step.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Invite admins by email
                        <span className="ml-1 text-[10px] font-normal text-emerald-700">
                          (comma-separated, optional)
                        </span>
                      </label>
                      <textarea
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-400 resize-none h-12"
                        placeholder="warden@example.org, steward@example.org"
                        value={invitedAdmins}
                        onChange={(e) => setInvitedAdmins(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">
                        Invite collaborators by email
                        <span className="ml-1 text-[10px] font-normal text-emerald-700">
                          (comma-separated, optional)
                        </span>
                      </label>
                      <textarea
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-400 resize-none h-12"
                        placeholder="friend1@example.org, friend2@example.org"
                        value={invitedCollaborators}
                        onChange={(e) => setInvitedCollaborators(e.target.value)}
                      />
                    </div>

                    {mapError && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                        {mapError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-2.5 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
                    >
                      Create map
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <>
                <div className="flex mb-4 rounded-full bg-emerald-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setAuthError(null);
                    }}
                    className={`flex-1 text-xs font-semibold py-2 rounded-full ${
                      mode === 'signup'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setAuthError(null);
                    }}
                    className={`flex-1 text-xs font-semibold py-2 rounded-full ${
                      mode === 'login'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Log in
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-emerald-900">Name</label>
                      <input
                        type="text"
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="Torontopia Warden"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-900">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      placeholder="you@example.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-900">Password</label>
                    <input
                      type="password"
                      required
                      className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {authError && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                      {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors mt-1"
                  >
                    {mode === 'signup' ? 'Create account' : 'Log in'}
                  </button>
                </form>

                <p className="text-[10px] text-emerald-700 mt-2">
                  Accounts are stored locally in this browser for now. A future backend will handle
                  secure authentication and real invitations.
                </p>
              </>
            )}
          </div>
          <button
            onClick={() => onNavigate('/')}
            className="text-xs text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
          >
            Back to Scene Mapper landing
          </button>
        </section>
      </main>

      {qrMapSlug && typeof window !== 'undefined' && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm pointer-events-auto"
          onClick={() => setQrMapSlug(null)}
        >
          <div
            className="bg-white rounded-2xl p-4 shadow-xl flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-emerald-900">Scan to open map</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/maps/${qrMapSlug}`)}`}
              alt="QR code for map"
              className="rounded-lg"
            />
            <button
              type="button"
              onClick={() => setQrMapSlug(null)}
              className="text-sm font-medium text-emerald-800 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

