import { useState, useEffect } from '@wordpress/element';
import { X, ChevronLeft, ChevronDown, FileText, MessageSquare, Image, Loader2, Clock, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getBlogs } from '@/services/blogApi';
import { getShortPosts, getThreads, getVisuals } from '@/services/repurposeApi';
import { getSocialAccounts } from '@/services/profileApi';
import { createScheduledPost } from '@/services/scheduleApi';
import { SCHEDULE_PLATFORMS, UI_TO_API_PLATFORM } from '@/components/repurpose/modals/schedule-utils';
import type { SchedulePlatform } from '@/components/repurpose/modals/schedule-utils';
import { GRADIENT_PRESETS } from '@/components/repurpose/modals/VisualPreviewModal';
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
        <div className={`w-16 h-16 rounded-lg shrink-0 overflow-hidden bg-gradient-to-br ${gradientClass} flex flex-col items-center justify-center p-1.5 relative`}>
            <p className={`text-[5px] leading-tight line-clamp-4 text-center ${isDark ? 'text-white/90' : 'text-gray-900/80'}`}>
                {firstSlide}
            </p>
            {slideCount > 1 && (
                <span className={`absolute bottom-0.5 right-1 text-[7px] font-bold ${isDark ? 'text-white/60' : 'text-gray-900/40'}`}>
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
// MAIN COMPONENT
// ============================================

type ChooseType = 'short_post' | 'thread' | 'visual';
type View = 'main' | 'choose-blogs' | 'choose-content';

interface SlotContentPickerProps {
    isOpen: boolean;
    slotDate: Date;
    slotPlatforms: SchedulePlatform[];
    onClose: () => void;
    onScheduled: () => void;
}

export default function SlotContentPicker({ isOpen, slotDate, slotPlatforms, onClose, onScheduled }: SlotContentPickerProps) {
    const [view, setView] = useState<View>('main');
    const [scheduledAt, setScheduledAt] = useState<Date>(slotDate);
    const [platforms, setPlatforms] = useState<SchedulePlatform[]>(slotPlatforms);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [isEditingTime, setIsEditingTime] = useState(false);

    const [chooseType, setChooseType] = useState<ChooseType>('short_post');
    const [blogs, setBlogs] = useState<BlogPost[]>([]);
    const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
    const [shortPosts, setShortPosts] = useState<ShortPost[]>([]);
    const [threads, setThreads] = useState<ThreadItem[]>([]);
    const [visuals, setVisuals] = useState<Visual[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isScheduling, setIsScheduling] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setView('main');
        setScheduledAt(slotDate);
        setPlatforms(slotPlatforms);
        setSelectedBlog(null);
        setShortPosts([]);
        setThreads([]);
        setVisuals([]);
        setIsEditingTime(false);
        setIsScheduling(false);

        getSocialAccounts()
            .then(setSocialAccounts)
            .catch(() => toast.error('Failed to load social accounts'));
    }, [isOpen]);

    // Connected platform IDs
    const connectedPlatforms = SCHEDULE_PLATFORMS.filter(p =>
        socialAccounts.some(a => a.platform === UI_TO_API_PLATFORM[p.id])
    );

    const togglePlatform = (id: SchedulePlatform) => {
        setPlatforms(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleChooseExisting = async (type: ChooseType) => {
        setChooseType(type);
        setView('choose-blogs');
        setIsLoading(true);
        try {
            const data = await getBlogs();
            setBlogs(data.filter(b => b.status !== 'generating' && b.status !== 'failed'));
        } catch {
            toast.error('Failed to load blogs');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectBlog = async (blog: BlogPost) => {
        setSelectedBlog(blog);
        setView('choose-content');
        setIsLoading(true);
        try {
            if (chooseType === 'short_post') {
                setShortPosts(await getShortPosts(blog.id));
            } else if (chooseType === 'thread') {
                setThreads(await getThreads(blog.id));
            } else {
                setVisuals(await getVisuals(blog.id));
            }
        } catch {
            toast.error('Failed to load content');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (view === 'choose-content') {
            setView('choose-blogs');
            setSelectedBlog(null);
        } else if (view === 'choose-blogs') {
            setView('main');
        }
    };

    const scheduleContent = async (contentId: number, contentType: ChooseType) => {
        if (platforms.length === 0) {
            toast.error('Select at least one platform');
            return;
        }
        setIsScheduling(true);
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
                    ...(selectedBlog && { post_id: selectedBlog.id }),
                });
            });
            await Promise.all(promises);

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
        }
    };

    const isScheduled = (scheduledPosts?: { status: string }[]) => {
        return scheduledPosts?.some(sp => sp.status === 'pending' || sp.status === 'publishing' || sp.status === 'published');
    };

    if (!isOpen) return null;

    // Date/time input values
    const dateValue = scheduledAt.toISOString().split('T')[0];
    const timeValue = scheduledAt.toTimeString().slice(0, 5);

    const title = view === 'main'
        ? 'Schedule Content'
        : view === 'choose-blogs'
            ? `Choose Blog — ${chooseType === 'short_post' ? 'Short Posts' : chooseType === 'thread' ? 'Threads' : 'Visuals'}`
            : selectedBlog?.title || 'Choose Content';

    const contentTypeLabel = chooseType === 'short_post' ? 'short posts' : chooseType === 'thread' ? 'threads' : 'visuals';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {view !== 'main' && (
                                <button
                                    onClick={handleBack}
                                    className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                            )}
                            <h2 className="text-base font-semibold text-gray-900 line-clamp-1">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Date/time + platforms bar */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Date/time display */}
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

                        {/* Platform toggles */}
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
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {view === 'main' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Short Post card */}
                            <ActionCard
                                icon={<FileText size={24} className="text-blue-500" />}
                                title="Short Post"
                                description="Single post for any platform"
                                onChoose={() => handleChooseExisting('short_post')}
                            />
                            {/* Thread card */}
                            <ActionCard
                                icon={<MessageSquare size={24} className="text-purple-500" />}
                                title="Thread"
                                description="Multi-post thread"
                                onChoose={() => handleChooseExisting('thread')}
                            />
                            {/* Visual card */}
                            <ActionCard
                                icon={<Image size={24} className="text-pink-500" />}
                                title="Visual"
                                description="Carousel or image post"
                                onChoose={() => handleChooseExisting('visual')}
                            />
                        </div>
                    )}

                    {view === 'choose-blogs' && (
                        isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={24} className="animate-spin text-gray-300" />
                            </div>
                        ) : blogs.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-16">No blogs found. Create a blog first.</p>
                        ) : (
                            <div className="space-y-2">
                                {blogs.map(blog => {
                                    const count = chooseType === 'short_post'
                                        ? blog.short_posts?.length || 0
                                        : chooseType === 'thread'
                                            ? blog.threads?.length || 0
                                            : blog.visuals?.length || 0;
                                    return (
                                        <button
                                            key={blog.id}
                                            onClick={() => handleSelectBlog(blog)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all text-left"
                                        >
                                            {blog.thumbnail ? (
                                                <img src={blog.thumbnail} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                                                    <FileText size={16} className="text-gray-300" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 line-clamp-1">{blog.title}</p>
                                                <p className="text-xs text-gray-400">{count} {contentTypeLabel}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {view === 'choose-content' && (
                        isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 size={24} className="animate-spin text-gray-300" />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {chooseType === 'short_post' && (
                                    shortPosts.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-16">No short posts for this blog.</p>
                                    ) : shortPosts.map(post => {
                                        const scheduled = isScheduled(post.scheduled_posts);
                                        return (
                                            <div key={post.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">{post.content}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {scheduled && <ScheduleBadge />}
                                                        <span className="text-[10px] text-gray-300">{post.content.length} chars</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => scheduleContent(post.id, 'short_post')}
                                                    disabled={isScheduling}
                                                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Schedule'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}

                                {chooseType === 'thread' && (
                                    threads.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-16">No threads for this blog.</p>
                                    ) : threads.map(thread => {
                                        const scheduled = isScheduled(thread.scheduled_posts);
                                        return (
                                            <div key={thread.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-line">{thread.hook}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {scheduled && <ScheduleBadge />}
                                                    </div>
                                                    <ThreadChain thread={thread} />
                                                </div>
                                                <button
                                                    onClick={() => scheduleContent(thread.id, 'thread')}
                                                    disabled={isScheduling}
                                                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Schedule'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}

                                {chooseType === 'visual' && (
                                    visuals.length === 0 ? (
                                        <p className="text-sm text-gray-400 text-center py-16">No visuals for this blog.</p>
                                    ) : visuals.map(visual => {
                                        const scheduled = isScheduled(visual.scheduled_posts);
                                        return (
                                            <div key={visual.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all">
                                                <MiniVisualPreview visual={visual} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700 line-clamp-2 whitespace-pre-line">
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
                                                    onClick={() => scheduleContent(visual.id, 'visual')}
                                                    disabled={isScheduling}
                                                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Schedule'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// ACTION CARD
// ============================================

function ActionCard({ icon, title, description, onChoose }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onChoose: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-gray-100 bg-gray-50/50">
            {icon}
            <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
            <button
                onClick={onChoose}
                className="w-full mt-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
                Choose existing
            </button>
        </div>
    );
}
