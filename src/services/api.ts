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
// REPURPOSE API
// ============================================

export interface GeneratedTweet {
    generated_tweet: string;
    cta_tweet?: string;
    inspiration: {
        id: number;
        hook: string;
        content: string;
        structure: string;
        emotions: string[];
        why_it_works: string;
        media: unknown[];
    };
}

export interface GenerateTweetsResponse {
    tweets: GeneratedTweet[];
}

export async function generateTweets(
    blogContent: string,
    ctaLink?: string
): Promise<GenerateTweetsResponse> {
    return apiRequest<GenerateTweetsResponse>('/repurpose/generate-tweets', {
        blog_content: blogContent,
        ...(ctaLink && { cta_link: ctaLink }),
    });
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
    wp_status: 'draft' | 'published';
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
    data: { title?: string; content?: string; thumbnail?: string }
): Promise<BlogPost> {
    return apiRequest<BlogPost>(`/blogs/${id}`, data as Record<string, unknown>, 'PUT');
}

