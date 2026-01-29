/**
 * Step 1: Topic Selection
 *
 * User enters what the blog is about.
 * Includes AI-powered topic generation (modal).
 */

import { useState } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import { FileText, Sparkles, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateTopics, type TopicSuggestion } from '../../../services/api';
import { useProfile } from '../../../context/ProfileContext';

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
    const { profile } = useProfile();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const handleOpenModal = () => {
        setPrompt(topic);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSuggestions([]);
        setPrompt('');
    };

    const handleGenerate = async () => {
        const searchTerm = prompt.trim() || topic.trim();
        if (!searchTerm) {
            toast.error('Enter a topic idea first');
            return;
        }

        setIsGenerating(true);

        try {
            const response = await generateTopics(searchTerm, profile ?? undefined);
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

    const handleSelectTopic = (selectedTopic: string) => {
        onTopicChange(selectedTopic);
        handleCloseModal();
    };

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

            {/* Generate Button */}
            <button
                onClick={handleOpenModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
            >
                <Sparkles size={16} className="text-blue-600" />
                Generate Topic Ideas
            </button>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100000] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleCloseModal}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                    Generate Topic Ideas
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    AI will suggest topics based on your idea
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Input */}
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., weight loss tips for busy moms"
                            rows={3}
                            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                            autoFocus
                        />

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
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
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 max-h-64 overflow-y-auto">
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                    Click to use:
                                </p>
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="relative flex items-start gap-2 group"
                                    >
                                        <button
                                            onClick={() => handleSelectTopic(suggestion.title)}
                                            className="flex-1 text-left text-sm p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-gray-700 border border-transparent hover:border-blue-200"
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
                                            <div className="absolute right-8 top-0 z-10 w-52 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                                <p className="font-semibold mb-1">Why it works</p>
                                                <p className="text-gray-300 leading-relaxed">
                                                    {suggestion.why_it_works}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
