/**
 * Schedule Page
 *
 * Queue for scheduling posts across platforms (X, LinkedIn, Threads).
 * Supports short posts and threads per platform.
 * Includes default publishing times configuration.
 */

import { useState, useEffect, useCallback } from "@wordpress/element";
import { Calendar, Clock, Plus, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import {
    getPublishingSchedule,
    getScheduledPosts,
    deleteScheduledPost,
} from "@/services/scheduleApi";
import type { ShortPost as ApiShortPost, ThreadItem } from "@/types";
import { getStandaloneShortPosts, getStandaloneThreads } from "@/services/repurposeApi";
import type { Platform, TabType, WeeklySchedule, ScheduledPost } from "./types";
import { API_TO_UI_PLATFORM } from "./types";
import { mapApiPost, groupScheduledPosts, mapScheduleFromApi, getUpcomingSlotsFromSchedule } from "./helpers";
import { useProfileStore } from "@/store/profileStore";
import SlotContentPicker from "./SlotContentPicker";
import ScheduledPostDetail from "./ScheduledPostDetail";
import type { SchedulePlatform } from "@/components/repurpose/modals/schedule-utils";
import { QueueTab } from "./tabs/QueueTab";
import { PublishedTab } from "./tabs/PublishedTab";
import { DraftsTab } from "./tabs/DraftsTab";
import { TimesTab } from "./tabs/TimesTab";

export default function SchedulePage() {
    const { socialConnections } = useProfileStore();
    const [activeTab, setActiveTab] = useState<TabType>("queue");
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [drafts, setDrafts] = useState<ApiShortPost[]>([]);
    const [threadDrafts, setThreadDrafts] = useState<ThreadItem[]>([]);
    const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

    // SlotContentPicker state
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerSlotDate, setPickerSlotDate] = useState<Date | null>(null);
    const [pickerSlotPlatforms, setPickerSlotPlatforms] = useState<Platform[]>([]);
    const [pickerDraftContent, setPickerDraftContent] = useState<string | undefined>(undefined);
    const [pickerThreadDraft, setPickerThreadDraft] = useState<{ hook: string; posts: string[] } | undefined>(undefined);
    const [detailPost, setDetailPost] = useState<ScheduledPost | null>(null);

    const connectedPlatforms: Platform[] = socialConnections
        .map((c) => API_TO_UI_PLATFORM[c.platform])
        .filter(Boolean) as Platform[];

    const refreshPosts = useCallback(() => {
        getScheduledPosts()
            .then((data) => setPosts(groupScheduledPosts(data.map(mapApiPost))))
            .catch(() => toast.error("Failed to refresh schedule"));
    }, []);

    // Fetch data on mount
    useEffect(() => {
        getPublishingSchedule()
            .then((data) => {
                if (data.schedule) {
                    setWeeklySchedule(mapScheduleFromApi(data.schedule));
                }
                if (data.timezone) {
                    setTimezone(data.timezone);
                }
            })
            .catch((error) => console.error("[SchedulePage] Failed to load publishing schedule:", error))
            .finally(() => setIsLoadingSchedule(false));

        getScheduledPosts()
            .then((data) => setPosts(groupScheduledPosts(data.map(mapApiPost))))
            .catch((error) => console.error("[SchedulePage] Failed to load scheduled posts:", error))
            .finally(() => setIsLoadingPosts(false));

        setIsLoadingDrafts(true);
        Promise.all([getStandaloneShortPosts(), getStandaloneThreads()])
            .then(([shortPosts, threads]) => {
                setDrafts(shortPosts);
                setThreadDrafts(threads);
            })
            .catch(() => {})
            .finally(() => setIsLoadingDrafts(false));
    }, []);

    const handleDeletePost = async (id: number, allIds?: number[]) => {
        try {
            const idsToDelete = allIds && allIds.length > 0 ? allIds : [id];
            await Promise.all(idsToDelete.map(deleteScheduledPost));
            setPosts(posts.filter((p) => !idsToDelete.includes(p.id)));
            toast.success("Scheduled post removed");
        } catch {
            toast.error("Failed to remove post");
        }
    };

    // Derived data
    const queuePosts = posts.filter((post) => post.status !== "published");
    const publishedPosts = posts.filter((post) => post.status === "published");
    const totalSlots = weeklySchedule
        ? Object.values(weeklySchedule).reduce(
              (sum, day) => sum + (day.enabled ? day.slots.length : 0),
              0,
          )
        : 0;

    const tabs: { id: TabType; label: string; icon: typeof Calendar; badge?: string | number }[] = [
        { id: "queue", label: "Queue", icon: Calendar, badge: queuePosts.length > 0 ? queuePosts.length : undefined },
        { id: "published", label: "Published", icon: CheckCircle },
        { id: "drafts", label: "Drafts", icon: FileText, badge: (drafts.length + threadDrafts.length) > 0 ? drafts.length + threadDrafts.length : undefined },
        { id: "times", label: "Publishing Times", icon: Clock, badge: totalSlots > 0 ? `${totalSlots}/wk` : undefined },
    ];

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Post <em className="font-serif font-normal italic">Schedule</em>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Queue posts across platforms and set default publishing times
                    </p>
                </div>
                {activeTab === "queue" && (
                    <button
                        onClick={() => {
                            if (weeklySchedule) {
                                const slots = getUpcomingSlotsFromSchedule(weeklySchedule, 1, timezone);
                                if (slots.length > 0) {
                                    setPickerSlotDate(slots[0].date);
                                    setPickerSlotPlatforms(slots[0].platforms as Platform[]);
                                    setIsPickerOpen(true);
                                    return;
                                }
                            }
                            // Fallback: open with next hour, no pre-selected platforms
                            const nextHour = new Date();
                            nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                            setPickerSlotDate(nextHour);
                            setPickerSlotPlatforms(connectedPlatforms);
                            setIsPickerOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Schedule Post
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeTab === tab.id
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.badge !== undefined && (
                            <span
                                className={`px-1.5 py-0.5 text-xs rounded-full ${
                                    activeTab === tab.id
                                        ? "bg-blue-100 text-blue-600"
                                        : "bg-gray-100 text-gray-500"
                                }`}
                            >
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === "queue" && (
                <QueueTab
                    timezone={timezone}
                    posts={queuePosts}
                    weeklySchedule={weeklySchedule}
                    isLoading={isLoadingPosts}
                    onDeletePost={handleDeletePost}
                    onPostClick={setDetailPost}
                    onSlotClick={(date, platforms) => {
                        setPickerSlotDate(date);
                        setPickerSlotPlatforms(platforms);
                        setIsPickerOpen(true);
                    }}
                    onGoToTimes={() => setActiveTab("times")}
                />
            )}
            {activeTab === "published" && <PublishedTab posts={publishedPosts} timezone={timezone} />}
            {activeTab === "drafts" && (
                <DraftsTab
                    drafts={drafts}
                    threadDrafts={threadDrafts}
                    isLoading={isLoadingDrafts}
                    onDraftsChange={setDrafts}
                    onThreadDraftsChange={setThreadDrafts}
                    onDraftClick={(draft) => {
                        const openPicker = (date: Date, platforms: Platform[]) => {
                            setPickerSlotDate(date);
                            setPickerSlotPlatforms(platforms);
                            setPickerDraftContent(draft.content);
                            setPickerThreadDraft(undefined);
                            setIsPickerOpen(true);
                        };
                        if (weeklySchedule) {
                            const slots = getUpcomingSlotsFromSchedule(weeklySchedule, 1, timezone);
                            if (slots.length > 0) { openPicker(slots[0].date, slots[0].platforms as Platform[]); return; }
                        }
                        const nextHour = new Date();
                        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                        openPicker(nextHour, connectedPlatforms);
                    }}
                    onThreadDraftClick={(thread) => {
                        const openPicker = (date: Date, platforms: Platform[]) => {
                            setPickerSlotDate(date);
                            setPickerSlotPlatforms(platforms);
                            setPickerDraftContent(undefined);
                            setPickerThreadDraft({ hook: thread.hook, posts: thread.posts.map(p => p.content) });
                            setIsPickerOpen(true);
                        };
                        if (weeklySchedule) {
                            const slots = getUpcomingSlotsFromSchedule(weeklySchedule, 1, timezone);
                            if (slots.length > 0) { openPicker(slots[0].date, slots[0].platforms as Platform[]); return; }
                        }
                        const nextHour = new Date();
                        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                        openPicker(nextHour, connectedPlatforms);
                    }}
                />
            )}
            {activeTab === "times" && (
                <TimesTab
                    weeklySchedule={weeklySchedule}
                    isLoading={isLoadingSchedule}
                    onScheduleChange={setWeeklySchedule}
                    connectedPlatforms={connectedPlatforms}
                />
            )}

            {/* Modals */}
            {isPickerOpen && pickerSlotDate && (
                <SlotContentPicker
                    isOpen={isPickerOpen}
                    slotDate={pickerSlotDate}
                    slotPlatforms={pickerSlotPlatforms as SchedulePlatform[]}
                    initialDraftContent={pickerDraftContent}
                    initialThreadDraft={pickerThreadDraft}
                    timezone={timezone}
                    onClose={() => { setIsPickerOpen(false); setPickerDraftContent(undefined); setPickerThreadDraft(undefined); }}
                    onScheduled={() => { setIsPickerOpen(false); setPickerDraftContent(undefined); setPickerThreadDraft(undefined); refreshPosts(); }}
                />
            )}
            {detailPost && (
                <ScheduledPostDetail
                    isOpen={true}
                    onClose={() => setDetailPost(null)}
                    onUpdated={() => { setDetailPost(null); refreshPosts(); }}
                    post={detailPost}
                    timezone={timezone}
                />
            )}
        </div>
    );
}
