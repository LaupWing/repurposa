import { useState } from '@wordpress/element';
import { toast } from 'sonner';
import { generateThreads, updateThread, generateCta } from '@/services/repurposeApi';
import type { ThreadItem, ThreadPost, ShortPostSchedule } from '@/types';

/** Convert ThreadPost media objects to plain URL strings for the API */
function postsToApi(posts: ThreadPost[]) {
    return posts.map(p => ({
        ...p,
        media: p.media?.map(m => m.url) ?? null,
    }));
}

export function useThreads(
    initialThreads: ThreadItem[] | undefined,
    blogId: number | undefined,
    blogContent: string | undefined,
    onThreadsGenerated?: (threads: ThreadItem[]) => void,
) {
    const [threads, setThreads] = useState<ThreadItem[]>(initialThreads || []);
    const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);

    const handleGenerateThreads = async () => {
        // [threads-debug] TEMP logging — remove once prod thread-gen issue is fixed
        console.log('[threads-debug] handleGenerateThreads called', {
            blogId,
            hasBlogContent: !!blogContent,
            blogContentLength: blogContent?.length ?? 0,
            existingThreadsCount: threads.length,
            timestamp: new Date().toISOString(),
        });

        if (!blogContent || !blogId) {
            console.warn('[threads-debug] aborted — missing blogContent or blogId', { blogId, hasBlogContent: !!blogContent });
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGeneratingThreads(true);
        const startedAt = performance.now();

        try {
            console.log('[threads-debug] calling generateThreads API…');
            const response = await generateThreads(blogId, blogContent);
            const elapsedMs = Math.round(performance.now() - startedAt);
            console.log('[threads-debug] generateThreads OK', {
                elapsedMs,
                threadsReturned: response?.threads?.length ?? 0,
                response,
            });
            setThreads(response.threads);
            onThreadsGenerated?.(response.threads);
            toast.success(`${response.threads.length} threads generated`);
        } catch (error) {
            const elapsedMs = Math.round(performance.now() - startedAt);
            console.error('[threads-debug] generateThreads FAILED', {
                elapsedMs,
                error,
                errorName: error instanceof Error ? error.name : typeof error,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                // @ts-expect-error — surface attached metadata if apiRequest enriched the error
                meta: (error && typeof error === 'object') ? (error as any).meta : undefined,
            });
            toast.error('Failed to generate threads', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingThreads(false);
        }
    };

    const addScheduledPosts = (threadId: number, newScheduledPosts: ShortPostSchedule[]) => {
        setThreads(prev => prev.map(t =>
            t.id === threadId
                ? { ...t, scheduled_posts: [...(t.scheduled_posts || []).filter(sp => !newScheduledPosts.some(n => n.id === sp.id)), ...newScheduledPosts] }
                : t
        ));
    };

    const removeScheduledPost = (threadId: number, scheduledPostId: number) => {
        setThreads(prev => prev.map(t =>
            t.id === threadId
                ? { ...t, scheduled_posts: (t.scheduled_posts || []).filter(sp => sp.id !== scheduledPostId) }
                : t
        ));
    };

    const getCardProps = (thread: ThreadItem) => ({
        onEditPost: (postIndex: number, content: string) => {
            const updatedPosts = thread.posts.map((p, i) => i === postIndex ? { ...p, content } : p);
            const hookUpdate = postIndex === 0 ? { hook: content } : {};
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts, ...hookUpdate } : t
            ));
            updateThread(thread.id, { posts: postsToApi(updatedPosts), ...hookUpdate }).catch(() => toast.error('Failed to save'));
        },
        onDeletePost: (postIndex: number) => {
            const updatedPosts = thread.posts.filter((_, i) => i !== postIndex);
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: postsToApi(updatedPosts) }).catch(() => toast.error('Failed to save'));
        },
        onInsertPost: (afterIndex: number) => {
            const updatedPosts = [...thread.posts.slice(0, afterIndex + 1), { content: '', media: null }, ...thread.posts.slice(afterIndex + 1)];
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
        },
        onEditHook: (content: string) => {
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, hook: content } : t
            ));
            updateThread(thread.id, { hook: content }).catch(() => toast.error('Failed to save'));
        },
        onDelete: () => setThreads(prev => prev.filter(t => t.id !== thread.id)),
        onInsertCtaPost: (afterIndex: number, content: string) => {
            const updatedPosts = [...thread.posts.slice(0, afterIndex + 1), { content, media: null }, ...thread.posts.slice(afterIndex + 1)];
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: postsToApi(updatedPosts) }).catch(() => toast.error('Failed to save'));
            toast.success('CTA saved');
        },
        onAddImage: (postIndex: number, url: string, type: 'image' | 'video' = 'image', mime?: string) => {
            const updatedPosts = thread.posts.map((p, i) =>
                i === postIndex ? { ...p, media: [...(p.media || []), { url, type, mime }].slice(0, 4) } : p
            );
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: postsToApi(updatedPosts) })
                .then((updated: ThreadItem) => {
                    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, posts: updated.posts } : t));
                })
                .catch(() => toast.error('Failed to save'));
        },
        onRemoveImage: (postIndex: number, imageIndex: number) => {
            const updatedPosts = thread.posts.map((p, i) =>
                i === postIndex ? { ...p, media: (p.media || []).filter((_, j) => j !== imageIndex) } : p
            );
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: postsToApi(updatedPosts) })
                .then((updated: ThreadItem) => {
                    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, posts: updated.posts } : t));
                })
                .catch(() => toast.error('Failed to save'));
        },
        onReorderImages: (postIndex: number, from: number, to: number) => {
            const media = [...(thread.posts[postIndex].media || [])];
            const [moved] = media.splice(from, 1);
            media.splice(to, 0, moved);
            const updatedPosts = thread.posts.map((p, i) =>
                i === postIndex ? { ...p, media } : p
            );
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: postsToApi(updatedPosts) })
                .then((updated: ThreadItem) => {
                    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, posts: updated.posts } : t));
                })
                .catch(() => toast.error('Failed to save'));
        },
        onGenerateCta: async (content: string[]): Promise<string | null> => {
            if (!blogId) return null;
            try {
                const response = await generateCta(blogId, content);
                return response.cta;
            } catch {
                toast.error('Failed to generate CTA');
                return null;
            }
        },
    });

    return {
        threads,
        isGeneratingThreads,
        handleGenerateThreads,
        getCardProps,
        addScheduledPosts,
        removeScheduledPost,
    };
}
