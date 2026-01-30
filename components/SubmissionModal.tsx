import React, { useState, useMemo } from 'react';
import { NodeType, MapNode, MapConnection } from '../types';
import { X, MapPin, AlertCircle, Link } from 'lucide-react';

/** Submission is either a node (Event/Person/Space/Community) or a connection. null = not yet selected. */
type SubmissionKind = NodeType | 'CONNECTION' | null;

interface SubmissionModalProps {
  onClose: () => void;
  onSubmit: (node: Partial<MapNode>) => void;
  onSubmitConnection?: (connection: Partial<MapConnection>) => void;
  userRole: string;
  /** Approved nodes for Connection From/To dropdowns; sorted alphabetically by title. */
  approvedNodes?: MapNode[];
  /** Node types enabled for this map; only these appear as category options. When absent, all types shown. */
  enabledNodeTypes?: NodeType[];
  /** When false, CONNECTION option is hidden. Default true. */
  connectionsEnabled?: boolean;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({
  onClose,
  onSubmit,
  onSubmitConnection,
  userRole,
  approvedNodes = [],
  enabledNodeTypes,
  connectionsEnabled = true,
}) => {
  const [submissionKind, setSubmissionKind] = useState<SubmissionKind>(null);
  const [formData, setFormData] = useState<Partial<MapNode>>({
    title: '',
    description: '',
    type: undefined,
    tags: [],
    primaryTag: '',
    website: '',
  });

  const [connectionFromId, setConnectionFromId] = useState('');
  const [connectionToId, setConnectionToId] = useState('');
  const [connectionDescription, setConnectionDescription] = useState('');

  const [tagInput, setTagInput] = useState('');

  const sortedNodes = useMemo(
    () => [...approvedNodes].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    [approvedNodes],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionKind === 'CONNECTION') {
      if (!connectionFromId || !connectionToId || !onSubmitConnection) return;
      onSubmitConnection({
        fromNodeId: connectionFromId,
        toNodeId: connectionToId,
        description: connectionDescription,
        collaboratorId: '',
        status: userRole === 'public' ? 'pending' : 'approved',
      });
      onClose();
      return;
    }
    // Node: require category and title (CONNECTION already handled above)
    if (submissionKind == null) return;
    const title = formData.title?.trim();
    if (!title) return;
    onSubmit({ ...formData, type: submissionKind, title });
  };

  const addTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput] });
      setTagInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-lg rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-emerald-100 flex justify-between items-center bg-white/50">
          <h2 className="text-2xl font-bold text-emerald-950">Add Entry to the Commons</h2>
          <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full transition-colors">
            <X size={24} className="text-emerald-800" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {userRole === 'public' && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800 text-sm">
              <AlertCircle size={20} className="shrink-0" />
              <p>As a public citizen, your submission will be reviewed by the Wardens of Torontopia before appearing on the public manifest.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(enabledNodeTypes ?? Object.values(NodeType))
                .filter((type) => type !== NodeType.REGION || userRole === 'admin')
                .map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSubmissionKind(type);
                    setFormData((prev) => ({ ...prev, type }));
                  }}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
                    submissionKind === type
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-emerald-100 text-emerald-700 hover:border-emerald-300'
                  }`}
                >
                  {type}
                </button>
              ))}
              {connectionsEnabled && (
                <button
                  type="button"
                  onClick={() => setSubmissionKind('CONNECTION')}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
                    submissionKind === 'CONNECTION'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-emerald-100 text-emerald-700 hover:border-emerald-300'
                  }`}
                >
                  CONNECTION
                </button>
              )}
            </div>
          </div>

          {submissionKind === null ? null : submissionKind === 'CONNECTION' ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">From</label>
                <select
                  value={connectionFromId}
                  onChange={(e) => setConnectionFromId(e.target.value)}
                  className="w-full bg-white/50 border-2 border-emerald-100 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 text-emerald-900"
                  required
                >
                  <option value="">Select a node</option>
                  {sortedNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">To</label>
                <select
                  value={connectionToId}
                  onChange={(e) => setConnectionToId(e.target.value)}
                  className="w-full bg-white/50 border-2 border-emerald-100 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 text-emerald-900"
                  required
                >
                  <option value="">Select a node</option>
                  {sortedNodes.map((n) => (
                    <option key={n.id} value={n.id} disabled={n.id === connectionFromId}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Description</label>
                <textarea
                  className="w-full bg-white/50 border-2 border-emerald-100 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 transition-colors text-emerald-900 min-h-[120px]"
                  placeholder="What does this connection represent?"
                  value={connectionDescription}
                  onChange={(e) => setConnectionDescription(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
          <div className="space-y-2">
            <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Title</label>
            <input
              type="text"
              required
              className="w-full bg-white/50 border-2 border-emerald-100 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 transition-colors text-emerald-900"
              placeholder="The Vertical Garden Co-op..."
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Description</label>
            <textarea
              className="w-full bg-white/50 border-2 border-emerald-100 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 transition-colors text-emerald-900 min-h-[150px]"
              placeholder="Tell the immersive story of this node..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Link</label>
            <div className="relative">
              <Link size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" />
              <input
                type="url"
                className="w-full bg-white/50 border-2 border-emerald-100 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-emerald-400 transition-colors text-emerald-900"
                placeholder="https://community-garden.ca"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
              />
            </div>
          </div>

          {false && (
          <div className="space-y-2">
            <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-white/50 border-2 border-emerald-100 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-400 transition-colors text-emerald-900"
                placeholder="solar, hydro, community..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button
                type="button"
                onClick={addTag}
                className="bg-emerald-100 text-emerald-800 px-6 rounded-xl font-bold"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags?.map(tag => (
                <span key={tag} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-medium border border-emerald-100 flex items-center gap-2">
                  #{tag}
                  <X size={14} className="cursor-pointer" onClick={() => setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) })} />
                </span>
              ))}
            </div>
          </div>
          )}
            </>
          )}

          <button
            type="submit"
            disabled={
              submissionKind === null ||
              (submissionKind === 'CONNECTION' && (!connectionFromId || !connectionToId)) ||
              (submissionKind !== 'CONNECTION' && submissionKind !== null && !formData.title?.trim())
            }
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg solarpunk-shadow hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submissionKind === null
              ? 'Select a category above'
              : submissionKind === 'CONNECTION'
                ? 'Add connection'
                : (
                  <>Place on map <MapPin size={20} /></>
                )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmissionModal;
