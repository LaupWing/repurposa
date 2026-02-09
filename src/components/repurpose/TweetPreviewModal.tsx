/**
 * Tweet Preview Modal
 *
 * Modal that renders a short post as a tweet-style visual card
 * with customization controls and PNG download.
 */

import { useState, useRef, useCallback } from '@wordpress/element';
import { toPng } from 'html-to-image';
import {
    X,
    Download,
    Bookmark,
    Heart,
    Quote,
    Repeat2,
    BadgeCheck,
    ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

type Theme = 'light' | 'dark';
type Style = 'minimal' | 'detailed';
type Corners = 'rounded' | 'square';

interface EngagementStats {
    views: number;
    reposts: number;
    quotes: number;
    likes: number;
    bookmarks: number;
}

interface TweetPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
}

// ============================================
// TWEET PREVIEW (inline sub-component)
// ============================================

function TweetPreview({
    content,
    displayName,
    handle,
    theme,
    style,
    stats,
    roundedCorners,
}: {
    content: string;
    displayName: string;
    handle: string;
    theme: Theme;
    style: Style;
    stats: EngagementStats;
    roundedCorners: boolean;
}) {
    const isDark = theme === 'dark';
    const isMinimal = style === 'minimal';
    const initial = displayName?.charAt(0).toUpperCase() || handle?.charAt(0).toUpperCase() || '?';

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    const dateString = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const gradientBg = isDark
        ? 'bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700'
        : 'bg-gradient-to-br from-violet-400 via-purple-400 to-violet-500';

    const getTextSize = () => {
        const len = content.length;
        if (isMinimal) {
            if (len > 250) return 'text-base';
            if (len > 180) return 'text-lg';
            if (len > 120) return 'text-xl';
            return 'text-2xl font-medium';
        } else {
            if (len > 250) return 'text-sm';
            if (len > 180) return 'text-base';
            if (len > 120) return 'text-lg';
            return 'text-xl';
        }
    };

    return (
        <div className={`h-[500px] w-[500px] p-10 shadow-2xl ${roundedCorners ? 'rounded-2xl' : ''} ${gradientBg}`}>
            <div
                className={`flex h-full w-full flex-col rounded-2xl shadow-xl ${
                    isMinimal ? 'p-6' : 'p-5'
                } ${isDark ? 'bg-[#15202b] text-white' : 'bg-white text-black'}`}
            >
                {/* Header */}
                <div className="flex gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                            {initial}
                        </div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-lg">{displayName || 'Your Name'}</span>
                            <BadgeCheck className="h-5 w-5 fill-blue-500 text-white" />
                        </div>
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            @{handle || 'yourhandle'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 py-4 overflow-hidden">
                    <p className={`whitespace-pre-wrap leading-relaxed ${getTextSize()}`}>{content}</p>
                </div>

                {/* Timestamp */}
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>{timeString}</span>
                    <span className="mx-1">·</span>
                    <span>{dateString}</span>
                    {!isMinimal && (
                        <>
                            <span className="mx-1">·</span>
                            <span className="font-semibold">{stats.views.toLocaleString()}</span>
                            <span> Views</span>
                        </>
                    )}
                </div>

                {/* Engagement Stats - detailed only */}
                {!isMinimal && (
                    <div
                        className={`mt-3 flex flex-wrap gap-4 border-t pt-3 text-sm ${
                            isDark ? 'border-gray-700' : 'border-gray-200'
                        }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Repeat2 className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className="font-bold">{stats.reposts.toLocaleString()}</span>
                            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Reposts</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Quote className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className="font-bold">{stats.quotes.toLocaleString()}</span>
                            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Quotes</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Heart className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className="font-bold">{stats.likes.toLocaleString()}</span>
                            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Likes</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Bookmark className={`h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            <span className="font-bold">{stats.bookmarks.toLocaleString()}</span>
                            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Bookmarks</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// TOGGLE BUTTON GROUP
// ============================================

function ToggleGroup<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        value === opt.value
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ============================================
// STATS EDITOR
// ============================================

function StatsEditor({
    stats,
    onChange,
}: {
    stats: EngagementStats;
    onChange: (stats: EngagementStats) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fields: { key: keyof EngagementStats; label: string }[] = [
        { key: 'views', label: 'Views' },
        { key: 'reposts', label: 'Reposts' },
        { key: 'quotes', label: 'Quotes' },
        { key: 'likes', label: 'Likes' },
        { key: 'bookmarks', label: 'Bookmarks' },
    ];

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
                Edit Stats
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 w-56 bg-white rounded-lg border border-gray-200 shadow-lg p-3 z-20">
                    <div className="space-y-2">
                        {fields.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between">
                                <label className="text-xs text-gray-600">{label}</label>
                                <input
                                    type="number"
                                    value={stats[key]}
                                    onChange={(e) =>
                                        onChange({
                                            ...stats,
                                            [key]: Math.max(0, parseInt(e.target.value) || 0),
                                        })
                                    }
                                    className="w-24 rounded border border-gray-200 px-2 py-1 text-xs text-right focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN MODAL
// ============================================

function generateRandomStats(): EngagementStats {
    const views = Math.floor(Math.random() * 45000) + 5000;
    const likes = Math.floor(views * (Math.random() * 0.06 + 0.02));
    return {
        views,
        reposts: Math.floor(likes * (Math.random() * 0.3 + 0.05)),
        quotes: Math.floor(likes * (Math.random() * 0.1 + 0.01)),
        likes,
        bookmarks: Math.floor(likes * (Math.random() * 0.2 + 0.05)),
    };
}

export default function TweetPreviewModal({ isOpen, onClose, content }: TweetPreviewModalProps) {
    const previewRef = useRef<HTMLDivElement>(null);
    const [theme, setTheme] = useState<Theme>('light');
    const [style, setStyle] = useState<Style>('detailed');
    const [corners, setCorners] = useState<Corners>('rounded');
    const [displayName, setDisplayName] = useState('Your Name');
    const [handle, setHandle] = useState('yourhandle');
    const [stats, setStats] = useState<EngagementStats>(generateRandomStats);
    const [downloading, setDownloading] = useState(false);

    const handleDownload = useCallback(async () => {
        if (!previewRef.current || downloading) return;
        setDownloading(true);
        try {
            const dataUrl = await toPng(previewRef.current, {
                quality: 1,
                pixelRatio: 2,
            });
            const link = document.createElement('a');
            link.download = `tweet-visual-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
            toast.success('Image downloaded!');
        } catch (err) {
            console.error('Failed to generate image:', err);
            toast.error('Failed to download image');
        } finally {
            setDownloading(false);
        }
    }, [downloading]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Tweet Visual Preview</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Profile inputs */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Handle</label>
                            <div className="flex items-center rounded-lg border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
                                <span className="pl-3 text-sm text-gray-400">@</span>
                                <input
                                    type="text"
                                    value={handle}
                                    onChange={(e) => setHandle(e.target.value)}
                                    className="w-full rounded-r-lg px-1 py-1.5 text-sm focus:outline-none border-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <ToggleGroup
                            options={[
                                { label: 'Detailed', value: 'detailed' as Style },
                                { label: 'Minimal', value: 'minimal' as Style },
                            ]}
                            value={style}
                            onChange={setStyle}
                        />
                        <ToggleGroup
                            options={[
                                { label: 'Light', value: 'light' as Theme },
                                { label: 'Dark', value: 'dark' as Theme },
                            ]}
                            value={theme}
                            onChange={setTheme}
                        />
                        <ToggleGroup
                            options={[
                                { label: 'Rounded', value: 'rounded' as Corners },
                                { label: 'Square', value: 'square' as Corners },
                            ]}
                            value={corners}
                            onChange={setCorners}
                        />
                        {style === 'detailed' && <StatsEditor stats={stats} onChange={setStats} />}
                    </div>

                    {/* Preview */}
                    <div className="flex justify-center">
                        <div ref={previewRef}>
                            <TweetPreview
                                content={content}
                                displayName={displayName}
                                handle={handle}
                                theme={theme}
                                style={style}
                                stats={stats}
                                roundedCorners={corners === 'rounded'}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                        <Download size={16} />
                        {downloading ? 'Generating...' : 'Download Image'}
                    </button>
                </div>
            </div>
        </div>
    );
}
