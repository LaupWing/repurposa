/**
 * Step 3: Generated Outline
 *
 * Shows AI-generated outline sections that can be edited, reordered, or deleted.
 */

import { useState, useRef } from '@wordpress/element';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
import type { OutlineSection } from '../../BlogWizard';
import { AITextPopup } from '../../AITextPopup';

// ============================================
// SORTABLE SECTION COMPONENT
// ============================================

interface SortableSectionProps {
    section: OutlineSection;
    index: number;
    onRemove: () => void;
    onEdit: (title: string) => void;
}

function SortableSection({ section, index, onRemove, onEdit }: SortableSectionProps) {
    const [isEditing, setIsEditing] = useState(!section.title);
    const [editTitle, setEditTitle] = useState(section.title);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSave = () => {
        onEdit(editTitle);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditTitle(section.title);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4"
            >
                <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                        {index + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                        <textarea
                            ref={textareaRef}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Section title"
                            rows={1}
                            autoFocus
                        />
                        <AITextPopup
                            textareaRef={textareaRef}
                            value={editTitle}
                            onChange={setEditTitle}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group rounded-lg border border-gray-200 bg-gray-50 p-4 hover:border-gray-300 transition-colors"
        >
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    className="mt-1 cursor-grab touch-none text-gray-400 transition-colors hover:text-gray-600 active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical size={16} />
                </button>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {index + 1}
                </span>
                <div className="flex-1 -mt-1">
                    <h4 className="text-base font-semibold text-gray-900" style={{ margin: 0, marginBottom: '0.25rem' }}>{section.title}</h4>
                    <Tooltip text={section.purpose} delay={0} placement="top">
                        <button type="button" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 cursor-default transition-colors bg-transparent border-none p-0">
                            <Lightbulb size={14} />
                            Why this works
                        </button>
                    </Tooltip>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="rounded p-1.5 hover:bg-gray-200"
                    >
                        <Pencil size={14} className="text-gray-500" />
                    </button>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="rounded p-1.5 hover:bg-red-100"
                    >
                        <Trash2 size={14} className="text-red-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface Step3GeneratedOutlineProps {
    topic: string;
    outline: OutlineSection[];
    onOutlineChange: (outline: OutlineSection[]) => void;
}

export default function Step3GeneratedOutline({
    topic,
    outline,
    onOutlineChange,
}: Step3GeneratedOutlineProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = outline.findIndex((s) => s.id === active.id);
            const newIndex = outline.findIndex((s) => s.id === over.id);
            onOutlineChange(arrayMove(outline, oldIndex, newIndex));
        }
    };

    const removeSection = (id: string) => {
        onOutlineChange(outline.filter((s) => s.id !== id));
    };

    const updateSection = (id: string, title: string) => {
        onOutlineChange(
            outline.map((s) => (s.id === id ? { ...s, title } : s))
        );
    };

    const addSection = () => {
        onOutlineChange([
            ...outline,
            { id: crypto.randomUUID(), title: '', purpose: '' },
        ]);
    };

    return (
        <div className="space-y-4">
            {/* Topic Header */}
            <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide" style={{ margin: 0, marginBottom: '0.25rem' }}>Your Blog</p>
                <h2 className="text-lg font-bold text-gray-900" style={{ margin: 0 }}>{topic}</h2>
            </div>

            {/* Outline Sections */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={outline.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {outline.map((section, index) => (
                            <SortableSection
                                key={section.id}
                                section={section}
                                index={index}
                                onRemove={() => removeSection(section.id)}
                                onEdit={(title) => updateSection(section.id, title)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <button
                type="button"
                onClick={addSection}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
            >
                <Plus size={16} />
                Add section
            </button>

            {/* Tip */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs text-gray-500">
                    Drag to reorder sections. Delete any you don't need. The AI will use this outline to generate your full blog post.
                </p>
            </div>
        </div>
    );
}
