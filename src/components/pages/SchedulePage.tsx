/**
 * Schedule Page
 *
 * Queue for scheduling posts across platforms (X, LinkedIn, Threads).
 * Supports short posts and threads per platform.
 * Includes default publishing times configuration.
 */

import { useState, useRef, useEffect } from '@wordpress/element';
import {
    Calendar,
    Clock,
    Plus,
    X as XIcon,
    Trash2,
    GripVertical,
    Filter,
    Pencil,
    MoreHorizontal,
    Check,
    MessageSquare,
    ListOrdered,
    Loader2,
    CheckCircle,
    ExternalLink,
} from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { toast } from 'sonner';
import { getPublishingSchedule, savePublishingSchedule, getScheduledPosts, deleteScheduledPost } from '../../services/api';
import type { ScheduledPost as ApiScheduledPost } from '../../services/api';
import { useProfile } from '../../context/ProfileContext';

// ============================================
// TYPES
// ============================================

type Platform = 'x' | 'linkedin' | 'threads' | 'instagram' | 'facebook';
type PostType = 'short' | 'thread';
type PostStatus = 'pending' | 'publishing' | 'published' | 'failed';
type TabType = 'queue' | 'published' | 'times';
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface ScheduledPost {
    id: number;
    content: string;
    platform: Platform;
    postType: PostType;
    threadCount?: number;
    scheduledAt: string;
    status: PostStatus;
    blogTitle?: string;
    postId?: number | null;
    schedulableId?: number;
}

interface TimeSlot {
    id: string;
    time: string; // HH:MM format
    platforms: Platform[];
}

interface DaySchedule {
    enabled: boolean;
    slots: TimeSlot[];
}

type WeeklySchedule = Record<DayOfWeek, DaySchedule>;

