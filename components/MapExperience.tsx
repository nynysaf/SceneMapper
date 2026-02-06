import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { MapNode, MapConnection, NodeType, UserSession, MapTheme, SceneMap, User, AuthSession } from '../types';
import { INITIAL_NODES, CATEGORY_COLORS, DEFAULT_ENABLED_NODE_TYPES } from '../constants';
import { getElementLabel } from '../lib/element-config';
import { getNodes as loadNodes, saveNodes as persistNodes, getConnections as loadConnections, saveConnections as persistConnections, getSession, getMaps, saveMaps, isAbortError } from '../lib/data';
import Map from './Map';
import Sidebar from './Sidebar';
import SubmissionModal from './SubmissionModal';
import NodePopup from './NodePopup';
import AdminReviewModal from './AdminReviewModal';
import { Plus, Info, Users, ShieldCheck, MapPin, Inbox, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toCsv, toXlsx, exportFilename } from '../lib/export-data';

interface MapExperienceProps {
  /**
   * Map data from page (fetched once). When provided, MapExperience uses it for
   * display settings and role resolution instead of calling getMapBySlug again.
   */
  map?: SceneMap | null;
  /**
   * Map slug for loading/saving nodes via the data layer.
   * Used for both node storage and role resolution (e.g. torontopia, or custom map slug).
   */
  mapSlug?: string;
  /**
   * @deprecated Use mapSlug. If mapSlug is not set, slug is derived from this (torontopia_nodes → torontopia).
   */
  storageKey?: string;
  /**
   * Title shown in the top-left brand card.
   */
  mapTitle?: string;
  /**
   * Subtitle shown under the title in the brand card.
   */
  mapSubtitle?: string;
  /**
   * Optional background image URL for this map.
   */
  mapBackgroundImageUrl?: string;
  /**
   * Optional theme configuration controlling colors and fonts
   * for this specific map.
   */
  mapTheme?: MapTheme;
  /**
   * Optional long-form description of the map to show in the sidebar
   * "About" section.
   */
  mapDescription?: string;
  /**
   * Pre-fetched nodes from page (Tier 2: parallel fetch at page level).
   * When provided, MapExperience uses these instead of fetching.
   */
  initialNodes?: MapNode[];
  /**
   * Pre-fetched connections from page (Tier 2).
   * When provided, MapExperience uses these instead of fetching.
   */
  initialConnections?: MapConnection[];
  /**
   * When true, page is still loading data; show loading state and don't fetch.
   */
  isDataLoading?: boolean;
}

/**
 * Reusable map experience container.
 *
 * This encapsulates the Torontopia interaction model (nodes, roles,
 * submission + admin review) so we can mount it for different maps
 * from a higher-level app shell or router.
 */
