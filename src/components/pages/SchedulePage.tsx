/**
 * Schedule Page
 *
 * Queue for scheduling posts across platforms (X, LinkedIn, Threads).
 * Supports short posts and threads per platform.
 * Includes default publishing times configuration.
 */

import { useState, useRef, useEffect, useCallback } from "@wordpress/element";
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Filter,
    Check,
    Loader2,
    CheckCircle,
    FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
    getPublishingSchedule,
    savePublishingSchedule,
    getScheduledPosts,
    deleteScheduledPost,
} from "@/services/scheduleApi";
import type { ShortPost as ApiShortPost } from "@/types";
import { getStandaloneShortPosts, deleteShortPost } from "@/services/repurposeApi";
import type { Platform, PostType, TabType, DayOfWeek, DaySchedule, WeeklySchedule, ScheduledPost } from './schedule/types';
import { DAYS, PLATFORMS, POST_TYPES, API_TO_UI_PLATFORM } from './schedule/types';
import {
    mapApiPost, groupScheduledPosts, mapScheduleFromApi, mapScheduleToApi,
    formatScheduleDate, groupPostsByDate, generateSlotId,
    buildQueueTimeline, groupEntriesByDate,
} from './schedule/helpers';
import {
    ScheduledPostCard, PublishedPostCard, EmptySlotCard, DayRow,
} from './schedule/components';
import { useProfileStore } from "@/store/profileStore";
import { TimezonePicker } from "@/components/TimezonePicker";
import SlotContentPicker from "@/components/schedule/SlotContentPicker";
import ScheduledPostDetail from "@/components/schedule/ScheduledPostDetail";
import type { SchedulePlatform } from "@/components/repurpose/modals/schedule-utils";





// ============================================
// MAIN COMPONENT
// ============================================

