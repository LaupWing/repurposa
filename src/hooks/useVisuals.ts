import { useState, useEffect } from '@wordpress/element';
import { toast } from 'sonner';
import { deleteVisual } from '@/services/repurposeApi';
import type { Visual, ShortPostSchedule } from '@/types';

export function useVisuals(
    initialVisuals: Visual[] | undefined,
    initialHighlightVisualId: number | null | undefined,
) {
    const [visuals, setVisuals] = useState<Visual[]>(initialVisuals || []);
    const [viewingVisual, setViewingVisual] = useState<Visual | null>(null);
    const [deletingVisualId, setDeletingVisualId] = useState<number | null>(null);
    const [highlightVisualId, setHighlightVisualId] = useState<number | null>(initialHighlightVisualId ?? null);

    // Source picker state
    const [showSourcePicker, setShowSourcePicker] = useState(false);
    const [sourcePickerTab, setSourcePickerTab] = useState<'short_posts' | 'threads'>('short_posts');
    const [sourcePickerSearch, setSourcePickerSearch] = useState('');
    const [creatingVisualSource, setCreatingVisualSource] = useState<{ type: 'short_post' | 'thread'; id: number; content: string | string[] } | null>(null);

    // Sync highlight prop into local state
    useEffect(() => {
        if (initialHighlightVisualId != null) {
            setHighlightVisualId(initialHighlightVisualId);
        }
    }, [initialHighlightVisualId]);

    const addVisual = (visual: Visual) => {
        setVisuals(prev => [...prev, visual]);
    };

    const updateVisual = (updated: Visual) => {
        setVisuals(prev => prev.map(v => v.id === updated.id ? updated : v));
    };

    const confirmDelete = () => {
        if (deletingVisualId !== null) {
            setVisuals(prev => prev.filter(v => v.id !== deletingVisualId));
            deleteVisual(deletingVisualId)
                .then(() => toast.success('Visual deleted'))
                .catch(() => toast.error('Failed to delete visual'));
        }
    };

    const addScheduledPosts = (visualId: number, newScheduledPosts: ShortPostSchedule[]) => {
        setVisuals(prev => prev.map(v =>
            v.id === visualId
                ? { ...v, scheduled_posts: [...(v.scheduled_posts || []), ...newScheduledPosts] }
                : v
        ));
    };

    const removeScheduledPost = (visualId: number, scheduledPostId: number) => {
        setVisuals(prev => prev.map(v =>
            v.id === visualId
                ? { ...v, scheduled_posts: (v.scheduled_posts || []).filter(sp => sp.id !== scheduledPostId) }
                : v
        ));
    };

    const closeSourcePicker = () => {
        setShowSourcePicker(false);
        setSourcePickerSearch('');
    };

    const selectSource = (source: { type: 'short_post' | 'thread'; id: number; content: string | string[] }) => {
        setCreatingVisualSource(source);
        setShowSourcePicker(false);
        setSourcePickerSearch('');
    };

    const onVisualCreatedFromSource = (visual: Visual) => {
        addVisual(visual);
        setHighlightVisualId(visual.id);
        setCreatingVisualSource(null);
    };

    const onVisualUpdated = (updated: Visual) => {
        updateVisual(updated);
        setViewingVisual(null);
    };

    return {
        visuals,
        viewingVisual,
        setViewingVisual,
        deletingVisualId,
        setDeletingVisualId,
        highlightVisualId,
        setHighlightVisualId,
        confirmDelete,
        addVisual,
        updateVisual,
        addScheduledPosts,
        removeScheduledPost,
        // Source picker
        showSourcePicker,
        setShowSourcePicker,
        sourcePickerTab,
        setSourcePickerTab,
        sourcePickerSearch,
        setSourcePickerSearch,
        creatingVisualSource,
        setCreatingVisualSource,
        closeSourcePicker,
        selectSource,
        onVisualCreatedFromSource,
        onVisualUpdated,
    };
}
