import { useState } from '@wordpress/element';
import { toast } from 'sonner';
import { generateThreads, updateThread, generateCta } from '@/services/repurposeApi';
import type { ThreadItem, ShortPostSchedule } from '@/types';

export function useThreads(
    initialThreads: ThreadItem[] | undefined,
    blogId: number | undefined,
    blogContent: string | undefined,
) {
    const [threads, setThreads] = useState<ThreadItem[]>(initialThreads || []);
    const [isGeneratingThreads, setIsGeneratingThreads] = useState(false);

    const handleGenerateThreads = async () => {
        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGeneratingThreads(true);

        try {
            const response = await generateThreads(blogId, blogContent);
            setThreads(response.threads);
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

    const addScheduledPosts = (threadId: number, newScheduledPosts: ShortPostSchedule[]) => {
        setThreads(prev => prev.map(t =>
            t.id === threadId
                ? { ...t, scheduled_posts: [...(t.scheduled_posts || []), ...newScheduledPosts] }
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
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: updatedPosts }).catch(() => toast.error('Failed to save'));
        },
        onDeletePost: (postIndex: number) => {
            const updatedPosts = thread.posts.filter((_, i) => i !== postIndex);
            setThreads(prev => prev.map(t =>
                t.id === thread.id ? { ...t, posts: updatedPosts } : t
            ));
            updateThread(thread.id, { posts: updatedPosts }).catch(() => toast.error('Failed to save'));
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
        onSaveCta: (content: string) => {
            setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, cta_content: content } : t));
            updateThread(thread.id, { cta_content: content }).catch(() => toast.error('Failed to save'));
            toast.success('CTA saved');
        },
        onEditCta: (content: string) => {
            setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, cta_content: content } : t));
            updateThread(thread.id, { cta_content: content }).catch(() => toast.error('Failed to save'));
            toast.success('CTA saved');
        },
        onDeleteCta: () => {
            setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, cta_content: undefined } : t));
            updateThread(thread.id, { cta_content: null }).catch(() => toast.error('Failed to save'));
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
