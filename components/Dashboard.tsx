import React, { useState, useEffect } from 'react';
import type { User, SceneMap, MapTheme } from '../types';
import { NodeType } from '../types';
import { getMaps, saveMaps, deleteMap, copyNodesToSlug, getNodes, saveNodes, getConnections, saveConnections, getFeatureRequests, getFeaturedMaps, updateMapFeature, isAbortError, getMapBackgroundUploadUrl, USE_BACKEND } from '../lib/data';
import {
  DEFAULT_ADMIN_SUBJECT,
  DEFAULT_ADMIN_BODY,
  DEFAULT_COLLABORATOR_SUBJECT,
  DEFAULT_COLLABORATOR_BODY,
} from '../lib/invitation-email';
import { parseXlsxFile, generateTemplateXlsx, type ImportResult } from '../lib/import-data';
import { DEFAULT_ENABLED_NODE_TYPES } from '../constants';
import {
  MAP_TEMPLATES,
  DEFAULT_MAP_TEMPLATE_ID,
  REORDERABLE_NODE_TYPES,
  buildElementConfig,
  buildConnectionConfig,
  getElementLabel,
  getElementIcon,
  getEnabledNodeTypes,
} from '../lib/element-config';
import { getIconComponent } from '../lib/icons';
import ElementIconPicker from './ElementIconPicker';
import { Trash2, Link2, QrCode, Pencil, X, Plus, Upload, Download, Image, ChevronDown, ChevronRight, ChevronUp, GripVertical, Loader2 } from 'lucide-react';

interface DashboardProps {
  onNavigate: (path: string) => void;
  currentUser: User | null;
  /** True when user is a platform admin (e.g. naryan@gmail.com). Enables feature-request and featured-maps management. */
  platformAdmin?: boolean;
  onLogout: () => void;
  onLogin: (email: string, password: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onSignup: (name: string, email: string, password: string) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  /** When true, show "Forgot password?" option (backend auth) */
  showForgotPassword?: boolean;
  /**
   * Optional slug used to pre-open a map in edit mode when
   * navigating from a map back to the dashboard.
   */
  initialEditSlug?: string;
  /**
   * Maps loaded by the page in parallel with session (avoids waterfall and speeds up edit flow).
   */
  initialMaps?: SceneMap[];
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
        [NodeType.MEDIA]: '#9B59B6',
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
        [NodeType.MEDIA]: '#9B59B6',
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
        [NodeType.MEDIA]: '#9B59B6',
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
        [NodeType.MEDIA]: '#9B59B6',
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
        [NodeType.REGION]: '#4a5568',
        [NodeType.MEDIA]: '#9B59B6',
      },
      connectionLine: { color: '#166534', opacity: 0.6, thickness: 2 },
    },
  },
];

const DEFAULT_THEME = THEME_PRESETS[0];

