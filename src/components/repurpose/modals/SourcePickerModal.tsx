import { useState, useRef } from '@wordpress/element';
import {
    FileText,
    Layout,
    Pencil,
    X,
    Search,
} from 'lucide-react';
import type { ThreadItem, Visual } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import { VisualPreviewModal } from './VisualPreviewModal';

interface VisualSource {
    type: 'short_post' | 'thread' | 'standalone';
    id: number;
    content: string | string[];
}

interface SourcePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    search: string;
    onSearchChange: (value: string) => void;
    activeTab: 'short_posts' | 'threads' | 'custom';
    onTabChange: (tab: 'short_posts' | 'threads' | 'custom') => void;
    shortPosts: ShortPostPattern[];
    threads: ThreadItem[];
    onSelect: (source: VisualSource) => void;
    // Visual creation from selected source
    creatingSource: VisualSource | null;
    onCreatingSourceClose: () => void;
    onVisualSaved: (visual: Visual) => void;
    blogId?: number;
}

export default function SourcePickerModal({
    isOpen,
    onClose,
    search,
    onSearchChange,
    activeTab,
    onTabChange,
    shortPosts,
    threads,
    onSelect,
    creatingSource,
    onCreatingSourceClose,
    onVisualSaved,
    blogId,
}: SourcePickerModalProps) {
    const hasShortPosts = shortPosts.length > 0;
    const hasThreads = threads.length > 0;
    const searchLower = search.toLowerCase();
    const [customText, setCustomText] = useState('');
    const customTextareaRef = useRef<HTMLTextAreaElement>(null);

    const filteredShortPosts = hasShortPosts
        ? shortPosts.filter(s => s.content.toLowerCase().includes(searchLower))
        : [];
    const filteredThreads = hasThreads
        ? threads.filter(t => t.posts.some(p => p.content.toLowerCase().includes(searchLower)) || t.hook.toLowerCase().includes(searchLower))
        : [];

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">Select content for visual</h3>
                            <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="px-5 pt-3 pb-0 space-y-3">
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                                {hasShortPosts && (
                                    <button
                                        onClick={() => onTabChange('short_posts')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                            activeTab === 'short_posts'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <FileText size={13} />
                                        Short Posts
                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'short_posts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                            {shortPosts.length}
                                        </span>
                                    </button>
                                )}
                                {hasThreads && (
                                    <button
                                        onClick={() => onTabChange('threads')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                            activeTab === 'threads'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <Layout size={13} />
                                        Threads
                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'threads' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>
                                            {threads.length}
                                        </span>
                                    </button>
                                )}
                                <button
                                    onClick={() => onTabChange('custom')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        activeTab === 'custom'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Pencil size={13} />
                                    Write your own
                                </button>
                            </div>

                            {/* Search (only for short posts / threads tabs) */}
                            {activeTab !== 'custom' && (
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        placeholder={activeTab === 'threads' ? 'Search threads...' : 'Search short posts...'}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
                                    />
                                    {search && (
                                        <button
                                            onClick={() => onSearchChange('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={13} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {activeTab === 'short_posts' && (
                                filteredShortPosts.length > 0 ? (
                                    filteredShortPosts.map((s) => (
                                        <button
                                            key={`sp-${s.id}`}
                                            onClick={() => onSelect({ type: 'short_post', id: s.id, content: s.content })}
                                            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                        >
                                            <p className="text-sm text-gray-800 line-clamp-3">{s.content}</p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-sm text-gray-400">
                                        {search ? 'No short posts match your search' : 'No short posts available'}
                                    </div>
                                )
                            )}
                            {activeTab === 'threads' && (
                                filteredThreads.length > 0 ? (
                                    filteredThreads.map((t) => (
                                        <button
                                            key={`t-${t.id}`}
                                            onClick={() => onSelect({ type: 'thread', id: t.id, content: t.posts.map(p => p.content) })}
                                            className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                                        >
                                            <p className="text-xs text-violet-600 font-medium mb-1">Thread · {t.posts.length} posts</p>
                                            <p className="text-sm text-gray-800 line-clamp-3">{t.posts[0]?.content}</p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-sm text-gray-400">
                                        {search ? 'No threads match your search' : 'No threads available'}
                                    </div>
                                )
                            )}
                            {activeTab === 'custom' && (
                                <div className="space-y-3">
                                    <textarea
                                        ref={customTextareaRef}
                                        value={customText}
                                        onChange={(e) => setCustomText(e.target.value)}
                                        placeholder="Write the text for your visual..."
                                        rows={6}
                                        autoFocus
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                        style={{ fieldSizing: 'content', minHeight: '140px' } as React.CSSProperties}
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className={`font-mono text-[10px] ${customText.length > 280 ? 'text-amber-500' : 'text-gray-400'}`}>
                                            {customText.length} chars
                                        </span>
                                        <button
                                            disabled={!customText.trim()}
                                            onClick={() => {
                                                onSelect({ type: 'standalone', id: 0, content: customText.trim() });
                                                setCustomText('');
                                            }}
                                            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Create Visual
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {creatingSource && (
                <VisualPreviewModal
                    isOpen={true}
                    onClose={onCreatingSourceClose}
                    content={Array.isArray(creatingSource.content) ? creatingSource.content : [creatingSource.content]}
                    sourceType={creatingSource.type}
                    blogId={blogId}
                    sourceId={creatingSource.type !== 'standalone' ? creatingSource.id : undefined}
                    onSaved={onVisualSaved}
                />
            )}
        </>
    );
}
