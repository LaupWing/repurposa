import { useState } from '@wordpress/element';
import { AlertCircle } from 'lucide-react';

export function DisabledTabsOverlay() {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg cursor-not-allowed bg-gray-200/60 backdrop-blur-[1px]"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle size={14} />
                <span className="text-xs font-medium">Content required</span>
            </div>

            {showTooltip && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 px-3 py-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 text-center leading-relaxed">
                    Write your blog content first before you can use these features.
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
            )}
        </div>
    );
}
