/**
 * Repurpose Panel Component
 *
 * Panel for generating short posts, threads, visuals from blog content.
 */

import { useEffect, useRef } from '@wordpress/element';
import {
    Image,
    Video,
    Plus,
} from 'lucide-react';
import type { ShortPost, ThreadItem, Visual } from '@/types';
import { GeneratingOverlay } from '@/components/GeneratingOverlay';
import { VisualShortPostPreviewModal, VisualThreadPreviewModal } from './modals/VisualPreviewModal';
import ShortPostCard from './cards/ShortPostCard';
import ThreadCard from './cards/ThreadCard';
import VisualCard from './cards/VisualCard';
import { ConfirmGenerateModal, ConfirmDeleteModal, AddShortPostModal, SchedulePostModal, PublishNowModal, SourcePickerModal } from './modals';
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
    onThreadsGenerated?: (threads: ThreadItem[]) => void;
    onShortPostsGenerated?: (shortPosts: ShortPost[]) => void;
    initialHighlightVisualId?: number | null;
    initialShortPosts?: ShortPost[];
    initialThreads?: ThreadItem[];
    initialVisuals?: Visual[];
}

export function RepurposePanel({ initialTab = 'short', blogContent, blogId, isPublished, publishedPostUrl, editShortPostId, onSwitchTab, onVisualCreated, onHighlightVisual, onThreadsGenerated, onShortPostsGenerated, initialHighlightVisualId, initialShortPosts, initialThreads, initialVisuals }: RepurposePanelProps) {
    const sp = useShortPosts(initialShortPosts, blogId, blogContent, isPublished, publishedPostUrl, onShortPostsGenerated);
    const th = useThreads(initialThreads, blogId, blogContent, onThreadsGenerated);
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

    const handlePublished = (publishedPosts: import('@/types').ShortPostSchedule[]) => {
        const result = sched.handlePublished(publishedPosts);
        if (!result) return;

        if (result.contentType === 'short_post') {
            sp.addScheduledPosts(result.postId, result.publishedPosts);
        } else if (result.contentType === 'thread') {
            th.addScheduledPosts(result.postId, result.publishedPosts);
        } else if (result.contentType === 'visual') {
            vis.addScheduledPosts(result.postId, result.publishedPosts);
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
                                    isPublished={isPublished}
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

                const sourcePickerModal = (
                    <SourcePickerModal
                        isOpen={vis.showSourcePicker}
                        onClose={vis.closeSourcePicker}
                        search={vis.sourcePickerSearch}
                        onSearchChange={vis.setSourcePickerSearch}
                        activeTab={activePickerTab}
                        onTabChange={vis.setSourcePickerTab}
                        shortPosts={sp.shortPosts}
                        threads={th.threads}
                        onSelect={vis.selectSource}
                        creatingSource={vis.creatingVisualSource}
                        onCreatingSourceClose={() => vis.setCreatingVisualSource(null)}
                        onVisualSaved={vis.onVisualCreatedFromSource}
                        blogId={blogId}
                    />
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
                            {sourcePickerModal}
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
                                    onPublishNow={() => sched.publishVisual(visual)}
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

                        {sourcePickerModal}
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
                    descriptions={[
                        'Analyzing your blog content...',
                        'Extracting key insights...',
                        'Crafting engaging short posts...',
                        'Polishing the final touches...',
                    ]}
                />
            )}
            {th.isGeneratingThreads && (
                <GeneratingOverlay
                    title="Generating Threads"
                    descriptions={[
                        'Analyzing your blog content...',
                        'Breaking down key points...',
                        'Structuring the thread flow...',
                        'Crafting engaging tweets...',
                    ]}
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
                onPublished={handlePublished}
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
