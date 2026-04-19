import { useState, useRef, useEffect } from "@wordpress/element";
import { Calendar, Clock, Filter, Check, Loader2 } from "lucide-react";
import type { Platform, PostType, WeeklySchedule, ScheduledPost } from "../types";
import { PLATFORMS, POST_TYPES } from "../types";
import { buildQueueTimeline, groupEntriesByDate } from "../helpers";
import { ScheduledPostCard, EmptySlotCard } from "../components";
import { stagger } from "@/components/onboarding/stagger";

interface QueueTabProps {
    posts: ScheduledPost[];
    weeklySchedule: WeeklySchedule | null;
    isLoading: boolean;
    timezone?: string;
    onDeletePost: (id: number, allIds?: number[]) => void;
    onPostClick: (post: ScheduledPost) => void;
    onSlotClick: (date: Date, platforms: Platform[]) => void;
    onGoToTimes: () => void;
}

export function QueueTab({
    posts,
    weeklySchedule,
    isLoading,
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    onDeletePost,
    onPostClick,
    onSlotClick,
    onGoToTimes,
}: QueueTabProps) {
    const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");
    const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [weeksAhead, setWeeksAhead] = useState(2);
    const filterRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Close filter dropdown on outside click
    useEffect(() => {
        if (!isFilterOpen) return;
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isFilterOpen]);

    // Infinite scroll
    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setWeeksAhead((prev) => Math.min(prev + 2, 12));
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
        );
    }

    const filteredPosts = posts.filter((post) => {
        const matchesPlatform = platformFilter === "all" || post.platforms.includes(platformFilter as Platform);
        const matchesType = typeFilter === "all" || post.postType === typeFilter;
        return matchesPlatform && matchesType;
    });

    const timeline = buildQueueTimeline(filteredPosts, weeklySchedule, weeksAhead, timezone);
    const timelineGroups = groupEntriesByDate(timeline);

    return (
        <div>
            {/* Filters */}
            {posts.length > 0 && (
                <div {...stagger(0, false)} className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                        <button
                            onClick={() => setTypeFilter("all")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                typeFilter === "all"
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            All
                        </button>
                        {POST_TYPES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTypeFilter(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    typeFilter === t.id
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                                platformFilter !== "all"
                                    ? "border-blue-500 text-blue-600 bg-blue-50"
                                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                            }`}
                        >
                            <Filter size={14} />
                            {platformFilter === "all"
                                ? "Filter"
                                : PLATFORMS.find((p) => p.id === platformFilter)?.name}
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                    onClick={() => { setPlatformFilter("all"); setIsFilterOpen(false); }}
                                    className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                        platformFilter === "all" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    All Platforms
                                    {platformFilter === "all" && <Check size={14} />}
                                </button>
                                {PLATFORMS.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setPlatformFilter(p.id); setIsFilterOpen(false); }}
                                        className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                            platformFilter === p.id ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-5 h-5 ${p.bg} text-white rounded flex items-center justify-center`}>
                                                {p.icon}
                                            </span>
                                            {p.name}
                                        </div>
                                        {platformFilter === p.id && <Check size={14} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Timeline */}
            {timeline.length === 0 ? (
                <div {...stagger(1, false)} className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <Calendar size={28} className="text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming slots</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                        Set up your publishing times first, then schedule posts to fill the slots.
                    </p>
                    <button
                        onClick={onGoToTimes}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                    >
                        <Clock size={16} />
                        Set Publishing Times
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {Array.from(timelineGroups.entries()).map(([dateKey, { label, entries }], groupIndex) => {
                        const postCount = entries.filter((e) => e.type === "post").length;
                        const emptyCount = entries.filter((e) => e.type === "empty").length;
                        return (
                            <div key={dateKey} {...stagger(groupIndex + 1, false)}>
                                <div className="flex items-center gap-3 mb-3">
                                    <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
                                    <span className="text-xs text-gray-400">
                                        {postCount > 0 && `${postCount} scheduled`}
                                        {postCount > 0 && emptyCount > 0 && " · "}
                                        {emptyCount > 0 && `${emptyCount} open`}
                                    </span>
                                    <div className="flex-1 border-t border-gray-100" />
                                </div>
                                <div className="space-y-2">
                                    {entries.map((entry, i) =>
                                        entry.type === "post" && entry.post ? (
                                            <ScheduledPostCard
                                                key={entry.post.id}
                                                post={entry.post}
                                                onDelete={onDeletePost}
                                                onClick={() => onPostClick(entry.post!)}
                                                timezone={timezone}
                                            />
                                        ) : (
                                            <EmptySlotCard
                                                key={`empty-${dateKey}-${i}`}
                                                timeLabel={entry.timeLabel}
                                                platforms={entry.platforms || []}
                                                onClick={() => onSlotClick(entry.time, entry.platforms || [])}
                                            />
                                        ),
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {weeksAhead < 12 && <div ref={loadMoreRef} className="h-px" />}
        </div>
    );
}
