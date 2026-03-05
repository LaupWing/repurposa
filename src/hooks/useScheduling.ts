import { useState } from '@wordpress/element';
import type { Visual, ShortPostSchedule, ThreadItem } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import type { ScheduleContentType } from '@/components/repurpose/modals';

function threadToPattern(thread: ThreadItem): ShortPostPattern {
    return {
        id: thread.id,
        content: thread.posts.map(p => p.content).join('\n\n---\n\n'),
        emotions: thread.metadata.emotions,
        structure: thread.metadata.structure,
        why_it_works: thread.metadata.why_it_works,
        media: [],
        cta_media: [],
        visualCount: 0,
    };
}

function visualToPattern(visual: Visual): ShortPostPattern {
    const text = Array.isArray(visual.content) ? visual.content.join('\n\n---\n\n') : visual.content;
    return {
        id: visual.id,
        content: visual.description || text,
        emotions: [],
        structure: '',
        why_it_works: '',
        media: [],
        cta_content: '',
        cta_media: [],
        scheduled_posts: [],
        visualCount: 0,
    };
}

export function useScheduling() {
    const [schedulingPost, setSchedulingPost] = useState<ShortPostPattern | null>(null);
    const [schedulingContentType, setSchedulingContentType] = useState<ScheduleContentType>('short_post');
    const [schedulingVisual, setSchedulingVisual] = useState<Visual | null>(null);
    const [schedulingThreadPosts, setSchedulingThreadPosts] = useState<string[] | null>(null);
    const [publishingPost, setPublishingPost] = useState<ShortPostPattern | null>(null);
    const [publishingContentType, setPublishingContentType] = useState<ScheduleContentType>('short_post');

    const scheduleShortPost = (pattern: ShortPostPattern) => {
        setSchedulingPost(pattern);
        setSchedulingContentType('short_post');
    };

    const scheduleThread = (thread: ThreadItem) => {
        setSchedulingContentType('thread');
        setSchedulingThreadPosts(thread.posts.map(p => p.content));
        setSchedulingPost(threadToPattern(thread));
    };

    const scheduleVisual = (visual: Visual) => {
        setSchedulingContentType('visual');
        setSchedulingVisual(visual);
        setSchedulingPost(visualToPattern(visual));
    };

    const publishShortPost = (pattern: ShortPostPattern) => {
        setPublishingPost(pattern);
        setPublishingContentType('short_post');
    };

    const publishThread = (thread: ThreadItem) => {
        setPublishingContentType('thread');
        setPublishingPost(threadToPattern(thread));
    };

    const clearScheduling = () => {
        setSchedulingPost(null);
        setSchedulingVisual(null);
        setSchedulingThreadPosts(null);
    };

    const clearPublishing = () => {
        setPublishingPost(null);
    };

    const handleScheduled = (newScheduledPosts?: ShortPostSchedule[]): {
        contentType: ScheduleContentType;
        postId: number;
        visualId: number | null;
        scheduledPosts: ShortPostSchedule[];
    } | null => {
        if (!newScheduledPosts || newScheduledPosts.length === 0 || !schedulingPost) {
            clearScheduling();
            return null;
        }

        const result = {
            contentType: schedulingContentType,
            postId: schedulingPost.id,
            visualId: schedulingVisual?.id ?? null,
            scheduledPosts: newScheduledPosts,
        };

        clearScheduling();
        return result;
    };

    const handlePublished = (publishedPosts: ShortPostSchedule[]): {
        contentType: ScheduleContentType;
        postId: number;
        publishedPosts: ShortPostSchedule[];
    } | null => {
        if (!publishingPost || publishedPosts.length === 0) return null;

        return {
            contentType: publishingContentType,
            postId: publishingPost.id,
            publishedPosts,
        };
    };

    const removeScheduledFromModal = (scheduledPostId: number) => {
        setSchedulingPost(prev => prev
            ? { ...prev, scheduled_posts: (prev.scheduled_posts || []).filter(sp => sp.id !== scheduledPostId) }
            : prev
        );
    };

    return {
        schedulingPost,
        schedulingContentType,
        schedulingVisual,
        schedulingThreadPosts,
        publishingPost,
        publishingContentType,
        scheduleShortPost,
        scheduleThread,
        scheduleVisual,
        publishShortPost,
        publishThread,
        clearScheduling,
        clearPublishing,
        handleScheduled,
        handlePublished,
        removeScheduledFromModal,
    };
}
