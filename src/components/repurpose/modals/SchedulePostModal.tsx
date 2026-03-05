import { useState, useEffect, useRef } from '@wordpress/element';
import {
    Check,
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    X,
    Trash2,
} from 'lucide-react';
import { createElement } from '@wordpress/element';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Tooltip } from '@wordpress/components';
import { getPublishingSchedule, createScheduledPost, getScheduledPosts, deleteScheduledPost } from '@/services/scheduleApi';
import { getSocialAccounts } from '@/services/profileApi';
import { renderVisual } from '@/services/repurposeApi';
import type { SocialAccount, ScheduledPost as ScheduledPostType, ShortPostSchedule, Visual } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import { VisualPreview, GRADIENT_PRESETS } from './VisualPreviewModal';
import {
    type SchedulePlatform,
    type ScheduleContentType,
    type UpcomingSlot,
    SCHEDULE_PLATFORMS,
    API_TO_UI_PLATFORM,
    UI_TO_API_PLATFORM,
    PLATFORM_CHAR_LIMITS,
    THREAD_NATIVE_PLATFORMS,
    getUnsupportedReason,
    getUpcomingSlots,
    getDefaultDate,
    getDefaultTime,
} from './schedule-utils';

interface SchedulePostModalProps {
    isOpen: boolean;
    post: ShortPostPattern | null;
    blogId?: number;
    contentType?: ScheduleContentType;
    visual?: Visual | null;
    threadPosts?: string[] | null;
    onClose: () => void;
    onScheduled: (newScheduledPosts?: ShortPostSchedule[]) => void;
    onUnscheduled?: (scheduledPostId: number) => void;
}

