import { useState } from '@wordpress/element';
import { X, Zap, Search, BookOpen } from 'lucide-react';
import type { BlogGenerationMode } from '@/types';

const GENERATION_MODES: { id: BlogGenerationMode; label: string; description: string; icon: typeof Zap; badge?: string }[] = [
  {
    id: 'quick',
    label: 'Quick',
    description: 'Pure AI generation. Best for opinion pieces, personal stories, and how-to guides.',
    icon: Zap,
  },
  {
    id: 'researched',
    label: 'Researched',
    description: 'Uses web search for real statistics and examples to back up your content.',
    icon: Search,
    badge: 'Takes longer',
  },
  {
    id: 'citations',
    label: 'Researched + Citations',
    description: 'Web search plus inline citations with a Sources section. Great for authority-building.',
    icon: BookOpen,
    badge: 'Takes longer',
  },
];

interface ConfirmGenerateBlogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: BlogGenerationMode) => void;
}

export default function ConfirmGenerateBlogModal({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmGenerateBlogModalProps) {
  const [selectedMode, setSelectedMode] = useState<BlogGenerationMode>('quick');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Generate Blog</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Generation mode</p>
          {GENERATION_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{mode.label}</span>
                    {mode.badge && (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        {mode.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
                </div>
                <div className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-blue-600' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedMode)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Generate Blog
          </button>
        </div>
      </div>
    </div>
  );
}
