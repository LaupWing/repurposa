/**
 * Sortable Item Component
 *
 * A draggable item in the rough outline list.
 * Uses @dnd-kit for drag and drop functionality.
 */

import { useState, useRef, useEffect } from '@wordpress/element';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Pencil, Check, X } from 'lucide-react';
import { AITextPopup } from '@/components/AITextPopup';

// ============================================
// TYPES
// ============================================

interface SortableItemProps {
    id: string;
    idea: string;
    onRemove: () => void;
    onEdit: (newText: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function SortableItem({ id, idea, onRemove, onEdit }: SortableItemProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(idea);
    const editRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && editRef.current) {
            editRef.current.focus();
        }
    }, [isEditing]);

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

            {/* Idea Text / Edit Input */}
            {isEditing ? (
                <div className="flex-1">
                    <AITextPopup textareaRef={editRef} value={editText} onChange={setEditText} />
                    <textarea
                        ref={editRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (editText.trim()) {
                                    onEdit(editText.trim());
                                    setIsEditing(false);
                                }
                            }
                            if (e.key === 'Escape') {
                                setEditText(idea);
                                setIsEditing(false);
                            }
                        }}
                        rows={2}
                        className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                </div>
            ) : (
                <div
                    className="flex-1 text-sm text-gray-700 cursor-pointer"
                    onDoubleClick={() => {
                        setEditText(idea);
                        setIsEditing(true);
                    }}
                >
                    {idea}
                </div>
            )}

            {/* Action Buttons */}
            {isEditing ? (
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            if (editText.trim()) {
                                onEdit(editText.trim());
                                setIsEditing(false);
                            }
                        }}
                        className="shrink-0 p-1.5 rounded hover:bg-green-50"
                    >
                        <Check size={14} className="text-green-600" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setEditText(idea);
                            setIsEditing(false);
                        }}
                        className="shrink-0 p-1.5 rounded hover:bg-gray-100"
                    >
                        <X size={14} className="text-gray-500" />
                    </button>
                </div>
            ) : !showConfirm ? (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={() => {
                            setEditText(idea);
                            setIsEditing(true);
                        }}
                        className="shrink-0 p-1.5 rounded hover:bg-gray-200"
                    >
                        <Pencil size={14} className="text-gray-500" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        className="shrink-0 p-1.5 rounded hover:bg-red-50"
                    >
                        <Trash2 size={14} className="text-red-500" />
                    </button>
                </div>
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
