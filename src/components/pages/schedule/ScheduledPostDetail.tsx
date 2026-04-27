import { useState, useRef } from '@wordpress/element';
import { X, Clock, Pencil, Check, Loader2, FileText, Repeat2, ImagePlus, Share2, AlertTriangle, MessageSquare, Image, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getShortPost, updateShortPost, getThread, updateThread } from '@/services/repurposeApi';
import { deleteScheduledPost, updateScheduledPost } from '@/services/scheduleApi';
import { SCHEDULE_PLATFORMS, PLATFORM_CHAR_LIMITS, getUnsupportedReason, getDateInTz, getTimeInTz, slotToDate } from '@/components/repurpose/modals/schedule-utils';
import { TimezoneLabel } from '@/components/TimezoneLabel';
import type { SchedulePlatform } from '@/components/repurpose/modals/schedule-utils';
import { AITextPopup } from '@/components/AITextPopup';
import ImagePickerModal from '@/components/ImagePickerModal';
import { ImageGrid } from '@/components/repurpose/cards/ImageGrid';
import AutoRepostModal from '@/components/repurpose/modals/SchedulePostModal/AutoRepostModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useExistingRepost } from '@/hooks/useAutoRepost';
import type { RepostPlatform } from '@/hooks/useAutoRepost';

interface ScheduledPostDetailProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    timezone?: string;
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
        hasRepost?: boolean;
    };
}

