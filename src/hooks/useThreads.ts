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
    const [isGeneratingMore, setIsGeneratingMore] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const handleGenerateThreads = async () => {
        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGeneratingThreads(true);

        try {
            const response = await generateThreads(blogId, blogContent);
            setThreads(response.threads);
            onThreadsGenerated?.(response.threads);
            toast.success(`${response.threads.length} threads generated`);
        } catch (error) {
            console.error('Failed to generate threads:', error);
            toast.error('Failed to generate threads', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingThreads(false);
        }
    };

    const handleGenerateMoreThreads = async () => {
        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGeneratingMore(true);

        try {
            const response = await generateThreads(blogId, blogContent);
            setThreads(prev => [...prev, ...response.threads]);
            toast.success(`${response.threads.length} more threads generated`);
        } catch (error) {
            console.error('Failed to generate more threads:', error);
            toast.error('Failed to generate threads', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingMore(false);
        }
    };

    const handleAddThread = (posts: { content: string }[]) => {
        const hook = posts[0]?.content || '';
        const newThread: ThreadItem = {
            id: Date.now(),
            hook,
            posts: posts.map(p => ({ content: p.content, media: null })),
            metadata: {
                inspiration_id: 0,
                hook_techniques: [],
                structure: 'Custom',
                emotions: [],
                why_it_works: 'Manually created thread',
            },
        };
        setThreads(prev => [...prev, newThread]);
        toast.success('Thread added');
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
        isGeneratingMore,
        showAddModal,
        setShowAddModal,
        handleGenerateThreads,
        handleGenerateMoreThreads,
        handleAddThread,
        getCardProps,
        addScheduledPosts,
        removeScheduledPost,
    };
}
