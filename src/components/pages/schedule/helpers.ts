import type { ScheduledPost as ApiScheduledPost } from '@/types';
import type {
    Platform,
    DayOfWeek,
    WeeklySchedule,
    ScheduledPost,
    UpcomingSlot,
    QueueEntry,
} from './types';
import { API_TO_UI_PLATFORM, UI_TO_API_PLATFORM, DAY_KEYS } from './types';
import { buildSlotDate, getDateInTz } from '@/components/repurpose/modals/schedule-utils';

// ============================================
// API → UI MAPPING
// ============================================

function getSchedulableContent(apiPost: ApiScheduledPost): string {
    const s = apiPost.schedulable;
    if (!s) return '';
    if (apiPost.schedulable_type === 'thread')
        return s.hook || s.posts?.[0]?.content || '';
    if (apiPost.schedulable_type === 'visual') return s.description || '';
    return s.content || '';
}

export function mapApiPost(apiPost: ApiScheduledPost): ScheduledPost {
    const uiPlatform =
        API_TO_UI_PLATFORM[apiPost.platform] || (apiPost.platform as Platform);
    return {
        id: apiPost.id,
        ids: [apiPost.id],
        content: getSchedulableContent(apiPost),
        platform: uiPlatform,
        platforms: [uiPlatform],
        postType: (apiPost.schedulable_type === 'thread'
            ? 'thread'
            : 'short') as ScheduledPost['postType'],
        threadCount:
            apiPost.schedulable_type === 'thread'
                ? apiPost.schedulable?.posts?.length
                : undefined,
        scheduledAt: apiPost.scheduled_at,
        status: apiPost.status,
        blogTitle: apiPost.post?.title,
        postId: apiPost.post_id,
        schedulableId: apiPost.schedulable_id,
        hasRepost: !!apiPost.repost_schedule,
    };
}

const PLATFORM_ORDER: Platform[] = ['x', 'linkedin', 'threads', 'instagram', 'facebook'];

export function groupScheduledPosts(posts: ScheduledPost[]): ScheduledPost[] {
    const groups = new Map<string, ScheduledPost>();
    for (const post of posts) {
        const key = `${post.schedulableId}-${post.postType}-${post.scheduledAt}`;
        const existing = groups.get(key);
        if (existing) {
            existing.ids.push(...post.ids);
            if (!existing.platforms.includes(post.platform)) {
                existing.platforms.push(post.platform);
            }
            if (post.hasRepost) existing.hasRepost = true;
        } else {
            groups.set(key, { ...post, ids: [...post.ids], platforms: [...post.platforms] });
        }
    }
    // Sort platforms in consistent order
    for (const group of groups.values()) {
        group.platforms.sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b));
    }
    return Array.from(groups.values());
}

// ============================================
// SCHEDULE MAPPING
// ============================================

export function mapScheduleFromApi(schedule: Record<string, any>): WeeklySchedule {
    const result = {} as WeeklySchedule;
    for (const [day, data] of Object.entries(schedule)) {
        result[day as DayOfWeek] = {
            enabled: data.enabled,
            slots: data.slots.map((slot: any) => ({
                ...slot,
                platforms: slot.platforms.map(
                    (p: string) => API_TO_UI_PLATFORM[p] || p,
                ),
            })),
        };
    }
    return result;
}

export function mapScheduleToApi(schedule: WeeklySchedule): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [day, data] of Object.entries(schedule)) {
        result[day] = {
            enabled: data.enabled,
            slots: data.slots.map((slot) => ({
                ...slot,
                platforms: slot.platforms.map(
                    (p) => UI_TO_API_PLATFORM[p] || p,
                ),
            })),
        };
    }
    return result;
}

// ============================================
// FORMATTING
// ============================================

export function formatScheduleDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });
}

export function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// ============================================
// GROUPING & TIMELINE
// ============================================

