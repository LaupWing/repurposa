import { useState } from '@wordpress/element';
import { X, Repeat2, CalendarDays, Plus, Trash2, Settings2 } from 'lucide-react';
import { SCHEDULE_PLATFORMS } from '../schedule-utils';
import type { SchedulePlatform } from '../schedule-utils';

export type RepostPlatform = 'x' | 'threads';
const REPOST_PLATFORMS: RepostPlatform[] = ['x', 'threads'];

export interface RepostInterval {
    days: number;
    hours: number;
}

interface AutoRepostModalProps {
    isOpen: boolean;
    publishDate: Date;
    intervals: RepostInterval[];
    platforms: RepostPlatform[];
    availablePlatforms: RepostPlatform[];
    onSave: (intervals: RepostInterval[], platforms: RepostPlatform[]) => void;
    onClose: () => void;
}

const DEFAULT_INTERVALS: RepostInterval[] = [
    { days: 0, hours: 6 },
    { days: 1, hours: 0 },
    { days: 7, hours: 0 },
];

function addInterval(date: Date, interval: RepostInterval): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + interval.days);
    result.setHours(result.getHours() + interval.hours);
    return result;
}

function formatRepostDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export default function AutoRepostModal({
    isOpen,
    publishDate,
    intervals: initialIntervals,
    platforms: initialPlatforms,
    availablePlatforms,
    onSave,
    onClose,
}: AutoRepostModalProps) {
    const [intervals, setIntervals] = useState<RepostInterval[]>(
        initialIntervals.length > 0 ? initialIntervals : DEFAULT_INTERVALS
    );
    const [selectedPlatforms, setSelectedPlatforms] = useState<RepostPlatform[]>(
        initialPlatforms.length > 0 ? initialPlatforms : availablePlatforms
    );

    console.log('[AutoRepostModal] props:', JSON.stringify({
        isOpen,
        initialIntervals: initialIntervals,
        initialPlatforms: initialPlatforms,
        availablePlatforms: availablePlatforms,
    }));
    console.log('[AutoRepostModal] state:', JSON.stringify({
        intervals,
        selectedPlatforms,
    }));

    if (!isOpen) return null;

    const togglePlatform = (id: RepostPlatform) => {
        setSelectedPlatforms(prev => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter(p => p !== id);
            }
            return [...prev, id];
        });
    };

    const updateInterval = (index: number, field: 'days' | 'hours', value: number) => {
        setIntervals(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: Math.max(0, value) } : item
        ));
    };

    const removeInterval = (index: number) => {
        setIntervals(prev => prev.filter((_, i) => i !== index));
    };

    const addNewInterval = () => {
        const last = intervals[intervals.length - 1];
        setIntervals(prev => [...prev, { days: (last?.days || 0) + 1, hours: 0 }]);
    };

    const hasValidIntervals = intervals.length > 0 && selectedPlatforms.length > 0 && intervals.every(i => i.days > 0 || i.hours > 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="text-base font-semibold text-gray-900">Auto-Repost</h2>
                        <button
                            onClick={onClose}
                            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Automatically repost after publishing to boost reach. Reposts are removed after 12 hours.
                    </p>

                    {/* Platform toggles + Set as default */}
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5">
                            {REPOST_PLATFORMS.map(id => {
                                const platform = SCHEDULE_PLATFORMS.find(p => p.id === id);
                                if (!platform) return null;
                                const connected = availablePlatforms.includes(id);
                                const active = selectedPlatforms.includes(id);
                                return (
                                    <button
                                        key={id}
                                        onClick={() => connected && togglePlatform(id)}
                                        disabled={!connected}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                            !connected
                                                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                                : active
                                                    ? `${platform.bg} text-white`
                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                        }`}
                                    >
                                        {platform.icon}
                                        {platform.name}
                                    </button>
                                );
                            })}
                        </div>
                        <button className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                            <Settings2 size={11} />
                            Set as default
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                    {/* Original post time */}
                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <CalendarDays size={14} className="text-blue-500 shrink-0" />
                        <div>
                            <div className="text-xs font-medium text-gray-700">
                                Post goes out {formatRepostDate(publishDate)}
                            </div>
                        </div>
                    </div>

                    {/* Repost intervals */}
                    {intervals.map((interval, index) => {
                        const repostDate = addInterval(publishDate, interval);
                        return (
                            <div
                                key={index}
                                className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-200"
                            >
                                <Repeat2 size={14} className="text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-700">
                                        <span>Repost after</span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={interval.days}
                                            onChange={(e) => updateInterval(index, 'days', parseInt(e.target.value) || 0)}
                                            className="w-12 px-1.5 py-0.5 text-center text-xs border border-gray-200 rounded focus:border-blue-300 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                                        />
                                        <span>days</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={23}
                                            value={interval.hours}
                                            onChange={(e) => updateInterval(index, 'hours', parseInt(e.target.value) || 0)}
                                            className="w-12 px-1.5 py-0.5 text-center text-xs border border-gray-200 rounded focus:border-blue-300 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                                        />
                                        <span>hours</span>
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-1">
                                        {formatRepostDate(repostDate)}
                                    </div>
                                </div>
                                {intervals.length > 1 && (
                                    <button
                                        onClick={() => removeInterval(index)}
                                        className="h-6 w-6 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors shrink-0"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Add repost */}
                    <button
                        onClick={addNewInterval}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors px-1"
                    >
                        <Plus size={12} />
                        Add a repost
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={() => setIntervals(DEFAULT_INTERVALS)}
                        className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Reset to defaults
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave(intervals, selectedPlatforms)}
                            disabled={!hasValidIntervals}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Enable auto-repost
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