export default function SchedulePostModal({
    isOpen,
    post,
    blogId,
    contentType = 'short_post',
    visual,
    threadPosts,
    onClose,
    onScheduled,
    onUnscheduled,
}: SchedulePostModalProps) {
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
    const [removingId, setRemovingId] = useState<number | null>(null);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
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
                    const filterSupported = (ids: SchedulePlatform[]) => ids.filter((id) => !getUnsupportedReason(id, contentType, post?.content.length, threadPosts));
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

    // Structural block only (e.g. Instagram can't post text-only), ignoring char limits
    const platformIsStructurallyUnsupported = (id: SchedulePlatform, ct: ScheduleContentType) =>
        id === 'instagram' && (ct === 'short_post' || ct === 'thread');

    const contentLength = post.content.length;
    const overLimitPlatformNames = SCHEDULE_PLATFORMS.filter((p) => {
        if (platformIsStructurallyUnsupported(p.id, contentType)) return false;
        const limit = PLATFORM_CHAR_LIMITS[p.id];
        if (threadPosts && contentType === 'thread') {
            if (THREAD_NATIVE_PLATFORMS.has(p.id)) {
                return threadPosts.some(t => t.length > limit);
            }
            return threadPosts.reduce((sum, t) => sum + t.length, 0) > limit;
        }
        return contentLength > limit;
    }).map((p) => p.name);
    const connectedPlatformIds = socialAccounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);

    // Check if a slot time is already taken by an existing scheduled post
    const getSlotOccupant = (slot: UpcomingSlot): ScheduledPostType | null => {
        const slotTime = slot.date.getTime();
        return existingScheduled.find((sp) => {
            const spTime = new Date(sp.scheduled_at).getTime();
            return Math.abs(spTime - slotTime) < 60000;
        }) || null;
    };

    // Check which platforms this content was already published to
    const getPublishedInfo = (platformId: SchedulePlatform): ShortPostSchedule | undefined => {
        const apiPlatform = UI_TO_API_PLATFORM[platformId];
        return post.scheduled_posts?.find((sp) => sp.platform === apiPlatform && sp.status === 'published');
    };

    const togglePlatform = (id: SchedulePlatform) => {
        const unsupported = getUnsupportedReason(id, contentType, contentLength, threadPosts);
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
        setSelectedPlatforms(upcomingSlots[absoluteIndex].platforms.filter((id) => !getUnsupportedReason(id, contentType, contentLength, threadPosts)));
    };

    const handleUseCustom = () => {
        setUseCustom(true);
        setSelectedSlotIndex(null);
    };

    const platformIcons: Record<string, React.ReactNode> = {
        twitter: createElement(RiTwitterXFill, { size: 14 }),
        linkedin: createElement(RiLinkedinFill, { size: 14 }),
        threads: createElement(RiThreadsFill, { size: 14 }),
        instagram: createElement(RiInstagramFill, { size: 14 }),
        facebook: createElement(RiFacebookFill, { size: 14 }),
    };
    const platformDisplayNames: Record<string, string> = { twitter: 'X', linkedin: 'LinkedIn', threads: 'Threads', instagram: 'Instagram', facebook: 'Facebook' };

    const handleUnschedule = async (scheduledPostId: number) => {
        setRemovingId(scheduledPostId);
        try {
            await deleteScheduledPost(scheduledPostId);
            toast.success('Unscheduled');
            onUnscheduled?.(scheduledPostId);
        } catch (error) {
            toast.error('Failed to unschedule', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setRemovingId(null);
        }
    };

    // Computed visual data for offscreen rendering
    const visualSlides = visual ? (Array.isArray(visual.content) ? visual.content : [visual.content]) : [];
    const gradientPreset = visual ? (GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0]) : GRADIENT_PRESETS[0];

    const handleSchedule = async () => {
        if (selectedPlatforms.length === 0) return;

        const scheduledAt = selectedSlotIndex !== null && !useCustom
            ? upcomingSlots[selectedSlotIndex].date.toISOString()
            : new Date(`${date}T${time}`).toISOString();

        setIsSubmitting(true);
        try {
            // For visuals: capture offscreen slides as PNGs and upload
            if (contentType === 'visual' && visual) {
                const blobs: Blob[] = [];
                for (let i = 0; i < slideRefs.current.length; i++) {
                    const el = slideRefs.current[i];
                    if (!el) continue;
                    const dataUrl = await toPng(el, { quality: 1, pixelRatio: 2 });
                    const res = await fetch(dataUrl);
                    blobs.push(await res.blob());
                }
                if (blobs.length === 0) {
                    throw new Error('Failed to render visual slides');
                }
                await renderVisual(visual.id, blobs);
            }

            const promises = selectedPlatforms.map((platformId) => {
                const apiPlatform = UI_TO_API_PLATFORM[platformId];
                const account = socialAccounts.find((a) => a.platform === apiPlatform);
                if (!account) return Promise.resolve(null);
                return createScheduledPost({
                    social_account_id: account.id,
                    scheduled_at: scheduledAt,
                    schedulable_type: contentType,
                    schedulable_id: post.id,
                    ...(blogId && { post_id: blogId }),
                });
            });

            const results = (await Promise.all(promises)).filter(Boolean) as ScheduledPostType[];
            const newScheduledPosts: ShortPostSchedule[] = results.map(r => ({
                id: r.id,
                platform: r.platform,
                status: r.status,
                scheduled_at: r.scheduled_at,
            }));

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
            onScheduled(newScheduledPosts);
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
            {/* Offscreen visual slide rendering for PNG capture */}
            {visual && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    {visualSlides.map((text, i) => (
                        <div key={i} ref={(el) => { slideRefs.current[i] = el; }}>
                            <VisualPreview
                                content={text}
                                displayName={visual.settings.display_name}
                                handle={visual.settings.handle}
                                avatarUrl={visual.settings.avatar_url}
                                theme={visual.settings.theme}
                                style={visual.settings.style}
                                stats={visual.settings.stats || { views: 0, reposts: 0, quotes: 0, likes: 0, bookmarks: 0 }}
                                roundedCorners={visual.settings.corners === 'rounded'}
                                gradient={gradientPreset}
                                textSize={(visual.settings.text_sizes?.[i] as any) || null}
                            />
                        </div>
                    ))}
                </div>
            )}
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
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-400">
                                {threadPosts && contentType === 'thread'
                                    ? `${threadPosts.length} posts`
                                    : `${contentLength} chars`}
                            </span>
                            <span className="text-xs text-gray-300">·</span>
                            {SCHEDULE_PLATFORMS.filter((p) => !(platformIsStructurallyUnsupported(p.id, contentType))).map((p) => {
                                const limit = PLATFORM_CHAR_LIMITS[p.id];
                                let displayLength: number;
                                let over: boolean;
                                if (threadPosts && contentType === 'thread') {
                                    if (THREAD_NATIVE_PLATFORMS.has(p.id)) {
                                        displayLength = Math.max(...threadPosts.map(t => t.length));
                                        over = threadPosts.some(t => t.length > limit);
                                    } else {
                                        displayLength = threadPosts.reduce((sum, t) => sum + t.length, 0);
                                        over = displayLength > limit;
                                    }
                                } else {
                                    displayLength = contentLength;
                                    over = contentLength > limit;
                                }
                                const label = threadPosts && contentType === 'thread' && THREAD_NATIVE_PLATFORMS.has(p.id)
                                    ? `longest ${displayLength.toLocaleString()}`
                                    : displayLength.toLocaleString();
                                return (
                                    <span
                                        key={p.id}
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                            over
                                                ? 'bg-red-50 text-red-600 border border-red-200'
                                                : 'bg-green-50 text-green-600 border border-green-200'
                                        }`}
                                    >
                                        {p.name} {label}/{limit.toLocaleString()}
                                    </span>
                                );
                            })}
                        </div>
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

                    {/* Character limit warning */}
                    {overLimitPlatformNames.length > 0 && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-amber-300 bg-amber-50">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">
                                Your text exceeds the character limit for{' '}
                                <strong>{overLimitPlatformNames.join(', ')}</strong>
                                . To post there, shorten the {contentType === 'visual' ? 'description of the visual' : contentType === 'thread' ? 'thread' : 'short post'} first.
                            </p>
                        </div>
                    )}

                    {/* Already published platforms */}
                    {(() => {
                        const publishedPosts = post.scheduled_posts?.filter((sp) => sp.status === 'published') || [];
                        if (publishedPosts.length === 0) return null;
                        return (
                            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-green-300 bg-green-50">
                                <Check size={16} className="text-green-500 shrink-0" />
                                <div className="flex flex-wrap items-center gap-2 text-xs text-green-700">
                                    <span>Already published on</span>
                                    {publishedPosts.map((sp) => {
                                        const uiId = API_TO_UI_PLATFORM[sp.platform] || sp.platform;
                                        const name = SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.name || sp.platform;
                                        const date = new Date(sp.scheduled_at);
                                        return (
                                            <Tooltip key={sp.id} text={`Published on ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`} delay={0} placement="top">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-200 text-green-700 font-medium cursor-default">
                                                    {SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.icon}
                                                    {name} · {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

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
                                            text={isTaken ? `Already taken: "${(occupant.schedulable?.content || occupant.schedulable?.hook || '').slice(0, 80)}${(occupant.schedulable?.content || occupant.schedulable?.hook || '').length > 80 ? '...' : ''}"` : ''}
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
                                                            Taken by: {(occupant.schedulable?.content || occupant.schedulable?.hook || '').slice(0, 40)}{(occupant.schedulable?.content || occupant.schedulable?.hook || '').length > 40 ? '...' : ''}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {SCHEDULE_PLATFORMS.map((p) => {
                                                        const inSlot = slot.platforms.includes(p.id);
                                                        const active = isSelected && selectedPlatforms.includes(p.id);
                                                        const connected = connectedPlatformIds.includes(p.id);
                                                        const unsupported = getUnsupportedReason(p.id, contentType, contentLength, threadPosts);
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
                                                        const published = getPublishedInfo(p.id);
                                                        return (
                                                            <Tooltip key={p.id} text={published ? `Published ${new Date(published.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} delay={0} placement="top">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isTaken) return;
                                                                        if (!isSelected) handleSelectSlot(absoluteIdx);
                                                                        togglePlatform(p.id);
                                                                    }}
                                                                    disabled={isTaken}
                                                                    className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md transition-all ${
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
                                                                    {published && (
                                                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                                                            <Check size={8} className="text-white" />
                                                                        </span>
                                                                    )}
                                                                </button>
                                                            </Tooltip>
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
                                        const unsupported = getUnsupportedReason(p.id, contentType, contentLength, threadPosts);
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
                                        const published = getPublishedInfo(p.id);
                                        return (
                                            <Tooltip key={p.id} text={published ? `Published ${new Date(published.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} delay={0} placement="top">
                                                <button
                                                    onClick={() => togglePlatform(p.id)}
                                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        !connected
                                                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                            : active
                                                                ? `${p.bg} text-white`
                                                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                                                    }`}
                                                >
                                                    {p.icon}
                                                    {p.name}
                                                    {published && <Check size={12} className={active ? 'text-white/70' : 'text-green-500'} />}
                                                </button>
                                            </Tooltip>
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
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
                    {/* Left - Unschedule (only for pending posts) */}
                    <div>
                        {(() => {
                            const pendingPosts = post.scheduled_posts?.filter((sp) => sp.status === 'pending') || [];
                            if (pendingPosts.length === 0) return null;
                            return (
                                <button
                                    onClick={async () => {
                                        await Promise.all(pendingPosts.map(sp => handleUnschedule(sp.id)));
                                        onClose();
                                    }}
                                    disabled={removingId !== null}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    {removingId !== null ? 'Removing...' : 'Unschedule'}
                                </button>
                            );
                        })()}
                    </div>
                    {/* Right - Cancel + Schedule */}
                    <div className="flex items-center gap-3">
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
                        {isSubmitting ? (visual ? 'Rendering & Scheduling...' : 'Scheduling...') : 'Schedule'}
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
