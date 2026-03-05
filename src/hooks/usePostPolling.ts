import { useEffect } from '@wordpress/element';
import { pollPostStatus } from '@/services/blogApi';
import type { PostStatusResponse } from '@/types';

/**
 * Polls a post's status while it's generating.
 * Automatically starts/stops based on the post status.
 */
export function usePostPolling(
    postId: number | undefined,
    status: string | undefined,
    onUpdate: (status: PostStatusResponse) => void,
) {
    useEffect(() => {
        if (!postId || status !== 'generating') return;

        const stopPolling = pollPostStatus(postId, onUpdate);

        return stopPolling;
    }, [postId, status]);
}
