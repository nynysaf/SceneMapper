
import React from 'react';
import { NodeType, MapNode, MapTheme } from '../types';
import { X, ExternalLink, Calendar, MapPin, User, Building, Leaf, Globe, Pencil, Trash2, Settings2, Link2, QrCode, Download, Plus, FileDown } from 'lucide-react';

/** Squiggly/curved line icon for connection filter (20px, matches other filter icons). */
function ConnectionLineIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 12 Q8 6 14 12 Q20 18 21 12" />
    </svg>
  );
}

interface SidebarProps {
  activeFilters: NodeType[];
  onToggleFilter: (type: NodeType) => void;
  /** Node types enabled for this map; only these appear in the filter. When absent, all types shown. */
  enabledNodeTypes?: NodeType[];
  /** When false, Connections option is hidden from filter. Default true. */
  connectionsEnabled?: boolean;
  /** When true, connection lines are shown on the map. */
  connectionsFilterOn: boolean;
  onConnectionsFilterToggle: () => void;
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
  /** Region label font scale (REGION nodes only). Admin only. */
  regionFontScale?: number;
  /** Called when admin changes region font size. Admin only. */
  onRegionFontScaleChange?: (value: number) => void;
  /** Called when the sidebar is collapsed or expanded (so parent can adjust FAB position). */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** When set, shows Download in Share section; called with chosen format when user picks one. */
  onDownloadRequested?: (format: 'jpeg' | 'png' | 'pdf') => void;
  /** When set, shows Export in Share section; called with chosen format (csv/xlsx). Admin only. */
  onExportRequested?: (format: 'csv' | 'xlsx') => void;
  /** Called when user clicks Plus to add a node; category is preset. Omit or falsy to hide Plus (e.g. public viewers). */
  onAddNode?: (category: NodeType | 'CONNECTION') => void;
}

