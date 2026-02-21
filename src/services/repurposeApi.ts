import { apiRequest, getConfig } from './client';
import type {
    ShortPost,
    GenerateShortPostsResponse,
    ThreadItem,
    GenerateThreadsResponse,
    Visual,
    VisualSettings,
    Swipe,
} from '@/types';

// ============================================
// SHORT POSTS
// ============================================

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

// ============================================
// THREADS
// ============================================

export async function getThreads(postId: number): Promise<ThreadItem[]> {
    const response = await apiRequest<{ data: ThreadItem[] }>(`/blogs/${postId}/threads`, {}, 'GET');
    return response.data;
}

export async function generateThreads(
    postId: number,
    blogContent: string
): Promise<GenerateThreadsResponse> {
    return apiRequest<GenerateThreadsResponse>('/repurpose/generate-threads', {
        post_id: postId,
        blog_content: blogContent,
    });
}

export async function updateThread(threadId: number, data: {
    hook?: string;
    posts?: { content: string; media: unknown }[];
}): Promise<ThreadItem> {
    return apiRequest<ThreadItem>(`/repurpose/threads/${threadId}`, data as Record<string, unknown>, 'PATCH');
}

// ============================================
// VISUALS
// ============================================

export async function getVisuals(blogId: number): Promise<Visual[]> {
    const response = await apiRequest<{ data: Visual[] }>(`/blogs/${blogId}/visuals`, {}, 'GET');
    return response.data;
}

export async function createVisual(blogId: number, data: {
    source_type: 'short_post' | 'thread';
    source_id: number;
    content: string[];
    description?: string;
    settings: VisualSettings;
}): Promise<Visual> {
    return apiRequest<Visual>(`/blogs/${blogId}/visuals`, data as unknown as Record<string, unknown>);
}

export async function updateVisual(visualId: number, data: {
    content?: string[];
    description?: string;
    settings?: VisualSettings;
}): Promise<Visual> {
    return apiRequest<Visual>(`/visuals/${visualId}`, data as unknown as Record<string, unknown>, 'PATCH');
}

export async function deleteVisual(visualId: number): Promise<void> {
    await apiRequest<void>(`/visuals/${visualId}`, {}, 'DELETE');
}

export async function renderVisual(visualId: number, images: Blob[]): Promise<{ images: string[] }> {
    const { apiUrl, token } = getConfig();
    const formData = new FormData();
    images.forEach((blob, i) => {
        formData.append('slides[]', blob, `slide-${i + 1}.png`);
    });

    const response = await fetch(`${apiUrl}/api/visuals/${visualId}/render`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}

// ============================================
// SWIPES
// ============================================

export async function getSwipes(): Promise<Swipe[]> {
    const response = await apiRequest<{ data: Swipe[] }>('/repurpose/swipes', {}, 'GET');
    return response.data;
}
