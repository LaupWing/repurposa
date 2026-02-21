/**
 * Repurpose Panel Component
 *
 * Panel for generating short posts, threads, visuals from blog content.
 */

import { useState, useEffect } from '@wordpress/element';
import {
    Share2,
    FileText,
    Image,
    Video,
    Sparkles,
    Check,
    Lightbulb,
    Layout,
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    Pencil,
    AlertTriangle,
    X,
    Trash2,
    Plus,
    Send,
    Search,
} from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { toast } from 'sonner';
import { Tooltip } from '@wordpress/components';
import { arrayMove } from '@dnd-kit/sortable';
import { generateShortPosts, getSwipes, updateShortPost, generateThreads, deleteVisual } from '../../services/repurposeApi';
import { getPublishingSchedule, createScheduledPost, getScheduledPosts, publishNow } from '../../services/scheduleApi';
import { getSocialAccounts } from '../../services/profileApi';
import type { ShortPost, ShortPostSchedule, Swipe, SocialAccount, ScheduledPost as ScheduledPostType, ThreadItem, Visual } from '../../types';
import { GeneratingOverlay } from '../GeneratingOverlay';
import { VisualShortPostPreviewModal, VisualThreadPreviewModal, VisualPreview, GRADIENT_PRESETS } from './VisualPreviewModal';
import ShortPostCard, { type ShortPostPattern, emotionColors } from './ShortPostCard';
import ThreadCard from './ThreadCard';

// ============================================
// TYPES
// ============================================

type TabType = 'short' | 'threads' | 'visuals' | 'video';

function shortPostToPattern(sp: ShortPost): ShortPostPattern {
    return {
        id: sp.id,
        content: sp.content,
        emotions: sp.metadata?.emotions || [],
        structure: sp.metadata?.structure || '',
        why_it_works: sp.metadata?.why_it_works || '',
        cta_content: sp.cta_content?.content || undefined,
        scheduled_post: sp.scheduled_post || null,
        media: (sp.media || []).filter((m): m is string => typeof m === 'string'),
        cta_media: sp.cta_content?.media?.filter((m): m is string => typeof m === 'string') || [],
        visualCount: sp.visuals?.length || 0,
    };
}





function EmptyState({
    type,
    onGenerate,
    isGenerating,
    isPublished,
}: {
    type: TabType;
    onGenerate: () => void;
    isGenerating: boolean;
    isPublished?: boolean;
}) {
    const config = {
        short: { title: 'Short Posts', button: 'Generate Short Posts', icon: Share2 },
        threads: { title: 'Threads', button: 'Generate Threads', icon: FileText },
        visuals: { title: 'Visuals', button: 'Generate Visuals', icon: Image },
        video: { title: 'Video Scripts', button: 'Generate Scripts', icon: Video },
    };

    const { title, button, icon: Icon } = config[type];

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
            <div className="mb-4 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                <Icon size={20} className="text-gray-400" />
            </div>
            <h3 className="mb-1 font-medium text-gray-900">No {title} Yet</h3>
            <p className="mb-4 max-w-[240px] text-sm text-gray-500">
                Generate optimized {title.toLowerCase()} from your blog post content.
            </p>
            {!isPublished && type === 'short' && (
                <p className="mb-4 max-w-[280px] text-xs text-amber-600">
                    Tip: Publish your blog first to create short posts with effective CTAs that link back to your post.
                </p>
            )}
            <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                <Sparkles size={16} />
                {isGenerating ? 'Generating...' : button}
            </button>
        </div>
    );
}

function DependencyGate({
    type,
    onSwitchTab,
}: {
    type: 'visuals' | 'video';
    onSwitchTab?: (tab: TabType) => void;
}) {
    const description = type === 'visuals'
        ? 'Generate short posts or threads from your blog before creating visuals.'
        : 'Generate short posts or threads from your blog before creating video scripts.';

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
            <div className="mb-4 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                <Lightbulb size={20} className="text-gray-400" />
            </div>
            <h3 className="mb-1 font-medium text-gray-900">Create Content First</h3>
            <p className="mb-4 max-w-[280px] text-sm text-gray-500">
                {description}
            </p>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onSwitchTab?.('short')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Share2 size={16} />
                    Generate Short Posts
                </button>
                <button
                    onClick={() => onSwitchTab?.('threads')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <FileText size={16} />
                    Generate Threads
                </button>
            </div>
        </div>
    );
}

