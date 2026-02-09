/**
 * API Service
 *
 * Handles all API calls to the Laravel backend.
 * Config is passed from PHP via wp_localize_script as window.wbrpConfig.
 */

declare global {
    interface Window {
        wbrpConfig: {
            apiUrl: string;
            token: string;
        };
    }
}

const getConfig = () => window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

// ============================================
// TYPES
// ============================================

export interface TopicSuggestion {
    title: string;
    why_it_works: string;
}

export interface GenerateTopicsResponse {
    suggestions: TopicSuggestion[];
}

export interface OutlineSection {
    title: string;
    purpose: string;
}

export interface GenerateOutlineResponse {
    sections: OutlineSection[];
}

export interface GenerateBlogResponse {
    id: number;
    title: string;
    content: string;
    seo_description?: string;
}

export interface TopicHistoryEntry {
    text: string;
    label: string;
}

export interface WizardData {
    id: number;
    user_id: number;
    topic: string | null;
    target_audience: string | null;
    generated_topics: TopicSuggestion[] | null;
    topic_history: TopicHistoryEntry[] | null;
    topic_history_index: number;
    rough_outline: string[] | null;
    outline: OutlineSection[] | null;
    current_step: number;
    created_at: string;
    updated_at: string;
}

// ============================================
// API CLIENT
// ============================================

