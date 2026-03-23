import { Clock, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ShortPost as ApiShortPost } from "@/types";
import { deleteShortPost } from "@/services/repurposeApi";

interface DraftsTabProps {
    drafts: ApiShortPost[];
    isLoading: boolean;
    onDraftsChange: (updater: (prev: ApiShortPost[]) => ApiShortPost[]) => void;
    onDraftClick: (draft: ApiShortPost) => void;
}

export function DraftsTab({ drafts, isLoading, onDraftsChange, onDraftClick }: DraftsTabProps) {
    if (isLoading) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg" />
                ))}
            </div>
        );
    }

    if (drafts.length === 0) {
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

    return (
        <div className="space-y-2">
            {drafts.map((draft) => {
                const hasSchedule = draft.scheduled_posts && draft.scheduled_posts.length > 0;
                return (
                    <div
                        key={draft.id}
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
                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1">
                                {draft.content}
                            </p>
                            <span className="text-xs text-gray-400">
                                Created {draft.created_at ? new Date(draft.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                            </span>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                        await deleteShortPost(draft.id);
                                        onDraftsChange((prev) => prev.filter((d) => d.id !== draft.id));
                                        toast.success("Draft deleted");
                                    } catch {
                                        toast.error("Failed to delete draft");
                                    }
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
