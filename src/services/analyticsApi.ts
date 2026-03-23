import { apiRequest } from './client';

export interface AnalyticsSummary {
    totals: {
        post_count: number;
        total_views: number;
        total_likes: number;
        total_comments: number;
        total_shares: number;
        total_clicks: number;
    };
    by_platform: {
        platform: string;
        post_count: number;
        total_views: number;
        total_likes: number;
        total_comments: number;
        total_shares: number;
        total_clicks: number;
    }[];
    period: string;
}

export interface AnalyticsPost {
    id: number;
    post_id: number | null;
    platform: string;
    platform_post_url: string | null;
    schedulable_type: string;
    schedulable_id: number;
    published_at: string;
    post: { id: number; title: string } | null;
    schedulable_content: string | null;
    latest_analytics: {
        id: number;
        scheduled_post_id: number;
        platform: string;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        clicks: number;
        quotes: number | null;
        saves: number | null;
        reach: number | null;
        profile_clicks: number | null;
        fetched_at: string;
    } | null;
}

export async function getAnalyticsSummary(period: string = '30d'): Promise<AnalyticsSummary> {
    return apiRequest<AnalyticsSummary>(`/analytics/summary?period=${period}`, {}, 'GET');
}

export async function getAnalyticsPosts(period: string = '30d', platform?: string): Promise<AnalyticsPost[]> {
    const params = new URLSearchParams({ period });
    if (platform) params.set('platform', platform);
    const response = await apiRequest<{ data: AnalyticsPost[] }>(`/analytics?${params}`, {}, 'GET');
    return response.data;
}