export default function ScheduledPostDetail({ isOpen, onClose, onUpdated, post, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone }: ScheduledPostDetailProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editType, setEditType] = useState<'short_post' | 'thread'>(post.postType === 'thread' ? 'thread' : 'short_post');
    // Short post edit state
    const [editText, setEditText] = useState(post.content);
    const [editImages, setEditImages] = useState<string[]>([]);
    const [editCta, setEditCta] = useState('');
    const [showCtaField, setShowCtaField] = useState(false);
    const [showEditImagePicker, setShowEditImagePicker] = useState(false);
    // Thread edit state
    const [editThreadPosts, setEditThreadPosts] = useState<string[]>(['']);
    const [editThreadPostImages, setEditThreadPostImages] = useState<Record<number, string[]>>({});
    const [threadImagePickerIdx, setThreadImagePickerIdx] = useState<number | null>(null);
    const editThreadPostRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
    const [isFetchingPost, setIsFetchingPost] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUnscheduling, setIsUnscheduling] = useState(false);
    const [showUnscheduleConfirm, setShowUnscheduleConfirm] = useState(false);
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [scheduledAt, setScheduledAt] = useState(() => new Date(post.scheduledAt));
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const ctaRef = useRef<HTMLTextAreaElement>(null);
    const repost = useExistingRepost({
        scheduledPostIds: post.ids,
        postPlatforms: post.platforms,
        initialHasRepost: post.hasRepost || false,
        isOpen,
        onUpdated,
    });

    if (!isOpen) return null;

    const isStandalone = !post.postId;
    const dateValue = getDateInTz(scheduledAt, timezone);
    const timeValue = getTimeInTz(scheduledAt, timezone);

    const handleStartEdit = async () => {
        if (!post.schedulableId) return;
        setIsFetchingPost(true);
        try {
            if (post.postType === 'thread') {
                const data = await getThread(post.schedulableId);
                setEditThreadPosts([data.hook, ...data.posts.map(p => p.content)]);
                const imgs: Record<number, string[]> = {};
                [data.hook, ...data.posts.map(p => p.content)].forEach((_, i) => {
                    const src = i === 0 ? null : data.posts[i - 1]?.media;
                    if (src && Array.isArray(src) && src.length > 0) {
                        imgs[i] = (src as { url: string }[]).map(m => m.url);
                    }
                });
                setEditThreadPostImages(imgs);
            } else {
                const data = await getShortPost(post.schedulableId);
                setEditImages(data.media?.map(m => m.url) ?? []);
                setEditCta(data.cta_content?.content ?? '');
                setShowCtaField(!!data.cta_content?.content);
            }
        } catch {
            // proceed with empty state if fetch fails
        } finally {
            setIsFetchingPost(false);
        }
        setEditText(post.content);
        setEditType(post.postType === 'thread' ? 'thread' : 'short_post');
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!post.schedulableId) return;
        setIsSaving(true);
        try {
            if (editType === 'thread') {
                const filled = editThreadPosts.filter(p => p.trim());
                if (filled.length < 2) { toast.error('A thread needs at least 2 posts'); setIsSaving(false); return; }
                await updateThread(post.schedulableId, {
                    hook: filled[0],
                    posts: filled.slice(1).map((content, i) => ({
                        content,
                        media: editThreadPostImages[i + 1] ?? [],
                    })),
                });
            } else {
                if (!editText.trim()) { setIsSaving(false); return; }
                await updateShortPost(post.schedulableId, {
                    content: editText.trim(),
                    media: editImages.length > 0 ? editImages : [],
                    cta_content: showCtaField && editCta.trim()
                        ? { content: editCta.trim(), media: null }
                        : null,
                });
            }
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
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]">
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
                                            setScheduledAt(slotToDate(e.target.value, timeValue, timezone));
                                        }}
                                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5"
                                    />
                                    <input
                                        type="time"
                                        value={timeValue}
                                        onChange={(e) => {
                                            setScheduledAt(slotToDate(dateValue, e.target.value, timezone));
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
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => setIsEditingTime(true)}
                                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                                    >
                                        <span>
                                            {scheduledAt.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' })}
                                            {' · '}
                                            {scheduledAt.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                        <Pencil size={10} className="text-gray-400" />
                                    </button>
                                    <TimezoneLabel timezone={timezone} />
                                </div>
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
                            {repost.repostPlatforms.length > 0 && (
                                <button
                                    onClick={repost.openModal}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                        repost.enabled
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                                    }`}
                                >
                                    <Repeat2 size={12} />
                                    Repost
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {repost.showModal && (
                    <AutoRepostModal
                        isOpen
                        publishDate={scheduledAt}
                        intervals={repost.intervals}
                        platforms={repost.repostPlatforms as RepostPlatform[]}
                        availablePlatforms={repost.repostPlatforms as RepostPlatform[]}
                        onSave={repost.save}
                        onClose={repost.closeModal}
                    />
                )}

                {/* Body — content preview / editor */}
                <div className="px-5 py-5 flex-1 overflow-y-auto">
                    {/* Source label */}
                    <div className="flex items-center gap-2 mb-3">
                        <FileText size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-400">
                            {post.blogTitle ? `From: ${post.blogTitle}` : 'Standalone'}
                        </span>
                    </div>

                    {isEditing ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            {/* Type pills */}
                            <div className="flex items-center gap-1.5 mb-4">
                                <button
                                    onClick={() => setEditType('short_post')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        editType === 'short_post' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <FileText size={11} />
                                    Short Post
                                </button>
                                <button
                                    onClick={() => setEditType('thread')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        editType === 'thread' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <MessageSquare size={11} />
                                    Thread
                                </button>
                                <button
                                    disabled
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-100 text-gray-300 cursor-not-allowed"
                                    title="Coming soon"
                                >
                                    <Image size={11} />
                                    Visual
                                    <span className="text-[9px] text-gray-300 ml-0.5">soon</span>
                                </button>
                            </div>

                            {editType === 'thread' ? (
                                /* ===== THREAD COMPOSER ===== */
                                <div>
                                    {editThreadPosts.map((threadPost, idx) => {
                                        const postImages = editThreadPostImages[idx] || [];
                                        const isLast = idx === editThreadPosts.length - 1;
                                        const tl = post.platforms.length > 0
                                            ? Math.min(...post.platforms.map(p => PLATFORM_CHAR_LIMITS[p]))
                                            : 280;
                                        return (
                                        <div key={idx} className="relative pb-4 pl-8 last:pb-0">
                                            {!isLast && (
                                                <div className="absolute top-6 left-2.75 h-[calc(100%-12px)] w-0.5 bg-gray-200" />
                                            )}
                                            <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-500">
                                                {idx + 1}
                                            </div>
                                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                <AITextPopup textareaRef={{ current: editThreadPostRefs.current[idx] }} value={threadPost} onChange={(val) => {
                                                    const updated = [...editThreadPosts];
                                                    updated[idx] = val;
                                                    setEditThreadPosts(updated);
                                                }} />
                                                <textarea
                                                    ref={el => { editThreadPostRefs.current[idx] = el; }}
                                                    value={threadPost}
                                                    onChange={(e) => {
                                                        const updated = [...editThreadPosts];
                                                        updated[idx] = e.target.value;
                                                        setEditThreadPosts(updated);
                                                    }}
                                                    placeholder={idx === 0 ? 'Hook — grab attention...' : `Post ${idx + 1}...`}
                                                    rows={3}
                                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                                    style={{ fieldSizing: 'content', minHeight: '80px' } as React.CSSProperties}
                                                />
                                                {postImages.length > 0 && (
                                                    <div className="mt-2">
                                                        <ImageGrid
                                                            media={postImages}
                                                            onRemove={(i) => setEditThreadPostImages(prev => ({
                                                                ...prev,
                                                                [idx]: (prev[idx] || []).filter((_, imgIdx) => imgIdx !== i),
                                                            }))}
                                                            onReorder={(from, to) => setEditThreadPostImages(prev => {
                                                                const imgs = [...(prev[idx] || [])];
                                                                const [moved] = imgs.splice(from, 1);
                                                                imgs.splice(to, 0, moved);
                                                                return { ...prev, [idx]: imgs };
                                                            })}
                                                            onAddClick={() => setThreadImagePickerIdx(idx)}
                                                        />
                                                    </div>
                                                )}
                                                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                                    <span className={`font-mono text-[10px] ${threadPost.length > tl ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {threadPost.length}/{tl.toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setThreadImagePickerIdx(idx)}
                                                            disabled={postImages.length >= 4}
                                                            className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <ImagePlus size={14} />
                                                        </button>
                                                        {editThreadPosts.length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    setEditThreadPosts(prev => prev.filter((_, i) => i !== idx));
                                                                    setEditThreadPostImages(prev => {
                                                                        const updated: Record<number, string[]> = {};
                                                                        Object.entries(prev).forEach(([key, val]) => {
                                                                            const k = Number(key);
                                                                            if (k < idx) updated[k] = val;
                                                                            else if (k > idx) updated[k - 1] = val;
                                                                        });
                                                                        return updated;
                                                                    });
                                                                }}
                                                                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })}
                                    <div className="pl-8 pt-1 mb-4">
                                        <button
                                            onClick={() => setEditThreadPosts(prev => [...prev, ''])}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Plus size={12} />
                                            Add post
                                        </button>
                                    </div>
                                    <ImagePickerModal
                                        isOpen={threadImagePickerIdx !== null}
                                        onClose={() => setThreadImagePickerIdx(null)}
                                        onSelect={(url) => {
                                            const idx = threadImagePickerIdx!;
                                            setEditThreadPostImages(prev => ({
                                                ...prev,
                                                [idx]: [...(prev[idx] || []), url],
                                            }));
                                            setThreadImagePickerIdx(null);
                                        }}
                                    />
                                </div>
                            ) : (
                            /* ===== SHORT POST COMPOSER ===== */
                            <div>
                            {/* Text */}
                            <div className="mb-3">
                                <AITextPopup textareaRef={textareaRef} value={editText} onChange={setEditText} />
                                <textarea
                                    ref={textareaRef}
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    rows={6}
                                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                    style={{ fieldSizing: 'content', minHeight: '120px' } as React.CSSProperties}
                                />
                            </div>

                            {/* Images */}
                            {editImages.length > 0 && (
                                <ImageGrid
                                    media={editImages}
                                    onRemove={(i) => setEditImages(prev => prev.filter((_, idx) => idx !== i))}
                                    onReorder={(from, to) => {
                                        setEditImages(prev => {
                                            const updated = [...prev];
                                            const [moved] = updated.splice(from, 1);
                                            updated.splice(to, 0, moved);
                                            return updated;
                                        });
                                    }}
                                    onAddClick={() => setShowEditImagePicker(true)}
                                />
                            )}

                            {/* Footer bar */}
                            {(() => {
                                const tightestLimit = post.platforms.length > 0
                                    ? Math.min(...post.platforms.map(p => PLATFORM_CHAR_LIMITS[p]))
                                    : 280;
                                const charError = post.platforms
                                    .map(p => getUnsupportedReason(p, 'short_post', editText.length))
                                    .find(Boolean);
                                return (
                                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-mono text-[10px] ${editText.length > tightestLimit ? 'text-red-500' : 'text-gray-400'}`}>
                                            {editText.length}/{tightestLimit.toLocaleString()}
                                        </span>
                                        {charError && (
                                            <span className="flex items-center gap-1 text-[10px] text-amber-600">
                                                <AlertTriangle size={10} />
                                                {charError}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setShowEditImagePicker(true)}
                                            disabled={editImages.length >= 4}
                                            className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ImagePlus size={14} />
                                        </button>
                                        {!showCtaField && (
                                            <button
                                                onClick={() => setShowCtaField(true)}
                                                className="h-7 flex items-center gap-1 px-2 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xs"
                                            >
                                                <Share2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                );
                            })()}

                            {/* CTA reply */}
                            {showCtaField && (
                                <div className="relative ml-6 mt-3">
                                    <div className="absolute top-0 left-4 h-4 w-0.5 bg-gray-200" style={{ top: '-12px' }} />
                                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                                <Share2 size={12} className="text-gray-400" />
                                                Reply · CTA
                                            </div>
                                            <button
                                                onClick={() => { setShowCtaField(false); setEditCta(''); }}
                                                className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <textarea
                                            ref={ctaRef}
                                            value={editCta}
                                            onChange={(e) => setEditCta(e.target.value)}
                                            placeholder="Read more here..."
                                            rows={2}
                                            autoFocus
                                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                            style={{ fieldSizing: 'content' } as React.CSSProperties}
                                        />
                                        <div className="mt-2">
                                            <span className={`font-mono text-[10px] ${editCta.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {editCta.length}/280
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <ImagePickerModal
                                isOpen={showEditImagePicker}
                                onClose={() => setShowEditImagePicker(false)}
                                onSelect={(url) => {
                                    setEditImages(prev => [...prev, url]);
                                    setShowEditImagePicker(false);
                                }}
                            />
                            </div>
                            )} {/* end short_post / thread conditional */}

                            {/* Save/cancel */}
                            <div className="flex items-center justify-end gap-2 mt-4">
                                <button
                                    onClick={() => { setIsEditing(false); setEditText(post.content); setEditImages([]); setEditCta(''); setShowCtaField(false); setEditThreadPosts(['']); setEditThreadPostImages({}); }}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                                </button>
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
                        onClick={() => setShowUnscheduleConfirm(true)}
                        disabled={isUnscheduling}
                        className="px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isUnscheduling ? <Loader2 size={12} className="animate-spin" /> : 'Unschedule'}
                    </button>

                    {!isEditing && (
                        isStandalone ? (
                            <button
                                onClick={handleStartEdit}
                                disabled={isFetchingPost}
                                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60"
                            >
                                {isFetchingPost ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
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

        <ConfirmModal
            isOpen={showUnscheduleConfirm}
            title="Unschedule Post"
            description="Remove this post from the queue? It won't be deleted — you can reschedule it anytime."
            confirmLabel="Unschedule"
            variant="warning"
            isLoading={isUnscheduling}
            onConfirm={handleUnschedule}
            onCancel={() => setShowUnscheduleConfirm(false)}
        />
        </>
    );
}