const MapExperience: React.FC<MapExperienceProps> = ({
  map,
  mapSlug,
  storageKey = 'torontopia_nodes',
  mapTitle = 'Torontopia',
  mapSubtitle = 'Solarpunk Commons Map',
  mapBackgroundImageUrl,
  mapTheme,
  mapDescription,
  initialNodes,
  initialConnections,
  isDataLoading = false,
}) => {
  const effectiveSlug =
    mapSlug ??
    (storageKey === 'torontopia_nodes' ? 'torontopia' : (storageKey || '').replace(/^scene_mapper_nodes_/, '') || 'torontopia');

  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [connections, setConnections] = useState<MapConnection[]>([]);
  const [userSession, setUserSession] = useState<UserSession>({ role: 'public', name: 'Guest' });
  const [activeFilters, setActiveFilters] = useState<NodeType[]>(Object.values(NodeType));
  const [connectionsFilterOn, setConnectionsFilterOn] = useState(true);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [submissionPresetKind, setSubmissionPresetKind] = useState<NodeType | 'CONNECTION' | null>(null);
  const [isAdminReviewOpen, setIsAdminReviewOpen] = useState(false);
  const [pendingNode, setPendingNode] = useState<Partial<MapNode> | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<MapNode[]>([]);
  const [popupAnchor, setPopupAnchor] = useState<{ x: number; y: number } | null>(null);
  const [hasCollaboratorPassword, setHasCollaboratorPassword] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editType, setEditType] = useState<NodeType>(NodeType.EVENT);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [hasShownReviewThisSession, setHasShownReviewThisSession] = useState(false);
  const [nodeSizeScale, setNodeSizeScale] = useState(1);
  const [nodeLabelFontScale, setNodeLabelFontScale] = useState(1);
  const [regionFontScale, setRegionFontScale] = useState(1);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [enabledNodeTypes, setEnabledNodeTypes] = useState<NodeType[]>(() => DEFAULT_ENABLED_NODE_TYPES);
  const [connectionsEnabled, setConnectionsEnabled] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'jpeg' | 'png' | 'pdf' | null>(null);
  const mapCaptureRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<MapNode[]>([]);
  const connectionsRef = useRef<MapConnection[]>([]);
  const [backgroundImageSize, setBackgroundImageSize] = useState<{ width: number; height: number } | null>(null);

  // Resolve background image dimensions for export (use when present, else default 1000x1000)
  useEffect(() => {
    if (!mapBackgroundImageUrl) {
      setBackgroundImageSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setBackgroundImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => setBackgroundImageSize(null);
    img.crossOrigin = 'anonymous';
    img.src = mapBackgroundImageUrl;
  }, [mapBackgroundImageUrl]);

  // Derive display settings from passed map (page fetches once; no duplicate getMapBySlug)
  useEffect(() => {
    if (map) {
      setNodeSizeScale(map.nodeSizeScale ?? 1);
      setNodeLabelFontScale(map.nodeLabelFontScale ?? 1);
      setRegionFontScale(map.regionFontScale ?? 1);
      const enabled =
        map.enabledNodeTypes && map.enabledNodeTypes.length > 0
          ? map.enabledNodeTypes
          : DEFAULT_ENABLED_NODE_TYPES;
      setEnabledNodeTypes(enabled);
      setConnectionsEnabled(map.connectionsEnabled !== false);
      setActiveFilters((prev) => prev.filter((t) => enabled.includes(t)));
    }
  }, [map]);

  // Clear nodes/connections when page is loading (e.g. slug change) to avoid stale data
  useEffect(() => {
    if (isDataLoading) {
      setNodes([]);
      setConnections([]);
      return;
    }
  }, [isDataLoading]);

  // Load effect: when page provides data (initialNodes), use it; else fetch. Always hydrate role.
  useEffect(() => {
    if (isDataLoading) return;

    const ac = new AbortController();
    const opts = { signal: ac.signal };

    const applyRole = (session: Awaited<ReturnType<typeof getSession>>) => {
      if (ac.signal.aborted || !session) return;
      const currentUser = { id: session.userId, email: session.email ?? '', name: session.name ?? 'User' };
      let role: UserSession['role'] = 'public';
      if (map) {
        setHasCollaboratorPassword(!!map.collaboratorPassword);
        if (map.adminIds.includes(currentUser.id)) role = 'admin';
        else if (map.collaboratorIds.includes(currentUser.id)) role = 'collaborator';
      }
      setUserSession({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name || currentUser.email,
        role,
      });
    };

    if (initialNodes !== undefined && initialConnections !== undefined) {
      setNodes(initialNodes);
      setConnections(initialConnections);
      nodesRef.current = initialNodes;
      connectionsRef.current = initialConnections;
      Promise.all([getSession()])
        .then(([session]) => { if (!ac.signal.aborted) applyRole(session); })
        .catch(() => { /* ignore */ });
      return () => ac.abort();
    }

    Promise.all([
      loadNodes(effectiveSlug, opts),
      loadConnections(effectiveSlug, opts),
      getSession(),
    ])
      .then(([loadedNodes, loadedConnections, session]) => {
        if (ac.signal.aborted) return;
        const nodesToSet = loadedNodes.length ? loadedNodes : effectiveSlug === 'torontopia' ? INITIAL_NODES : [];
        setNodes(nodesToSet);
        setConnections(loadedConnections);
        nodesRef.current = nodesToSet;
        connectionsRef.current = loadedConnections;
        applyRole(session);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setNodes(effectiveSlug === 'torontopia' ? INITIAL_NODES : []);
        setConnections([]);
        nodesRef.current = effectiveSlug === 'torontopia' ? INITIAL_NODES : [];
        connectionsRef.current = [];
      });
    return () => ac.abort();
  }, [effectiveSlug, map, isDataLoading, initialNodes, initialConnections]);

  // Flush nodes and connections on unmount so in-flight saves aren't lost when user closes/navigates away
  useEffect(() => {
    return () => {
      const slug = effectiveSlug;
      const n = nodesRef.current;
      const c = connectionsRef.current;
      if (n.length > 0 || c.length > 0) {
        void persistNodes(slug, n);
        void persistConnections(slug, c);
      }
    };
  }, [effectiveSlug]);

  const saveNodes = useCallback(
    (newNodes: MapNode[]) => {
      setNodes(newNodes);
      nodesRef.current = newNodes;
      void persistNodes(effectiveSlug, newNodes);
    },
    [effectiveSlug],
  );

  const saveConnections = useCallback(
    (newConnections: MapConnection[]) => {
      setConnections(newConnections);
      connectionsRef.current = newConnections;
      void persistConnections(effectiveSlug, newConnections);
    },
    [effectiveSlug],
  );

  const persistNodeSizeScale = useCallback(
    (value: number) => {
      setNodeSizeScale(value);
      getMaps().then((maps) => {
        const idx = maps.findIndex((m) => m.slug === effectiveSlug);
        if (idx === -1) return;
        const updated = [...maps];
        updated[idx] = { ...updated[idx], nodeSizeScale: value };
        void saveMaps(updated);
      });
    },
    [effectiveSlug],
  );

  const persistNodeLabelFontScale = useCallback(
    (value: number) => {
      setNodeLabelFontScale(value);
      getMaps().then((maps) => {
        const idx = maps.findIndex((m) => m.slug === effectiveSlug);
        if (idx === -1) return;
        const updated = [...maps];
        updated[idx] = { ...updated[idx], nodeLabelFontScale: value };
        void saveMaps(updated);
      });
    },
    [effectiveSlug],
  );

  const persistRegionFontScale = useCallback(
    (value: number) => {
      setRegionFontScale(value);
      getMaps().then((maps) => {
        const idx = maps.findIndex((m) => m.slug === effectiveSlug);
        if (idx === -1) return;
        const updated = [...maps];
        updated[idx] = { ...updated[idx], regionFontScale: value };
        void saveMaps(updated);
      });
    },
    [effectiveSlug],
  );

  // --- Map Handlers ---

  // Handles repositioning of nodes (Collaborator/Admin only)
  const handleNodeMove = (id: string, x: number, y: number) => {
    const updatedNodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node));
    saveNodes(updatedNodes);
  };

  // Bulk repositioning when multiple nodes are selected and dragged
  const handleNodesMove = useCallback(
    (updates: { id: string; x: number; y: number }[]) => {
      const byId = Object.fromEntries(updates.map((u) => [u.id, u]));
      const updatedNodes = nodes.map((node) => {
        const u = byId[node.id] as { x: number; y: number } | undefined;
        return u ? { ...node, x: u.x, y: u.y } : node;
      });
      saveNodes(updatedNodes);
    },
    [nodes, saveNodes],
  );

  const handleMapBackgroundClick = useCallback(() => {
    setSelectedNodes([]);
    setPopupAnchor(null);
  }, []);

  // Handles clicking a node: single select (popup) or Shift+Click for multi-select
  const handleNodeSelect = (node: MapNode, screenPos: { x: number; y: number }, opts?: { shiftKey?: boolean }) => {
    if (opts?.shiftKey && userSession.role !== 'public') {
      // Multi-select: add/remove from selection
      setSelectedNodes((prev) => {
        const idx = prev.findIndex((n) => n.id === node.id);
        if (idx >= 0) {
          const next = prev.filter((n) => n.id !== node.id);
          setPopupAnchor(null); // No popup when transitioning from multi-select
          return next;
        }
        const next = [...prev, node];
        setPopupAnchor(null); // No popup for multi-select
        return next;
      });
    } else {
      // Single select
      if (selectedNodes.length === 1 && selectedNodes[0].id === node.id) {
        setSelectedNodes([]);
        setPopupAnchor(null);
      } else {
        setSelectedNodes([node]);
        setPopupAnchor(screenPos);
      }
    }
  };

  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  // Initiates the two-step placement process (Form -> Map Click)
  const startPlacement = (nodeData: Partial<MapNode>) => {
    setPendingNode(nodeData);
    setIsSubmissionOpen(false);
    setSubmissionPresetKind(null);
    setSelectedNodes([]);
    setPopupAnchor(null);
  };

  const handleSubmitConnection = useCallback(
    (partial: Partial<MapConnection>) => {
      const connection: MapConnection = {
        id: Math.random().toString(36).slice(2, 11),
        fromNodeId: partial.fromNodeId!,
        toNodeId: partial.toNodeId!,
        description: partial.description ?? '',
        collaboratorId: userSession.name,
        status: (partial.status as MapConnection['status']) ?? (userSession.role === 'public' ? 'pending' : 'approved'),
      };
      const next = [...connections, connection];
      saveConnections(next);
      setIsSubmissionOpen(false);
    },
    [connections, userSession.name, userSession.role, saveConnections],
  );

  // Finalizes node creation upon map click
  const handleMapClick = (x: number, y: number, ev?: { clientX: number; clientY: number }) => {
    if (pendingNode) {
      const node: MapNode = {
        id: crypto.randomUUID(),
        type: pendingNode.type || NodeType.EVENT,
        title: pendingNode.title || 'Untitled',
        description: pendingNode.description || '',
        website: pendingNode.website || '',
        x: x,
        y: y,
        tags: pendingNode.tags || [],
        primaryTag: pendingNode.primaryTag || 'other',
        collaboratorId: userSession.name,
        status: userSession.role === 'public' ? 'pending' : 'approved',
      };

      const newNodes = [...nodes, node];
      saveNodes(newNodes);
      setPendingNode(null);

      // Confetti from node position (fades within ~2s)
      if (typeof window !== 'undefined' && ev) {
        import('canvas-confetti').then(({ default: confetti }) => {
          const origin = { x: ev.clientX / window.innerWidth, y: ev.clientY / window.innerHeight };
          confetti({ origin, particleCount: 50, spread: 60, startVelocity: 30, decay: 0.9 });
        });
      }
    }
  };

  // --- Admin Logic ---

  const handleApprove = (id: string) => {
    const updatedNodes = nodes.map((node) =>
      node.id === id ? { ...node, status: 'approved' as const } : node,
    );
    saveNodes(updatedNodes);
  };

  const handleDeny = (id: string) => {
    const updatedNodes = nodes.filter((node) => node.id !== id);
    saveNodes(updatedNodes);
    if (selectedNodes.some((n) => n.id === id)) {
      setSelectedNodes((prev) => prev.filter((n) => n.id !== id));
      setPopupAnchor(null);
    }
  };

  const handleApproveConnection = useCallback(
    (id: string) => {
      const updated = connections.map((c) =>
        c.id === id ? { ...c, status: 'approved' as const } : c,
      );
      saveConnections(updated);
    },
    [connections, saveConnections],
  );

  const handleDenyConnection = useCallback(
    (id: string) => {
      const updated = connections.filter((c) => c.id !== id);
      saveConnections(updated);
    },
    [connections, saveConnections],
  );

  const handleConnectionCurveChange = useCallback(
    (connectionId: string, curveOffsetX: number, curveOffsetY: number) => {
      const updated = connections.map((c) =>
        c.id === connectionId ? { ...c, curveOffsetX, curveOffsetY } : c,
      );
      saveConnections(updated);
    },
    [connections, saveConnections],
  );

  // --- Filtering & Role Switching ---

  const toggleFilter = (type: NodeType) => {
    setActiveFilters((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // Cycles through roles for demonstration purposes
  const switchRole = () => {
    const roles: UserSession['role'][] = ['public', 'collaborator', 'admin'];
    const nextRole = roles[(roles.indexOf(userSession.role) + 1) % roles.length];
    setUserSession({ role: nextRole, name: nextRole === 'public' ? 'Guest' : 'Expert' });
    setPendingNode(null);
  };

  // Computed data for UI
  const pendingNodeCount = nodes.filter((n) => n.status === 'pending').length;
  const pendingConnectionCount = connections.filter((c) => c.status === 'pending').length;
  const pendingReviewCount = pendingNodeCount + pendingConnectionCount;

  const categoryColors: Record<NodeType, string> = {
    [NodeType.EVENT]:
      mapTheme?.categoryColors?.[NodeType.EVENT] ?? CATEGORY_COLORS[NodeType.EVENT],
    [NodeType.PERSON]:
      mapTheme?.categoryColors?.[NodeType.PERSON] ?? CATEGORY_COLORS[NodeType.PERSON],
    [NodeType.SPACE]:
      mapTheme?.categoryColors?.[NodeType.SPACE] ?? CATEGORY_COLORS[NodeType.SPACE],
    [NodeType.COMMUNITY]:
      mapTheme?.categoryColors?.[NodeType.COMMUNITY] ?? CATEGORY_COLORS[NodeType.COMMUNITY],
    [NodeType.REGION]:
      mapTheme?.categoryColors?.[NodeType.REGION] ?? CATEGORY_COLORS[NodeType.REGION],
    [NodeType.MEDIA]:
      mapTheme?.categoryColors?.[NodeType.MEDIA] ?? CATEGORY_COLORS[NodeType.MEDIA],
  };

  const filteredNodes = nodes.filter((n) => {
    if (!enabledNodeTypes.includes(n.type)) return false;
    const passFilter = activeFilters.includes(n.type);
    const isOwnPending =
      n.status === 'pending' && n.collaboratorId && n.collaboratorId === userSession.name;

    const isApproved = n.status === 'approved';
    const isAdmin = userSession.role === 'admin';
    const isCollaboratorOwner =
      userSession.role === 'collaborator' && n.collaboratorId === userSession.name;
    const isPublicOwnerPending = userSession.role === 'public' && isOwnPending;

    const isVisible = isApproved || isAdmin || isCollaboratorOwner || isPublicOwnerPending;

    return passFilter && isVisible;
  });

  // All nodes/connections to show in export (no type filter; approved + own pending)
  const exportNodes = nodes.filter((n) => {
    if (!enabledNodeTypes.includes(n.type)) return false;
    const isApproved = n.status === 'approved';
    const isAdmin = userSession.role === 'admin';
    const isCollaboratorOwner =
      userSession.role === 'collaborator' && n.collaboratorId === userSession.name;
    const isPublicOwnerPending =
      userSession.role === 'public' &&
      n.status === 'pending' &&
      n.collaboratorId === userSession.name;
    return isApproved || isAdmin || isCollaboratorOwner || isPublicOwnerPending;
  });

  // Auto-open admin review modal when an admin lands on a map with pending nodes,
  // and close it automatically once the queue is empty.
  useEffect(() => {
    if (userSession.role === 'admin' && pendingReviewCount > 0 && !hasShownReviewThisSession) {
      setIsAdminReviewOpen(true);
      setHasShownReviewThisSession(true);
    }
    if (isAdminReviewOpen && pendingReviewCount === 0) {
      setIsAdminReviewOpen(false);
    }
  }, [userSession.role, pendingReviewCount, isAdminReviewOpen, hasShownReviewThisSession]);

  const canShowJoin =
    hasCollaboratorPassword && userSession.role === 'public' && !!userSession.id && !!mapSlug;

  // When user picks a download format: show full map (export mode) then capture and download
  const handleDownloadRequested = useCallback((format: 'jpeg' | 'png' | 'pdf') => {
    setIsExporting(true);
    setExportFormat(format);
  }, []);

  // Export data (CSV or XLSX) - admin only
  const handleExportRequested = useCallback(
    (format: 'csv' | 'xlsx') => {
      const filename = exportFilename(mapTitle ?? 'Map', format);
      if (format === 'csv') {
        const csv = toCsv(nodes, connections);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toXlsx(nodes, connections).then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        });
      }
    },
    [nodes, connections, mapTitle]
  );

  useEffect(() => {
    if (!isExporting || !exportFormat) return;

    const runCapture = () => {
      const el = mapCaptureRef.current;
      if (!el) {
        setIsExporting(false);
        setExportFormat(null);
        return;
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const dateForFilename = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const safeTitle = (mapTitle || 'Map').replace(/[\s\\/:*?"<>|]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'map';

      const exportScale = 2;
      html2canvas(el, {
        scale: exportScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: mapTheme?.backgroundColor ?? '#fdfcf0',
        logging: false,
      })
        .then((canvas) => {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const scale = canvas.width / el.offsetWidth;
            const title = mapTitle || 'Map';
            const padding = 24 * scale;
            const titleX = canvas.width - padding;
            const titleY = 36 * scale;
            const dateY = 56 * scale;
            ctx.textAlign = 'right';
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            ctx.font = `bold ${22 * scale}px system-ui, sans-serif`;
            ctx.fillText(title, titleX, titleY);
            ctx.font = `${12 * scale}px system-ui, sans-serif`;
            ctx.fillText(dateStr, titleX, dateY);
          }

          const ext = exportFormat === 'pdf' ? 'pdf' : exportFormat;
          const filename = `${safeTitle}_${dateForFilename}.${ext}`;

          if (exportFormat === 'pdf') {
            const imgData = canvas.toDataURL('image/png');
            const pdfW = el.offsetWidth;
            const pdfH = el.offsetHeight;
            const pdf = new jsPDF('p', 'px', [pdfW, pdfH]);
            pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
            pdf.save(filename);
          } else {
            canvas.toBlob(
              (blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
              },
              exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
              0.95
            );
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsExporting(false);
          setExportFormat(null);
        });
    };

    const t = setTimeout(runCapture, 350);
    return () => clearTimeout(t);
  }, [isExporting, exportFormat, mapTitle, mapTheme]);

  const handleJoinCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    if (!userSession.id || !effectiveSlug) {
      setJoinError('You need to be logged in to join as a collaborator.');
      return;
    }

    const useBackend = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_BACKEND === 'true';

    if (useBackend) {
      try {
        const r = await fetch(`/api/maps/${encodeURIComponent(effectiveSlug)}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: joinPassword.trim() }),
        });
        const data = await r.json();
        if (!r.ok) {
          setJoinError((data as { error?: string }).error || 'Could not join as collaborator.');
          return;
        }
        setUserSession((prev) => ({
          ...prev,
          role: 'collaborator',
          name: prev.name || userSession.email || 'Collaborator',
        }));
        setIsJoinOpen(false);
        setJoinPassword('');
        setJoinError(null);
      } catch {
        setJoinError('Something went wrong while joining as collaborator.');
      }
      return;
    }

    try {
      const maps = await getMaps();
      const index = maps.findIndex((m) => m.slug === effectiveSlug);
      if (index === -1) {
        setJoinError('Could not find this map configuration.');
        return;
      }
      const sceneMap = maps[index];
      if (!sceneMap.collaboratorPassword) {
        setJoinError('This map does not require a collaborator password.');
        return;
      }
      if (joinPassword.trim() !== sceneMap.collaboratorPassword) {
        setJoinError('Incorrect collaborator password. Please try again.');
        return;
      }

      if (!sceneMap.collaboratorIds.includes(userSession.id)) {
        const updated = [...maps];
        updated[index] = {
          ...sceneMap,
          collaboratorIds: [...sceneMap.collaboratorIds, userSession.id],
        };
        await saveMaps(updated);
      }

      setUserSession((prev) => ({
        ...prev,
        role: 'collaborator',
        name: prev.name || userSession.email || 'Collaborator',
      }));
      setIsJoinOpen(false);
      setJoinPassword('');
      setJoinError(null);
    } catch {
      setJoinError('Something went wrong while joining as collaborator.');
    }
  };

  const startEditNode = (node: MapNode) => {
    setSelectedNodes([node]);
    setEditTitle(node.title);
    setEditDescription(node.description);
    setEditWebsite(node.website || '');
    setEditType(node.type);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNode) return;
    const updatedNodes = nodes.map((n) =>
      n.id === selectedNode.id
        ? {
            ...n,
            title: editTitle,
            description: editDescription,
            website: editWebsite || undefined,
            type: editType,
          }
        : n,
    );
    saveNodes(updatedNodes);
    const updated = updatedNodes.find((n) => n.id === selectedNode.id) || selectedNode;
    setSelectedNodes([updated]);
    setIsEditOpen(false);
  };

  const requestDeleteNode = (node: MapNode) => {
    setSelectedNodes([node]);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedNode) return;
    const updatedNodes = nodes.filter((n) => n.id !== selectedNode.id);
    saveNodes(updatedNodes);
    setSelectedNodes([]);
    setPopupAnchor(null);
    setIsDeleteConfirmOpen(false);
    setIsEditOpen(false);
  };

  // Persist last known title so it doesn't disappear on mobile when map area is panned/left
  const lastTitleRef = useRef(mapTitle ?? '');
  if (mapTitle) lastTitleRef.current = mapTitle;
  const displayTitle = mapTitle || lastTitleRef.current;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col">
      {/* --- Top: map card + role card — fixed, z-[65] so permission button stays above sidebar when expanded --- */}
      <header className="fixed top-0 left-0 right-0 z-[65] pointer-events-none pt-[max(env(safe-area-inset-top),0.75rem)] px-3 md:px-4 flex justify-between items-start">
        {/* Map card — top-left */}
        <div className="pointer-events-auto glass p-2 md:p-3 rounded-xl md:rounded-2xl solarpunk-shadow flex items-center gap-2 md:gap-3 min-w-0">
            <div
              className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-xs md:text-sm shrink-0 overflow-hidden"
              style={{ backgroundColor: map?.iconBackground ?? mapTheme?.primaryColor ?? '#059669' }}
            >
              {map?.icon && (map.icon.startsWith('data:') || map.icon.startsWith('http')) ? (
                <img src={map.icon} alt="" className="w-full h-full object-cover" />
              ) : map?.icon ? (
                <span className="text-base md:text-lg">{map.icon}</span>
              ) : (
                displayTitle.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold text-emerald-900 leading-tight truncate">{displayTitle}</h1>
              <Link
                href="/"
                className="text-[10px] md:text-xs text-emerald-700 font-medium hover:text-emerald-900 hover:underline"
              >
                {mapSubtitle}
              </Link>
            </div>
        </div>
        {/* Join + Review — top-right (permissions button moved to bottom-left) */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {canShowJoin && (
            <button
              onClick={() => {
                setIsJoinOpen(true);
                setJoinPassword('');
                setJoinError(null);
              }}
              className="glass px-2 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              Join as collaborator
            </button>
          )}
          {userSession.role === 'admin' && pendingReviewCount > 0 && (
            <button
              onClick={() => setIsAdminReviewOpen(true)}
              className="bg-amber-100 text-amber-800 p-2 md:p-3 rounded-xl md:rounded-2xl solarpunk-shadow hover:bg-amber-200 transition-transform active:scale-95 flex items-center gap-1 md:gap-2 px-3 md:px-5 font-bold relative min-h-[44px] md:min-h-0"
            >
              <Inbox size={18} className="md:w-5 md:h-5" />
              <span className="hidden md:inline">Review Queue</span>
              <span className="absolute -top-1 -right-1 md:-top-2 md:-right-2 bg-amber-600 text-white text-[9px] md:text-[10px] w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center border-2 border-white">
                {pendingReviewCount}
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Placement Tooltip */}
      {pendingNode && (
        <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 z-[60] animate-bounce px-2">
          <div className="bg-emerald-600 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-full solarpunk-shadow flex items-center gap-2 md:gap-3 font-bold border-2 border-white text-sm md:text-base">
            <MapPin size={18} className="md:w-5 md:h-5 shrink-0" />
            <span>Tap or click on the map to place &quot;{pendingNode.title}&quot;</span>
            <button
              onClick={() => setPendingNode(null)}
              className="ml-2 bg-white/20 hover:bg-white/30 p-1 rounded-full transition-colors"
            >
              <Plus className="rotate-45" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Join as collaborator modal — safe area insets for notches/home indicator */}
      {isJoinOpen && (
        <div
          className="absolute inset-0 z-[65] flex items-center justify-center bg-emerald-950/30 backdrop-blur-sm px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          onClick={() => {
            setIsJoinOpen(false);
            setJoinPassword('');
            setJoinError(null);
          }}
        >
          <div
            className="glass w-full max-w-md rounded-3xl solarpunk-shadow overflow-hidden max-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-100 flex justify-between items-center bg-white/60">
              <div>
                <h2 className="text-lg font-bold text-emerald-950">Join as collaborator</h2>
                <p className="text-[11px] text-emerald-700">
                  Enter the collaborator password shared with you by this map&apos;s admins.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsJoinOpen(false);
                  setJoinPassword('');
                  setJoinError(null);
                }}
                className="p-2 rounded-full hover:bg-emerald-100 text-emerald-800 text-xs font-semibold"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleJoinCollaborator} className="p-5 space-y-3 bg-white/40">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-900">
                  Collaborator password
                </label>
                <input
                  type="password"
                  className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  autoFocus
                />
              </div>
              {joinError && (
                <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  {joinError}
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-2.5 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
              >
                Join map as collaborator
              </button>
              <p className="text-[10px] text-emerald-700 mt-1">
                Once joined, you&apos;ll be able to add entries that appear immediately and move
                your own nodes on this map.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Off-screen map used only for export capture (full nodes, identity transform) */}
      {isExporting && (() => {
        const exportW = backgroundImageSize?.width ?? 1000;
        const exportH = backgroundImageSize?.height ?? 1000;
        return (
        <div
          ref={mapCaptureRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: exportW,
            height: exportH,
            zIndex: -1,
          }}
        >
          <Map
            nodes={exportNodes}
            onNodeMove={() => {}}
            onNodeSelect={() => {}}
            isEditable={false}
            backgroundImageUrl={mapBackgroundImageUrl}
            mapSlug={effectiveSlug}
            categoryColors={categoryColors}
            nodeSizeScale={nodeSizeScale}
            nodeLabelFontScale={nodeLabelFontScale}
            regionFontScale={regionFontScale}
            regionFontFamily={mapTheme?.regionFont}
            connections={connectionsEnabled ? connections : []}
            connectionLineStyle={
              mapTheme?.connectionLine ??
              (mapTheme
                ? { color: mapTheme.primaryColor, opacity: 0.6, thickness: 2 }
                : undefined)
            }
            mapBackgroundColor={mapTheme?.backgroundColor}
            exportMode
          />
        </div>
        );
      })()}

      {/* --- Main Map Area --- */}
      <main className={`flex-1 relative bg-[#e0f2f1] ${pendingNode ? 'cursor-crosshair' : ''}`}>
        {isDataLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#e0f2f1]/90 backdrop-blur-sm">
            <div className="glass px-6 py-4 rounded-2xl solarpunk-shadow text-emerald-800 font-semibold">
              Loading map…
            </div>
          </div>
        )}
        <Map
          nodes={filteredNodes}
          onNodeMove={handleNodeMove}
          onNodeSelect={handleNodeSelect}
          onMapClick={handleMapClick}
          selectedNodeIds={selectedNodes.map((n) => n.id)}
          onNodesMove={userSession.role !== 'public' ? handleNodesMove : undefined}
          onMapBackgroundClick={handleMapBackgroundClick}
          isEditable={userSession.role !== 'public'}
          isPlacing={!!pendingNode}
          backgroundImageUrl={mapBackgroundImageUrl}
          mapSlug={effectiveSlug}
          categoryColors={categoryColors}
          nodeSizeScale={nodeSizeScale}
          nodeLabelFontScale={nodeLabelFontScale}
          regionFontScale={regionFontScale}
          regionFontFamily={mapTheme?.regionFont}
          connections={
            connectionsEnabled && connectionsFilterOn ? connections : []
          }
          currentUserName={userSession.name}
          onConnectionCurveChange={userSession.role !== 'public' ? handleConnectionCurveChange : undefined}
          onConnectionCreate={
            connectionsEnabled && userSession.role !== 'public'
              ? (fromId, toId) =>
                  handleSubmitConnection({ fromNodeId: fromId, toNodeId: toId, description: '' })
              : undefined
          }
          connectionLineStyle={mapTheme?.connectionLine ?? (mapTheme ? { color: mapTheme.primaryColor, opacity: 0.6, thickness: 2 } : undefined)}
          mapBackgroundColor={mapTheme?.backgroundColor}
        />

        {/* Floating Popup for Node Details */}
        {selectedNode && popupAnchor && (
          <>
            <div
              className="fixed inset-0 z-[59] pointer-events-none"
              aria-hidden="true"
            />
            <NodePopup
            node={selectedNode}
            anchor={popupAnchor}
            onClose={() => {
              setSelectedNodes([]);
              setPopupAnchor(null);
            }}
            mapTheme={mapTheme}
            userRole={userSession.role}
            onEditNode={userSession.role === 'public' ? undefined : startEditNode}
            onRequestDeleteNode={userSession.role === 'admin' ? requestDeleteNode : undefined}
            elementConfig={map?.elementConfig}
            mapTemplateId={map?.mapTemplateId}
            />
          </>
        )}
      </main>

      {/* Floating Action Button (FAB) + Admin review button — on mobile, shift left when sidebar open to avoid overlap */}
      {!pendingNode && (
        <div
          className={`fixed z-[55] flex items-center gap-3 transition-[right] duration-300 bottom-[max(1.5rem,env(safe-area-inset-bottom))] md:bottom-10 ${
            sidebarCollapsed ? 'right-4 md:right-[90px]' : 'right-[calc(min(90vw,24rem)+1rem)] md:right-[410px]'
          }`}
        >
          {userSession.role === 'admin' && pendingReviewCount > 0 && (
            <button
              onClick={() => setIsAdminReviewOpen(true)}
              className="bg-amber-500 text-white w-12 h-12 rounded-full solarpunk-shadow flex items-center justify-center hover:bg-amber-600 hover:scale-110 active:scale-95 transition-all text-lg font-extrabold"
              title="Review pending submissions"
            >
              !
            </button>
          )}
          <button
            onClick={() => {
              setSubmissionPresetKind(null);
              setIsSubmissionOpen(true);
            }}
            className="bg-emerald-600 text-white w-16 h-16 rounded-full solarpunk-shadow flex items-center justify-center hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all"
            title="Add to Map"
          >
            <Plus size={32} />
          </button>
        </div>
      )}

      {/* Sidebar for Navigation and Filters */}
      <Sidebar
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        enabledNodeTypes={enabledNodeTypes}
        connectionsEnabled={connectionsEnabled}
        connectionsFilterOn={connectionsFilterOn}
        onConnectionsFilterToggle={() => setConnectionsFilterOn((v) => !v)}
        selectedNodes={selectedNodes}
        onClearSelection={() => {
          setSelectedNodes([]);
          setPopupAnchor(null);
        }}
        userRole={userSession.role}
        mapTheme={mapTheme}
        mapDescription={mapDescription}
        onEditNode={userSession.role === 'public' ? undefined : startEditNode}
        onRequestDeleteNode={userSession.role === 'admin' ? requestDeleteNode : undefined}
        isNodePopupOpen={!!(selectedNodes.length === 1 && popupAnchor)}
        mapSlug={effectiveSlug}
        mapTitle={mapTitle}
        nodeSizeScale={nodeSizeScale}
        onNodeSizeScaleChange={userSession.role === 'admin' ? persistNodeSizeScale : undefined}
        nodeLabelFontScale={nodeLabelFontScale}
        onNodeLabelFontScaleChange={userSession.role === 'admin' ? persistNodeLabelFontScale : undefined}
        regionFontScale={regionFontScale}
        onRegionFontScaleChange={userSession.role === 'admin' ? persistRegionFontScale : undefined}
        onEditMapSettings={
          userSession.role === 'admin' && effectiveSlug
            ? () => {
                if (typeof window === 'undefined') return;
                const url = new URL(window.location.href);
                url.pathname = '/dashboard';
                url.searchParams.set('edit', effectiveSlug);
                window.location.href = url.toString();
              }
            : undefined
        }
        onCollapsedChange={setSidebarCollapsed}
        onDownloadRequested={mapSlug ? handleDownloadRequested : undefined}
        onExportRequested={
          mapSlug && userSession.role === 'admin' ? handleExportRequested : undefined
        }
        onAddNode={(category) => {
          setSubmissionPresetKind(category);
          setIsSubmissionOpen(true);
        }}
        elementConfig={map?.elementConfig}
        mapTemplateId={map?.mapTemplateId}
        connectionConfig={map?.connectionConfig}
      />

      {/* Modals */}
      {isSubmissionOpen && (
        <SubmissionModal
          onClose={() => {
            setIsSubmissionOpen(false);
            setSubmissionPresetKind(null);
          }}
          presetKind={submissionPresetKind}
          onSubmit={startPlacement}
          onSubmitConnection={handleSubmitConnection}
          userRole={userSession.role}
          enabledNodeTypes={enabledNodeTypes}
          connectionsEnabled={connectionsEnabled}
          elementConfig={map?.elementConfig}
          mapTemplateId={map?.mapTemplateId}
          connectionConfig={map?.connectionConfig}
          approvedNodes={nodes.filter(
            (n) =>
              enabledNodeTypes.includes(n.type) &&
              (n.status === 'approved' ||
                (n.status === 'pending' && n.collaboratorId === userSession.name)),
          )}
        />
      )}

      {isAdminReviewOpen && (
        <AdminReviewModal
          pendingNodes={nodes.filter((n) => n.status === 'pending')}
          pendingConnections={connections.filter((c) => c.status === 'pending')}
          onClose={() => setIsAdminReviewOpen(false)}
          onApprove={handleApprove}
          onDeny={handleDeny}
          onApproveConnection={handleApproveConnection}
          onDenyConnection={handleDenyConnection}
          onEditNode={(node) => {
            startEditNode(node);
            setIsAdminReviewOpen(false);
          }}
          mapTheme={mapTheme}
          nodes={nodes}
          elementConfig={map?.elementConfig}
          mapTemplateId={map?.mapTemplateId}
        />
      )}

      {/* Edit node modal — safe area insets */}
      {isEditOpen && selectedNode && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-emerald-950/20 backdrop-blur-sm"
          onClick={() => setIsEditOpen(false)}
        >
          <div
            className="glass w-full max-w-lg rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-white/50">
              <h2 className="text-2xl font-bold text-emerald-950">Edit</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-2 hover:bg-emerald-100 rounded-full transition-colors"
              >
                <X size={24} className="text-emerald-800" />
              </button>
            </div>
            <form
              onSubmit={handleSaveEdit}
              className="p-8 space-y-6 overflow-y-auto max-h-[70vh] bg-white/40"
            >
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-emerald-900 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {enabledNodeTypes
                    .filter((t) => t !== NodeType.REGION || userSession.role === 'admin')
                    .map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditType(type)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          editType === type
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-emerald-100 text-emerald-700 hover:border-emerald-300'
                        }`}
                      >
                        {getElementLabel(type, map?.elementConfig, map?.mapTemplateId)}
                      </button>
                    ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-900">Title</label>
                <input
                  type="text"
                  className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-900">Description</label>
                <textarea
                  className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 min-h-[120px]"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-900">Link</label>
                <input
                  type="url"
                  className="w-full bg-white/80 border border-emerald-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://example.org"
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full bg-emerald-600 text-white py-2.5 rounded-2xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
              >
                Save changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal — safe area insets */}
      {isDeleteConfirmOpen && selectedNode && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-emerald-950/30 backdrop-blur-sm"
          onClick={() => setIsDeleteConfirmOpen(false)}
        >
          <div
            className="glass w-full max-w-sm rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-emerald-100 bg-white/60 flex justify-between items-center">
              <h2 className="text-lg font-bold text-emerald-950">Delete node?</h2>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="p-1 rounded-full hover:bg-emerald-100 text-emerald-800 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
            <div className="p-5 space-y-4 bg-white/40">
              <p className="text-sm text-emerald-900">
                This will remove <span className="font-semibold">{selectedNode.title}</span> from
                this map. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
                >
                  Delete node
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions mode — bottom-left (replaces "Click around and find out") */}
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] md:bottom-10 left-4 md:left-6 z-40">
        {pendingNode ? (
          <div className="glass p-3 px-5 rounded-full text-xs font-semibold text-emerald-800 solarpunk-shadow border-emerald-200">
            🌱 Select a location on the map.
          </div>
        ) : (
          <button
            onClick={switchRole}
            className="glass px-3 py-2 md:px-4 md:py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-semibold flex items-center gap-1.5 md:gap-2 text-emerald-800 hover:bg-emerald-50/80 transition-colors solarpunk-shadow border-emerald-200 min-h-[44px] md:min-h-0"
          >
            {userSession.role === 'admin' ? (
              <ShieldCheck size={16} className="md:w-[18px] md:h-[18px]" />
            ) : userSession.role === 'collaborator' ? (
              <Users size={16} className="md:w-[18px] md:h-[18px]" />
            ) : (
              <Info size={16} className="md:w-[18px] md:h-[18px]" />
            )}
            <span>{userSession.role.charAt(0).toUpperCase() + userSession.role.slice(1)}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default MapExperience;

