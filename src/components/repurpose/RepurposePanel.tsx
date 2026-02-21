/**
 * Repurpose Panel Component
 *
 * Panel for generating short posts, threads, visuals from blog content.
 */

import { useState } from '@wordpress/element';
import {
    Share2,
    FileText,
    Image,
    Video,
    Sparkles,
    Lightbulb,
    Layout,
    Calendar,
    Pencil,
    X,
    Trash2,
    Plus,
    Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { arrayMove } from '@dnd-kit/sortable';
import { generateShortPosts, updateShortPost, generateThreads, deleteVisual } from '../../services/repurposeApi';
import type { ShortPost, ShortPostSchedule, ThreadItem, Visual } from '../../types';
import { GeneratingOverlay } from '../GeneratingOverlay';
import { VisualShortPostPreviewModal, VisualThreadPreviewModal, VisualPreview, GRADIENT_PRESETS } from './modals/VisualPreviewModal';
import ShortPostCard, { type ShortPostPattern } from './cards/ShortPostCard';
import ThreadCard from './cards/ThreadCard';
import { ConfirmGenerateModal, AddShortPostModal, SchedulePostModal, PublishNowModal, type ScheduleContentType } from './modals';
import { EmptyState, DependencyGate } from './EmptyState';

// ============================================
// TYPES
// ============================================

type TabType = 'short' | 'threads' | 'visuals' | 'video';

function shortPostToPattern(sp: ShortPost): ShortPostPattern {
    return {
        id: sp.id,
        content: sp.content,
        emotions: sp.metadata?.emotions || [],
        structure: sp.metadata?.structure || '',
        why_it_works: sp.metadata?.why_it_works || '',
        cta_content: sp.cta_content?.content || undefined,
        scheduled_post: sp.scheduled_post || null,
        media: (sp.media || []).filter((m): m is string => typeof m === 'string'),
        cta_media: sp.cta_content?.media?.filter((m): m is string => typeof m === 'string') || [],
        visualCount: sp.visuals?.length || 0,
    };
}





// ============================================
// MAIN COMPONENT
// ============================================

interface RepurposePanelProps {
    initialTab?: TabType;
    blogContent?: string;
    blogId?: number;
    isPublished?: boolean;
    publishedPostUrl?: string | null;
    editShortPostId?: number;
    onSwitchTab?: (tab: TabType) => void;
    onVisualCreated?: (visual: Visual) => void;
    onHighlightVisual?: (visualId: number) => void;
    initialHighlightVisualId?: number | null;
    initialShortPosts?: ShortPost[];
    initialThreads?: ThreadItem[];
    initialVisuals?: Visual[];
}

export function RepurposePanel({ initialTab = 'short', blogContent, blogId, isPublished, publishedPostUrl, editShortPostId, onSwitchTab, onVisualCreated, onHighlightVisual, initialHighlightVisualId, initialShortPosts, initialThreads, initialVisuals }: RepurposePanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [shortPosts, setShortPosts] = useState<ShortPostPattern[]>(() =>
        (initialShortPosts || []).map(shortPostToPattern)
    );
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [schedulingPost, setSchedulingPost] = useState<ShortPostPattern | null>(null);
    const [schedulingContentType, setSchedulingContentType] = useState<ScheduleContentType>('short_post');
    const [schedulingVisual, setSchedulingVisual] = useState<Visual | null>(null);
    const [publishingPost, setPublishingPost] = useState<ShortPostPattern | null>(null);
    const [publishingContentType, setPublishingContentType] = useState<ScheduleContentType>('short_post');
    const [threads, setThreads] = useState<ThreadItem[]>(initialThreads || []);
    const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);
    const [visuals, setVisuals] = useState<Visual[]>(initialVisuals || []);
    const [viewingVisual, setViewingVisual] = useState<Visual | null>(null);
    const [highlightVisualId, setHighlightVisualId] = useState<number | null>(initialHighlightVisualId ?? null);
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [sourcePickerTab, setSourcePickerTab] = useState<'short_posts' | 'threads'>('short_posts');
    const [sourcePickerSearch, setSourcePickerSearch] = useState('');
    const [creatingVisualSource, setCreatingVisualSource] = useState<{ type: 'short_post' | 'thread'; id: number; content: string | string[] } | null>(null);

    // Persist media changes to the API
    const syncShortPostMedia = (postId: number, media: string[], ctaContent?: string, ctaMedia?: string[]) => {
        updateShortPost(postId, {
            media,
            ...(ctaContent !== undefined && {
                cta_content: ctaContent
                    ? { content: ctaContent, media: ctaMedia && ctaMedia.length > 0 ? ctaMedia : null }
                    : null,
            }),
        }).catch((err) => {
            console.error('Failed to sync short post media:', err);
            toast.error('Failed to save image changes');
        });
    };

    const handleAddShortPost = (content: string) => {
        const newPost: ShortPostPattern = {
            id: Date.now(),
            content,
            emotions: [],
            structure: 'Custom',
            why_it_works: 'Manually created post',
            media: [],
            cta_media: [],
            visualCount: 0,
        };
        setShortPosts(prev => [...prev, newPost]);
        toast.success('Short post added');
    };


    const onGenerateClick = () => {
        setShowConfirmModal(true);
    };

    const handleGenerateShortPosts = async (includeCta: boolean = false) => {
        setShowConfirmModal(false);

        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGenerating(true);

        try {
            const ctaLink = includeCta && publishedPostUrl ? publishedPostUrl : undefined;
            const response = await generateShortPosts(blogId, blogContent, ctaLink);

            setShortPosts(response.short_posts.map(shortPostToPattern));
            toast.success(`${response.short_posts.length} short posts generated`);
        } catch (error) {
            console.error('Failed to generate short posts:', error);
            toast.error('Failed to generate short posts', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleScheduled = () => {
        setSchedulingPost(null);
        setSchedulingVisual(null);
    };

    const handleGenerateThreads = async () => {
        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGeneratingThreads(true);

        try {
            const response = await generateThreads(blogId, blogContent);
            setThreads(response.threads);
            toast.success(`${response.threads.length} threads generated`);
        } catch (error) {
            console.error('Failed to generate threads:', error);
            toast.error('Failed to generate threads', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingThreads(false);
        }
    };

    // Show content based on initialTab (parent controls the tab)
    const renderContent = () => {
        switch (initialTab) {
            case 'short':
                return shortPosts.length === 0 ? (
                    <EmptyState type="short" onGenerate={onGenerateClick} isGenerating={isGenerating} isPublished={isPublished} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Generated Short Posts</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {shortPosts.length} short posts
                                </span>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className="pl-2">
                            {shortPosts.map((pattern, index) => (
                                <ShortPostCard
                                    key={pattern.id}
                                    pattern={pattern}
                                    index={index}
                                    blogId={blogId}
                                    onDelete={() => setShortPosts(prev => prev.filter(p => p.id !== pattern.id))}
                                    onDeleteCta={() => {
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: undefined, cta_media: [] } : p));
                                        updateShortPost(pattern.id, { cta_content: null }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onAddCta={() => {
                                        const ctaText = 'Read the full post here: ';
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: ctaText } : p));
                                        updateShortPost(pattern.id, { cta_content: { content: ctaText, media: null } }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onEdit={(content) => {
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, content } : p));
                                        updateShortPost(pattern.id, { content }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onEditCta={(content) => {
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: content } : p));
                                        updateShortPost(pattern.id, { cta_content: { content, media: pattern.cta_media.length > 0 ? pattern.cta_media : null } }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onSchedule={() => { setSchedulingPost(pattern); setSchedulingContentType('short_post'); }}
                                    onPublishNow={() => { setPublishingPost(pattern); setPublishingContentType('short_post'); }}
                                    onAddImage={(imageUrl) => {
                                        const newMedia = [...pattern.media, imageUrl].slice(0, 4);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
                                        syncShortPostMedia(pattern.id, newMedia);
                                    }}
                                    onRemoveImage={(imageIndex) => {
                                        const newMedia = pattern.media.filter((_, i) => i !== imageIndex);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
                                        syncShortPostMedia(pattern.id, newMedia);
                                    }}
                                    onReorderImages={(from, to) => {
                                        const newMedia = arrayMove(pattern.media, from, to);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
                                        syncShortPostMedia(pattern.id, newMedia);
                                    }}
                                    onAddCtaImage={(imageUrl) => {
                                        const newCtaImages = [...pattern.cta_media, imageUrl].slice(0, 4);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
                                        syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
                                    }}
                                    onRemoveCtaImage={(imageIndex) => {
                                        const newCtaImages = pattern.cta_media.filter((_, i) => i !== imageIndex);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
                                        syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
                                    }}
                                    onReorderCtaImages={(from, to) => {
                                        const newCtaImages = arrayMove(pattern.cta_media, from, to);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
                                        syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
                                    }}
                                    onVisualSaved={(visual) => {
                                        setVisuals(prev => [...prev, visual]);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, visualCount: p.visualCount + 1 } : p));
                                        onVisualCreated?.(visual);
                                        onSwitchTab?.('visuals');
                                    }}
                                    cardVisuals={visuals.filter(v => v.source_type === 'short_post' && v.source_id === pattern.id)}
                                    onGoToVisual={(visualId) => {
                                        onHighlightVisual?.(visualId);
                                        onSwitchTab?.('visuals');
                                    }}
                                    autoEdit={pattern.id === editShortPostId}
                                />
                            ))}
                        </div>
                    </div>
                );

            case 'threads':
                return threads.length === 0 ? (
                    <EmptyState type="threads" onGenerate={handleGenerateThreads} isGenerating={isGeneratingThreads} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500">Thread Variations</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {threads.length} generated
                            </span>
                        </div>
                        {threads.map((thread, index) => (
                            <ThreadCard
                                key={thread.id}
                                thread={thread}
                                index={index}
                                onEditPost={(postIndex, content) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id
                                            ? { ...t, posts: t.posts.map((p, i) => i === postIndex ? { ...p, content } : p) }
                                            : t
                                    ));
                                }}
                                onDeletePost={(postIndex) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id
                                            ? { ...t, posts: t.posts.filter((_, i) => i !== postIndex) }
                                            : t
                                    ));
                                }}
                                onInsertPost={(afterIndex) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id
                                            ? { ...t, posts: [...t.posts.slice(0, afterIndex + 1), { content: '', media: null }, ...t.posts.slice(afterIndex + 1)] }
                                            : t
                                    ));
                                }}
                                onEditHook={(content) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id ? { ...t, hook: content } : t
                                    ));
                                }}
                                onSchedule={() => {
                                    setSchedulingContentType('thread');
                                    setSchedulingPost({
                                        id: thread.id,
                                        content: thread.posts.map(p => p.content).join('\n\n---\n\n'),
                                        emotions: thread.metadata.emotions,
                                        structure: thread.metadata.structure,
                                        why_it_works: thread.metadata.why_it_works,
                                        media: [],
                                        cta_media: [],
                                        visualCount: 0,
                                    });
                                }}
                                onPublishNow={() => {
                                    setPublishingContentType('thread');
                                    setPublishingPost({
                                        id: thread.id,
                                        content: thread.posts.map(p => p.content).join('\n\n---\n\n'),
                                        emotions: thread.metadata.emotions,
                                        structure: thread.metadata.structure,
                                        why_it_works: thread.metadata.why_it_works,
                                        media: [],
                                        cta_media: [],
                                        visualCount: 0,
                                    });
                                }}
                                onDelete={() => setThreads(prev => prev.filter(t => t.id !== thread.id))}
                                blogId={blogId}
                                isPublished={isPublished}
                                onVisualSaved={(visual) => {
                                    setVisuals(prev => [...prev, visual]);
                                    onVisualCreated?.(visual);
                                    onSwitchTab?.('visuals');
                                }}
                            />
                        ))}
                    </div>
                );

            case 'visuals': {
                if (shortPosts.length === 0 && threads.length === 0) {
                    return <DependencyGate type="visuals" onSwitchTab={onSwitchTab} />;
                }

                const hasShortPosts = shortPosts.length > 0;
                const hasThreads = threads.length > 0;
                const activePickerTab = sourcePickerTab === 'threads' && !hasThreads ? 'short_posts'
                    : sourcePickerTab === 'short_posts' && !hasShortPosts ? 'threads'
                    : sourcePickerTab;
                const searchLower = sourcePickerSearch.toLowerCase();
                const filteredShortPosts = hasShortPosts
                    ? shortPosts.filter(sp => sp.content.toLowerCase().includes(searchLower))
                    : [];
                const filteredThreads = hasThreads
                    ? threads.filter(t => t.posts.some(p => p.content.toLowerCase().includes(searchLower)) || t.hook.toLowerCase().includes(searchLower))
                    : [];

                const sourcePickerContent = (
                    <>
                        {showSourcePicker && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/40" onClick={() => { setShowSourcePicker(false); setSourcePickerSearch(''); }} />
                                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-hidden flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-900">Select content for visual</h3>
                                        <button onClick={() => { setShowSourcePicker(false); setSourcePickerSearch(''); }} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Tabs + Search */}
                                    <div className="px-5 pt-3 pb-0 space-y-3">
                                        {/* Tabs — only show if both types exist */}
                                        {hasShortPosts && hasThreads && (
                                            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => setSourcePickerTab('short_posts')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                        activePickerTab === 'short_posts'
                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <FileText size={13} />
                                                    Short Posts
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activePickerTab === 'short_posts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {shortPosts.length}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => setSourcePickerTab('threads')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                        activePickerTab === 'threads'
                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <Layout size={13} />
                                                    Threads
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activePickerTab === 'threads' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {threads.length}
                                                    </span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={sourcePickerSearch}
                                                onChange={(e) => setSourcePickerSearch(e.target.value)}
                                                placeholder={activePickerTab === 'threads' ? 'Search threads...' : 'Search short posts...'}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
                                            />
                                            {sourcePickerSearch && (
                                                <button
                                                    onClick={() => setSourcePickerSearch('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content list */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {activePickerTab === 'short_posts' && (
                                            filteredShortPosts.length > 0 ? (
                                                filteredShortPosts.map((sp) => (
                                                    <button
                                                        key={`sp-${sp.id}`}
                                                        onClick={() => {
                                                            setCreatingVisualSource({ type: 'short_post', id: sp.id, content: sp.content });
                                                            setShowSourcePicker(false);
                                                            setSourcePickerSearch('');
                                                        }}
                                                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <p className="text-sm text-gray-800 line-clamp-3">{sp.content}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-sm text-gray-400">
                                                    {sourcePickerSearch ? 'No short posts match your search' : 'No short posts available'}
                                                </div>
                                            )
                                        )}
                                        {activePickerTab === 'threads' && (
                                            filteredThreads.length > 0 ? (
                                                filteredThreads.map((t) => (
                                                    <button
                                                        key={`t-${t.id}`}
                                                        onClick={() => {
                                                            setCreatingVisualSource({ type: 'thread', id: t.id, content: t.posts.map(p => p.content) });
                                                            setShowSourcePicker(false);
                                                            setSourcePickerSearch('');
                                                        }}
                                                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                                                    >
                                                        <p className="text-xs text-violet-600 font-medium mb-1">Thread · {t.posts.length} posts</p>
                                                        <p className="text-sm text-gray-800 line-clamp-3">{t.posts[0]?.content}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-sm text-gray-400">
                                                    {sourcePickerSearch ? 'No threads match your search' : 'No threads available'}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {creatingVisualSource && (
                            creatingVisualSource.type === 'thread' && Array.isArray(creatingVisualSource.content) ? (
                                <VisualThreadPreviewModal
                                    isOpen={true}
                                    onClose={() => setCreatingVisualSource(null)}
                                    content={creatingVisualSource.content}
                                    blogId={blogId}
                                    sourceId={creatingVisualSource.id}
                                    onSaved={(visual) => {
                                        setVisuals(prev => [...prev, visual]);
                                        setHighlightVisualId(visual.id);
                                        setCreatingVisualSource(null);
                                    }}
                                />
                            ) : (
                                <VisualShortPostPreviewModal
                                    isOpen={true}
                                    onClose={() => setCreatingVisualSource(null)}
                                    content={typeof creatingVisualSource.content === 'string' ? creatingVisualSource.content : creatingVisualSource.content[0]}
                                    blogId={blogId}
                                    sourceId={creatingVisualSource.id}
                                    onSaved={(visual) => {
                                        setVisuals(prev => [...prev, visual]);
                                        setHighlightVisualId(visual.id);
                                        setCreatingVisualSource(null);
                                    }}
                                />
                            )
                        )}
                    </>
                );

                if (visuals.length === 0) {
                    return (
                        <>
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
                                <div className="mb-4 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                                    <Image size={20} className="text-gray-400" />
                                </div>
                                <h3 className="mb-1 font-medium text-gray-900">No Visuals Yet</h3>
                                <p className="mb-4 max-w-[240px] text-sm text-gray-500">
                                    Create visual cards from your short posts or threads.
                                </p>
                                <button
                                    onClick={() => setShowSourcePicker(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus size={16} />
                                    Create Visual
                                </button>
                            </div>
                            {sourcePickerContent}
                        </>
                    );
                }

                return (
                    <>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Visuals</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {visuals.length} visual{visuals.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={() => setShowSourcePicker(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Create
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {visuals.map((visual, index) => {
                                const gradientPreset = GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0];
                                const contentText = Array.isArray(visual.content) ? visual.content[0] : visual.content;
                                const isBasic = visual.settings.style === 'basic';

                                const isHighlighted = highlightVisualId === visual.id;

                                return (
                                    <div
                                        key={visual.id}
                                        ref={isHighlighted ? (el) => {
                                            if (el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                setTimeout(() => setHighlightVisualId(null), 2000);
                                            }
                                        } : undefined}
                                        className={`group relative rounded-xl border bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
                                            isHighlighted
                                                ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        {/* Number badge */}
                                        <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white shadow-sm">
                                            {index + 1}
                                        </div>

                                        <div className="flex gap-4 p-4">
                                            {/* Left - Actual VisualPreview scaled down */}
                                            <div onClick={() => setViewingVisual(visual)} className="flex-shrink-0 w-44 h-44 rounded-lg overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity">
                                                <div className="absolute top-0 left-0 pointer-events-none" style={{ width: '500px', height: '500px', transform: 'scale(0.352)', transformOrigin: 'top left' }}>
                                                    <VisualPreview
                                                        content={contentText}
                                                        displayName={visual.settings.display_name}
                                                        handle={visual.settings.handle}
                                                        avatarUrl={visual.settings.avatar_url}
                                                        theme={visual.settings.theme}
                                                        style={visual.settings.style}
                                                        stats={visual.settings.stats || { views: 0, reposts: 0, quotes: 0, likes: 0, bookmarks: 0 }}
                                                        roundedCorners={visual.settings.corners === 'rounded'}
                                                        gradient={gradientPreset}
                                                    />
                                                </div>
                                            </div>

                                            {/* Right - Content + meta */}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                {/* Content preview */}
                                                <div className="mb-3 flex-1">
                                                    {contentText.split('\n').slice(0, 4).map((line, i) => (
                                                        <p key={i} className="text-sm leading-relaxed text-gray-800">
                                                            {line || <span className="block h-2" />}
                                                        </p>
                                                    ))}
                                                    {contentText.split('\n').length > 4 && (
                                                        <p className="text-sm text-gray-400">...</p>
                                                    )}
                                                </div>

                                                {/* Style badges */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${visual.source_type === 'thread' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                        {visual.source_type === 'thread' ? `Thread · ${Array.isArray(visual.content) ? visual.content.length : 1} posts` : 'Short Post'}
                                                    </span>
                                                    <span className="rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{visual.settings.style}</span>
                                                    <span className="rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{visual.settings.theme}</span>
                                                    {!isBasic && (
                                                        <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                                                            <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${gradientPreset.swatch}`} />
                                                            {gradientPreset.label}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Footer actions */}
                                                <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                                                    <button
                                                        onClick={() => setViewingVisual(visual)}
                                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                                                        title="Edit visual"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const text = Array.isArray(visual.content) ? visual.content.join('\n\n---\n\n') : visual.content;
                                                            setSchedulingContentType('visual');
                                                            setSchedulingVisual(visual);
                                                            setSchedulingPost({
                                                                id: visual.id,
                                                                content: visual.description || text,
                                                                emotions: [],
                                                                structure: '',
                                                                why_it_works: '',
                                                                media: [],
                                                                cta_content: '',
                                                                cta_media: [],
                                                                scheduled_post: null,
                                                                visualCount: 0,
                                                            });
                                                        }}
                                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                                                        title="Schedule"
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVisuals(prev => prev.filter(v => v.id !== visual.id));
                                                            deleteVisual(visual.id).catch(() => toast.error('Failed to delete visual'));
                                                        }}
                                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {viewingVisual && (
                            viewingVisual.source_type === 'thread' && Array.isArray(viewingVisual.content) ? (
                                <VisualThreadPreviewModal
                                    isOpen={true}
                                    onClose={() => setViewingVisual(null)}
                                    content={viewingVisual.content}
                                    blogId={blogId}
                                    sourceId={viewingVisual.source_id}
                                    visualId={viewingVisual.id}
                                    initialDescription={viewingVisual.description}
                                    initialSettings={viewingVisual.settings}
                                    onSaved={(updated) => {
                                        setVisuals(prev => prev.map(v => v.id === updated.id ? updated : v));
                                        setViewingVisual(null);
                                    }}
                                />
                            ) : (
                                <VisualShortPostPreviewModal
                                    isOpen={true}
                                    onClose={() => setViewingVisual(null)}
                                    content={Array.isArray(viewingVisual.content) ? viewingVisual.content[0] : viewingVisual.content}
                                    blogId={blogId}
                                    sourceId={viewingVisual.source_id}
                                    visualId={viewingVisual.id}
                                    initialDescription={viewingVisual.description}
                                    initialSettings={viewingVisual.settings}
                                    onSaved={(updated) => {
                                        setVisuals(prev => prev.map(v => v.id === updated.id ? updated : v));
                                        setViewingVisual(null);
                                    }}
                                />
                            )
                        )}

                        {sourcePickerContent}
                    </>
                );
            }

            case 'video':
                if (shortPosts.length === 0 && threads.length === 0) {
                    return <DependencyGate type="video" onSwitchTab={onSwitchTab} />;
                }
                return <EmptyState type="video" onGenerate={() => {}} isGenerating={false} />;

            default:
                return null;
        }
    };

    return (
        <div className="relative flex h-full flex-col bg-white">
            {isGenerating && (
                <GeneratingOverlay
                    title="Generating Short Posts"
                    description="Analyzing your blog content and crafting engaging short posts..."
                />
            )}
            {isGeneratingThreads && (
                <GeneratingOverlay
                    title="Generating Threads"
                    description="Analyzing your blog content and crafting engaging threads..."
                />
            )}
            <ConfirmGenerateModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleGenerateShortPosts}
                isPublished={isPublished}
            />
            <AddShortPostModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddShortPost}
            />
            <SchedulePostModal
                isOpen={!!schedulingPost}
                post={schedulingPost}
                blogId={blogId}
                contentType={schedulingContentType}
                visual={schedulingVisual}
                onClose={() => { setSchedulingPost(null); setSchedulingVisual(null); }}
                onScheduled={handleScheduled}
            />
            <PublishNowModal
                isOpen={!!publishingPost}
                post={publishingPost}
                contentType={publishingContentType}
                onClose={() => setPublishingPost(null)}
            />
            {/* Content - No internal tabs, parent controls which content to show */}
            <div className="flex-1 overflow-y-auto p-6">
                {renderContent()}
            </div>
        </div>
    );
}
