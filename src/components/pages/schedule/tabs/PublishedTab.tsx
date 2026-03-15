import { useState, useRef, useEffect } from "@wordpress/element";
import { CheckCircle, Filter, Check } from "lucide-react";
import type { Platform, PostType, ScheduledPost } from "../types";
import { PLATFORMS, POST_TYPES } from "../types";
import { formatScheduleDate, groupPostsByDate } from "../helpers";
import { PublishedPostCard } from "../components";

interface PublishedTabProps {
    posts: ScheduledPost[];
}

export function PublishedTab({ posts }: PublishedTabProps) {
    const [typeFilter, setTypeFilter] = useState<PostType | "all">("all");
    const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

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

    const filteredPosts = posts.filter((post) => {
        const matchesPlatform = platformFilter === "all" || post.platforms.includes(platformFilter as Platform);
        const matchesType = typeFilter === "all" || post.postType === typeFilter;
        return matchesPlatform && matchesType;
    });
    const grouped = groupPostsByDate(filteredPosts);

    return (
        <div>
            {/* Filters */}
            {posts.length > 0 && (
                <div className="flex items-center justify-between mb-5">
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

            {/* Posts grouped by day */}
            {filteredPosts.length > 0 ? (
                <div className="space-y-6">
                    {Array.from(grouped.entries()).map(([dateKey, dayPosts]) => (
                        <div key={dateKey}>
                            <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {formatScheduleDate(dayPosts[0].scheduledAt)}
                                </h3>
                                <span className="text-xs text-gray-400">
                                    {dayPosts.length} {dayPosts.length === 1 ? "post" : "posts"}
                                </span>
                                <div className="flex-1 border-t border-gray-100" />
                            </div>
                            <div className="space-y-2">
                                {dayPosts.map((post) => (
                                    <PublishedPostCard key={post.id} post={post} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : posts.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching posts</h3>
                    <p className="text-sm text-gray-500 mb-4">Try adjusting your filters</p>
                    <button
                        onClick={() => { setPlatformFilter("all"); setTypeFilter("all"); }}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <CheckCircle size={28} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No published posts yet</h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Posts that have been successfully published to your social accounts will appear here.
                    </p>
                </div>
            )}
        </div>
    );
}
