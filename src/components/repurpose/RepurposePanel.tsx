/**
 * Repurpose Panel Component
 *
 * Panel for generating short posts, threads, visuals from blog content.
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import {
    Image,
    Video,
    Plus,
    Loader2,
    Sparkles,
} from 'lucide-react';
import type { ShortPost, ShortPostSchedule, ThreadItem, Visual } from '@/types';
import { GeneratingOverlay } from '@/components/GeneratingOverlay';
import { VisualPreviewModal } from './modals/VisualPreviewModal';
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

    const getShortPostStage = (post: ShortPost): 'draft' | 'scheduled' | 'published' => {
        const schedules = post.scheduled_posts ?? [];
        if (schedules.length === 0) return 'draft';
        if (schedules.some(s => s.status === 'published' || s.status === 'failed')) return 'published';
        return 'scheduled';
    };

    const renderContent = () => {
        switch (initialTab) {
            case 'short':
                return sp.shortPosts.length === 0 ? (
                    <EmptyState type="short" onGenerate={sp.onGenerateClick} isGenerating={sp.isGenerating} isPublished={isPublished} />
                ) : (
                    <ShortPostsWithTabs
                        shortPosts={sp.shortPosts}
                        getStage={getShortPostStage}
                        blogId={blogId}
                        getCardProps={sp.getCardProps}
                        onSchedule={(p) => sched.scheduleShortPost(p)}
                        onPublishNow={(p) => sched.publishShortPost(p)}
                        onVisualSaved={(p, v) => handleShortPostVisualSaved(p, v)}
                        visuals={vis.visuals}
                        onGoToVisual={(visualId) => { onHighlightVisual?.(visualId); onSwitchTab?.('visuals'); }}
                        editShortPostId={editShortPostId}
                        isPublished={isPublished}
                        onAddClick={() => sp.setShowAddModal(true)}
                        onGenerateMore={sp.handleGenerateMoreShortPosts}
                        isGeneratingMore={sp.isGeneratingMore}
                    />
                );

            case 'threads':
                return th.threads.length === 0 ? (
                    <EmptyState type="threads" onGenerate={th.handleGenerateThreads} isGenerating={th.isGeneratingThreads} />
                ) : (
                    <ThreadsWithTabs
                        threads={th.threads}
                        getStage={getShortPostStage}
                        getCardProps={th.getCardProps}
                        onSchedule={(t) => sched.scheduleThread(t)}
                        onPublishNow={(t) => sched.publishThread(t)}
                        blogId={blogId}
                        isPublished={isPublished}
                        onVisualSaved={handleThreadVisualSaved}
                    />
                );

            case 'visuals': {
                const hasShortPosts = sp.shortPosts.length > 0;
                const hasThreads = th.threads.length > 0;
                const activePickerTab = vis.sourcePickerTab === 'threads' && !hasThreads ? (hasShortPosts ? 'short_posts' : 'custom')
                    : vis.sourcePickerTab === 'short_posts' && !hasShortPosts ? (hasThreads ? 'threads' : 'custom')
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
                        <VisualsWithTabs
                            visuals={vis.visuals}
                            getStage={getShortPostStage}
                            highlightVisualId={vis.highlightVisualId}
                            onHighlightRef={(el) => {
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setTimeout(() => vis.setHighlightVisualId(null), 2000);
                                }
                            }}
                            onEdit={(visual) => vis.setViewingVisual(visual)}
                            onSchedule={(visual) => sched.scheduleVisual(visual)}
                            onPublishNow={(visual) => sched.publishVisual(visual)}
                            onDelete={(visual) => vis.setDeletingVisualId(visual.id)}
                            onCreateClick={() => vis.setShowSourcePicker(true)}
                        />

                        {vis.viewingVisual && (
                            <VisualPreviewModal
                                isOpen={true}
                                onClose={() => vis.setViewingVisual(null)}
                                content={Array.isArray(vis.viewingVisual.content) ? vis.viewingVisual.content : [vis.viewingVisual.content]}
                                sourceType={vis.viewingVisual.source_type}
                                blogId={blogId}
                                sourceId={vis.viewingVisual.source_id}
                                visualId={vis.viewingVisual.id}
                                initialDescription={vis.viewingVisual.description}
                                initialSettings={vis.viewingVisual.settings}
                                onSaved={vis.onVisualUpdated}
                            />
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
                visual={sched.publishingVisual}
                postId={blogId}
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

// ============================================
// SHORT POSTS WITH TABS
// ============================================

type ShortPostStage = 'draft' | 'scheduled' | 'published';

interface ShortPostsWithTabsProps {
    shortPosts: ShortPost[];
    getStage: (post: ShortPost) => ShortPostStage;
    blogId?: number;
    getCardProps: (post: ShortPost) => Record<string, unknown>;
    onSchedule: (post: ShortPost) => void;
    onPublishNow: (post: ShortPost) => void;
    onVisualSaved: (post: ShortPost, visual: Visual) => void;
    visuals: Visual[];
    onGoToVisual: (visualId: number) => void;
    editShortPostId?: number;
    isPublished?: boolean;
    onAddClick: () => void;
    onGenerateMore: () => void;
    isGeneratingMore: boolean;
}

function ShortPostsWithTabs({
    shortPosts,
    getStage,
    blogId,
    getCardProps,
    onSchedule,
    onPublishNow,
    onVisualSaved,
    visuals,
    onGoToVisual,
    editShortPostId,
    isPublished,
    onAddClick,
    onGenerateMore,
    isGeneratingMore,
}: ShortPostsWithTabsProps) {
    const [activeStage, setActiveStage] = useState<ShortPostStage>('draft');

    const counts = {
        draft: shortPosts.filter(p => getStage(p) === 'draft').length,
        scheduled: shortPosts.filter(p => getStage(p) === 'scheduled').length,
        published: shortPosts.filter(p => getStage(p) === 'published').length,
    };

    const filtered = shortPosts.filter(p => getStage(p) === activeStage);

    const tabs: { key: ShortPostStage; label: string }[] = [
        { key: 'draft', label: 'Draft' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'published', label: 'Published' },
    ];

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Generated Short Posts</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {shortPosts.length} short posts
                </span>
            </div>

            {/* Stage tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-100">
                {tabs.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveStage(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeStage === key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {label}
                        {counts[key] > 0 && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                                activeStage === key
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-500'
                            }`}>
                                {counts[key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Posts list */}
            {activeStage === 'draft' && (
                <button
                    onClick={onAddClick}
                    className="mb-3 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    <Plus size={14} />
                    Add
                </button>
            )}
            {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                    No {activeStage} posts
                </div>
            ) : (
                <div className="pl-2">
                    {filtered.map((pattern, index) => (
                        <ShortPostCard
                            key={pattern.id}
                            pattern={pattern}
                            index={index}
                            blogId={blogId}
                            {...(getCardProps(pattern) as any)}
                            onSchedule={() => onSchedule(pattern)}
                            onPublishNow={() => onPublishNow(pattern)}
                            onVisualSaved={(visual: Visual) => onVisualSaved(pattern, visual)}
                            cardVisuals={visuals.filter(v => v.source_type === 'short_post' && v.source_id === pattern.id)}
                            onGoToVisual={onGoToVisual}
                            autoEdit={pattern.id === editShortPostId}
                            isPublished={isPublished}
                            stage={activeStage}
                        />
                    ))}
                </div>
            )}
            {activeStage === 'draft' && (
                <button
                    onClick={onGenerateMore}
                    disabled={isGeneratingMore}
                    className="mt-3 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isGeneratingMore ? (
                        <>
                            <Loader2 size={13} className="animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles size={13} />
                            Generate 10 more
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

// ============================================
// THREADS WITH TABS
// ============================================

interface ThreadsWithTabsProps {
    threads: ThreadItem[];
    getStage: (item: { scheduled_posts?: ShortPostSchedule[] }) => ShortPostStage;
    getCardProps: (thread: ThreadItem) => Record<string, unknown>;
    onSchedule: (thread: ThreadItem) => void;
    onPublishNow: (thread: ThreadItem) => void;
    blogId?: number;
    isPublished?: boolean;
    onVisualSaved: (visual: Visual) => void;
}

function ThreadsWithTabs({ threads, getStage, getCardProps, onSchedule, onPublishNow, blogId, isPublished, onVisualSaved }: ThreadsWithTabsProps) {
    const [activeStage, setActiveStage] = useState<ShortPostStage>('draft');

    const counts = {
        draft: threads.filter(t => getStage(t) === 'draft').length,
        scheduled: threads.filter(t => getStage(t) === 'scheduled').length,
        published: threads.filter(t => getStage(t) === 'published').length,
    };

    const filtered = threads.filter(t => getStage(t) === activeStage);
    const tabs: { key: ShortPostStage; label: string }[] = [
        { key: 'draft', label: 'Draft' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'published', label: 'Published' },
    ];

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Thread Variations</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{threads.length} generated</span>
            </div>
            <div className="flex gap-1 mb-4 border-b border-gray-100">
                {tabs.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveStage(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeStage === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {label}
                        {counts[key] > 0 && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                                activeStage === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}>{counts[key]}</span>
                        )}
                    </button>
                ))}
            </div>
            {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No {activeStage} threads</div>
            ) : (
                filtered.map((thread, index) => (
                    <ThreadCard
                        key={thread.id}
                        thread={thread}
                        index={index}
                        {...(getCardProps(thread) as any)}
                        onSchedule={() => onSchedule(thread)}
                        onPublishNow={() => onPublishNow(thread)}
                        blogId={blogId}
                        isPublished={isPublished}
                        onVisualSaved={onVisualSaved}
                    />
                ))
            )}
        </div>
    );
}

