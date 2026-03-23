/**
 * Visual Preview Modal
 *
 * Modal that renders a short post or thread as a visual card
 * with customization controls and PNG download.
 */

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from '@wordpress/element';
import { toPng } from 'html-to-image';
import Cropper from 'react-easy-crop';
import type { Point } from 'react-easy-crop';
import {
    X,
    Download,
    Save,
    Bookmark,
    Heart,
    Quote,
    Repeat2,
    BadgeCheck,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Image,
    FileText,
    Minus,
    Plus,
    Type,
    AlertTriangle,
    Pencil,
    Check,
    Settings,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfileStore } from '@/store/profileStore';
import { createVisual, updateVisual } from '@/services/repurposeApi';
import { AITextPopup } from '@/components/AITextPopup';
import ImagePickerModal from '@/components/ImagePickerModal';
import type { VisualSettings } from '@/types';

// ============================================
// CONSTANTS
// ============================================

const PLATFORM_LIMITS = [
    { name: 'X', limit: 280 },
    { name: 'LinkedIn', limit: 3000 },
    { name: 'Threads', limit: 500 },
    { name: 'Instagram', limit: 2200 },
    { name: 'Facebook', limit: 63206 },
];

// ============================================
// TYPES
// ============================================

type Theme = 'light' | 'dark';
type Style = 'basic' | 'minimal' | 'detailed';
type Corners = 'rounded' | 'square';
type FontFamily = 'inter' | 'playfair' | 'space-grotesk' | 'caveat' | 'jetbrains-mono';

