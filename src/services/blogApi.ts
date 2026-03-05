import { apiRequest } from './client';
import type {
    GenerateTopicsResponse,
    GenerateOutlineResponse,
    GenerateBlogResponse,
    OutlineSection,
    BlogGenerationMode,
    RefineTextResponse,
    BlogPost,
    WizardData,
    PostVersion,
} from '@/types';

// ============================================
// BLOG GENERATION
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
    options?: { target_audience?: string; mode?: BlogGenerationMode }
): Promise<GenerateBlogResponse> {
    return apiRequest<GenerateBlogResponse>('/blog/generate-blog', {
        topic,
        outline,
        target_audience: options?.target_audience,
        mode: options?.mode || 'quick',
    });
}

export async function regenerateBlog(
    postId: number,
    options: {
        topic: string;
        outline: OutlineSection[];
        target_audience?: string;
        mode?: BlogGenerationMode;
    }
): Promise<GenerateBlogResponse> {
    return apiRequest<GenerateBlogResponse>(`/blog/${postId}/regenerate`, {
        topic: options.topic,
        outline: options.outline,
        target_audience: options.target_audience,
        mode: options.mode || 'quick',
    });
}

export async function refineOutline(
    topic: string,
    outline: OutlineSection[],
    instruction: string,
    options?: { target_audience?: string }
): Promise<GenerateOutlineResponse> {
    return apiRequest<GenerateOutlineResponse>('/blog/refine-outline', {
        topic,
        outline,
        instruction,
        target_audience: options?.target_audience,
    });
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
// BLOG CRUD
// ============================================

export async function getBlogs(): Promise<BlogPost[]> {
    const response = await apiRequest<{ data: BlogPost[] }>('/blogs', {}, 'GET');
    return response.data;
}

export async function getBlog(id: number): Promise<BlogPost> {
    return apiRequest<BlogPost>(`/blogs/${id}`, {}, 'GET');
}

export async function updateBlog(
    id: number,
    data: { title?: string; content?: string; thumbnail?: string; status?: BlogPost['status']; published_post_id?: number; published_post_url?: string }
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
// WIZARD
// ============================================

export async function getWizard(): Promise<WizardData> {
    return apiRequest<WizardData>('/wizard', {}, 'GET');
}

export async function createWizard(): Promise<WizardData> {
    return apiRequest<WizardData>('/wizard', {});
}

export async function updateWizard(
    data: Partial<Pick<WizardData, 'topic' | 'target_audience' | 'generated_topics' | 'rough_outline' | 'outline' | 'current_step'>>
): Promise<WizardData> {
    return apiRequest<WizardData>('/wizard', data as Record<string, unknown>, 'PUT');
}

// ============================================
// VERSIONS
// ============================================

export async function getVersions(postId: number): Promise<PostVersion[]> {
    const response = await apiRequest<{ data: PostVersion[] }>(`/blogs/${postId}/versions`, {}, 'GET');
    return response.data;
}

export async function createVersion(postId: number): Promise<PostVersion> {
    return apiRequest<PostVersion>(`/blogs/${postId}/versions`, {});
}

export async function restoreVersion(postId: number, versionId: number): Promise<PostVersion> {
    return apiRequest<PostVersion>(`/blogs/${postId}/versions/${versionId}/restore`, {});
}