// ============================================
// CONSTANTS
// ============================================

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const PLATFORMS: { id: Platform; name: string; icon: React.ReactNode; color: string; bg: string }[] = [
    { id: 'x', name: 'X', icon: <RiTwitterXFill size={14} />, color: 'text-black', bg: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', icon: <RiLinkedinFill size={14} />, color: 'text-blue-700', bg: 'bg-blue-700' },
    { id: 'threads', name: 'Threads', icon: <RiThreadsFill size={14} />, color: 'text-gray-900', bg: 'bg-gray-900' },
    { id: 'instagram', name: 'Instagram', icon: <RiInstagramFill size={14} />, color: 'text-pink-600', bg: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: <RiFacebookFill size={14} />, color: 'text-blue-600', bg: 'bg-blue-600' },
];

const POST_TYPES: { id: PostType; label: string; icon: React.ReactNode }[] = [
    { id: 'short', label: 'Short Post', icon: <MessageSquare size={13} /> },
    { id: 'thread', label: 'Thread', icon: <ListOrdered size={13} /> },
];

// ============================================
// MOCK PUBLISHED DATA
// ============================================

function getRecentDate(daysAgo: number, hour: number, minute: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

const MOCK_PUBLISHED: ScheduledPost[] = [
    {
        id: 901,
        content: 'Most developers overcomplicate state management.\n\nHere\'s the truth: you don\'t need Redux for 90% of apps.\n\nReact context + useReducer handles it all.',
        platform: 'x',
        postType: 'short',
        scheduledAt: getRecentDate(0, 9, 0),
        status: 'published',
        blogTitle: 'Why You Don\'t Need Redux Anymore',
    },
    {
        id: 902,
        content: 'I spent 3 years building SaaS products nobody wanted.\n\nThen I learned one simple framework that changed everything.\n\nThe "Mom Test" — stop asking people if your idea is good. Instead, ask about their problems.',
        platform: 'linkedin',
        postType: 'short',
        scheduledAt: getRecentDate(0, 9, 0),
        status: 'published',
        blogTitle: 'The Mom Test: How to Talk to Customers',
    },
    {
        id: 903,
        content: 'Hot take: TypeScript doesn\'t slow you down.\n\nWhat slows you down is debugging runtime errors at 2am that a type checker would have caught instantly.',
        platform: 'x',
        postType: 'short',
        scheduledAt: getRecentDate(1, 12, 30),
        status: 'published',
        blogTitle: 'TypeScript: Worth the Investment',
    },
    {
        id: 904,
        content: 'The best marketing strategy for developers?\n\nBuild in public. Share your wins AND your failures.\n\nPeople connect with authenticity, not perfection.',
        platform: 'threads',
        postType: 'short',
        scheduledAt: getRecentDate(1, 9, 0),
        status: 'published',
        blogTitle: 'Build in Public: A Developer\'s Guide',
    },
    {
        id: 905,
        content: 'Stop writing "clean code" and start writing code that ships.\n\nPerfect is the enemy of done. Your users don\'t care about your architecture — they care about solving their problem.',
        platform: 'linkedin',
        postType: 'short',
        scheduledAt: getRecentDate(2, 9, 0),
        status: 'published',
        blogTitle: 'Ship First, Refactor Later',
    },
    {
        id: 906,
        content: 'Every senior developer I know has one thing in common:\n\nThey read more code than they write.\n\nReading codebases teaches you patterns no tutorial ever will.',
        platform: 'x',
        postType: 'short',
        scheduledAt: getRecentDate(3, 17, 0),
        status: 'published',
        blogTitle: 'How to Level Up as a Developer',
    },
];

// ============================================
// API → UI MAPPING
// ============================================

function mapApiPost(apiPost: ApiScheduledPost): ScheduledPost {
    const uiPlatform = API_TO_UI_PLATFORM[apiPost.platform] || apiPost.platform as Platform;
    return {
        id: apiPost.id,
        content: apiPost.content,
        platform: uiPlatform,
        postType: 'short',
        scheduledAt: apiPost.scheduled_at,
        status: apiPost.status,
        blogTitle: apiPost.post?.title,
        postId: apiPost.post_id,
        schedulableId: apiPost.schedulable_id,
    };
}

// ============================================
// HELPERS
// ============================================

// API uses "twitter", frontend uses "x"
const API_TO_UI_PLATFORM: Record<string, Platform> = { twitter: 'x', linkedin: 'linkedin', threads: 'threads', instagram: 'instagram', facebook: 'facebook' };
const UI_TO_API_PLATFORM: Record<Platform, string> = { x: 'twitter', linkedin: 'linkedin', threads: 'threads', instagram: 'instagram', facebook: 'facebook' };

function mapScheduleFromApi(schedule: Record<string, any>): WeeklySchedule {
    const result = {} as WeeklySchedule;
    for (const [day, data] of Object.entries(schedule)) {
        result[day as DayOfWeek] = {
            enabled: data.enabled,
            slots: data.slots.map((slot: any) => ({
                ...slot,
                platforms: slot.platforms.map((p: string) => API_TO_UI_PLATFORM[p] || p),
            })),
        };
    }
    return result;
}

function mapScheduleToApi(schedule: WeeklySchedule): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [day, data] of Object.entries(schedule)) {
        result[day] = {
            enabled: data.enabled,
            slots: data.slots.map((slot) => ({
                ...slot,
                platforms: slot.platforms.map((p) => UI_TO_API_PLATFORM[p] || p),
            })),
        };
    }
    return result;
}

function formatScheduleDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function groupPostsByDate(posts: ScheduledPost[]): Map<string, ScheduledPost[]> {
    const groups = new Map<string, ScheduledPost[]>();
    const sorted = [...posts].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    for (const post of sorted) {
        const dateKey = new Date(post.scheduledAt).toDateString();
        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(post);
    }

    return groups;
}

function generateSlotId(): string {
    return `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PlatformBadge({ platform }: { platform: Platform }) {
    const p = PLATFORMS.find((pl) => pl.id === platform)!;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${p.bg} text-white`}>
            {p.icon}
            {p.name}
        </span>
    );
}

function PostTypeBadge({ postType, threadCount }: { postType: PostType; threadCount?: number }) {
    const t = POST_TYPES.find((pt) => pt.id === postType)!;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {t.icon}
            {t.label}
            {postType === 'thread' && threadCount && (
                <span className="text-gray-400 ml-0.5">({threadCount})</span>
            )}
        </span>
    );
}

