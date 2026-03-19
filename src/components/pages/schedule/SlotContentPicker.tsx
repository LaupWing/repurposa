import { useState, useEffect, useRef } from '@wordpress/element';
import { X, ChevronDown, ChevronRight, ChevronLeft, FileText, MessageSquare, Image, Loader2, Clock, Pencil, Check, Plus, Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { getBlogs } from '@/services/blogApi';
import { getShortPosts, getThreads, getVisuals, createStandaloneShortPost } from '@/services/repurposeApi';
import { getSocialAccounts } from '@/services/profileApi';
import { createScheduledPost } from '@/services/scheduleApi';
import { SCHEDULE_PLATFORMS, UI_TO_API_PLATFORM } from '@/components/repurpose/modals/schedule-utils';
import type { SchedulePlatform } from '@/components/repurpose/modals/schedule-utils';
import { GRADIENT_PRESETS } from '@/components/repurpose/modals/VisualPreviewModal';
import { AITextPopup } from '@/components/AITextPopup';
import AutoRepostModal from '@/components/repurpose/modals/SchedulePostModal/AutoRepostModal';
import { useAutoRepost } from '@/hooks/useAutoRepost';
import type { BlogPost, ShortPost, ThreadItem, Visual, SocialAccount } from '@/types';

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
    onClose: () => void;
    onScheduled: () => void;
}

export default function SlotContentPicker({ isOpen, slotDate, slotPlatforms, onClose, onScheduled }: SlotContentPickerProps) {
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
    const [schedulingItemId, setSchedulingItemId] = useState<string | null>(null);
    const [blogContentTab, setBlogContentTab] = useState<Record<number, 'short_post' | 'thread' | 'visual'>>({});
    const [contentPage, setContentPage] = useState<Record<string, number>>({});

    // Create new state
    const [view, setView] = useState<'list' | 'create'>('list');
    const [createType, setCreateType] = useState<'short_post' | 'thread' | 'visual'>('short_post');
    const [createText, setCreateText] = useState('');
    const createTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-repost
    const repost = useAutoRepost(socialAccounts);

    // Reset state when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setScheduledAt(slotDate);
        setPlatforms(slotPlatforms);
        setIsEditingTime(false);
        setIsScheduling(false);
        setSchedulingItemId(null);
        setExpandedBlogId(null);
        setBlogContent({});
        setView('list');
        setCreateType('short_post');
        setCreateText('');
        setAutoRepost(false);
        setRepostIntervals([]);
        setRepostPlatforms([]);
        setShowRepostModal(false);

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

    const dateValue = scheduledAt.toISOString().split('T')[0];
    const timeValue = scheduledAt.toTimeString().slice(0, 5);

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
                                        onClick={() => setIsEditingTime(false)}
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
                                    disabled
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-100 text-gray-300 cursor-not-allowed"
                                    title="Coming soon"
                                >
                                    <MessageSquare size={11} />
                                    Thread
                                    <span className="text-[9px] text-gray-300 ml-0.5">soon</span>
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

                            {/* Composer */}
                            {createType === 'short_post' && (
                                <div className="relative">
                                    <textarea
                                        ref={createTextareaRef}
                                        value={createText}
                                        onChange={(e) => {
                                            setCreateText(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                        }}
                                        placeholder="Write your post..."
                                        rows={6}
                                        autoFocus
                                        className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 placeholder:text-gray-300 overflow-hidden"
                                    />
                                    <AITextPopup
                                        textareaRef={createTextareaRef}
                                        value={createText}
                                        onChange={setCreateText}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className={`text-[11px] ${createText.length > 280 ? 'text-amber-500' : 'text-gray-300'}`}>
                                            {createText.length} chars
                                        </span>
                                        <button
                                            disabled={!createText.trim() || isScheduling || platforms.length === 0}
                                            onClick={async () => {
                                                if (platforms.length === 0) {
                                                    toast.error('Select at least one platform');
                                                    return;
                                                }
                                                setIsScheduling(true);
                                                try {
                                                    const accountIds = platforms
                                                        .map(platformId => {
                                                            const apiPlatform = UI_TO_API_PLATFORM[platformId];
                                                            return socialAccounts.find(a => a.platform === apiPlatform)?.id;
                                                        })
                                                        .filter((id): id is number => id !== undefined);

                                                    await createStandaloneShortPost({
                                                        content: createText.trim(),
                                                        social_account_ids: accountIds,
                                                        scheduled_at: scheduledAt.toISOString(),
                                                    });

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

