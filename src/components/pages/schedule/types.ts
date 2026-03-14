import { createElement } from '@wordpress/element';
import { MessageSquare, ListOrdered } from 'lucide-react';
import {
    RiTwitterXFill,
    RiLinkedinFill,
    RiThreadsFill,
    RiInstagramFill,
    RiFacebookFill,
} from 'react-icons/ri';

// ============================================
// TYPES
// ============================================

export type Platform = 'x' | 'linkedin' | 'threads' | 'instagram' | 'facebook';
export type PostType = 'short' | 'thread';
export type PostStatus = 'pending' | 'publishing' | 'published' | 'failed';
export type TabType = 'queue' | 'published' | 'drafts' | 'times';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduledPost {
    id: number;
    ids: number[];
    content: string;
    platform: Platform;
    platforms: Platform[];
    postType: PostType;
    threadCount?: number;
    scheduledAt: string;
    status: PostStatus;
    blogTitle?: string;
    postId?: number | null;
    schedulableId?: number;
}

export interface TimeSlot {
    id: string;
    time: string;
    platforms: Platform[];
}

export interface DaySchedule {
    enabled: boolean;
    slots: TimeSlot[];
}

export type WeeklySchedule = Record<DayOfWeek, DaySchedule>;

export interface UpcomingSlot {
    date: Date;
    dateLabel: string;
    timeLabel: string;
    platforms: Platform[];
}

export interface QueueEntry {
    type: 'post' | 'empty';
    dateKey: string;
    dateLabel: string;
    time: Date;
    timeLabel: string;
    post?: ScheduledPost;
    platforms?: Platform[];
}

// ============================================
// CONSTANTS
// ============================================

export const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
    { key: 'monday', label: 'Monday', short: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { key: 'thursday', label: 'Thursday', short: 'Thu' },
    { key: 'friday', label: 'Friday', short: 'Fri' },
    { key: 'saturday', label: 'Saturday', short: 'Sat' },
    { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export const PLATFORMS: {
    id: Platform;
    name: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
}[] = [
    { id: 'x', name: 'X', icon: createElement(RiTwitterXFill, { size: 14 }), color: 'text-black', bg: 'bg-black' },
    { id: 'linkedin', name: 'LinkedIn', icon: createElement(RiLinkedinFill, { size: 14 }), color: 'text-blue-700', bg: 'bg-blue-700' },
    { id: 'threads', name: 'Threads', icon: createElement(RiThreadsFill, { size: 14 }), color: 'text-gray-900', bg: 'bg-gray-900' },
    { id: 'instagram', name: 'Instagram', icon: createElement(RiInstagramFill, { size: 14 }), color: 'text-pink-600', bg: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: createElement(RiFacebookFill, { size: 14 }), color: 'text-blue-600', bg: 'bg-blue-600' },
];

export const POST_TYPES: { id: PostType; label: string; icon: React.ReactNode }[] = [
    { id: 'short', label: 'Short Post', icon: createElement(MessageSquare, { size: 13 }) },
    { id: 'thread', label: 'Thread', icon: createElement(ListOrdered, { size: 13 }) },
];

export const API_TO_UI_PLATFORM: Record<string, Platform> = {
    twitter: 'x',
    linkedin: 'linkedin',
    threads: 'threads',
    instagram: 'instagram',
    facebook: 'facebook',
};

export const UI_TO_API_PLATFORM: Record<Platform, string> = {
    x: 'twitter',
    linkedin: 'linkedin',
    threads: 'threads',
    instagram: 'instagram',
    facebook: 'facebook',
};

export const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
