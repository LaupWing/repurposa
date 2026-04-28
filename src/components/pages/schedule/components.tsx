import { useState, useRef, useEffect } from '@wordpress/element';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
    Calendar,
    Plus,
    X as XIcon,
    GripVertical,
    Pencil,
    MoreHorizontal,
    ExternalLink,
    Repeat2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Platform, PostType, PostStatus, DayOfWeek, TimeSlot, DaySchedule, ScheduledPost } from './types';
import { PLATFORMS, POST_TYPES } from './types';
import { formatTime, generateSlotId, PLATFORM_ORDER } from './helpers';

// ============================================
// BADGES & INDICATORS
// ============================================

export function PlatformBadge({ platform }: { platform: Platform }) {
    const p = PLATFORMS.find((pl) => pl.id === platform)!;
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${p.bg} text-white`}
        >
            {p.icon}
            {p.name}
        </span>
    );
}

export function PostTypeBadge({
    postType,
    threadCount,
}: {
    postType: PostType;
    threadCount?: number;
}) {
    const t = POST_TYPES.find((pt) => pt.id === postType)!;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {t.icon}
            {t.label}
            {postType === "thread" && threadCount && (
                <span className="text-gray-400 ml-0.5">({threadCount})</span>
            )}
        </span>
    );
}

export function StatusIndicator({ status }: { status: PostStatus }) {
    const config = {
        pending: {
            dot: "bg-blue-500",
            glow: "bg-blue-400",
            label: "Scheduled",
            text: "text-blue-600",
        },
        publishing: {
            dot: "bg-yellow-500",
            glow: "bg-yellow-400",
            label: "Publishing",
            text: "text-yellow-600",
        },
        published: {
            dot: "bg-green-500",
            glow: "bg-green-400",
            label: "Published",
            text: "text-green-600",
        },
        failed: {
            dot: "bg-red-500",
            glow: "bg-red-400",
            label: "Failed",
            text: "text-red-600",
        },
    };
    const c = config[status];
    return (
        <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text}`}
        >
            <span className="relative flex h-2 w-2">
                <span
                    className={`absolute inline-flex h-full w-full rounded-full animate-status-ping ${c.glow}`}
                />
                <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`}
                />
            </span>
            {c.label}
        </span>
    );
}

// ============================================
// POST CARDS
// ============================================

export function ScheduledPostCard({
    post,
    onDelete,
    onClick,
    timezone,
}: {
    post: ScheduledPost;
    onDelete: (id: number, allIds?: number[]) => void;
    onClick?: () => void;
    timezone?: string;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [showUnscheduleConfirm, setShowUnscheduleConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        if (menuOpen)
            document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [menuOpen]);

    return (
        <>
        <div
            onClick={onClick}
            className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
        >
            {/* Time column */}
            <div className="shrink-0 w-16 pt-0.5">
                <span className="text-sm font-semibold text-gray-900">
                    {formatTime(post.scheduledAt, timezone)}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-2">
                    {post.platforms.map(p => (
                        <PlatformBadge key={p} platform={p} />
                    ))}
                    <PostTypeBadge
                        postType={post.postType}
                        threadCount={post.threadCount}
                    />
                    {post.hasRepost && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">
                            <Repeat2 size={12} />
                            Repost
                        </span>
                    )}
                    <StatusIndicator status={post.status} />
                </div>

                {/* Post content preview */}
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 whitespace-pre-line mb-1.5">
                    {post.content}
                </p>

                {/* Source */}
                <p className="text-xs text-gray-400">
                    {post.blogTitle ? (
                        <>From: <span className="text-gray-500">{post.blogTitle}</span></>
                    ) : (
                        <span className="text-gray-400">Standalone</span>
                    )}
                </p>
            </div>

            {/* Actions */}
            <div className="shrink-0 relative" ref={menuRef}>
                <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                    className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                        {post.postId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `admin.php?page=blog-repurpose-blogs&post_id=${
                                        post.postId
                                    }${
                                        post.schedulableId
                                            ? `&short_post_id=${post.schedulableId}`
                                            : ""
                                    }`;
                                    window.location.href = url;
                                    setMenuOpen(false);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <Pencil size={14} />
                                Edit in Blog
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(false);
                                setShowUnscheduleConfirm(true);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                            <Calendar size={14} />
                            Unschedule
                        </button>
                    </div>
                )}
            </div>
        </div>

        <ConfirmModal
            isOpen={showUnscheduleConfirm}
            title="Unschedule Post"
            description="Remove this post from the queue? It won't be deleted — you can reschedule it anytime."
            confirmLabel="Unschedule"
            variant="warning"
            onConfirm={() => { setShowUnscheduleConfirm(false); onDelete(post.id, post.ids); }}
            onCancel={() => setShowUnscheduleConfirm(false)}
        />
        </>
    );
}

export function PublishedPostCard({ post, timezone }: { post: ScheduledPost; timezone?: string }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200">
            {/* Time column */}
            <div className="shrink-0 w-16 pt-0.5">
                <span className="text-sm font-semibold text-gray-900">
                    {formatTime(post.scheduledAt, timezone)}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Badges row */}
                <div className="flex items-center gap-2 mb-2">
                    {post.platforms.map(p => (
                        <PlatformBadge key={p} platform={p} />
                    ))}
                    <PostTypeBadge
                        postType={post.postType}
                        threadCount={post.threadCount}
                    />
                    {post.hasRepost && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">
                            <Repeat2 size={12} />
                            Repost
                        </span>
                    )}
                    <StatusIndicator status={post.status} />
                </div>

                {/* Post content preview */}
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 whitespace-pre-line mb-1.5">
                    {post.content}
                </p>

                {/* Source */}
                <p className="text-xs text-gray-400">
                    {post.blogTitle ? (
                        <>From: <span className="text-gray-500">{post.blogTitle}</span></>
                    ) : (
                        <span className="text-gray-400">Standalone</span>
                    )}
                </p>
            </div>

            {/* View link */}
            <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <ExternalLink size={13} />
                View
            </button>
        </div>
    );
}

export function EmptySlotCard({ timeLabel, platforms, onClick }: { timeLabel: string; platforms: Platform[]; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
            {/* Time column */}
            <div className="shrink-0 w-16">
                <span className="text-sm font-medium text-gray-400">
                    {timeLabel}
                </span>
            </div>

            {/* Platforms + empty label */}
            <div className="flex-1 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    {[...platforms].sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b)).map((platformId) => {
                        const p = PLATFORMS.find((pl) => pl.id === platformId);
                        if (!p) return null;
                        return (
                            <span
                                key={platformId}
                                className={`w-5 h-5 ${p.bg} text-white rounded flex items-center justify-center opacity-40`}
                            >
                                {p.icon}
                            </span>
                        );
                    })}
                </div>
                <span className="text-sm text-gray-400">
                    Open slot
                </span>
            </div>

            {/* CTA */}
            <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400">
                <Plus size={14} />
                Schedule
            </span>
        </div>
    );
}

// ============================================
// PUBLISHING TIMES COMPONENTS
// ============================================

export function PlatformToggle({
    platforms,
    onChange,
    connectedPlatforms,
}: {
    platforms: Platform[];
    onChange: (platforms: Platform[]) => void;
    connectedPlatforms?: Platform[];
}) {
    const toggle = (id: Platform) => {
        if (connectedPlatforms && !connectedPlatforms.includes(id)) {
            const name = PLATFORMS.find((p) => p.id === id)?.name || id;
            toast.error(`Connect ${name} first`, {
                description:
                    "Go to Settings → Connections to link your account.",
            });
            return;
        }

        if (platforms.includes(id)) {
            if (platforms.length === 1) return;
            onChange(platforms.filter((p) => p !== id));
        } else {
            onChange([...platforms, id]);
        }
    };

    return (
        <div className="flex items-center gap-1">
            {PLATFORMS.map((p) => {
                const active = platforms.includes(p.id);
                const isConnected =
                    !connectedPlatforms || connectedPlatforms.includes(p.id);
                return (
                    <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`flex items-center justify-center w-7 h-7 rounded-md transition-all ${
                            !isConnected
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : active
                                ? `${p.bg} text-white`
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                        }`}
                        title={
                            isConnected ? p.name : `${p.name} (not connected)`
                        }
                    >
                        {p.icon}
                    </button>
                );
            })}
        </div>
    );
}

export function TimeSlotRow({
    slot,
    onTimeChange,
    onPlatformsChange,
    onRemove,
    connectedPlatforms,
}: {
    slot: TimeSlot;
    onTimeChange: (time: string) => void;
    onPlatformsChange: (platforms: Platform[]) => void;
    onRemove: () => void;
    connectedPlatforms?: Platform[];
}) {
    return (
        <div className="group flex items-center gap-3 py-2">
            <GripVertical
                size={14}
                className="text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
            />

            {/* Time picker */}
            <input
                type="time"
                value={slot.time}
                onChange={(e) => onTimeChange(e.target.value)}
                className="h-9 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />

            {/* Platform toggles */}
            <PlatformToggle
                platforms={slot.platforms}
                onChange={onPlatformsChange}
                connectedPlatforms={connectedPlatforms}
            />

            {/* Platform labels (small screens hint) */}
            <span className="text-xs text-gray-400 flex-1">
                {slot.platforms
                    .map((p) => PLATFORMS.find((pl) => pl.id === p)?.name)
                    .join(", ")}
            </span>

            {/* Remove */}
            <button
                onClick={onRemove}
                className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 rounded transition-all"
            >
                <XIcon size={14} />
            </button>
        </div>
    );
}

export function DayRow({
    day,
    schedule,
    onToggle,
    onUpdate,
    connectedPlatforms,
}: {
    day: { key: DayOfWeek; label: string; short: string };
    schedule: DaySchedule;
    onToggle: () => void;
    onUpdate: (schedule: DaySchedule) => void;
    connectedPlatforms?: Platform[];
}) {
    const [slotToRemove, setSlotToRemove] = useState<string | null>(null);

    const addSlot = () => {
        onUpdate({
            ...schedule,
            slots: [
                ...schedule.slots,
                { id: generateSlotId(), time: "09:00", platforms: connectedPlatforms?.length ? [...connectedPlatforms] : ["x"] },
            ],
        });
    };

    const removeSlot = (slotId: string) => {
        onUpdate({
            ...schedule,
            slots: schedule.slots.filter((s) => s.id !== slotId),
        });
    };

    const updateSlotTime = (slotId: string, time: string) => {
        onUpdate({
            ...schedule,
            slots: schedule.slots.map((s) =>
                s.id === slotId ? { ...s, time } : s,
            ),
        });
    };

    const updateSlotPlatforms = (slotId: string, platforms: Platform[]) => {
        onUpdate({
            ...schedule,
            slots: schedule.slots.map((s) =>
                s.id === slotId ? { ...s, platforms } : s,
            ),
        });
    };

    return (
        <div className={`py-4 ${schedule.enabled ? "" : "opacity-50"}`}>
            {/* Day header */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                    {/* Toggle switch */}
                    <button
                        onClick={onToggle}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                            schedule.enabled ? "bg-blue-600" : "bg-gray-300"
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                                schedule.enabled
                                    ? "translate-x-4"
                                    : "translate-x-0"
                            }`}
                        />
                    </button>
                    <span className="text-sm font-medium text-gray-900">
                        {day.label}
                    </span>
                    {schedule.slots.length > 0 && schedule.enabled && (
                        <span className="text-xs text-gray-400">
                            {schedule.slots.length}{" "}
                            {schedule.slots.length === 1 ? "slot" : "slots"}
                        </span>
                    )}
                </div>

                {schedule.enabled && (
                    <button
                        onClick={addSlot}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                        <Plus size={12} />
                        Add time
                    </button>
                )}
            </div>

            {/* Time slots */}
            {schedule.enabled && schedule.slots.length > 0 && (
                <div className="ml-12 mt-1">
                    {schedule.slots.map((slot) => (
                        <TimeSlotRow
                            key={slot.id}
                            slot={slot}
                            onTimeChange={(time) =>
                                updateSlotTime(slot.id, time)
                            }
                            onPlatformsChange={(platforms) =>
                                updateSlotPlatforms(slot.id, platforms)
                            }
                            onRemove={() => setSlotToRemove(slot.id)}
                            connectedPlatforms={connectedPlatforms}
                        />
                    ))}
                </div>
            )}

            {schedule.enabled && schedule.slots.length === 0 && (
                <div className="ml-12 mt-1">
                    <p className="text-xs text-gray-400 italic py-1">
                        No time slots set
                    </p>
                </div>
            )}

            <ConfirmModal
                isOpen={!!slotToRemove}
                title="Remove Time Slot"
                description={`Remove the ${slotToRemove ? (schedule.slots.find(s => s.id === slotToRemove)?.time ?? '') : ''} slot on ${day.label}? Any posts already scheduled to this slot won't be affected.`}
                confirmLabel="Remove"
                variant="danger"
                onConfirm={() => { removeSlot(slotToRemove!); setSlotToRemove(null); }}
                onCancel={() => setSlotToRemove(null)}
            />
        </div>
    );
}
