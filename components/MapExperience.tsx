import React, { useState, useEffect, useCallback } from 'react';
import { MapNode, NodeType, UserSession, MapTheme, SceneMap, User, AuthSession } from '../types';
import { INITIAL_NODES, CATEGORY_COLORS } from '../constants';
import { getNodes as loadNodes, saveNodes as persistNodes, getUsers, getSession, getMaps, getMapBySlug, saveMaps } from '../lib/data';
import Map from './Map';
import Sidebar from './Sidebar';
import SubmissionModal from './SubmissionModal';
import NodePopup from './NodePopup';
import AdminReviewModal from './AdminReviewModal';
import { Plus, Info, Users, ShieldCheck, MapPin, Inbox, X } from 'lucide-react';

interface MapExperienceProps {
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
}

/**
 * Reusable map experience container.
 *
 * This encapsulates the Torontopia interaction model (nodes, roles,
 * submission + admin review) so we can mount it for different maps
 * from a higher-level app shell or router.
 */
const MapExperience: React.FC<MapExperienceProps> = ({
  mapSlug,
  storageKey = 'torontopia_nodes',
  mapTitle = 'Torontopia',
  mapSubtitle = 'Solarpunk Commons Map',
  mapBackgroundImageUrl,
  mapTheme,
  mapDescription,
}) => {
  const effectiveSlug =
    mapSlug ??
    (storageKey === 'torontopia_nodes' ? 'torontopia' : (storageKey || '').replace(/^scene_mapper_nodes_/, '') || 'torontopia');

  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [userSession, setUserSession] = useState<UserSession>({ role: 'public', name: 'Guest' });
  const [activeFilters, setActiveFilters] = useState<NodeType[]>(Object.values(NodeType));
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isAdminReviewOpen, setIsAdminReviewOpen] = useState(false);
  const [pendingNode, setPendingNode] = useState<Partial<MapNode> | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  const [popupAnchor, setPopupAnchor] = useState<{ x: number; y: number } | null>(null);
  const [hasCollaboratorPassword, setHasCollaboratorPassword] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [hasShownReviewThisSession, setHasShownReviewThisSession] = useState(false);
  const [nodeSizeScale, setNodeSizeScale] = useState(1);
  const [nodeLabelFontScale, setNodeLabelFontScale] = useState(1);

  // Load map display settings (node size / font scale) so all viewers see the same
  useEffect(() => {
    getMapBySlug(effectiveSlug).then((map) => {
      if (map) {
        setNodeSizeScale(map.nodeSizeScale ?? 1);
        setNodeLabelFontScale(map.nodeLabelFontScale ?? 1);
      }
    });
  }, [effectiveSlug]);

  // Load nodes from data layer
  useEffect(() => {
    loadNodes(effectiveSlug)
      .then((loaded) => {
        setNodes(loaded.length ? loaded : effectiveSlug === 'torontopia' ? INITIAL_NODES : []);
      })
      .catch(() => setNodes(effectiveSlug === 'torontopia' ? INITIAL_NODES : []));
  }, [effectiveSlug]);

  // Hydrate user role from data layer
  useEffect(() => {
    let cancelled = false;
    Promise.all([getUsers(), getSession(), getMapBySlug(effectiveSlug)])
      .then(([users, session, sceneMap]) => {
        if (cancelled || !session) return;
        const currentUser = users.find((u) => u.id === session.userId);
        if (!currentUser) return;

        let role: UserSession['role'] = 'public';
        if (sceneMap) {
          setHasCollaboratorPassword(!!sceneMap.collaboratorPassword);
          if (sceneMap.adminIds.includes(currentUser.id)) role = 'admin';
          else if (sceneMap.collaboratorIds.includes(currentUser.id)) role = 'collaborator';
        }

        setUserSession({
          id: currentUser.id,
          email: currentUser.email,
          name: currentUser.name || currentUser.email,
          role,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [effectiveSlug]);

  const saveNodes = useCallback(
    (newNodes: MapNode[]) => {
      setNodes(newNodes);
      void persistNodes(effectiveSlug, newNodes);
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

  // --- Map Handlers ---

  // Handles repositioning of nodes (Collaborator/Admin only)
  const handleNodeMove = (id: string, x: number, y: number) => {
    const updatedNodes = nodes.map((node) => (node.id === id ? { ...node, x, y } : node));
    saveNodes(updatedNodes);
  };

  // Handles clicking a node to show details
  const handleNodeSelect = (node: MapNode, screenPos: { x: number; y: number }) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      setPopupAnchor(null);
    } else {
      setSelectedNode(node);
      setPopupAnchor(screenPos);
    }
  };

  // Initiates the two-step placement process (Form -> Map Click)
  const startPlacement = (nodeData: Partial<MapNode>) => {
    setPendingNode(nodeData);
    setIsSubmissionOpen(false);
    setSelectedNode(null);
    setPopupAnchor(null);
  };

  // Finalizes node creation upon map click
  const handleMapClick = (x: number, y: number) => {
    if (pendingNode) {
      const node: MapNode = {
        id: Math.random().toString(36).substr(2, 9),
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
    if (selectedNode?.id === id) {
      setSelectedNode(null);
      setPopupAnchor(null);
    }
  };

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
  const pendingReviewCount = nodes.filter((n) => n.status === 'pending').length;

  const categoryColors: Record<NodeType, string> = {
    [NodeType.EVENT]:
      mapTheme?.categoryColors?.[NodeType.EVENT] ?? CATEGORY_COLORS[NodeType.EVENT],
    [NodeType.PERSON]:
      mapTheme?.categoryColors?.[NodeType.PERSON] ?? CATEGORY_COLORS[NodeType.PERSON],
    [NodeType.SPACE]:
      mapTheme?.categoryColors?.[NodeType.SPACE] ?? CATEGORY_COLORS[NodeType.SPACE],
    [NodeType.COMMUNITY]:
      mapTheme?.categoryColors?.[NodeType.COMMUNITY] ?? CATEGORY_COLORS[NodeType.COMMUNITY],
  };

  const filteredNodes = nodes.filter((n) => {
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

  const handleJoinCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    if (!userSession.id || !effectiveSlug) {
      setJoinError('You need to be logged in to join as a collaborator.');
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
    setSelectedNode(node);
    setEditTitle(node.title);
    setEditDescription(node.description);
    setEditWebsite(node.website || '');
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
          }
        : n,
    );
    saveNodes(updatedNodes);
    const updated = updatedNodes.find((n) => n.id === selectedNode.id) || selectedNode;
    setSelectedNode(updated);
    setIsEditOpen(false);
  };

  const requestDeleteNode = (node: MapNode) => {
    setSelectedNode(node);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedNode) return;
    const updatedNodes = nodes.filter((n) => n.id !== selectedNode.id);
    saveNodes(updatedNodes);
    setSelectedNode(null);
    setPopupAnchor(null);
    setIsDeleteConfirmOpen(false);
    setIsEditOpen(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row">
      {/* --- Top UI Layer --- */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pointer-events-none flex justify-between items-start">
        <div className="pointer-events-auto flex items-center gap-4">
          <div className="glass p-3 rounded-2xl solarpunk-shadow flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: mapTheme?.primaryColor ?? '#059669' }}
            >
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-emerald-900 leading-tight">{mapTitle}</h1>
              <p className="text-xs text-emerald-700 font-medium">{mapSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          {/* Edit map settings now lives as a gear icon in the sidebar */}
            {canShowJoin && (
              <button
                onClick={() => {
                  setIsJoinOpen(true);
                  setJoinPassword('');
                  setJoinError(null);
                }}
                className="pointer-events-auto glass px-3 py-2 rounded-xl text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
              >
                Join as collaborator
              </button>
            )}
          </div>
          <button
            onClick={switchRole}
            className="pointer-events-auto glass px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 text-emerald-800 hover:bg-emerald-50 transition-colors"
          >
            {userSession.role === 'admin' ? (
              <ShieldCheck size={18} />
            ) : userSession.role === 'collaborator' ? (
              <Users size={18} />
            ) : (
              <Info size={18} />
            )}
            Mode: {userSession.role.charAt(0).toUpperCase() + userSession.role.slice(1)}
          </button>
        </div>

        <div className="pointer-events-auto flex gap-2">
          {userSession.role === 'admin' && pendingReviewCount > 0 && (
            <button
              onClick={() => setIsAdminReviewOpen(true)}
              className="bg-amber-100 text-amber-800 p-3 rounded-2xl solarpunk-shadow hover:bg-amber-200 transition-transform active:scale-95 flex items-center gap-2 px-5 font-bold relative"
            >
              <Inbox size={20} />
              <span className="hidden md:inline">Review Queue</span>
              <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {pendingReviewCount}
              </span>
            </button>
          )}
          {!pendingNode && (
            <button
              onClick={() => setIsSubmissionOpen(true)}
              className="hidden md:flex bg-emerald-600 text-white p-3 rounded-2xl solarpunk-shadow hover:bg-emerald-700 transition-transform active:scale-95 items-center gap-2 px-5 font-bold"
            >
              <Plus size={20} />
              Add Entry
            </button>
          )}
        </div>
      </div>

      {/* Placement Tooltip */}
      {pendingNode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full solarpunk-shadow flex items-center gap-3 font-bold border-2 border-white">
            <MapPin size={20} />
            Click on the map to place &quot;{pendingNode.title}&quot;
            <button
              onClick={() => setPendingNode(null)}
              className="ml-2 bg-white/20 hover:bg-white/30 p-1 rounded-full transition-colors"
            >
              <Plus className="rotate-45" size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Join as collaborator modal */}
      {isJoinOpen && (
        <div className="absolute inset-0 z-[65] flex items-center justify-center bg-emerald-950/30 backdrop-blur-sm px-4">
          <div className="glass w-full max-w-md rounded-3xl solarpunk-shadow overflow-hidden">
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

      {/* --- Main Map Area --- */}
      <main className={`flex-1 relative bg-[#e0f2f1] ${pendingNode ? 'cursor-crosshair' : ''}`}>
        <Map
          nodes={filteredNodes}
          onNodeMove={handleNodeMove}
          onNodeSelect={handleNodeSelect}
          onMapClick={handleMapClick}
          isEditable={userSession.role !== 'public'}
          isPlacing={!!pendingNode}
          backgroundImageUrl={mapBackgroundImageUrl}
          categoryColors={categoryColors}
          nodeSizeScale={nodeSizeScale}
          nodeLabelFontScale={nodeLabelFontScale}
        />

        {/* Floating Popup for Node Details */}
        {selectedNode && popupAnchor && (
          <NodePopup
            node={selectedNode}
            anchor={popupAnchor}
            onClose={() => {
              setSelectedNode(null);
              setPopupAnchor(null);
            }}
            mapTheme={mapTheme}
            userRole={userSession.role}
            onEditNode={userSession.role === 'public' ? undefined : startEditNode}
            onRequestDeleteNode={userSession.role === 'admin' ? requestDeleteNode : undefined}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) + Admin review button */}
      {!pendingNode && (
        <div className="fixed bottom-24 right-6 md:bottom-10 md:right-[410px] z-[55] flex items-center gap-3">
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
            onClick={() => setIsSubmissionOpen(true)}
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
        selectedNode={selectedNode}
        onClearSelection={() => {
          setSelectedNode(null);
          setPopupAnchor(null);
        }}
        userRole={userSession.role}
        mapTheme={mapTheme}
        mapDescription={mapDescription}
        onEditNode={userSession.role === 'public' ? undefined : startEditNode}
        onRequestDeleteNode={userSession.role === 'admin' ? requestDeleteNode : undefined}
        isNodePopupOpen={!!(selectedNode && popupAnchor)}
        mapSlug={effectiveSlug}
        nodeSizeScale={nodeSizeScale}
        onNodeSizeScaleChange={userSession.role === 'admin' ? persistNodeSizeScale : undefined}
        nodeLabelFontScale={nodeLabelFontScale}
        onNodeLabelFontScaleChange={userSession.role === 'admin' ? persistNodeLabelFontScale : undefined}
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
      />

      {/* Modals */}
      {isSubmissionOpen && (
        <SubmissionModal
          onClose={() => setIsSubmissionOpen(false)}
          onSubmit={startPlacement}
          userRole={userSession.role}
        />
      )}

      {isAdminReviewOpen && (
        <AdminReviewModal
          pendingNodes={nodes.filter((n) => n.status === 'pending')}
          onClose={() => setIsAdminReviewOpen(false)}
          onApprove={handleApprove}
          onDeny={handleDeny}
          mapTheme={mapTheme}
        />
      )}

      {/* Edit node modal */}
      {isEditOpen && selectedNode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
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
                <label className="text-[11px] font-semibold text-emerald-900">Website</label>
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

      {/* Delete confirmation modal */}
      {isDeleteConfirmOpen && selectedNode && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm">
          <div className="glass w-full max-w-sm rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
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

      {/* Contextual Instructions */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 md:left-6 md:translate-x-0">
        <div className="glass p-3 px-5 rounded-full text-xs font-semibold text-emerald-800 solarpunk-shadow border-emerald-200">
          🌱 {pendingNode ? 'Select a location on the map.' : 'Click a node to reveal its history.'}
        </div>
      </div>
    </div>
  );
};

export default MapExperience;