export const FONT_PRESETS: { id: FontFamily; label: string; family: string }[] = [
    { id: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
    { id: 'playfair', label: 'Playfair', family: "'Playfair Display', serif" },
    { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
    { id: 'caveat', label: 'Caveat', family: "'Caveat', cursive" },
    { id: 'jetbrains-mono', label: 'JetBrains', family: "'JetBrains Mono', monospace" },
];

interface GradientPreset {
    id: string;
    label: string;
    light: string;
    dark: string;
    swatch: string; // for the picker circle
}

export const GRADIENT_PRESETS: GradientPreset[] = [
    { id: 'purple',   label: 'Purple',   light: 'from-violet-500 via-purple-500 to-fuchsia-500',  dark: 'from-violet-700 via-purple-700 to-fuchsia-700',  swatch: 'from-violet-500 to-fuchsia-500' },
    { id: 'indigo',   label: 'Indigo',   light: 'from-indigo-500 via-blue-500 to-violet-500',     dark: 'from-indigo-700 via-blue-700 to-violet-700',     swatch: 'from-indigo-500 to-violet-500' },
    { id: 'ocean',    label: 'Ocean',    light: 'from-blue-500 via-cyan-400 to-teal-400',         dark: 'from-blue-700 via-cyan-600 to-teal-600',         swatch: 'from-blue-500 to-teal-400' },
    { id: 'emerald',  label: 'Emerald',  light: 'from-emerald-500 via-green-400 to-lime-400',     dark: 'from-emerald-700 via-green-600 to-lime-600',     swatch: 'from-emerald-500 to-lime-400' },
    { id: 'sunset',   label: 'Sunset',   light: 'from-orange-500 via-red-500 to-pink-500',        dark: 'from-orange-700 via-red-700 to-pink-700',        swatch: 'from-orange-500 to-pink-500' },
    { id: 'rose',     label: 'Rose',     light: 'from-rose-500 via-pink-500 to-fuchsia-500',      dark: 'from-rose-700 via-pink-700 to-fuchsia-700',      swatch: 'from-rose-500 to-fuchsia-500' },
    { id: 'gold',     label: 'Gold',     light: 'from-amber-500 via-orange-400 to-yellow-400',    dark: 'from-amber-700 via-orange-600 to-yellow-600',    swatch: 'from-amber-500 to-yellow-400' },
    { id: 'midnight', label: 'Midnight', light: 'from-slate-500 via-gray-600 to-zinc-700',        dark: 'from-slate-800 via-gray-800 to-zinc-900',        swatch: 'from-slate-600 to-zinc-800' },
];

interface EngagementStats {
    views: number;
    reposts: number;
    quotes: number;
    likes: number;
    bookmarks: number;
}

interface VisualPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string[];
    blogId?: number;
    sourceType: 'short_post' | 'thread' | 'standalone';
    sourceId?: number;
    visualId?: number;
    initialDescription?: string;
    initialSettings?: VisualSettings;
    onSaved?: (visual: import('@/types').Visual) => void;
}

// ============================================
// FIT TEXT HOOK
// ============================================

const TEXT_SCALE = ['!text-4xl', '!text-3xl', '!text-2xl', '!text-xl', '!text-lg', '!text-base', '!text-sm', '!text-xs'] as const;
type TextSize = typeof TEXT_SCALE[number];

const TEXT_SIZE_LABELS: Record<string, string> = {
    '!text-4xl': '4XL',
    '!text-3xl': '3XL',
    '!text-2xl': '2XL',
    '!text-xl': 'XL',
    '!text-lg': 'LG',
    '!text-base': 'MD',
    '!text-sm': 'SM',
    '!text-xs': 'XS',
};

const STYLE_RANGE: Record<Style, { start: number; end: number }> = {
    basic:    { start: 1, end: 6 },  // text-3xl → text-sm
    minimal:  { start: 2, end: 7 },  // text-2xl → text-xs
    detailed: { start: 3, end: 7 },  // text-xl  → text-xs
};

function useFitText(
    innerRef: React.RefObject<HTMLDivElement | null>,
    content: string,
    style: Style,
    override?: TextSize | null,
): { textClass: TextSize; isOverflowing: boolean } {
    const { start, end } = STYLE_RANGE[style];
    const [textClass, setTextClass] = useState<TextSize>(TEXT_SCALE[start]);
    const [isOverflowing, setIsOverflowing] = useState(false);

    // Auto-fit: runs before paint to avoid flicker
    useLayoutEffect(() => {
        if (override) return;

        const inner = innerRef.current;
        const container = inner?.parentElement as HTMLElement | null;
        if (!inner || !container) return;

        const paddingTop = parseFloat(getComputedStyle(container).paddingTop);
        const clipEdge = container.clientHeight;

        let result: TextSize = TEXT_SCALE[end];

        for (let i = start; i <= end; i++) {
            TEXT_SCALE.forEach(cls => inner.classList.remove(cls));
            inner.classList.add(TEXT_SCALE[i]);

            if (paddingTop + inner.offsetHeight <= clipEdge) {
                result = TEXT_SCALE[i];
                break;
            }
        }

        setTextClass(result);
        setIsOverflowing(false);
    }, [content, style, start, end, override]);

    // Overflow check: runs after paint when layout is fully settled
    useEffect(() => {
        if (!override) return;
        const inner = innerRef.current;
        const container = inner?.parentElement as HTMLElement | null;
        if (!inner || !container) return;
        const paddingTop = parseFloat(getComputedStyle(container).paddingTop);
        setIsOverflowing(paddingTop + inner.offsetHeight > container.clientHeight);
    }, [override, content, style]);

    return { textClass: override || textClass, isOverflowing };
}

// ============================================
// VISUAL PREVIEW (inline sub-component)
// ============================================

export function VisualPreview({
    content,
    displayName,
    handle,
    avatarUrl,
    avatarCrop,
    theme,
    style,
    stats,
    roundedCorners,
    gradient,
    fontFamily,
    textSize,
    onOverflowChange,
    isEditing: isEditingContent,
    editValue,
    onEditChange,
}: {
    content: string;
    displayName: string;
    handle: string;
    avatarUrl?: string;
    avatarCrop?: { x: number; y: number; width: number; height: number };
    theme: Theme;
    style: Style;
    stats: EngagementStats;
    roundedCorners: boolean;
    gradient: GradientPreset;
    textSize?: TextSize | null;
    onOverflowChange?: (isOverflowing: boolean) => void;
    fontFamily?: string;
    isEditing?: boolean;
    editValue?: string;
    onEditChange?: (value: string) => void;
}) {
    const isDark = theme === 'dark';
    const isBasic = style === 'basic';
    const isMinimal = style === 'minimal';
    const fontStyle = fontFamily ? { fontFamily } : undefined;
    const initial = displayName?.charAt(0).toUpperCase() || handle?.charAt(0).toUpperCase() || '?';

    const getAvatarBgStyle = (): React.CSSProperties | undefined => {
        if (!avatarCrop || !avatarUrl) return undefined;
        const { x, y, width, height } = avatarCrop;
        const bgSize = `${(100 / width) * 100}% ${(100 / height) * 100}%`;
        const bgPosX = width >= 100 ? 50 : (x / (100 - width)) * 100;
        const bgPosY = height >= 100 ? 50 : (y / (100 - height)) * 100;
        return {
            backgroundImage: `url(${avatarUrl})`,
            backgroundSize: bgSize,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        };
    };
    const avatarBgStyle = getAvatarBgStyle();

    const innerRef = useRef<HTMLDivElement>(null);

    const { textClass, isOverflowing } = useFitText(innerRef, content, style, textSize);

    useEffect(() => {
        onOverflowChange?.(isOverflowing);
    }, [isOverflowing, onOverflowChange]);


    const paragraphs = content.split('\n\n');

    const fontWeightClass =
        isBasic && ['text-4xl', 'text-3xl', 'text-2xl'].includes(textClass) ? 'font-semibold' :
        isMinimal && ['text-4xl', 'text-3xl', 'text-2xl', 'text-xl'].includes(textClass) ? 'font-medium' :
        '';

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

    const gradientBg = `bg-gradient-to-br ${isDark ? gradient.dark : gradient.light}`;

    // Basic style: flat card, no gradient wrapper
    if (isBasic) {
        return (
            <div className={`h-[500px] w-[500px] flex flex-col px-10 py-12 shadow-2xl ${isDark ? 'bg-[#15202b] text-white' : 'bg-white text-black'} ${isEditingContent ? 'ring-2 ring-inset ring-blue-400' : ''}`} style={fontStyle}>
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
                        {avatarUrl ? (
                            avatarBgStyle
                                ? <div className="h-full w-full" style={avatarBgStyle} />
                                : <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">
                                {initial}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xl">{displayName || 'Your Name'}</span>
                        <BadgeCheck className="h-6 w-6 fill-blue-500 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 min-h-0 ${isEditingContent ? '' : 'overflow-hidden'}`}>
                    {isEditingContent ? (
                        <textarea
                            value={editValue ?? content}
                            onChange={(e) => onEditChange?.(e.target.value)}
                            className="w-full h-full resize-none bg-transparent text-sm focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <div ref={innerRef} className={`${textClass} ${fontWeightClass}`}>
                            {paragraphs.map((para, i) => (
                                <p key={i} className={`whitespace-pre-wrap leading-snug ${i < paragraphs.length - 1 ? 'mb-[1em]' : ''}`}>{para}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`h-[500px] w-[500px] p-10 shadow-2xl ${roundedCorners ? 'rounded-2xl' : ''} ${gradientBg}`}>
            <div
                className={`flex h-full w-full flex-col rounded-2xl shadow-xl ${
                    isMinimal ? 'p-6' : 'p-5'
                } ${isDark ? 'bg-[#15202b] text-white' : 'bg-white text-black'} ${isEditingContent ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                style={fontStyle}
            >
                {/* Header */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-violet-600">
                        {avatarUrl ? (
                            avatarBgStyle
                                ? <div className="h-full w-full" style={avatarBgStyle} />
                                : <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">
                                {initial}
                            </div>
                        )}
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
                <div className={`flex-1 min-h-0 py-4 ${isEditingContent ? '' : 'overflow-hidden'}`}>
                    {isEditingContent ? (
                        <textarea
                            value={editValue ?? content}
                            onChange={(e) => onEditChange?.(e.target.value)}
                            className={`w-full h-full resize-none bg-transparent focus:outline-none ${isDark ? 'text-white' : 'text-black'} text-sm`}
                            autoFocus
                        />
                    ) : (
                        <div ref={innerRef} className={`${textClass} ${fontWeightClass}`}>
                            {paragraphs.map((para, i) => (
                                <p key={i} className={`whitespace-pre-wrap leading-relaxed ${i < paragraphs.length - 1 ? 'mb-[1em]' : ''}`}>{para}</p>
                            ))}
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <div className={`text-sm flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
                        className={`mt-3 flex flex-wrap gap-4 border-t pt-3 text-sm flex-shrink-0 ${
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
// CUSTOM SELECT DROPDOWN
// ============================================

function SelectDropdown<T extends string>({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: { label: string; value: T }[];
    value: T;
    onChange: (v: T) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.value === value);

    return (
        <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between gap-2 w-full min-w-[120px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 hover:border-gray-300 transition-colors"
            >
                <span>{selected?.label}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1 overflow-hidden">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                                className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                    opt.value === value
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
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
                <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
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
                </>
            )}
        </div>
    );
}

// ============================================
// GRADIENT PICKER
// ============================================

function GradientPicker({
    gradient,
    onChange,
}: {
    gradient: GradientPreset;
    onChange: (preset: GradientPreset) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <button
                onClick={() => setOpen(!open)}
                className="h-[34px] w-[34px] rounded-lg shadow-sm border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer overflow-hidden"
                title={gradient.label}
            >
                <div className={`h-full w-full bg-gradient-to-br ${gradient.swatch}`} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-20 p-3 w-[200px]">
                        <p className="text-xs font-medium text-gray-500 mb-2">Background gradient</p>
                        <div className="grid grid-cols-4 gap-2">
                            {GRADIENT_PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => { onChange(preset); setOpen(false); }}
                                    title={preset.label}
                                    className={`h-10 w-10 rounded-lg bg-gradient-to-br ${preset.swatch} transition-all ${
                                        gradient.id === preset.id
                                            ? 'ring-2 ring-blue-500 ring-offset-2'
                                            : 'hover:scale-105 hover:shadow-md'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function FontPicker({
    fontFamily,
    onChange,
}: {
    fontFamily: FontFamily;
    onChange: (font: FontFamily) => void;
}) {
    const [open, setOpen] = useState(false);
    const current = FONT_PRESETS.find(f => f.id === fontFamily) || FONT_PRESETS[0];

    return (
        <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1">Font</label>
            <button
                onClick={() => setOpen(!open)}
                className="h-[34px] px-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-2 bg-white"
                title={current.label}
            >
                <Type size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700" style={{ fontFamily: current.family }}>{current.label}</span>
                <ChevronDown size={12} className="text-gray-400" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-20 p-2 w-[180px]">
                        {FONT_PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => { onChange(preset.id); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                    fontFamily === preset.id
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                                style={{ fontFamily: preset.family }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </>
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

export function VisualPreviewModal({ isOpen, onClose, content, blogId, sourceType, sourceId, visualId, initialDescription, initialSettings, onSaved }: VisualPreviewModalProps) {
    const { user, socialConnections } = useProfileStore();
    const xConnection = socialConnections.find((c) => c.platform === 'twitter');

    const [editablePosts, setEditablePosts] = useState<string[]>(() => [...content]);
    const [editingPostIndex, setEditingPostIndex] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState('');
    const [currentPostIndex, setCurrentPostIndex] = useState(0);

    const previewRef = useRef<HTMLDivElement>(null);
    const descriptionRef = useRef<HTMLTextAreaElement>(null);
    const [theme, setTheme] = useState<Theme>('light');
    const [style, setStyle] = useState<Style>('detailed');
    const [corners, setCorners] = useState<Corners>('square');
    const [gradient, setGradient] = useState<GradientPreset>(GRADIENT_PRESETS[0]);
    const [fontFamily, setFontFamily] = useState<FontFamily>('inter');
    const [displayName, setDisplayName] = useState(user?.name || 'Your Name');
    const [handle, setHandle] = useState(xConnection?.username || 'yourhandle');
    const [stats, setStats] = useState<EngagementStats>(generateRandomStats);
    const [downloading, setDownloading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [textSizes, setTextSizes] = useState<Record<number, TextSize>>({});
    const [isCurrentPostOverflowing, setIsCurrentPostOverflowing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user?.avatar || undefined);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [avatarCrop, setAvatarCrop] = useState<{ x: number; y: number; width: number; height: number } | undefined>(undefined);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropPosition, setCropPosition] = useState<Point>({ x: 0, y: 0 });
    const [cropZoom, setCropZoom] = useState(1);
    const [pendingCroppedArea, setPendingCroppedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const defaultDescription = content[0] ?? '';
    const [description, setDescription] = useState(initialDescription ?? defaultDescription);
    const [modalTab, setModalTab] = useState<'visual' | 'description'>('visual');

    // Reset all state when the modal opens
    useEffect(() => {
        if (!isOpen) return;
        setCurrentPostIndex(0);
        setEditablePosts([...content]);
        setEditingPostIndex(null);
        setEditDraft('');
        setTextSizes(
            initialSettings?.text_sizes
                ? Object.fromEntries(
                    Object.entries(initialSettings.text_sizes).map(([k, v]) => [Number(k), v as TextSize])
                )
                : {}
        );
        setModalTab('visual');
        setTheme(initialSettings?.theme ?? 'light');
        setStyle(initialSettings?.style ?? 'detailed');
        setCorners(initialSettings?.corners ?? 'square');
        setGradient(GRADIENT_PRESETS.find(g => g.id === initialSettings?.gradient_id) || GRADIENT_PRESETS[0]);
        setFontFamily((initialSettings as any)?.font_family ?? 'inter');
        setDisplayName(initialSettings?.display_name ?? user?.name ?? 'Your Name');
        setHandle(initialSettings?.handle ?? xConnection?.username ?? 'yourhandle');
        setAvatarUrl(initialSettings?.avatar_url ?? user?.avatar ?? undefined);
        setAvatarCrop(initialSettings?.avatar_crop ?? undefined);
        setCropPosition({ x: 0, y: 0 });
        setCropZoom(1);
        setPendingCroppedArea(null);
        setDescription(initialDescription ?? (content[0] ?? ''));
        if (initialSettings?.stats) {
            setStats(initialSettings.stats);
        } else {
            setStats(generateRandomStats());
        }
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps


    const handleDownload = useCallback(async () => {
        if (!previewRef.current || downloading) return;
        setDownloading(true);
        try {
            const dataUrl = await toPng(previewRef.current, {
                quality: 1,
                pixelRatio: 2,
            });
            const link = document.createElement('a');
            link.download = `visual-${Date.now()}.png`;
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

    const isEditing = !!visualId;

    const handleSave = useCallback(async () => {
        if (saving) return;
        setSaving(true);
        try {
            const settings: VisualSettings = {
                style,
                theme,
                corners,
                gradient_id: gradient.id,
                font_family: fontFamily,
                display_name: displayName,
                handle,
                avatar_url: avatarUrl,
                ...(avatarCrop && { avatar_crop: avatarCrop }),
                ...(style === 'detailed' && { stats }),
                ...(Object.keys(textSizes).length > 0 && { text_sizes: textSizes }),
            };

            let visual: import('@/types').Visual;
            if (isEditing) {
                visual = await updateVisual(visualId, { content: editablePosts, description, settings });
            } else {
                if (!sourceType || (sourceType !== 'standalone' && (!blogId || !sourceId))) return;
                visual = await createVisual(blogId || 0, {
                    source_type: sourceType,
                    source_id: sourceId || 0,
                    content: editablePosts,
                    description,
                    settings,
                });
            }
            toast.success(isEditing ? 'Visual updated!' : 'Visual saved!');
            onSaved?.(visual);
        } catch (err) {
            console.error('Failed to save visual:', err);
            toast.error('Failed to save visual');
        } finally {
            setSaving(false);
        }
    }, [blogId, sourceType, sourceId, visualId, isEditing, saving, style, theme, corners, gradient, displayName, handle, avatarUrl, avatarCrop, stats, textSizes, editablePosts, description, onSaved]);

    const controlsAvatarStyle: React.CSSProperties | undefined = avatarCrop && avatarUrl ? (() => {
        const { x, y, width, height } = avatarCrop;
        const bgPosX = width >= 100 ? 50 : (x / (100 - width)) * 100;
        const bgPosY = height >= 100 ? 50 : (y / (100 - height)) * 100;
        return {
            backgroundImage: `url(${avatarUrl})`,
            backgroundSize: `${(100 / width) * 100}% ${(100 / height) * 100}%`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        };
    })() : undefined;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Visual Preview</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button
                        onClick={() => setModalTab('visual')}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            modalTab === 'visual'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Image size={15} />
                        Visual
                    </button>
                    <button
                        onClick={() => setModalTab('description')}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            modalTab === 'description'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <FileText size={15} />
                        Description
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {modalTab === 'visual' ? (
                        <>
                            {/* Controls */}
                            <div className="flex flex-wrap items-end gap-3 mb-4">
                                <SelectDropdown
                                    label="Style"
                                    options={[
                                        { label: 'Basic', value: 'basic' as Style },
                                        { label: 'Minimal', value: 'minimal' as Style },
                                        { label: 'Detailed', value: 'detailed' as Style },
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
                                {style !== 'basic' && (
                                    <ToggleGroup
                                        options={[
                                            { label: 'Rounded', value: 'rounded' as Corners },
                                            { label: 'Square', value: 'square' as Corners },
                                        ]}
                                        value={corners}
                                        onChange={setCorners}
                                    />
                                )}
                                {style !== 'basic' && (
                                    <GradientPicker gradient={gradient} onChange={setGradient} />
                                )}
                                <FontPicker fontFamily={fontFamily} onChange={setFontFamily} />
                                {style === 'detailed' && <StatsEditor stats={stats} onChange={setStats} />}
                            </div>

                            {/* Profile inputs */}
                            <div className="flex items-center gap-3 mb-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Avatar</label>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowAvatarPicker(true)}
                                            className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-violet-600 hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 transition-all flex-shrink-0"
                                            title="Change avatar"
                                        >
                                            {avatarUrl ? (
                                                controlsAvatarStyle
                                                    ? <div className="h-full w-full rounded-full" style={controlsAvatarStyle} />
                                                    : <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                                                    {(displayName?.charAt(0) || '?').toUpperCase()}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setShowAvatarPicker(true)}
                                            className="absolute -bottom-1 -left-1 flex items-center justify-center w-7 h-7 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                                            title="Change image"
                                        >
                                            <Pencil size={14} className="text-gray-600" />
                                        </button>
                                        <button
                                            onClick={() => avatarUrl && setShowCropModal(true)}
                                            className={`absolute -bottom-1 -right-1 flex items-center justify-center w-7 h-7 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors ${!avatarUrl ? 'opacity-40 cursor-not-allowed' : ''}`}
                                            title="Reposition avatar"
                                        >
                                            <Settings size={14} className="text-gray-600" />
                                        </button>
                                    </div>
                                    <ImagePickerModal
                                        isOpen={showAvatarPicker}
                                        onClose={() => setShowAvatarPicker(false)}
                                        onSelect={(url) => setAvatarUrl(url)}
                                        currentImage={avatarUrl}
                                    />

                                    {/* Avatar Crop Modal */}
                                    {showCropModal && avatarUrl && (
                                        <div className="fixed inset-0 z-[100001] flex items-center justify-center">
                                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCropModal(false)} />
                                            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                                                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                                                    <h3 className="font-semibold text-gray-900">Reposition Avatar</h3>
                                                    <button onClick={() => setShowCropModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                                <div className="relative h-72 bg-gray-900">
                                                    <Cropper
                                                        image={avatarUrl}
                                                        crop={cropPosition}
                                                        zoom={cropZoom}
                                                        aspect={1}
                                                        cropShape="round"
                                                        showGrid={false}
                                                        onCropChange={setCropPosition}
                                                        onZoomChange={setCropZoom}
                                                        onCropComplete={(croppedArea) => setPendingCroppedArea(croppedArea)}
                                                    />
                                                </div>
                                                <div className="px-5 py-3 flex items-center gap-3">
                                                    <span className="text-xs text-gray-500">Zoom</span>
                                                    <input
                                                        type="range"
                                                        min={1}
                                                        max={3}
                                                        step={0.05}
                                                        value={cropZoom}
                                                        onChange={(e) => setCropZoom(Number(e.target.value))}
                                                        className="flex-1 accent-blue-600"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
                                                    <button
                                                        onClick={() => setShowCropModal(false)}
                                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (pendingCroppedArea) {
                                                                setAvatarCrop(pendingCroppedArea);
                                                            }
                                                            setShowCropModal(false);
                                                        }}
                                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
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

                            {/* Preview */}
                            <div className="flex items-center justify-center">
                                {/* Card + badge + text size */}
                                <div className="relative">
                                    <div className="absolute -top-3 right-3 z-10 flex items-center gap-1.5">
                                        {editablePosts.length > 1 && (
                                            <button
                                                onClick={() => {
                                                    if (editablePosts.length <= 1) return;
                                                    setEditablePosts(prev => prev.filter((_, i) => i !== currentPostIndex));
                                                    setTextSizes(prev => {
                                                        const next: Record<number, TextSize> = {};
                                                        for (const [k, v] of Object.entries(prev)) {
                                                            const idx = Number(k);
                                                            if (idx < currentPostIndex) next[idx] = v;
                                                            else if (idx > currentPostIndex) next[idx - 1] = v;
                                                        }
                                                        return next;
                                                    });
                                                    setCurrentPostIndex(i => Math.min(i, editablePosts.length - 2));
                                                    setEditingPostIndex(null);
                                                }}
                                                className="h-5 w-5 flex items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                                                title="Delete this slide"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        )}
                                        <div className="rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                                            Slide {currentPostIndex + 1} of {editablePosts.length}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        {/* Preview + edit overlay */}
                                        <div className="group">
                                            <div ref={editingPostIndex === currentPostIndex ? undefined : previewRef}>
                                                <VisualPreview
                                                    content={editablePosts[currentPostIndex]}
                                                    displayName={displayName}
                                                    handle={handle}
                                                    avatarUrl={avatarUrl}
                                                    avatarCrop={avatarCrop}
                                                    theme={theme}
                                                    style={style}
                                                    stats={stats}
                                                    roundedCorners={corners === 'rounded'}
                                                    gradient={gradient}
                                                    fontFamily={FONT_PRESETS.find(f => f.id === fontFamily)?.family}
                                                    textSize={textSizes[currentPostIndex] || null}
                                                    onOverflowChange={setIsCurrentPostOverflowing}
                                                    isEditing={editingPostIndex === currentPostIndex}
                                                    editValue={editDraft}
                                                    onEditChange={setEditDraft}
                                                />
                                            </div>
                                            {editingPostIndex !== currentPostIndex && (
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded-2xl cursor-pointer"
                                                    onClick={() => {
                                                        setEditDraft(editablePosts[currentPostIndex]);
                                                        setEditingPostIndex(currentPostIndex);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Pencil size={14} className="text-gray-700" />
                                                        <span className="text-sm font-medium text-gray-700">Edit text</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Left chevron */}
                                        {editablePosts.length > 1 && (
                                            <button
                                                onClick={() => setCurrentPostIndex((i) => Math.max(0, i - 1))}
                                                disabled={currentPostIndex === 0}
                                                className="absolute -left-4 top-1/2 -translate-x-full -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-20"
                                            >
                                                <ChevronLeft size={22} />
                                            </button>
                                        )}
                                        {/* Right chevron */}
                                        {editablePosts.length > 1 && (
                                            <button
                                                onClick={() => setCurrentPostIndex((i) => Math.min(editablePosts.length - 1, i + 1))}
                                                disabled={currentPostIndex === editablePosts.length - 1}
                                                className="absolute -right-4 top-1/2 translate-x-full -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors z-20"
                                            >
                                                <ChevronRight size={22} />
                                            </button>
                                        )}
                                        {/* Add slide — only on last slide */}
                                        {currentPostIndex === editablePosts.length - 1 && (
                                            <button
                                                onClick={() => {
                                                    setEditablePosts(prev => [...prev, '']);
                                                    setCurrentPostIndex(editablePosts.length);
                                                    setEditDraft('');
                                                    setEditingPostIndex(editablePosts.length);
                                                }}
                                                className="absolute -right-4 top-1/2 translate-x-full -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-sm transition-colors z-20"
                                                title="Add slide"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {/* Bottom bar: edit controls or text size toggle */}
                                    {editingPostIndex === currentPostIndex ? (
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-white border border-blue-300 shadow-sm px-2 py-1">
                                            <button
                                                onClick={() => setEditingPostIndex(null)}
                                                className="text-[10px] font-medium text-gray-600 hover:text-gray-800 px-2 py-0.5 rounded-full hover:bg-gray-100 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditablePosts(prev => {
                                                        const next = [...prev];
                                                        next[currentPostIndex] = editDraft;
                                                        return next;
                                                    });
                                                    setEditingPostIndex(null);
                                                }}
                                                className="flex items-center gap-1 text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-0.5 rounded-full transition-colors"
                                            >
                                                <Check size={10} />
                                                Apply
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-white border shadow-sm px-2 py-1 ${isCurrentPostOverflowing ? 'border-amber-300' : 'border-gray-200'}`}>
                                            <Type size={12} className="text-gray-400" />
                                            <span className="text-[10px] font-medium text-gray-500">Font size</span>
                                            <div className="flex items-center gap-0.5 ml-0.5">
                                                <button
                                                    onClick={() => {
                                                        const current = textSizes[currentPostIndex] || TEXT_SCALE[STYLE_RANGE[style].start];
                                                        const idx = TEXT_SCALE.indexOf(current as TextSize);
                                                        if (idx < STYLE_RANGE[style].end) setTextSizes(prev => ({ ...prev, [currentPostIndex]: TEXT_SCALE[idx + 1] }));
                                                    }}
                                                    className="h-5 w-5 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                                    title="Decrease font size"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (textSizes[currentPostIndex]) {
                                                            setTextSizes(prev => {
                                                                const next = { ...prev };
                                                                delete next[currentPostIndex];
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                    className={`text-[10px] font-bold min-w-[28px] text-center ${textSizes[currentPostIndex] ? 'text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-700'}`}
                                                    title={textSizes[currentPostIndex] ? 'Click to reset to Auto' : ''}
                                                >
                                                    {TEXT_SIZE_LABELS[textSizes[currentPostIndex]] || 'Auto'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const current = textSizes[currentPostIndex] || TEXT_SCALE[STYLE_RANGE[style].start];
                                                        const idx = TEXT_SCALE.indexOf(current as TextSize);
                                                        if (idx > STYLE_RANGE[style].start) setTextSizes(prev => ({ ...prev, [currentPostIndex]: TEXT_SCALE[idx - 1] }));
                                                    }}
                                                    className="h-5 w-5 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                                    title="Increase font size"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            {isCurrentPostOverflowing && (
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 ml-0.5" title="Text is too large for the card">
                                                    <AlertTriangle size={11} />
                                                    Overflowing
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>

                        </>
                    ) : (
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Caption / Description</label>
                            <AITextPopup textareaRef={descriptionRef} value={description} onChange={setDescription} />
                            <textarea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={14}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                placeholder="Add a description for when this visual is posted..."
                            />
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-400">{description.length} characters</span>
                                <span className="text-xs text-gray-300">·</span>
                                {PLATFORM_LIMITS.map(({ name, limit }) => {
                                    const over = description.length > limit;
                                    return (
                                        <span
                                            key={name}
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                                over
                                                    ? 'bg-red-50 text-red-600 border border-red-200'
                                                    : 'bg-green-50 text-green-600 border border-green-200'
                                            }`}
                                        >
                                            {name} {description.length}/{limit}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        <Download size={16} />
                        {downloading ? 'Generating...' : 'Download'}
                    </button>
                    {(isEditing || (sourceType === 'standalone') || (blogId && sourceType && sourceId)) && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                        >
                            <Save size={16} />
                            {saving ? 'Saving...' : isEditing ? 'Save' : 'Save to Visuals'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