function StatusIndicator({ status }: { status: PostStatus }) {
    const config = {
        pending: { dot: 'bg-blue-500', glow: 'bg-blue-400', label: 'Scheduled', text: 'text-blue-600' },
        publishing: { dot: 'bg-yellow-500', glow: 'bg-yellow-400', label: 'Publishing', text: 'text-yellow-600' },
        published: { dot: 'bg-green-500', glow: 'bg-green-400', label: 'Published', text: 'text-green-600' },
        failed: { dot: 'bg-red-500', glow: 'bg-red-400', label: 'Failed', text: 'text-red-600' },
    };
    const c = config[status];
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}>
            <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full animate-status-ping ${c.glow}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`} />
            </span>
            {c.label}
        </span>
    );
}

function ScheduledPostCard({
    post,
    onDelete,
}: {
    post: ScheduledPost;
    onDelete: (id: number) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    return (
        <div className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            {/* Time column */}
            <div className="shrink-0 w-16 pt-0.5">
                <span className="text-sm font-semibold text-gray-900">
                    {formatTime(post.scheduledAt)}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-2">
                    <PlatformBadge platform={post.platform} />
                    <PostTypeBadge postType={post.postType} threadCount={post.threadCount} />
                    <StatusIndicator status={post.status} />
                </div>

                {/* Post content preview */}
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1.5">
                    {post.content}
                </p>

                {/* Source blog */}
                {post.blogTitle && (
                    <p className="text-xs text-gray-400">
                        From: <span className="text-gray-500">{post.blogTitle}</span>
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="shrink-0 relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {post.postId && (
                            <button
                                onClick={() => {
                                    const url = `admin.php?page=blog-repurpose-blogs&post_id=${post.postId}${post.schedulableId ? `&short_post_id=${post.schedulableId}` : ''}`;
                                    window.location.href = url;
                                    setMenuOpen(false);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <Pencil size={14} />
                                Edit in Blog
                            </button>
                        )}
                        <button
                            onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            <Calendar size={14} />
                            Unschedule
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function PublishedPostCard({ post }: { post: ScheduledPost }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200">
            {/* Time column */}
            <div className="shrink-0 w-16 pt-0.5">
                <span className="text-sm font-semibold text-gray-900">
                    {formatTime(post.scheduledAt)}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-2">
                    <PlatformBadge platform={post.platform} />
                    <PostTypeBadge postType={post.postType} threadCount={post.threadCount} />
                    <StatusIndicator status={post.status} />
                </div>

                {/* Post content preview */}
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1.5">
                    {post.content}
                </p>

                {/* Source blog */}
                {post.blogTitle && (
                    <p className="text-xs text-gray-400">
                        From: <span className="text-gray-500">{post.blogTitle}</span>
                    </p>
                )}
            </div>

            {/* View link */}
            <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <ExternalLink size={13} />
                View
            </button>
        </div>
    );
}

function PlatformToggle({
    platforms,
    onChange,
    connectedPlatforms,
}: {
    platforms: Platform[];
    onChange: (platforms: Platform[]) => void;
    connectedPlatforms?: Platform[];
}) {
    const toggle = (id: Platform) => {
        // Check if platform is connected
        if (connectedPlatforms && !connectedPlatforms.includes(id)) {
            const name = PLATFORMS.find((p) => p.id === id)?.name || id;
            toast.error(`Connect ${name} first`, {
                description: 'Go to Settings → Connections to link your account.',
            });
            return;
        }

        if (platforms.includes(id)) {
            if (platforms.length === 1) return; // Must have at least one
            onChange(platforms.filter((p) => p !== id));
        } else {
            onChange([...platforms, id]);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {PLATFORMS.map((p) => {
                const active = platforms.includes(p.id);
                const isConnected = !connectedPlatforms || connectedPlatforms.includes(p.id);
                return (
                    <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                            !isConnected
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : active
                                    ? `${p.bg} text-white`
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                        }`}
                        title={isConnected ? p.name : `${p.name} (not connected)`}
                    >
                        {p.icon}
                    </button>
                );
            })}
        </div>
    );
}

