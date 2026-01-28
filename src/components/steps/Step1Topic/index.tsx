/**
 * Step 1: Topic Selection
 *
 * User enters what the blog is about.
 * Includes AI-powered topic generation.
 */

import { useState, useRef } from '@wordpress/element';
import { FileText, Sparkles } from 'lucide-react';
import TopicGeneratorPopover from './TopicGeneratorPopover';

// ============================================
// TYPES
// ============================================

interface Step1TopicProps {
    topic: string;
    onTopicChange: (topic: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function Step1Topic({ topic, onTopicChange }: Step1TopicProps) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className="space-y-5">
            {/* Label */}
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText size={16} className="text-blue-600" />
                What's this blog about?
            </label>

            {/* Textarea */}
            <textarea
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                placeholder="e.g., 5 mistakes beginners make that sabotage their weight loss"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />

            {/* Generate Button (Option B - visible below) */}
            <button
                ref={buttonRef}
                onClick={() => setIsPopoverOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
            >
                <Sparkles size={16} className="text-blue-600" />
                Generate Topic Ideas
            </button>

            {/* Popover - uses textarea content as initial prompt */}
            <TopicGeneratorPopover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onSelectTopic={onTopicChange}
                initialPrompt={topic}
                anchorRef={buttonRef}
            />

            {/* Tip Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-700">
                    <span className="font-semibold text-blue-600">Tip:</span>{' '}
                    Be specific! Instead of "weight loss tips", try
                    "5 mistakes busy moms make when trying to lose weight"
                </p>
            </div>
        </div>
    );
}
