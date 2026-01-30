
import React from 'react';
import { MapNode, MapTheme } from '../types';
import { X, ExternalLink, ScrollText, Pencil, Trash2 } from 'lucide-react';

interface NodePopupProps {
  node: MapNode;
  anchor: { x: number, y: number };
  onClose: () => void;
  mapTheme?: MapTheme;
  userRole?: string;
  onEditNode?: (node: MapNode) => void;
  onRequestDeleteNode?: (node: MapNode) => void;
}

const NodePopup: React.FC<NodePopupProps> = ({
  node,
  anchor,
  onClose,
  mapTheme,
  userRole,
  onEditNode,
  onRequestDeleteNode,
}) => {
  const popupWidth = 380;
  const showAbove = anchor.y > 450;
  const gap = 20;

  const left = Math.min(window.innerWidth - popupWidth - 20, Math.max(20, anchor.x - popupWidth / 2));
  // When above: position by bottom so the popup sits just above the node (no huge gap). When below: position by top.
  const style: React.CSSProperties = showAbove
    ? { left: `${left}px`, bottom: `${window.innerHeight - anchor.y + gap}px`, width: `${popupWidth}px` }
    : { left: `${left}px`, top: `${anchor.y + gap}px`, width: `${popupWidth}px` };

  const websiteUrl = node.website || '';
  const categoryColors = mapTheme?.categoryColors;

  return (
    <div 
      className="fixed z-[60] animate-in fade-in zoom-in duration-300 pointer-events-none"
      style={style}
    >
      <div className="glass p-6 rounded-[2.5rem] solarpunk-shadow border-emerald-100 pointer-events-auto relative overflow-hidden flex flex-col max-h-[440px]">
        {/* Category Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: categoryColors?.[node.type] ?? '#059669',
              }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800">
              {node.type}
            </span>
            {node.status === 'pending' && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200">
                Pending approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {userRole && userRole !== 'public' && onEditNode && (
              <button
                onClick={() => onEditNode(node)}
                className="text-emerald-800 hover:bg-emerald-100 p-1 rounded-full transition-colors"
                title="Edit node"
              >
                <Pencil size={16} />
              </button>
            )}
            {userRole === 'admin' && onRequestDeleteNode && (
              <button
                onClick={() => onRequestDeleteNode(node)}
                className="text-rose-700 hover:bg-rose-50 p-1 rounded-full transition-colors"
                title="Delete node"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-emerald-800 hover:bg-emerald-100 p-1 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-emerald-950 mb-4 leading-tight font-serif">
          {node.title}
        </h3>

        <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <ScrollText size={18} className="mt-1 shrink-0 text-emerald-500" />
              <div className="text-sm leading-relaxed text-emerald-900 font-light">
                {node.description.split('\n').map((para, i) => (
                  <p key={i} className="mb-4 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </div>
            
            <div className="pt-4 mt-2 border-t border-emerald-100 flex flex-col gap-3">
              {websiteUrl && (
                <a 
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all solarpunk-shadow group shadow-lg"
                >
                  Visit Official Site
                  <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              )}
              <div className="text-[10px] text-center text-emerald-600 font-medium">
                Contributed by {node.collaboratorId}
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative corner */}
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      </div>
      
      {/* Visual Anchor Indicator */}
      <div 
        className="absolute w-0.5 h-8 bg-emerald-400/40 left-1/2 -translate-x-1/2"
        style={{ top: anchor.y > 450 ? '100%' : '-32px' }}
      />
    </div>
  );
};

export default NodePopup;