const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  currentUser,
  platformAdmin = false,
  onLogout,
  onLogin,
  onSignup,
  showForgotPassword = false,
  initialEditSlug,
  initialMaps = [],
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [maps, setMaps] = useState<SceneMap[]>(initialMaps);
  const [mapTitle, setMapTitle] = useState('');
  const [mapSlug, setMapSlug] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(DEFAULT_THEME.id);
  const [collaboratorPassword, setCollaboratorPassword] = useState('');
  const [publicView, setPublicView] = useState(true);
  const [invitedAdmins, setInvitedAdmins] = useState('');
  const [invitedCollaborators, setInvitedCollaborators] = useState('');
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [editingOriginalSlug, setEditingOriginalSlug] = useState<string | null>(null);
  const [isBuildingMap, setIsBuildingMap] = useState(false);
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
  const [customMediaColor, setCustomMediaColor] = useState<string>(
    DEFAULT_THEME.theme.categoryColors?.[NodeType.MEDIA] || '#9B59B6',
  );
  const [customRegionColor, setCustomRegionColor] = useState<string>(
    DEFAULT_THEME.theme.categoryColors?.[NodeType.REGION] || '#4a5568',
  );
  const [customMapBackgroundColor, setCustomMapBackgroundColor] = useState<string>(
    DEFAULT_THEME.theme.backgroundColor || '#fdfcf0',
  );
  const [customRegionFont, setCustomRegionFont] = useState<string>(
    DEFAULT_THEME.theme.regionFont || '',
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
  const [enabledNodeTypes, setEnabledNodeTypes] = useState<NodeType[]>(DEFAULT_ENABLED_NODE_TYPES);
  const [connectionsEnabled, setConnectionsEnabled] = useState(true);
  const [mapTemplateId, setMapTemplateId] = useState<SceneMap['mapTemplateId']>(DEFAULT_MAP_TEMPLATE_ID);
  const [elementConfig, setElementConfig] = useState<SceneMap['elementConfig']>(undefined);
  const [connectionConfig, setConnectionConfig] = useState<SceneMap['connectionConfig']>(undefined);
  const [elementOrder, setElementOrder] = useState<NodeType[]>(() => [...REORDERABLE_NODE_TYPES]);
  const [elementPickerFor, setElementPickerFor] = useState<'icon' | null>(null);
  const [elementPickerTarget, setElementPickerTarget] = useState<{ type: NodeType | 'CONNECTION'; colorKey: string } | null>(null);
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<ImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mapIcon, setMapIcon] = useState<string>('🗺️');
  const [mapIconBackground, setMapIconBackground] = useState<string>('#059669');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [themeSectionOpen, setThemeSectionOpen] = useState(false);
  const [rolesSectionOpen, setRolesSectionOpen] = useState(false);
  const [advancedSectionOpen, setAdvancedSectionOpen] = useState(false);
  const [submitAsFeatured, setSubmitAsFeatured] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [featureRequests, setFeatureRequests] = useState<SceneMap[]>([]);
  const [featuredMaps, setFeaturedMaps] = useState<SceneMap[]>([]);
  const [featureRequestAction, setFeatureRequestAction] = useState<string | null>(null);
  const [featuredReordering, setFeaturedReordering] = useState(false);

  useEffect(() => {
    if (!platformAdmin || typeof window === 'undefined') return;
    const ac = new AbortController();
    Promise.all([
      getFeatureRequests({ signal: ac.signal }),
      getFeaturedMaps({ signal: ac.signal }),
    ])
      .then(([requests, featured]) => {
        if (!ac.signal.aborted) {
          setFeatureRequests(requests);
          setFeaturedMaps(featured);
        }
      })
      .catch(() => {});
    return () => ac.abort();
  }, [platformAdmin, featureRequestAction, featuredReordering]);

  const copyMapLink = (map: SceneMap) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/maps/${map.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedMapId(map.id);
      setTimeout(() => setCopiedMapId(null), 2000);
    });
  };

  const handleConfirmDeleteMap = async () => {
    if (!mapToDelete) return;
    const next = maps.filter((m) => m.id !== mapToDelete.id);
    const useBackend = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_BACKEND === 'true';
    if (useBackend) {
      try {
        await deleteMap(mapToDelete.slug);
      } catch (err) {
        setMapError(err instanceof Error ? err.message : 'Could not delete map. Please try again.');
        setMapToDelete(null);
        return;
      }
    } else {
      persistMaps(next);
    }
    setMaps(next);
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
    setMapIcon('🗺️');
    setMapIconBackground('#059669');
    setCustomMapBackgroundColor(DEFAULT_THEME.theme.backgroundColor ?? '#fdfcf0');
    setBackgroundFile(null);
    setMapTemplateId(DEFAULT_MAP_TEMPLATE_ID);
    setElementConfig(undefined);
    setConnectionConfig(undefined);
    setElementOrder([...REORDERABLE_NODE_TYPES]);
    setThemeSectionOpen(false);
    setRolesSectionOpen(false);
    setAdvancedSectionOpen(false);
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

  // Hydrate maps from data layer (refresh in background; we already have initialMaps so edit form can show immediately)
  useEffect(() => {
    const ac = new AbortController();
    getMaps({ signal: ac.signal })
      .then(setMaps)
      .catch((err) => {
        if (!isAbortError(err)) setMaps((prev) => (prev.length > 0 ? prev : []));
      });
    return () => ac.abort();
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
    setPublicView(match.publicView !== false);
    setInvitedAdmins((match.invitedAdminEmails || []).join(', '));
    setInvitedCollaborators((match.invitedCollaboratorEmails || []).join(', '));
    setInvitationEmailSubjectAdmin(match.invitationEmailSubjectAdmin ?? '');
    setInvitationEmailBodyAdmin(match.invitationEmailBodyAdmin ?? '');
    setInvitationEmailSubjectCollaborator(match.invitationEmailSubjectCollaborator ?? '');
    setInvitationEmailBodyCollaborator(match.invitationEmailBodyCollaborator ?? '');
    setInvitationSenderName(match.invitationSenderName ?? '');
    setMapIcon(match.icon ?? '🗺️');
    setMapIconBackground(match.iconBackground ?? '#059669');
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
      setCustomRegionColor(themeToUse.categoryColors[NodeType.REGION] || customRegionColor);
      setCustomMediaColor(themeToUse.categoryColors[NodeType.MEDIA] || customMediaColor);
    }
    setCustomMapBackgroundColor(themeToUse.backgroundColor ?? '#fdfcf0');
    setCustomRegionFont(themeToUse.regionFont ?? '');
    if (themeToUse.connectionLine) {
      setCustomConnectionLineColor(themeToUse.connectionLine.color);
      setCustomConnectionLineOpacity(themeToUse.connectionLine.opacity);
      setCustomConnectionLineThickness(themeToUse.connectionLine.thickness);
    }
    setEnabledNodeTypes(
      match.enabledNodeTypes && match.enabledNodeTypes.length > 0
        ? match.enabledNodeTypes
        : DEFAULT_ENABLED_NODE_TYPES,
    );
    setConnectionsEnabled(match.connectionsEnabled !== false);
    setMapTemplateId((match.mapTemplateId as SceneMap['mapTemplateId']) || DEFAULT_MAP_TEMPLATE_ID);
    if (match.elementConfig) {
      setElementConfig(match.elementConfig);
    } else {
      const tpl = (match.mapTemplateId as 'scene' | 'ideas' | 'network') ?? DEFAULT_MAP_TEMPLATE_ID;
      const enabled = match.enabledNodeTypes ?? DEFAULT_ENABLED_NODE_TYPES;
      setElementConfig(buildElementConfig(tpl, undefined, enabled));
    }
    setElementOrder(
      match.elementOrder && match.elementOrder.length > 0 ? [...match.elementOrder] : [...REORDERABLE_NODE_TYPES],
    );
    setConnectionConfig(match.connectionConfig ?? undefined);
    setSubmitAsFeatured(!!match.featureRequestedAt);
    setThemeSectionOpen(false);
    setRolesSectionOpen(false);
    setAdvancedSectionOpen(false);
  }, [initialEditSlug, maps, editingMapId]);

  const persistMaps = (next: SceneMap[]) => {
    setMaps(next);
    return saveMaps(next);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(false);
    const emailToUse = forgotEmail.trim() || email.trim();
    if (!emailToUse) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotSubmitting(true);
    try {
      const r = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });
      const data = await r.json();
      if (!r.ok) {
        setForgotError((data as { error?: string }).error || 'Something went wrong. Please try again.');
        return;
      }
      setForgotSuccess(true);
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
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
    setIsBuildingMap(true);

    if (!currentUser) {
      setMapError('You need an account to create and save maps.');
      setIsBuildingMap(false);
      return;
    }

    const title = mapTitle.trim() || 'Untitled map';
    const slug = (mapSlug.trim() || slugify(title)).toLowerCase();

    const exists = maps.some((m) => m.slug === slug);
    if (exists && (!editingMapId || maps.find((m) => m.slug === slug)?.id !== editingMapId)) {
      setMapError('A map with this URL already exists. Try a different slug.');
      setIsBuildingMap(false);
      return;
    }

    const mapIdForUpload = editingMapId ?? crypto.randomUUID();

    let backgroundImageUrl: string | undefined;
    if (backgroundFile) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      const maxBytes = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(backgroundFile.type)) {
        setBackgroundError('Use PNG, JPG, or WebP for the background image.');
        setIsBuildingMap(false);
        return;
      }
      if (backgroundFile.size > maxBytes) {
        setBackgroundError('Background image is too large. Maximum size is 5MB.');
        setIsBuildingMap(false);
        return;
      }

      try {
        if (USE_BACKEND) {
          const { uploadUrl, publicUrl } = await getMapBackgroundUploadUrl(backgroundFile.type, mapIdForUpload);
          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: backgroundFile,
            headers: { 'Content-Type': backgroundFile.type },
          });
          if (!putRes.ok) throw new Error('Upload failed');
          backgroundImageUrl = publicUrl;
        } else {
          backgroundImageUrl = await readFileAsDataUrl(backgroundFile);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        const isNetworkError = /network|fetch|failed/i.test(msg) || (err instanceof TypeError && err.message?.includes('fetch'));
        setBackgroundError(
          isNetworkError
            ? 'Upload failed (network). Check R2 CORS allows your app origin—see docs/R2_SETUP.md.'
            : msg || 'Could not upload background image. Please try again.'
        );
        setIsBuildingMap(false);
        return;
      }
    }

    const selectedPreset =
      THEME_PRESETS.find((preset) => preset.id === selectedThemeId) ?? DEFAULT_THEME;

    const selectedTheme: MapTheme = {
      ...selectedPreset.theme,
      backgroundColor: customMapBackgroundColor,
      categoryColors: {
        [NodeType.EVENT]: customEventColor,
        [NodeType.PERSON]: customPersonColor,
        [NodeType.SPACE]: customSpaceColor,
        [NodeType.COMMUNITY]: customCommunityColor,
        [NodeType.REGION]: customRegionColor,
        [NodeType.MEDIA]: customMediaColor,
      },
      regionFont: customRegionFont || undefined,
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
      publicView,
      themeId: selectedThemeId === baseThemeId ? selectedPreset.id : 'custom',
      invitedAdminEmails: parseEmails(invitedAdmins),
      invitedCollaboratorEmails: parseEmails(invitedCollaborators),
      invitationEmailSubjectAdmin: invitationEmailSubjectAdmin.trim() || undefined,
      invitationEmailBodyAdmin: invitationEmailBodyAdmin.trim() || undefined,
      invitationEmailSubjectCollaborator: invitationEmailSubjectCollaborator.trim() || undefined,
      invitationEmailBodyCollaborator: invitationEmailBodyCollaborator.trim() || undefined,
      invitationSenderName: invitationSenderName.trim() || undefined,
      enabledNodeTypes: enabledNodeTypes.length > 0 ? enabledNodeTypes : undefined,
      connectionsEnabled: connectionsEnabled ? undefined : false,
      icon: mapIcon || undefined,
      iconBackground: mapIconBackground || undefined,
      mapTemplateId: mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID,
      elementConfig: elementConfig ?? undefined,
      elementOrder: elementOrder.length > 0 ? elementOrder : undefined,
      connectionConfig: connectionConfig ?? undefined,
      featureRequestedAt:
        submitAsFeatured
          ? (editingMapId && maps.find((m) => m.id === editingMapId)?.featureRequestedAt) ?? new Date().toISOString()
          : undefined,
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
        id: mapIdForUpload,
        slug,
        title,
        description: baseFields.description || '',
        backgroundImageUrl: baseFields.backgroundImageUrl,
        theme: baseFields.theme || selectedTheme,
        collaboratorPassword: baseFields.collaboratorPassword,
        adminIds: [currentUser.id],
        collaboratorIds: [],
        publicView: baseFields.publicView ?? true,
        themeId: baseFields.themeId,
        invitedAdminEmails: baseFields.invitedAdminEmails,
        invitedCollaboratorEmails: baseFields.invitedCollaboratorEmails,
        invitationEmailSubjectAdmin: baseFields.invitationEmailSubjectAdmin,
        invitationEmailBodyAdmin: baseFields.invitationEmailBodyAdmin,
        invitationEmailSubjectCollaborator: baseFields.invitationEmailSubjectCollaborator,
        invitationEmailBodyCollaborator: baseFields.invitationEmailBodyCollaborator,
        invitationSenderName: baseFields.invitationSenderName,
        enabledNodeTypes: baseFields.enabledNodeTypes,
        connectionsEnabled: baseFields.connectionsEnabled,
        icon: baseFields.icon,
        iconBackground: baseFields.iconBackground,
        mapTemplateId: baseFields.mapTemplateId,
        elementConfig: baseFields.elementConfig,
        elementOrder: baseFields.elementOrder,
        connectionConfig: baseFields.connectionConfig,
        featureRequestedAt: baseFields.featureRequestedAt,
      };
      nextMaps = [...maps, newMap];
      targetMapId = newMap.id;
    }
    // When using backend, wait for POST to complete before navigating so the
    // request is not aborted (NS_BINDING_ABORTED) when the page unloads.
    const useBackend = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_BACKEND === 'true';
    if (useBackend) {
      try {
        await persistMaps(nextMaps);
      } catch (err) {
        setMapError(err instanceof Error ? err.message : 'Could not save map. Please try again.');
        setIsBuildingMap(false);
        return;
      }
    } else {
      persistMaps(nextMaps);
    }

    // Initialize or migrate node collection for this map
    const oldSlug = editingOriginalSlug && editingMapId ? editingOriginalSlug : null;
    if (oldSlug && oldSlug !== slug) {
      void copyNodesToSlug(oldSlug, slug);
    } else if (!editingMapId) {
      if (useBackend) {
        try {
          await saveNodes(slug, []);
        } catch {
          // Non-blocking: map page will GET nodes and get [] anyway
        }
      } else {
        void saveNodes(slug, []).catch(() => {});
      }
    }

    setMapTitle('');
    setMapSlug('');
    setMapDescription('');
    setSelectedThemeId(DEFAULT_THEME.id);
    setEnabledNodeTypes(DEFAULT_ENABLED_NODE_TYPES);
    setConnectionsEnabled(true);
    setCollaboratorPassword('');
    setInvitedAdmins('');
    setInvitedCollaborators('');
    setInvitationEmailSubjectAdmin('');
    setInvitationEmailBodyAdmin('');
    setInvitationEmailSubjectCollaborator('');
    setInvitationEmailBodyCollaborator('');
    setInvitationSenderName('');
    setMapIcon('🗺️');
    setMapIconBackground('#059669');
    setCustomMapBackgroundColor(DEFAULT_THEME.theme.backgroundColor ?? '#fdfcf0');
    setBackgroundFile(null);
    setMapTemplateId(DEFAULT_MAP_TEMPLATE_ID);
    setElementConfig(undefined);
    setConnectionConfig(undefined);
    setElementOrder([...REORDERABLE_NODE_TYPES]);
    setEditingMapId(null);
    setEditingOriginalSlug(null);

    // Jump straight into the map we just created or edited
    onNavigate(`/maps/${slug}`);
  };
  return (
    <>
      {isBuildingMap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#fdfcf0]/95 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" aria-hidden />
            <p className="text-lg font-semibold text-emerald-900">Building map</p>
          </div>
        </div>
      )}
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
              <a
                href="/account"
                className="hidden md:inline hover:underline"
              >
                Signed in as <span className="font-semibold">{currentUser.email}</span>
              </a>
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

      <main className="flex-1 flex flex-col md:flex-row px-4 sm:px-6 md:px-12 py-6 md:py-8 gap-6 md:gap-8 pb-[env(safe-area-inset-bottom)]">
        <section className="flex-1 max-w-xl space-y-4 min-w-0">
          <h2 className="text-2xl md:text-3xl font-bold text-emerald-950">
            {editingMapId ? 'Edit your map' : 'Map your scene, your way.'}
          </h2>
          {editingMapId && (
            <p className="text-sm text-emerald-800 leading-relaxed">
              Evolution is sexy. Now is a great time to tweak your description, refresh your colours, and add some new collaborators! 😎
            </p>
          )}
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

          <div className="glass rounded-3xl p-6 solarpunk-shadow mt-6">
            {currentUser ? (
              <>
                {/* Create / Edit map form */}
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide mb-2">
                    {editingMapId ? 'Edit map' : 'Create a new map'}
                  </h4>
                  <form onSubmit={handleCreateMap} className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-emerald-900">
                        Title
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowIconPicker(true)}
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 hover:opacity-80 transition-opacity overflow-hidden"
                          style={{ backgroundColor: mapIconBackground }}
                          title="Click to change icon"
                        >
                          {(mapIcon.startsWith('data:') || mapIcon.startsWith('http')) ? (
                            <img src={mapIcon} alt="" className="w-full h-full object-cover" />
                          ) : (
                            mapIcon
                          )}
                        </button>
                        <input
                          type="text"
                          className="flex-1 bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                          placeholder="Torontopia: Solarpunk Commons"
                          value={mapTitle}
                          onChange={(e) => setMapTitle(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-emerald-900">
                        URL slug
                        <span className="ml-1 text-xs font-normal text-emerald-700">
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
                      <p className="text-xs text-emerald-700">
                        Your map will live at <span className="font-mono">/maps/{mapSlug || (mapTitle ? slugify(mapTitle) : 'your-slug')}</span>.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-emerald-900">
                        Description
                        <span className="ml-1 text-xs font-normal text-emerald-700">
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
                      <p className="text-xs text-emerald-600 text-right">
                        {mapDescription.length}/1200
                      </p>
                    </div>
                    <div className="space-y-1 pb-4">
                      <label className="text-sm font-semibold text-emerald-900">
                        Background map image
                      </label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="block w-full text-sm text-emerald-800 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setBackgroundFile(file);
                          setBackgroundError(null);
                        }}
                      />
                      <p className="text-xs text-emerald-700">
                        PNG, JPG, or WebP · up to 5MB · recommended between 1600×900 and 4000×4000
                        pixels.
                      </p>
                      {backgroundError && (
                        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                          {backgroundError}
                        </p>
                      )}
                    </div>

                    {/* Elements & Connections — collapsible */}
                    <div className="border border-emerald-100 rounded-xl overflow-hidden mt-4">
                      <button
                        type="button"
                        onClick={() => setThemeSectionOpen((v) => !v)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-50/50 text-left font-semibold text-emerald-900 hover:bg-emerald-50"
                      >
                        {themeSectionOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        Elements & Connections
                      </button>
                      {themeSectionOpen && (
                      <div className="p-4 pt-0 space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-emerald-900">Map template</label>
                          <select
                            className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                            value={mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID}
                            onChange={(e) => {
                              const id = e.target.value as SceneMap['mapTemplateId'];
                              setMapTemplateId(id);
                              const built = buildElementConfig(id ?? DEFAULT_MAP_TEMPLATE_ID, elementConfig ?? undefined, enabledNodeTypes);
                              setElementConfig(built);
                            }}
                          >
                            {MAP_TEMPLATES.map((t) => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-emerald-900">Theme (colours)</label>
                          <select
                            className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
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
                                setCustomCommunityColor(cat[NodeType.COMMUNITY] || customCommunityColor);
                                setCustomRegionColor(cat[NodeType.REGION] || customRegionColor);
                                setCustomMediaColor(cat[NodeType.MEDIA] || customMediaColor);
                              }
                              setCustomMapBackgroundColor(preset.theme.backgroundColor ?? '#fdfcf0');
                              setCustomRegionFont(preset.theme.regionFont ?? '');
                              const conn = preset.theme.connectionLine;
                              if (conn) {
                                setCustomConnectionLineColor(conn.color);
                                setCustomConnectionLineOpacity(conn.opacity);
                                setCustomConnectionLineThickness(conn.thickness);
                              }
                            }}
                          >
                            {THEME_PRESETS.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>

                        <p className="text-xs text-emerald-700">Each element: include on map, icon & colour, label.</p>
                        <div className="space-y-2">
                          {elementOrder.map((type, idx) => {
                            const label = getElementLabel(type, elementConfig ?? undefined, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID);
                            const icon = getElementIcon(type, elementConfig ?? undefined, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID);
                            const enabled = elementConfig?.[type]?.enabled ?? enabledNodeTypes.includes(type);
                            const colorMap: Record<NodeType, string> = {
                              [NodeType.EVENT]: customEventColor,
                              [NodeType.PERSON]: customPersonColor,
                              [NodeType.SPACE]: customSpaceColor,
                              [NodeType.COMMUNITY]: customCommunityColor,
                              [NodeType.REGION]: customRegionColor,
                              [NodeType.MEDIA]: customMediaColor,
                            };
                            const color = colorMap[type];
                            const setColor = (v: string) => {
                              if (type === NodeType.EVENT) setCustomEventColor(v);
                              if (type === NodeType.PERSON) setCustomPersonColor(v);
                              if (type === NodeType.SPACE) setCustomSpaceColor(v);
                              if (type === NodeType.COMMUNITY) setCustomCommunityColor(v);
                              if (type === NodeType.REGION) setCustomRegionColor(v);
                              if (type === NodeType.MEDIA) setCustomMediaColor(v);
                              if (selectedThemeId === baseThemeId) setSelectedThemeId('custom');
                            };
                            const IconComp = getIconComponent(icon);
                            const isCustomImg = icon && (icon.startsWith('data:') || icon.startsWith('http'));
                            return (
                              <div key={type} className={`flex items-center gap-3 p-3 rounded-xl border ${enabled ? 'bg-white/70 border-emerald-100' : 'bg-emerald-50/50 border-emerald-50 opacity-50'}`}>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button type="button" onClick={() => { if (idx > 0) setElementOrder((o) => { const n = [...o]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n; }); }} className="p-1 rounded hover:bg-emerald-100 text-emerald-600" aria-label="Move up"><ChevronDown className="w-4 h-4 rotate-180" /></button>
                                  <button type="button" onClick={() => { if (idx < elementOrder.length - 1) setElementOrder((o) => { const n = [...o]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n; }); }} className="p-1 rounded hover:bg-emerald-100 text-emerald-600" aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
                                </div>
                                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                                  <input type="checkbox" checked={enabled} onChange={(e) => { const v = e.target.checked; setElementConfig((c) => ({ ...c, [type]: { ...(c?.[type] ?? { label, icon, enabled }), enabled: v } })); setEnabledNodeTypes((prev) => v ? [...prev, type].sort() : prev.filter((t) => t !== type)); }} className="rounded border-emerald-300 text-emerald-600" />
                                  <span className="text-xs font-medium text-emerald-900">Include</span>
                                </label>
                                <button type="button" onClick={() => { setElementPickerTarget({ type, colorKey: type }); setElementPickerFor('icon'); }} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                                  {isCustomImg ? <img src={icon} alt="" className="w-6 h-6 object-contain" /> : IconComp ? <IconComp className="w-5 h-5 text-white" strokeWidth={2.5} /> : <span className="text-white text-sm">?</span>}
                                </button>
                                <input type="text" value={elementConfig?.[type]?.label ?? label} onChange={(e) => setElementConfig((c) => ({ ...c, [type]: { ...(c?.[type] ?? { label, icon, enabled }), label: e.target.value } }))} className="flex-1 min-w-0 bg-white/70 border border-emerald-100 rounded-lg px-2 py-1.5 text-sm" placeholder={label} />
                              </div>
                            );
                          })}
                        </div>

                        <div className="pt-3 border-t border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-900 mb-2">Region</p>
                          <div className={`flex items-center gap-3 p-3 rounded-xl border ${enabledNodeTypes.includes(NodeType.REGION) ? 'bg-white/70 border-emerald-100' : 'bg-emerald-50/50 border-emerald-50 opacity-50'}`}>
                            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={enabledNodeTypes.includes(NodeType.REGION)}
                                onChange={(e) => {
                                  const v = e.target.checked;
                                  setElementConfig((c) => {
                                    const existing = c?.[NodeType.REGION];
                                    const base = existing ?? { label: getElementLabel(NodeType.REGION, c, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID), icon: getElementIcon(NodeType.REGION, c, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID), enabled: v };
                                    return { ...c, [NodeType.REGION]: { ...base, enabled: v } };
                                  });
                                  setEnabledNodeTypes((prev) => (v ? [...prev, NodeType.REGION].sort() : prev.filter((t) => t !== NodeType.REGION)));
                                }}
                                className="rounded border-emerald-300 text-emerald-600"
                              />
                              <span className="text-xs font-medium text-emerald-900">Include</span>
                            </label>
                            <button type="button" onClick={() => { setElementPickerTarget({ type: NodeType.REGION, colorKey: 'REGION' }); setElementPickerFor('icon'); }} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: customRegionColor }}>
                              {(() => { const ic = getElementIcon(NodeType.REGION, elementConfig, mapTemplateId); const isImg = ic && (ic.startsWith('data:') || ic.startsWith('http')); const Ic = getIconComponent(ic); return isImg ? <img src={ic} alt="" className="w-6 h-6 object-contain" /> : Ic ? <Ic className="w-5 h-5 text-white" strokeWidth={2.5} /> : <span className="text-white text-sm">?</span>; })()}
                            </button>
                            <input
                              type="text"
                              value={elementConfig?.[NodeType.REGION]?.label ?? getElementLabel(NodeType.REGION, elementConfig, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setElementConfig((c) => {
                                  const existing = c?.[NodeType.REGION];
                                  const base = existing ?? { label: getElementLabel(NodeType.REGION, c, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID), icon: getElementIcon(NodeType.REGION, c, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID), enabled: enabledNodeTypes.includes(NodeType.REGION) };
                                  return { ...c, [NodeType.REGION]: { ...base, label: val } };
                                });
                              }}
                              className="flex-1 min-w-0 bg-white/70 border border-emerald-100 rounded-lg px-2 py-1.5 text-sm"
                              placeholder="Regions"
                            />
                            <select className="shrink-0 bg-white/70 border border-emerald-100 rounded-lg px-2 py-1.5 text-xs" value={customRegionFont} onChange={(e) => { setCustomRegionFont(e.target.value); if (selectedThemeId === baseThemeId) setSelectedThemeId('custom'); }}>
                              <option value="">Default</option>
                              <option value="Georgia, serif">Georgia</option>
                              <option value="'Playfair Display', serif">Playfair Display</option>
                              <option value="'Outfit', sans-serif">Outfit</option>
                              <option value="'Inter', sans-serif">Inter</option>
                              <option value="system-ui, sans-serif">System UI</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-900 mb-2">Connections</p>
                          <div className={`flex items-center gap-3 p-3 rounded-xl border ${connectionsEnabled ? 'bg-white/70 border-emerald-100' : 'bg-emerald-50/50 border-emerald-50 opacity-50'}`}>
                            <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                              <input type="checkbox" checked={connectionsEnabled} onChange={(e) => setConnectionsEnabled(e.target.checked)} className="rounded border-emerald-300 text-emerald-600" />
                              <span className="text-xs font-medium text-emerald-900">Include</span>
                            </label>
                            <button type="button" onClick={() => { setElementPickerTarget({ type: 'CONNECTION', colorKey: 'connection' }); setElementPickerFor('icon'); }} className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: customConnectionLineColor }}>
                              {(() => { const ic = connectionConfig?.icon ?? MAP_TEMPLATES.find((t) => t.id === (mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID))?.connectionIcon ?? 'Link2'; const isImg = ic && (ic.startsWith('data:') || ic.startsWith('http')); const Ic = getIconComponent(ic); return isImg ? <img src={ic} alt="" className="w-6 h-6 object-contain" /> : Ic ? <Ic className="w-5 h-5 text-white" strokeWidth={2.5} /> : <span className="text-white text-sm">?</span>; })()}
                            </button>
                            <input type="text" value={connectionConfig?.label ?? MAP_TEMPLATES.find((t) => t.id === (mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID))?.connectionLabel ?? 'Connections'} onChange={(e) => setConnectionConfig((c) => ({ ...c, label: e.target.value }))} className="flex-1 min-w-0 bg-white/70 border border-emerald-100 rounded-lg px-2 py-1.5 text-sm" placeholder="Connections" />
                            <div className="flex items-center gap-2 shrink-0">
                              <input type="range" min={0} max={1} step={0.1} className="w-16" value={customConnectionLineOpacity} onChange={(e) => { setCustomConnectionLineOpacity(Number(e.target.value)); if (selectedThemeId === baseThemeId) setSelectedThemeId('custom'); }} />
                              <span className="text-[10px] w-8">{Math.round(customConnectionLineOpacity * 100)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-semibold text-emerald-900">Background colour</label>
                          <div className="flex gap-2 items-center">
                            <input type="color" className="h-8 w-16 rounded border border-emerald-100" value={customMapBackgroundColor} onChange={(e) => { setCustomMapBackgroundColor(e.target.value); if (selectedThemeId === baseThemeId) setSelectedThemeId('custom'); }} />
                            <span className="text-xs text-emerald-700">Colour behind the map image</span>
                          </div>
                        </div>
                      </div>
                      )}
                    </div>

                    {/* Roles & permissions — collapsible, starts collapsed */}
                    <div className="border border-emerald-100 rounded-xl overflow-hidden mt-4">
                      <button
                        type="button"
                        onClick={() => setRolesSectionOpen((v) => !v)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-50/50 text-left font-semibold text-emerald-900 hover:bg-emerald-50"
                      >
                        {rolesSectionOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        Roles & permissions
                      </button>
                      {rolesSectionOpen && (
                      <div className="p-4 pt-4 space-y-2">
                    <div className="pt-0 space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-emerald-900">
                        <input
                          type="checkbox"
                          checked={publicView}
                          onChange={(e) => setPublicView(e.target.checked)}
                          className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Public map (anyone with the link can view)
                      </label>
                      <p className="text-xs text-emerald-700">
                        Uncheck to restrict viewing to admins and collaborators only.
                      </p>
                      <label className="text-sm font-semibold text-emerald-900 block pt-2">
                        Collaborator password
                        <span className="ml-1 text-xs font-normal text-emerald-700">
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
                      <p className="text-xs text-emerald-700">
                        People with this password will be able to join this map as collaborators in
                        a future step.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-emerald-900">
                        Invite admins by email
                        <span className="ml-1 text-xs font-normal text-emerald-700">
                          (comma-separated, optional)
                        </span>
                      </label>
                      <textarea
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none h-12"
                        placeholder="warden@example.org, steward@example.org"
                        value={invitedAdmins}
                        onChange={(e) => setInvitedAdmins(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 pb-4">
                      <label className="text-sm font-semibold text-emerald-900">
                        Invite collaborators by email
                        <span className="ml-1 text-xs font-normal text-emerald-700">
                          (comma-separated, optional)
                        </span>
                      </label>
                      <textarea
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none h-12"
                        placeholder="friend1@example.org, friend2@example.org"
                        value={invitedCollaborators}
                        onChange={(e) => setInvitedCollaborators(e.target.value)}
                      />
                      <p className="text-xs text-emerald-700">
                        <button
                          type="button"
                          onClick={() => setShowInvitationEmailModal(true)}
                          className="underline hover:text-emerald-900 font-medium"
                        >
                          Edit invitation email
                        </button>
                      </p>
                    </div>
                      </div>
                      )}
                    </div>

                    {/* Advanced — collapsible, starts collapsed */}
                    <div className="border border-emerald-100 rounded-xl overflow-hidden mt-4">
                      <button
                        type="button"
                        onClick={() => setAdvancedSectionOpen((v) => !v)}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-50/50 text-left font-semibold text-emerald-900 hover:bg-emerald-50"
                      >
                        {advancedSectionOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        Advanced
                      </button>
                      {advancedSectionOpen && (
                      <div className="p-4 pt-4 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-emerald-900">
                          <input
                            type="checkbox"
                            checked={submitAsFeatured}
                            onChange={(e) => setSubmitAsFeatured(e.target.checked)}
                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Submit as a featured map
                        </label>
                        <p className="text-xs text-emerald-700 -mt-1">
                          Proud of your map? Share it to inspire others!
                        </p>
                        {editingMapId && editingOriginalSlug && (
                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!currentUser || !editingOriginalSlug) return;
                                setIsDuplicating(true);
                                setMapError(null);
                                try {
                                  const dupTitle = `Copy of ${mapTitle.trim() || 'Untitled map'}`;
                                  let baseSlug = (mapSlug.trim() || slugify(mapTitle || 'untitled')).toLowerCase();
                                  if (!baseSlug) baseSlug = 'new-map';
                                  const baseSlugDup = `copy-of-${baseSlug}`;
                                  let slug = baseSlugDup;
                                  let n = 1;
                                  while (maps.some((m) => m.slug === slug)) {
                                    slug = `${baseSlugDup}-${n}`;
                                    n++;
                                  }
                                  const selectedPreset = THEME_PRESETS.find((p) => p.id === selectedThemeId) ?? DEFAULT_THEME;
                                  const selectedTheme: MapTheme = {
                                    ...selectedPreset.theme,
                                    backgroundColor: customMapBackgroundColor,
                                    categoryColors: {
                                      [NodeType.EVENT]: customEventColor,
                                      [NodeType.PERSON]: customPersonColor,
                                      [NodeType.SPACE]: customSpaceColor,
                                      [NodeType.COMMUNITY]: customCommunityColor,
                                      [NodeType.REGION]: customRegionColor,
                                      [NodeType.MEDIA]: customMediaColor,
                                    },
                                    regionFont: customRegionFont || undefined,
                                    connectionLine: {
                                      color: customConnectionLineColor,
                                      opacity: customConnectionLineOpacity,
                                      thickness: customConnectionLineThickness,
                                    },
                                  };
                                  const newMap: SceneMap = {
                                    id: crypto.randomUUID(),
                                    slug,
                                    title: dupTitle,
                                    description: mapDescription.trim(),
                                    backgroundImageUrl: maps.find((m) => m.id === editingMapId)?.backgroundImageUrl,
                                    theme: selectedTheme,
                                    adminIds: [currentUser.id],
                                    collaboratorIds: [],
                                    publicView: true,
                                    themeId: selectedThemeId === baseThemeId ? selectedPreset.id : 'custom',
                                    enabledNodeTypes: enabledNodeTypes.length > 0 ? enabledNodeTypes : undefined,
                                    connectionsEnabled: connectionsEnabled ? undefined : false,
                                    icon: mapIcon || undefined,
                                    iconBackground: mapIconBackground || undefined,
                                    mapTemplateId: mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID,
                                    elementConfig: elementConfig ?? undefined,
                                    connectionConfig: connectionConfig ?? undefined,
                                    nodeSizeScale: maps.find((m) => m.id === editingMapId)?.nodeSizeScale,
                                    nodeLabelFontScale: maps.find((m) => m.id === editingMapId)?.nodeLabelFontScale,
                                    regionFontScale: maps.find((m) => m.id === editingMapId)?.regionFontScale,
                                  };
                                  const nextMaps = [...maps, newMap];
                                  await saveMaps(nextMaps);
                                  await copyNodesToSlug(editingOriginalSlug, slug);
                                  const connections = await getConnections(editingOriginalSlug);
                                  if (connections.length > 0) {
                                    await saveConnections(slug, connections);
                                  }
                                  onNavigate(`/maps/${slug}`);
                                } catch (err) {
                                  setMapError(err instanceof Error ? err.message : 'Could not duplicate map. Please try again.');
                                } finally {
                                  setIsDuplicating(false);
                                }
                              }}
                              disabled={isDuplicating}
                              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                            >
                              {isDuplicating ? 'Duplicating...' : 'Duplicate map'}
                            </button>
                            <p className="text-xs text-emerald-700 mt-1.5">
                              Creates a copy with the same content; permissions are reset.
                            </p>
                          </div>
                        )}
                        <div className="space-y-2 pt-4 pb-6">
                          <label className="text-sm font-semibold text-emerald-900">
                            Upload data
                          <span className="ml-1 text-xs font-normal text-emerald-700">
                            (optional)
                          </span>
                        </label>
                        <p className="text-xs text-emerald-700">
                          Upload an xlsx file to bulk import nodes and connections. Duplicates (matching title + type) are skipped.
                        </p>
                        <div className="flex items-center gap-3">
                          <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer">
                            <Upload className="w-4 h-4" />
                            {uploadFile ? uploadFile.name : 'Choose xlsx file'}
                            <input
                              type="file"
                              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setUploadFile(file);
                                setUploadResult(null);
                                setUploadError(null);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const blob = await generateTemplateXlsx();
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'SceneMapper_Template.xlsx';
                                a.click();
                                URL.revokeObjectURL(url);
                              } catch {
                                setUploadError('Could not generate template');
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Template
                          </button>
                        </div>
                        {uploadFile && !uploadResult && (
                          <button
                            type="button"
                            disabled={isUploading || !editingMapId}
                            onClick={async () => {
                              if (!uploadFile || !editingOriginalSlug) return;
                              setIsUploading(true);
                              setUploadError(null);
                              try {
                                const existingNodes = await getNodes(editingOriginalSlug);
                                const existingConnections = await getConnections(editingOriginalSlug);
                                const result = await parseXlsxFile(uploadFile, existingNodes, existingConnections);

                                if (result.nodesAdded.length > 0) {
                                  await saveNodes(editingOriginalSlug, [...existingNodes, ...result.nodesAdded]);
                                }
                                if (result.connectionsAdded.length > 0) {
                                  await saveConnections(editingOriginalSlug, [...existingConnections, ...result.connectionsAdded]);
                                }

                                setUploadResult(result);
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : 'Upload failed';
                                const isPayloadTooLarge = /413|payload too large/i.test(msg);
                                setUploadError(
                                  isPayloadTooLarge
                                    ? 'Import failed (request too large). Try fewer rows or split your file.'
                                    : msg
                                );
                              } finally {
                                setIsUploading(false);
                              }
                            }}
                            className="w-full bg-emerald-100 text-emerald-800 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-200 transition-colors disabled:opacity-50"
                          >
                            {isUploading ? 'Processing...' : 'Process upload'}
                          </button>
                        )}
                        {!editingMapId && (
                          <p className="text-xs text-emerald-600 italic">
                            Create your map first, then return to Edit Map to upload data.
                          </p>
                        )}
                        {uploadResult && (
                          <div className="text-xs bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 space-y-1">
                            <p className="font-semibold text-emerald-900">Upload complete:</p>
                            <ul className="list-disc list-inside text-emerald-700">
                              <li>{uploadResult.nodesAdded.length} nodes added</li>
                              <li>{uploadResult.connectionsAdded.length} connections added</li>
                              {uploadResult.nodesDuplicate > 0 && (
                                <li>{uploadResult.nodesDuplicate} duplicate nodes skipped</li>
                              )}
                              {uploadResult.connectionsDuplicate > 0 && (
                                <li>{uploadResult.connectionsDuplicate} duplicate connections skipped</li>
                              )}
                            </ul>
                            {uploadResult.errors.length > 0 && (
                              <div className="mt-2 text-rose-600">
                                <p className="font-semibold">Errors:</p>
                                <ul className="list-disc list-inside">
                                  {uploadResult.errors.slice(0, 5).map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                  {uploadResult.errors.length > 5 && (
                                    <li>...and {uploadResult.errors.length - 5} more</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {uploadError && (
                          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                            {uploadError}
                          </p>
                        )}
                        </div>
                      </div>
                      )}
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
                      setConfirmPassword('');
                      setForgotPasswordOpen(false);
                      setForgotError(null);
                      setForgotSuccess(false);
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
                      setConfirmPassword('');
                      setForgotPasswordOpen(false);
                      setForgotError(null);
                      setForgotSuccess(false);
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

                {forgotPasswordOpen && showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <p className="text-sm text-emerald-800">
                      Enter your email and we&apos;ll send you a link to reset your password.
                    </p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-emerald-900">Email</label>
                      <input
                        type="email"
                        required
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="you@example.org"
                        value={forgotEmail || email}
                        onChange={(e) => setForgotEmail(e.target.value)}
                      />
                    </div>
                    {forgotError && (
                      <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                        {forgotError}
                      </p>
                    )}
                    {forgotSuccess && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        If an account exists, we&apos;ve sent a reset link to that email.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordOpen(false);
                          setForgotError(null);
                          setForgotSuccess(false);
                          setForgotEmail('');
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={forgotSubmitting}
                        className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
                      >
                        {forgotSubmitting ? 'Sending…' : 'Send reset link'}
                      </button>
                    </div>
                  </form>
                ) : (
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
                  {mode === 'signup' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-emerald-900">Confirm password</label>
                      <input
                        type="password"
                        required
                        className="w-full bg-white/70 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="Retype your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  )}

                  {authError && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                      {authError}
                    </p>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors mt-1"
                    >
                      {mode === 'signup' ? 'Create account' : 'Log in'}
                    </button>
                    {mode === 'login' && showForgotPassword && (
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(true)}
                        className="text-xs text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                </form>
                )}
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
          {currentUser && platformAdmin && (
            <div className="glass rounded-3xl p-6 solarpunk-shadow space-y-6">
              <h3 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide border-b border-emerald-100 pb-2">
                Platform admin
              </h3>
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Feature requests</h4>
                {featureRequests.length === 0 ? (
                  <p className="text-xs text-emerald-700">No pending requests.</p>
                ) : (
                  <ul className="space-y-2">
                    {featureRequests.map((map) => (
                      <li key={map.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-amber-50/80 border border-amber-100">
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => onNavigate(`/maps/${map.slug}`)} className="text-left text-sm font-medium text-emerald-900 truncate block w-full hover:underline">
                            {map.title}
                          </button>
                          <span className="text-[10px] text-emerald-600">/maps/{map.slug}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              setFeatureRequestAction(map.slug);
                              try {
                                const nextOrder = Math.max(0, ...featuredMaps.map((m) => m.featuredOrder ?? 0)) + 1;
                                await updateMapFeature(map.slug, { featuredOrder: nextOrder, featuredActive: true, clearFeatureRequest: true });
                                setFeatureRequests((prev) => prev.filter((m) => m.id !== map.id));
                                setFeaturedMaps((prev) => [...prev, { ...map, featuredOrder: nextOrder, featuredActive: true, featureRequestedAt: undefined }].sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0)));
                              } catch (e) {
                                setMapError(e instanceof Error ? e.message : 'Failed to approve');
                              } finally {
                                setFeatureRequestAction(null);
                              }
                            }}
                            disabled={!!featureRequestAction}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setFeatureRequestAction(map.slug);
                              try {
                                await updateMapFeature(map.slug, { clearFeatureRequest: true });
                                setFeatureRequests((prev) => prev.filter((m) => m.id !== map.id));
                              } catch (e) {
                                setMapError(e instanceof Error ? e.message : 'Failed to deny');
                              } finally {
                                setFeatureRequestAction(null);
                              }
                            }}
                            disabled={!!featureRequestAction}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            Deny
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-2">Featured maps (drag to reorder)</h4>
                {featuredMaps.length === 0 ? (
                  <p className="text-xs text-emerald-700">No featured maps yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {featuredMaps.map((map, index) => (
                      <li
                        key={map.id}
                        className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/70 border border-emerald-100"
                      >
                        <GripVertical className="w-4 h-4 text-emerald-500 shrink-0 cursor-grab" />
                        <span className="text-[10px] font-mono text-emerald-600 w-5 shrink-0">{map.featuredOrder ?? index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => onNavigate(`/maps/${map.slug}`)} className="text-left text-sm font-medium text-emerald-900 truncate block w-full hover:underline">
                            {map.title}
                          </button>
                        </div>
                        <label className="flex items-center gap-1 shrink-0 text-[10px] font-semibold text-emerald-800">
                          <input
                            type="checkbox"
                            checked={map.featuredActive ?? false}
                            onChange={async (e) => {
                              setFeaturedReordering(true);
                              try {
                                await updateMapFeature(map.slug, { featuredActive: e.target.checked });
                                setFeaturedMaps((prev) => prev.map((m) => (m.id === map.id ? { ...m, featuredActive: e.target.checked } : m)));
                              } finally {
                                setFeaturedReordering(false);
                              }
                            }}
                            className="rounded border-emerald-300 text-emerald-600"
                          />
                          On home
                        </label>
                        <button
                          type="button"
                          title="Move up"
                          onClick={async () => {
                            if (index === 0) return;
                            setFeaturedReordering(true);
                            try {
                              const newOrder = [...featuredMaps];
                              [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                              for (let i = 0; i < newOrder.length; i++) {
                                await updateMapFeature(newOrder[i].slug, { featuredOrder: i + 1 });
                              }
                              setFeaturedMaps(newOrder.map((m, i) => ({ ...m, featuredOrder: i + 1 })));
                            } finally {
                              setFeaturedReordering(false);
                            }
                          }}
                          disabled={featuredReordering}
                          className="p-1 rounded hover:bg-emerald-100 text-emerald-700 disabled:opacity-50"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          onClick={async () => {
                            if (index >= featuredMaps.length - 1) return;
                            setFeaturedReordering(true);
                            try {
                              const newOrder = [...featuredMaps];
                              [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                              for (let i = 0; i < newOrder.length; i++) {
                                await updateMapFeature(newOrder[i].slug, { featuredOrder: i + 1 });
                              }
                              setFeaturedMaps(newOrder.map((m, i) => ({ ...m, featuredOrder: i + 1 })));
                            } finally {
                              setFeaturedReordering(false);
                            }
                          }}
                          disabled={featuredReordering}
                          className="p-1 rounded hover:bg-emerald-100 text-emerald-700 disabled:opacity-50"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          {currentUser && maps.length > 0 && (
            <div className="glass rounded-3xl p-6 solarpunk-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-emerald-900 uppercase tracking-wide">
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
                    <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                      {roleForMap(map) === 'Admin' && (
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
                            setPublicView(map.publicView !== false);
                            setInvitedAdmins((map.invitedAdminEmails || []).join(', '));
                            setInvitedCollaborators((map.invitedCollaboratorEmails || []).join(', '));
                            setInvitationEmailSubjectAdmin(map.invitationEmailSubjectAdmin ?? '');
                            setInvitationEmailBodyAdmin(map.invitationEmailBodyAdmin ?? '');
                            setInvitationEmailSubjectCollaborator(map.invitationEmailSubjectCollaborator ?? '');
                            setInvitationEmailBodyCollaborator(map.invitationEmailBodyCollaborator ?? '');
                            setInvitationSenderName(map.invitationSenderName ?? '');
                            setMapIcon(map.icon ?? '🗺️');
                            setMapIconBackground(map.iconBackground ?? '#059669');
                            setBaseThemeId(map.themeId || DEFAULT_THEME.id);
                            const preset = THEME_PRESETS.find((p) => p.id === map.themeId) ?? DEFAULT_THEME;
                            const theme = map.theme || preset.theme;
                            if (theme.categoryColors) {
                              setCustomEventColor(theme.categoryColors[NodeType.EVENT] ?? customEventColor);
                              setCustomPersonColor(theme.categoryColors[NodeType.PERSON] ?? customPersonColor);
                              setCustomSpaceColor(theme.categoryColors[NodeType.SPACE] ?? customSpaceColor);
                              setCustomCommunityColor(theme.categoryColors[NodeType.COMMUNITY] ?? customCommunityColor);
                              setCustomRegionColor(theme.categoryColors[NodeType.REGION] ?? customRegionColor);
                            }
                            setCustomMapBackgroundColor(theme.backgroundColor ?? '#fdfcf0');
                            setCustomRegionFont(theme.regionFont ?? '');
                            if (theme.connectionLine) {
                              setCustomConnectionLineColor(theme.connectionLine.color);
                              setCustomConnectionLineOpacity(theme.connectionLine.opacity);
                              setCustomConnectionLineThickness(theme.connectionLine.thickness);
                            }
                            setEnabledNodeTypes(
                              map.enabledNodeTypes && map.enabledNodeTypes.length > 0
                                ? map.enabledNodeTypes
                                : Object.values(NodeType),
                            );
                            setConnectionsEnabled(map.connectionsEnabled !== false);
                          }}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Edit map"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
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
                      {roleForMap(map) === 'Admin' && (
                        <button
                          type="button"
                          onClick={() => setMapToDelete(map)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                          title="Delete map"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setEditingMapId(null);
                  setEditingOriginalSlug(null);
                  setMapTitle('');
                  setMapSlug('');
                  setMapDescription('');
                  setSelectedThemeId(DEFAULT_THEME.id);
                  setThemeSectionOpen(false);
                  setRolesSectionOpen(false);
                  setAdvancedSectionOpen(false);
                  setBaseThemeId(DEFAULT_THEME.id);
                  const t = DEFAULT_THEME.theme;
                  if (t.categoryColors) {
                    setCustomEventColor(t.categoryColors[NodeType.EVENT] ?? customEventColor);
                    setCustomPersonColor(t.categoryColors[NodeType.PERSON] ?? customPersonColor);
                    setCustomSpaceColor(t.categoryColors[NodeType.SPACE] ?? customSpaceColor);
                    setCustomCommunityColor(t.categoryColors[NodeType.COMMUNITY] ?? customCommunityColor);
                    setCustomRegionColor(t.categoryColors[NodeType.REGION] ?? customRegionColor);
                  }
                  setCustomMapBackgroundColor(t.backgroundColor ?? '#fdfcf0');
                  setCustomRegionFont(t.regionFont ?? '');
                  if (t.connectionLine) {
                    setCustomConnectionLineColor(t.connectionLine.color);
                    setCustomConnectionLineOpacity(t.connectionLine.opacity);
                    setCustomConnectionLineThickness(t.connectionLine.thickness);
                  }
                  setCollaboratorPassword('');
                  setInvitedAdmins('');
                  setInvitedCollaborators('');
                  setInvitationEmailSubjectAdmin('');
                  setInvitationEmailBodyAdmin('');
                  setInvitationEmailSubjectCollaborator('');
                  setInvitationEmailBodyCollaborator('');
                  setInvitationSenderName('');
                  setMapIcon('🗺️');
                  setMapIconBackground('#059669');
                  setBackgroundFile(null);
                  setBackgroundError(null);
                  setMapError(null);
                  setEnabledNodeTypes(DEFAULT_ENABLED_NODE_TYPES);
                  setConnectionsEnabled(true);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create map
              </button>
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

      {/* Element/Connection icon picker modal */}
      {elementPickerFor === 'icon' && elementPickerTarget && (
        <ElementIconPicker
          value={
            elementPickerTarget.type === 'CONNECTION'
              ? (connectionConfig?.icon ?? MAP_TEMPLATES.find((t) => t.id === (mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID))?.connectionIcon ?? 'Link2')
              : getElementIcon(elementPickerTarget.type as NodeType, elementConfig, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID)
          }
          onChange={(icon) => {
            if (elementPickerTarget.type === 'CONNECTION') {
              setConnectionConfig((c) => ({ ...c, icon }));
            } else {
              const type = elementPickerTarget.type as NodeType;
              const label = getElementLabel(type, elementConfig, mapTemplateId ?? DEFAULT_MAP_TEMPLATE_ID);
              const enabled = elementConfig?.[type]?.enabled ?? enabledNodeTypes.includes(type);
              setElementConfig((c) => ({ ...c, [type]: { ...(c?.[type] ?? { label, icon, enabled }), icon } }));
            }
          }}
          backgroundColor={
            elementPickerTarget.type === 'CONNECTION'
              ? customConnectionLineColor
              : {
                  [NodeType.EVENT]: customEventColor,
                  [NodeType.PERSON]: customPersonColor,
                  [NodeType.SPACE]: customSpaceColor,
                  [NodeType.COMMUNITY]: customCommunityColor,
                  [NodeType.REGION]: customRegionColor,
                  [NodeType.MEDIA]: customMediaColor,
                }[elementPickerTarget.type as NodeType]
          }
          color={
            elementPickerTarget.type === 'CONNECTION'
              ? customConnectionLineColor
              : {
                  [NodeType.EVENT]: customEventColor,
                  [NodeType.PERSON]: customPersonColor,
                  [NodeType.SPACE]: customSpaceColor,
                  [NodeType.COMMUNITY]: customCommunityColor,
                  [NodeType.REGION]: customRegionColor,
                  [NodeType.MEDIA]: customMediaColor,
                }[elementPickerTarget.type as NodeType]
          }
          onColorChange={(color) => {
            if (elementPickerTarget.type === 'CONNECTION') {
              setCustomConnectionLineColor(color);
            } else {
              const type = elementPickerTarget.type as NodeType;
              if (type === NodeType.EVENT) setCustomEventColor(color);
              if (type === NodeType.PERSON) setCustomPersonColor(color);
              if (type === NodeType.SPACE) setCustomSpaceColor(color);
              if (type === NodeType.COMMUNITY) setCustomCommunityColor(color);
              if (type === NodeType.REGION) setCustomRegionColor(color);
              if (type === NodeType.MEDIA) setCustomMediaColor(color);
            }
            if (selectedThemeId === baseThemeId) setSelectedThemeId('custom');
          }}
          onClose={() => {
            setElementPickerFor(null);
            setElementPickerTarget(null);
          }}
        />
      )}

      {/* Map icon picker modal */}
      {showIconPicker && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm"
          onClick={() => setShowIconPicker(false)}
        >
          <div
            className="glass w-full max-w-sm rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-100 bg-white/60 flex justify-between items-center">
              <h2 className="text-lg font-bold text-emerald-950">Choose icon</h2>
              <button
                type="button"
                onClick={() => setShowIconPicker(false)}
                className="p-2 rounded-full hover:bg-emerald-100 text-emerald-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 bg-white/40">
              <div className="flex justify-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl overflow-hidden"
                  style={{ backgroundColor: mapIconBackground }}
                >
                  {(mapIcon.startsWith('data:') || mapIcon.startsWith('http')) ? (
                    <img src={mapIcon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    mapIcon
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-emerald-900">Upload image</label>
                <label className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer">
                  <Image className="w-4 h-4" />
                  Choose image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') setMapIcon(reader.result);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
                <p className="text-[10px] text-emerald-700">PNG, JPG, WebP or GIF · square images work best</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-emerald-900">Emoji</label>
                <div className="grid grid-cols-8 gap-2">
                  {['🗺️', '🌍', '🌎', '🌏', '📍', '🎯', '⭐', '💫', '🌱', '🌿', '🌳', '🏙️', '🎨', '🎭', '🎵', '🎤', '🎸', '🎹', '📚', '💡', '🔮', '🌈', '🌊', '🔥', '⚡', '🚀', '🎪', '🎠', '🏛️', '🏰', '🌸', '🍀'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setMapIcon(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-100 transition-colors ${(mapIcon.startsWith('data:') || mapIcon.startsWith('http')) ? 'bg-white/50' : mapIcon === emoji ? 'bg-emerald-200 ring-2 ring-emerald-400' : 'bg-white/50'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-emerald-900">Background colour</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="h-10 min-h-[44px] w-20 rounded-lg border border-emerald-100 bg-white/70 touch-manipulation"
                    value={mapIconBackground}
                    onChange={(e) => setMapIconBackground(e.target.value)}
                  />
                  <div className="flex gap-1">
                    {['#059669', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#1d4ed8'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setMapIconBackground(color)}
                        className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${mapIconBackground === color ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Dashboard;

