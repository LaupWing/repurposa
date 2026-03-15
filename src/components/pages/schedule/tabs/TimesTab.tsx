import { useState } from "@wordpress/element";
import { Clock, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { savePublishingSchedule } from "@/services/scheduleApi";
import type { Platform, DayOfWeek, DaySchedule, WeeklySchedule } from "../types";
import { DAYS, PLATFORMS } from "../types";
import { generateSlotId, mapScheduleToApi } from "../helpers";
import { DayRow } from "../components";
import { useProfileStore } from "@/store/profileStore";
import { TimezonePicker } from "@/components/TimezonePicker";

interface TimesTabProps {
    weeklySchedule: WeeklySchedule | null;
    isLoading: boolean;
    onScheduleChange: (schedule: WeeklySchedule) => void;
    connectedPlatforms: Platform[];
}

export function TimesTab({
    weeklySchedule,
    isLoading,
    onScheduleChange,
    connectedPlatforms,
}: TimesTabProps) {
    const { profile, saveProfile } = useProfileStore();
    const [isSaving, setIsSaving] = useState(false);

    const totalSlots = weeklySchedule
        ? Object.values(weeklySchedule).reduce(
              (sum, day) => sum + (day.enabled ? day.slots.length : 0),
              0,
          )
        : 0;

    const handleToggleDay = (day: DayOfWeek) => {
        if (!weeklySchedule) return;
        onScheduleChange({
            ...weeklySchedule,
            [day]: { ...weeklySchedule[day], enabled: !weeklySchedule[day].enabled },
        });
    };

    const handleUpdateDay = (day: DayOfWeek, schedule: DaySchedule) => {
        if (!weeklySchedule) return;
        onScheduleChange({ ...weeklySchedule, [day]: schedule });
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

    const applyPreset = (preset: "casual" | "consistent" | "aggressive") => {
        const allPlatforms: Platform[] = ["x", "linkedin", "threads"];

        if (preset === "casual") {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [{ id: generateSlotId(), time: "09:00", platforms: allPlatforms }],
            });
            onScheduleChange({
                monday: makeDay(), tuesday: makeDay(), wednesday: makeDay(),
                thursday: makeDay(), friday: makeDay(),
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            });
        } else if (preset === "consistent") {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [
                    { id: generateSlotId(), time: "09:00", platforms: allPlatforms },
                    { id: generateSlotId(), time: "12:30", platforms: ["x", "threads"] },
                ],
            });
            onScheduleChange({
                monday: makeDay(), tuesday: makeDay(), wednesday: makeDay(),
                thursday: makeDay(), friday: makeDay(),
                saturday: { enabled: false, slots: [] },
                sunday: { enabled: false, slots: [] },
            });
        } else {
            const makeDay = (): DaySchedule => ({
                enabled: true,
                slots: [
                    { id: generateSlotId(), time: "09:00", platforms: allPlatforms },
                    { id: generateSlotId(), time: "12:30", platforms: ["x", "linkedin"] },
                    { id: generateSlotId(), time: "17:00", platforms: allPlatforms },
                ],
            });
            onScheduleChange({
                monday: makeDay(), tuesday: makeDay(), wednesday: makeDay(),
                thursday: makeDay(), friday: makeDay(),
                saturday: {
                    enabled: true,
                    slots: [{ id: generateSlotId(), time: "10:00", platforms: ["x", "threads"] }],
                },
                sunday: {
                    enabled: true,
                    slots: [{ id: generateSlotId(), time: "10:00", platforms: ["x", "threads"] }],
                },
            });
        }
    };

    if (isLoading) {
        return (
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
        );
    }

    return (
        <div className="max-w-3xl">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg mb-6">
                <Clock size={18} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm text-blue-800 font-medium">Default publishing times</p>
                    <p className="text-sm text-blue-600 mt-0.5">
                        Set recurring time slots for each day. When you schedule a post, it will
                        automatically fill the next available slot. You can choose which platforms
                        each time slot applies to.
                    </p>
                </div>
            </div>

            {/* Weekly schedule card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Weekly <em className="font-serif font-normal italic">Schedule</em>
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {totalSlots} time {totalSlots === 1 ? "slot" : "slots"} per week across{" "}
                                {weeklySchedule
                                    ? Object.values(weeklySchedule).filter((d) => d.enabled).length
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

                <div className="px-6 divide-y divide-gray-100">
                    {weeklySchedule &&
                        DAYS.map((day) => (
                            <DayRow
                                key={day.key}
                                day={day}
                                schedule={weeklySchedule[day.key]}
                                onToggle={() => handleToggleDay(day.key)}
                                onUpdate={(schedule) => handleUpdateDay(day.key, schedule)}
                                connectedPlatforms={connectedPlatforms}
                            />
                        ))}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Posts will be queued to the next available slot automatically.
                    </p>
                    <button
                        onClick={handleSaveSchedule}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {isSaving ? "Saving..." : "Save Schedule"}
                    </button>
                </div>
            </div>

            {/* Quick presets */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Quick <em className="font-serif font-normal italic">Presets</em>
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
                        <p className="text-sm font-medium text-gray-900 mb-1">Casual</p>
                        <p className="text-xs text-gray-500">5x/week, 1 post/day</p>
                        <p className="text-xs text-gray-400 mt-1">Mon-Fri at 9:00 AM</p>
                    </button>
                    <button
                        onClick={() => applyPreset("consistent")}
                        className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                    >
                        <p className="text-sm font-medium text-gray-900 mb-1">Consistent</p>
                        <p className="text-xs text-gray-500">5x/week, 2 posts/day</p>
                        <p className="text-xs text-gray-400 mt-1">Mon-Fri at 9 AM &amp; 12:30 PM</p>
                    </button>
                    <button
                        onClick={() => applyPreset("aggressive")}
                        className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                    >
                        <p className="text-sm font-medium text-gray-900 mb-1">Power User</p>
                        <p className="text-xs text-gray-500">7x/week, 3 posts/day</p>
                        <p className="text-xs text-gray-400 mt-1">Daily at 9 AM, 12:30 PM &amp; 5 PM</p>
                    </button>
                </div>
            </div>

            {/* Timezone */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Time<em className="font-serif font-normal italic">zone</em>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        All publishing times use this timezone
                    </p>
                </div>
                <div className="px-6 py-4">
                    <TimezonePicker
                        value={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                        onChange={(tz) => {
                            if (profile) {
                                saveProfile({ ...profile, timezone: tz });
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