// ============================================
// VISUALS WITH TABS
// ============================================

interface VisualsWithTabsProps {
    visuals: Visual[];
    getStage: (item: { scheduled_posts?: ShortPostSchedule[] }) => ShortPostStage;
    highlightVisualId: number | null;
    onHighlightRef: (el: HTMLDivElement | null) => void;
    onEdit: (visual: Visual) => void;
    onSchedule: (visual: Visual) => void;
    onPublishNow: (visual: Visual) => void;
    onDelete: (visual: Visual) => void;
    onCreateClick: () => void;
}

function VisualsWithTabs({ visuals, getStage, highlightVisualId, onHighlightRef, onEdit, onSchedule, onPublishNow, onDelete, onCreateClick }: VisualsWithTabsProps) {
    const [activeStage, setActiveStage] = useState<ShortPostStage>('draft');

    const counts = {
        draft: visuals.filter(v => getStage(v) === 'draft').length,
        scheduled: visuals.filter(v => getStage(v) === 'scheduled').length,
        published: visuals.filter(v => getStage(v) === 'published').length,
    };

    const filtered = visuals.filter(v => getStage(v) === activeStage);
    const tabs: { key: ShortPostStage; label: string }[] = [
        { key: 'draft', label: 'Draft' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'published', label: 'Published' },
    ];

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Visuals</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        {visuals.length} visual{visuals.length !== 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={onCreateClick}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <Plus size={14} />
                        Create
                    </button>
                </div>
            </div>
            <div className="flex gap-1 mb-4 border-b border-gray-100">
                {tabs.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveStage(key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeStage === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {label}
                        {counts[key] > 0 && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                                activeStage === key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}>{counts[key]}</span>
                        )}
                    </button>
                ))}
            </div>
            {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">No {activeStage} visuals</div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((visual, index) => (
                        <VisualCard
                            key={visual.id}
                            visual={visual}
                            index={index}
                            isHighlighted={highlightVisualId === visual.id}
                            onHighlightRef={onHighlightRef}
                            onEdit={() => onEdit(visual)}
                            onSchedule={() => onSchedule(visual)}
                            onPublishNow={() => onPublishNow(visual)}
                            onDelete={() => onDelete(visual)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