async function apiRequest<T>(
    endpoint: string,
    data: Record<string, unknown>,
    method: string = 'POST'
): Promise<T> {
    const { apiUrl, token } = getConfig();
    const response = await fetch(`${apiUrl}/api${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}

// ============================================
// API METHODS
// ============================================

export async function generateTopics(
    roughIdea: string,
    options?: { target_audience?: string }
): Promise<GenerateTopicsResponse> {
    return apiRequest<GenerateTopicsResponse>('/blog/generate-topics', {
        rough_idea: roughIdea,
        target_audience: options?.target_audience,
    });
}

export async function generateOutline(
    topic: string,
    roughOutline?: string[],
    options?: { target_audience?: string }
): Promise<GenerateOutlineResponse> {
    return apiRequest<GenerateOutlineResponse>('/blog/generate-outline', {
        topic,
        rough_outline: roughOutline || [],
        target_audience: options?.target_audience,
    });
}

export async function generateBlog(
    topic: string,
    outline: OutlineSection[],
    options?: { target_audience?: string }
): Promise<GenerateBlogResponse> {
    return apiRequest<GenerateBlogResponse>('/blog/generate-blog', {
        topic,
        outline,
        target_audience: options?.target_audience,
    });
}

export interface RefineTextResponse {
    text: string;
}

export async function refineText(
    text: string,
    instruction: string
): Promise<RefineTextResponse> {
    return apiRequest<RefineTextResponse>('/refine-text', {
        text,
        instruction,
    });
}

// ============================================
// SHORT POSTS API
// ============================================

export interface ShortPostMetadata {
    inspiration_id: number;
    hook: string;
    structure: string;
    emotions: string[];
    why_it_works: string;
    media: unknown[];
}

export interface ShortPostSchedule {
    id: number;
    platform: string;
    status: 'pending' | 'publishing' | 'published' | 'failed';
    scheduled_at: string;
}

export interface ShortPostCta {
    content: string;
    media: string[] | null;
}

export interface ShortPost {
    id: number;
    content: string;
    cta_content?: ShortPostCta | null;
    media: string[] | null;
    metadata: ShortPostMetadata;
    scheduled_post?: ShortPostSchedule | null;
}

export interface GenerateShortPostsResponse {
    short_posts: ShortPost[];
}

export async function generateShortPosts(
    postId: number,
    blogContent: string,
    ctaLink?: string
): Promise<GenerateShortPostsResponse> {
    return apiRequest<GenerateShortPostsResponse>('/repurpose/generate-short-posts', {
        post_id: postId,
        blog_content: blogContent,
        ...(ctaLink && { cta_link: ctaLink }),
    });
}

export async function getShortPosts(postId: number): Promise<ShortPost[]> {
    const response = await apiRequest<{ data: ShortPost[] }>(`/blogs/${postId}/short-posts`, {}, 'GET');
    return response.data;
}

export async function updateShortPost(shortPostId: number, data: {
    content?: string;
    media?: string[];
    cta_content?: { content: string; media: string[] | null } | null;
}): Promise<ShortPost> {
    return apiRequest<ShortPost>(`/repurpose/short-posts/${shortPostId}`, data as Record<string, unknown>, 'PATCH');
}

export interface Swipe {
    id: number;
    user_id: number | null;
    hook: string;
    content: string;
    emotions: string[];
    structure: string;
    media: unknown[] | null;
    why_it_works: string;
}

export async function getSwipes(): Promise<Swipe[]> {
    const response = await apiRequest<{ data: Swipe[] }>('/repurpose/swipes', {}, 'GET');
    return response.data;
}

// ============================================
// WIZARD API
// ============================================

export async function getWizard(): Promise<WizardData> {
    return apiRequest<WizardData>('/wizard', {}, 'GET');
}

export async function createWizard(): Promise<WizardData> {
    return apiRequest<WizardData>('/wizard', {});
}

export async function updateWizard(
    data: Partial<Pick<WizardData, 'topic' | 'target_audience' | 'generated_topics' | 'topic_history' | 'topic_history_index' | 'rough_outline' | 'outline' | 'current_step'>>
): Promise<WizardData> {
    return apiRequest<WizardData>('/wizard', data as Record<string, unknown>, 'PUT');
}

// ============================================
// BLOG API
// ============================================

export interface BlogPost {
    id: number;
    title: string;
    content: string;
    seo_description?: string;
    thumbnail?: string;
    wp_status: 'draft' | 'published' | 'out-of-sync';
    published_post_id?: number | null;
    published_post_url?: string | null;
    topic?: string;
    outline?: OutlineSection[];
    created_at?: string;
    updated_at?: string;
}

export async function getBlogs(): Promise<BlogPost[]> {
    const response = await apiRequest<{ data: BlogPost[] }>('/blogs', {}, 'GET');
    return response.data;
}

export async function getBlog(id: number): Promise<BlogPost> {
    return apiRequest<BlogPost>(`/blogs/${id}`, {}, 'GET');
}

export async function updateBlog(
    id: number,
    data: { title?: string; content?: string; thumbnail?: string; wp_status?: BlogPost['wp_status'] }
): Promise<BlogPost> {
    return apiRequest<BlogPost>(`/blogs/${id}`, data as Record<string, unknown>, 'PUT');
}

export async function createEmptyBlog(): Promise<BlogPost> {
    return apiRequest<BlogPost>('/blogs', {});
}

export async function deleteBlog(id: number): Promise<void> {
    await apiRequest<{ success: boolean }>(`/blogs/${id}`, {}, 'DELETE');
}

// ============================================
// SOCIAL CONNECTIONS API
// ============================================

export interface SocialAccount {
    id: number;
    platform: string;
    platform_user_id: string;
    platform_username: string;
    profile_picture: string | null;
    connected_at: string;
}

export async function getSocialAccounts(): Promise<SocialAccount[]> {
    return apiRequest<SocialAccount[]>('/social/accounts', {}, 'GET');
}

export async function disconnectSocialAccount(platform: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/social/${platform}/disconnect`, {}, 'DELETE');
}

// ============================================
// SCHEDULED POSTS API
// ============================================

export interface ScheduledPost {
    id: number;
    social_account_id: number;
    post_id: number | null;
    content: string;
    media: string[] | null;
    platform: string;
    scheduled_at: string;
    status: 'pending' | 'publishing' | 'published' | 'failed';
    schedulable_type?: string;
    schedulable_id?: number;
    social_account?: { id: number; platform: string; platform_username: string };
    post?: { id: number; title: string } | null;
    created_at: string;
    updated_at: string;
}

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
// PUBLISHING SCHEDULE API
// ============================================

export interface PublishingScheduleResponse {
    schedule: Record<string, { enabled: boolean; slots: { id: string; time: string; platforms: string[] }[] }> | null;
    timezone: string;
}

export async function getPublishingSchedule(): Promise<PublishingScheduleResponse> {
    return apiRequest<PublishingScheduleResponse>('/publishing-schedule', {}, 'GET');
}

export async function savePublishingSchedule(
    schedule: Record<string, { enabled: boolean; slots: { id: string; time: string; platforms: string[] }[] }>
): Promise<PublishingScheduleResponse> {
    return apiRequest<PublishingScheduleResponse>('/publishing-schedule', { schedule }, 'PUT');
}

