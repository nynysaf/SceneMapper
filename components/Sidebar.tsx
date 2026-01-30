
import React from 'react';
import { NodeType, MapNode, MapTheme } from '../types';
import { Filter, X, ExternalLink, Calendar, MapPin, User, Building, Leaf, Pencil, Trash2, Settings2, Link2, QrCode } from 'lucide-react';

interface SidebarProps {
  activeFilters: NodeType[];
  onToggleFilter: (type: NodeType) => void;
  selectedNode: MapNode | null;
  onClearSelection: () => void;
  userRole: string;
  mapTheme?: MapTheme;
  mapDescription?: string;
  onEditNode?: (node: MapNode) => void;
  onRequestDeleteNode?: (node: MapNode) => void;
  onEditMapSettings?: () => void;
  /** When true, the node popup is open; hide the map settings button so it doesn't overlay the popup. */
  isNodePopupOpen?: boolean;
  /** Current map slug for share (copy link / QR). When set, shows Share section in filter view. */
  mapSlug?: string;
  /** Node size scale (e.g. 0.5–2). Admin only. */
  nodeSizeScale?: number;
  /** Called when admin changes node size. Admin only. */
  onNodeSizeScaleChange?: (value: number) => void;
  /** Node label font scale (e.g. 0.75–1.5). Admin only. */
  nodeLabelFontScale?: number;
  /** Called when admin changes label font size. Admin only. */
  onNodeLabelFontScaleChange?: (value: number) => void;
}