function ConfirmGenerateModal({
    isOpen,
    onClose,
    onConfirm,
    isPublished,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (includeCta: boolean) => void;
    isPublished?: boolean;
}) {
    const [includeCta, setIncludeCta] = useState(!!isPublished);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Generate Short Posts</h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    {/* CTA Checkbox */}
                    <label
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isPublished
                                ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={includeCta}
                                onChange={(e) => setIncludeCta(e.target.checked)}
                                disabled={!isPublished}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    includeCta && isPublished
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'border-gray-300 bg-white'
                                }`}
                            >
                                {includeCta && isPublished && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900">Include CTA to blog post</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Add a call-to-action linking back to your published blog.
                            </p>
                        </div>
                    </label>

                    {/* Warning if not published */}
                    {!isPublished && (
                        <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                                Publish your blog first to enable CTAs that link back to your post.
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(includeCta && !!isPublished)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Generate Short Posts
                    </button>
                </div>
            </div>
        </div>
    );
}

function AddShortPostModal({
    isOpen,
    onClose,
    onAdd,
}: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (content: string) => void;
}) {
    const [mode, setMode] = useState<'choose' | 'custom'>('choose');
    const [customContent, setCustomContent] = useState('');
    const [selectedSwipe, setSelectedSwipe] = useState<number | null>(null);
    const [swipes, setSwipes] = useState<Swipe[]>([]);
    const [loadingSwipes, setLoadingSwipes] = useState(false);

    useEffect(() => {
        if (!isOpen || swipes.length > 0) return;
        setLoadingSwipes(true);
        getSwipes()
            .then(setSwipes)
            .catch(() => toast.error('Failed to load swipe files'))
            .finally(() => setLoadingSwipes(false));
    }, [isOpen]);

    const handleAdd = () => {
        if (mode === 'custom') {
            if (!customContent.trim()) return;
            onAdd(customContent.trim());
        } else {
            const swipe = swipes.find(s => s.id === selectedSwipe);
            if (!swipe) return;
            onAdd(swipe.content);
        }
        setCustomContent('');
        setSelectedSwipe(null);
        setMode('choose');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Add Short Post</h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Mode tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setMode('choose')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'choose'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Swipe File
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                            mode === 'custom'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Write Your Own
                    </button>
                </div>

                <div className="px-5 py-4 max-h-112 overflow-y-auto">
                    {mode === 'choose' ? (
                        loadingSwipes ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading swipe files...</div>
                        ) : swipes.length === 0 ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-400">No swipe files available</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {swipes.map((swipe) => (
                                    <button
                                        key={swipe.id}
                                        onClick={() => setSelectedSwipe(swipe.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors flex flex-col ${
                                            selectedSwipe === swipe.id
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="mb-1.5">
                                            <span className="text-[10px] text-gray-400">{swipe.structure}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 whitespace-pre-wrap flex-1 mb-2 flex items-center">{swipe.content}</p>
                                        <div className="flex flex-wrap gap-1 mt-auto">
                                            {swipe.emotions.map((emotion) => (
                                                <span
                                                    key={emotion}
                                                    className={`rounded-full border px-1.5 py-0.5 text-[9px] ${
                                                        emotionColors[emotion] || 'border-gray-200 bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {emotion}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )
                    ) : (
                        <textarea
                            value={customContent}
                            onChange={(e) => setCustomContent(e.target.value)}
                            placeholder="Write your short post..."
                            className="w-full min-h-80 rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                            rows={18}
                            style={{ fieldSizing: 'content' } as React.CSSProperties}
                        />
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={mode === 'choose' ? !selectedSwipe : !customContent.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Add Post
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// SCHEDULE POST MODAL
// ============================================

type SchedulePlatform = 'x' | 'linkedin' | 'threads' | 'instagram' | 'facebook';

type ScheduleContentType = 'short_post' | 'thread' | 'visual';

const SCHEDULE_PLATFORMS: { id: SchedulePlatform; name: string; icon: React.ReactNode; bg: string }[] = [
    { id: 'x', name: 'X', icon: <RiTwitterXFill size={14} />, bg: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', icon: <RiLinkedinFill size={14} />, bg: 'bg-blue-700' },
    { id: 'threads', name: 'Threads', icon: <RiThreadsFill size={14} />, bg: 'bg-gray-900' },
    { id: 'instagram', name: 'Instagram', icon: <RiInstagramFill size={14} />, bg: 'bg-pink-600' },
    { id: 'facebook', name: 'Facebook', icon: <RiFacebookFill size={14} />, bg: 'bg-blue-600' },
];

// Platforms that are unsupported for certain content types
function getUnsupportedReason(platformId: SchedulePlatform, contentType: ScheduleContentType): string | null {
    if (platformId === 'instagram' && (contentType === 'short_post' || contentType === 'thread')) {
        return 'Instagram requires an image — use Visuals instead';
    }
    return null;
}

const API_TO_UI_PLATFORM: Record<string, SchedulePlatform> = { twitter: 'x', linkedin: 'linkedin', threads: 'threads', instagram: 'instagram', facebook: 'facebook' };
const UI_TO_API_PLATFORM: Record<SchedulePlatform, string> = { x: 'twitter', linkedin: 'linkedin', threads: 'threads', instagram: 'instagram', facebook: 'facebook' };

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface UpcomingSlot {
    date: Date;
    dateLabel: string;
    timeLabel: string;
    platforms: SchedulePlatform[];
}

function getUpcomingSlots(
    schedule: Record<string, { enabled: boolean; slots: { id: string; time: string; platforms: string[] }[] }>,
    maxSlots: number,
): UpcomingSlot[] {
    const now = new Date();
    const slots: UpcomingSlot[] = [];

    // Look ahead 30 days to gather enough slots for pagination
    for (let d = 0; d < 30 && slots.length < maxSlots; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        const dayKey = DAY_KEYS[date.getDay()];
        const daySchedule = schedule[dayKey];
        if (!daySchedule?.enabled) continue;

        for (const slot of daySchedule.slots) {
            if (slots.length >= maxSlots) break;
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotDate = new Date(date);
            slotDate.setHours(hours, minutes, 0, 0);

            // Skip past slots
            if (slotDate <= now) continue;

            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            let dateLabel: string;
            if (slotDate.toDateString() === today.toDateString()) {
                dateLabel = 'Today';
            } else if (slotDate.toDateString() === tomorrow.toDateString()) {
                dateLabel = 'Tomorrow';
            } else {
                dateLabel = slotDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }

            const timeLabel = slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            slots.push({
                date: slotDate,
                dateLabel,
                timeLabel,
                platforms: slot.platforms.map((p) => API_TO_UI_PLATFORM[p] || p as SchedulePlatform),
            });
        }
    }

    return slots;
}

function getDefaultDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

function getDefaultTime(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toTimeString().slice(0, 5);
}

function SchedulePostModal({
    isOpen,
    post,
    blogId,
    contentType = 'short_post',
    onClose,
    onScheduled,
}: {
    isOpen: boolean;
    post: ShortPostPattern | null;
    blogId?: number;
    contentType?: ScheduleContentType;
    onClose: () => void;
    onScheduled: () => void;
}) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<SchedulePlatform[]>([]);
    const [date, setDate] = useState(getDefaultDate);
    const [time, setTime] = useState(getDefaultTime);
    const [upcomingSlots, setUpcomingSlots] = useState<UpcomingSlot[]>([]);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [existingScheduled, setExistingScheduled] = useState<ScheduledPostType[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
    const [useCustom, setUseCustom] = useState(false);
    const [slotPage, setSlotPage] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const slotsPerPage = 6;

    // Fetch schedule + social accounts when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setSelectedPlatforms([]);
        setDate(getDefaultDate());
        setTime(getDefaultTime());
        setSelectedSlotIndex(null);
        setUseCustom(false);
        setSlotPage(0);
        setIsSubmitting(false);

        setLoadingSlots(true);
        Promise.all([getPublishingSchedule(), getSocialAccounts(), getScheduledPosts({ status: 'pending' })])
            .then(([scheduleData, accounts, scheduled]) => {
                setSocialAccounts(accounts);
                setExistingScheduled(scheduled);

                if (scheduleData.schedule) {
                    const slots = getUpcomingSlots(scheduleData.schedule, 60);
                    setUpcomingSlots(slots);
                    // Auto-select the first available (non-taken) slot
                    const firstAvailable = slots.findIndex((slot) => {
                        const slotTime = slot.date.getTime();
                        return !scheduled.some((sp) => Math.abs(new Date(sp.scheduled_at).getTime() - slotTime) < 60000);
                    });
                    const filterSupported = (ids: SchedulePlatform[]) => ids.filter((id) => !getUnsupportedReason(id, contentType));
                    if (firstAvailable !== -1) {
                        setSelectedSlotIndex(firstAvailable);
                        setSelectedPlatforms(filterSupported(slots[firstAvailable].platforms));
                    } else if (slots.length > 0) {
                        setSelectedPlatforms(filterSupported(slots[0].platforms));
                    } else {
                        setSelectedPlatforms(['x']);
                    }
                } else {
                    setUpcomingSlots([]);
                    setSelectedPlatforms(['x']);
                }
            })
            .catch(() => {
                setUpcomingSlots([]);
            })
            .finally(() => setLoadingSlots(false));
    }, [isOpen]);

    if (!isOpen || !post) return null;

    const connectedPlatformIds = socialAccounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);

    // Check if a slot time is already taken by an existing scheduled post
    const getSlotOccupant = (slot: UpcomingSlot): ScheduledPostType | null => {
        const slotTime = slot.date.getTime();
        return existingScheduled.find((sp) => {
            const spTime = new Date(sp.scheduled_at).getTime();
            // Match within 1 minute window
            return Math.abs(spTime - slotTime) < 60000;
        }) || null;
    };

    const togglePlatform = (id: SchedulePlatform) => {
        const unsupported = getUnsupportedReason(id, contentType);
        if (unsupported) return;
        if (!connectedPlatformIds.includes(id)) {
            const name = SCHEDULE_PLATFORMS.find((p) => p.id === id)?.name || id;
            toast.error(`Connect ${name} first`, {
                description: 'Go to Settings → Connected Accounts to link your account.',
            });
            return;
        }
        setSelectedPlatforms((prev) => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter((p) => p !== id);
            }
            return [...prev, id];
        });
    };

    const pageStart = slotPage * slotsPerPage;
    const pageSlots = upcomingSlots.slice(pageStart, pageStart + slotsPerPage);
    const totalPages = Math.ceil(upcomingSlots.length / slotsPerPage);

    const handleSelectSlot = (absoluteIndex: number) => {
        setSelectedSlotIndex(absoluteIndex);
        setUseCustom(false);
        setSelectedPlatforms(upcomingSlots[absoluteIndex].platforms.filter((id) => !getUnsupportedReason(id, contentType)));
    };

    const handleUseCustom = () => {
        setUseCustom(true);
        setSelectedSlotIndex(null);
    };

    const handleSchedule = async () => {
        if (selectedPlatforms.length === 0) return;

        const scheduledAt = selectedSlotIndex !== null && !useCustom
            ? upcomingSlots[selectedSlotIndex].date.toISOString()
            : new Date(`${date}T${time}`).toISOString();

        setIsSubmitting(true);
        try {
            // Create a scheduled post for each selected platform
            const promises = selectedPlatforms.map((platformId) => {
                const apiPlatform = UI_TO_API_PLATFORM[platformId];
                const account = socialAccounts.find((a) => a.platform === apiPlatform);
                if (!account) return Promise.resolve(null);
                return createScheduledPost({
                    social_account_id: account.id,
                    content: post.content,
                    scheduled_at: scheduledAt,
                    schedulable_type: 'short_post',
                    schedulable_id: post.id,
                    ...(blogId && { post_id: blogId }),
                    ...(post.media.length > 0 && { media: post.media }),
                });
            });

            await Promise.all(promises);

            const platformNames = selectedPlatforms
                .map((id) => SCHEDULE_PLATFORMS.find((p) => p.id === id)?.name)
                .filter(Boolean)
                .join(', ');
            const dt = new Date(scheduledAt);
            const formattedTime = dt.toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
            });
            toast.success('Post scheduled!', {
                description: `${platformNames} · ${formattedTime}`,
            });
            onScheduled();
        } catch (error) {
            toast.error('Failed to schedule post', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className={"relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden"}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Schedule <em className="font-serif font-normal italic">Post</em></h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-5">
                    {/* Post preview */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Instagram warning for text-only content */}
                    {(contentType === 'short_post' || contentType === 'thread') && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-amber-300 bg-amber-50">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">
                                Instagram is not available for {contentType === 'short_post' ? 'short posts' : 'threads'}. Use <strong>Visuals</strong> to schedule to Instagram.
                            </p>
                        </div>
                    )}

                    {/* Upcoming slots from schedule */}
                    {loadingSlots ? (
                        <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                            Loading your schedule...
                        </div>
                    ) : upcomingSlots.length === 0 ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <Calendar size={16} className="text-gray-400 shrink-0" />
                            <p className="text-xs text-gray-500">
                                No publishing schedule set up yet. <a href="admin.php?page=blog-repurpose-schedule" className="text-blue-600 hover:underline">Configure your times</a> to see quick-pick slots here.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Next available slots</label>
                            <div className="grid grid-cols-2 gap-2">
                                {pageSlots.map((slot, idx) => {
                                    const absoluteIdx = pageStart + idx;
                                    const isSelected = selectedSlotIndex === absoluteIdx && !useCustom;
                                    const occupant = getSlotOccupant(slot);
                                    const isTaken = !!occupant;
                                    return (
                                        <Tooltip
                                            key={absoluteIdx}
                                            text={isTaken ? `Already taken: "${occupant.content.slice(0, 80)}${occupant.content.length > 80 ? '...' : ''}"` : ''}
                                            delay={0}
                                            placement="top"
                                        >
                                            <div
                                                onClick={() => !isTaken && handleSelectSlot(absoluteIdx)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                                    isTaken
                                                        ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                                                        : isSelected
                                                            ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400 cursor-pointer'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                                                }`}
                                            >
                                                {/* Radio check */}
                                                <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                                                    isTaken
                                                        ? 'border-gray-200 bg-gray-100'
                                                        : isSelected
                                                            ? 'border-blue-600 bg-blue-600'
                                                            : 'border-gray-300 bg-white'
                                                }`}>
                                                    {isSelected && !isTaken && <Check size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-medium ${isTaken ? 'text-gray-400' : 'text-gray-900'}`}>{slot.dateLabel}</div>
                                                    <div className={`text-xs mt-0.5 ${isTaken ? 'text-gray-300' : 'text-gray-500'}`}>{slot.timeLabel}</div>
                                                    {isTaken && (
                                                        <div className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                                                            Taken by: {occupant.content.slice(0, 40)}{occupant.content.length > 40 ? '...' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {SCHEDULE_PLATFORMS.map((p) => {
                                                        const inSlot = slot.platforms.includes(p.id);
                                                        const active = isSelected && selectedPlatforms.includes(p.id);
                                                        const connected = connectedPlatformIds.includes(p.id);
                                                        const unsupported = getUnsupportedReason(p.id, contentType);
                                                        if (unsupported) {
                                                            return (
                                                                <Tooltip key={p.id} text={unsupported} delay={0} placement="top">
                                                                    <div className="relative inline-flex items-center justify-center w-7 h-7 rounded-md border border-amber-400 text-gray-300 cursor-not-allowed">
                                                                        {p.icon}
                                                                        <AlertTriangle size={12} className="absolute -top-1.5 -right-1.5 text-amber-500 fill-amber-100" />
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        }
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isTaken) return;
                                                                    if (!isSelected) handleSelectSlot(absoluteIdx);
                                                                    togglePlatform(p.id);
                                                                }}
                                                                disabled={isTaken}
                                                                className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                                                                    isTaken
                                                                        ? 'bg-gray-100 text-gray-200 cursor-not-allowed'
                                                                        : !connected
                                                                            ? 'bg-gray-50 text-gray-200 cursor-not-allowed'
                                                                            : isSelected
                                                                                ? active
                                                                                    ? `${p.bg} text-white`
                                                                                    : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400'
                                                                                : inSlot
                                                                                    ? `${p.bg} text-white`
                                                                                    : 'bg-gray-100 text-gray-300'
                                                                }`}
                                                            >
                                                                {p.icon}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                            {/* Pagination + Custom time */}
                            <div className="mt-3 flex items-center justify-between">
                                <button
                                    onClick={handleUseCustom}
                                    className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                                        useCustom
                                            ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400 text-blue-700'
                                            : 'border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                                    }`}
                                >
                                    Pick a custom date &amp; time
                                </button>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setSlotPage((p) => Math.max(0, p - 1))}
                                            disabled={slotPage === 0}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs text-gray-400 px-2">
                                            {slotPage + 1} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setSlotPage((p) => Math.min(totalPages - 1, p + 1))}
                                            disabled={slotPage === totalPages - 1}
                                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom date/time picker - show when no schedule or custom selected */}
                    {(useCustom || upcomingSlots.length === 0) && !loadingSlots && (
                        <div className="space-y-4">
                            {/* Platform selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
                                <div className="flex items-center gap-2">
                                    {SCHEDULE_PLATFORMS.map((p) => {
                                        const active = selectedPlatforms.includes(p.id);
                                        const connected = connectedPlatformIds.includes(p.id);
                                        const unsupported = getUnsupportedReason(p.id, contentType);
                                        if (unsupported) {
                                            return (
                                                <Tooltip key={p.id} text={unsupported} delay={0} placement="top">
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-400 text-gray-300 cursor-not-allowed">
                                                        {p.icon}
                                                        {p.name}
                                                        <AlertTriangle size={14} className="text-amber-500" />
                                                    </div>
                                                </Tooltip>
                                            );
                                        }
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => togglePlatform(p.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    !connected
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                        : active
                                                            ? `${p.bg} text-white`
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                                                }`}
                                            >
                                                {p.icon}
                                                {p.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-gray-400" />
                                            Date
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        min={getDefaultDate()}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        <span className="flex items-center gap-1.5">
                                            <Clock size={14} className="text-gray-400" />
                                            Time
                                        </span>
                                    </label>
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSchedule}
                        disabled={isSubmitting || selectedPlatforms.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Calendar size={14} />
                        {isSubmitting ? 'Scheduling...' : 'Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// PUBLISH NOW MODAL
// ============================================

function PublishNowModal({
    isOpen,
    post,
    contentType = 'short_post',
    onClose,
}: {
    isOpen: boolean;
    post: ShortPostPattern | null;
    contentType?: ScheduleContentType;
    onClose: () => void;
}) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<SchedulePlatform[]>([]);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedPlatforms([]);
        setIsPublishing(false);

        setLoading(true);
        getSocialAccounts()
            .then((accounts) => {
                setSocialAccounts(accounts);
                // Auto-select first connected + supported platform
                const connected = accounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);
                const firstSupported = connected.find((id) => !getUnsupportedReason(id, contentType));
                if (firstSupported) setSelectedPlatforms([firstSupported]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isOpen, contentType]);

    if (!isOpen || !post) return null;

    const connectedPlatformIds = socialAccounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);

    const togglePlatform = (id: SchedulePlatform) => {
        const unsupported = getUnsupportedReason(id, contentType);
        if (unsupported) return;
        if (!connectedPlatformIds.includes(id)) {
            const name = SCHEDULE_PLATFORMS.find((p) => p.id === id)?.name || id;
            toast.error(`Connect ${name} first`, {
                description: 'Go to Settings → Connected Accounts to link your account.',
            });
            return;
        }
        setSelectedPlatforms((prev) => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter((p) => p !== id);
            }
            return [...prev, id];
        });
    };

    const handlePublish = async () => {
        if (selectedPlatforms.length === 0) return;
        setIsPublishing(true);

        try {
            const accountIds = selectedPlatforms
                .map((platformId) => {
                    const apiPlatform = UI_TO_API_PLATFORM[platformId];
                    return socialAccounts.find((a) => a.platform === apiPlatform)?.id;
                })
                .filter((id): id is number => id !== undefined);

            if (accountIds.length === 0) {
                toast.error('No connected accounts for selected platforms');
                return;
            }

            const response = await publishNow({
                social_account_ids: accountIds,
                content: post.content,
                schedulable_type: contentType,
                schedulable_id: post.id,
                ...(post.media.length > 0 && { media: post.media }),
            });

            const succeeded = response.results.filter((r) => r.status === 'published');
            const failed = response.results.filter((r) => r.status === 'failed');

            if (succeeded.length > 0) {
                const names = succeeded.map((r) => {
                    const uiId = API_TO_UI_PLATFORM[r.platform] || r.platform;
                    return SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.name || r.platform;
                }).join(', ');
                toast.success('Published!', { description: names });
            }
            if (failed.length > 0) {
                const names = failed.map((r) => {
                    const uiId = API_TO_UI_PLATFORM[r.platform] || r.platform;
                    return SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.name || r.platform;
                }).join(', ');
                toast.error(`Failed on ${names}`, { description: failed[0].error || 'Please try again.' });
            }

            onClose();
        } catch (error) {
            toast.error('Failed to publish', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Publish <em className="font-serif font-normal italic">Now</em></h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {/* Post preview */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Instagram warning */}
                    {(contentType === 'short_post' || contentType === 'thread') && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-amber-300 bg-amber-50">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">
                                Instagram is not available for {contentType === 'short_post' ? 'short posts' : 'threads'}. Use <strong>Visuals</strong> to publish to Instagram.
                            </p>
                        </div>
                    )}

                    {/* Platform selection */}
                    {loading ? (
                        <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                            Loading accounts...
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select platforms</label>
                            <div className="grid grid-cols-2 gap-2">
                                {SCHEDULE_PLATFORMS.map((p) => {
                                    const active = selectedPlatforms.includes(p.id);
                                    const connected = connectedPlatformIds.includes(p.id);
                                    const unsupported = getUnsupportedReason(p.id, contentType);
                                    if (unsupported) {
                                        return (
                                            <Tooltip key={p.id} text={unsupported} delay={0} placement="top">
                                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-400 cursor-not-allowed">
                                                    <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-300 flex items-center justify-center">
                                                        {p.icon}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-300 flex-1">{p.name}</span>
                                                    <AlertTriangle size={16} className="text-amber-500" />
                                                </div>
                                            </Tooltip>
                                        );
                                    }
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => togglePlatform(p.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                                !connected
                                                    ? 'border-gray-100 cursor-not-allowed'
                                                    : active
                                                        ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                                !connected
                                                    ? 'bg-gray-100 text-gray-300'
                                                    : active
                                                        ? `${p.bg} text-white`
                                                        : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {p.icon}
                                            </div>
                                            <span className={`text-sm font-medium flex-1 text-left ${
                                                !connected ? 'text-gray-300' : 'text-gray-900'
                                            }`}>
                                                {p.name}
                                            </span>
                                            {!connected && (
                                                <span className="text-xs text-gray-400">Not connected</span>
                                            )}
                                            {connected && (
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                                }`}>
                                                    {active && <Check size={12} className="text-white" />}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || selectedPlatforms.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Send size={14} />
                        {isPublishing ? 'Publishing...' : 'Publish Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}

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
    initialHighlightVisualId?: number | null;
    initialShortPosts?: ShortPost[];
    initialThreads?: ThreadItem[];
    initialVisuals?: Visual[];
}

export function RepurposePanel({ initialTab = 'short', blogContent, blogId, isPublished, publishedPostUrl, editShortPostId, onSwitchTab, onVisualCreated, onHighlightVisual, initialHighlightVisualId, initialShortPosts, initialThreads, initialVisuals }: RepurposePanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [shortPosts, setShortPosts] = useState<ShortPostPattern[]>(() =>
        (initialShortPosts || []).map(shortPostToPattern)
    );
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [schedulingPost, setSchedulingPost] = useState<ShortPostPattern | null>(null);
    const [schedulingContentType, setSchedulingContentType] = useState<ScheduleContentType>('short_post');
    const [publishingPost, setPublishingPost] = useState<ShortPostPattern | null>(null);
    const [publishingContentType, setPublishingContentType] = useState<ScheduleContentType>('short_post');
    const [threads, setThreads] = useState<ThreadItem[]>(initialThreads || []);
    const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);
    const [visuals, setVisuals] = useState<Visual[]>(initialVisuals || []);
    const [viewingVisual, setViewingVisual] = useState<Visual | null>(null);
    const [highlightVisualId, setHighlightVisualId] = useState<number | null>(initialHighlightVisualId ?? null);
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [sourcePickerTab, setSourcePickerTab] = useState<'short_posts' | 'threads'>('short_posts');
    const [sourcePickerSearch, setSourcePickerSearch] = useState('');
    const [creatingVisualSource, setCreatingVisualSource] = useState<{ type: 'short_post' | 'thread'; id: number; content: string | string[] } | null>(null);

    // Persist media changes to the API
    const syncShortPostMedia = (postId: number, media: string[], ctaContent?: string, ctaMedia?: string[]) => {
        updateShortPost(postId, {
            media,
            ...(ctaContent !== undefined && {
                cta_content: ctaContent
                    ? { content: ctaContent, media: ctaMedia && ctaMedia.length > 0 ? ctaMedia : null }
                    : null,
            }),
        }).catch((err) => {
            console.error('Failed to sync short post media:', err);
            toast.error('Failed to save image changes');
        });
    };

    const handleAddShortPost = (content: string) => {
        const newPost: ShortPostPattern = {
            id: Date.now(),
            content,
            emotions: [],
            structure: 'Custom',
            why_it_works: 'Manually created post',
            media: [],
            cta_media: [],
            visualCount: 0,
        };
        setShortPosts(prev => [...prev, newPost]);
        toast.success('Short post added');
    };


    const onGenerateClick = () => {
        setShowConfirmModal(true);
    };

    const handleGenerateShortPosts = async (includeCta: boolean = false) => {
        setShowConfirmModal(false);

        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGenerating(true);

        try {
            const ctaLink = includeCta && publishedPostUrl ? publishedPostUrl : undefined;
            const response = await generateShortPosts(blogId, blogContent, ctaLink);

            setShortPosts(response.short_posts.map(shortPostToPattern));
            toast.success(`${response.short_posts.length} short posts generated`);
        } catch (error) {
            console.error('Failed to generate short posts:', error);
            toast.error('Failed to generate short posts', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleScheduled = () => {
        setSchedulingPost(null);
    };

    const handleGenerateThreads = async () => {
        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGeneratingThreads(true);

        try {
            const response = await generateThreads(blogId, blogContent);
            setThreads(response.threads);
            toast.success(`${response.threads.length} threads generated`);
        } catch (error) {
            console.error('Failed to generate threads:', error);
            toast.error('Failed to generate threads', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingThreads(false);
        }
    };

    // Show content based on initialTab (parent controls the tab)
    const renderContent = () => {
        switch (initialTab) {
            case 'short':
                return shortPosts.length === 0 ? (
                    <EmptyState type="short" onGenerate={onGenerateClick} isGenerating={isGenerating} isPublished={isPublished} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Generated Short Posts</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {shortPosts.length} short posts
                                </span>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className="pl-2">
                            {shortPosts.map((pattern, index) => (
                                <ShortPostCard
                                    key={pattern.id}
                                    pattern={pattern}
                                    index={index}
                                    blogId={blogId}
                                    onDelete={() => setShortPosts(prev => prev.filter(p => p.id !== pattern.id))}
                                    onDeleteCta={() => {
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: undefined, cta_media: [] } : p));
                                        updateShortPost(pattern.id, { cta_content: null }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onAddCta={() => {
                                        const ctaText = 'Read the full post here: ';
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: ctaText } : p));
                                        updateShortPost(pattern.id, { cta_content: { content: ctaText, media: null } }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onEdit={(content) => {
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, content } : p));
                                        updateShortPost(pattern.id, { content }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onEditCta={(content) => {
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: content } : p));
                                        updateShortPost(pattern.id, { cta_content: { content, media: pattern.cta_media.length > 0 ? pattern.cta_media : null } }).catch(() => toast.error('Failed to save'));
                                    }}
                                    onSchedule={() => { setSchedulingPost(pattern); setSchedulingContentType('short_post'); }}
                                    onPublishNow={() => { setPublishingPost(pattern); setPublishingContentType('short_post'); }}
                                    onAddImage={(imageUrl) => {
                                        const newMedia = [...pattern.media, imageUrl].slice(0, 4);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
                                        syncShortPostMedia(pattern.id, newMedia);
                                    }}
                                    onRemoveImage={(imageIndex) => {
                                        const newMedia = pattern.media.filter((_, i) => i !== imageIndex);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
                                        syncShortPostMedia(pattern.id, newMedia);
                                    }}
                                    onReorderImages={(from, to) => {
                                        const newMedia = arrayMove(pattern.media, from, to);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
                                        syncShortPostMedia(pattern.id, newMedia);
                                    }}
                                    onAddCtaImage={(imageUrl) => {
                                        const newCtaImages = [...pattern.cta_media, imageUrl].slice(0, 4);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
                                        syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
                                    }}
                                    onRemoveCtaImage={(imageIndex) => {
                                        const newCtaImages = pattern.cta_media.filter((_, i) => i !== imageIndex);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
                                        syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
                                    }}
                                    onReorderCtaImages={(from, to) => {
                                        const newCtaImages = arrayMove(pattern.cta_media, from, to);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
                                        syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
                                    }}
                                    onVisualSaved={(visual) => {
                                        setVisuals(prev => [...prev, visual]);
                                        setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, visualCount: p.visualCount + 1 } : p));
                                        onVisualCreated?.(visual);
                                        onSwitchTab?.('visuals');
                                    }}
                                    cardVisuals={visuals.filter(v => v.source_type === 'short_post' && v.source_id === pattern.id)}
                                    onGoToVisual={(visualId) => {
                                        onHighlightVisual?.(visualId);
                                        onSwitchTab?.('visuals');
                                    }}
                                    autoEdit={pattern.id === editShortPostId}
                                />
                            ))}
                        </div>
                    </div>
                );

            case 'threads':
                return threads.length === 0 ? (
                    <EmptyState type="threads" onGenerate={handleGenerateThreads} isGenerating={isGeneratingThreads} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500">Thread Variations</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {threads.length} generated
                            </span>
                        </div>
                        {threads.map((thread, index) => (
                            <ThreadCard
                                key={thread.id}
                                thread={thread}
                                index={index}
                                onEditPost={(postIndex, content) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id
                                            ? { ...t, posts: t.posts.map((p, i) => i === postIndex ? { ...p, content } : p) }
                                            : t
                                    ));
                                }}
                                onDeletePost={(postIndex) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id
                                            ? { ...t, posts: t.posts.filter((_, i) => i !== postIndex) }
                                            : t
                                    ));
                                }}
                                onInsertPost={(afterIndex) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id
                                            ? { ...t, posts: [...t.posts.slice(0, afterIndex + 1), { content: '', media: null }, ...t.posts.slice(afterIndex + 1)] }
                                            : t
                                    ));
                                }}
                                onEditHook={(content) => {
                                    setThreads(prev => prev.map(t =>
                                        t.id === thread.id ? { ...t, hook: content } : t
                                    ));
                                }}
                                onSchedule={() => {
                                    setSchedulingContentType('thread');
                                    setSchedulingPost({
                                        id: thread.id,
                                        content: thread.posts.map(p => p.content).join('\n\n---\n\n'),
                                        emotions: thread.metadata.emotions,
                                        structure: thread.metadata.structure,
                                        why_it_works: thread.metadata.why_it_works,
                                        media: [],
                                        cta_media: [],
                                        visualCount: 0,
                                    });
                                }}
                                onPublishNow={() => {
                                    setPublishingContentType('thread');
                                    setPublishingPost({
                                        id: thread.id,
                                        content: thread.posts.map(p => p.content).join('\n\n---\n\n'),
                                        emotions: thread.metadata.emotions,
                                        structure: thread.metadata.structure,
                                        why_it_works: thread.metadata.why_it_works,
                                        media: [],
                                        cta_media: [],
                                        visualCount: 0,
                                    });
                                }}
                                onDelete={() => setThreads(prev => prev.filter(t => t.id !== thread.id))}
                                blogId={blogId}
                                isPublished={isPublished}
                                onVisualSaved={(visual) => {
                                    setVisuals(prev => [...prev, visual]);
                                    onVisualCreated?.(visual);
                                    onSwitchTab?.('visuals');
                                }}
                            />
                        ))}
                    </div>
                );

            case 'visuals': {
                if (shortPosts.length === 0 && threads.length === 0) {
                    return <DependencyGate type="visuals" onSwitchTab={onSwitchTab} />;
                }

                const hasShortPosts = shortPosts.length > 0;
                const hasThreads = threads.length > 0;
                const activePickerTab = sourcePickerTab === 'threads' && !hasThreads ? 'short_posts'
                    : sourcePickerTab === 'short_posts' && !hasShortPosts ? 'threads'
                    : sourcePickerTab;
                const searchLower = sourcePickerSearch.toLowerCase();
                const filteredShortPosts = hasShortPosts
                    ? shortPosts.filter(sp => sp.content.toLowerCase().includes(searchLower))
                    : [];
                const filteredThreads = hasThreads
                    ? threads.filter(t => t.posts.some(p => p.content.toLowerCase().includes(searchLower)) || t.hook.toLowerCase().includes(searchLower))
                    : [];

                const sourcePickerContent = (
                    <>
                        {showSourcePicker && (
                            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/40" onClick={() => { setShowSourcePicker(false); setSourcePickerSearch(''); }} />
                                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[75vh] overflow-hidden flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                                        <h3 className="text-sm font-semibold text-gray-900">Select content for visual</h3>
                                        <button onClick={() => { setShowSourcePicker(false); setSourcePickerSearch(''); }} className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Tabs + Search */}
                                    <div className="px-5 pt-3 pb-0 space-y-3">
                                        {/* Tabs — only show if both types exist */}
                                        {hasShortPosts && hasThreads && (
                                            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                                                <button
                                                    onClick={() => setSourcePickerTab('short_posts')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                        activePickerTab === 'short_posts'
                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <FileText size={13} />
                                                    Short Posts
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activePickerTab === 'short_posts' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {shortPosts.length}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => setSourcePickerTab('threads')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                        activePickerTab === 'threads'
                                                            ? 'bg-white text-gray-900 shadow-sm'
                                                            : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <Layout size={13} />
                                                    Threads
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${activePickerTab === 'threads' ? 'bg-violet-100 text-violet-700' : 'bg-gray-200 text-gray-500'}`}>
                                                        {threads.length}
                                                    </span>
                                                </button>
                                            </div>
                                        )}

                                        {/* Search */}
                                        <div className="relative">
                                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={sourcePickerSearch}
                                                onChange={(e) => setSourcePickerSearch(e.target.value)}
                                                placeholder={activePickerTab === 'threads' ? 'Search threads...' : 'Search short posts...'}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-300 focus:ring-1 focus:ring-blue-200 outline-none transition-colors"
                                            />
                                            {sourcePickerSearch && (
                                                <button
                                                    onClick={() => setSourcePickerSearch('')}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
                                                >
                                                    <X size={13} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content list */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {activePickerTab === 'short_posts' && (
                                            filteredShortPosts.length > 0 ? (
                                                filteredShortPosts.map((sp) => (
                                                    <button
                                                        key={`sp-${sp.id}`}
                                                        onClick={() => {
                                                            setCreatingVisualSource({ type: 'short_post', id: sp.id, content: sp.content });
                                                            setShowSourcePicker(false);
                                                            setSourcePickerSearch('');
                                                        }}
                                                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                                    >
                                                        <p className="text-sm text-gray-800 line-clamp-3">{sp.content}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-sm text-gray-400">
                                                    {sourcePickerSearch ? 'No short posts match your search' : 'No short posts available'}
                                                </div>
                                            )
                                        )}
                                        {activePickerTab === 'threads' && (
                                            filteredThreads.length > 0 ? (
                                                filteredThreads.map((t) => (
                                                    <button
                                                        key={`t-${t.id}`}
                                                        onClick={() => {
                                                            setCreatingVisualSource({ type: 'thread', id: t.id, content: t.posts.map(p => p.content) });
                                                            setShowSourcePicker(false);
                                                            setSourcePickerSearch('');
                                                        }}
                                                        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors"
                                                    >
                                                        <p className="text-xs text-violet-600 font-medium mb-1">Thread · {t.posts.length} posts</p>
                                                        <p className="text-sm text-gray-800 line-clamp-3">{t.posts[0]?.content}</p>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-sm text-gray-400">
                                                    {sourcePickerSearch ? 'No threads match your search' : 'No threads available'}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {creatingVisualSource && (
                            creatingVisualSource.type === 'thread' && Array.isArray(creatingVisualSource.content) ? (
                                <VisualThreadPreviewModal
                                    isOpen={true}
                                    onClose={() => setCreatingVisualSource(null)}
                                    content={creatingVisualSource.content}
                                    blogId={blogId}
                                    sourceId={creatingVisualSource.id}
                                    onSaved={(visual) => {
                                        setVisuals(prev => [...prev, visual]);
                                        setHighlightVisualId(visual.id);
                                        setCreatingVisualSource(null);
                                    }}
                                />
                            ) : (
                                <VisualShortPostPreviewModal
                                    isOpen={true}
                                    onClose={() => setCreatingVisualSource(null)}
                                    content={typeof creatingVisualSource.content === 'string' ? creatingVisualSource.content : creatingVisualSource.content[0]}
                                    blogId={blogId}
                                    sourceId={creatingVisualSource.id}
                                    onSaved={(visual) => {
                                        setVisuals(prev => [...prev, visual]);
                                        setHighlightVisualId(visual.id);
                                        setCreatingVisualSource(null);
                                    }}
                                />
                            )
                        )}
                    </>
                );

                if (visuals.length === 0) {
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
                                    onClick={() => setShowSourcePicker(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus size={16} />
                                    Create Visual
                                </button>
                            </div>
                            {sourcePickerContent}
                        </>
                    );
                }

                return (
                    <>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Visuals</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    {visuals.length} visual{visuals.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                    onClick={() => setShowSourcePicker(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                    <Plus size={14} />
                                    Create
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {visuals.map((visual, index) => {
                                const gradientPreset = GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0];
                                const contentText = Array.isArray(visual.content) ? visual.content[0] : visual.content;
                                const isBasic = visual.settings.style === 'basic';

                                const isHighlighted = highlightVisualId === visual.id;

                                return (
                                    <div
                                        key={visual.id}
                                        ref={isHighlighted ? (el) => {
                                            if (el) {
                                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                setTimeout(() => setHighlightVisualId(null), 2000);
                                            }
                                        } : undefined}
                                        className={`group relative rounded-xl border bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
                                            isHighlighted
                                                ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse'
                                                : 'border-gray-200'
                                        }`}
                                    >
                                        {/* Number badge */}
                                        <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white shadow-sm">
                                            {index + 1}
                                        </div>

                                        <div className="flex gap-4 p-4">
                                            {/* Left - Actual VisualPreview scaled down */}
                                            <div onClick={() => setViewingVisual(visual)} className="flex-shrink-0 w-44 h-44 rounded-lg overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity">
                                                <div className="absolute top-0 left-0 pointer-events-none" style={{ width: '500px', height: '500px', transform: 'scale(0.352)', transformOrigin: 'top left' }}>
                                                    <VisualPreview
                                                        content={contentText}
                                                        displayName={visual.settings.display_name}
                                                        handle={visual.settings.handle}
                                                        avatarUrl={visual.settings.avatar_url}
                                                        theme={visual.settings.theme}
                                                        style={visual.settings.style}
                                                        stats={visual.settings.stats || { views: 0, reposts: 0, quotes: 0, likes: 0, bookmarks: 0 }}
                                                        roundedCorners={visual.settings.corners === 'rounded'}
                                                        gradient={gradientPreset}
                                                    />
                                                </div>
                                            </div>

                                            {/* Right - Content + meta */}
                                            <div className="flex-1 min-w-0 flex flex-col">
                                                {/* Content preview */}
                                                <div className="mb-3 flex-1">
                                                    {contentText.split('\n').slice(0, 4).map((line, i) => (
                                                        <p key={i} className="text-sm leading-relaxed text-gray-800">
                                                            {line || <span className="block h-2" />}
                                                        </p>
                                                    ))}
                                                    {contentText.split('\n').length > 4 && (
                                                        <p className="text-sm text-gray-400">...</p>
                                                    )}
                                                </div>

                                                {/* Style badges */}
                                                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${visual.source_type === 'thread' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                        {visual.source_type === 'thread' ? `Thread · ${Array.isArray(visual.content) ? visual.content.length : 1} posts` : 'Short Post'}
                                                    </span>
                                                    <span className="rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{visual.settings.style}</span>
                                                    <span className="rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{visual.settings.theme}</span>
                                                    {!isBasic && (
                                                        <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                                                            <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${gradientPreset.swatch}`} />
                                                            {gradientPreset.label}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Footer actions */}
                                                <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                                                    <button
                                                        onClick={() => setViewingVisual(visual)}
                                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                                                        title="Edit visual"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const text = Array.isArray(visual.content) ? visual.content.join('\n\n---\n\n') : visual.content;
                                                            setSchedulingContentType('visual');
                                                            setSchedulingPost({
                                                                id: visual.source_id,
                                                                content: text,
                                                                emotions: [],
                                                                structure: '',
                                                                why_it_works: '',
                                                                media: [],
                                                                cta_content: '',
                                                                cta_media: [],
                                                                scheduled_post: null,
                                                                visualCount: 0,
                                                            });
                                                        }}
                                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                                                        title="Schedule"
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVisuals(prev => prev.filter(v => v.id !== visual.id));
                                                            deleteVisual(visual.id).catch(() => toast.error('Failed to delete visual'));
                                                        }}
                                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {viewingVisual && (
                            viewingVisual.source_type === 'thread' && Array.isArray(viewingVisual.content) ? (
                                <VisualThreadPreviewModal
                                    isOpen={true}
                                    onClose={() => setViewingVisual(null)}
                                    content={viewingVisual.content}
                                    blogId={blogId}
                                    sourceId={viewingVisual.source_id}
                                    visualId={viewingVisual.id}
                                    initialDescription={viewingVisual.description}
                                    initialSettings={viewingVisual.settings}
                                    onSaved={(updated) => {
                                        setVisuals(prev => prev.map(v => v.id === updated.id ? updated : v));
                                        setViewingVisual(null);
                                    }}
                                />
                            ) : (
                                <VisualShortPostPreviewModal
                                    isOpen={true}
                                    onClose={() => setViewingVisual(null)}
                                    content={Array.isArray(viewingVisual.content) ? viewingVisual.content[0] : viewingVisual.content}
                                    blogId={blogId}
                                    sourceId={viewingVisual.source_id}
                                    visualId={viewingVisual.id}
                                    initialDescription={viewingVisual.description}
                                    initialSettings={viewingVisual.settings}
                                    onSaved={(updated) => {
                                        setVisuals(prev => prev.map(v => v.id === updated.id ? updated : v));
                                        setViewingVisual(null);
                                    }}
                                />
                            )
                        )}

                        {sourcePickerContent}
                    </>
                );
            }

            case 'video':
                if (shortPosts.length === 0 && threads.length === 0) {
                    return <DependencyGate type="video" onSwitchTab={onSwitchTab} />;
                }
                return <EmptyState type="video" onGenerate={() => {}} isGenerating={false} />;

            default:
                return null;
        }
    };

    return (
        <div className="relative flex h-full flex-col bg-white">
            {isGenerating && (
                <GeneratingOverlay
                    title="Generating Short Posts"
                    description="Analyzing your blog content and crafting engaging short posts..."
                />
            )}
            {isGeneratingThreads && (
                <GeneratingOverlay
                    title="Generating Threads"
                    description="Analyzing your blog content and crafting engaging threads..."
                />
            )}
            <ConfirmGenerateModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleGenerateShortPosts}
                isPublished={isPublished}
            />
            <AddShortPostModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddShortPost}
            />
            <SchedulePostModal
                isOpen={!!schedulingPost}
                post={schedulingPost}
                blogId={blogId}
                contentType={schedulingContentType}
                onClose={() => setSchedulingPost(null)}
                onScheduled={handleScheduled}
            />
            <PublishNowModal
                isOpen={!!publishingPost}
                post={publishingPost}
                contentType={publishingContentType}
                onClose={() => setPublishingPost(null)}
            />
            {/* Content - No internal tabs, parent controls which content to show */}
            <div className="flex-1 overflow-y-auto p-6">
                {renderContent()}
            </div>
        </div>
    );
}
