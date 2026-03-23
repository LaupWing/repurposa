import { useState, useEffect, useRef, useMemo } from '@wordpress/element';
import {
    Check,
    Calendar,
    Clock,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    X,
    Trash2,
    Repeat2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Tooltip } from '@wordpress/components';
import { getPublishingSchedule, createScheduledPost, updateScheduledPost, getScheduledPosts, deleteScheduledPost, getRepostSchedule } from '@/services/scheduleApi';
import { getSocialAccounts } from '@/services/profileApi';
import { renderVisual } from '@/services/repurposeApi';
import type { SocialAccount, ScheduledPost as ScheduledPostType, ShortPostSchedule, Visual } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import { VisualPreview, GRADIENT_PRESETS } from '../VisualPreviewModal';
import {
    type SchedulePlatform,
    type ScheduleContentType,
    type UpcomingSlot,
    SCHEDULE_PLATFORMS,
    UI_TO_API_PLATFORM,
    getUpcomingSlots,
    getDefaultDate,
    getDefaultTime,
} from '../schedule-utils';
import { type PlatformState, buildPlatformStates } from './platform-states';
import SlotCard from './SlotCard';
import StatusBars from './StatusBars';
import ContentPreview from './ContentPreview';
import AutoRepostModal from './AutoRepostModal';
import { useAutoRepost } from '@/hooks/useAutoRepost';

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

