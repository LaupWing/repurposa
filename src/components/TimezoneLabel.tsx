import { useState, useRef } from '@wordpress/element';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { getTimezoneLabel } from '@/components/repurpose/modals/schedule-utils';

interface TimezoneLabelProps {
    timezone: string;
}

export function TimezoneLabel({ timezone }: TimezoneLabelProps) {
    const city = timezone.split('/').pop()?.replace(/_/g, ' ') ?? timezone;
    const offset = getTimezoneLabel(timezone);
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({ top: rect.top + window.scrollY - 8, left: rect.left + window.scrollX });
        }
        setVisible(true);
    };

    const hide = () => {
        hideTimer.current = setTimeout(() => setVisible(false), 150);
    };

    return (
        <>
            <div
                ref={ref}
                className="inline-flex items-center gap-1 cursor-help"
                onMouseEnter={show}
                onMouseLeave={hide}
            >
                <span className="text-[11px] text-gray-400">{offset}</span>
                <Info size={10} className="text-gray-300" />
            </div>

            {visible && createPortal(
                <div
                    className="fixed z-[99999] w-52 bg-gray-900 text-white rounded-lg shadow-lg p-3"
                    style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
                    onMouseEnter={show}
                    onMouseLeave={hide}
                >
                    <p className="text-xs font-semibold mb-1">{city} time ({offset})</p>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                        To change it, go to{' '}
                        <a
                            href="admin.php?page=repurposa-settings"
                            className="text-blue-400 hover:text-blue-300 underline"
                        >
                            Settings
                        </a>
                    </p>
                </div>,
                document.body
            )}
        </>
    );
}
