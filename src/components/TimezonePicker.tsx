import { useState, useRef, useEffect, useMemo } from '@wordpress/element';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown } from 'lucide-react';

// Deprecated IANA aliases that Laravel/PHP timezone_identifiers_list() rejects.
// Maps alias → canonical name.
const DEPRECATED_ALIASES: Record<string, string> = {
    'Asia/Saigon': 'Asia/Ho_Chi_Minh',
    'Asia/Calcutta': 'Asia/Kolkata',
    'Asia/Katmandu': 'Asia/Kathmandu',
    'Asia/Dacca': 'Asia/Dhaka',
    'Asia/Rangoon': 'Asia/Yangon',
    'Asia/Ulaanbaatar': 'Asia/Ulan_Bator',
    'Pacific/Truk': 'Pacific/Chuuk',
    'Pacific/Ponape': 'Pacific/Pohnpei',
    'America/Godthab': 'America/Nuuk',
};

export function canonicalTimezone(tz: string): string {
    return DEPRECATED_ALIASES[tz] ?? tz;
}

const timezones = Intl.supportedValuesOf('timeZone').filter(
    (tz) => !(tz in DEPRECATED_ALIASES),
);

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
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

    const canonical = canonicalTimezone(value);

    const filtered = useMemo(() => {
        if (!search) return timezones;
        const lower = search.toLowerCase();
        return timezones.filter((tz) => tz.toLowerCase().includes(lower));
    }, [search]);

    const updateDropdownPosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 99999,
        });
    };

    useEffect(() => {
        if (!open) return;
        updateDropdownPosition();
        inputRef.current?.focus();

        const handleClickOutside = (e: MouseEvent) => {
            if (
                !buttonRef.current?.contains(e.target as Node) &&
                !dropdownRef.current?.contains(e.target as Node)
            ) {
                setOpen(false);
                setSearch('');
            }
        };
        const handleScroll = () => updateDropdownPosition();

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);

    const displayLabel = canonical ? formatTimezoneLabel(canonical) : 'Select timezone...';

    const dropdown = open ? (
        <div ref={dropdownRef} style={dropdownStyle} className="rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
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
                                className={`mr-2 shrink-0 ${canonical === tz ? 'opacity-100 text-blue-600' : 'opacity-0'}`}
                            />
                            {formatTimezoneLabel(tz)}
                        </button>
                    ))
                )}
            </div>
        </div>
    ) : null;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full h-11 items-center justify-between rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronsUpDown size={16} className="shrink-0 text-gray-400" />
            </button>

            {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
        </div>
    );
}