const SLOTS_PER_PAGE = 6;

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
    const [initialSelection, setInitialSelection] = useState<{ slotIndex: number | null; platforms: SchedulePlatform[] } | null>(null);
    const repost = useAutoRepost(socialAccounts, selectedPlatforms);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Compute platform states (no slot context — for global checks)
    const globalStates = useMemo(() => {
        if (!post) return new Map<SchedulePlatform, PlatformState>();
        return buildPlatformStates(post, contentType, threadPosts, socialAccounts, existingScheduled);
    }, [post, contentType, threadPosts, socialAccounts, existingScheduled]);

    // Determine initial selection based on scenarios
    const getInitialSelection = (slots: UpcomingSlot[], accounts: SocialAccount[], scheduled: ScheduledPostType[]) => {
        if (!post) return { slotIndex: null as number | null, slotPage: 0, platforms: [] as SchedulePlatform[] };

        const states = buildPlatformStates(post, contentType, threadPosts, accounts, scheduled);

        // Scenario 5: Already pending → navigate to that slot
        const ownPending = (post.scheduled_posts || []).filter((sp) => sp.status === 'pending');
        if (ownPending.length > 0) {
            const pendingSlotIdx = slots.findIndex((slot) => {
                const slotTime = slot.date.getTime();
                return ownPending.some((sp) => Math.abs(new Date(sp.scheduled_at).getTime() - slotTime) < 60000);
            });
            if (pendingSlotIdx !== -1) {
                const pendingPlatformIds = ownPending.map((sp) => {
                    const uiPlatform = Object.entries(UI_TO_API_PLATFORM).find(([, api]) => api === sp.platform)?.[0] as SchedulePlatform | undefined;
                    return uiPlatform;
                }).filter(Boolean) as SchedulePlatform[];
                return {
                    slotIndex: pendingSlotIdx,
                    slotPage: Math.floor(pendingSlotIdx / SLOTS_PER_PAGE),
                    platforms: pendingPlatformIds,
                };
            }
        }

        // Scenario 2: Failed → auto-select failed platforms
        const failedPlatforms = [...states.entries()]
            .filter(([, s]) => s.kind === 'failed')
            .map(([id]) => id);

        // Find first slot with at least one available platform
        const firstAvailable = slots.findIndex((slot) => {
            const slotStates = buildPlatformStates(post, contentType, threadPosts, accounts, scheduled, slot);
            return [...slotStates.values()].some((s) => !s.disabled);
        });

        const slotIdx = firstAvailable !== -1 ? firstAvailable : 0;

        if (failedPlatforms.length > 0) {
            return {
                slotIndex: firstAvailable !== -1 ? slotIdx : null,
                slotPage: Math.floor(slotIdx / SLOTS_PER_PAGE),
                platforms: failedPlatforms,
            };
        }

        // Scenario 4: New → use slot's publishing schedule platforms
        if (firstAvailable !== -1) {
            const slotStates = buildPlatformStates(post, contentType, threadPosts, accounts, scheduled, slots[slotIdx]);
            const available = slots[slotIdx].platforms.filter((id) => {
                const s = slotStates.get(id);
                return s && !s.disabled && s.kind !== 'published';
            });
            return {
                slotIndex: slotIdx,
                slotPage: Math.floor(slotIdx / SLOTS_PER_PAGE),
                platforms: available,
            };
        }

        return { slotIndex: null, slotPage: 0, platforms: ['x'] as SchedulePlatform[] };
    };

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
        repost.reset();

        setLoadingSlots(true);
        Promise.all([getPublishingSchedule(), getSocialAccounts(), getScheduledPosts({ status: 'pending' })])
            .then(([scheduleData, accounts, scheduled]) => {
                setSocialAccounts(accounts);
                setExistingScheduled(scheduled);

                if (scheduleData.schedule) {
                    const slots = getUpcomingSlots(scheduleData.schedule, 60);
                    setUpcomingSlots(slots);
                    const init = getInitialSelection(slots, accounts, scheduled);
                    setSelectedSlotIndex(init.slotIndex);
                    setSlotPage(init.slotPage);
                    setSelectedPlatforms(init.platforms);
                    // Only set initialSelection when editing an already-scheduled post
                    const hasPending = (post?.scheduled_posts || []).some((sp) => sp.status === 'pending');
                    setInitialSelection(hasPending ? { slotIndex: init.slotIndex, platforms: [...init.platforms] } : null);

                    // Fetch existing repost schedule from any pending scheduled post
                    const pendingRepostable = (post?.scheduled_posts || []).filter(
                        (sp) => sp.status === 'pending' && (sp.platform === 'twitter' || sp.platform === 'threads')
                    );
                    if (pendingRepostable.length > 0) {
                        getRepostSchedule(pendingRepostable[0].id).then((repostData) => {
                            if (repostData && repostData.status === 'active') {
                                repost.setIntervals(repostData.intervals);
                                repost.setEnabled(true);
                            }
                        }).catch(() => {});
                    }
                } else {
                    setUpcomingSlots([]);
                    setSelectedPlatforms(['x']);
                    setInitialSelection(null);
                }
            })
            .catch(() => {
                setUpcomingSlots([]);
            })
            .finally(() => setLoadingSlots(false));
    }, [isOpen]);

    if (!isOpen || !post) return null;

    const pendingPosts = post.scheduled_posts?.filter((sp) => sp.status === 'pending') || [];

    const handleSelectSlot = (absoluteIndex: number) => {
        setSelectedSlotIndex(absoluteIndex);
        setUseCustom(false);

        // Keep current selection but remove any platforms that are taken at the new slot
        const slotStates = buildPlatformStates(post, contentType, threadPosts, socialAccounts, existingScheduled, upcomingSlots[absoluteIndex]);
        const validPlatforms = selectedPlatforms.filter((id) => {
            const s = slotStates.get(id);
            return s && !s.disabled;
        });

        // If nothing valid remains, use slot's schedule platforms
        if (validPlatforms.length === 0) {
            const available = upcomingSlots[absoluteIndex].platforms.filter((id) => {
                const s = slotStates.get(id);
                return s && !s.disabled && s.kind !== 'published';
            });
            setSelectedPlatforms(available);
        } else {
            setSelectedPlatforms(validPlatforms);
        }
    };

    const togglePlatform = (id: SchedulePlatform) => {
        const state = globalStates.get(id);
        if (!state || state.kind === 'unsupported') return;
        if (state.kind === 'disconnected') {
            toast.error(state.reason, {
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

                const state = globalStates.get(platformId);
                if (state?.kind === 'pending' && state.scheduledPost) {
                    return updateScheduledPost(state.scheduledPost.id, { scheduled_at: scheduledAt });
                }

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

            // Create repost schedules for repostable platforms
            await repost.createSchedules(results.map(r => ({ id: r.id, platform: r.platform })));

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
            const hasReschedules = selectedPlatforms.some((id) => globalStates.get(id)?.kind === 'pending');
            const allReschedules = selectedPlatforms.every((id) => globalStates.get(id)?.kind === 'pending');
            toast.success(allReschedules ? 'Post rescheduled!' : hasReschedules ? 'Post scheduled & rescheduled!' : 'Post scheduled!', {
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

    // Visual rendering
    const visualSlides = visual ? (Array.isArray(visual.content) ? visual.content : [visual.content]) : [];
    const gradientPreset = visual ? (GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0]) : GRADIENT_PRESETS[0];

    // Pagination
    const pageStart = slotPage * SLOTS_PER_PAGE;
    const pageSlots = upcomingSlots.slice(pageStart, pageStart + SLOTS_PER_PAGE);
    const totalPages = Math.ceil(upcomingSlots.length / SLOTS_PER_PAGE);

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
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 overflow-hidden">
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
                    <ContentPreview post={post} contentType={contentType} threadPosts={threadPosts} />
                    <StatusBars post={post} />

                    {/* Slot picker or custom mode */}
                    {loadingSlots ? (
                        <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                            Loading your schedule...
                        </div>
                    ) : upcomingSlots.length === 0 || useCustom ? (
                        <div className="space-y-4">
                            {upcomingSlots.length === 0 && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                                    <Calendar size={16} className="text-gray-400 shrink-0" />
                                    <p className="text-xs text-gray-500">
                                        No publishing schedule set up yet. <a href="admin.php?page=repurposa-schedule" className="text-blue-600 hover:underline">Configure your times</a> to see quick-pick slots here.
                                    </p>
                                </div>
                            )}
                            {useCustom && upcomingSlots.length > 0 && (
                                <button
                                    onClick={() => { setUseCustom(false); if (selectedSlotIndex === null) handleSelectSlot(0); }}
                                    className="text-left px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all"
                                >
                                    Back to available slots
                                </button>
                            )}

                            {/* Platform selection (custom mode) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Platforms</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {SCHEDULE_PLATFORMS.map((p) => {
                                        const state = globalStates.get(p.id)!;
                                        const active = selectedPlatforms.includes(p.id);

                                        if (state.kind === 'unsupported') {
                                            return (
                                                <Tooltip key={p.id} text={state.reason} delay={0} placement="top">
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-400 text-gray-300 cursor-not-allowed">
                                                        {p.icon}
                                                        {p.name}
                                                        <AlertTriangle size={14} className="text-amber-500" />
                                                    </div>
                                                </Tooltip>
                                            );
                                        }

                                        return (
                                            <Tooltip key={p.id} text={state.reason} delay={0} placement="top">
                                                <button
                                                    onClick={() => togglePlatform(p.id)}
                                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                        state.kind === 'disconnected'
                                                            ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                            : active
                                                                ? `${p.bg} text-white`
                                                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                                                    }`}
                                                >
                                                    {p.icon}
                                                    {p.name}
                                                    {state.kind === 'published' && <Check size={12} className={active ? 'text-white/70' : 'text-green-500'} />}
                                                    {state.kind === 'pending' && <Clock size={12} className="text-blue-500" />}
                                                    {state.kind === 'failed' && <AlertTriangle size={12} className={active ? 'text-white/70' : 'text-red-500'} />}
                                                </button>
                                            </Tooltip>
                                        );
                                    })}
                                    {selectedPlatforms.some(p => p === 'x' || p === 'threads') && (
                                        <button
                                            onClick={() => repost.toggle()}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto ${
                                                repost.enabled
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                                            }`}
                                        >
                                            <Repeat2 size={12} />
                                            Auto-Repost
                                        </button>
                                    )}
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
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Next available slots</label>
                            <div className="grid grid-cols-2 gap-2 overflow-visible">
                                {pageSlots.map((slot, idx) => {
                                    const absoluteIdx = pageStart + idx;
                                    const slotStates = buildPlatformStates(post, contentType, threadPosts, socialAccounts, existingScheduled, slot);
                                    return (
                                        <SlotCard
                                            key={absoluteIdx}
                                            slot={slot}
                                            isSelected={selectedSlotIndex === absoluteIdx && !useCustom}
                                            platformStates={slotStates}
                                            selectedPlatforms={selectedPlatforms}
                                            autoRepost={repost.enabled}
                                            onSelect={() => handleSelectSlot(absoluteIdx)}
                                            onTogglePlatform={togglePlatform}
                                            onToggleAutoRepost={() => repost.toggle()}
                                        />
                                    );
                                })}
                            </div>
                            {/* Pagination + Custom time */}
                            <div className="mt-3 flex items-center justify-between">
                                <button
                                    onClick={() => { setUseCustom(true); setSelectedSlotIndex(null); }}
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
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <div>
                        {pendingPosts.length > 0 && (
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
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSchedule}
                            disabled={isSubmitting || selectedPlatforms.length === 0 || (
                                initialSelection !== null
                                && selectedSlotIndex === initialSelection.slotIndex
                                && !useCustom
                                && selectedPlatforms.length === initialSelection.platforms.length
                                && selectedPlatforms.every(p => initialSelection.platforms.includes(p))
                            )}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Calendar size={14} />
                            {isSubmitting ? (visual ? 'Rendering & Scheduling...' : 'Scheduling...') : 'Schedule'}
                        </button>
                    </div>
                </div>
            </div>

            {repost.showModal && <AutoRepostModal
                isOpen
                publishDate={
                    selectedSlotIndex !== null && !useCustom
                        ? upcomingSlots[selectedSlotIndex].date
                        : new Date(`${date}T${time}`)
                }
                intervals={repost.intervals}
                platforms={repost.platforms}
                availablePlatforms={repost.availablePlatforms}
                onSave={repost.save}
                onClose={repost.closeModal}
            />}
        </div>
    );
}
