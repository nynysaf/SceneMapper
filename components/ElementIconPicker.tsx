'use client';

import React, { useState } from 'react';
import { X, Image } from 'lucide-react';
import { ICON_CATEGORIES, getIconComponent } from '@/lib/icons';

interface ElementIconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  backgroundColor?: string;
  /** When set, show color picker; onColorChange called when user changes color */
  color?: string;
  onColorChange?: (color: string) => void;
  onClose: () => void;
}

/** Modal for selecting a Lucide icon or custom image for element/connection display */
export default function ElementIconPicker({
  value,
  onChange,
  backgroundColor = '#059669',
  color,
  onColorChange,
  onClose,
}: ElementIconPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const isCustomImage = value && (value.startsWith('data:') || value.startsWith('http'));

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-emerald-950/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-md rounded-3xl solarpunk-shadow overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-emerald-100 bg-white/60 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold text-emerald-950">Choose icon</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-emerald-100 text-emerald-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
              style={{ backgroundColor }}
            >
              {isCustomImage ? (
                <img src={value} alt="" className="w-full h-full object-cover" />
              ) : (
                (() => {
                  const IconComponent = getIconComponent(value);
                  return IconComponent ? (
                    <IconComponent className="w-8 h-8 text-white" strokeWidth={2.5} />
                  ) : (
                    <span className="text-2xl text-white/80">?</span>
                  );
                })()
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-900">Upload custom image</label>
            <label className="flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-emerald-200 text-emerald-700 font-medium text-sm hover:bg-emerald-50 hover:border-emerald-300 transition-colors cursor-pointer">
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
                      if (typeof reader.result === 'string') onChange(reader.result);
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
            <label className="text-xs font-semibold text-emerald-900">Lucide icons</label>
            <div className="flex gap-1 flex-wrap">
              {ICON_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setActiveCategory(idx)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeCategory === idx
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {ICON_CATEGORIES[activeCategory]?.icons.map((iconName) => {
                const IconComp = getIconComponent(iconName);
                const selected = !isCustomImage && value === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => onChange(iconName)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      selected ? 'bg-emerald-200 ring-2 ring-emerald-500' : 'bg-white/70 hover:bg-emerald-50'
                    }`}
                    style={selected ? {} : { color: '#047857' }}
                    title={iconName}
                  >
                    {IconComp ? <IconComp className="w-5 h-5" strokeWidth={2} /> : <span>?</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {color !== undefined && onColorChange && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-emerald-900">Colour</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  className="h-10 min-h-[44px] w-20 rounded-lg border border-emerald-100 bg-white/70 touch-manipulation"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                />
                <input
                  type="text"
                  className="flex-1 h-10 rounded-lg border border-emerald-100 bg-white/70 px-2 text-sm font-mono"
                  value={color}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9A-Fa-f]{6}$/.test(v) || /^#[0-9A-Fa-f]{3}$/.test(v)) onColorChange(v);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-emerald-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
