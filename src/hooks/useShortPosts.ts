import { useState } from '@wordpress/element';
import { toast } from 'sonner';
import { arrayMove } from '@dnd-kit/sortable';
import { generateShortPosts, updateShortPost, generateCta } from '@/services/repurposeApi';
import type { ShortPost, ShortPostSchedule } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';

function shortPostToPattern(sp: ShortPost): ShortPostPattern {
    return {
        id: sp.id,
        content: sp.content,
        emotions: sp.metadata?.emotions || [],
        structure: sp.metadata?.structure || '',
        why_it_works: sp.metadata?.why_it_works || '',
        cta_content: sp.cta_content?.content || undefined,
        scheduled_posts: sp.scheduled_posts || [],
        media: (sp.media || []).filter((m): m is string => typeof m === 'string'),
        cta_media: sp.cta_content?.media?.filter((m): m is string => typeof m === 'string') || [],
        visualCount: sp.visuals?.length || 0,
    };
}

export function useShortPosts(
    initialShortPosts: ShortPost[] | undefined,
    blogId: number | undefined,
    blogContent: string | undefined,
    isPublished: boolean | undefined,
    publishedPostUrl: string | null | undefined,
) {
    const [shortPosts, setShortPosts] = useState<ShortPostPattern[]>(() =>
        (initialShortPosts || []).map(shortPostToPattern)
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const syncShortPostMedia = (postId: number, media: string[], ctaContent?: string, ctaMedia?: string[]) => {
        updateShortPost(postId, {
            media,
            ...(ctaContent !== undefined && {
                cta_content: ctaContent
                    ? { content: ctaContent, media: ctaMedia && ctaMedia.length > 0 ? ctaMedia : null }
                    : null,
            }),
        }).catch((err) => {
            console.error('Failed to sync short post media:', err);
            toast.error('Failed to save image changes');
        });
    };

    const onGenerateClick = () => {
        setShowConfirmModal(true);
    };

    const handleGenerateShortPosts = async (includeCta: boolean = false) => {
        setShowConfirmModal(false);

        if (!blogContent || !blogId) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGenerating(true);

        try {
            const ctaLink = includeCta && publishedPostUrl ? publishedPostUrl : undefined;
            const response = await generateShortPosts(blogId, blogContent, ctaLink);
            setShortPosts(response.short_posts.map(shortPostToPattern));
            toast.success(`${response.short_posts.length} short posts generated`);
        } catch (error) {
            console.error('Failed to generate short posts:', error);
            toast.error('Failed to generate short posts', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddShortPost = (content: string) => {
        const newPost: ShortPostPattern = {
            id: Date.now(),
            content,
            emotions: [],
            structure: 'Custom',
            why_it_works: 'Manually created post',
            media: [],
            cta_media: [],
            visualCount: 0,
        };
        setShortPosts(prev => [...prev, newPost]);
        toast.success('Short post added');
    };

    const addScheduledPosts = (postId: number, newScheduledPosts: ShortPostSchedule[]) => {
        setShortPosts(prev => prev.map(p =>
            p.id === postId
                ? { ...p, scheduled_posts: [...(p.scheduled_posts || []), ...newScheduledPosts] }
                : p
        ));
    };

    const removeScheduledPost = (postId: number, scheduledPostId: number) => {
        setShortPosts(prev => prev.map(p =>
            p.id === postId
                ? { ...p, scheduled_posts: (p.scheduled_posts || []).filter(sp => sp.id !== scheduledPostId) }
                : p
        ));
    };

    const getCardProps = (pattern: ShortPostPattern) => ({
        onDelete: () => setShortPosts(prev => prev.filter(p => p.id !== pattern.id)),
        onDeleteCta: () => {
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: undefined, cta_media: [] } : p));
            updateShortPost(pattern.id, { cta_content: null }).catch(() => toast.error('Failed to save'));
        },
        onAddCta: async () => {
            if (!blogId) return;
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, is_generating_cta: true, pending_cta: undefined } : p));
            try {
                const response = await generateCta(blogId, [pattern.content]);
                setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, is_generating_cta: false, pending_cta: response.cta } : p));
            } catch {
                setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, is_generating_cta: false } : p));
                toast.error('Failed to generate CTA');
            }
        },
        onAcceptCta: () => {
            const ctaText = pattern.pending_cta;
            if (!ctaText) return;
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: ctaText, pending_cta: undefined } : p));
            updateShortPost(pattern.id, { cta_content: { content: ctaText, media: null } }).catch(() => toast.error('Failed to save'));
        },
        onRejectCta: () => {
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, pending_cta: undefined } : p));
        },
        onEdit: (content: string) => {
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, content } : p));
            updateShortPost(pattern.id, { content }).catch(() => toast.error('Failed to save'));
        },
        onEditCta: (content: string) => {
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_content: content } : p));
            updateShortPost(pattern.id, { cta_content: { content, media: pattern.cta_media.length > 0 ? pattern.cta_media : null } }).catch(() => toast.error('Failed to save'));
        },
        onAddImage: (imageUrl: string) => {
            const newMedia = [...pattern.media, imageUrl].slice(0, 4);
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
            syncShortPostMedia(pattern.id, newMedia);
        },
        onRemoveImage: (imageIndex: number) => {
            const newMedia = pattern.media.filter((_, i) => i !== imageIndex);
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
            syncShortPostMedia(pattern.id, newMedia);
        },
        onReorderImages: (from: number, to: number) => {
            const newMedia = arrayMove(pattern.media, from, to);
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, media: newMedia } : p));
            syncShortPostMedia(pattern.id, newMedia);
        },
        onAddCtaImage: (imageUrl: string) => {
            const newCtaImages = [...pattern.cta_media, imageUrl].slice(0, 4);
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
            syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
        },
        onRemoveCtaImage: (imageIndex: number) => {
            const newCtaImages = pattern.cta_media.filter((_, i) => i !== imageIndex);
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
            syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
        },
        onReorderCtaImages: (from: number, to: number) => {
            const newCtaImages = arrayMove(pattern.cta_media, from, to);
            setShortPosts(prev => prev.map(p => p.id === pattern.id ? { ...p, cta_media: newCtaImages } : p));
            syncShortPostMedia(pattern.id, pattern.media, pattern.cta_content, newCtaImages);
        },
    });

    const incrementVisualCount = (postId: number) => {
        setShortPosts(prev => prev.map(p => p.id === postId ? { ...p, visualCount: p.visualCount + 1 } : p));
    };

    return {
        shortPosts,
        isGenerating,
        showConfirmModal,
        setShowConfirmModal,
        showAddModal,
        setShowAddModal,
        onGenerateClick,
        handleGenerateShortPosts,
        handleAddShortPost,
        getCardProps,
        incrementVisualCount,
        addScheduledPosts,
        removeScheduledPost,
    };
}
