import { Check, Clock, AlertTriangle } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import { SCHEDULE_PLATFORMS, API_TO_UI_PLATFORM } from '../schedule-utils';

export default function StatusBars({ post }: { post: ShortPostPattern }) {
    const scheduledPosts = post.scheduled_posts || [];
    if (scheduledPosts.length === 0) return null;

    const grouped = scheduledPosts.map((sp) => {
        const uiId = API_TO_UI_PLATFORM[sp.platform] || sp.platform;
        const platform = SCHEDULE_PLATFORMS.find((p) => p.id === uiId);
        const date = new Date(sp.scheduled_at);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

        let variant: 'green' | 'blue' | 'red';
        let icon: React.ReactNode;
        let tooltip: string;

        if (sp.status === 'published' || sp.status === 'publishing') {
            variant = 'green';
            icon = <Check size={10} />;
            tooltip = `Published on ${platform?.name || sp.platform} · ${dateStr}`;
        } else if (sp.status === 'pending') {
            variant = 'blue';
            icon = <Clock size={10} />;
            tooltip = `Scheduled for ${platform?.name || sp.platform} · ${dateStr}`;
        } else {
            variant = 'red';
            icon = <AlertTriangle size={10} />;
            tooltip = `Failed on ${platform?.name || sp.platform}`;
        }

        const styles = {
            green: 'bg-green-100 border-green-200 text-green-700',
            blue: 'bg-blue-100 border-blue-200 text-blue-700',
            red: 'bg-red-100 border-red-200 text-red-700',
        };

        const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return (
            <Tooltip key={sp.id} text={tooltip} delay={0} placement="top">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium cursor-default ${styles[variant]}`}>
                    {platform?.icon}
                    {icon}
                    <span>{shortDate}</span>
                </span>
            </Tooltip>
        );
    });

    return (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500 shrink-0">Status</span>
            <div className="flex flex-wrap items-center gap-1.5">
                {grouped}
            </div>
        </div>
    );
}