export default function SchedulePage() {
    const { socialConnections, profile, saveProfile } = useProfileStore();
    const [activeTab, setActiveTab] = useState<TabType>("queue");
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(
        null,
    );
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    const [platformFilter, setPlatformFilter] = useState<Platform | "all">(
        "all",
    );
    const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [publishedPlatformFilter, setPublishedPlatformFilter] = useState<
        Platform | "all"
    >("all");
    const [publishedTypeFilter, setPublishedTypeFilter] = useState<
        PostType | "all"
    >("all");
    const [isPublishedFilterOpen, setIsPublishedFilterOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [weeksAhead, setWeeksAhead] = useState(2);
    const [drafts, setDrafts] = useState<ApiShortPost[]>([]);
    const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const publishedFilterRef = useRef<HTMLDivElement>(null);

    // SlotContentPicker state
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerSlotDate, setPickerSlotDate] = useState<Date | null>(null);
    const [pickerSlotPlatforms, setPickerSlotPlatforms] = useState<Platform[]>([]);
    const [detailPost, setDetailPost] = useState<ScheduledPost | null>(null);

    // Map social connections to UI platform names
    const connectedPlatforms: Platform[] = socialConnections
        .map((c) => API_TO_UI_PLATFORM[c.platform])
        .filter(Boolean) as Platform[];

    // Fetch publishing schedule from API on mount
    useEffect(() => {
        getPublishingSchedule()
            .then((data) => {
                if (data.schedule) {
                    const mapped = mapScheduleFromApi(data.schedule);
                    setWeeklySchedule(mapped);
                }
            })
            .catch((error) => {
                console.error(
                    "[SchedulePage] Failed to load publishing schedule:",
                    error,
                );
            })
            .finally(() => {
                setIsLoadingSchedule(false);
            });

        getScheduledPosts()
            .then((data) => {
                setPosts(groupScheduledPosts(data.map(mapApiPost)));
            })
            .catch((error) => {
                console.error(
                    "[SchedulePage] Failed to load scheduled posts:",
                    error,
                );
            })
            .finally(() => {
                setIsLoadingPosts(false);
            });

        setIsLoadingDrafts(true);
        getStandaloneShortPosts()
            .then(setDrafts)
            .catch(() => {})
            .finally(() => setIsLoadingDrafts(false));
    }, []);

    // Close filter dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                filterRef.current &&
                !filterRef.current.contains(e.target as Node)
            ) {
                setIsFilterOpen(false);
            }
        }
        if (isFilterOpen)
            document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [isFilterOpen]);

    // Infinite scroll — load more weeks when sentinel enters viewport
    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el || activeTab !== 'queue') return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setWeeksAhead((prev) => Math.min(prev + 2, 12));
                }
            },
            { rootMargin: '200px' },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [activeTab]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (
                publishedFilterRef.current &&
                !publishedFilterRef.current.contains(e.target as Node)
            ) {
                setIsPublishedFilterOpen(false);
            }
        }
        if (isPublishedFilterOpen)
            document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [isPublishedFilterOpen]);

    // Filter posts
    const queuePosts = posts.filter((post) => post.status !== "published");
    const publishedPosts = posts.filter((post) => post.status === "published");

    const filteredPosts = queuePosts.filter((post) => {
        const matchesPlatform =
            platformFilter === "all" || post.platforms.includes(platformFilter as Platform);
        const matchesType =
            typeFilter === "all" || post.postType === typeFilter;
        return matchesPlatform && matchesType;
    });

    const filteredPublishedPosts = publishedPosts.filter((post) => {
        const matchesPlatform =
            publishedPlatformFilter === "all" ||
            post.platforms.includes(publishedPlatformFilter as Platform);
        const matchesType =
            publishedTypeFilter === "all" ||
            post.postType === publishedTypeFilter;
        return matchesPlatform && matchesType;
    });
    const publishedGrouped = groupPostsByDate(filteredPublishedPosts);

    const handleDeletePost = async (id: number, allIds?: number[]) => {
        try {
            const idsToDelete = allIds && allIds.length > 0 ? allIds : [id];
            await Promise.all(idsToDelete.map(deleteScheduledPost));
            setPosts(posts.filter((p) => !idsToDelete.includes(p.id)));
            toast.success("Scheduled post removed");
        } catch (error) {
            toast.error("Failed to remove post");
        }
    };

    const handleToggleDay = (day: DayOfWeek) => {
        if (!weeklySchedule) return;
        setWeeklySchedule((prev) =>
            prev
                ? {
                      ...prev,
                      [day]: { ...prev[day], enabled: !prev[day].enabled },
                  }
                : prev,
        );
    };

    const handleUpdateDay = (day: DayOfWeek, schedule: DaySchedule) => {
        if (!weeklySchedule) return;
        setWeeklySchedule((prev) =>
            prev
                ? {
                      ...prev,
                      [day]: schedule,
                  }
                : prev,
        );
    };

    const handleSaveSchedule = async () => {
        if (!weeklySchedule) return;
        setIsSaving(true);
        try {
            await savePublishingSchedule(mapScheduleToApi(weeklySchedule));
            toast.success("Schedule saved!");
        } catch (error) {
            console.error("Failed to save schedule:", error);
            toast.error("Failed to save schedule");
        } finally {
            setIsSaving(false);
        }
    };

    // Count total weekly slots
    const totalSlots = weeklySchedule
        ? Object.values(weeklySchedule).reduce(
              (sum, day) => sum + (day.enabled ? day.slots.length : 0),
              0,
          )
        : 0;

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Post{" "}
                        <em className="font-serif font-normal italic">
                            Schedule
                        </em>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Queue posts across platforms and set default publishing
                        times
                    </p>
                </div>

                {activeTab === "queue" && (
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={16} />
                        Schedule Post
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("queue")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === "queue"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Calendar size={16} />
                    Queue
                    {queuePosts.length > 0 && (
                        <span
                            className={`px-1.5 py-0.5 text-xs rounded-full ${
                                activeTab === "queue"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                        >
                            {queuePosts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("published")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === "published"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <CheckCircle size={16} />
                    Published
                </button>
                <button
                    onClick={() => setActiveTab("drafts")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === "drafts"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <FileText size={16} />
                    Drafts
                    {drafts.length > 0 && (
                        <span
                            className={`px-1.5 py-0.5 text-xs rounded-full ${
                                activeTab === "drafts"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                        >
                            {drafts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("times")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === "times"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Clock size={16} />
                    Publishing Times
                    {totalSlots > 0 && (
                        <span
                            className={`px-1.5 py-0.5 text-xs rounded-full ${
                                activeTab === "times"
                                    ? "bg-blue-100 text-blue-600"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                        >
                            {totalSlots}/wk
                        </span>
                    )}
                </button>
            </div>

            {/* ============ QUEUE TAB ============ */}
            {activeTab === "queue" && isLoadingPosts && (
                <div className="space-y-6 animate-pulse">
                    {Array.from({ length: 3 }).map((_, gi) => (
                        <div key={gi}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-4 w-28 bg-gray-200 rounded" />
                                <div className="h-3 w-20 bg-gray-100 rounded" />
                                <div className="flex-1 border-t border-gray-100" />
                            </div>
                            <div className="space-y-2">
                                {Array.from({ length: 2 }).map((_, ci) => (
                                    <div key={ci} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                                        <div className="h-4 w-14 bg-gray-200 rounded" />
                                        <div className="h-5 w-5 bg-gray-200 rounded" />
                                        <div className="flex-1 space-y-1.5">
                                            <div className="h-4 w-3/4 bg-gray-200 rounded" />
                                            <div className="h-3 w-1/2 bg-gray-100 rounded" />
                                        </div>
                                        <div className="h-6 w-16 bg-gray-100 rounded" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {activeTab === "queue" && !isLoadingPosts && (
                <div>
                    {/* Filters */}
                    {queuePosts.length > 0 && (
                        <div className="flex items-center justify-between mb-5">
                            {/* Post type pills — left */}
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

                            {/* Platform filter dropdown — right */}
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() =>
                                        setIsFilterOpen(!isFilterOpen)
                                    }
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                                        platformFilter !== "all"
                                            ? "border-blue-500 text-blue-600 bg-blue-50"
                                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Filter size={14} />
                                    {platformFilter === "all"
                                        ? "Filter"
                                        : PLATFORMS.find(
                                              (p) => p.id === platformFilter,
                                          )?.name}
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                        <button
                                            onClick={() => {
                                                setPlatformFilter("all");
                                                setIsFilterOpen(false);
                                            }}
                                            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                                platformFilter === "all"
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            All Platforms
                                            {platformFilter === "all" && (
                                                <Check size={14} />
                                            )}
                                        </button>
                                        {PLATFORMS.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setPlatformFilter(p.id);
                                                    setIsFilterOpen(false);
                                                }}
                                                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                                    platformFilter === p.id
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "text-gray-600 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`w-5 h-5 ${p.bg} text-white rounded flex items-center justify-center`}
                                                    >
                                                        {p.icon}
                                                    </span>
                                                    {p.name}
                                                </div>
                                                {platformFilter === p.id && (
                                                    <Check size={14} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Timeline: scheduled posts + empty slots */}
                    {(() => {
                        const timeline = buildQueueTimeline(filteredPosts, weeklySchedule, weeksAhead);
                        const timelineGroups = groupEntriesByDate(timeline);

                        if (timeline.length === 0) {
                            return (
                                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                        <Calendar size={28} className="text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        No upcoming slots
                                    </h3>
                                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                                        Set up your publishing times first, then schedule posts to fill the slots.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab("times")}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                                    >
                                        <Clock size={16} />
                                        Set Publishing Times
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-6">
                                {Array.from(timelineGroups.entries()).map(
                                    ([dateKey, { label, entries }]) => {
                                        const postCount = entries.filter((e) => e.type === 'post').length;
                                        const emptyCount = entries.filter((e) => e.type === 'empty').length;
                                        return (
                                            <div key={dateKey}>
                                                {/* Day header */}
                                                <div className="flex items-center gap-3 mb-3">
                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                        {label}
                                                    </h3>
                                                    <span className="text-xs text-gray-400">
                                                        {postCount > 0 && `${postCount} scheduled`}
                                                        {postCount > 0 && emptyCount > 0 && ' · '}
                                                        {emptyCount > 0 && `${emptyCount} open`}
                                                    </span>
                                                    <div className="flex-1 border-t border-gray-100" />
                                                </div>

                                                {/* Entries */}
                                                <div className="space-y-2">
                                                    {entries.map((entry, i) =>
                                                        entry.type === 'post' && entry.post ? (
                                                            <ScheduledPostCard
                                                                key={entry.post.id}
                                                                post={entry.post}
                                                                onDelete={handleDeletePost}
                                                                onClick={() => setDetailPost(entry.post!)}
                                                            />
                                                        ) : (
                                                            <EmptySlotCard
                                                                key={`empty-${dateKey}-${i}`}
                                                                timeLabel={entry.timeLabel}
                                                                platforms={entry.platforms || []}
                                                                onClick={() => {
                                                                    setPickerSlotDate(entry.time);
                                                                    setPickerSlotPlatforms(entry.platforms || []);
                                                                    setIsPickerOpen(true);
                                                                }}
                                                            />
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        );
                    })()}
                    {/* Infinite scroll sentinel */}
                    {weeksAhead < 12 && <div ref={loadMoreRef} className="h-px" />}
                </div>
            )}

            {/* ============ PUBLISHED TAB ============ */}
            {activeTab === "published" && (
                <div>
                    {/* Filters */}
                    {publishedPosts.length > 0 && (
                        <div className="flex items-center justify-between mb-5">
                            {/* Post type pills — left */}
                            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                                <button
                                    onClick={() =>
                                        setPublishedTypeFilter("all")
                                    }
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                        publishedTypeFilter === "all"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    All
                                </button>
                                {POST_TYPES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() =>
                                            setPublishedTypeFilter(t.id)
                                        }
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                            publishedTypeFilter === t.id
                                                ? "bg-white text-gray-900 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {t.icon}
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Platform filter dropdown — right */}
                            <div className="relative" ref={publishedFilterRef}>
                                <button
                                    onClick={() =>
                                        setIsPublishedFilterOpen(
                                            !isPublishedFilterOpen,
                                        )
                                    }
                                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                                        publishedPlatformFilter !== "all"
                                            ? "border-blue-500 text-blue-600 bg-blue-50"
                                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Filter size={14} />
                                    {publishedPlatformFilter === "all"
                                        ? "Filter"
                                        : PLATFORMS.find(
                                              (p) =>
                                                  p.id ===
                                                  publishedPlatformFilter,
                                          )?.name}
                                </button>

                                {isPublishedFilterOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                        <button
                                            onClick={() => {
                                                setPublishedPlatformFilter(
                                                    "all",
                                                );
                                                setIsPublishedFilterOpen(false);
                                            }}
                                            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                                publishedPlatformFilter ===
                                                "all"
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                        >
                                            All Platforms
                                            {publishedPlatformFilter ===
                                                "all" && <Check size={14} />}
                                        </button>
                                        {PLATFORMS.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    setPublishedPlatformFilter(
                                                        p.id,
                                                    );
                                                    setIsPublishedFilterOpen(
                                                        false,
                                                    );
                                                }}
                                                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                                    publishedPlatformFilter ===
                                                    p.id
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "text-gray-600 hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`w-5 h-5 ${p.bg} text-white rounded flex items-center justify-center`}
                                                    >
                                                        {p.icon}
                                                    </span>
                                                    {p.name}
                                                </div>
                                                {publishedPlatformFilter ===
                                                    p.id && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Posts grouped by day */}
                    {filteredPublishedPosts.length > 0 ? (
                        <div className="space-y-6">
                            {Array.from(publishedGrouped.entries()).map(
                                ([dateKey, dayPosts]) => (
                                    <div key={dateKey}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-sm font-semibold text-gray-900">
                                                {formatScheduleDate(
                                                    dayPosts[0].scheduledAt,
                                                )}
                                            </h3>
                                            <span className="text-xs text-gray-400">
                                                {dayPosts.length}{" "}
                                                {dayPosts.length === 1
                                                    ? "post"
                                                    : "posts"}
                                            </span>
                                            <div className="flex-1 border-t border-gray-100" />
                                        </div>
                                        <div className="space-y-2">
                                            {dayPosts.map((post) => (
                                                <PublishedPostCard
                                                    key={post.id}
                                                    post={post}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    ) : publishedPosts.length > 0 ? (
                        /* No results from filter */
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle
                                    size={24}
                                    className="text-gray-400"
                                />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No matching posts
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Try adjusting your filters
                            </p>
                            <button
                                onClick={() => {
                                    setPublishedPlatformFilter("all");
                                    setPublishedTypeFilter("all");
                                }}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                <CheckCircle
                                    size={28}
                                    className="text-green-600"
                                />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No published posts yet
                            </h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                Posts that have been successfully published to
                                your social accounts will appear here.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ============ DRAFTS TAB ============ */}
            {activeTab === "drafts" && (
                <div>
                    {isLoadingDrafts ? (
                        <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 bg-gray-100 rounded-lg" />
                            ))}
                        </div>
                    ) : drafts.length === 0 ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                <FileText size={28} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                No drafts yet
                            </h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                Standalone posts you create from the schedule will appear here when they&apos;re not scheduled.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {drafts.map((draft) => {
                                const hasSchedule = draft.scheduled_posts && draft.scheduled_posts.length > 0;
                                return (
                                    <div
                                        key={draft.id}
                                        className="group flex items-start gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                    <FileText size={11} />
                                                    Short Post
                                                </span>
                                                {hasSchedule && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                                                        <Clock size={10} />
                                                        Scheduled
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-1">
                                                {draft.content}
                                            </p>
                                            <span className="text-xs text-gray-400">
                                                Created {draft.created_at ? new Date(draft.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                            </span>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await deleteShortPost(draft.id);
                                                        setDrafts(prev => prev.filter(d => d.id !== draft.id));
                                                        toast.success('Draft deleted');
                                                    } catch {
                                                        toast.error('Failed to delete draft');
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ============ PUBLISHING TIMES TAB ============ */}
            {activeTab === "times" && isLoadingSchedule && (
                <div className="max-w-3xl animate-pulse">
                    <div className="h-20 bg-blue-50 border border-blue-100 rounded-lg mb-6" />
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="h-5 w-36 bg-gray-200 rounded mb-2" />
                            <div className="h-3.5 w-56 bg-gray-100 rounded" />
                        </div>
                        <div className="divide-y divide-gray-100">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-6 py-4">
                                    <div className="h-4 w-4 bg-gray-200 rounded" />
                                    <div className="h-4 w-24 bg-gray-200 rounded" />
                                    <div className="flex-1 flex gap-2">
                                        <div className="h-8 w-20 bg-gray-100 rounded" />
                                        <div className="h-8 w-20 bg-gray-100 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {activeTab === "times" && !isLoadingSchedule && (
                <div className="max-w-3xl">
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
                        <Clock
                            size={18}
                            className="text-blue-600 mt-0.5 shrink-0"
                        />
                        <div>
                            <p className="text-sm text-blue-800 font-medium">
                                Default publishing times
                            </p>
                            <p className="text-sm text-blue-600 mt-0.5">
                                Set recurring time slots for each day. When you
                                schedule a post, it will automatically fill the
                                next available slot. You can choose which
                                platforms each time slot applies to.
                            </p>
                        </div>
                    </div>

                    {/* Weekly schedule card */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Weekly{" "}
                                        <em className="font-serif font-normal italic">
                                            Schedule
                                        </em>
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {totalSlots} time{" "}
                                        {totalSlots === 1 ? "slot" : "slots"}{" "}
                                        per week across{" "}
                                        {weeklySchedule
                                            ? Object.values(
                                                  weeklySchedule,
                                              ).filter((d) => d.enabled).length
                                            : 0}{" "}
                                        days
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {PLATFORMS.map((p) => (
                                        <span
                                            key={p.id}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${p.bg} text-white`}
                                        >
                                            {p.icon}
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Days */}
                        <div className="px-6 divide-y divide-gray-100">
                            {weeklySchedule &&
                                DAYS.map((day) => (
                                    <DayRow
                                        key={day.key}
                                        day={day}
                                        schedule={weeklySchedule[day.key]}
                                        onToggle={() =>
                                            handleToggleDay(day.key)
                                        }
                                        onUpdate={(schedule) =>
                                            handleUpdateDay(day.key, schedule)
                                        }
                                        connectedPlatforms={connectedPlatforms}
                                    />
                                ))}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Posts will be queued to the next available slot
                                automatically.
                            </p>
                            <button
                                onClick={handleSaveSchedule}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}
                                {isSaving ? "Saving..." : "Save Schedule"}
                            </button>
                        </div>
                    </div>

                    {/* Quick presets */}
                    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Quick{" "}
                                <em className="font-serif font-normal italic">
                                    Presets
                                </em>
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Start with a preset and customize from there
                            </p>
                        </div>
                        <div className="px-6 py-4 grid grid-cols-3 gap-3">
                            <button
                                onClick={() => applyPreset("casual")}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                    Casual
                                </p>
                                <p className="text-xs text-gray-500">
                                    5x/week, 1 post/day
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Mon-Fri at 9:00 AM
                                </p>
                            </button>
                            <button
                                onClick={() => applyPreset("consistent")}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                    Consistent
                                </p>
                                <p className="text-xs text-gray-500">
                                    5x/week, 2 posts/day
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Mon-Fri at 9 AM &amp; 12:30 PM
                                </p>
                            </button>
                            <button
                                onClick={() => applyPreset("aggressive")}
                                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                            >
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                    Power User
                                </p>
                                <p className="text-xs text-gray-500">
                                    7x/week, 3 posts/day
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Daily at 9 AM, 12:30 PM &amp; 5 PM
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Timezone */}
                    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Time
                                <em className="font-serif font-normal italic">
                                    zone
                                </em>
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                All publishing times use this timezone
                            </p>
                        </div>
                        <div className="px-6 py-4">
                            <TimezonePicker
                                value={
                                    profile?.timezone ||
                                    Intl.DateTimeFormat().resolvedOptions()
                                        .timeZone
                                }
                                onChange={(tz) => {
                                    if (profile) {
                                        saveProfile({
                                            ...profile,
                                            timezone: tz,
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Slot Content Picker Modal */}
            {isPickerOpen && pickerSlotDate && (
                <SlotContentPicker
                    isOpen={isPickerOpen}
                    slotDate={pickerSlotDate}
                    slotPlatforms={pickerSlotPlatforms as SchedulePlatform[]}
                    onClose={() => setIsPickerOpen(false)}
                    onScheduled={() => {
                        setIsPickerOpen(false);
                        getScheduledPosts()
                            .then((data) => setPosts(groupScheduledPosts(data.map(mapApiPost))))
                            .catch(() => toast.error('Failed to refresh schedule'));
                    }}
                />
            )}

            {/* Scheduled Post Detail Modal */}
            {detailPost && (
                <ScheduledPostDetail
                    isOpen={true}
                    onClose={() => setDetailPost(null)}
                    onUpdated={() => {
                        setDetailPost(null);
                        getScheduledPosts()
                            .then((data) => setPosts(groupScheduledPosts(data.map(mapApiPost))))
                            .catch(() => toast.error('Failed to refresh schedule'));
                    }}
                    post={detailPost}
                />
            )}
        </div>
    );

    // ============================================
    // PRESET LOGIC
    // ============================================

    function applyPreset(preset: "casual" | "consistent" | "aggressive") {
        const allPlatforms: Platform[] = ["x", "linkedin", "threads"];

        if (preset === "casual") {
            setWeeklySchedule({
                monday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "09:00",
                            platforms: allPlatforms,
                        },
                    ],
                },
                tuesday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "09:00",
                            platforms: allPlatforms,
                        },
                    ],
                },
                wednesday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "09:00",
                            platforms: allPlatforms,
                        },
                    ],
                },
                thursday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "09:00",
                            platforms: allPlatforms,
                        },
                    ],
                },
                friday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "09:00",
                            platforms: allPlatforms,
                        },
                    ],
                },
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            });
        } else if (preset === "consistent") {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [
                    {
                        id: generateSlotId(),
                        time: "09:00",
                        platforms: allPlatforms,
                    },
                    {
                        id: generateSlotId(),
                        time: "12:30",
                        platforms: ["x", "threads"],
                    },
                ],
            });
            setWeeklySchedule({
                monday: makeDay(),
                tuesday: makeDay(),
                wednesday: makeDay(),
                thursday: makeDay(),
                friday: makeDay(),
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            });
        } else {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [
                    {
                        id: generateSlotId(),
                        time: "09:00",
                        platforms: allPlatforms,
                    },
                    {
                        id: generateSlotId(),
                        time: "12:30",
                        platforms: ["x", "linkedin"],
                    },
                    {
                        id: generateSlotId(),
                        time: "17:00",
                        platforms: allPlatforms,
                    },
                ],
            });
            setWeeklySchedule({
                monday: makeDay(),
                tuesday: makeDay(),
                wednesday: makeDay(),
                thursday: makeDay(),
                friday: makeDay(),
                saturday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "10:00",
                            platforms: ["x", "threads"],
                        },
                    ],
                },
                sunday: {
                    enabled: true,
                    slots: [
                        {
                            id: generateSlotId(),
                            time: "10:00",
                            platforms: ["x", "threads"],
                        },
                    ],
                },
            });
        }
    }
}
