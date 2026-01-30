import React, { useState, useEffect } from 'react';
import type { User, SceneMap, MapTheme } from '../types';
import { NodeType } from '../types';
import { getMaps, saveMaps, copyNodesToSlug, saveNodes } from '../lib/data';
import {
  DEFAULT_ADMIN_SUBJECT,
  DEFAULT_ADMIN_BODY,
  DEFAULT_COLLABORATOR_SUBJECT,
  DEFAULT_COLLABORATOR_BODY,
} from '../lib/invitation-email';
import { Trash2, Link2, QrCode, Pencil, X } from 'lucide-react';

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
        [NodeType.REGION]: '#4a5568',
      },
      connectionLine: { color: '#059669', opacity: 0.6, thickness: 2 },
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
        [NodeType.REGION]: '#94a3b8',
      },
      connectionLine: { color: '#38bdf8', opacity: 0.7, thickness: 2 },
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
        [NodeType.REGION]: '#4b5563',
      },
      connectionLine: { color: '#111827', opacity: 0.6, thickness: 2 },
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
        [NodeType.REGION]: '#94a3b8',
      },
      connectionLine: { color: '#14F4C9', opacity: 0.8, thickness: 2 },
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
      connectionLine: { color: '#166534', opacity: 0.6, thickness: 2 },
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
  const [customConnectionLineColor, setCustomConnectionLineColor] = useState<string>(
    DEFAULT_THEME.theme.connectionLine?.color ?? DEFAULT_THEME.theme.primaryColor,
  );
  const [customConnectionLineOpacity, setCustomConnectionLineOpacity] = useState<number>(
    DEFAULT_THEME.theme.connectionLine?.opacity ?? 0.6,
  );
  const [customConnectionLineThickness, setCustomConnectionLineThickness] = useState<number>(
    DEFAULT_THEME.theme.connectionLine?.thickness ?? 2,
  );
  const [baseThemeId, setBaseThemeId] = useState<string>(DEFAULT_THEME.id);
  const [enabledNodeTypes, setEnabledNodeTypes] = useState<NodeType[]>(Object.values(NodeType));
  const [connectionsEnabled, setConnectionsEnabled] = useState(true);
  const [mapListSort, setMapListSort] = useState<'name-asc' | 'name-desc'>('name-asc');
  const [copiedMapId, setCopiedMapId] = useState<string | null>(null);
  const [qrMapSlug, setQrMapSlug] = useState<string | null>(null);
  const [mapToDelete, setMapToDelete] = useState<SceneMap | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [showInvitationEmailModal, setShowInvitationEmailModal] = useState(false);
  const [invitationEmailSubjectAdmin, setInvitationEmailSubjectAdmin] = useState('');
  const [invitationEmailBodyAdmin, setInvitationEmailBodyAdmin] = useState('');
  const [invitationEmailSubjectCollaborator, setInvitationEmailSubjectCollaborator] = useState('');
  const [invitationEmailBodyCollaborator, setInvitationEmailBodyCollaborator] = useState('');
  const [invitationSenderName, setInvitationSenderName] = useState('');

  const copyMapLink = (map: SceneMap) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/maps/${map.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedMapId(map.id);
      setTimeout(() => setCopiedMapId(null), 2000);
    });
  };

  const handleConfirmDeleteMap = () => {
    if (!mapToDelete) return;
    const next = maps.filter((m) => m.id !== mapToDelete.id);
    persistMaps(next);
    if (editingMapId === mapToDelete.id) {
      setEditingMapId(null);
      setEditingOriginalSlug(null);
      setMapTitle('');
      setMapSlug('');
      setMapDescription('');
      setSelectedThemeId(DEFAULT_THEME.id);
      setCollaboratorPassword('');
      setInvitedAdmins('');
      setInvitedCollaborators('');
      setInvitationEmailSubjectAdmin('');
      setInvitationEmailBodyAdmin('');
      setInvitationEmailSubjectCollaborator('');
      setInvitationEmailBodyCollaborator('');
      setInvitationSenderName('');
      setBackgroundFile(null);
    }
    setMapToDelete(null);
  };

  const roleForMap = (map: SceneMap): 'Admin' | 'Collaborator' | 'Viewed' => {
    if (!currentUser) return 'Viewed';
    if (map.adminIds?.includes(currentUser.id)) return 'Admin';
    if (map.collaboratorIds?.includes(currentUser.id)) return 'Collaborator';
    return 'Viewed';
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
    setInvitationEmailSubjectAdmin(match.invitationEmailSubjectAdmin ?? '');
    setInvitationEmailBodyAdmin(match.invitationEmailBodyAdmin ?? '');
    setInvitationEmailSubjectCollaborator(match.invitationEmailSubjectCollaborator ?? '');
    setInvitationEmailBodyCollaborator(match.invitationEmailBodyCollaborator ?? '');
    setInvitationSenderName(match.invitationSenderName ?? '');
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
    if (themeToUse.connectionLine) {
      setCustomConnectionLineColor(themeToUse.connectionLine.color);
      setCustomConnectionLineOpacity(themeToUse.connectionLine.opacity);
      setCustomConnectionLineThickness(themeToUse.connectionLine.thickness);
    }
    setEnabledNodeTypes(
      match.enabledNodeTypes && match.enabledNodeTypes.length > 0
        ? match.enabledNodeTypes
        : Object.values(NodeType),
    );
    setConnectionsEnabled(match.connectionsEnabled !== false);
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
        [NodeType.REGION]: selectedPreset.theme.categoryColors?.[NodeType.REGION] ?? '#4a5568',
      },
      connectionLine: {
        color: customConnectionLineColor,
        opacity: customConnectionLineOpacity,
        thickness: customConnectionLineThickness,
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
      invitationEmailSubjectAdmin: invitationEmailSubjectAdmin.trim() || undefined,
      invitationEmailBodyAdmin: invitationEmailBodyAdmin.trim() || undefined,
      invitationEmailSubjectCollaborator: invitationEmailSubjectCollaborator.trim() || undefined,
      invitationEmailBodyCollaborator: invitationEmailBodyCollaborator.trim() || undefined,
      invitationSenderName: invitationSenderName.trim() || undefined,
      enabledNodeTypes: enabledNodeTypes.length < 4 ? enabledNodeTypes : undefined,
      connectionsEnabled: connectionsEnabled ? undefined : false,
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
    setEnabledNodeTypes(Object.values(NodeType));
    setConnectionsEnabled(true);
    setCollaboratorPassword('');
    setInvitedAdmins('');
    setInvitedCollaborators('');
    setInvitationEmailSubjectAdmin('');
    setInvitationEmailBodyAdmin('');
    setInvitationEmailSubjectCollaborator('');
    setInvitationEmailBodyCollaborator('');
    setInvitationSenderName('');
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
            <div className="text-sm text-emerald-800 leading-relaxed">
              <p>
                Build your map to inspire your scene. Get the vibes right and the map will find a life
                of its own.
              </p>
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
            </div>
          )}
          <p className="mt-3">
            <a
              href="/dashboard/import"
              className="text-[11px] text-emerald-600 hover:text-emerald-800 underline"
            >
              Import from browser storage →
            </a>
          </p>

          <div className="glass rounded-3xl p-6 solarpunk-shadow mt-6">
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
                          const conn = preset.theme.connectionLine;
                          if (conn) {
                            setCustomConnectionLineColor(conn.color);
                            setCustomConnectionLineOpacity(conn.opacity);
                            setCustomConnectionLineThickness(conn.thickness);
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
                      <div className="mt-3 pt-3 border-t border-emerald-100 space-y-2">
                        <label className="text-[10px] font-semibold text-emerald-900 block">
                          Connection lines
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-emerald-900">
                              Line colour
                            </label>
                            <input
                              type="color"
                              className="h-8 w-full rounded-md border border-emerald-100 bg-white/70"
                              value={customConnectionLineColor}
                              onChange={(e) => {
                                setCustomConnectionLineColor(e.target.value);
                                if (selectedThemeId === baseThemeId) setSelectedThemeId('custom');
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-emerald-900">
                              Opacity
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.1}
                              className="w-full h-8"
                              value={customConnectionLineOpacity}
                              onChange={(e) => {
                                setCustomConnectionLineOpacity(Number(e.target.value));
                                if (selectedThemeId === baseThemeId) setSelectedThemeId('custom');
                              }}
                            />
                            <span className="text-[10px] text-emerald-700">
                              {Math.round(customConnectionLineOpacity * 100)}%
                            </span>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] font-semibold text-emerald-900">
                              Thickness (px)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm"
                              value={customConnectionLineThickness}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (v >= 1 && v <= 6) {
                                  setCustomConnectionLineThickness(v);
                                  if (selectedThemeId === baseThemeId) setSelectedThemeId('custom');
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-emerald-900 block">
                        Show on map
                      </label>
                      <p className="text-[10px] text-emerald-700">
                        Disabled types are hidden from the map, filter panel, and add-entry options.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        {Object.values(NodeType).map((type) => (
                          <label
                            key={type}
                            className="flex items-center gap-2 cursor-pointer text-sm text-emerald-900"
                          >
                            <input
                              type="checkbox"
                              checked={enabledNodeTypes.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEnabledNodeTypes((prev) => [...prev, type].sort());
                                } else {
                                  setEnabledNodeTypes((prev) => prev.filter((t) => t !== type));
                                }
                              }}
                              className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
                          </label>
                        ))}
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-emerald-900">
                          <input
                            type="checkbox"
                            checked={connectionsEnabled}
                            onChange={(e) => setConnectionsEnabled(e.target.checked)}
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Connections
                        </label>
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
                      <p className="text-[10px] text-emerald-700">
                        <button
                          type="button"
                          onClick={() => setShowInvitationEmailModal(true)}
                          className="underline hover:text-emerald-900 font-medium"
                        >
                          Edit invitation email
                        </button>
                      </p>
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
                      {editingMapId ? 'Save changes' : 'Create map'}
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
            className="mt-4 text-xs text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
          >
            Back to Scene Mapper landing
          </button>
        </section>

        <section className="flex-1 max-w-md space-y-4">
          {currentUser && maps.length > 0 && (
            <div className="glass rounded-3xl p-6 solarpunk-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
                  Your maps
                </h3>
                <button
                  type="button"
                  onClick={() => setMapListSort((s) => (s === 'name-asc' ? 'name-desc' : 'name-asc'))}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  {mapListSort === 'name-asc' ? 'A–Z' : 'Z–A'}
                </button>
              </div>
              <ul className="space-y-2">
                {sortedMaps.map((map) => (
                  <li
                    key={map.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-white/50 border border-emerald-100"
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onNavigate(`/maps/${map.slug}`)}
                        className="text-left text-sm font-medium text-emerald-900 truncate block w-full hover:underline"
                      >
                        {map.title}
                      </button>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        {roleForMap(map)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
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
                          setInvitedCollaborators((map.invitedCollaboratorEmails || []).join(', '));
                          setBaseThemeId(map.themeId || DEFAULT_THEME.id);
                          const preset = THEME_PRESETS.find((p) => p.id === map.themeId) ?? DEFAULT_THEME;
                          const theme = map.theme || preset.theme;
                          if (theme.categoryColors) {
                            setCustomEventColor(theme.categoryColors[NodeType.EVENT] ?? customEventColor);
                            setCustomPersonColor(theme.categoryColors[NodeType.PERSON] ?? customPersonColor);
                            setCustomSpaceColor(theme.categoryColors[NodeType.SPACE] ?? customSpaceColor);
                            setCustomCommunityColor(theme.categoryColors[NodeType.COMMUNITY] ?? customCommunityColor);
                          }
                          if (theme.connectionLine) {
                            setCustomConnectionLineColor(theme.connectionLine.color);
                            setCustomConnectionLineOpacity(theme.connectionLine.opacity);
                            setCustomConnectionLineThickness(theme.connectionLine.thickness);
                          }
                        }}
                        className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="Edit map"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyMapLink(map)}
                        className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="Copy link"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrMapSlug(map.slug)}
                        className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="QR code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapToDelete(map)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                        title="Delete map"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      {/* Delete map confirmation modal */}
      {mapToDelete && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm"
          onClick={() => setMapToDelete(null)}
        >
          <div
            className="glass w-full max-w-sm rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-100 bg-white/60 flex justify-between items-center">
              <h2 className="text-lg font-bold text-emerald-950">Delete map?</h2>
              <button
                onClick={() => setMapToDelete(null)}
                className="p-1 rounded-full hover:bg-emerald-100 text-emerald-800 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
            <div className="p-5 space-y-4 bg-white/40">
              <p className="text-sm text-emerald-900">
                This will delete <span className="font-semibold">{mapToDelete.title}</span>. This
                action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMapToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMap}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                >
                  Delete map
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit invitation email modal */}
      {showInvitationEmailModal && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm"
          onClick={() => setShowInvitationEmailModal(false)}
        >
          <div
            className="glass w-full max-w-2xl max-h-[90vh] rounded-3xl solarpunk-shadow overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-100 bg-white/60 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-emerald-950">Edit invitation email</h2>
              <button
                type="button"
                onClick={() => setShowInvitationEmailModal(false)}
                className="p-2 rounded-full hover:bg-emerald-100 text-emerald-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-6 overflow-y-auto bg-white/40">
              <p className="text-[11px] text-emerald-700">
                Customize the subject and body for admin and collaborator invitations. Use{' '}
                <code className="bg-emerald-100 px-1 rounded text-[10px]">{'{Map title}'}</code>,{' '}
                <code className="bg-emerald-100 px-1 rounded text-[10px]">{'{origin}'}</code>, and{' '}
                <code className="bg-emerald-100 px-1 rounded text-[10px]">{'{slug}'}</code> as
                placeholders; they are replaced when the email is sent.
              </p>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-emerald-900">Admin invitation</h3>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-800">Subject</label>
                  <input
                    type="text"
                    className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    placeholder={DEFAULT_ADMIN_SUBJECT}
                    value={invitationEmailSubjectAdmin}
                    onChange={(e) => setInvitationEmailSubjectAdmin(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-800">Body</label>
                  <textarea
                    className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 min-h-[140px] resize-y"
                    placeholder={DEFAULT_ADMIN_BODY}
                    value={invitationEmailBodyAdmin}
                    onChange={(e) => setInvitationEmailBodyAdmin(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-emerald-900">Collaborator invitation</h3>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-800">Subject</label>
                  <input
                    type="text"
                    className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                    placeholder={DEFAULT_COLLABORATOR_SUBJECT}
                    value={invitationEmailSubjectCollaborator}
                    onChange={(e) => setInvitationEmailSubjectCollaborator(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-emerald-800">Body</label>
                  <textarea
                    className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 min-h-[140px] resize-y"
                    placeholder={DEFAULT_COLLABORATOR_BODY}
                    value={invitationEmailBodyCollaborator}
                    onChange={(e) => setInvitationEmailBodyCollaborator(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-800">
                  Sender display name
                  <span className="ml-1 font-normal text-emerald-700">(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="Scene Mapper"
                  value={invitationSenderName}
                  onChange={(e) => setInvitationSenderName(e.target.value)}
                />
                <p className="text-[10px] text-emerald-700">
                  The from-address stays your app email for deliverability; only the display name
                  can be customized (e.g. &quot;Toronto Scene&quot;).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvitationEmailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvitationEmailModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

