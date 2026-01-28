/**
 * Sortable Item Component
 *
 * A draggable item in the rough outline list.
 * Uses @dnd-kit for drag and drop functionality.
 */

import { useState } from '@wordpress/element';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface SortableItemProps {
    id: string;
    idea: string;
    onRemove: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function SortableItem({ id, idea, onRemove }: SortableItemProps) {
    const [showConfirm, setShowConfirm] = useState(false);

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
            className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
        >
            {/* Drag Handle */}
            <button
                type="button"
                className="cursor-grab touch-none text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <GripVertical size={16} />
            </button>

            {/* Idea Text */}
            <div className="flex-1 text-sm text-gray-700">
                {idea}
            </div>

            {/* Delete Button */}
            {!showConfirm ? (
                <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="shrink-0 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-opacity"
                >
                    <Trash2 size={14} className="text-red-500" />
                </button>
            ) : (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onRemove();
                            setShowConfirm(false);
                        }}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Remove
                    </button>
                </div>
            )}
        </div>
    );
}
