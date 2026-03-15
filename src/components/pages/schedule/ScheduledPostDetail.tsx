import { useState, useRef } from '@wordpress/element';
import { X, Clock, Pencil, Check, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { updateShortPost } from '@/services/repurposeApi';
import { deleteScheduledPost, updateScheduledPost } from '@/services/scheduleApi';
import { SCHEDULE_PLATFORMS } from '@/components/repurpose/modals/schedule-utils';
import type { SchedulePlatform } from '@/components/repurpose/modals/schedule-utils';
import { AITextPopup } from '@/components/AITextPopup';

interface ScheduledPostDetailProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    post: {
        id: number;
        ids: number[];
        content: string;
        platforms: SchedulePlatform[];
        postType: string;
        scheduledAt: string;
        status: string;
        blogTitle?: string;
        postId?: number | null;
        schedulableId?: number;
        threadCount?: number;
    };
}

export default function ScheduledPostDetail({ isOpen, onClose, onUpdated, post }: ScheduledPostDetailProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(post.content);
    const [isSaving, setIsSaving] = useState(false);
    const [isUnscheduling, setIsUnscheduling] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(() => new Date(post.scheduledAt));
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    if (!isOpen) return null;

    const isStandalone = !post.postId;
    const dateValue = scheduledAt.toISOString().split('T')[0];
    const timeValue = scheduledAt.toTimeString().slice(0, 5);

    const handleSave = async () => {
        if (!post.schedulableId || !editText.trim()) return;
        setIsSaving(true);
        try {
            await updateShortPost(post.schedulableId, { content: editText.trim() });
            toast.success('Post updated');
            setIsEditing(false);
            onUpdated();
        } catch {
            toast.error('Failed to update post');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnschedule = async () => {
        setIsUnscheduling(true);
        try {
            await Promise.all(post.ids.map(deleteScheduledPost));
            toast.success('Post unscheduled');
            onUpdated();
            onClose();
        } catch {
            toast.error('Failed to unschedule');
        } finally {
            setIsUnscheduling(false);
        }
    };

    const handleReschedule = async () => {
        try {
            await Promise.all(post.ids.map(id => updateScheduledPost(id, { scheduled_at: scheduledAt.toISOString() })));
            toast.success('Schedule updated');
            setIsEditingTime(false);
            onUpdated();
        } catch {
            toast.error('Failed to update schedule');
        }
    };

    const handleEditInBlog = () => {
        const url = `admin.php?page=repurposa-blogs&post_id=${post.postId}${
            post.schedulableId ? `&short_post_id=${post.schedulableId}` : ''
        }`;
        window.location.href = url;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-semibold text-gray-900">Scheduled Post</h2>
                        <button
                            onClick={onClose}
                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Date/time + platforms */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400" />
                            {isEditingTime ? (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="date"
                                        value={dateValue}
                                        onChange={(e) => {
                                            const [y, m, d] = e.target.value.split('-').map(Number);
                                            const next = new Date(scheduledAt);
                                            next.setFullYear(y, m - 1, d);
                                            setScheduledAt(next);
                                        }}
                                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                                    />
                                    <input
                                        type="time"
                                        value={timeValue}
                                        onChange={(e) => {
                                            const [h, min] = e.target.value.split(':').map(Number);
                                            const next = new Date(scheduledAt);
                                            next.setHours(h, min, 0, 0);
                                            setScheduledAt(next);
                                        }}
                                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                                    />
                                    <button
                                        onClick={handleReschedule}
                                        className="h-5 w-5 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-full"
                                    >
                                        <Check size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditingTime(true)}
                                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <span>
                                        {scheduledAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        {' · '}
                                        {scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                    </span>
                                    <Pencil size={10} className="text-gray-400" />
                                </button>
                            )}
                        </div>

                        <div className="h-4 w-px bg-gray-200" />

                        <div className="flex items-center gap-1.5">
                            {post.platforms.map(platformId => {
                                const p = SCHEDULE_PLATFORMS.find(sp => sp.id === platformId);
                                if (!p) return null;
                                return (
                                    <span
                                        key={p.id}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${p.bg} text-white`}
                                    >
                                        {p.icon}
                                        {p.name}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Body — content preview / editor */}
                <div className="px-5 py-5">
                    {/* Source label */}
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-400">
                            {post.blogTitle ? `From: ${post.blogTitle}` : 'Standalone'}
                        </span>
                    </div>

                    {isEditing ? (
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={8}
                                className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                            />
                            <AITextPopup
                                textareaRef={textareaRef}
                                value={editText}
                                onChange={setEditText}
                            />
                            <div className="flex items-center justify-between mt-2">
                                <span className={`text-[11px] ${editText.length > 280 ? 'text-amber-500' : 'text-gray-300'}`}>
                                    {editText.length} chars
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setIsEditing(false); setEditText(post.content); }}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving || !editText.trim()}
                                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {post.content}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={handleUnschedule}
                        disabled={isUnscheduling}
                        className="px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isUnscheduling ? <Loader2 size={12} className="animate-spin" /> : 'Unschedule'}
                    </button>

                    {!isEditing && (
                        isStandalone ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Pencil size={12} />
                                Edit
                            </button>
                        ) : (
                            <button
                                onClick={handleEditInBlog}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                <Pencil size={12} />
                                Edit in Blog
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
