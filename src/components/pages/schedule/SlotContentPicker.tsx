import { useState, useEffect, useRef } from '@wordpress/element';
import { X, ChevronDown, ChevronRight, ChevronLeft, FileText, MessageSquare, Image, Loader2, Clock, Pencil, Check, Plus, Repeat2, ImagePlus, Share2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getBlogs } from '@/services/blogApi';
import { getShortPosts, getThreads, getVisuals, createStandaloneShortPost, createStandaloneThread } from '@/services/repurposeApi';
import { getSocialAccounts } from '@/services/profileApi';
import { createScheduledPost, publishNow } from '@/services/scheduleApi';
import { SCHEDULE_PLATFORMS, UI_TO_API_PLATFORM, PLATFORM_CHAR_LIMITS, getUnsupportedReason, getDateInTz, getTimeInTz, slotToDate } from '@/components/repurpose/modals/schedule-utils';
import { TimezoneLabel } from '@/components/TimezoneLabel';
import type { SchedulePlatform } from '@/components/repurpose/modals/schedule-utils';
import { GRADIENT_PRESETS } from '@/components/repurpose/modals/VisualPreviewModal';
import { AITextPopup } from '@/components/AITextPopup';
import ImagePickerModal from '@/components/ImagePickerModal';
import { ImageGrid } from '@/components/repurpose/cards/ImageGrid';
import AutoRepostModal from '@/components/repurpose/modals/SchedulePostModal/AutoRepostModal';
import { useAutoRepost } from '@/hooks/useAutoRepost';
import type { BlogPost, ShortPost, ThreadItem, Visual, SocialAccount, MediaItem } from '@/types';

// ============================================
// HELPER COMPONENTS
// ============================================

function ScheduleBadge() {
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-600 rounded shrink-0">
            <Clock size={10} />
            Scheduled
        </span>
    );
}

function MiniVisualPreview({ visual }: { visual: Visual }) {
    const firstSlide = Array.isArray(visual.content) ? visual.content[0] : visual.content;
    const slideCount = Array.isArray(visual.content) ? visual.content.length : 1;
    const isDark = visual.settings.theme === 'dark';
    const gradient = GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0];
    const gradientClass = isDark ? gradient.dark : gradient.light;

    return (
        <div className={`w-12 h-12 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-1 relative`}>
            <p className={`text-[4px] leading-tight line-clamp-3 text-center ${isDark ? 'text-white/90' : 'text-gray-900/80'}`}>
                {firstSlide}
            </p>
            {slideCount > 1 && (
                <span className={`absolute bottom-0.5 right-0.5 text-[6px] font-bold ${isDark ? 'text-white/60' : 'text-gray-900/40'}`}>
                    1/{slideCount}
                </span>
            )}
        </div>
    );
}

