import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { createElement } from '@wordpress/element';

// ============================================
// TYPES
// ============================================

export type SchedulePlatform = 'x' | 'linkedin' | 'threads' | 'instagram' | 'facebook';

export type ScheduleContentType = 'short_post' | 'thread' | 'visual';

// ============================================
// CONSTANTS
// ============================================

export const SCHEDULE_PLATFORMS: { id: SchedulePlatform; name: string; icon: React.ReactNode; bg: string }[] = [
    { id: 'x', name: 'X', icon: createElement(RiTwitterXFill, { size: 14 }), bg: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', icon: createElement(RiLinkedinFill, { size: 14 }), bg: 'bg-blue-700' },
    { id: 'threads', name: 'Threads', icon: createElement(RiThreadsFill, { size: 14 }), bg: 'bg-gray-900' },
    { id: 'instagram', name: 'Instagram', icon: createElement(RiInstagramFill, { size: 14 }), bg: 'bg-pink-600' },
    { id: 'facebook', name: 'Facebook', icon: createElement(RiFacebookFill, { size: 14 }), bg: 'bg-blue-600' },
];

export const API_TO_UI_PLATFORM: Record<string, SchedulePlatform> = { twitter: 'x', linkedin: 'linkedin', threads: 'threads', instagram: 'instagram', facebook: 'facebook' };
export const UI_TO_API_PLATFORM: Record<SchedulePlatform, string> = { x: 'twitter', linkedin: 'linkedin', threads: 'threads', instagram: 'instagram', facebook: 'facebook' };

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

// ============================================
// HELPERS
// ============================================

export function getUnsupportedReason(platformId: SchedulePlatform, contentType: ScheduleContentType): string | null {
    if (platformId === 'instagram' && (contentType === 'short_post' || contentType === 'thread')) {
        return 'Instagram requires an image — use Visuals instead';
    }
    return null;
}

export interface UpcomingSlot {
    date: Date;
    dateLabel: string;
    timeLabel: string;
    platforms: SchedulePlatform[];
}

export function getUpcomingSlots(
    schedule: Record<string, { enabled: boolean; slots: { id: string; time: string; platforms: string[] }[] }>,
    maxSlots: number,
): UpcomingSlot[] {
    const now = new Date();
    const slots: UpcomingSlot[] = [];

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

export function getDefaultDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

export function getDefaultTime(): string {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toTimeString().slice(0, 5);
}
