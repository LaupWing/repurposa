import { useState } from "@wordpress/element";
import { Clock, FileText, List, Trash2, Image } from "lucide-react";
import { toast } from "sonner";
import type { ShortPost as ApiShortPost, ThreadItem, Visual } from "@/types";
import { deleteShortPost, deleteThread } from "@/services/repurposeApi";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { GRADIENT_PRESETS } from "@/components/repurpose/modals/VisualPreviewModal";

type DraftSubTab = 'all' | 'short_post' | 'thread' | 'visual';

interface DraftsTabProps {
    drafts: ApiShortPost[];
    threadDrafts: ThreadItem[];
    visualDrafts: Visual[];
    isLoading: boolean;
    onDraftsChange: (updater: (prev: ApiShortPost[]) => ApiShortPost[]) => void;
    onThreadDraftsChange: (updater: (prev: ThreadItem[]) => ThreadItem[]) => void;
    onVisualDraftsChange: (updater: (prev: Visual[]) => Visual[]) => void;
    onDraftClick: (draft: ApiShortPost) => void;
    onThreadDraftClick: (thread: ThreadItem) => void;
    onVisualDraftClick: (visual: Visual) => void;
}

function MiniVisualThumb({ visual }: { visual: Visual }) {
    const firstSlide = Array.isArray(visual.content) ? visual.content[0] : visual.content;
    const slideCount = Array.isArray(visual.content) ? visual.content.length : 1;
    const isDark = visual.settings.theme === 'dark';
    const gradient = GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0];
    const gradientClass = isDark ? gradient.dark : gradient.light;
    return (
        <div className={`w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${gradientClass} flex items-center justify-center p-1 relative`}>
            <p className={`text-[4px] leading-tight line-clamp-3 text-center ${isDark ? 'text-white/90' : 'text-gray-900/80'}`}>{firstSlide}</p>
            {slideCount > 1 && (
                <span className={`absolute bottom-0.5 right-0.5 text-[6px] font-bold ${isDark ? 'text-white/60' : 'text-gray-900/40'}`}>1/{slideCount}</span>
            )}
        </div>
    );
}

export function DraftsTab({ drafts, threadDrafts, visualDrafts, isLoading, onDraftsChange, onThreadDraftsChange, onVisualDraftsChange, onDraftClick, onThreadDraftClick, onVisualDraftClick }: DraftsTabProps) {
    const [activeSubTab, setActiveSubTab] = useState<DraftSubTab>('all');
    const [draftToDelete, setDraftToDelete] = useState<{ type: 'short' | 'thread' | 'visual'; id: number } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!draftToDelete) return;
        setIsDeleting(true);
        try {
            if (draftToDelete.type === 'short') {
                await deleteShortPost(draftToDelete.id);
                onDraftsChange((prev) => prev.filter((d) => d.id !== draftToDelete.id));
                toast.success("Draft deleted");
            } else if (draftToDelete.type === 'thread') {
                await deleteThread(draftToDelete.id);
                onThreadDraftsChange((prev) => prev.filter((t) => t.id !== draftToDelete.id));
                toast.success("Thread draft deleted");
            } else {
                // Visual delete — handled via API if needed; for now just remove from local state
                onVisualDraftsChange((prev) => prev.filter((v) => v.id !== draftToDelete.id));
                toast.success("Visual draft deleted");
            }
        } catch {
            toast.error("Failed to delete draft");
        } finally {
            setIsDeleting(false);
            setDraftToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg" />
                ))}
            </div>
        );
    }

    const isEmpty = drafts.length === 0 && threadDrafts.length === 0 && visualDrafts.length === 0;

    if (isEmpty) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                    <FileText size={28} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No drafts yet</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Standalone posts you create from the schedule will appear here when they&apos;re not scheduled.
                </p>
            </div>
        );
    }

    const subTabs: { id: DraftSubTab; label: string; count: number }[] = [
        { id: 'all', label: 'All', count: drafts.length + threadDrafts.length + visualDrafts.length },
        { id: 'short_post', label: 'Short Posts', count: drafts.length },
        { id: 'thread', label: 'Threads', count: threadDrafts.length },
        { id: 'visual', label: 'Visuals', count: visualDrafts.length },
    ];

    const showShortPosts = activeSubTab === 'all' || activeSubTab === 'short_post';
    const showThreads = activeSubTab === 'all' || activeSubTab === 'thread';
    const showVisuals = activeSubTab === 'all' || activeSubTab === 'visual';

    return (
        <div className="space-y-3">
            {/* Sub-tabs */}
            <div className="flex items-center gap-1.5">
                {subTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            activeSubTab === tab.id
                                ? 'bg-gray-900 text-white'
                                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] ${activeSubTab === tab.id ? 'text-gray-400' : 'text-gray-300'}`}>{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="space-y-2">
                {showShortPosts && drafts.map((draft) => {
                    const hasSchedule = draft.scheduled_posts && draft.scheduled_posts.length > 0;
                    return (
                        <div
                            key={`sp-${draft.id}`}
                            onClick={() => onDraftClick(draft)}
                            className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        <FileText size={11} />
                                        Short Post
                                    </span>
                                    {hasSchedule && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                                            <Clock size={10} />
                                            Scheduled
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1">{draft.content}</p>
                                <span className="text-xs text-gray-400">
                                    Created {draft.created_at ? new Date(draft.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                                </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDraftToDelete({ type: 'short', id: draft.id }); }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {showThreads && threadDrafts.map((thread) => {
                    const hasSchedule = thread.scheduled_posts && thread.scheduled_posts.length > 0;
                    return (
                        <div
                            key={`th-${thread.id}`}
                            onClick={() => onThreadDraftClick(thread)}
                            className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600">
                                        <List size={11} />
                                        Thread
                                    </span>
                                    {hasSchedule && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                                            <Clock size={10} />
                                            Scheduled
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1">{thread.hook}</p>
                                <span className="text-xs text-gray-400">
                                    {thread.posts.length} post{thread.posts.length !== 1 ? "s" : ""}
                                </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDraftToDelete({ type: 'thread', id: thread.id }); }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {showVisuals && visualDrafts.map((visual) => {
                    const hasSchedule = visual.scheduled_posts && visual.scheduled_posts.length > 0;
                    const slideCount = Array.isArray(visual.content) ? visual.content.length : 1;
                    return (
                        <div
                            key={`vi-${visual.id}`}
                            onClick={() => onVisualDraftClick(visual)}
                            className="group flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                            <MiniVisualThumb visual={visual} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-pink-50 text-pink-600">
                                        <Image size={11} />
                                        Visual
                                    </span>
                                    {hasSchedule && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                                            <Clock size={10} />
                                            Scheduled
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 line-clamp-1 mb-1">
                                    {Array.isArray(visual.content) ? visual.content[0] : visual.content}
                                </p>
                                <span className="text-xs text-gray-400">{slideCount} slide{slideCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDraftToDelete({ type: 'visual', id: visual.id }); }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmModal
                isOpen={!!draftToDelete}
                title="Delete Draft"
                description={
                    draftToDelete?.type === 'thread'
                        ? "Delete this thread draft? This cannot be undone."
                        : draftToDelete?.type === 'visual'
                        ? "Delete this visual draft? This cannot be undone."
                        : "Delete this short post draft? This cannot be undone."
                }
                confirmLabel="Delete"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDraftToDelete(null)}
            />
        </div>
    );
}
