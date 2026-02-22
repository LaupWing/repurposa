import { createElement } from '@wordpress/element';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import type { Visual } from '@/types';
import { VisualPreview, GRADIENT_PRESETS } from '@/components/repurpose/modals/VisualPreviewModal';

interface VisualCardProps {
    visual: Visual;
    index: number;
    isHighlighted: boolean;
    onHighlightRef: (el: HTMLDivElement | null) => void;
    onEdit: () => void;
    onSchedule: () => void;
    onDelete: () => void;
}

export default function VisualCard({
    visual,
    index,
    isHighlighted,
    onHighlightRef,
    onEdit,
    onSchedule,
    onDelete,
}: VisualCardProps) {
    const gradientPreset = GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0];
    const contentText = Array.isArray(visual.content) ? visual.content[0] : visual.content;
    const isBasic = visual.settings.style === 'basic';

    const platformIcons: Record<string, React.ReactNode> = {
        twitter: createElement(RiTwitterXFill, { size: 10 }),
        linkedin: createElement(RiLinkedinFill, { size: 10 }),
        threads: createElement(RiThreadsFill, { size: 10 }),
        instagram: createElement(RiInstagramFill, { size: 10 }),
        facebook: createElement(RiFacebookFill, { size: 10 }),
    };

    return (
        <div
            ref={isHighlighted ? onHighlightRef : undefined}
            className={`group relative rounded-xl border bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md ${
                isHighlighted
                    ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse'
                    : 'border-gray-200'
            }`}
        >
            {/* Number badge */}
            <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white shadow-sm">
                {index + 1}
            </div>

            {/* Schedule status badge - top right */}
            {visual.scheduled_posts && visual.scheduled_posts.length > 0 && (() => {
                const uniquePlatforms = [...new Set(visual.scheduled_posts.map(sp => sp.platform))];
                const s = visual.scheduled_posts[0];
                const dt = new Date(s.scheduled_at);
                const timeStr = dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                return (
                    <button
                        onClick={onSchedule}
                        className="absolute -top-2 right-2 flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm border cursor-pointer transition-colors z-10 text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
                    >
                        <Calendar size={10} />
                        {timeStr}
                        <span className="flex items-center gap-0.5">
                            {uniquePlatforms.map(p => <span key={p}>{platformIcons[p]}</span>)}
                        </span>
                    </button>
                );
            })()}

            <div className="flex gap-4 p-4">
                {/* Left - Actual VisualPreview scaled down */}
                <div onClick={onEdit} className="flex-shrink-0 w-44 h-44 rounded-lg overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity">
                    <div className="absolute top-0 left-0 pointer-events-none" style={{ width: '500px', height: '500px', transform: 'scale(0.352)', transformOrigin: 'top left' }}>
                        <VisualPreview
                            content={contentText}
                            displayName={visual.settings.display_name}
                            handle={visual.settings.handle}
                            avatarUrl={visual.settings.avatar_url}
                            theme={visual.settings.theme}
                            style={visual.settings.style}
                            stats={visual.settings.stats || { views: 0, reposts: 0, quotes: 0, likes: 0, bookmarks: 0 }}
                            roundedCorners={visual.settings.corners === 'rounded'}
                            gradient={gradientPreset}
                        />
                    </div>
                </div>

                {/* Right - Content + meta */}
                <div className="flex-1 min-w-0 flex flex-col">
                    {/* Content preview */}
                    <div className="mb-3 flex-1">
                        {contentText.split('\n').slice(0, 4).map((line, i) => (
                            <p key={i} className="text-sm leading-relaxed text-gray-800">
                                {line || <span className="block h-2" />}
                            </p>
                        ))}
                        {contentText.split('\n').length > 4 && (
                            <p className="text-sm text-gray-400">...</p>
                        )}
                    </div>

                    {/* Style badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${visual.source_type === 'thread' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {visual.source_type === 'thread' ? `Thread · ${Array.isArray(visual.content) ? visual.content.length : 1} posts` : 'Short Post'}
                        </span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{visual.settings.style}</span>
                        <span className="rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200 capitalize">{visual.settings.theme}</span>
                        {!isBasic && (
                            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 border-gray-200">
                                <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${gradientPreset.swatch}`} />
                                {gradientPreset.label}
                            </span>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                        <button
                            onClick={onEdit}
                            className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                            title="Edit visual"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={onSchedule}
                            className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-blue-50 hover:text-blue-500"
                            title="Schedule"
                        >
                            <Calendar size={14} />
                        </button>
                        <button
                            onClick={onDelete}
                            className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
