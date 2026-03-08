import type { SocialAccount, ScheduledPost as ScheduledPostType, ShortPostSchedule } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import {
    type SchedulePlatform,
    type ScheduleContentType,
    type UpcomingSlot,
    SCHEDULE_PLATFORMS,
    API_TO_UI_PLATFORM,
    UI_TO_API_PLATFORM,
    getUnsupportedReason,
} from '../schedule-utils';

export type PlatformStateKind = 'available' | 'taken' | 'published' | 'pending' | 'failed' | 'unsupported' | 'disconnected';

export interface PlatformState {
    kind: PlatformStateKind;
    disabled: boolean;
    reason: string;
    scheduledPost?: ShortPostSchedule;
}

export function buildPlatformStates(
    post: ShortPostPattern,
    contentType: ScheduleContentType,
    threadPosts: string[] | null | undefined,
    socialAccounts: SocialAccount[],
    existingScheduled: ScheduledPostType[],
    slot?: UpcomingSlot,
) {
    const connectedPlatforms = socialAccounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);
    const contentLength = post.content.length;

    const states = new Map<SchedulePlatform, PlatformState>();

    for (const p of SCHEDULE_PLATFORMS) {
        // 1. Unsupported (Instagram text-only, char limit, no FB page)
        const unsupported = getUnsupportedReason(p.id, contentType, contentLength, threadPosts, socialAccounts);
        if (unsupported) {
            states.set(p.id, { kind: 'unsupported', disabled: true, reason: unsupported });
            continue;
        }

        // 2. Disconnected
        if (!connectedPlatforms.includes(p.id)) {
            states.set(p.id, { kind: 'disconnected', disabled: true, reason: `Connect ${p.name} first` });
            continue;
        }

        // 3. Check this content's own scheduled posts
        const apiPlatform = UI_TO_API_PLATFORM[p.id];
        const sp = post.scheduled_posts?.find((s) => s.platform === apiPlatform);

        if (sp?.status === 'published' || sp?.status === 'publishing') {
            const date = new Date(sp.scheduled_at);
            states.set(p.id, {
                kind: 'published',
                disabled: false,
                reason: `Published ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                scheduledPost: sp,
            });
            continue;
        }

        if (sp?.status === 'failed') {
            states.set(p.id, {
                kind: 'failed',
                disabled: false,
                reason: 'Failed — retry by selecting this platform',
                scheduledPost: sp,
            });
            continue;
        }

        if (sp?.status === 'pending') {
            const date = new Date(sp.scheduled_at);
            states.set(p.id, {
                kind: 'pending',
                disabled: false,
                reason: `Scheduled for ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
                scheduledPost: sp,
            });
            continue;
        }

        // 4. Taken by other content at this slot time
        if (slot) {
            const slotTime = slot.date.getTime();
            const occupant = existingScheduled.find((s) => {
                if (s.schedulable_type === contentType && s.schedulable_id === post.id) return false;
                if (API_TO_UI_PLATFORM[s.platform] !== p.id) return false;
                return Math.abs(new Date(s.scheduled_at).getTime() - slotTime) < 60000;
            });
            if (occupant) {
                const preview = (typeof occupant.schedulable?.content === 'string'
                    ? occupant.schedulable.content
                    : occupant.schedulable?.hook || occupant.schedulable?.description || ''
                ).slice(0, 50);
                states.set(p.id, {
                    kind: 'taken',
                    disabled: true,
                    reason: `Taken: "${preview}${preview.length >= 50 ? '...' : ''}"`,
                });
                continue;
            }
        }

        // 5. Available
        states.set(p.id, { kind: 'available', disabled: false, reason: '' });
    }

    return states;
}
