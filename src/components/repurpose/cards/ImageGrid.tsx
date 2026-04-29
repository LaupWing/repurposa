import { X, ImagePlus, Loader2, Play } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MediaItem } from '@/types';

/** Accept both MediaItem objects and plain URL strings */
type MediaInput = MediaItem | string;
function getMediaUrl(item: MediaInput): string {
    return typeof item === 'string' ? item : item.url;
}
function getMediaType(item: MediaInput): 'image' | 'video' {
    return typeof item === 'string' ? 'image' : item.type;
}
function isPending(item: MediaInput): boolean {
    return typeof item !== 'string' && !item.mime;
}

function SortableImage({ id, src, type, pending, onRemove }: { id: string; src: string; type?: 'image' | 'video'; pending?: boolean; onRemove: () => void }) {
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
            {type === 'video' ? (
                <video src={src} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
                <img src={src} alt="" className="w-full h-full object-cover" />
            )}
            {type === 'video' && !pending && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center">
                        <Play size={14} className="text-white ml-0.5" />
                    </div>
                </div>
            )}
            {pending && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Loader2 size={20} className="text-white animate-spin" />
                </div>
            )}
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
    media: MediaInput[];
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
                            {media.map((item, i) => (
                                <div
                                    key={ids[i]}
                                    className={
                                        media.length === 3 && i === 0 ? 'row-span-2' : ''
                                    }
                                >
                                    <SortableImage
                                        id={ids[i]}
                                        src={getMediaUrl(item)}
                                        type={getMediaType(item)}
                                        pending={isPending(item)}
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
