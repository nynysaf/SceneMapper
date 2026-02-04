import React from 'react';
import { MapNode, MapConnection, MapTheme } from '../types';
import { NODE_TYPE_LABELS } from '../constants';
import { X, Check, Trash2, Clock, MapPin, GitBranch, Pencil } from 'lucide-react';

interface AdminReviewModalProps {
  pendingNodes: MapNode[];
  pendingConnections?: MapConnection[];
  onClose: () => void;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onApproveConnection?: (id: string) => void;
  onDenyConnection?: (id: string) => void;
  /** Called when admin clicks Edit on a pending node; opens edit flow, then approve/deny */
  onEditNode?: (node: MapNode) => void;
  mapTheme?: MapTheme;
  /** Nodes used to resolve connection from/to titles */
  nodes?: MapNode[];
}

const AdminReviewModal: React.FC<AdminReviewModalProps> = ({
  pendingNodes,
  pendingConnections = [],
  onClose,
  onApprove,
  onDeny,
  onApproveConnection,
  onDenyConnection,
  onEditNode,
  mapTheme,
  nodes = [],
}) => {
  const categoryColors = mapTheme?.categoryColors;
  const nodeById: Record<string, MapNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const hasPending = pendingNodes.length > 0 || pendingConnections.length > 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-emerald-950/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-2xl rounded-[2.5rem] solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[min(85vh,calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-emerald-100 flex justify-between items-center bg-white/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700">
              <Clock size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-950">Review public submissions</h2>
              <p className="text-sm text-emerald-700 font-medium">Approve or decline entries before they appear on the map.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-800">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-emerald-50/20 custom-scrollbar">
          {!hasPending ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                <Check size={40} />
              </div>
              <h3 className="text-xl font-bold text-emerald-900">Queue is Clear</h3>
              <p className="text-emerald-700">No pending submissions require attention at this time.</p>
            </div>
          ) : (
            <>
            {pendingNodes.map(node => (
              <div key={node.id} className="glass p-6 rounded-3xl border border-emerald-100 flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span 
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white"
                        style={{
                          backgroundColor: categoryColors?.[node.type] ?? '#059669',
                        }}
                      >
                        {NODE_TYPE_LABELS[node.type] ?? node.type}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <MapPin size={10} />
                        {node.x.toFixed(1)}, {node.y.toFixed(1)}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-emerald-950 mb-2">{node.title}</h4>
                    <p className="text-sm text-emerald-800 line-clamp-3 italic mb-4">
                      "{node.description}"
                    </p>
                    {false && node.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {node.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-white/50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-semibold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 shrink-0">
                    {onEditNode && (
                      <button
                        onClick={() => {
                          onEditNode(node);
                          onClose();
                        }}
                        className="bg-amber-50 text-amber-700 p-3 rounded-2xl hover:bg-amber-100 transition-all flex items-center justify-center border border-amber-200"
                        title="Edit"
                      >
                        <Pencil size={24} />
                      </button>
                    )}
                    <button 
                      onClick={() => onApprove(node.id)}
                      className="bg-emerald-600 text-white p-3 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center solarpunk-shadow group"
                      title="Approve"
                    >
                      <Check size={24} />
                    </button>
                    <button 
                      onClick={() => onDeny(node.id)}
                      className="bg-rose-50 text-rose-600 p-3 rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center border border-rose-100"
                      title="Deny"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-500 font-medium">
                  Submitted by: <span className="text-emerald-700 font-bold">{node.collaboratorId}</span>
                </div>
              </div>
            ))}
            {pendingConnections.map((conn) => {
              const fromTitle = nodeById[conn.fromNodeId]?.title ?? '(unknown)';
              const toTitle = nodeById[conn.toNodeId]?.title ?? '(unknown)';
              return (
                <div key={conn.id} className="glass p-6 rounded-3xl border border-emerald-100 flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white bg-emerald-600 flex items-center gap-1 w-fit">
                          <GitBranch size={10} />
                          Connection
                        </span>
                      </div>
                      <p className="text-sm text-emerald-800 font-medium mb-1">
                        <span className="text-emerald-600">From:</span> {fromTitle}
                      </p>
                      <p className="text-sm text-emerald-800 font-medium mb-2">
                        <span className="text-emerald-600">To:</span> {toTitle}
                      </p>
                      {conn.description && (
                        <p className="text-sm text-emerald-800 line-clamp-3 italic mb-4">
                          &quot;{conn.description}&quot;
                        </p>
                      )}
                    </div>
                    {onApproveConnection && onDenyConnection && (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => onApproveConnection(conn.id)}
                          className="bg-emerald-600 text-white p-3 rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center solarpunk-shadow"
                          title="Approve"
                        >
                          <Check size={24} />
                        </button>
                        <button
                          onClick={() => onDenyConnection(conn.id)}
                          className="bg-rose-50 text-rose-600 p-3 rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center border border-rose-100"
                          title="Deny"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-500 font-medium">
                    Submitted by: <span className="text-emerald-700 font-bold">{conn.collaboratorId}</span>
                  </div>
                </div>
              );
            })}
            </>
          )}
        </div>

        <div className="p-6 bg-white/40 border-t border-emerald-100 text-center">
          <p className="text-xs text-emerald-600 font-medium italic">
            Stewarding the commons is no easy task, but you do it with style.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminReviewModal;