function Sidebar({
  activeFilters,
  onToggleFilter,
  enabledNodeTypes,
  connectionsEnabled = true,
  connectionsFilterOn,
  onConnectionsFilterToggle,
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
  regionFontScale = 1,
  onRegionFontScaleChange,
  onCollapsedChange,
  onDownloadRequested,
  onExportRequested,
  onAddNode,
}: SidebarProps) {
  const categoryColors = mapTheme?.categoryColors;
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showDownloadModal, setShowDownloadModal] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);
  React.useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  // Expand sidebar when a node (e.g. region) is selected so options are visible
  // REMOVED: User wants the sidebar to stay minimized if they minimized it
  // React.useEffect(() => {
  //   if (selectedNode) setIsCollapsed(false);
  // }, [selectedNode]);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [showQR, setShowQR] = React.useState(false);
  // Set shareUrl only after mount so server and first client render match (avoids hydration error)
  const [shareUrl, setShareUrl] = React.useState('');
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    if (mapSlug && typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/maps/${mapSlug}`);
    }
  }, [mapSlug]);

  const copyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };
  const allFilterOptions = [
    { type: NodeType.EVENT, label: 'Events', icon: Calendar },
    { type: NodeType.PERSON, label: 'People', icon: User },
    { type: NodeType.SPACE, label: 'Spaces', icon: Building },
    { type: NodeType.COMMUNITY, label: 'Communities', icon: Leaf },
    { type: NodeType.REGION, label: 'Regions', icon: Globe },
  ];
  const filterOptions = (enabledNodeTypes
    ? allFilterOptions.filter((o) => enabledNodeTypes.includes(o.type))
    : allFilterOptions).filter((o) => o.type !== NodeType.REGION || userRole === 'admin');
  const connectionLineColor =
    mapTheme?.connectionLine?.color ?? mapTheme?.primaryColor ?? '#059669';

  const handleWidth = 28;
  return (
    <>
      {/* Panel + Handle — whole thing slides; handle on left, stays visible when collapsed */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-row pointer-events-none"
      >
        <div
          className={`h-full flex flex-row pointer-events-auto transform transition-transform duration-300 ${
            isCollapsed ? 'translate-x-[calc(100%-28px)]' : 'translate-x-0'
          }`}
          style={{ width: 'min(90vw, 24rem)' }}
        >
          {/* Handle — attached to left of panel, slides with it; centered vertically */}
          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            className="shrink-0 flex items-center justify-center w-7 h-20 self-center rounded-l-xl bg-emerald-100/95 hover:bg-emerald-200 border-l border-t border-b border-emerald-200/80"
            style={{ width: handleWidth }}
            aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <div className="w-1.5 h-12 rounded-full bg-emerald-500" />
          </button>
          <div className="h-full flex flex-col p-6 overflow-y-auto pt-12 md:pt-6 glass shadow-2xl flex-1 w-[90vw] max-w-sm md:w-80">
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

            {false && selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedNode.tags.map(tag => (
                <span key={tag} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-medium border border-emerald-100">
                  #{tag}
                </span>
              ))}
            </div>
            )}

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
            <div className="grid grid-cols-1 gap-3">
              {filterOptions.map(({ type, label, icon: Icon }) => {
                const isActive = activeFilters.includes(type);
                return (
                  <div
                    key={type}
                    className={`flex items-stretch gap-0 rounded-2xl border-2 transition-all overflow-hidden ${
                      isActive ? 'bg-white border-emerald-400 solarpunk-shadow' : 'bg-emerald-50/50 border-transparent opacity-60 grayscale'
                    }`}
                  >
                    {onAddNode && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAddNode(type); }}
                        className={`shrink-0 w-10 flex items-center justify-center rounded-l-xl transition-opacity self-stretch ${
                          isActive ? 'bg-emerald-500 hover:bg-emerald-600 text-white opacity-100' : 'bg-emerald-400/50 text-white/80 opacity-60'
                        }`}
                        title={`Add ${label.toLowerCase()}`}
                      >
                        <Plus size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleFilter(type)}
                      className="flex-1 flex items-center gap-3 p-3 min-w-0 text-left"
                      title={isActive ? 'Hide from map' : 'Show on map'}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: categoryColors?.[type] ?? '#059669' }}
                      >
                        <Icon size={18} />
                      </div>
                      <span className="font-bold text-emerald-900 truncate flex-1">{label}</span>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isActive ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-200'
                        }`}
                      >
                        {isActive && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                      </div>
                    </button>
                  </div>
                );
              })}
              {connectionsEnabled && (
                <div
                  className={`flex items-stretch gap-0 rounded-2xl border-2 transition-all overflow-hidden ${
                    connectionsFilterOn ? 'bg-white border-emerald-400 solarpunk-shadow' : 'bg-emerald-50/50 border-transparent opacity-60 grayscale'
                  }`}
                >
                  {onAddNode && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAddNode('CONNECTION'); }}
                      className={`shrink-0 w-10 min-h-[3.5rem] flex items-center justify-center rounded-l-xl transition-opacity self-stretch ${
                        connectionsFilterOn ? 'bg-emerald-500 hover:bg-emerald-600 text-white opacity-100' : 'bg-emerald-400/50 text-white/80 opacity-60'
                      }`}
                      title="Add connection"
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onConnectionsFilterToggle}
                    className="flex-1 flex items-center gap-3 p-3 min-w-0 text-left"
                    title={connectionsFilterOn ? 'Hide connections' : 'Show connections'}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: connectionLineColor }}
                    >
                      <ConnectionLineIcon size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-emerald-900 truncate flex-1">Connections</span>
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        connectionsFilterOn ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-200'
                      }`}
                    >
                      {connectionsFilterOn && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                    </div>
                  </button>
                </div>
              )}
            </div>

            {userRole === 'admin' && onEditMapSettings && !isNodePopupOpen && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onEditMapSettings}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 text-emerald-800 shadow hover:bg-white text-sm font-medium"
                  title="Edit map settings"
                >
                  <Settings2 size={18} />
                  Edit map settings
                </button>
              </div>
            )}

            {mounted && userRole === 'admin' && onNodeSizeScaleChange && (
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

            {mounted && userRole === 'admin' && onNodeLabelFontScaleChange && (
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

            {mounted && userRole === 'admin' && onRegionFontScaleChange && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-900">Region font size</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={regionFontScale}
                    onChange={(e) => onRegionFontScaleChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-full appearance-none bg-emerald-100 accent-emerald-600"
                  />
                  <span className="text-xs font-medium text-emerald-800 w-8">
                    {Math.round(regionFontScale * 100)}%
                  </span>
                </div>
              </div>
            )}

            {mounted && mapSlug && shareUrl && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-emerald-900">Share</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={copyShareLink}
                    className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${linkCopied ? 'bg-emerald-100 text-emerald-800' : 'bg-white/70 text-emerald-800 hover:bg-emerald-50 border border-emerald-100'}`}
                  >
                    <Link2 size={16} />
                    {linkCopied ? 'Copied!' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/70 text-emerald-800 hover:bg-emerald-50 border border-emerald-100"
                  >
                    <QrCode size={16} />
                    QR code
                  </button>
                  {onDownloadRequested && (
                    <button
                      type="button"
                      onClick={() => setShowDownloadModal(true)}
                      className="flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/70 text-emerald-800 hover:bg-emerald-50 border border-emerald-100"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  )}
                  {onExportRequested && (
                    <button
                      type="button"
                      onClick={() => setShowExportModal(true)}
                      className="flex-1 min-w-[110px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/70 text-emerald-800 hover:bg-emerald-50 border border-emerald-100"
                    >
                      <FileDown size={16} />
                      Export
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-auto pt-4">
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

      {showDownloadModal && onDownloadRequested && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => setShowDownloadModal(false)}
      >
        <div
          className="bg-white rounded-2xl p-5 shadow-xl flex flex-col items-stretch gap-3 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-emerald-900">Download map as</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onDownloadRequested('png');
                setShowDownloadModal(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100"
            >
              PNG
            </button>
            <button
              type="button"
              onClick={() => {
                onDownloadRequested('jpeg');
                setShowDownloadModal(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100"
            >
              JPEG
            </button>
            <button
              type="button"
              onClick={() => {
                onDownloadRequested('pdf');
                setShowDownloadModal(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100"
            >
              PDF
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowDownloadModal(false)}
            className="text-sm font-medium text-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-50 mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
      )}

      {showExportModal && onExportRequested && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-emerald-950/40 backdrop-blur-sm pointer-events-auto"
        onClick={() => setShowExportModal(false)}
      >
        <div
          className="bg-white rounded-2xl p-5 shadow-xl flex flex-col items-stretch gap-3 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-emerald-900">Export data as</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onExportRequested('csv');
                setShowExportModal(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => {
                onExportRequested('xlsx');
                setShowExportModal(false);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100"
            >
              XLSX
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowExportModal(false)}
            className="text-sm font-medium text-emerald-700 px-4 py-2 rounded-xl hover:bg-emerald-50 mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
      )}
    </>
  );
}

export default Sidebar;
