/**
 * Blog View Page
 *
 * Single blog view with tabs on top and content below.
 * Blog Post tab shows editor, other tabs show repurpose content.
 */

import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { toast } from 'sonner';
import {
    ChevronLeft,
    PenTool,
    Share2,
    FileText,
    Image,
    Video,
    Save,
    Sparkles,
    X,
    Check,
    Trash2,
    Loader2,
    Settings,
    AlertCircle,
    RefreshCw,
    GripVertical,
    Pencil,
    Plus,
    ListOrdered,
    Info,
    History,
    RotateCcw,
    Clock,
    Zap,
    Search,
    BookOpen,
    ChevronDown,
} from 'lucide-react';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { RepurposePanel } from '@/components/repurpose/RepurposePanel';
import ImagePickerModal from '@/components/ImagePickerModal';
import { getBlog, updateBlog, deleteBlog, regenerateBlog, generateOutline, generateTopics, getVersions, createVersion, restoreVersion, refineText } from '@/services/blogApi';
import type { TopicSuggestion, BlogGenerationMode, BlogPost, OutlineSection, PostVersion } from '@/types';

import { useProfile } from '@/context/ProfileContext';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ============================================
// TYPES
// ============================================

type ContentTab = 'blog' | 'short' | 'threads' | 'visuals' | 'video' | 'settings';

interface BlogViewPageProps {
    postId?: number;
    onBack?: () => void;
}


// ============================================
// SUB-COMPONENTS
// ============================================

