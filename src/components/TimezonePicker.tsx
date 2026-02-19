import { useState, useRef, useEffect, useMemo } from '@wordpress/element';
import { Check, ChevronsUpDown } from 'lucide-react';

const timezones = Intl.supportedValuesOf('timeZone');

function formatTimezoneLabel(tz: string): string {
    const now = new Date();
    try {
        const offset = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'shortOffset',
        })
            .formatToParts(now)
            .find((p) => p.type === 'timeZoneName')?.value ?? '';

        return `${tz.replace(/_/g, ' ')} (${offset})`;
    } catch {
        return tz.replace(/_/g, ' ');
    }
}

interface TimezonePickerProps {
    value: string;
    onChange: (timezone: string) => void;
}

export function TimezonePicker({ value, onChange }: TimezonePickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        if (!search) return timezones;
        const lower = search.toLowerCase();
        return timezones.filter((tz) => tz.toLowerCase().includes(lower));
    }, [search]);

    // Close on click outside
    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    // Focus input when opened
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const displayLabel = value ? formatTimezoneLabel(value) : 'Select timezone...';

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full h-11 items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronsUpDown size={16} className="shrink-0 text-gray-400" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
                    <div className="border-b border-gray-200 px-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search timezone..."
                            className="w-full h-10 bg-transparent text-sm outline-none placeholder:text-gray-400"
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <p className="py-6 text-center text-sm text-gray-500">No timezone found.</p>
                        ) : (
                            filtered.map((tz) => (
                                <button
                                    key={tz}
                                    type="button"
                                    onClick={() => {
                                        onChange(tz);
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                    <Check
                                        size={16}
                                        className={`mr-2 shrink-0 ${value === tz ? 'opacity-100 text-blue-600' : 'opacity-0'}`}
                                    />
                                    {formatTimezoneLabel(tz)}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
