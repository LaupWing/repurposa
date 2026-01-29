/**
 * Topic Generator Popover
 *
 * Uses WordPress native Popover component.
 * Shows AI-generated topic suggestions.
 */

import { useState, useEffect } from '@wordpress/element';
import { Popover, Spinner } from '@wordpress/components';
import { Sparkles, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateTopics, type TopicSuggestion } from '../../../services/api';
import { useProfile } from '../../../context/ProfileContext';

interface TopicGeneratorPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTopic: (topic: string) => void;
    initialPrompt?: string;
    anchorRef: React.RefObject<HTMLButtonElement>;
}

// ============================================
// COMPONENT
// ============================================

export default function TopicGeneratorPopover({
    isOpen,
    onClose,
    onSelectTopic,
    initialPrompt = '',
    anchorRef,
}: TopicGeneratorPopoverProps) {
    const { profile } = useProfile();
    const [prompt, setPrompt] = useState(initialPrompt);
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Sync with initialPrompt when popover opens
    useEffect(() => {
        if (isOpen && initialPrompt) {
            setPrompt(initialPrompt);
        }
    }, [isOpen, initialPrompt]);

    // Auto-generate if we have a prompt when opening
    useEffect(() => {
        if (isOpen && initialPrompt && suggestions.length === 0) {
            handleGenerate();
        }
    }, [isOpen]);

    // Generate topics from Laravel API
    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);

        try {
            const response = await generateTopics(prompt.trim(), profile ?? undefined);
            setSuggestions(response.suggestions);
        } catch (error) {
            console.error('Failed to generate topics:', error);
            toast.error('Failed to generate topics', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelectTopic = (topic: string) => {
        onSelectTopic(topic);
        setPrompt('');
        setSuggestions([]);
        onClose();
    };

    const handleClose = () => {
        setPrompt('');
        setSuggestions([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Popover
            anchor={anchorRef.current}
            placement="bottom-end"
            onClose={handleClose}
            className="wbrp-topic-popover"
        >
            <div className="w-80 p-5 bg-white rounded-lg shadow-lg border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-semibold text-sm text-gray-900">Generate Topic Ideas</h4>
                        <p className="text-xs text-gray-500 mt-0.5">AI will suggest topics based on your idea</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Input */}
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., weight loss tips for busy moms"
                    rows={3}
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isGenerating ? (
                        <>
                            <Spinner />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Topics
                        </>
                    )}
                </button>

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                className="relative flex items-start gap-2 group"
                            >
                                <button
                                    onClick={() => handleSelectTopic(suggestion.title)}
                                    className="flex-1 text-left text-sm p-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                                >
                                    {suggestion.title}
                                </button>
                                <button
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="shrink-0 p-2 text-gray-400 hover:text-gray-600 mt-1"
                                >
                                    <HelpCircle size={14} />
                                </button>

                                {/* Tooltip */}
                                {hoveredIndex === index && (
                                    <div className="absolute right-0 top-full mt-1 z-10 w-52 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                        <p className="font-semibold mb-1">Why it works</p>
                                        <p className="text-gray-300 leading-relaxed">{suggestion.why_it_works}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Popover>
    );
}
