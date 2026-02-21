import { useState, useEffect } from '@wordpress/element';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { getSwipes } from '../../../services/repurposeApi';
import { emotionColors } from '../ShortPostCard';
import type { Swipe } from '../../../types';

interface AddShortPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (content: string) => void;
}

export default function AddShortPostModal({
    isOpen,
    onClose,
    onAdd,
}: AddShortPostModalProps) {
    const [mode, setMode] = useState<'choose' | 'custom'>('choose');
    const [customContent, setCustomContent] = useState('');
    const [selectedSwipe, setSelectedSwipe] = useState<number | null>(null);
    const [swipes, setSwipes] = useState<Swipe[]>([]);
    const [loadingSwipes, setLoadingSwipes] = useState(false);

    useEffect(() => {
        if (!isOpen || swipes.length > 0) return;
        setLoadingSwipes(true);
        getSwipes()
            .then(setSwipes)
            .catch(() => toast.error('Failed to load swipe files'))
            .finally(() => setLoadingSwipes(false));
    }, [isOpen]);

    const handleAdd = () => {
        if (mode === 'custom') {
            if (!customContent.trim()) return;
            onAdd(customContent.trim());
        } else {
            const swipe = swipes.find(s => s.id === selectedSwipe);
            if (!swipe) return;
            onAdd(swipe.content);
        }
        setCustomContent('');
        setSelectedSwipe(null);
        setMode('choose');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Add Short Post</h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Mode tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setMode('choose')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'choose'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Swipe File
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'custom'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Write Your Own
                    </button>
                </div>

                <div className="px-5 py-4 max-h-112 overflow-y-auto">
                    {mode === 'choose' ? (
                        loadingSwipes ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading swipe files...</div>
                        ) : swipes.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-400">No swipe files available</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {swipes.map((swipe) => (
                                    <button
                                        key={swipe.id}
                                        onClick={() => setSelectedSwipe(swipe.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors flex flex-col ${
                                            selectedSwipe === swipe.id
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="mb-1.5">
                                            <span className="text-[10px] text-gray-400">{swipe.structure}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 whitespace-pre-wrap flex-1 mb-2 flex items-center">{swipe.content}</p>
                                        <div className="flex flex-wrap gap-1 mt-auto">
                                            {swipe.emotions.map((emotion) => (
                                                <span
                                                    key={emotion}
                                                    className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                                                        emotionColors[emotion] || 'border-gray-200 bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {emotion}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <textarea
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder="Write your short post..."
                            className="w-full min-h-80 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                            rows={18}
                            style={{ fieldSizing: 'content' } as React.CSSProperties}
                        />
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={mode === 'choose' ? !selectedSwipe : !customContent.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Add Post
                    </button>
                </div>
            </div>
        </div>
    );
}
