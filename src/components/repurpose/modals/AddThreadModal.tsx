import { useState, useEffect } from '@wordpress/element';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getThreadSwipes } from '@/services/repurposeApi';
import type { ThreadSwipe } from '@/types';

interface AddThreadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (posts: { content: string }[]) => void;
}

export default function AddThreadModal({ isOpen, onClose, onAdd }: AddThreadModalProps) {
    const [mode, setMode] = useState<'choose' | 'custom'>('choose');
    const [posts, setPosts] = useState<string[]>(['']);
    const [selectedSwipe, setSelectedSwipe] = useState<number | null>(null);
    const [swipes, setSwipes] = useState<ThreadSwipe[]>([]);
    const [loadingSwipes, setLoadingSwipes] = useState(false);

    useEffect(() => {
        if (!isOpen || swipes.length > 0) return;
        setLoadingSwipes(true);
        getThreadSwipes()
            .then(setSwipes)
            .catch(() => toast.error('Failed to load thread swipes'))
            .finally(() => setLoadingSwipes(false));
    }, [isOpen]);

    const handleAdd = () => {
        if (mode === 'custom') {
            const filled = posts.filter(p => p.trim());
            if (filled.length === 0) return;
            onAdd(filled.map(content => ({ content })));
        } else {
            const swipe = swipes.find(s => s.id === selectedSwipe);
            if (!swipe) return;
            onAdd(swipe.posts.map(p => ({ content: p.content })));
        }
        setPosts(['']);
        setSelectedSwipe(null);
        setMode('choose');
        onClose();
    };

    const updatePost = (index: number, value: string) => {
        setPosts(prev => prev.map((p, i) => i === index ? value : p));
    };

    const addPost = () => setPosts(prev => [...prev, '']);

    const removePost = (index: number) => {
        if (posts.length === 1) return;
        setPosts(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Add Thread</h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setMode('choose')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'choose' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Swipe File
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'custom' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Write Your Own
                    </button>
                </div>

                <div className="px-5 py-4 max-h-[28rem] overflow-y-auto">
                    {mode === 'choose' ? (
                        loadingSwipes ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading thread swipes...</div>
                        ) : swipes.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-400">No thread swipes available</div>
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
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">{swipe.structure}</span>
                                            <span className="text-[10px] text-gray-400">{swipe.posts.length} tweets</span>
                                        </div>
                                        <p className="text-xs text-gray-700 font-medium mb-1 line-clamp-2">{swipe.hook}</p>
                                        <p className="text-xs text-gray-400 line-clamp-2">{swipe.posts[1]?.content}</p>
                                        {swipe.emotions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {swipe.emotions.slice(0, 3).map((emotion) => (
                                                    <span key={emotion} className="rounded-full border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-600">
                                                        {emotion}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <div className="space-y-2">
                            {posts.map((post, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex flex-col items-center pt-2.5">
                                        <span className="text-[10px] text-gray-400 font-medium w-5 text-center">{index + 1}</span>
                                        {index < posts.length - 1 && (
                                            <div className="w-px flex-1 bg-gray-200 mt-1" style={{ minHeight: '1rem' }} />
                                        )}
                                    </div>
                                    <div className="flex-1 relative">
                                        <textarea
                                            value={post}
                                            onChange={(e) => updatePost(index, e.target.value)}
                                            placeholder={index === 0 ? 'Hook (opening tweet)...' : `Tweet ${index + 1}...`}
                                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>
                                    <button
                                        onClick={() => removePost(index)}
                                        disabled={posts.length === 1}
                                        className="mt-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addPost}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={13} />
                                Add tweet
                            </button>
                        </div>
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
                        disabled={mode === 'choose' ? !selectedSwipe : posts.every(p => !p.trim())}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Add Thread
                    </button>
                </div>
            </div>
        </div>
    );
}
