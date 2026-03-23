import { useState, useEffect } from '@wordpress/element';
import { toast } from 'sonner';
import { getRepostSchedule, createRepostSchedule, deleteRepostSchedule } from '@/services/scheduleApi';
import type { SocialAccount } from '@/types';

export type RepostPlatform = 'x' | 'threads';

export interface RepostInterval {
    days: number;
    hours: number;
}

const REPOST_PLATFORM_IDS: RepostPlatform[] = ['x', 'threads'];

export function useAutoRepost(socialAccounts: SocialAccount[], selectedSchedulePlatforms?: string[]) {
    const [enabled, setEnabled] = useState(false);
    const [intervals, setIntervals] = useState<RepostInterval[]>([]);
    const [platforms, setPlatforms] = useState<RepostPlatform[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Only show repost-capable platforms that are both connected AND selected for scheduling
    const connectedRepost = REPOST_PLATFORM_IDS.filter(p =>
        socialAccounts.some(a => a.platform === (p === 'x' ? 'twitter' : p))
    );
    const availablePlatforms = selectedSchedulePlatforms
        ? connectedRepost.filter(p => selectedSchedulePlatforms.includes(p))
        : connectedRepost;

    // If selected platforms change and remove a repost platform, clean up
    useEffect(() => {
        if (!enabled || availablePlatforms.length > 0) return;
        // No repost-capable platforms left in the selection — disable repost
        setEnabled(false);
        setPlatforms([]);
    }, [availablePlatforms.length, enabled]);

    useEffect(() => {
        if (!enabled) return;
        // Remove any repost platforms that are no longer available
        setPlatforms(prev => {
            const filtered = prev.filter(p => availablePlatforms.includes(p));
            if (filtered.length === 0 && prev.length > 0) {
                setEnabled(false);
                return [];
            }
            return filtered.length !== prev.length ? filtered : prev;
        });
    }, [availablePlatforms.join(','), enabled]);

    const toggle = () => {
        if (enabled) {
            setEnabled(false);
        } else {
            setShowModal(true);
        }
    };

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);

    const save = (newIntervals: RepostInterval[], newPlatforms: RepostPlatform[]) => {
        setIntervals(newIntervals);
        setPlatforms(newPlatforms);
        setEnabled(true);
        setShowModal(false);
    };

    /** Create repost schedules for the given scheduled post IDs (call after scheduling) */
    const createSchedules = async (scheduledPostIds: { id: number; platform: string }[]) => {
        if (!enabled || intervals.length === 0) return;
        const repostable = scheduledPostIds.filter(
            r => r.platform === 'twitter' || r.platform === 'threads'
        );
        if (repostable.length === 0) return;
        await Promise.all(repostable.map(r => createRepostSchedule(r.id, intervals)));
    };

    const reset = () => {
        setEnabled(false);
        setIntervals([]);
        setPlatforms([]);
        setShowModal(false);
    };

    return {
        enabled,
        setEnabled,
        intervals,
        setIntervals,
        platforms,
        setPlatforms,
        availablePlatforms,
        showModal,
        setShowModal,
        toggle,
        openModal,
        closeModal,
        save,
        reset,
        createSchedules,
    };
}

/** Hook for existing scheduled posts (e.g. ScheduledPostDetail) that may already have a repost schedule */
export function useExistingRepost(opts: {
    scheduledPostIds: number[];
    postPlatforms: string[];
    initialHasRepost: boolean;
    isOpen: boolean;
    onUpdated: () => void;
}) {
    const { scheduledPostIds, postPlatforms, initialHasRepost, isOpen, onUpdated } = opts;
    const [enabled, setEnabled] = useState(initialHasRepost);
    const [intervals, setIntervals] = useState<RepostInterval[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    const repostPlatforms = postPlatforms.filter(
        p => REPOST_PLATFORM_IDS.includes(p as RepostPlatform)
    ) as RepostPlatform[];

    // Fetch existing intervals
    useEffect(() => {
        if (!isOpen || !enabled || scheduledPostIds.length === 0) return;
        getRepostSchedule(scheduledPostIds[0]).then(data => {
            if (data?.intervals) setIntervals(data.intervals);
        }).catch(() => {});
    }, [isOpen, enabled, scheduledPostIds[0]]);

    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);

    const save = async (newIntervals: RepostInterval[], _platforms: RepostPlatform[]) => {
        try {
            const repostableIds = scheduledPostIds.filter((_id, i) =>
                REPOST_PLATFORM_IDS.includes(postPlatforms[i] as RepostPlatform)
            );
            await Promise.all(repostableIds.map(id => createRepostSchedule(id, newIntervals)));
            setIntervals(newIntervals);
            setEnabled(true);
            setShowModal(false);
            toast.success('Repost schedule updated');
            onUpdated();
        } catch {
            toast.error('Failed to update repost schedule');
        }
    };

    const remove = async () => {
        setIsRemoving(true);
        try {
            const schedule = await getRepostSchedule(scheduledPostIds[0]);
            if (schedule?.id) {
                await deleteRepostSchedule(schedule.id);
            }
            setEnabled(false);
            setIntervals([]);
            toast.success('Repost schedule removed');
            onUpdated();
        } catch {
            toast.error('Failed to remove repost schedule');
        } finally {
            setIsRemoving(false);
        }
    };

    return {
        enabled,
        intervals,
        repostPlatforms,
        showModal,
        isRemoving,
        openModal,
        closeModal,
        save,
        remove,
    };
}