function ThreadChain({ thread }: { thread: ThreadItem }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div>
            <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
            >
                <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                {thread.posts.length} posts in thread
            </button>
            {isExpanded && (
                <div className="mt-2 ml-2 border-l-2 border-gray-100 pl-3 space-y-2">
                    {thread.posts.map((post, i) => (
                        <div key={i} className="relative">
                            <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-gray-200" />
                            <p className="text-xs text-gray-500 line-clamp-2">{post.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// BLOG CONTENT (per-type counts + loaded items)
// ============================================

interface BlogContent {
    shortPosts: ShortPost[];
    threads: ThreadItem[];
    visuals: Visual[];
    loaded: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================

interface SlotContentPickerProps {
    isOpen: boolean;
    slotDate: Date;
    slotPlatforms: SchedulePlatform[];
    timezone?: string;
    onClose: () => void;
    onScheduled: () => void;
    initialDraftContent?: string;
    initialThreadDraft?: { hook: string; posts: string[] };
}

export default function SlotContentPicker({ isOpen, slotDate, slotPlatforms, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, onClose, onScheduled, initialDraftContent, initialThreadDraft }: SlotContentPickerProps) {
    const [scheduledAt, setScheduledAt] = useState<Date>(slotDate);
    const [platforms, setPlatforms] = useState<SchedulePlatform[]>(slotPlatforms);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [isEditingTime, setIsEditingTime] = useState(false);

    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [isLoadingBlogs, setIsLoadingBlogs] = useState(false);
    const [expandedBlogId, setExpandedBlogId] = useState<number | null>(null);
    const [blogContent, setBlogContent] = useState<Record<number, BlogContent>>({});
    const [loadingBlogId, setLoadingBlogId] = useState<number | null>(null);
    const [isScheduling, setIsScheduling] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [schedulingItemId, setSchedulingItemId] = useState<string | null>(null);
    const [blogContentTab, setBlogContentTab] = useState<Record<number, 'short_post' | 'thread' | 'visual'>>({});
    const [contentPage, setContentPage] = useState<Record<string, number>>({});

    // Create new state
    const [view, setView] = useState<'list' | 'create'>('list');
    const [createType, setCreateType] = useState<'short_post' | 'thread' | 'visual'>('short_post');
    const [createText, setCreateText] = useState('');
    const createTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [threadPosts, setThreadPosts] = useState<string[]>(['']);
    const threadPostRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

    // Media & CTA for short post composer
    const [createMedia, setCreateMedia] = useState<MediaItem[]>([]);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [createCta, setCreateCta] = useState('');
    const [showCtaField, setShowCtaField] = useState(false);
    const createCtaRef = useRef<HTMLTextAreaElement>(null);

    // Images for thread posts (per-post)
    const [threadPostImages, setThreadPostImages] = useState<Record<number, MediaItem[]>>({});
    const [threadImagePickerIdx, setThreadImagePickerIdx] = useState<number | null>(null);

    // Auto-repost
    const repost = useAutoRepost(socialAccounts, platforms);

    // Reset state when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setScheduledAt(slotDate);
        setPlatforms(slotPlatforms);
        setIsEditingTime(false);
        setIsScheduling(false);
        setIsPublishing(false);
        setSchedulingItemId(null);
        setExpandedBlogId(null);
        setBlogContent({});
        setView(initialDraftContent || initialThreadDraft ? 'create' : 'list');
        setCreateType(initialThreadDraft ? 'thread' : 'short_post');
        setCreateText(initialDraftContent || '');
        setThreadPosts(initialThreadDraft ? [initialThreadDraft.hook, ...initialThreadDraft.posts] : ['']);
        setCreateMedia([]);
        setShowMediaPicker(false);
        setCreateCta('');
        setShowCtaField(false);
        setThreadPostImages({});
        setThreadImagePickerIdx(null);
        repost.reset();

        setIsLoadingBlogs(true);
        Promise.all([
            getSocialAccounts(),
            getBlogs(),
        ]).then(([accounts, blogsData]) => {
            setSocialAccounts(accounts);
            setBlogs(blogsData.filter(b => b.status !== 'generating' && b.status !== 'failed'));
        }).catch(() => {
            toast.error('Failed to load data');
        }).finally(() => {
            setIsLoadingBlogs(false);
        });
    }, [isOpen]);

    const connectedPlatforms = SCHEDULE_PLATFORMS.filter(p =>
        socialAccounts.some(a => a.platform === UI_TO_API_PLATFORM[p.id])
    );

    const togglePlatform = (id: SchedulePlatform) => {
        setPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleBlog = async (blogId: number) => {
        if (expandedBlogId === blogId) {
            setExpandedBlogId(null);
            return;
        }
        setExpandedBlogId(blogId);

        // Load content if not yet loaded
        if (!blogContent[blogId]?.loaded) {
            setLoadingBlogId(blogId);
            try {
                const [shortPosts, threads, visuals] = await Promise.all([
                    getShortPosts(blogId),
                    getThreads(blogId),
                    getVisuals(blogId),
                ]);
                setBlogContent(prev => ({
                    ...prev,
                    [blogId]: { shortPosts, threads, visuals, loaded: true },
                }));
            } catch {
                toast.error('Failed to load content');
            } finally {
                setLoadingBlogId(null);
            }
        }
    };

    const scheduleContent = async (contentId: number, contentType: 'short_post' | 'thread' | 'visual', blogId: number) => {
        if (platforms.length === 0) {
            toast.error('Select at least one platform');
            return;
        }
        const itemKey = `${contentType}-${contentId}`;
        setIsScheduling(true);
        setSchedulingItemId(itemKey);
        try {
            const isoDate = scheduledAt.toISOString();
            const promises = platforms.map(platformId => {
                const apiPlatform = UI_TO_API_PLATFORM[platformId];
                const account = socialAccounts.find(a => a.platform === apiPlatform);
                if (!account) return Promise.resolve(null);
                return createScheduledPost({
                    social_account_id: account.id,
                    scheduled_at: isoDate,
                    schedulable_type: contentType,
                    schedulable_id: contentId,
                    post_id: blogId,
                });
            });
            const results = (await Promise.all(promises)).filter(Boolean);

            // Create repost schedules for repostable platforms
            await repost.createSchedules(results.filter(Boolean).map(r => ({ id: r!.id, platform: r!.platform })));

            const platformNames = platforms
                .map(id => SCHEDULE_PLATFORMS.find(p => p.id === id)?.name)
                .filter(Boolean)
                .join(', ');
            const formattedTime = scheduledAt.toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
            });
            toast.success('Post scheduled!', { description: `${platformNames} · ${formattedTime}` });
            onScheduled();
            onClose();
        } catch {
            toast.error('Failed to schedule post');
        } finally {
            setIsScheduling(false);
            setSchedulingItemId(null);
        }
    };

    const isScheduled = (scheduledPosts?: { status: string }[]) => {
        return scheduledPosts?.some(sp => sp.status === 'pending' || sp.status === 'publishing' || sp.status === 'published');
    };

    if (!isOpen) return null;

    const dateValue = getDateInTz(scheduledAt, timezone);
    const timeValue = getTimeInTz(scheduledAt, timezone);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {view === 'create' && (
                                <button
                                    onClick={() => setView('list')}
                                    className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <ChevronRight size={16} className="rotate-180" />
                                </button>
                            )}
                            <h2 className="text-base font-semibold text-gray-900">
                                {view === 'create' ? 'Create New' : 'Schedule Content'}
                            </h2>
                        </div>
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
                                        onClick={() => setIsEditingTime(false)}
                                        className="h-5 w-5 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-full"
                                    >
                                        <Check size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => setIsEditingTime(true)}
                                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                    >
                                        <span>
                                            {scheduledAt.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' })}
                                            {' · '}
                                            {scheduledAt.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </span>
                                        <Pencil size={10} className="text-gray-400 shrink-0" />
                                    </button>
                                    <TimezoneLabel timezone={timezone} />
                                </div>
                            )}
                        </div>

                        <div className="h-4 w-px bg-gray-200" />

                        <div className="flex items-center gap-1.5">
                            {connectedPlatforms.map(p => {
                                const active = platforms.includes(p.id);
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => togglePlatform(p.id)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                            active
                                                ? `${p.bg} text-white`
                                                : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        {p.icon}
                                        {p.name}
                                    </button>
                                );
                            })}
                            {connectedPlatforms.length === 0 && (
                                <span className="text-xs text-gray-400">No connected accounts</span>
                            )}
                        </div>

                        {platforms.some(p => p === 'x' || p === 'threads') && (
                            <>
                                <div className="h-4 w-px bg-gray-200" />
                                <button
                                    onClick={() => repost.toggle()}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                                        repost.enabled
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                                    }`}
                                >
                                    <Repeat2 size={12} />
                                    RT
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {view === 'create' ? (
                        /* ===== CREATE NEW VIEW ===== */
                        <div className="px-5 py-5 space-y-4">
                            {/* Type pills */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCreateType('short_post')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        createType === 'short_post'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <FileText size={11} />
                                    Short Post
                                </button>
                                <button
                                    onClick={() => setCreateType('thread')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        createType === 'thread'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
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

                            {/* Short Post Composer */}
                            {createType === 'short_post' && (
                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    {/* Content */}
                                    <div className="mb-3">
                                        <AITextPopup textareaRef={createTextareaRef} value={createText} onChange={setCreateText} />
                                        <textarea
                                            ref={createTextareaRef}
                                            value={createText}
                                            onChange={(e) => setCreateText(e.target.value)}
                                            placeholder="Write your post..."
                                            rows={5}
                                            autoFocus
                                            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                            style={{ fieldSizing: 'content', minHeight: '120px' } as React.CSSProperties}
                                        />
                                    </div>

                                    {/* Media Grid */}
                                    {createMedia.length > 0 && (
                                        <ImageGrid
                                            media={createMedia}
                                            onRemove={(i) => setCreateMedia(prev => prev.filter((_, idx) => idx !== i))}
                                            onReorder={(from, to) => {
                                                setCreateMedia(prev => {
                                                    const updated = [...prev];
                                                    const [moved] = updated.splice(from, 1);
                                                    updated.splice(to, 0, moved);
                                                    return updated;
                                                });
                                            }}
                                            onAddClick={() => setShowMediaPicker(true)}
                                        />
                                    )}

                                    {/* Footer */}
                                    {(() => {
                                        const tightestLimit = platforms.length > 0
                                            ? Math.min(...platforms.map(p => PLATFORM_CHAR_LIMITS[p]))
                                            : 280;
                                        const charError = platforms
                                            .map(p => getUnsupportedReason(p, 'short_post', createText.length))
                                            .find(Boolean);
                                        return (
                                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono text-[10px] ${createText.length > tightestLimit ? 'text-red-500' : 'text-gray-400'}`}>
                                                {createText.length}/{tightestLimit.toLocaleString()}
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
                                                onClick={() => setShowMediaPicker(true)}
                                                disabled={createMedia.length >= 4}
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

                                    {/* CTA Reply */}
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
                                                        onClick={() => { setShowCtaField(false); setCreateCta(''); }}
                                                        className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                                <textarea
                                                    ref={createCtaRef}
                                                    value={createCta}
                                                    onChange={(e) => setCreateCta(e.target.value)}
                                                    placeholder="Read more here..."
                                                    rows={2}
                                                    autoFocus
                                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                                                />
                                                <div className="mt-2 flex items-center">
                                                    <span className={`font-mono text-[10px] ${createCta.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {createCta.length}/280
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Create & Schedule / Publish Now */}
                                    {(() => {
                                        const spError = platforms.map(p => getUnsupportedReason(p, 'short_post', createText.length, null, socialAccounts)).find(Boolean);
                                        const accountIds = platforms
                                            .map(platformId => {
                                                const apiPlatform = UI_TO_API_PLATFORM[platformId];
                                                return socialAccounts.find(a => a.platform === apiPlatform)?.id;
                                            })
                                            .filter((id): id is number => id !== undefined);
                                        return (
                                    <div className="mt-4 flex items-center justify-between">
                                        <button
                                            disabled={!createText.trim() || isPublishing || isScheduling || platforms.length === 0 || !!spError}
                                            onClick={async () => {
                                                if (platforms.length === 0) {
                                                    toast.error('Select at least one platform');
                                                    return;
                                                }
                                                setIsPublishing(true);
                                                try {
                                                    const result = await createStandaloneShortPost({
                                                        content: createText.trim(),
                                                        media: createMedia.length > 0 ? createMedia.map(m => m.url) : undefined,
                                                    });
                                                    await publishNow({
                                                        social_account_ids: accountIds,
                                                        schedulable_type: 'short_post',
                                                        schedulable_id: result.short_post.id,
                                                    });
                                                    const platformNames = platforms.map(id => SCHEDULE_PLATFORMS.find(p => p.id === id)?.name).filter(Boolean).join(', ');
                                                    toast.success('Post published!', { description: platformNames });
                                                    onScheduled();
                                                    onClose();
                                                } catch {
                                                    toast.error('Failed to publish post');
                                                } finally {
                                                    setIsPublishing(false);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isPublishing ? <Loader2 size={12} className="animate-spin" /> : 'Publish Now'}
                                        </button>
                                        <button
                                            disabled={!createText.trim() || isScheduling || isPublishing || platforms.length === 0 || !!spError}
                                            onClick={async () => {
                                                if (platforms.length === 0) {
                                                    toast.error('Select at least one platform');
                                                    return;
                                                }
                                                setIsScheduling(true);
                                                try {
                                                    const result = await createStandaloneShortPost({
                                                        content: createText.trim(),
                                                        media: createMedia.length > 0 ? createMedia.map(m => m.url) : undefined,
                                                        social_account_ids: accountIds,
                                                        scheduled_at: scheduledAt.toISOString(),
                                                    });

                                                    // Create repost schedules if enabled
                                                    if (result.scheduled_posts?.length) {
                                                        await repost.createSchedules(result.scheduled_posts.map(sp => ({ id: sp.id, platform: sp.platform })));
                                                    }

                                                    const platformNames = platforms
                                                        .map(id => SCHEDULE_PLATFORMS.find(p => p.id === id)?.name)
                                                        .filter(Boolean)
                                                        .join(', ');
                                                    const formattedTime = scheduledAt.toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                                    });
                                                    toast.success('Post created & scheduled!', { description: `${platformNames} · ${formattedTime}` });
                                                    onScheduled();
                                                    onClose();
                                                } catch {
                                                    toast.error('Failed to create & schedule post');
                                                } finally {
                                                    setIsScheduling(false);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Create & Schedule'}
                                        </button>
                                    </div>
                                        );
                                    })()}

                                    <ImagePickerModal
                                        isOpen={showMediaPicker}
                                        onClose={() => setShowMediaPicker(false)}
                                        onSelect={(url, type, mime) => {
                                            setCreateMedia(prev => [...prev, { url, type, mime }]);
                                            setShowMediaPicker(false);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Thread Composer */}
                            {createType === 'thread' && (
                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    {threadPosts.map((post, idx) => {
                                        const postImages = threadPostImages[idx] || [];
                                        const isLast = idx === threadPosts.length - 1;
                                        return (
                                        <div key={idx} className="relative pb-4 pl-8 last:pb-0">
                                            {/* Thread line */}
                                            {!isLast && (
                                                <div className="absolute top-6 left-2.75 h-[calc(100%-12px)] w-0.5 bg-gray-200" />
                                            )}
                                            {/* Number dot */}
                                            <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-500">
                                                {idx + 1}
                                            </div>
                                            {/* Content */}
                                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                <AITextPopup textareaRef={{ current: threadPostRefs.current[idx] }} value={post} onChange={(val) => {
                                                    const updated = [...threadPosts];
                                                    updated[idx] = val;
                                                    setThreadPosts(updated);
                                                }} />
                                                <textarea
                                                    ref={el => { threadPostRefs.current[idx] = el; }}
                                                    value={post}
                                                    onChange={(e) => {
                                                        const updated = [...threadPosts];
                                                        updated[idx] = e.target.value;
                                                        setThreadPosts(updated);
                                                    }}
                                                    placeholder={idx === 0 ? 'Hook — grab attention...' : `Post ${idx + 1}...`}
                                                    rows={3}
                                                    autoFocus={idx === threadPosts.length - 1}
                                                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                                    style={{ fieldSizing: 'content', minHeight: '80px' } as React.CSSProperties}
                                                />
                                                {/* Per-post images */}
                                                {postImages.length > 0 && (
                                                    <div className="mt-2">
                                                        <ImageGrid
                                                            media={postImages}
                                                            onRemove={(i) => setThreadPostImages(prev => ({
                                                                ...prev,
                                                                [idx]: (prev[idx] || []).filter((_, imgIdx) => imgIdx !== i),
                                                            }))}
                                                            onReorder={(from, to) => setThreadPostImages(prev => {
                                                                const imgs = [...(prev[idx] || [])];
                                                                const [moved] = imgs.splice(from, 1);
                                                                imgs.splice(to, 0, moved);
                                                                return { ...prev, [idx]: imgs };
                                                            })}
                                                            onAddClick={() => setThreadImagePickerIdx(idx)}
                                                        />
                                                    </div>
                                                )}
                                                {/* Per-post footer */}
                                                {(() => {
                                                    const tl = platforms.length > 0
                                                        ? Math.min(...platforms.map(p => PLATFORM_CHAR_LIMITS[p]))
                                                        : 280;
                                                    return (
                                                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                                    <span className={`font-mono text-[10px] ${post.length > tl ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {post.length}/{tl.toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setThreadImagePickerIdx(idx)}
                                                            disabled={postImages.length >= 4}
                                                            className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <ImagePlus size={14} />
                                                        </button>
                                                        {threadPosts.length > 1 && (
                                                            <button
                                                                onClick={() => {
                                                                    setThreadPosts(prev => prev.filter((_, i) => i !== idx));
                                                                    setThreadPostImages(prev => {
                                                                        const updated: Record<number, MediaItem[]> = {};
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
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        );
                                    })}

                                    {/* Add post button */}
                                    <div className="pl-8 pt-1">
                                        <button
                                            onClick={() => setThreadPosts(prev => [...prev, ''])}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Plus size={12} />
                                            Add post
                                        </button>
                                    </div>

                                    {/* Create & Schedule / Publish Now */}
                                    {(() => {
                                        const threadError = platforms.map(p => getUnsupportedReason(p, 'thread', undefined, threadPosts.filter(t => t.trim()), socialAccounts)).find(Boolean);
                                        const filledPosts = threadPosts.filter(p => p.trim());
                                        const isDisabled = !threadPosts[0]?.trim() || filledPosts.length < 2 || platforms.length === 0 || !!threadError;
                                        const accountIds = platforms
                                            .map(platformId => {
                                                const apiPlatform = UI_TO_API_PLATFORM[platformId];
                                                return socialAccounts.find(a => a.platform === apiPlatform)?.id;
                                            })
                                            .filter((id): id is number => id !== undefined);
                                        return (
                                    <>
                                    {threadError && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mt-2 pl-8">
                                            <AlertTriangle size={10} className="shrink-0" />
                                            {threadError}
                                        </div>
                                    )}
                                    <div className="mt-4 flex items-center justify-between">
                                        <button
                                            disabled={isDisabled || isPublishing || isScheduling}
                                            onClick={async () => {
                                                if (platforms.length === 0) {
                                                    toast.error('Select at least one platform');
                                                    return;
                                                }
                                                if (filledPosts.length < 2) {
                                                    toast.error('A thread needs at least 2 posts');
                                                    return;
                                                }
                                                setIsPublishing(true);
                                                try {
                                                    const result = await createStandaloneThread({
                                                        hook: filledPosts[0],
                                                        posts: filledPosts.slice(1).map((content, i) => ({
                                                            content,
                                                            media: threadPostImages[i + 1]?.length > 0 ? threadPostImages[i + 1].map(m => m.url) : null,
                                                        })),
                                                    });
                                                    await publishNow({
                                                        social_account_ids: accountIds,
                                                        schedulable_type: 'thread',
                                                        schedulable_id: result.thread.id,
                                                    });
                                                    const platformNames = platforms.map(id => SCHEDULE_PLATFORMS.find(p => p.id === id)?.name).filter(Boolean).join(', ');
                                                    toast.success('Thread published!', { description: platformNames });
                                                    onScheduled();
                                                    onClose();
                                                } catch {
                                                    toast.error('Failed to publish thread');
                                                } finally {
                                                    setIsPublishing(false);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isPublishing ? <Loader2 size={12} className="animate-spin" /> : 'Publish Now'}
                                        </button>
                                        <button
                                            disabled={isDisabled || isScheduling || isPublishing}
                                            onClick={async () => {
                                                if (platforms.length === 0) {
                                                    toast.error('Select at least one platform');
                                                    return;
                                                }
                                                if (filledPosts.length < 2) {
                                                    toast.error('A thread needs at least 2 posts');
                                                    return;
                                                }
                                                setIsScheduling(true);
                                                try {
                                                    const result = await createStandaloneThread({
                                                        hook: filledPosts[0],
                                                        posts: filledPosts.slice(1).map((content, i) => ({
                                                            content,
                                                            media: threadPostImages[i + 1]?.length > 0 ? threadPostImages[i + 1].map(m => m.url) : null,
                                                        })),
                                                        social_account_ids: accountIds,
                                                        scheduled_at: scheduledAt.toISOString(),
                                                    });

                                                    // Create repost schedules if enabled
                                                    if (result.scheduled_posts?.length) {
                                                        await repost.createSchedules(result.scheduled_posts.map(sp => ({ id: sp.id, platform: sp.platform })));
                                                    }

                                                    const platformNames = platforms
                                                        .map(id => SCHEDULE_PLATFORMS.find(p => p.id === id)?.name)
                                                        .filter(Boolean)
                                                        .join(', ');
                                                    const formattedTime = scheduledAt.toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                                    });
                                                    toast.success('Thread created & scheduled!', { description: `${platformNames} · ${formattedTime}` });
                                                    onScheduled();
                                                    onClose();
                                                } catch {
                                                    toast.error('Failed to create & schedule thread');
                                                } finally {
                                                    setIsScheduling(false);
                                                }
                                            }}
                                            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Create & Schedule'}
                                        </button>
                                    </div>
                                    </>
                                        );
                                    })()}

                                    <ImagePickerModal
                                        isOpen={threadImagePickerIdx !== null}
                                        onClose={() => setThreadImagePickerIdx(null)}
                                        onSelect={(url, type, mime) => {
                                            const idx = threadImagePickerIdx!;
                                            setThreadPostImages(prev => ({
                                                ...prev,
                                                [idx]: [...(prev[idx] || []), { url, type, mime }],
                                            }));
                                            setThreadImagePickerIdx(null);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ===== LIST VIEW ===== */
                        <>
                    {/* Create new row */}
                    <div className="border-b border-gray-100">
                        <button
                            onClick={() => setView('create')}
                            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                        >
                            <div className="w-9 h-9 rounded-lg bg-blue-50 shrink-0 flex items-center justify-center">
                                <Plus size={16} className="text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-blue-600">Create new</p>
                                <p className="text-[10px] text-gray-400">Write and schedule a new post</p>
                            </div>
                            <ChevronRight size={14} className="text-gray-300 shrink-0" />
                        </button>
                    </div>

                    {/* Blog accordion list */}
                    {isLoadingBlogs ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-gray-300" />
                        </div>
                    ) : blogs.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-16">No blogs found. Create a blog first.</p>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {blogs.map(blog => {
                                const isExpanded = expandedBlogId === blog.id;
                                const content = blogContent[blog.id];
                                const isLoadingContent = loadingBlogId === blog.id;
                                const shortCount = blog.short_posts?.length || 0;
                                const threadCount = blog.threads?.length || 0;
                                const visualCount = blog.visuals?.length || 0;
                                const totalCount = shortCount + threadCount + visualCount;

                                return (
                                    <div key={blog.id}>
                                        {/* Blog row */}
                                        <button
                                            onClick={() => toggleBlog(blog.id)}
                                            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                                        >
                                            <ChevronRight size={14} className={`text-gray-300 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                                            {blog.thumbnail ? (
                                                <img src={blog.thumbnail} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                                                    <FileText size={14} className="text-gray-300" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 line-clamp-1">{blog.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {shortCount > 0 && (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                                            <FileText size={9} /> {shortCount}
                                                        </span>
                                                    )}
                                                    {threadCount > 0 && (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                                            <MessageSquare size={9} /> {threadCount}
                                                        </span>
                                                    )}
                                                    {visualCount > 0 && (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                                                            <Image size={9} /> {visualCount}
                                                        </span>
                                                    )}
                                                    {totalCount === 0 && (
                                                        <span className="text-[10px] text-gray-300">No content yet</span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded content */}
                                        {isExpanded && (
                                            <div className="bg-gray-50/60 border-t border-gray-100">
                                                {isLoadingContent ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 size={18} className="animate-spin text-gray-300" />
                                                    </div>
                                                ) : content?.loaded ? (() => {
                                                    const activeTab = blogContentTab[blog.id] || 'short_post';
                                                    const tabs: { id: 'short_post' | 'thread' | 'visual'; label: string; icon: React.ReactNode; count: number }[] = [
                                                        { id: 'short_post', label: 'Short Posts', icon: <FileText size={11} />, count: content.shortPosts.length },
                                                        { id: 'thread', label: 'Threads', icon: <MessageSquare size={11} />, count: content.threads.length },
                                                        { id: 'visual', label: 'Visuals', icon: <Image size={11} />, count: content.visuals.length },
                                                    ];

                                                    const PER_PAGE = 3;
                                                    const pageKey = `${blog.id}-${activeTab}`;
                                                    const page = contentPage[pageKey] || 0;

                                                    const allItems = activeTab === 'short_post' ? content.shortPosts
                                                        : activeTab === 'thread' ? content.threads
                                                        : content.visuals;
                                                    const totalPages = Math.ceil(allItems.length / PER_PAGE);
                                                    const pagedItems = allItems.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

                                                    return (
                                                    <div className="px-5 py-3 space-y-3">
                                                        {/* Tabs */}
                                                        <div className="flex items-center gap-1.5">
                                                            {tabs.map(tab => (
                                                                <button
                                                                    key={tab.id}
                                                                    onClick={() => {
                                                                        setBlogContentTab(prev => ({ ...prev, [blog.id]: tab.id }));
                                                                        setContentPage(prev => ({ ...prev, [`${blog.id}-${tab.id}`]: 0 }));
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                                        activeTab === tab.id
                                                                            ? 'bg-gray-900 text-white'
                                                                            : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    {tab.icon}
                                                                    {tab.label}
                                                                    <span className={`text-[10px] ${activeTab === tab.id ? 'text-gray-400' : 'text-gray-300'}`}>{tab.count}</span>
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Tab content */}
                                                        <div className="space-y-1.5">
                                                            {allItems.length === 0 ? (
                                                                <p className="text-xs text-gray-400 text-center py-6">
                                                                    No {activeTab === 'short_post' ? 'short posts' : activeTab === 'thread' ? 'threads' : 'visuals'} yet.
                                                                </p>
                                                            ) : (
                                                                <>
                                                                {pagedItems.map((item: ShortPost | ThreadItem | Visual) => {
                                                                    if (activeTab === 'short_post') {
                                                                        const post = item as ShortPost;
                                                                        const scheduled = isScheduled(post.scheduled_posts);
                                                                        const itemKey = `short_post-${post.id}`;
                                                                        return (
                                                                            <div key={post.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-gray-100">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs text-gray-700 line-clamp-3 whitespace-pre-line">{post.content}</p>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        {scheduled && <ScheduleBadge />}
                                                                                        <span className="text-[10px] text-gray-300">{post.content.length} chars</span>
                                                                                    </div>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => scheduleContent(post.id, 'short_post', blog.id)}
                                                                                    disabled={isScheduling}
                                                                                    className="shrink-0 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                                                                                >
                                                                                    {schedulingItemId === itemKey ? <Loader2 size={11} className="animate-spin" /> : 'Schedule'}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (activeTab === 'thread') {
                                                                        const thread = item as ThreadItem;
                                                                        const scheduled = isScheduled(thread.scheduled_posts);
                                                                        const itemKey = `thread-${thread.id}`;
                                                                        return (
                                                                            <div key={thread.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-gray-100">
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-xs text-gray-700 line-clamp-2 whitespace-pre-line">{thread.hook}</p>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        {scheduled && <ScheduleBadge />}
                                                                                    </div>
                                                                                    <ThreadChain thread={thread} />
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => scheduleContent(thread.id, 'thread', blog.id)}
                                                                                    disabled={isScheduling}
                                                                                    className="shrink-0 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                                                                                >
                                                                                    {schedulingItemId === itemKey ? <Loader2 size={11} className="animate-spin" /> : 'Schedule'}
                                                                                </button>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    const visual = item as Visual;
                                                                    const scheduled = isScheduled(visual.scheduled_posts);
                                                                    const itemKey = `visual-${visual.id}`;
                                                                    return (
                                                                        <div key={visual.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-gray-100">
                                                                            <MiniVisualPreview visual={visual} />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs text-gray-700 line-clamp-2 whitespace-pre-line">
                                                                                    {Array.isArray(visual.content) ? visual.content[0] : visual.content}
                                                                                </p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    {scheduled && <ScheduleBadge />}
                                                                                    <span className="text-[10px] text-gray-300">
                                                                                        {Array.isArray(visual.content) ? `${visual.content.length} slides` : '1 slide'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => scheduleContent(visual.id, 'visual', blog.id)}
                                                                                disabled={isScheduling}
                                                                                className="shrink-0 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                                                                            >
                                                                                {schedulingItemId === itemKey ? <Loader2 size={11} className="animate-spin" /> : 'Schedule'}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}

                                                                {/* Pagination */}
                                                                {totalPages > 1 && (
                                                                    <div className="flex items-center justify-between pt-2">
                                                                        <button
                                                                            onClick={() => setContentPage(prev => ({ ...prev, [pageKey]: page - 1 }))}
                                                                            disabled={page === 0}
                                                                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                        >
                                                                            <ChevronLeft size={12} /> Prev
                                                                        </button>
                                                                        <span className="text-[10px] text-gray-300">
                                                                            {page + 1} / {totalPages}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => setContentPage(prev => ({ ...prev, [pageKey]: page + 1 }))}
                                                                            disabled={page >= totalPages - 1}
                                                                            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                        >
                                                                            Next <ChevronRight size={12} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    );
                                                })() : null}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                        </>
                    )}
                </div>
            </div>

            {repost.showModal && <AutoRepostModal
                isOpen
                publishDate={scheduledAt}
                intervals={repost.intervals}
                platforms={repost.platforms}
                availablePlatforms={repost.availablePlatforms}
                onSave={repost.save}
                onClose={repost.closeModal}
            />}
        </div>
    );
}

