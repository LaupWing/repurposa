import { useState, useEffect, useRef } from '@wordpress/element';
import {
    AlertTriangle,
    Share2,
    Image,
    Copy,
    Check,
    Lightbulb,
    Layout,
    Calendar,
    Pencil,
    ImagePlus,
    X,
    Trash2,
    Plus,
    MoreHorizontal,
    Send,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@wordpress/components';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ShortPostSchedule, Visual } from '@/types';
import { AITextPopup } from '@/components/AITextPopup';
import ImagePickerModal from '@/components/ImagePickerModal';
import { VisualShortPostPreviewModal, VisualPreview, GRADIENT_PRESETS } from '@/components/repurpose/modals/VisualPreviewModal';
import { ConfirmDeleteModal } from '@/components/repurpose/modals';
import { createElement } from '@wordpress/element';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';

// ============================================
// TYPES
// ============================================

export interface ShortPostPattern {
    id: number;
    content: string;
    emotions: string[];
    structure: string;
    why_it_works: string;
    cta_content?: string;
    pending_cta?: string;
    is_generating_cta?: boolean;
    scheduled_posts?: ShortPostSchedule[];
    media: string[];
    cta_media: string[];
    visualCount: number;
}

// ============================================
// CONSTANTS
// ============================================

export const emotionColors: Record<string, string> = {
    Confident: 'bg-blue-100 text-blue-700 border-blue-200',
    Calm: 'bg-teal-100 text-teal-700 border-teal-200',
    Motivational: 'bg-orange-100 text-orange-700 border-orange-200',
    Provocative: 'bg-red-100 text-red-700 border-red-200',
    Honest: 'bg-slate-100 text-slate-700 border-slate-200',
    Reflective: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Contrarian: 'bg-violet-100 text-violet-700 border-violet-200',
    Educational: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// ============================================
// SUB-COMPONENTS
// ============================================

function SortableImage({ id, src, onRemove }: { id: string; src: string; onRemove: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group/img cursor-grab active:cursor-grabbing w-full h-full"
            {...attributes}
            {...listeners}
        >
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onRemove}
                className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/80"
            >
                <X size={12} />
            </button>
        </div>
    );
}

export function ImageGrid({
    media,
    onRemove,
    onReorder,
    onAddClick,
}: {
    media: string[];
    onRemove: (index: number) => void;
    onReorder: (from: number, to: number) => void;
    onAddClick: () => void;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    );

    const ids = media.map((_, i) => `img-${i}`);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = ids.indexOf(active.id as string);
            const newIndex = ids.indexOf(over.id as string);
            onReorder(oldIndex, newIndex);
        }
    };

    if (media.length === 0) return null;

    const gridClass =
        media.length === 1
            ? ''
            : media.length === 2
                ? 'grid grid-cols-2 gap-0.5'
                : 'grid grid-cols-2 grid-rows-2 gap-0.5';

    const aspectClass = 'aspect-video';

    return (
        <div className="mb-3">
            <div className={`rounded-xl overflow-hidden border border-gray-200 max-w-lg ${aspectClass}`}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={ids} strategy={rectSortingStrategy}>
                        <div className={`${gridClass} w-full h-full`}>
                            {media.map((src, i) => (
                                <div
                                    key={ids[i]}
                                    className={
                                        media.length === 3 && i === 0 ? 'row-span-2' : ''
                                    }
                                >
                                    <SortableImage
                                        id={ids[i]}
                                        src={src}
                                        onRemove={() => onRemove(i)}
                                    />
                                </div>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
            {media.length < 4 && (
                <button
                    onClick={onAddClick}
                    className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ImagePlus size={14} />
                    Add media ({media.length}/4)
                </button>
            )}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ShortPostCardProps {
    pattern: ShortPostPattern;
    index: number;
    blogId?: number;
    onDelete: () => void;
    onDeleteCta: () => void;
    onAddCta: () => void;
    onEdit: (content: string) => void;
    onEditCta: (content: string) => void;
    onSchedule: () => void;
    onPublishNow: () => void;
    onAddImage: (imageUrl: string) => void;
    onRemoveImage: (imageIndex: number) => void;
    onReorderImages: (from: number, to: number) => void;
    onAddCtaImage: (imageUrl: string) => void;
    onRemoveCtaImage: (imageIndex: number) => void;
    onReorderCtaImages: (from: number, to: number) => void;
    onVisualSaved?: (visual: Visual) => void;
    cardVisuals?: Visual[];
    onGoToVisual?: (visualId: number) => void;
    autoEdit?: boolean;
    isPublished?: boolean;
    onAcceptCta: (editedContent?: string) => void;
    onRejectCta: () => void;
}

export default function ShortPostCard({ pattern, index, blogId, onDelete, onDeleteCta, onAddCta, onEdit, onEditCta, onSchedule, onPublishNow, onAddImage, onRemoveImage, onReorderImages, onAddCtaImage, onRemoveCtaImage, onReorderCtaImages, onVisualSaved, cardVisuals, onGoToVisual, autoEdit, isPublished, onAcceptCta, onRejectCta }: ShortPostCardProps) {
    const [copied, setCopied] = useState(false);
    const [copiedCta, setCopiedCta] = useState(false);
    const [isEditing, setIsEditing] = useState(!!autoEdit);
    const cardRef = useRef<HTMLDivElement>(null);

    // Auto-scroll into view when deep-linked
    useEffect(() => {
        if (autoEdit && cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [autoEdit]);
    const [isEditingCta, setIsEditingCta] = useState(false);
    const [editContent, setEditContent] = useState(pattern.content);
    const [editCtaContent, setEditCtaContent] = useState(pattern.cta_content || '');
    const [menuOpen, setMenuOpen] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showCtaImagePicker, setShowCtaImagePicker] = useState(false);
    const [showVisualModal, setShowVisualModal] = useState(false);
    const [showVisualsPopover, setShowVisualsPopover] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const editCtaTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Seed edit textarea when pending CTA arrives
    useEffect(() => {
        if (pattern.pending_cta) {
            setEditCtaContent(pattern.pending_cta);
        }
    }, [pattern.pending_cta]);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    const handleCopy = () => {
        navigator.clipboard.writeText(pattern.content);
        setCopied(true);
        toast.success('Short post copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCta = () => {
        if (!pattern.cta_content) return;
        navigator.clipboard.writeText(pattern.cta_content);
        setCopiedCta(true);
        toast.success('CTA copied to clipboard');
        setTimeout(() => setCopiedCta(false), 2000);
    };

    const handleSaveEdit = () => {
        onEdit(editContent);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditContent(pattern.content);
        setIsEditing(false);
    };

    const handleSaveCtaEdit = () => {
        onEditCta(editCtaContent);
        setIsEditingCta(false);
        toast.success('CTA saved');
    };

    const handleCancelCtaEdit = () => {
        setEditCtaContent(pattern.cta_content || '');
        setIsEditingCta(false);
    };

    return (
        <div ref={cardRef} className="group relative mb-4">
            {/* Main Short Post */}
            <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
                {/* Pattern number */}
                <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white shadow-sm">
                    {index + 1}
                </div>

                {/* Badges container - top right */}
                {(pattern.visualCount > 0 || (pattern.scheduled_posts && pattern.scheduled_posts.length > 0)) && (
                    <div className="absolute -top-2 right-2 flex items-center gap-1.5 z-10">
                        {/* Visual count badge */}
                        {pattern.visualCount > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowVisualsPopover(!showVisualsPopover)}
                                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm border cursor-pointer transition-colors text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100"
                                >
                                    <Image size={10} />
                                    {pattern.visualCount} {pattern.visualCount === 1 ? 'Visual' : 'Visuals'}
                                </button>
                        {showVisualsPopover && cardVisuals && cardVisuals.length > 0 && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowVisualsPopover(false)} />
                                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-20 p-3 w-[280px]">
                                    <p className="text-xs font-medium text-gray-500 mb-2">Visuals from this post</p>
                                    <div className="flex flex-wrap gap-2">
                                        {cardVisuals.map((visual) => {
                                            const settings = visual.settings;
                                            const previewGradient = GRADIENT_PRESETS.find(g => g.id === settings?.gradient_id) || GRADIENT_PRESETS[0];
                                            return (
                                                <button
                                                    key={visual.id}
                                                    onClick={() => {
                                                        setShowVisualsPopover(false);
                                                        onGoToVisual?.(visual.id);
                                                    }}
                                                    className="w-[80px] h-[80px] rounded-lg overflow-hidden border border-gray-200 hover:border-violet-400 hover:shadow-md transition-all cursor-pointer flex-shrink-0"
                                                >
                                                    <div style={{ transform: 'scale(0.16)', transformOrigin: 'top left', width: '500px', height: '500px' }}>
                                                        <VisualPreview
                                                            content={Array.isArray(visual.content) ? visual.content[0] : visual.content}
                                                            displayName={settings?.display_name || 'Name'}
                                                            handle={settings?.handle || 'handle'}
                                                            avatarUrl={settings?.avatar_url}
                                                            theme={settings?.theme || 'light'}
                                                            style={settings?.style || 'detailed'}
                                                            stats={settings?.stats || { views: 0, reposts: 0, quotes: 0, likes: 0, bookmarks: 0 }}
                                                            roundedCorners={settings?.corners === 'rounded'}
                                                            gradient={previewGradient}
                                                        />
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                            </div>
                        )}

                        {/* Schedule status badge */}
                        {pattern.scheduled_posts && pattern.scheduled_posts.length > 0 && (() => {
                            const platformIcons: Record<string, React.ReactNode> = {
                                twitter: createElement(RiTwitterXFill, { size: 10 }),
                                linkedin: createElement(RiLinkedinFill, { size: 10 }),
                                threads: createElement(RiThreadsFill, { size: 10 }),
                                instagram: createElement(RiInstagramFill, { size: 10 }),
                                facebook: createElement(RiFacebookFill, { size: 10 }),
                            };
                            const statusByPlatform = new Map<string, string>();
                            for (const sp of pattern.scheduled_posts) {
                                statusByPlatform.set(sp.platform, sp.status);
                            }
                            const hasFailed = pattern.scheduled_posts.some(sp => sp.status === 'failed');
                            const allPublished = pattern.scheduled_posts.every(sp => sp.status === 'published');
                            const s = pattern.scheduled_posts[0];
                            const dt = new Date(s.scheduled_at);
                            const timeStr = dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                            const badgeStyle = hasFailed
                                ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
                                : allPublished
                                    ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                                    : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100';
                            const statusColor = (status: string) =>
                                status === 'failed' ? 'text-red-500' : status === 'published' ? 'text-green-500' : 'text-blue-500';
                            return (
                                <button
                                    onClick={onSchedule}
                                    className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm border cursor-pointer transition-colors ${badgeStyle}`}
                                >
                                    {hasFailed ? <AlertTriangle size={10} /> : allPublished ? <Check size={10} /> : <Calendar size={10} />}
                                    {hasFailed ? 'Failed' : allPublished ? 'Published' : timeStr}
                                    <span className="flex items-center gap-0.5">
                                        {[...statusByPlatform.entries()].map(([p, status]) => (
                                            <span key={p} className={statusColor(status)}>{platformIcons[p]}</span>
                                        ))}
                                    </span>
                                </button>
                            );
                        })()}
                    </div>
                )}

                {/* Emotions */}
                <div className="mt-1 mb-3 flex flex-wrap items-center gap-1.5">
                    {pattern.emotions.map((emotion) => (
                        <span
                            key={emotion}
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                emotionColors[emotion] || 'border-gray-200 bg-gray-100 text-gray-600'
                            }`}
                        >
                            {emotion}
                        </span>
                    ))}
                </div>

                {/* Content */}
                <div className="mb-3">
                    {isEditing ? (
                        <div>
                            <AITextPopup textareaRef={editTextareaRef} value={editContent} onChange={setEditContent} />
                            <textarea
                                ref={editTextareaRef}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                rows={5}
                                style={{ fieldSizing: 'content' } as React.CSSProperties}
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <span className={`text-xs font-mono ${editContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {editContent.length}/280
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        pattern.content.split('\n').map((line, i) => (
                            <p key={i} className="text-sm leading-relaxed text-gray-800">
                                {line || <span className="block h-2" />}
                            </p>
                        ))
                    )}
                </div>

                {/* Image Grid */}
                {!isEditing && pattern.media.length > 0 && (
                    <ImageGrid
                        media={pattern.media}
                        onRemove={onRemoveImage}
                        onReorder={onReorderImages}
                        onAddClick={() => setShowImagePicker(true)}
                    />
                )}

                {/* Footer */}
                {!isEditing && (
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        {/* Left - Char count + Schedule status + Info tooltips */}
                        <div className="flex items-center gap-3">
                            <span className={`font-mono text-[10px] ${pattern.content.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                {pattern.content.length}/280
                            </span>
                            <Tooltip text={pattern.why_it_works} delay={0} placement="top">
                                <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-default transition-colors bg-transparent border-none p-0">
                                    <Lightbulb size={14} />
                                    Why it works
                                </button>
                            </Tooltip>
                            <Tooltip text={pattern.structure} delay={0} placement="top">
                                <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-default transition-colors bg-transparent border-none p-0">
                                    <Layout size={14} />
                                    Structure
                                </button>
                            </Tooltip>
                        </div>

                        {/* Right - Actions */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={onSchedule}
                                className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <Calendar size={14} />
                            </button>
                            {/* More menu */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                                        menuOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                    }`}
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                                {menuOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-20">
                                        <button
                                            onClick={() => { handleCopy(); setMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={() => { setShowImagePicker(true); setMenuOpen(false); }}
                                            disabled={pattern.media.length >= 4}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <ImagePlus size={14} />
                                            Add Image{pattern.media.length > 0 ? ` (${pattern.media.length}/4)` : ''}
                                        </button>
                                        <button
                                            onClick={() => { onPublishNow(); setMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Send size={14} />
                                            Publish Now
                                        </button>
                                        <button
                                            onClick={() => { setShowVisualModal(true); setMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Image size={14} />
                                            Turn into Visual
                                        </button>
                                        <div className="border-t border-gray-100 my-1" />
                                        <button
                                            onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* CTA generation states (no existing CTA + published) */}
            {!pattern.cta_content && isPublished && (
                <div className="ml-6 mt-2">
                    {pattern.is_generating_cta ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg">
                            <Loader2 size={14} className="animate-spin" />
                            Generating CTA...
                        </div>
                    ) : pattern.pending_cta ? (
                        <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                                <Sparkles size={12} />
                                Generated CTA Preview
                            </div>
                            <textarea
                                value={editCtaContent}
                                onChange={(e) => setEditCtaContent(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                rows={3}
                                style={{ fieldSizing: 'content' } as React.CSSProperties}
                            />
                            <div className="flex items-center justify-between pt-1">
                                <span className={`font-mono text-[10px] ${editCtaContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {editCtaContent.length}/280
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onAddCta}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Sparkles size={12} />
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={onRejectCta}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X size={12} />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => onAcceptCta(editCtaContent)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                    >
                                        <Check size={12} />
                                        Accept
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onAddCta}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Plus size={14} />
                            Add CTA Reply
                        </button>
                    )}
                </div>
            )}

            {/* CTA Reply */}
            {pattern.cta_content && (
                <div className="relative ml-6 mt-0">
                    {/* Thread connector line */}
                    <div className="absolute top-0 left-4 h-4 w-0.5 bg-gray-200" />

                    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <Share2 size={12} className="text-gray-400" />
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                                    Reply · CTA
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="mb-3">
                            {isEditingCta ? (
                                <div>
                                    <AITextPopup textareaRef={editCtaTextareaRef} value={editCtaContent} onChange={setEditCtaContent} />
                                    <textarea
                                        ref={editCtaTextareaRef}
                                        value={editCtaContent}
                                        onChange={(e) => setEditCtaContent(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                        rows={3}
                                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                                    />
                                    <div className="mt-2 flex items-center justify-end gap-2">
                                        <button
                                            onClick={handleCancelCtaEdit}
                                            className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveCtaEdit}
                                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
                                    {pattern.cta_content}
                                </div>
                            )}
                        </div>

                        {/* CTA Image Grid */}
                        {!isEditingCta && pattern.cta_media.length > 0 && (
                            <ImageGrid
                                media={pattern.cta_media}
                                onRemove={onRemoveCtaImage}
                                onReorder={onReorderCtaImages}
                                onAddClick={() => setShowCtaImagePicker(true)}
                            />
                        )}

                        {/* Footer */}
                        {!isEditingCta && (
                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                                <span className={`font-mono text-[10px] ${(pattern.cta_content?.length || 0) > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {pattern.cta_content?.length || 0}/280
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleCopyCta}
                                        className={`h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 ${
                                            copiedCta ? 'text-green-500' : 'text-gray-400'
                                        }`}
                                    >
                                        {copiedCta ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                    <button
                                        onClick={() => setShowCtaImagePicker(true)}
                                        disabled={pattern.cta_media.length >= 4}
                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <ImagePlus size={14} />
                                    </button>
                                    <button
                                        onClick={() => { setEditCtaContent(pattern.cta_content || ''); setIsEditingCta(true); }}
                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        onClick={onDeleteCta}
                                        className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Picker Modals */}
            <ImagePickerModal
                isOpen={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelect={(imageUrl) => {
                    onAddImage(imageUrl);
                    setShowImagePicker(false);
                }}
            />
            <ImagePickerModal
                isOpen={showCtaImagePicker}
                onClose={() => setShowCtaImagePicker(false)}
                onSelect={(imageUrl) => {
                    onAddCtaImage(imageUrl);
                    setShowCtaImagePicker(false);
                }}
            />
            <VisualShortPostPreviewModal
                isOpen={showVisualModal}
                onClose={() => setShowVisualModal(false)}
                content={pattern.content}
                blogId={blogId}
                sourceId={pattern.id}
                onSaved={(visual) => {
                    onVisualSaved?.(visual);
                    toast.success('Saved to visuals');
                }}
            />
            <ConfirmDeleteModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => { onDelete(); toast.success('Short post deleted'); }}
                title="Delete Short Post"
                description="This short post will be permanently deleted. This action cannot be undone."
            />
        </div>
    );
}
