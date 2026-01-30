/**
 * API Service
 *
 * Handles all API calls to the Laravel backend.
 * Base URL: http://localhost:8080/api
 */

// Configuration - TODO: Move to WordPress settings
const API_BASE_URL = 'http://127.0.0.1:8000/api';
const API_KEY = 'test-key-12345'; // TODO: Get from WordPress settings

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
    title: string;
    content: string;
    seo_description?: string;
}

// ============================================
// API CLIENT
// ============================================

async function apiRequest<T>(
    endpoint: string,
    data: Record<string, unknown>
): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        body: JSON.stringify(data),
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

export interface ProfileContext {
    business_type?: string;
    niche?: string;
    target_audience?: string;
}

export async function generateTopics(
    roughIdea: string,
    profile?: ProfileContext
): Promise<GenerateTopicsResponse> {
    return apiRequest<GenerateTopicsResponse>('/blog/generate-topics', {
        rough_idea: roughIdea,
        business_type: profile?.business_type,
        niche: profile?.niche,
        target_audience: profile?.target_audience,
    });
}

export async function generateOutline(
    topic: string,
    roughOutline?: string[],
    profile?: ProfileContext
): Promise<GenerateOutlineResponse> {
    return apiRequest<GenerateOutlineResponse>('/blog/generate-outline', {
        topic,
        rough_outline: roughOutline || [],
        business_type: profile?.business_type,
        niche: profile?.niche,
        target_audience: profile?.target_audience,
    });
}

export async function generateBlog(
    topic: string,
    outline: OutlineSection[],
    profile?: ProfileContext
): Promise<GenerateBlogResponse> {
    return apiRequest<GenerateBlogResponse>('/blog/generate-blog', {
        topic,
        outline,
        business_type: profile?.business_type,
        niche: profile?.niche,
        target_audience: profile?.target_audience,
    });
}

// ============================================
// REPURPOSE API
// ============================================

export interface GeneratedTweet {
    generated_tweet: string;
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
    blogContent: string
): Promise<GenerateTweetsResponse> {
    return apiRequest<GenerateTweetsResponse>('/repurpose/generate-tweets', {
        blog_content: blogContent,
    });
}