export function groupPostsByDate(
    posts: ScheduledPost[],
    order: 'asc' | 'desc' = 'asc',
): Map<string, ScheduledPost[]> {
    const groups = new Map<string, ScheduledPost[]>();
    const dir = order === 'asc' ? 1 : -1;
    const sorted = [...posts].sort(
        (a, b) =>
            dir * (new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime()),
    );

    for (const post of sorted) {
        const dateKey = new Date(post.scheduledAt).toDateString();
        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey)!.push(post);
    }

    return groups;
}

export function generateSlotId(): string {
    return `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function getUpcomingSlotsFromSchedule(
    schedule: WeeklySchedule,
    maxSlots: number,
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): UpcomingSlot[] {
    const now = new Date();
    const slots: UpcomingSlot[] = [];
    const todayStr = getDateInTz(now, timezone);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = getDateInTz(tomorrowDate, timezone);

    for (let d = 0; d < 30 && slots.length < maxSlots; d++) {
        const baseDate = new Date(now);
        baseDate.setDate(baseDate.getDate() + d);
        const dayKey = DAY_KEYS[new Date(getDateInTz(baseDate, timezone) + 'T12:00:00').getDay()] as DayOfWeek;
        const daySchedule = schedule[dayKey];
        if (!daySchedule?.enabled) continue;

        for (const slot of daySchedule.slots) {
            if (slots.length >= maxSlots) break;
            const slotDate = buildSlotDate(baseDate, slot.time, timezone);

            if (slotDate <= now) continue;

            const slotDateStr = getDateInTz(slotDate, timezone);
            let dateLabel: string;
            if (slotDateStr === todayStr) {
                dateLabel = 'Today';
            } else if (slotDateStr === tomorrowStr) {
                dateLabel = 'Tomorrow';
            } else {
                dateLabel = slotDate.toLocaleDateString('en-US', { timeZone: timezone, weekday: 'long', month: 'short', day: 'numeric' });
            }

            const timeLabel = slotDate.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true });

            slots.push({
                date: slotDate,
                dateLabel,
                timeLabel,
                platforms: slot.platforms,
            });
        }
    }

    return slots;
}

export function buildQueueTimeline(
    posts: ScheduledPost[],
    schedule: WeeklySchedule | null,
    weeksAhead = 2,
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): QueueEntry[] {
    const slotsCount = schedule ? Object.values(schedule).reduce(
        (sum, day) => sum + (day.enabled ? day.slots.length : 0), 0
    ) * weeksAhead : 0;

    const upcomingSlots = schedule ? getUpcomingSlotsFromSchedule(schedule, Math.max(slotsCount, 14), timezone) : [];

    const entries: QueueEntry[] = [];

    for (const post of posts) {
        const d = new Date(post.scheduledAt);
        entries.push({
            type: 'post',
            dateKey: d.toDateString(),
            dateLabel: formatScheduleDate(post.scheduledAt),
            time: d,
            timeLabel: formatTime(post.scheduledAt),
            post,
        });
    }

    for (const slot of upcomingSlots) {
        if (slot.platforms.length === 0) continue;
        const slotTime = slot.date.getTime();
        const hasPost = posts.some((p) => {
            const postTime = new Date(p.scheduledAt).getTime();
            return Math.abs(postTime - slotTime) < 60000;
        });
        if (!hasPost) {
            entries.push({
                type: 'empty',
                dateKey: slot.date.toDateString(),
                dateLabel: slot.dateLabel,
                time: slot.date,
                timeLabel: slot.timeLabel,
                platforms: slot.platforms,
            });
        }
    }

    entries.sort((a, b) => a.time.getTime() - b.time.getTime());

    return entries;
}

export function groupEntriesByDate(entries: QueueEntry[]): Map<string, { label: string; entries: QueueEntry[] }> {
    const groups = new Map<string, { label: string; entries: QueueEntry[] }>();
    for (const entry of entries) {
        if (!groups.has(entry.dateKey)) {
            groups.set(entry.dateKey, { label: entry.dateLabel, entries: [] });
        }
        groups.get(entry.dateKey)!.entries.push(entry);
    }
    return groups;
}