function TimeSlotRow({
    slot,
    onTimeChange,
    onPlatformsChange,
    onRemove,
    connectedPlatforms,
}: {
    slot: TimeSlot;
    onTimeChange: (time: string) => void;
    onPlatformsChange: (platforms: Platform[]) => void;
    onRemove: () => void;
    connectedPlatforms?: Platform[];
}) {
    return (
        <div className="group flex items-center gap-3 py-2">
            <GripVertical size={14} className="text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />

            {/* Time picker */}
            <input
                type="time"
                value={slot.time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />

            {/* Platform toggles */}
            <PlatformToggle platforms={slot.platforms} onChange={onPlatformsChange} connectedPlatforms={connectedPlatforms} />

            {/* Platform labels (small screens hint) */}
            <span className="text-xs text-gray-400 flex-1">
                {slot.platforms.map((p) => PLATFORMS.find((pl) => pl.id === p)?.name).join(', ')}
            </span>

            {/* Remove */}
            <button
                onClick={onRemove}
                className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 rounded transition-all"
            >
                <XIcon size={14} />
            </button>
        </div>
    );
}

function DayRow({
    day,
    schedule,
    onToggle,
    onUpdate,
    connectedPlatforms,
}: {
    day: { key: DayOfWeek; label: string; short: string };
    schedule: DaySchedule;
    onToggle: () => void;
    onUpdate: (schedule: DaySchedule) => void;
    connectedPlatforms?: Platform[];
}) {
    const addSlot = () => {
        onUpdate({
            ...schedule,
            slots: [
                ...schedule.slots,
                { id: generateSlotId(), time: '09:00', platforms: ['x'] },
            ],
        });
    };

    const removeSlot = (slotId: string) => {
        onUpdate({
            ...schedule,
            slots: schedule.slots.filter((s) => s.id !== slotId),
        });
    };

    const updateSlotTime = (slotId: string, time: string) => {
        onUpdate({
            ...schedule,
            slots: schedule.slots.map((s) => (s.id === slotId ? { ...s, time } : s)),
        });
    };

    const updateSlotPlatforms = (slotId: string, platforms: Platform[]) => {
        onUpdate({
            ...schedule,
            slots: schedule.slots.map((s) => (s.id === slotId ? { ...s, platforms } : s)),
        });
    };

    return (
        <div className={`py-4 ${schedule.enabled ? '' : 'opacity-50'}`}>
            {/* Day header */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                    {/* Toggle switch */}
                    <button
                        onClick={onToggle}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                            schedule.enabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                schedule.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                        />
                    </button>
                    <span className="text-sm font-medium text-gray-900">{day.label}</span>
                    {schedule.slots.length > 0 && schedule.enabled && (
                        <span className="text-xs text-gray-400">
                            {schedule.slots.length} {schedule.slots.length === 1 ? 'slot' : 'slots'}
                        </span>
                    )}
                </div>

                {schedule.enabled && (
                    <button
                        onClick={addSlot}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                        <Plus size={12} />
                        Add time
                    </button>
                )}
            </div>

            {/* Time slots */}
            {schedule.enabled && schedule.slots.length > 0 && (
                <div className="ml-12 mt-1">
                    {schedule.slots.map((slot) => (
                        <TimeSlotRow
                            key={slot.id}
                            slot={slot}
                            onTimeChange={(time) => updateSlotTime(slot.id, time)}
                            onPlatformsChange={(platforms) => updateSlotPlatforms(slot.id, platforms)}
                            onRemove={() => removeSlot(slot.id)}
                            connectedPlatforms={connectedPlatforms}
                        />
                    ))}
                </div>
            )}

            {schedule.enabled && schedule.slots.length === 0 && (
                <div className="ml-12 mt-1">
                    <p className="text-xs text-gray-400 italic py-1">No time slots set</p>
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchedulePage() {
    const { socialConnections } = useProfile();
    const [activeTab, setActiveTab] = useState<TabType>('queue');
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<PostType | 'all'>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    // Map social connections to UI platform names
    const connectedPlatforms: Platform[] = socialConnections
        .map((c) => API_TO_UI_PLATFORM[c.platform])
        .filter(Boolean) as Platform[];

    // Fetch publishing schedule from API on mount
    useEffect(() => {
        getPublishingSchedule()
            .then((data) => {
                if (data.schedule) {
                    const mapped = mapScheduleFromApi(data.schedule);
                    setWeeklySchedule(mapped);
                }
            })
            .catch((error) => {
                console.error('[SchedulePage] Failed to load publishing schedule:', error);
            })
            .finally(() => {
                setIsLoadingSchedule(false);
            });

        getScheduledPosts()
            .then((data) => {
                setPosts(data.map(mapApiPost));
            })
            .catch((error) => {
                console.error('[SchedulePage] Failed to load scheduled posts:', error);
            })
            .finally(() => {
                setIsLoadingPosts(false);
            });
    }, []);

    // Close filter dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        }
        if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen]);

    // Filter posts
    const filteredPosts = posts.filter((post) => {
        const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
        const matchesType = typeFilter === 'all' || post.postType === typeFilter;
        return matchesPlatform && matchesType;
    });

    const grouped = groupPostsByDate(filteredPosts);

    const handleDeletePost = async (id: number) => {
        try {
            await deleteScheduledPost(id);
            setPosts(posts.filter((p) => p.id !== id));
            toast.success('Scheduled post removed');
        } catch (error) {
            toast.error('Failed to remove post');
        }
    };

    const handleToggleDay = (day: DayOfWeek) => {
        if (!weeklySchedule) return;
        setWeeklySchedule((prev) => prev ? ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled },
        }) : prev);
    };

    const handleUpdateDay = (day: DayOfWeek, schedule: DaySchedule) => {
        if (!weeklySchedule) return;
        setWeeklySchedule((prev) => prev ? ({
            ...prev,
            [day]: schedule,
        }) : prev);
    };

    const handleSaveSchedule = async () => {
        if (!weeklySchedule) return;
        setIsSaving(true);
        try {
            await savePublishingSchedule(mapScheduleToApi(weeklySchedule));
            toast.success('Schedule saved!');
        } catch (error) {
            console.error('Failed to save schedule:', error);
            toast.error('Failed to save schedule');
        } finally {
            setIsSaving(false);
        }
    };

    // Count total weekly slots
    const totalSlots = weeklySchedule
        ? Object.values(weeklySchedule).reduce(
            (sum, day) => sum + (day.enabled ? day.slots.length : 0),
            0
        )
        : 0;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Post <em className="font-serif font-normal italic">Schedule</em>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Queue posts across platforms and set default publishing times
                    </p>
                </div>

                {activeTab === 'queue' && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={16} />
                        Schedule Post
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === 'queue'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Calendar size={16} />
                    Queue
                    {posts.length > 0 && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                            activeTab === 'queue'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            {posts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('published')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === 'published'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <CheckCircle size={16} />
                    Published
                </button>
                <button
                    onClick={() => setActiveTab('times')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === 'times'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Clock size={16} />
                    Publishing Times
                    {totalSlots > 0 && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                            activeTab === 'times'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            {totalSlots}/wk
                        </span>
                    )}
                </button>
            </div>

            {/* ============ QUEUE TAB ============ */}
            {activeTab === 'queue' && isLoadingPosts && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            )}
            {activeTab === 'queue' && !isLoadingPosts && (
                <div>
                    {/* Filters */}
                    {posts.length > 0 && (
                        <div className="flex items-center justify-between mb-5">
                            {/* Post type pills — left */}
                            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                                <button
                                    onClick={() => setTypeFilter('all')}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        typeFilter === 'all'
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    All
                                </button>
                                {POST_TYPES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTypeFilter(t.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                            typeFilter === t.id
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {t.icon}
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Platform filter dropdown — right */}
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                                        platformFilter !== 'all'
                                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                                            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Filter size={14} />
                                    {platformFilter === 'all'
                                        ? 'Filter'
                                        : PLATFORMS.find((p) => p.id === platformFilter)?.name}
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                        <button
                                            onClick={() => { setPlatformFilter('all'); setIsFilterOpen(false); }}
                                            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                                platformFilter === 'all'
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            All Platforms
                                            {platformFilter === 'all' && <Check size={14} />}
                                        </button>
                                        {PLATFORMS.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setPlatformFilter(p.id); setIsFilterOpen(false); }}
                                                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                                    platformFilter === p.id
                                                        ? 'bg-blue-50 text-blue-600'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-5 h-5 ${p.bg} text-white rounded flex items-center justify-center`}>
                                                        {p.icon}
                                                    </span>
                                                    {p.name}
                                                </div>
                                                {platformFilter === p.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Posts grouped by day */}
                    {filteredPosts.length > 0 ? (
                        <div className="space-y-6">
                            {Array.from(grouped.entries()).map(([dateKey, dayPosts]) => (
                                <div key={dateKey}>
                                    {/* Day header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <h3 className="text-sm font-semibold text-gray-900">
                                            {formatScheduleDate(dayPosts[0].scheduledAt)}
                                        </h3>
                                        <span className="text-xs text-gray-400">
                                            {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                                        </span>
                                        <div className="flex-1 border-t border-gray-100" />
                                    </div>

                                    {/* Posts list */}
                                    <div className="space-y-2">
                                        {dayPosts.map((post) => (
                                            <ScheduledPostCard
                                                key={post.id}
                                                post={post}
                                                onDelete={handleDeletePost}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length > 0 ? (
                        /* No results from filter */
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar size={24} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No matching posts</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Try adjusting your filters
                            </p>
                            <button
                                onClick={() => { setPlatformFilter('all'); setTypeFilter('all'); }}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                <Calendar size={28} className="text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No scheduled posts
                            </h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                                Repurpose a blog post into short posts or threads, then schedule them for the best engagement times.
                            </p>
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mx-auto">
                                <Plus size={16} />
                                Schedule Your First Post
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ============ PUBLISHED TAB ============ */}
            {activeTab === 'published' && (() => {
                const publishedGrouped = groupPostsByDate(MOCK_PUBLISHED);
                return (
                    <div>
                        {MOCK_PUBLISHED.length > 0 ? (
                            <div className="space-y-6">
                                {Array.from(publishedGrouped.entries()).map(([dateKey, dayPosts]) => (
                                    <div key={dateKey}>
                                        {/* Day header */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-sm font-semibold text-gray-900">
                                                {formatScheduleDate(dayPosts[0].scheduledAt)}
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                {dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}
                                            </span>
                                            <div className="flex-1 border-t border-gray-100" />
                                        </div>

                                        {/* Posts list */}
                                        <div className="space-y-2">
                                            {dayPosts.map((post) => (
                                                <PublishedPostCard key={post.id} post={post} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <CheckCircle size={28} className="text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    No published posts yet
                                </h3>
                                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                    Posts that have been successfully published to your social accounts will appear here.
                                </p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ============ PUBLISHING TIMES TAB ============ */}
            {activeTab === 'times' && isLoadingSchedule && (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
            )}
            {activeTab === 'times' && !isLoadingSchedule && (
                <div className="max-w-3xl">
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
                        <Clock size={18} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm text-blue-800 font-medium">Default publishing times</p>
                            <p className="text-sm text-blue-600 mt-0.5">
                                Set recurring time slots for each day. When you schedule a post, it will automatically fill the next available slot. You can choose which platforms each time slot applies to.
                            </p>
                        </div>
                    </div>

                    {/* Weekly schedule card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Weekly <em className="font-serif font-normal italic">Schedule</em>
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {totalSlots} time {totalSlots === 1 ? 'slot' : 'slots'} per week across {weeklySchedule ? Object.values(weeklySchedule).filter((d) => d.enabled).length : 0} days
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {PLATFORMS.map((p) => (
                                        <span key={p.id} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${p.bg} text-white`}>
                                            {p.icon}
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Days */}
                        <div className="px-6 divide-y divide-gray-100">
                            {weeklySchedule && DAYS.map((day) => (
                                <DayRow
                                    key={day.key}
                                    day={day}
                                    schedule={weeklySchedule[day.key]}
                                    onToggle={() => handleToggleDay(day.key)}
                                    onUpdate={(schedule) => handleUpdateDay(day.key, schedule)}
                                    connectedPlatforms={connectedPlatforms}
                                />
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Posts will be queued to the next available slot automatically.
                            </p>
                            <button
                                onClick={handleSaveSchedule}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Check size={16} />
                                )}
                                {isSaving ? 'Saving...' : 'Save Schedule'}
                            </button>
                        </div>
                    </div>

                    {/* Quick presets */}
                    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Quick <em className="font-serif font-normal italic">Presets</em>
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Start with a preset and customize from there
                            </p>
                        </div>
                        <div className="px-6 py-4 grid grid-cols-3 gap-3">
                            <button
                                onClick={() => applyPreset('casual')}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                                <p className="text-sm font-medium text-gray-900 mb-1">Casual</p>
                                <p className="text-xs text-gray-500">
                                    5x/week, 1 post/day
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Mon-Fri at 9:00 AM
                                </p>
                            </button>
                            <button
                                onClick={() => applyPreset('consistent')}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                                <p className="text-sm font-medium text-gray-900 mb-1">Consistent</p>
                                <p className="text-xs text-gray-500">
                                    5x/week, 2 posts/day
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Mon-Fri at 9 AM &amp; 12:30 PM
                                </p>
                            </button>
                            <button
                                onClick={() => applyPreset('aggressive')}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                                <p className="text-sm font-medium text-gray-900 mb-1">Power User</p>
                                <p className="text-xs text-gray-500">
                                    7x/week, 3 posts/day
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Daily at 9 AM, 12:30 PM &amp; 5 PM
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ============================================
    // PRESET LOGIC
    // ============================================

    function applyPreset(preset: 'casual' | 'consistent' | 'aggressive') {
        const allPlatforms: Platform[] = ['x', 'linkedin', 'threads'];

        if (preset === 'casual') {
            setWeeklySchedule({
                monday: { enabled: true, slots: [{ id: generateSlotId(), time: '09:00', platforms: allPlatforms }] },
                tuesday: { enabled: true, slots: [{ id: generateSlotId(), time: '09:00', platforms: allPlatforms }] },
                wednesday: { enabled: true, slots: [{ id: generateSlotId(), time: '09:00', platforms: allPlatforms }] },
                thursday: { enabled: true, slots: [{ id: generateSlotId(), time: '09:00', platforms: allPlatforms }] },
                friday: { enabled: true, slots: [{ id: generateSlotId(), time: '09:00', platforms: allPlatforms }] },
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            });
        } else if (preset === 'consistent') {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [
                    { id: generateSlotId(), time: '09:00', platforms: allPlatforms },
                    { id: generateSlotId(), time: '12:30', platforms: ['x', 'threads'] },
                ],
            });
            setWeeklySchedule({
                monday: makeDay(),
                tuesday: makeDay(),
                wednesday: makeDay(),
                thursday: makeDay(),
                friday: makeDay(),
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            });
        } else {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [
                    { id: generateSlotId(), time: '09:00', platforms: allPlatforms },
                    { id: generateSlotId(), time: '12:30', platforms: ['x', 'linkedin'] },
                    { id: generateSlotId(), time: '17:00', platforms: allPlatforms },
                ],
            });
            setWeeklySchedule({
                monday: makeDay(),
                tuesday: makeDay(),
                wednesday: makeDay(),
                thursday: makeDay(),
                friday: makeDay(),
                saturday: { enabled: true, slots: [{ id: generateSlotId(), time: '10:00', platforms: ['x', 'threads'] }] },
                sunday: { enabled: true, slots: [{ id: generateSlotId(), time: '10:00', platforms: ['x', 'threads'] }] },
            });
        }
    }
}
