import { useState } from '@wordpress/element';
import { toast } from 'sonner';
import {
    X,
    Trash2,
    Loader2,
    Sparkles,
    AlertCircle,
    GripVertical,
    Pencil,
    Plus,
    FileText,
    ListOrdered,
    Info,
    ChevronDown,
    Zap,
    Search,
    BookOpen,
} from 'lucide-react';
import { regenerateBlog, generateOutline, generateTopics } from '@/services/blogApi';
import type { TopicSuggestion, BlogGenerationMode, BlogPost } from '@/types';
import { useProfileStore } from '@/store/profileStore';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RegenerateSection } from './types';

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

export function RegenerateModal({
    onClose,
    post,
    onRegenerated,
}: {
    onClose: () => void;
    post: BlogPost;
    onRegenerated: () => void;
}) {
    const { profile } = useProfileStore();
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
                language: profile?.content_lang,
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
                language: profile?.content_lang,
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

            await regenerateBlog(post.id, {
                topic,
                outline: outlineForApi,
                target_audience: targetAudience || undefined,
                mode: generationMode,
                language: profile?.content_lang,
            });

            onRegenerated();
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
                                {openSection !== 'info' && topic && (
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
                                {openSection !== 'mode' && (
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
