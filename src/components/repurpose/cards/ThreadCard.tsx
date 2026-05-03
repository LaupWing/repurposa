import { useState, useEffect, useRef } from '@wordpress/element';
import {
    AlertTriangle,
    Image,
    Copy,
    Check,
    Lightbulb,
    Layout,
    Calendar,
    Pencil,
    ImagePlus,
    Trash2,
    Plus,
    MoreHorizontal,
    Send,
    Link2,
    Loader2,
    Sparkles,
    Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@wordpress/components';
import type { ThreadItem, Visual } from '@/types';
import { AITextPopup } from '@/components/AITextPopup';
import ImagePickerModal from '@/components/ImagePickerModal';
import { VisualPreviewModal } from '@/components/repurpose/modals/VisualPreviewModal';
import { ConfirmDeleteModal } from '@/components/repurpose/modals';
import { emotionColors } from './ShortPostCard';
import { ImageGrid } from './ImageGrid';
import { createElement } from '@wordpress/element';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';

// ============================================
// SUB-COMPONENT
// ============================================

function InsertPopover({ onInsertPost, onInsertCta }: { onInsertPost: () => void; onInsertCta: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="relative z-[1] h-6 w-6 flex items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500 transition-all shadow-sm"
            >
                <Plus size={13} />
            </button>
            {open && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-10 w-36">
                    <button
                        onClick={() => { onInsertPost(); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Plus size={12} />
                        Post
                    </button>
                    <button
                        onClick={() => { onInsertCta(); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <Link2 size={12} />
                        CTA Reply
                    </button>
                </div>
            )}
        </div>
    );
}

function ThreadPostItem({ post, idx, isLast, hideInsert, onEdit, onDelete, onInsertBelow, onAddImage, onRemoveImage, onReorderImages, autoEdit, onAutoEditHandled, onCreateCta }: {
    post: ThreadItem['posts'][number];
    idx: number;
    isLast: boolean;
    hideInsert?: boolean;
    onEdit: (content: string) => void;
    onDelete: () => void;
    onInsertBelow: () => void;
    onAddImage: (url: string, type: 'image' | 'video', mime?: string) => void;
    onRemoveImage: (imageIndex: number) => void;
    onReorderImages: (from: number, to: number) => void;
    autoEdit?: boolean;
    onAutoEditHandled?: () => void;
    onCreateCta?: () => void;
}) {
    const [isEditing, setIsEditing] = useState(autoEdit || false);
    const [editContent, setEditContent] = useState(post.content);

    useEffect(() => {
        if (autoEdit) {
            setIsEditing(true);
            onAutoEditHandled?.();
        }
    }, [autoEdit]);

    const [copied, setCopied] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [postMenuOpen, setPostMenuOpen] = useState(false);
    const postMenuRef = useRef<HTMLDivElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);

    useEffect(() => {
        if (!postMenuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (postMenuRef.current && !postMenuRef.current.contains(e.target as Node)) {
                setPostMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [postMenuOpen]);

    const handleCopy = () => {
        navigator.clipboard.writeText(post.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        onEdit(editContent);
        setIsEditing(false);
        toast.success('Tweet saved');
    };

    const handleCancel = () => {
        if (!post.content) {
            onDelete();
            return;
        }
        setEditContent(post.content);
        setIsEditing(false);
    };

    return (
        <div className="relative pb-4 pl-8 last:pb-0">
            {/* Thread line */}
            {!isLast && (
                <div className="absolute top-6 left-[11px] h-[calc(100%-12px)] w-[2px] bg-gray-200" />
            )}
            {/* Number dot */}
            <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-500">
                {idx + 1}
            </div>
            {/* Content */}
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                {isEditing ? (
                    <div>
                        <AITextPopup textareaRef={editTextareaRef} value={editContent} onChange={setEditContent} />
                        <textarea
                            ref={editTextareaRef}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                            rows={4}
                            style={{ fieldSizing: 'content' } as React.CSSProperties}
                        />
                        <div className="mt-2 flex items-center justify-between">
                            <span className={`text-xs font-mono ${editContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                {editContent.length}/280
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCancel}
                                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                            {post.content}
                        </p>
                        {/* Media */}
                        {post.media && post.media.length > 0 && (
                            <div className="mt-2">
                                <ImageGrid
                                    media={post.media}
                                    onRemove={onRemoveImage}
                                    onReorder={onReorderImages}
                                    onAddClick={() => setShowImagePicker(true)}
                                />
                            </div>
                        )}
                        {/* Footer */}
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                            <div className="flex items-center gap-3">
                                <span
                                    className={`font-mono text-[10px] ${
                                        post.content.length > 280 ? 'text-red-500' : 'text-gray-400'
                                    }`}
                                >
                                    {post.content.length}/280
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                >
                                    <Pencil size={14} />
                                </button>
                                <div className="relative" ref={postMenuRef}>
                                    <button
                                        onClick={() => setPostMenuOpen(!postMenuOpen)}
                                        className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                                            postMenuOpen ? 'bg-gray-100 text-gray-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                        }`}
                                    >
                                        <MoreHorizontal size={14} />
                                    </button>
                                    {postMenuOpen && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-10">
                                            <button
                                                onClick={() => { handleCopy(); setPostMenuOpen(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                {copied ? 'Copied!' : 'Copy'}
                                            </button>
                                            <button
                                                onClick={() => { setShowImagePicker(true); setPostMenuOpen(false); }}
                                                disabled={(post.media?.length ?? 0) >= 4}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <ImagePlus size={14} />
                                                Add Media{post.media?.length ? ` (${post.media.length}/4)` : ''}
                                            </button>
                                            <div className="border-t border-gray-100 my-1" />
                                            <button
                                                onClick={() => { setShowDeleteConfirm(true); setPostMenuOpen(false); }}
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
                    </>
                )}
            </div>
            {/* Insert post below button */}
            {!isLast && !hideInsert && (
                <div className="relative flex items-center justify-center my-1">
                    <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed border-gray-200" />
                    <InsertPopover onInsertPost={onInsertBelow} onInsertCta={() => onCreateCta?.()} />
                </div>
            )}
            <ImagePickerModal
                isOpen={showImagePicker}
                onClose={() => setShowImagePicker(false)}
                onSelect={(url, type, mime) => {
                    onAddImage(url, type, mime);
                    setShowImagePicker(false);
                }}
            />
            <ConfirmDeleteModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => { onDelete(); toast.success('Thread post deleted'); }}
                title="Delete Thread Post"
                description="This post will be removed from the thread. This action cannot be undone."
            />
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface ThreadCardProps {
    thread: ThreadItem;
    index: number;
    onEditPost: (postIndex: number, content: string) => void;
    onDeletePost: (postIndex: number) => void;
    onInsertPost: (afterIndex: number) => void;
    onEditHook: (content: string) => void;
    onSchedule: () => void;
    onPublishNow: () => void;
    onDelete: () => void;
    onInsertCtaPost: (afterIndex: number, content: string) => void;
    onGenerateCta: (content: string[]) => Promise<string | null>;
    onAddImage: (postIndex: number, url: string, type: 'image' | 'video', mime?: string) => void;
    onRemoveImage: (postIndex: number, imageIndex: number) => void;
    onReorderImages: (postIndex: number, from: number, to: number) => void;
    blogId?: number;
    onVisualSaved?: (visual: Visual) => void;
    isPublished?: boolean;
}

export default function ThreadCard({ thread, index, onEditPost, onDeletePost, onInsertPost, onEditHook, onSchedule, onPublishNow, onDelete, onInsertCtaPost, onGenerateCta, onAddImage, onRemoveImage, onReorderImages, blogId, onVisualSaved, isPublished }: ThreadCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingHook, setIsEditingHook] = useState(false);
    const [editHookContent, setEditHookContent] = useState(thread.hook);
    const editHookRef = useRef<HTMLTextAreaElement>(null);
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [showVisualModal, setShowVisualModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [autoEditIndex, setAutoEditIndex] = useState<number | null>(null);
    const [isCtaOpen, setIsCtaOpen] = useState(false);
    const [ctaAfterIndex, setCtaAfterIndex] = useState<number>(0);
    const [ctaContent, setCtaContent] = useState('');
    const [isGeneratingCta, setIsGeneratingCta] = useState(false);
    const ctaTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Stable unique keys for posts so React doesn't reuse components on insert/delete
    const nextKeyId = useRef(thread.posts.length);
    const [postKeys, setPostKeys] = useState<string[]>(() =>
        thread.posts.map((_, i) => `p-${i}`)
    );

    // Reset keys if thread identity changes (e.g. regeneration)
    const prevThreadId = useRef(thread.id);
    if (thread.id !== prevThreadId.current) {
        prevThreadId.current = thread.id;
        nextKeyId.current = thread.posts.length;
        setPostKeys(thread.posts.map((_, i) => `p-${i}`));
    }

    const handleInsertPost = (afterIdx: number) => {
        const newKey = `p-${nextKeyId.current++}`;
        setPostKeys(prev => [...prev.slice(0, afterIdx + 1), newKey, ...prev.slice(afterIdx + 1)]);
        onInsertPost(afterIdx);
        setAutoEditIndex(afterIdx + 1);
    };

    const handleDeletePost = (idx: number) => {
        setPostKeys(prev => prev.filter((_, i) => i !== idx));
        onDeletePost(idx);
    };

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

    const handleCopyAll = () => {
        const fullThread = thread.posts.map((p) => p.content).join('\n\n---\n\n');
        navigator.clipboard.writeText(fullThread);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const totalChars = thread.posts.reduce((sum, p) => sum + p.content.length, 0);

    const generateCtaForIndex = async (afterIdx: number) => {
        const contentUpTo = thread.posts.slice(0, afterIdx + 1).map(p => p.content);
        setIsGeneratingCta(true);
        const result = await onGenerateCta(contentUpTo);
        setIsGeneratingCta(false);
        if (result) setCtaContent(result);
    };

    const handleGenerateCtaClick = () => {
        generateCtaForIndex(ctaAfterIndex);
    };

    const handleSaveCta = () => {
        if (!ctaContent.trim()) return;
        const newKey = `p-${nextKeyId.current++}`;
        setPostKeys(prev => [...prev.slice(0, ctaAfterIndex + 1), newKey, ...prev.slice(ctaAfterIndex + 1)]);
        onInsertCtaPost(ctaAfterIndex, ctaContent);
        setIsCtaOpen(false);
        setCtaContent('');
    };

    return (
        <div className="group relative mb-4">
            <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white shadow-sm z-10">
                {index + 1}
            </div>
        <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
            {/* Schedule status badge - top right */}
            {thread.scheduled_posts && thread.scheduled_posts.length > 0 && (() => {
                const platformIcons: Record<string, React.ReactNode> = {
                    twitter: createElement(RiTwitterXFill, { size: 10 }),
                    linkedin: createElement(RiLinkedinFill, { size: 10 }),
                    threads: createElement(RiThreadsFill, { size: 10 }),
                    instagram: createElement(RiInstagramFill, { size: 10 }),
                    facebook: createElement(RiFacebookFill, { size: 10 }),
                };
                const statusByPlatform = new Map<string, string>();
                for (const sp of thread.scheduled_posts) {
                    statusByPlatform.set(sp.platform, sp.status);
                }
                const hasFailed = thread.scheduled_posts.some(sp => sp.status === 'failed');
                const allPublished = thread.scheduled_posts.every(sp => sp.status === 'published');
                const s = thread.scheduled_posts[0];
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
                        className={`absolute -top-2 right-2 flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm border cursor-pointer transition-colors z-10 ${badgeStyle}`}
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
            {/* Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 pt-4 pb-4 flex items-start gap-3 text-left hover:bg-gray-50 cursor-pointer"
            >
                <div className="min-w-0 flex-1">
                    {/* Emotions */}
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        {thread.metadata.emotions.map((emotion) => (
                            <span
                                key={emotion}
                                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                                    emotionColors[emotion] || 'border-gray-200 bg-gray-100 text-gray-600'
                                }`}
                            >
                                {emotion}
                            </span>
                        ))}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {thread.posts.length} posts
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {totalChars} chars
                        </span>
                    </div>
                    {isEditingHook ? (
                        <div className="py-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <AITextPopup textareaRef={editHookRef} value={editHookContent} onChange={setEditHookContent} />
                            <textarea
                                ref={editHookRef}
                                value={editHookContent}
                                onChange={(e) => setEditHookContent(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                rows={4}
                                style={{ fieldSizing: 'content' } as React.CSSProperties}
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <span className={`text-xs font-mono ${editHookContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {editHookContent.length}/280
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setEditHookContent(thread.hook); setIsEditingHook(false); }}
                                        className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { onEditHook(editHookContent); setIsEditingHook(false); }}
                                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-800 font-medium py-2 whitespace-pre-wrap">
                            {thread.hook}
                        </p>
                    )}
                </div>
            </div>

            {/* Metadata - always visible */}
            <div className="flex items-center justify-between px-4 pb-3 pt-3 mx-4 border-t border-gray-100 -mt-1">
                {/* Left - Char count + Info tooltips */}
                <div className="flex items-center gap-3">
                    <span className={`font-mono text-[10px] ${thread.hook.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                        {thread.hook.length}/280
                    </span>
                    <Tooltip text={thread.metadata.why_it_works} delay={0} placement="top">
                        <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-default transition-colors bg-transparent border-none p-0">
                            <Lightbulb size={14} />
                            Why it works
                        </button>
                    </Tooltip>
                    <Tooltip text={thread.metadata.structure} delay={0} placement="top">
                        <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-default transition-colors bg-transparent border-none p-0">
                            <Layout size={14} />
                            Structure
                        </button>
                    </Tooltip>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-1">
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
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-10">
                                <button
                                    onClick={() => { handleCopyAll(); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy All'}
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

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-gray-500">{totalChars} total characters</span>
                        <button
                            onClick={handleCopyAll}
                            className={`text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 ${
                                copied ? 'text-green-500' : 'text-gray-500'
                            }`}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy All'}
                        </button>
                    </div>

                    <div className="relative mt-2">
                        {thread.posts.map((post, idx) => (
                            <div key={postKeys[idx] || idx}>
                                <ThreadPostItem
                                    post={post}
                                    idx={idx}
                                    isLast={idx === thread.posts.length - 1 && !isCtaOpen}
                                    hideInsert={isCtaOpen && ctaAfterIndex === idx}
                                    onEdit={(content) => onEditPost(idx, content)}
                                    onDelete={() => handleDeletePost(idx)}
                                    onInsertBelow={() => handleInsertPost(idx)}
                                    onAddImage={(url, type, mime) => onAddImage(idx, url, type, mime)}
                                    onRemoveImage={(imgIdx) => onRemoveImage(idx, imgIdx)}
                                    onReorderImages={(from, to) => onReorderImages(idx, from, to)}
                                    autoEdit={autoEditIndex === idx}
                                    onAutoEditHandled={() => setAutoEditIndex(null)}
                                    onCreateCta={() => {
                                        setCtaAfterIndex(idx);
                                        setIsCtaOpen(true);
                                        setCtaContent('');
                                        if (isPublished) generateCtaForIndex(idx);
                                    }}
                                />
                                {/* Inline CTA input after this post */}
                                {isCtaOpen && ctaAfterIndex === idx && (
                                    <div className="relative pb-4 pl-8">
                                        {/* Thread line */}
                                        {idx < thread.posts.length - 1 && (
                                            <div className="absolute top-6 left-[11px] h-[calc(100%-12px)] w-[2px] bg-gray-200" />
                                        )}
                                        {/* CTA dot */}
                                        <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full border border-blue-300 bg-blue-50 text-[10px] font-medium text-blue-600">
                                            <Link2 size={10} />
                                        </div>
                                        <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3 space-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                                                <Share2 size={12} />
                                                CTA Reply
                                            </div>
                                            {isGeneratingCta ? (
                                                <div className="flex items-center gap-2 px-3 py-4 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg justify-center">
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Generating CTA...
                                                </div>
                                            ) : (
                                                <>
                                                    <AITextPopup textareaRef={ctaTextareaRef} value={ctaContent} onChange={setCtaContent} />
                                                    <textarea
                                                        ref={ctaTextareaRef}
                                                        value={ctaContent}
                                                        onChange={(e) => setCtaContent(e.target.value)}
                                                        placeholder="Write your CTA or click Generate..."
                                                        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none resize-none"
                                                        rows={3}
                                                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                                                    />
                                                </>
                                            )}
                                            <div className="flex items-center justify-between pt-1">
                                                <span className={`font-mono text-[10px] ${ctaContent.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {ctaContent.length}/280
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {!isPublished ? (
                                                        <Tooltip text="Publish the blog first to generate a CTA with link" placement="bottom" delay={0}>
                                                            <span className="inline-block">
                                                                <button
                                                                    disabled
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 rounded-lg opacity-40 cursor-not-allowed pointer-events-none"
                                                                >
                                                                    <Sparkles size={12} />
                                                                    Generate
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    ) : (
                                                        <button
                                                            onClick={handleGenerateCtaClick}
                                                            disabled={isGeneratingCta}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            <Sparkles size={12} />
                                                            {ctaContent ? 'Regenerate' : 'Generate'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setIsCtaOpen(false); setCtaContent(''); }}
                                                        disabled={isGeneratingCta}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSaveCta}
                                                        disabled={!ctaContent.trim() || isGeneratingCta}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        <Check size={12} />
                                                        Save
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* Add at end */}
                        <div className="pl-8 pt-1 flex items-center">
                            <InsertPopover
                                onInsertPost={() => {
                                    handleInsertPost(thread.posts.length - 1);
                                    setIsExpanded(true);
                                }}
                                onInsertCta={() => {
                                    const lastIdx = thread.posts.length - 1;
                                    setCtaAfterIndex(lastIdx);
                                    setIsCtaOpen(true);
                                    setCtaContent('');
                                    if (isPublished) generateCtaForIndex(lastIdx);
                                }}
                            />
                            <span className="ml-2 text-xs text-gray-400">Add</span>
                        </div>
                    </div>
                </div>
            )}

            <VisualPreviewModal
                isOpen={showVisualModal}
                onClose={() => setShowVisualModal(false)}
                content={thread.posts.map(p => p.content)}
                sourceType="thread"
                blogId={blogId}
                sourceId={thread.id}
                onSaved={(visual) => {
                    onVisualSaved?.(visual);
                    toast.success('Saved to visuals');
                }}
            />
            <ConfirmDeleteModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => { onDelete(); toast.success('Thread deleted'); }}
                title="Delete Thread"
                description="This thread and all its posts will be permanently deleted. This action cannot be undone."
            />
            </div>
        </div>
    );
}
