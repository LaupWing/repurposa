/**
 * Step 1: Topic Selection
 *
 * User enters what the blog is about.
 * Includes AI-powered topic generation (inline style).
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
    const [ideaPrompt, setIdeaPrompt] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className="space-y-5">
            {/* Label */}
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText size={16} className="text-blue-600" />
                What's this blog about?
            </label>

            {/* Inline Input + Generate Button (Option C) */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={ideaPrompt}
                    onChange={(e) => setIdeaPrompt(e.target.value)}
                    placeholder="Describe your idea... e.g., weight loss for busy moms"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                    ref={buttonRef}
                    onClick={() => setIsPopoverOpen(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                    <Sparkles size={16} />
                    Generate
                </button>
            </div>

            {/* Popover */}
            <TopicGeneratorPopover
                isOpen={isPopoverOpen}
                onClose={() => setIsPopoverOpen(false)}
                onSelectTopic={(selectedTopic) => {
                    onTopicChange(selectedTopic);
                    setIdeaPrompt('');
                }}
                initialPrompt={ideaPrompt}
                anchorRef={buttonRef}
            />

            {/* Final Topic Textarea */}
            <textarea
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                placeholder="Your final topic will appear here, or type directly..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
