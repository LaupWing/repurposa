import { apiRequest } from './client';
import type {
    ScheduledPost,
    PublishNowResponse,
    PublishingScheduleResponse,
} from '../types';

// ============================================
// SCHEDULED POSTS
// ============================================

export async function createScheduledPost(data: {
    social_account_id: number;
    content: string;
    scheduled_at: string;
    post_id?: number;
    schedulable_type?: 'short_post' | 'visual';
    schedulable_id?: number;
    media?: string[];
}): Promise<ScheduledPost> {
    return apiRequest<ScheduledPost>('/scheduled-posts', data as Record<string, unknown>);
}

export async function getScheduledPosts(params?: {
    status?: string;
    platform?: string;
}): Promise<ScheduledPost[]> {
    const query = params
        ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
        : '';
    const response = await apiRequest<{ data: ScheduledPost[] }>(`/scheduled-posts${query}`, {}, 'GET');
    return response.data;
}

export async function updateScheduledPost(
    id: number,
    data: { scheduled_at?: string }
): Promise<ScheduledPost> {
    return apiRequest<ScheduledPost>(`/scheduled-posts/${id}`, data as Record<string, unknown>, 'PUT');
}

export async function deleteScheduledPost(id: number): Promise<void> {
    await apiRequest<void>(`/scheduled-posts/${id}`, {}, 'DELETE');
}

// ============================================
// PUBLISH NOW
// ============================================

export async function publishNow(data: {
    social_account_ids: number[];
    content: string;
    post_id?: number;
    schedulable_type?: 'short_post' | 'thread' | 'visual';
    schedulable_id?: number;
    media?: string[];
}): Promise<PublishNowResponse> {
    return apiRequest<PublishNowResponse>('/social/publish', data as Record<string, unknown>);
}

// ============================================
// PUBLISHING SCHEDULE
// ============================================

export async function getPublishingSchedule(): Promise<PublishingScheduleResponse> {
    return apiRequest<PublishingScheduleResponse>('/publishing-schedule', {}, 'GET');
}

export async function savePublishingSchedule(
    schedule: Record<string, { enabled: boolean; slots: { id: string; time: string; platforms: string[] }[] }>
): Promise<PublishingScheduleResponse> {
    return apiRequest<PublishingScheduleResponse>('/publishing-schedule', { schedule }, 'PUT');
}