function Sidebar({
  activeFilters,
  onToggleFilter,
  selectedNode,
  onClearSelection,
  userRole,
  mapTheme,
  mapDescription,
  onEditNode,
  onRequestDeleteNode,
  onEditMapSettings,
  isNodePopupOpen = false,
  mapSlug,
  nodeSizeScale = 1,
  onNodeSizeScaleChange,
  nodeLabelFontScale = 1,
  onNodeLabelFontScaleChange,
}: SidebarProps) {
  const categoryColors = mapTheme?.categoryColors;
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);

  const shareUrl = mapSlug && typeof window !== 'undefined' ? `${window.location.origin}/maps/${mapSlug}` : '';
  const copyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };
  const filterOptions = [
    { type: NodeType.EVENT, label: 'Events', icon: Calendar },
    { type: NodeType.PERSON, label: 'People', icon: User },
    { type: NodeType.SPACE, label: 'Spaces', icon: Building },
    { type: NodeType.COMMUNITY, label: 'Communities', icon: Leaf },
  ];

  return (
    <div className="fixed right-0 top-0 h-full z-50 flex items-stretch pointer-events-none">
      <div
        className={`h-full flex flex-row pointer-events-auto transform transition-transform duration-300 ${
          isCollapsed ? 'translate-x-full md:translate-x-80' : 'translate-x-0'
        }`}
      >
        {/* drag/handle strip — inside panel so it moves with the sidebar */}
        <button
          type="button"
          onClick={() => setIsCollapsed((v) => !v)}
          className="hidden md:flex items-center justify-center px-1 shrink-0 pointer-events-auto self-center"
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <div className="w-1.5 h-16 rounded-full bg-emerald-200 hover:bg-emerald-300 transition-colors" />
        </button>
        <div className="h-full flex flex-col p-6 overflow-y-auto pt-24 md:pt-6 glass shadow-2xl w-[90vw] max-w-sm md:w-96">
        {selectedNode ? (
          <div className="flex flex-col gap-4 relative">
            {userRole === 'admin' && onEditMapSettings && !isNodePopupOpen && (
              <button
                type="button"
                onClick={onEditMapSettings}
                className="absolute top-0 right-0 p-2 rounded-full bg-white/70 text-emerald-800 shadow hover:bg-white"
                title="Edit map settings"
              >
                <Settings2 size={20} />
              </button>
            )}
            <div className="flex justify-between items-start gap-2">
              <span 
                className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white"
                style={{
                  backgroundColor:
                    categoryColors?.[selectedNode.type] ?? '#059669',
                }}
              >
                {selectedNode.type}
              </span>
              {selectedNode.status === 'pending' && (
                <span className="ml-2 px-2 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200">
                  Pending approval
                </span>
              )}
              <div className="flex items-center gap-1">
                {userRole !== 'public' && onEditNode && (
                  <button
                    onClick={() => onEditNode(selectedNode)}
                    className="text-emerald-800 hover:bg-emerald-100 p-1 rounded-full transition-colors"
                    title="Edit node"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {userRole === 'admin' && onRequestDeleteNode && (
                  <button
                    onClick={() => onRequestDeleteNode(selectedNode)}
                    className="text-rose-700 hover:bg-rose-50 p-1 rounded-full transition-colors"
                    title="Delete node"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  onClick={onClearSelection}
                  className="text-emerald-800 hover:bg-emerald-100 p-1 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-emerald-950 leading-tight">
              {selectedNode.title}
            </h2>
            
            <p className="text-emerald-800 leading-relaxed font-light">
              {selectedNode.description}
            </p>

            {selectedNode.website && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                <ExternalLink size={16} />
                <a href={selectedNode.website} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                  {selectedNode.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {selectedNode.tags.map(tag => (
                <span key={tag} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-medium border border-emerald-100">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-emerald-100 space-y-4">
              <div className="flex items-center gap-3 text-emerald-900">
                <User size={18} className="text-emerald-600" />
                <span className="text-sm">Added by: {selectedNode.collaboratorId}</span>
              </div>
              {selectedNode.website && (
                <a 
                  href={selectedNode.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-100 text-emerald-800 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-200 transition-colors"
                >
                  Visit Digitally <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
                <Filter size={24} className="text-emerald-600" />
                Filter
              </h2>
              {userRole === 'admin' && onEditMapSettings && !isNodePopupOpen && (
                <button
                  type="button"
                  onClick={onEditMapSettings}
                  className="p-2 rounded-full bg-white/70 text-emerald-800 shadow hover:bg-white shrink-0"
                  title="Edit map settings"
                >
                  <Settings2 size={20} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filterOptions.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => onToggleFilter(type)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    activeFilters.includes(type) 
                      ? 'bg-white border-emerald-400 solarpunk-shadow scale-[1.02]' 
                      : 'bg-emerald-50/50 border-transparent opacity-60 grayscale'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{
                        backgroundColor: categoryColors?.[type] ?? '#059669',
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="font-bold text-emerald-900">{label}</span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${activeFilters.includes(type) ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-200'}`}>
                    {activeFilters.includes(type) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))}
            </div>

            {userRole === 'admin' && onNodeSizeScaleChange && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-900">Node size</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={nodeSizeScale}
                    onChange={(e) => onNodeSizeScaleChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-emerald-100 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-emerald-800 w-8">
                    {Math.round(nodeSizeScale * 100)}%
                  </span>
                </div>
              </div>
            )}

            {userRole === 'admin' && onNodeLabelFontScaleChange && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-900">Label font size</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.75}
                    max={1.5}
                    step={0.05}
                    value={nodeLabelFontScale}
                    onChange={(e) => onNodeLabelFontScaleChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-emerald-100 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-emerald-800 w-8">
                    {Math.round(nodeLabelFontScale * 100)}%
                  </span>
                </div>
              </div>
            )}

            {mapSlug && shareUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-900">Share</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${linkCopied ? 'bg-emerald-100 text-emerald-800' : 'bg-white/70 text-emerald-800 hover:bg-emerald-50 border border-emerald-100'}`}
                  >
                    <Link2 size={16} />
                    {linkCopied ? 'Copied!' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/70 text-emerald-800 hover:bg-emerald-50 border border-emerald-100"
                  >
                    <QrCode size={16} />
                    QR code
                  </button>
                </div>
              </div>
            )}

            <div className="mt-auto pt-8">
              <div className="p-4 bg-emerald-900 rounded-2xl text-white solarpunk-shadow">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <Leaf size={18} className="text-emerald-300" />
                  About
                </h3>
                <p className="text-xs text-emerald-100 leading-relaxed font-light">
                  {mapDescription ||
                    'This map tracks the people, spaces, events, and communities that compose this scene.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {showQR && shareUrl && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => setShowQR(false)}
      >
        <div
          className="bg-white rounded-2xl p-4 shadow-xl flex flex-col items-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-emerald-900">Scan to open map</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`}
            alt="QR code for map"
            className="rounded-lg"
          />
          <button
            type="button"
            onClick={() => setShowQR(false)}
            className="text-sm font-medium text-emerald-800 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100"
          >
            Close
          </button>
        </div>
      </div>
    )}
  </div>
  );
}

export default Sidebar;
