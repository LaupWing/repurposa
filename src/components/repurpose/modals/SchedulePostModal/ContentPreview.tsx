import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import {
    type ScheduleContentType,
    SCHEDULE_PLATFORMS,
    PLATFORM_CHAR_LIMITS,
    THREAD_NATIVE_PLATFORMS,
} from '../schedule-utils';

interface ContentPreviewProps {
    post: ShortPostPattern;
    contentType: ScheduleContentType;
    threadPosts?: string[] | null;
}

export default function ContentPreview({ post, contentType, threadPosts }: ContentPreviewProps) {
    const contentLength = post.content.length;

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-400">
                    {threadPosts && contentType === 'thread'
                        ? `${threadPosts.length} posts`
                        : `${contentLength} chars`}
                </span>
                <span className="text-xs text-gray-300">·</span>
                {SCHEDULE_PLATFORMS.filter((p) => !(p.id === 'instagram' && (contentType === 'short_post' || contentType === 'thread'))).map((p) => {
                    const limit = PLATFORM_CHAR_LIMITS[p.id];
                    let displayLength: number;
                    let over: boolean;
                    if (threadPosts && contentType === 'thread') {
                        if (THREAD_NATIVE_PLATFORMS.has(p.id)) {
                            displayLength = Math.max(...threadPosts.map(t => t.length));
                            over = threadPosts.some(t => t.length > limit);
                        } else {
                            displayLength = threadPosts.reduce((sum, t) => sum + t.length, 0);
                            over = displayLength > limit;
                        }
                    } else {
                        displayLength = contentLength;
                        over = contentLength > limit;
                    }
                    const label = threadPosts && contentType === 'thread' && THREAD_NATIVE_PLATFORMS.has(p.id)
                        ? `longest ${displayLength.toLocaleString()}`
                        : displayLength.toLocaleString();
                    return (
                        <span
                            key={p.id}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                over
                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                    : 'bg-green-50 text-green-600 border border-green-200'
                            }`}
                        >
                            {p.name} {label}/{limit.toLocaleString()}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
