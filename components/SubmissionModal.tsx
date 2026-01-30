
import React, { useState } from 'react';
import { NodeType, MapNode } from '../types';
import { X, MapPin, AlertCircle, Link } from 'lucide-react';

interface SubmissionModalProps {
  onClose: () => void;
  onSubmit: (node: Partial<MapNode>) => void;
  userRole: string;
}

const SubmissionModal: React.FC<SubmissionModalProps> = ({ onClose, onSubmit, userRole }) => {
  const [formData, setFormData] = useState<Partial<MapNode>>({
    title: '',
    description: '',
    type: NodeType.EVENT,
    tags: [],
    primaryTag: '',
    website: '',
  });

  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    onSubmit(formData);
  };

  const addTag = () => {
    if (tagInput && !formData.tags?.includes(tagInput)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput] });
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-emerald-950/20 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-3xl solarpunk-shadow overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(NodeType).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
                    formData.type === type 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'border-emerald-100 text-emerald-700 hover:border-emerald-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

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
            <label className="text-sm font-bold text-emerald-900 block uppercase tracking-wide">Website</label>
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

          <button
            type="submit"
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg solarpunk-shadow hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
          >
            Place on map <MapPin size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmissionModal;
