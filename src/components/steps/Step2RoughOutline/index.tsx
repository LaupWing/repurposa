/**
 * Step 2: Rough Outline
 *
 * User adds their ideas, stories, and notes.
 * Items can be reordered via drag and drop.
 */

import { useState } from '@wordpress/element';
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FileText, Plus } from 'lucide-react';
import SortableItem from './SortableItem';

// ============================================
// TYPES
// ============================================

interface Step2RoughOutlineProps {
    topic: string;
    roughOutline: string[];
    onRoughOutlineChange: (outline: string[]) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function Step2RoughOutline({
    topic,
    roughOutline,
    onRoughOutlineChange,
}: Step2RoughOutlineProps) {
    const [newIdea, setNewIdea] = useState('');

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Add a new idea
    const addIdea = () => {
        if (newIdea.trim()) {
            onRoughOutlineChange([...roughOutline, newIdea.trim()]);
            setNewIdea('');
        }
    };

    // Remove an idea
    const removeIdea = (index: number) => {
        onRoughOutlineChange(roughOutline.filter((_, i) => i !== index));
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = roughOutline.findIndex((_, i) => `idea-${i}` === active.id);
            const newIndex = roughOutline.findIndex((_, i) => `idea-${i}` === over.id);

            onRoughOutlineChange(arrayMove(roughOutline, oldIndex, newIndex));
        }
    };

    return (
        <div>
            {/* Topic from Step 1 */}
            {topic && (
                <p
                    className="text-sm font-medium text-gray-400"
                    style={{ margin: 0 }}
                >
                    {topic}
                </p>
            )}

            <div className="space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <FileText size={18} className="text-blue-600 shrink-0" />
                    <h3 className="text-base font-semibold text-gray-900" style={{ margin: 0 }}>
                        Add Your Rough Outline
                    </h3>
                </div>
                <p className="text-sm text-gray-500">
                    Personal stories, struggles, wins, specific numbers, client examples—anything
                    that makes this YOUR content. <strong>Drag to reorder</strong> to help the AI
                    structure your content flow.
                </p>
            </div>

            {/* Input for new idea */}
            <div className="flex gap-2 h-11">
                <input
                    type="text"
                    value={newIdea}
                    onChange={(e) => setNewIdea(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addIdea();
                        }
                    }}
                    placeholder="e.g., I struggled with yo-yo dieting for 10 years..."
                    className="flex-1 px-4 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: '1px solid #d1d5db', margin: 0, height: '100%' }}
                />
                <button
                    type="button"
                    onClick={addIdea}
                    disabled={!newIdea.trim()}
                    className="w-11 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                    <Plus size={18} />
                </button>
            </div>

            {/* List of ideas */}
            {roughOutline.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={roughOutline.map((_, i) => `idea-${i}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {roughOutline.map((idea, index) => (
                                <SortableItem
                                    key={`idea-${index}`}
                                    id={`idea-${index}`}
                                    idea={idea}
                                    onRemove={() => removeIdea(index)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-500">
                        No ideas added yet. Add your first idea above!
                    </p>
                </div>
            )}

            {/* Tip Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-700">
                    <span className="font-semibold text-amber-600">✨ Why this matters:</span>{' '}
                    Generic AI content is forgettable. Your personal stories and insights
                    make this blog uniquely yours and 10x more engaging.
                </p>
            </div>
            </div>
        </div>
    );
}
