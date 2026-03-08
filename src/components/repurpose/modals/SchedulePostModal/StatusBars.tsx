import { Check, Clock, AlertTriangle } from 'lucide-react';
import type { ShortPostSchedule } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import { SCHEDULE_PLATFORMS, API_TO_UI_PLATFORM } from '../schedule-utils';

export default function StatusBars({ post }: { post: ShortPostPattern }) {
    const scheduledPosts = post.scheduled_posts || [];
    const published = scheduledPosts.filter((sp) => sp.status === 'published' || sp.status === 'publishing');
    const pending = scheduledPosts.filter((sp) => sp.status === 'pending');
    const failed = scheduledPosts.filter((sp) => sp.status === 'failed');

    const renderBadges = (posts: ShortPostSchedule[], variant: 'green' | 'blue' | 'red', showDate: boolean) => {
        const styles = {
            green: 'bg-green-100 border-green-200 text-green-700',
            blue: 'bg-blue-100 border-blue-200 text-blue-700',
            red: 'bg-red-100 border-red-200 text-red-700',
        };
        return posts.map((sp) => {
            const uiId = API_TO_UI_PLATFORM[sp.platform] || sp.platform;
            const name = SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.name || sp.platform;
            const date = new Date(sp.scheduled_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
                <span key={sp.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-medium cursor-default ${styles[variant]}`}>
                    {SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.icon}
                    {showDate ? `${name} · ${dateStr}` : name}
                </span>
            );
        });
    };

    return (
        <>
            {published.length > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-green-300 bg-green-50">
                    <Check size={16} className="text-green-500 shrink-0" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-green-700">
                        <span>Already published on</span>
                        {renderBadges(published, 'green', true)}
                    </div>
                </div>
            )}
            {pending.length > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-blue-300 bg-blue-50">
                    <Clock size={16} className="text-blue-500 shrink-0" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-blue-700">
                        <span>Scheduled on</span>
                        {renderBadges(pending, 'blue', true)}
                    </div>
                </div>
            )}
            {failed.length > 0 && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-red-300 bg-red-50">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-red-700">
                        <span>Failed on</span>
                        {renderBadges(failed, 'red', false)}
                    </div>
                </div>
            )}
        </>
    );
}
