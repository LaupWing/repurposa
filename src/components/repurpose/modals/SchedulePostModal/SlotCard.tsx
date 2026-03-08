import { Check, Clock, AlertTriangle } from 'lucide-react';
import { Tooltip } from '@wordpress/components';
import type { SchedulePlatform, UpcomingSlot } from '../schedule-utils';
import { SCHEDULE_PLATFORMS } from '../schedule-utils';
import type { PlatformState } from './platform-states';

interface SlotCardProps {
    slot: UpcomingSlot;
    isSelected: boolean;
    platformStates: Map<SchedulePlatform, PlatformState>;
    selectedPlatforms: SchedulePlatform[];
    onSelect: () => void;
    onTogglePlatform: (id: SchedulePlatform) => void;
}

export default function SlotCard({
    slot,
    isSelected,
    platformStates,
    selectedPlatforms,
    onSelect,
    onTogglePlatform,
}: SlotCardProps) {
    return (
        <div
            onClick={() => onSelect()}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                    ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
        >
            <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 transition-colors ${
                isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
            }`}>
                {isSelected && <Check size={12} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{slot.dateLabel}</div>
                <div className="text-xs mt-0.5 text-gray-500">{slot.timeLabel}</div>
            </div>
            <div className="flex items-center gap-1.5">
                {SCHEDULE_PLATFORMS.map((p) => {
                    const state = platformStates.get(p.id)!;
                    const active = isSelected && selectedPlatforms.includes(p.id);
                    const inSlot = slot.platforms.includes(p.id);

                    if (state.disabled) {
                        return (
                            <Tooltip key={p.id} text={state.reason} delay={0} placement="top">
                                <div className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md cursor-not-allowed ${
                                    state.kind === 'unsupported' ? 'border border-amber-400 text-gray-300' : 'bg-gray-100 text-gray-200'
                                }`}>
                                    {p.icon}
                                    {state.kind === 'unsupported' && (
                                        <AlertTriangle size={12} className="absolute -top-1.5 -right-1.5 text-amber-500 fill-amber-100" />
                                    )}
                                    {state.kind === 'published' && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                            <Check size={8} className="text-white" />
                                        </span>
                                    )}
                                </div>
                            </Tooltip>
                        );
                    }

                    const isPublished = state.kind === 'published';
                    const style = active
                        ? `${p.bg} text-white`
                        : isSelected
                            ? 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400'
                            : inSlot && !isPublished
                                ? `${p.bg} text-white`
                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400';

                    return (
                        <Tooltip key={p.id} text={state.reason} delay={0} placement="top">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isSelected) onSelect();
                                    onTogglePlatform(p.id);
                                }}
                                className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md transition-all ${style}`}
                            >
                                {p.icon}
                                {state.kind === 'published' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                                        <Check size={8} className="text-white" />
                                    </span>
                                )}
                                {state.kind === 'pending' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Clock size={7} className="text-white" />
                                    </span>
                                )}
                                {state.kind === 'failed' && (
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                        <AlertTriangle size={7} className="text-white" />
                                    </span>
                                )}
                            </button>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}
