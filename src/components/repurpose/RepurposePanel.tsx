/**
 * Repurpose Panel Component
 *
 * Panel for generating short posts, threads, visuals from blog content.
 */

import { useEffect, useRef } from '@wordpress/element';
import {
    FileText,
    Image,
    Video,
    Layout,
    X,
    Plus,
    Search,
} from 'lucide-react';
import type { ShortPost, ThreadItem, Visual } from '@/types';
import { GeneratingOverlay } from '@/components/GeneratingOverlay';
import { VisualShortPostPreviewModal, VisualThreadPreviewModal } from './modals/VisualPreviewModal';
import ShortPostCard from './cards/ShortPostCard';
import ThreadCard from './cards/ThreadCard';
import VisualCard from './cards/VisualCard';
import { ConfirmGenerateModal, ConfirmDeleteModal, AddShortPostModal, SchedulePostModal, PublishNowModal } from './modals';
import { EmptyState, DependencyGate } from './EmptyState';
import { useShortPosts } from '@/hooks/useShortPosts';
import { useThreads } from '@/hooks/useThreads';
import { useVisuals } from '@/hooks/useVisuals';
import { useScheduling } from '@/hooks/useScheduling';

// ============================================
// TYPES
// ============================================

type TabType = 'short' | 'threads' | 'visuals' | 'video';

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
    const sp = useShortPosts(initialShortPosts, blogId, blogContent, isPublished, publishedPostUrl);
    const th = useThreads(initialThreads, blogId, blogContent);
    const vis = useVisuals(initialVisuals, initialHighlightVisualId);
    const sched = useScheduling();

    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to top when switching tabs
    useEffect(() => {
        scrollRef.current?.scrollTo(0, 0);
    }, [initialTab]);

    // --- Cross-hook orchestration ---

    const handleScheduled = (newScheduledPosts?: import('@/types').ShortPostSchedule[]) => {
        const result = sched.handleScheduled(newScheduledPosts);
        if (!result) return;

        if (result.contentType === 'short_post') {
            sp.addScheduledPosts(result.postId, result.scheduledPosts);
        } else if (result.contentType === 'thread') {
            th.addScheduledPosts(result.postId, result.scheduledPosts);
        } else if (result.contentType === 'visual' && result.visualId) {
            vis.addScheduledPosts(result.visualId, result.scheduledPosts);
        }
    };

    const handleUnscheduled = (scheduledPostId: number) => {
        sched.removeScheduledFromModal(scheduledPostId);

        if (sched.schedulingContentType === 'short_post' && sched.schedulingPost) {
            sp.removeScheduledPost(sched.schedulingPost.id, scheduledPostId);
        } else if (sched.schedulingContentType === 'thread' && sched.schedulingPost) {
            th.removeScheduledPost(sched.schedulingPost.id, scheduledPostId);
        } else if (sched.schedulingContentType === 'visual' && sched.schedulingVisual) {
            vis.removeScheduledPost(sched.schedulingVisual.id, scheduledPostId);
        }
    };

    const handleShortPostVisualSaved = (pattern: { id: number }, visual: Visual) => {
        vis.addVisual(visual);
        sp.incrementVisualCount(pattern.id);
        onVisualCreated?.(visual);
        onSwitchTab?.('visuals');
    };

    const handleThreadVisualSaved = (visual: Visual) => {
        vis.addVisual(visual);
        onVisualCreated?.(visual);
        onSwitchTab?.('visuals');
    };

    // --- Render ---

    const renderContent = () => {
        switch (initialTab) {
            case 'short':
                return sp.shortPosts.length === 0 ? (
                    <EmptyState type="short" onGenerate={sp.onGenerateClick} isGenerating={sp.isGenerating} isPublished={isPublished} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Generated Short Posts</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {sp.shortPosts.length} short posts
                                </span>
                                <button
                                    onClick={() => sp.setShowAddModal(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className="pl-2">
                            {sp.shortPosts.map((pattern, index) => (
                                <ShortPostCard
                                    key={pattern.id}
                                    pattern={pattern}
                                    index={index}
                                    blogId={blogId}
                                    {...sp.getCardProps(pattern)}
                                    onSchedule={() => sched.scheduleShortPost(pattern)}
                                    onPublishNow={() => sched.publishShortPost(pattern)}
                                    onVisualSaved={(visual) => handleShortPostVisualSaved(pattern, visual)}
                                    cardVisuals={vis.visuals.filter(v => v.source_type === 'short_post' && v.source_id === pattern.id)}
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
                return th.threads.length === 0 ? (
                    <EmptyState type="threads" onGenerate={th.handleGenerateThreads} isGenerating={th.isGeneratingThreads} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500">Thread Variations</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {th.threads.length} generated
                            </span>
                        </div>
                        {th.threads.map((thread, index) => (
                            <ThreadCard
                                key={thread.id}
                                thread={thread}
                                index={index}
                                {...th.getCardProps(thread)}
                                onSchedule={() => sched.scheduleThread(thread)}
                                onPublishNow={() => sched.publishThread(thread)}
                                blogId={blogId}
                                isPublished={isPublished}
                                onVisualSaved={handleThreadVisualSaved}
                            />
                        ))}
                    </div>
                );

            case 'visuals': {
                if (sp.shortPosts.length === 0 && th.threads.length === 0) {
                    return <DependencyGate type="visuals" onSwitchTab={onSwitchTab} />;
                }

                const hasShortPosts = sp.shortPosts.length > 0;
                const hasThreads = th.threads.length > 0;
                const activePickerTab = vis.sourcePickerTab === 'threads' && !hasThreads ? 'short_posts'
                    : vis.sourcePickerTab === 'short_posts' && !hasShortPosts ? 'threads'
                    : vis.sourcePickerTab;
                const searchLower = vis.sourcePickerSearch.toLowerCase();
                const filteredShortPosts = hasShortPosts
                    ? sp.shortPosts.filter(s => s.content.toLowerCase().includes(searchLower))
                    : [];
                const filteredThreads = hasThreads
                    ? th.threads.filter(t => t.posts.some(p => p.content.toLowerCase().includes(searchLower)) || t.hook.toLowerCase().includes(searchLower))
                    : [];

                const sourcePickerContent = (
                    <>
                        {vis.showSourcePicker && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/40" onClick={vis.closeSourcePicker} />
                                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-hidden flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-900">Select content for visual</h3>
                                        <button onClick={vis.closeSourcePicker} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Tabs + Search */}
                                    <div className="px-5 pt-3 pb-0 space-y-3">
                                        {hasShortPosts && hasThreads && (
                                            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => vis.setSourcePickerTab('short_posts')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                        activePickerTab === 'short_posts'
                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <FileText size={13} />
                                                    Short Posts
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activePickerTab === 'short_posts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {sp.shortPosts.length}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => vis.setSourcePickerTab('threads')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                        activePickerTab === 'threads'
                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <Layout size={13} />
                                                    Threads
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activePickerTab === 'threads' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {th.threads.length}
                                                    </span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={vis.sourcePickerSearch}
                                                onChange={(e) => vis.setSourcePickerSearch(e.target.value)}
                                                placeholder={activePickerTab === 'threads' ? 'Search threads...' : 'Search short posts...'}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
                                            />
                                            {vis.sourcePickerSearch && (
                                                <button
                                                    onClick={() => vis.setSourcePickerSearch('')}
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
                                                filteredShortPosts.map((s) => (
                                                    <button
                                                        key={`sp-${s.id}`}
                                                        onClick={() => vis.selectSource({ type: 'short_post', id: s.id, content: s.content })}
                                                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <p className="text-sm text-gray-800 line-clamp-3">{s.content}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-sm text-gray-400">
                                                    {vis.sourcePickerSearch ? 'No short posts match your search' : 'No short posts available'}
                                                </div>
                                            )
                                        )}
                                        {activePickerTab === 'threads' && (
                                            filteredThreads.length > 0 ? (
                                                filteredThreads.map((t) => (
                                                    <button
                                                        key={`t-${t.id}`}
                                                        onClick={() => vis.selectSource({ type: 'thread', id: t.id, content: t.posts.map(p => p.content) })}
                                                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                                                    >
                                                        <p className="text-xs text-violet-600 font-medium mb-1">Thread · {t.posts.length} posts</p>
                                                        <p className="text-sm text-gray-800 line-clamp-3">{t.posts[0]?.content}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-sm text-gray-400">
                                                    {vis.sourcePickerSearch ? 'No threads match your search' : 'No threads available'}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {vis.creatingVisualSource && (
                            vis.creatingVisualSource.type === 'thread' && Array.isArray(vis.creatingVisualSource.content) ? (
                                <VisualThreadPreviewModal
                                    isOpen={true}
                                    onClose={() => vis.setCreatingVisualSource(null)}
                                    content={vis.creatingVisualSource.content}
                                    blogId={blogId}
                                    sourceId={vis.creatingVisualSource.id}
                                    onSaved={vis.onVisualCreatedFromSource}
                                />
                            ) : (
                                <VisualShortPostPreviewModal
                                    isOpen={true}
                                    onClose={() => vis.setCreatingVisualSource(null)}
                                    content={typeof vis.creatingVisualSource.content === 'string' ? vis.creatingVisualSource.content : vis.creatingVisualSource.content[0]}
                                    blogId={blogId}
                                    sourceId={vis.creatingVisualSource.id}
                                    onSaved={vis.onVisualCreatedFromSource}
                                />
                            )
                        )}
                    </>
                );

                if (vis.visuals.length === 0) {
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
                                    onClick={() => vis.setShowSourcePicker(true)}
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
                                    {vis.visuals.length} visual{vis.visuals.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={() => vis.setShowSourcePicker(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Create
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {vis.visuals.map((visual, index) => (
                                <VisualCard
                                    key={visual.id}
                                    visual={visual}
                                    index={index}
                                    isHighlighted={vis.highlightVisualId === visual.id}
                                    onHighlightRef={(el) => {
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            setTimeout(() => vis.setHighlightVisualId(null), 2000);
                                        }
                                    }}
                                    onEdit={() => vis.setViewingVisual(visual)}
                                    onSchedule={() => sched.scheduleVisual(visual)}
                                    onDelete={() => vis.setDeletingVisualId(visual.id)}
                                />
                            ))}
                        </div>

                        {vis.viewingVisual && (
                            vis.viewingVisual.source_type === 'thread' && Array.isArray(vis.viewingVisual.content) ? (
                                <VisualThreadPreviewModal
                                    isOpen={true}
                                    onClose={() => vis.setViewingVisual(null)}
                                    content={vis.viewingVisual.content}
                                    blogId={blogId}
                                    sourceId={vis.viewingVisual.source_id}
                                    visualId={vis.viewingVisual.id}
                                    initialDescription={vis.viewingVisual.description}
                                    initialSettings={vis.viewingVisual.settings}
                                    onSaved={vis.onVisualUpdated}
                                />
                            ) : (
                                <VisualShortPostPreviewModal
                                    isOpen={true}
                                    onClose={() => vis.setViewingVisual(null)}
                                    content={Array.isArray(vis.viewingVisual.content) ? vis.viewingVisual.content[0] : vis.viewingVisual.content}
                                    blogId={blogId}
                                    sourceId={vis.viewingVisual.source_id}
                                    visualId={vis.viewingVisual.id}
                                    initialDescription={vis.viewingVisual.description}
                                    initialSettings={vis.viewingVisual.settings}
                                    onSaved={vis.onVisualUpdated}
                                />
                            )
                        )}

                        {sourcePickerContent}
                    </>
                );
            }

            case 'video':
                return (
                    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center">
                        <div className="mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200">
                            <Video size={24} className="text-amber-500" />
                        </div>
                        <span className="mb-3 inline-block px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            Coming Soon
                        </span>
                        <h3 className="mb-1.5 text-lg font-semibold text-gray-900">Video Clips</h3>
                        <p className="max-w-[280px] text-sm text-gray-500 leading-relaxed">
                            Turn your blog content into short video clips for social media. Stay tuned!
                        </p>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="relative flex h-full flex-col bg-white">
            {sp.isGenerating && (
                <GeneratingOverlay
                    title="Generating Short Posts"
                    description="Analyzing your blog content and crafting engaging short posts..."
                />
            )}
            {th.isGeneratingThreads && (
                <GeneratingOverlay
                    title="Generating Threads"
                    description="Analyzing your blog content and crafting engaging threads..."
                />
            )}
            <ConfirmGenerateModal
                isOpen={sp.showConfirmModal}
                onClose={() => sp.setShowConfirmModal(false)}
                onConfirm={sp.handleGenerateShortPosts}
                isPublished={isPublished}
            />
            <AddShortPostModal
                isOpen={sp.showAddModal}
                onClose={() => sp.setShowAddModal(false)}
                onAdd={sp.handleAddShortPost}
            />
            <SchedulePostModal
                isOpen={!!sched.schedulingPost}
                post={sched.schedulingPost}
                blogId={blogId}
                contentType={sched.schedulingContentType}
                visual={sched.schedulingVisual}
                threadPosts={sched.schedulingThreadPosts}
                onClose={sched.clearScheduling}
                onScheduled={handleScheduled}
                onUnscheduled={handleUnscheduled}
            />
            <PublishNowModal
                isOpen={!!sched.publishingPost}
                post={sched.publishingPost}
                contentType={sched.publishingContentType}
                onClose={sched.clearPublishing}
            />
            <ConfirmDeleteModal
                isOpen={vis.deletingVisualId !== null}
                onClose={() => vis.setDeletingVisualId(null)}
                onConfirm={vis.confirmDelete}
                title="Delete Visual"
                description="This visual will be permanently deleted. This action cannot be undone."
            />
            {/* Content - No internal tabs, parent controls which content to show */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
                {renderContent()}
            </div>
        </div>
    );
}