function PublishModal({
    isOpen,
    onClose,
    onPublish,
}: {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (publishNow: boolean) => void;
}) {
    const [publishNow, setPublishNow] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Publish to WordPress</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-sm text-gray-600 mb-5">
                        This will publish your blog post to WordPress. Once published, it will be visible on your website.
                    </p>

                    {/* Checkbox */}
                    <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors">
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={publishNow}
                                onChange={(e) => setPublishNow(e.target.checked)}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    publishNow
                                        ? 'bg-[#2271b1] border-[#2271b1]'
                                        : 'border-gray-300 bg-white'
                                }`}
                            >
                                {publishNow && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900">Publish right away</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Also publish scheduled social media posts immediately
                            </p>
                        </div>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onPublish(publishNow)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#2271b1] hover:bg-[#135e96] rounded-lg transition-colors"
                    >
                        Publish
                    </button>
                </div>
            </div>
        </div>
    );
}

function DisabledTabsOverlay() {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg cursor-not-allowed bg-gray-200/60 backdrop-blur-[1px]"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle size={14} />
                <span className="text-xs font-medium">Content required</span>
            </div>

            {showTooltip && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 px-3 py-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 text-center leading-relaxed">
                    Write your blog content first before you can use these features.
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
            )}
        </div>
    );
}

// ============================================
// REGENERATE MODAL
// ============================================

interface RegenerateSection {
    id: string;
    title: string;
    purpose: string;
}

function SortableRegenerateItem({
    section,
    index,
    onRemove,
    onEdit,
}: {
    section: RegenerateSection;
    index: number;
    onRemove: () => void;
    onEdit: (title: string, purpose: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(section.title);
    const [editPurpose, setEditPurpose] = useState(section.purpose);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSave = () => {
        onEdit(editTitle, editPurpose);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditTitle(section.title);
        setEditPurpose(section.purpose);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div ref={setNodeRef} style={style} className="rounded-lg border-2 border-blue-500 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white mt-1">
                        {index + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
                            placeholder="Section title"
                            autoFocus
                        />
                        <textarea
                            value={editPurpose}
                            onChange={(e) => setEditPurpose(e.target.value)}
                            className="w-full resize-none rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 focus:border-blue-500 focus:outline-none"
                            placeholder="What this section covers..."
                            rows={2}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={handleCancel} className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSave} className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="group rounded-lg border border-gray-200 bg-gray-50 p-3 hover:border-gray-300 transition-colors">
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    className="mt-0.5 cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={14} />
                </button>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {index + 1}
                </span>
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setIsEditing(true)}
                >
                    <h4 className="text-sm font-semibold text-gray-900" style={{ margin: 0 }}>{section.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5" style={{ margin: 0 }}>{section.purpose}</p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditing(true)} className="rounded p-1 hover:bg-gray-200">
                        <Pencil size={12} className="text-gray-500" />
                    </button>
                    <button onClick={onRemove} className="rounded p-1 hover:bg-red-100">
                        <Trash2 size={12} className="text-red-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function RegenerateModal({
    onClose,
    post,
    onRegenerated,
}: {
    onClose: () => void;
    post: BlogPost;
    onRegenerated: (title: string, content: string) => void;
}) {
    const { profile } = useProfile();
    const [activeStep, setActiveStep] = useState<'rough' | 'outline'>('rough');
    const [topic, setTopic] = useState(post.topic || '');
    const [targetAudience, setTargetAudience] = useState(profile?.target_audience || '');
    const [roughOutline, setRoughOutline] = useState<string[]>([]);
    const [newIdea, setNewIdea] = useState('');
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [outline, setOutline] = useState<RegenerateSection[]>(() =>
        (post.outline || []).map((s, i) => ({ id: `section-${i + 1}`, title: s.title, purpose: s.purpose }))
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationMode, setGenerationMode] = useState<BlogGenerationMode>('quick');
    const [openSection, setOpenSection] = useState<string | null>('info');
    const [showConfirm, setShowConfirm] = useState(false);
    const toggleSection = (key: string) => setOpenSection(prev => prev === key ? null : key);

    // Topic generation
    const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
    const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
    const [showTopicPopover, setShowTopicPopover] = useState(false);
    const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = outline.findIndex((s) => s.id === active.id);
            const newIndex = outline.findIndex((s) => s.id === over.id);
            setOutline(arrayMove(outline, oldIndex, newIndex));
        }
    };

    const addSection = () => {
        setOutline([...outline, { id: `section-${Date.now()}`, title: '', purpose: '' }]);
    };

    const removeSection = (id: string) => {
        setOutline(outline.filter((s) => s.id !== id));
    };

    const updateSection = (id: string, title: string, purpose: string) => {
        setOutline(outline.map((s) => (s.id === id ? { ...s, title, purpose } : s)));
    };

    const addIdea = () => {
        const trimmed = newIdea.trim();
        if (!trimmed) return;
        setRoughOutline([...roughOutline, trimmed]);
        setNewIdea('');
    };

    const removeIdea = (index: number) => {
        setRoughOutline(roughOutline.filter((_, i) => i !== index));
    };

    const handleGenerateTopics = async () => {
        if (!topic.trim()) {
            toast.error('Please enter a topic or rough idea first');
            return;
        }
        setIsGeneratingTopics(true);
        try {
            const response = await generateTopics(topic, {
                target_audience: targetAudience || undefined,
            });
            setTopicSuggestions(response.suggestions);
            setShowTopicPopover(true);
        } catch (error) {
            console.error('Failed to generate topics:', error);
            toast.error('Failed to generate topics', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingTopics(false);
        }
    };

    const selectTopic = (suggestion: TopicSuggestion) => {
        setTopic(suggestion.title);
        setShowTopicPopover(false);
        setTopicSuggestions([]);
        setExpandedSuggestion(null);
    };

    const handleGenerateOutline = async () => {
        if (!topic.trim()) {
            toast.error('Please enter a topic');
            return;
        }

        setIsGeneratingOutline(true);
        try {
            const response = await generateOutline(topic, roughOutline, {
                target_audience: targetAudience || undefined,
            });
            setOutline(
                response.sections.map((s, i) => ({
                    id: `section-${Date.now()}-${i}`,
                    title: s.title,
                    purpose: s.purpose,
                }))
            );
            setActiveStep('outline');
        } catch (error) {
            console.error('Failed to generate outline:', error);
            toast.error('Failed to generate outline', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleRegenerate = async () => {
        if (!topic.trim()) {
            toast.error('Please enter a topic');
            return;
        }

        setIsGenerating(true);
        try {
            const outlineForApi = outline
                .filter(s => s.title.trim())
                .map(s => ({ title: s.title, purpose: s.purpose }));

            const response = await regenerateBlog(post.id, {
                topic,
                outline: outlineForApi,
                target_audience: targetAudience || undefined,
                mode: generationMode,
            });

            onRegenerated(response.title, response.content);
            toast.success('Blog regenerated successfully');
        } catch (error) {
            console.error('Failed to regenerate:', error);
            toast.error('Failed to regenerate blog', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={!isGenerating ? onClose : undefined} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
                {/* Generating overlay */}
                {isGenerating && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
                        <Sparkles className="h-10 w-10 animate-pulse text-blue-500 mb-3" />
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Regenerating your blog...</h3>
                        <p className="text-sm text-gray-500">This may take a moment.</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Regenerate <em className="font-serif font-normal italic">Blog</em>
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Section: Main Info */}
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => toggleSection('info')}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">Main Info</span>
                                {!openSection === 'info' && topic && (
                                    <span className="text-xs text-gray-400 truncate max-w-[200px]">{topic}</span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${openSection === 'info' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'info' && (
                            <div className="px-6 pb-4 space-y-4">
                                {/* Topic */}
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-medium text-gray-700">Topic</label>
                                        <button
                                            onClick={handleGenerateTopics}
                                            disabled={isGeneratingTopics || !topic.trim()}
                                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                        >
                                            {isGeneratingTopics ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Sparkles size={12} />
                                            )}
                                            Generate Ideas
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="What is your blog about?"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />

                                    {/* Topic Suggestions Popover */}
                                    {showTopicPopover && topicSuggestions.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                                            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
                                                <span className="text-xs font-medium text-gray-500">Topic Suggestions</span>
                                                <button onClick={() => setShowTopicPopover(false)} className="p-0.5 hover:bg-gray-200 rounded">
                                                    <X size={12} className="text-gray-400" />
                                                </button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {topicSuggestions.map((suggestion, index) => (
                                                    <div key={index} className="border-b border-gray-100 last:border-0">
                                                        <div className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 transition-colors">
                                                            <button
                                                                onClick={() => selectTopic(suggestion)}
                                                                className="flex-1 text-left text-sm text-gray-900 hover:text-blue-700"
                                                            >
                                                                {suggestion.title}
                                                            </button>
                                                            <button
                                                                onClick={() => setExpandedSuggestion(expandedSuggestion === index ? null : index)}
                                                                className="shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                                                                title="Why it works"
                                                            >
                                                                <Info size={12} className={expandedSuggestion === index ? 'text-blue-600' : 'text-gray-400'} />
                                                            </button>
                                                        </div>
                                                        {expandedSuggestion === index && (
                                                            <div className="px-3 pb-2">
                                                                <p className="text-xs text-gray-500 bg-blue-50 rounded px-2 py-1.5">{suggestion.why_it_works}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Target Audience */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
                                    <input
                                        type="text"
                                        value={targetAudience}
                                        onChange={(e) => setTargetAudience(e.target.value)}
                                        placeholder="Who is this blog for?"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Outline */}
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => toggleSection('outline')}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">Outline</span>
                                {outline.length > 0 && (
                                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{outline.length} sections</span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${openSection === 'outline' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'outline' && (
                            <div className="px-6 pb-4 space-y-4">
                                {/* Step Tabs */}
                                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                                    <button
                                        onClick={() => setActiveStep('rough')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            activeStep === 'rough'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <FileText size={14} />
                                        Rough Outline
                                        {roughOutline.length > 0 && (
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{roughOutline.length}</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveStep('outline')}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            activeStep === 'outline'
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <ListOrdered size={14} />
                                        Generated Outline
                                        {outline.length > 0 && (
                                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{outline.length}</span>
                                        )}
                                    </button>
                                </div>

                                {/* Tab Content */}
                                {activeStep === 'rough' ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-500">Add rough ideas, stories, or notes. These will guide the AI when generating the outline.</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newIdea}
                                                onChange={(e) => setNewIdea(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIdea(); } }}
                                                placeholder="e.g., I struggled with yo-yo dieting for 10 years..."
                                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={addIdea}
                                                disabled={!newIdea.trim()}
                                                className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                            >
                                                <Plus size={14} />
                                                Add
                                            </button>
                                        </div>
                                        {roughOutline.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {roughOutline.map((idea, index) => (
                                                    <div key={index} className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                                        <span className="flex-1 text-sm text-gray-700">{idea}</span>
                                                        <button
                                                            onClick={() => removeIdea(index)}
                                                            className="shrink-0 rounded p-1 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={12} className="text-red-500" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                                                <FileText size={20} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-xs text-gray-500">No ideas added yet. Add your first idea above!</p>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleGenerateOutline}
                                            disabled={isGeneratingOutline || !topic.trim()}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isGeneratingOutline ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Generating Outline...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    {outline.length > 0 ? 'Regenerate Outline' : 'Generate Outline'}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {outline.length > 0 ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-gray-500">Drag to reorder, click to edit. The AI will use this outline to generate your blog.</p>
                                                    <button
                                                        onClick={addSection}
                                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                                                    >
                                                        <Plus size={12} />
                                                        Add Section
                                                    </button>
                                                </div>
                                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                                    <SortableContext items={outline.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                                                        <div className="space-y-2">
                                                            {outline.map((section, index) => (
                                                                <SortableRegenerateItem
                                                                    key={section.id}
                                                                    section={section}
                                                                    index={index}
                                                                    onRemove={() => removeSection(section.id)}
                                                                    onEdit={(title, purpose) => updateSection(section.id, title, purpose)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </SortableContext>
                                                </DndContext>
                                            </>
                                        ) : (
                                            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                                <Sparkles size={24} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-sm text-gray-500 mb-1">No outline yet</p>
                                                <p className="text-xs text-gray-400">Switch to <strong>Rough Outline</strong> to add ideas, then click <strong>Generate Outline</strong>.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section: Generation Mode */}
                    <div className="border-b border-gray-200">
                        <button
                            onClick={() => toggleSection('mode')}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">Generation Mode</span>
                                {!openSection === 'mode' && (
                                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                        generationMode === 'quick'
                                            ? 'bg-gray-100 text-gray-600'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {generationMode === 'quick' ? 'Quick' : generationMode === 'researched' ? 'Researched' : 'Citations'}
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${openSection === 'mode' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'mode' && (
                            <div className="px-6 pb-4 space-y-2.5">
                                {([
                                    { id: 'quick' as const, label: 'Quick', description: 'Pure AI generation. Best for opinion pieces, personal stories, and how-to guides.', icon: Zap },
                                    { id: 'researched' as const, label: 'Researched', description: 'Uses web search for real statistics and examples to back up your content.', icon: Search, badge: 'Takes longer' },
                                    { id: 'citations' as const, label: 'Researched + Citations', description: 'Web search plus inline citations with a Sources section. Great for authority-building.', icon: BookOpen, badge: 'Takes longer' },
                                ]).map((mode) => {
                                    const Icon = mode.icon;
                                    const isSelected = generationMode === mode.id;
                                    return (
                                        <button
                                            key={mode.id}
                                            onClick={() => setGenerationMode(mode.id)}
                                            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                                                isSelected
                                                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                                isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{mode.label}</span>
                                                    {mode.badge && (
                                                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                                            {mode.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{mode.description}</p>
                                            </div>
                                            <div className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                                isSelected ? 'border-blue-600' : 'border-gray-300'
                                            }`}>
                                                {isSelected && <div className="h-2 w-2 rounded-full bg-blue-600" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={isGenerating ? undefined : () => setShowConfirm(true)}
                        disabled={isGenerating || !topic.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Regenerate
                            </>
                        )}
                    </button>
                </div>

                {/* Confirm Dialog */}
                {showConfirm && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl">
                        <div className="absolute inset-0 bg-black/40 rounded-xl" onClick={() => setShowConfirm(false)} />
                        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-6 overflow-hidden">
                            <div className="px-5 py-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                                        <AlertCircle size={20} className="text-amber-600" />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900">Regenerate Blog?</h3>
                                </div>
                                <p className="text-sm text-gray-600">This will regenerate your entire blog post. Your current version will be saved to version history so you can restore it anytime.</p>
                            </div>
                            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { setShowConfirm(false); handleRegenerate(); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Sparkles size={16} />
                                    Yes, Regenerate
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TabButton({
    active,
    onClick,
    icon: Icon,
    label,
    badge,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
        >
            <Icon size={16} />
            {label}
            {badge && (
                <span className="absolute -top-2 -right-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    {badge}
                </span>
            )}
        </button>
    );
}

function BlogEditor({
    post,
    isGenerating,
    onPublished,
    onRegenerate,
}: {
    post: BlogPost;
    isGenerating: boolean;
    onPublished: (postId: number, postUrl: string) => void;
    onRegenerate: () => void;
}) {
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [thumbnail, setThumbnail] = useState(post.thumbnail || '');
    const [savedTitle, setSavedTitle] = useState(post.title);
    const [savedContent, setSavedContent] = useState(post.content);
    const [savedThumbnail, setSavedThumbnail] = useState(post.thumbnail || '');
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const isDirty = title !== savedTitle || content !== savedContent || thumbnail !== savedThumbnail;

    // Version history state
    const [versions, setVersions] = useState<PostVersion[]>([]);
    const [isVersionPopoverOpen, setIsVersionPopoverOpen] = useState(false);
    const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false);
    const [restoreTargetId, setRestoreTargetId] = useState<number | null>(null);
    const [isCreatingVersion, setIsCreatingVersion] = useState(false);
    const [restoringVersionId, setRestoringVersionId] = useState<number | null>(null);

    const fetchVersions = async () => {
        try {
            console.log('[Versions] Fetching versions for post', post.id);
            const data = await getVersions(post.id);
            console.log('[Versions] Fetched:', data);
            setVersions(data);
        } catch (error) {
            console.error('Failed to fetch versions:', error);
        }
    };

    useEffect(() => {
        fetchVersions();
    }, [post.id]);

    const handleCreateVersion = async () => {
        setIsCreatingVersion(true);
        try {
            console.log('[Versions] Creating version for post', post.id);
            const created = await createVersion(post.id);
            console.log('[Versions] Created:', created);
            await fetchVersions();
            setIsCreateVersionModalOpen(false);
            toast.success('Version created');
        } catch (error) {
            console.error('Failed to create version:', error);
            toast.error('Failed to create version', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsCreatingVersion(false);
        }
    };

    const handleRestoreVersion = async (versionId: number) => {
        setRestoringVersionId(versionId);
        try {
            console.log('[Versions] Restoring version', versionId, 'for post', post.id);
            const restored = await restoreVersion(post.id, versionId);
            console.log('[Versions] Restored:', restored);
            await fetchVersions();
            setTitle(restored.title);
            setContent(restored.content);
            setSavedTitle(restored.title);
            setSavedContent(restored.content);
            setRestoreTargetId(null);
            toast.success('Version restored');
        } catch (error) {
            console.error('Failed to restore version:', error);
            toast.error('Failed to restore version', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setRestoringVersionId(null);
        }
    };

    const changeTypeLabel = (version: PostVersion, allVersions: PostVersion[]) => {
        switch (version.change_type) {
            case 'initial':
                return 'Initial version';
            case 'manual_edit':
                return 'Manual edit';
            case 'restored': {
                if (version.restored_from_version_id) {
                    const source = allVersions.find(v => v.id === version.restored_from_version_id);
                    if (source) return `Restored from v${source.version_number}`;
                }
                return 'Restored';
            }
            case 'regenerate':
                return 'Regenerated';
            default:
                return version.change_type;
        }
    };

    const formatVersionDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleAIRequest = async (selectedText: string, action: string): Promise<string> => {
        const instructions: Record<string, string> = {
            improve: 'Improve the clarity and quality of this text while keeping the same meaning.',
            rewrite: 'Rewrite this text in a different way while preserving the core message.',
            shorter: 'Make this text more concise without losing the key points.',
            longer: 'Expand this text with more detail and explanation.',
            fix: 'Fix any grammar, spelling, or punctuation errors in this text.',
        };
        const instruction = instructions[action] || action;
        const result = await refineText(selectedText, instruction);
        return result.text;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateBlog(post.id, { title, content, thumbnail });
            setSavedTitle(title);
            setSavedContent(content);
            setSavedThumbnail(thumbnail);
            toast.success('Draft saved successfully');
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async (publishNow: boolean) => {
        setIsPublishing(true);
        try {
            // Save latest content to Laravel first
            await updateBlog(post.id, { title, content, thumbnail });
            setSavedTitle(title);
            setSavedContent(content);
            setSavedThumbnail(thumbnail);

            // Create/update real WordPress post
            const response = await apiFetch<{
                success: boolean;
                post_id: number;
                post_url: string;
                updated: boolean;
            }>({
                path: `/wbrp/v1/blogs/${post.id}/publish`,
                method: 'POST',
                data: { title, content, thumbnail },
            });

            // Update wp_status on Laravel
            await updateBlog(post.id, { wp_status: 'published', published_post_id: response.post_id, published_post_url: response.post_url });

            onPublished(response.post_id, response.post_url);

            toast.success(
                response.updated
                    ? 'Blog post updated on WordPress.'
                    : 'Blog post published to WordPress!',
            );
        } catch (error) {
            console.error('Failed to publish:', error);
            toast.error('Failed to publish', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsPublishing(false);
            setIsPublishModalOpen(false);
        }
    };

    const handleRemoveThumbnail = () => {
        setThumbnail('');
    };

    if (isGenerating) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4 p-8">
                    <div className="relative">
                        <Sparkles className="h-12 w-12 animate-pulse text-blue-500" />
                        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-2 border-blue-500/30" />
                    </div>
                    <div className="text-center">
                        <h2 className="mb-2 text-xl font-semibold text-gray-900">
                            Generating your blog...
                        </h2>
                        <p className="max-w-md text-sm text-gray-500">
                            Our AI is crafting your blog post. This may take a moment.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col min-h-0 bg-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !isDirty}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={onRegenerate}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Regenerate
                    </button>

                    {/* Version History */}
                    <div className="relative">
                        <button
                            onClick={() => setIsVersionPopoverOpen(!isVersionPopoverOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <History size={16} />
                            {versions.length > 0 ? `v${versions[0].version_number}` : 'Versions'}
                        </button>

                        {/* Version Popover */}
                        {isVersionPopoverOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsVersionPopoverOpen(false)} />
                                <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                                    {/* Header */}
                                    <div className="px-4 py-3 border-b border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Snapshots of your blog content</p>
                                    </div>

                                    {/* Version List */}
                                    <div className="max-h-64 overflow-y-auto">
                                        {versions.length === 0 ? (
                                            <div className="px-4 py-6 text-center">
                                                <Clock size={20} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-xs text-gray-500">No versions yet</p>
                                            </div>
                                        ) : (
                                            versions.map((version, index) => {
                                                const isCurrent = index === 0;
                                                return (
                                                    <div
                                                        key={version.id}
                                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${isCurrent ? 'bg-green-50/50' : ''}`}
                                                    >
                                                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-gray-900">v{version.version_number}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                                    {changeTypeLabel(version, versions)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{version.title}</p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">{formatVersionDate(version.created_at)}</p>
                                                        </div>
                                                        {!isCurrent && (
                                                            <button
                                                                onClick={() => {
                                                                    setRestoreTargetId(version.id);
                                                                    setIsVersionPopoverOpen(false);
                                                                }}
                                                                className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                            >
                                                                <RotateCcw size={12} />
                                                                Restore
                                                            </button>
                                                        )}
                                                        {isCurrent && (
                                                            <span className="shrink-0 text-[10px] font-medium text-green-600 px-2 py-1">Current</span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                        <button
                                            onClick={() => {
                                                setIsCreateVersionModalOpen(true);
                                                setIsVersionPopoverOpen(false);
                                            }}
                                            className="flex items-center gap-2 w-full justify-center px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                        >
                                            <Plus size={14} />
                                            New Version
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {post.published_post_id ? (
                        <>
                            <span className="text-xs px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-600">
                                Published
                            </span>
                            <a
                                href={post.published_post_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                            >
                                View Post
                            </a>
                            <button
                                onClick={() => setIsPublishModalOpen(true)}
                                disabled={isPublishing}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#2271b1] text-white text-sm font-medium rounded-lg hover:bg-[#135e96] disabled:opacity-50 transition-colors"
                            >
                                {isPublishing ? 'Updating...' : 'Update'}
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-xs px-2 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-600">
                                Draft
                            </span>
                            <button
                                onClick={() => setIsPublishModalOpen(true)}
                                disabled={isPublishing}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#2271b1] text-white text-sm font-medium rounded-lg hover:bg-[#135e96] disabled:opacity-50 transition-colors"
                            >
                                {isPublishing ? 'Publishing...' : 'Publish'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Publish Modal */}
            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                onPublish={handlePublish}
            />

            {/* Create Version Modal */}
            {isCreateVersionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !isCreatingVersion && setIsCreateVersionModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Create New Version</h2>
                            <button
                                onClick={() => setIsCreateVersionModalOpen(false)}
                                disabled={isCreatingVersion}
                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-600">
                                This will snapshot your current content as a new version. You can restore to this version at any time.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setIsCreateVersionModalOpen(false)}
                                disabled={isCreatingVersion}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateVersion}
                                disabled={isCreatingVersion}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {isCreatingVersion && <Loader2 size={14} className="animate-spin" />}
                                {isCreatingVersion ? 'Creating...' : 'Create Version'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Version Modal */}
            {restoreTargetId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !restoringVersionId && setRestoreTargetId(null)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Restore Version</h2>
                            <button
                                onClick={() => setRestoreTargetId(null)}
                                disabled={!!restoringVersionId}
                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-600">
                                This will create a new version with the content from the selected version. Your current content won't be lost — it's preserved in the version history.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setRestoreTargetId(null)}
                                disabled={!!restoringVersionId}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRestoreVersion(restoreTargetId)}
                                disabled={!!restoringVersionId}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {restoringVersionId && <Loader2 size={14} className="animate-spin" />}
                                {restoringVersionId ? 'Restoring...' : 'Restore'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    {/* Image Picker Modal */}
                    <ImagePickerModal
                        isOpen={isImagePickerOpen}
                        onClose={() => setIsImagePickerOpen(false)}
                        onSelect={setThumbnail}
                        currentImage={thumbnail}
                    />

                    {/* Thumbnail Section */}
                    <div className="mb-6">
                        {thumbnail ? (
                            <div className="relative group rounded-lg overflow-hidden">
                                <img
                                    src={thumbnail}
                                    alt="Blog thumbnail"
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => setIsImagePickerOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <Image size={16} />
                                        Change
                                    </button>
                                    <button
                                        onClick={handleRemoveThumbnail}
                                        className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsImagePickerOpen(true)}
                                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                            >
                                <Image size={32} className="mx-auto mb-3 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">Choose Image</span>
                                <p className="text-xs text-gray-400 mt-1">
                                    Select from media library
                                </p>
                            </button>
                        )}
                    </div>

                    {/* Title Input */}
                    <textarea
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Blog title..."
                        rows={1}
                        style={{
                            width: '100%',
                            marginBottom: '1.5rem',
                            padding: '0.5rem 0',
                            border: 'none',
                            borderBottom: '2px solid transparent',
                            borderRadius: 0,
                            backgroundColor: 'transparent',
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: '#111827',
                            outline: 'none',
                            boxShadow: 'none',
                            resize: 'none',
                            overflow: 'hidden',
                            lineHeight: 1.3,
                            transition: 'border-color 0.2s',
                            fieldSizing: 'content',
                        } as React.CSSProperties}
                        onFocus={(e) => e.target.style.borderBottomColor = '#2271b1'}
                        onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                    />

                    {/* TipTap Editor */}
                    <TiptapEditor
                        content={content}
                        onUpdate={setContent}
                        onAIRequest={handleAIRequest}
                    />
                </div>
            </div>
        </div>
    );
}

function SettingsPanel({
    post,
    onDeleted,
}: {
    post: BlogPost;
    onDeleted: () => void;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await deleteBlog(post.id);
            toast.success('Blog deleted');
            onDeleted();
        } catch (error) {
            console.error('Failed to delete blog:', error);
            toast.error('Failed to delete blog');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const statusLabels: Record<string, string> = {
        draft: 'Draft',
        published: 'Published',
        'out-of-sync': 'Out of Sync',
    };
    const statusColors: Record<string, string> = {
        draft: 'text-orange-700 bg-orange-50 border-orange-200',
        published: 'text-green-700 bg-green-50 border-green-200',
        'out-of-sync': 'text-yellow-700 bg-yellow-50 border-yellow-200',
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                {/* Blog Info */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Blog Info</h3>
                    <dl className="space-y-4">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Topic</dt>
                            <dd className="text-sm text-gray-900">{post.topic || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Created</dt>
                            <dd className="text-sm text-gray-900">{formatDate(post.created_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Last Updated</dt>
                            <dd className="text-sm text-gray-900">{formatDate(post.updated_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Status</dt>
                            <dd>
                                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${statusColors[post.wp_status] || statusColors.draft}`}>
                                    {statusLabels[post.wp_status] || post.wp_status}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Outline */}
                {post.outline && post.outline.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Outline</h3>
                        <ol className="space-y-3">
                            {post.outline.map((section, index) => (
                                <li
                                    key={index}
                                    className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                >
                                    <div className="text-sm font-medium text-gray-900">
                                        {index + 1}. {section.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {section.purpose}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Danger Zone */}
                <div className="border-t border-gray-200 pt-8">
                    <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Permanently delete this blog and all associated data. This action cannot be undone.
                    </p>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete Blog'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BlogViewPage({ postId, onBack }: BlogViewPageProps) {
    // Read short_post_id from URL for deep-linking from schedule queue
    const urlParams = new URLSearchParams(window.location.search);
    const shortPostId = urlParams.get('short_post_id') ? parseInt(urlParams.get('short_post_id')!, 10) : undefined;

    const [activeTab, setActiveTab] = useState<ContentTab>(shortPostId ? 'short' : 'blog');
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [editorKey, setEditorKey] = useState(0);
    const [highlightVisualId, setHighlightVisualId] = useState<number | null>(null);

    // Fetch blog from API
    useEffect(() => {
        if (!postId) {
            setIsLoading(false);
            return;
        }

        const fetchBlog = async () => {
            try {
                const blog = await getBlog(postId);
                setPost(blog);
            } catch (error) {
                console.error('Failed to fetch blog:', error);
                toast.error('Failed to load blog');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlog();
    }, [postId]);

    // Navigation back to blogs list
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            window.location.href = 'admin.php?page=blog-repurpose-blogs';
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="h-[calc(100vh-100px)] flex items-center justify-center p-4">
                <div className="text-gray-500">Loading blog...</div>
            </div>
        );
    }

    // No post found
    if (!post) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Blog not found</h2>
                    <p className="text-sm text-gray-500 mb-4">This blog may have been deleted.</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Blogs
                    </button>
                </div>
            </div>
        );
    }

    // Blog needs a title or content before repurpose tabs are usable
    const hasContent = !!(post.title?.trim() || post.content?.replace(/<[^>]*>/g, '').trim());

    const tabs = [
        { id: 'blog' as const, label: 'Blog Post', icon: PenTool },
        { id: 'short' as const, label: 'Short Posts', icon: Share2 },
        { id: 'threads' as const, label: 'Threads', icon: FileText },
        { id: 'visuals' as const, label: 'Visuals', icon: Image },
        { id: 'video' as const, label: 'Video', icon: Video },
    ];

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col overflow-hidden p-4">
            {/* Card container - tabs and content connected */}
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header with Back + Tabs */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="group flex items-center h-8 px-2 rounded text-gray-400 hover:text-gray-600 hover:bg-white transition-all"
                    >
                        <ChevronLeft size={16} />
                        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm group-hover:max-w-10 group-hover:ml-1 transition-all duration-200">
                            Back
                        </span>
                    </button>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 ml-2 p-1 bg-gray-100 rounded-lg">
                        {/* Blog Post tab — always enabled */}
                        <TabButton
                            active={activeTab === 'blog'}
                            onClick={() => setActiveTab('blog')}
                            icon={PenTool}
                            label="Blog Post"
                        />

                        {/* Repurpose tabs — wrapped with overlay when no content */}
                        <div className="relative flex items-center gap-1">
                            {!hasContent && <DisabledTabsOverlay />}
                            {tabs.filter(t => t.id !== 'blog').map((tab) => (
                                <TabButton
                                    key={tab.id}
                                    active={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    icon={tab.icon}
                                    label={tab.label}
                                    badge={tab.id === 'video' ? 'Soon' : undefined}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Settings gear icon */}
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`ml-auto flex items-center justify-center h-8 w-8 rounded transition-colors ${
                            activeTab === 'settings'
                                ? 'text-gray-900 bg-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                        }`}
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                </div>

                {/* Content Area - Connected to tabs above */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {/* Empty blog guard for repurpose tabs */}
                    {!hasContent && activeTab !== 'blog' && activeTab !== 'settings' && (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <PenTool size={24} className="text-gray-400" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Write your blog first</h3>
                            <p className="text-sm text-gray-500 max-w-xs mb-4">
                                Add a title and some content to your blog post before repurposing it into short posts, threads, or other formats.
                            </p>
                            <button
                                onClick={() => setActiveTab('blog')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <PenTool size={16} />
                                Go to Editor
                            </button>
                        </div>
                    )}

                    {activeTab === 'blog' && (
                        <BlogEditor
                            key={editorKey}
                            post={post}
                            isGenerating={false}
                            onPublished={(publishedPostId, publishedPostUrl) => {
                                setPost(prev => prev ? {
                                    ...prev,
                                    status: 'published',
                                    published_post_id: publishedPostId,
                                    published_post_url: publishedPostUrl,
                                } : prev);
                            }}
                            onRegenerate={() => setIsRegenerateModalOpen(true)}
                        />
                    )}

                    {/* Regenerate Modal */}
                    {isRegenerateModalOpen && (
                        <RegenerateModal
                            onClose={() => setIsRegenerateModalOpen(false)}
                            post={post}
                            onRegenerated={(title, content) => {
                                setPost(prev => prev ? { ...prev, title, content } : prev);
                                setEditorKey(k => k + 1);
                                setIsRegenerateModalOpen(false);
                            }}
                        />
                    )}

                    {activeTab !== 'blog' && activeTab !== 'settings' && (
                        <RepurposePanel
                            initialTab={activeTab}
                            blogContent={post.content}
                            blogId={post.id}
                            isPublished={!!post.published_post_id}
                            publishedPostUrl={post.published_post_url}
                            editShortPostId={shortPostId}
                            onSwitchTab={setActiveTab}
                            onVisualCreated={(visual) => {
                                setPost(prev => prev ? { ...prev, visuals: [...(prev.visuals || []), visual] } : prev);
                                setHighlightVisualId(visual.id);
                            }}
                            onHighlightVisual={setHighlightVisualId}
                            initialHighlightVisualId={highlightVisualId}
                            initialShortPosts={post.short_posts}
                            initialThreads={post.threads}
                            initialVisuals={post.visuals}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsPanel
                            post={post}
                            onDeleted={handleBack}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
