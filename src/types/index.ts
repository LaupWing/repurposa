// ============================================
// APP
// ============================================

export type PageType = "create" | "blogs" | "blog-view" | "schedule" | "settings" | "analytics";

// ============================================
// BLOG
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
    status: 'generating';
}

export interface PostStatusResponse {
    id: number;
    status: BlogPost['status'];
    title?: string;
    content?: string;
    seo_description?: string;
}

export interface WizardData {
    id: number;
    user_id: number;
    topic: string | null;
    target_audience: string | null;
    generated_topics: TopicSuggestion[] | null;
    rough_outline: string[] | null;
    outline: OutlineSection[] | null;
    current_step: number;
    created_at: string;
    updated_at: string;
}

export type BlogGenerationMode = 'quick' | 'researched' | 'citations';

export interface RefineTextResponse {
    text: string;
}

export interface BlogPost {
    id: number;
    title: string;
    content: string;
    seo_description?: string;
    thumbnail?: string;
    status: 'generating' | 'draft' | 'published' | 'out-of-sync' | 'failed';
    published_post_id?: number | null;
    published_post_url?: string | null;
    published_at?: string | null;
    topic?: string;
    outline?: OutlineSection[];
    short_posts?: ShortPost[];
    threads?: ThreadItem[];
    visuals?: Visual[];
    created_at?: string;
    updated_at?: string;
}

export interface PostVersion {
    id: number;
    version_number: number;
    title: string;
    content: string;
    change_type: string;
    restored_from_version_id: number | null;
    created_at: string;
}

// ============================================
// MEDIA
// ============================================

export interface MediaItem {
    url: string;
    type: 'image' | 'video';
    mime?: string;
    size?: number;
}

// ============================================
// SHORT POSTS
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
    platform_post_url?: string | null;
}

export interface ShortPostCta {
    content: string;
    media: string[] | null;
}

export interface ShortPost {
    id: number;
    content: string;
    cta_content?: ShortPostCta | null;
    media: MediaItem[] | null;
    metadata: ShortPostMetadata;
    scheduled_posts?: ShortPostSchedule[];
    visuals?: Visual[];
    created_at?: string;
    updated_at?: string;
}

export interface GenerateShortPostsResponse {
    short_posts: ShortPost[];
}

// ============================================
// THREADS
// ============================================

export interface ThreadPost {
    content: string;
    media: MediaItem[] | null;
}

export interface ThreadMetadata {
    inspiration_id: number;
    hook_techniques: string[];
    structure: string;
    emotions: string[];
    why_it_works: string;
}

export interface ThreadItem {
    id: number;
    hook: string;
    posts: ThreadPost[];
    metadata: ThreadMetadata;
    scheduled_posts?: ShortPostSchedule[];
}

export interface GenerateThreadsResponse {
    threads: ThreadItem[];
}

// ============================================
// VISUALS
// ============================================

export interface VisualSettings {
    style: 'basic' | 'minimal' | 'detailed';
    theme: 'light' | 'dark';
    corners: 'rounded' | 'square';
    gradient_id: string;
    font_family?: string;
    display_name: string;
    handle: string;
    avatar_url?: string;
    avatar_crop?: { x: number; y: number; width: number; height: number };
    stats?: {
        views: number;
        reposts: number;
        quotes: number;
        likes: number;
        bookmarks: number;
    };
    text_sizes?: Record<number, string>;
}

export interface Visual {
    id: number;
    post_id: number;
    source_type: 'short_post' | 'thread';
    source_id: number;
    content: string | string[];
    description?: string;
    settings: VisualSettings;
    scheduled_posts?: ShortPostSchedule[];
    created_at: string;
    updated_at: string;
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

export interface ThreadSwipe {
    id: number;
    user_id: number | null;
    hook: string;
    hook_techniques: string[];
    structure: string;
    posts: { content: string; media: unknown[] | null }[];
    emotions: string[];
    media: unknown[] | null;
    why_it_works: string;
}

// ============================================
// SOCIAL
// ============================================

export interface SocialAccount {
    id: number;
    platform: string;
    platform_user_id: string;
    platform_username: string;
    profile_picture: string | null;
    meta?: { pages?: Array<{ id: string; name: string; picture?: string }> } | null;
    connected_at: string;
}

// ============================================
// SCHEDULE
// ============================================

export interface ScheduledPost {
    id: number;
    social_account_id: number;
    post_id: number | null;
    platform: string;
    scheduled_at: string;
    status: 'pending' | 'publishing' | 'published' | 'failed';
    schedulable_type?: string;
    schedulable_id?: number;
    schedulable?: {
        id: number;
        content?: string;
        media?: string[] | null;
        hook?: string;
        posts?: { content: string; media: unknown }[];
        description?: string;
    } | null;
    social_account?: { id: number; platform: string; platform_username: string };
    post?: { id: number; title: string } | null;
    repost_schedule?: { id: number; scheduled_post_id: number } | null;
    created_at: string;
    updated_at: string;
}

export interface PublishNowResult {
    platform: string;
    status: 'published' | 'publishing' | 'failed' | 'partial';
    scheduled_post_id?: number;
    error?: string;
}

export interface PublishNowResponse {
    results: PublishNowResult[];
}

export interface PublishingScheduleResponse {
    schedule: Record<string, { enabled: boolean; slots: { id: string; time: string; platforms: string[] }[] }> | null;
    timezone: string;
}
