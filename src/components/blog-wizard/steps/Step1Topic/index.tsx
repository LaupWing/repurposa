/**
 * Step 1: Topic Selection
 *
 * User enters what the blog is about.
 * Includes AI-powered topic generation (modal).
 */

import { useState, useRef, useEffect } from "@wordpress/element";
import { Spinner } from "@wordpress/components";
import {
    FileText,
    Sparkles,
    HelpCircle,
    X,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { generateTopics, refineText } from "@/services/blogApi";
import type { TopicSuggestion } from "@/types";
import { useProfileStore } from "@/store/profileStore";
import { AITextPopup } from "@/components/AITextPopup";
import { GeneratingOverlay } from "@/components/GeneratingOverlay";

// ============================================
// TYPES
// ============================================

interface Step1TopicProps {
    topic: string;
    onTopicChange: (topic: string) => void;
    targetAudience: string;
    onTargetAudienceChange: (value: string) => void;
    generatedTopics: TopicSuggestion[];
    onGeneratedTopicsChange: (topics: TopicSuggestion[]) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function Step1Topic({
    topic,
    onTopicChange,
    targetAudience,
    onTargetAudienceChange,
    generatedTopics,
    onGeneratedTopicsChange,
}: Step1TopicProps) {
    const { profile } = useProfileStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isRefining, setIsRefining] = useState(false);
    const [showRefineTooltip, setShowRefineTooltip] = useState(false);
    const [showEditPopover, setShowEditPopover] = useState(false);
    const [editInstruction, setEditInstruction] = useState("");
    const topicTextareaRef = useRef<HTMLTextAreaElement>(null);

    const handleEditPrompt = async () => {
        if (!editInstruction.trim()) return;

        setIsRefining(true);
        try {
            const response = await refineText(topic, editInstruction);
            onTopicChange(response.text);
            setShowEditPopover(false);
            setEditInstruction("");
            toast.success("Prompt updated!");
        } catch (error) {
            console.error("Failed to edit prompt:", error);
            toast.error("Failed to edit prompt");
        } finally {
            setIsRefining(false);
        }
    };

    const handleOpenModal = () => {
        setPrompt(topic);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setPrompt("");
    };

    const handleGenerate = async () => {
        const searchTerm = prompt.trim() || topic.trim();
        if (!searchTerm) {
            toast.error("Enter a topic idea first");
            return;
        }

        setIsGenerating(true);

        try {
            // Server auto-saves generated_topics to wizard
            const response = await generateTopics(searchTerm, {
                target_audience: targetAudience || profile?.target_audience,
            });
            onGeneratedTopicsChange(response.suggestions);
        } catch (error) {
            console.error("Failed to generate topics:", error);
            toast.error("Failed to generate topics", {
                description:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
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
            {/* Target Audience */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    Who's this blog for?
                </label>
                <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => onTargetAudienceChange(e.target.value)}
                    placeholder="e.g., small business owners, busy moms, startup founders"
                    className="w-full h-11 px-4 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Label */}
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <FileText size={16} className="text-blue-600" />
                What's this blog about?
            </label>

            {/* Textarea with refine button */}
            <div className="relative">
                <AITextPopup
                    textareaRef={topicTextareaRef}
                    value={topic}
                    onChange={onTopicChange}
                />
                <textarea
                    ref={topicTextareaRef}
                    value={topic}
                    onChange={(e) => onTopicChange(e.target.value)}
                    placeholder="e.g., 5 mistakes beginners make that sabotage their weight loss"
                    rows={4}
                    className="w-full px-4 py-3 pb-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {/* Edit with AI — bottom right */}
                <div className="absolute bottom-2 right-2">
                    <button
                        onClick={() => setShowEditPopover(!showEditPopover)}
                        disabled={!topic.trim()}
                        onMouseEnter={() =>
                            !showEditPopover && setShowRefineTooltip(true)
                        }
                        onMouseLeave={() => setShowRefineTooltip(false)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Sparkles size={16} />
                    </button>

                    {/* Tooltip */}
                    {showRefineTooltip && !showEditPopover && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none">
                            <p className="font-semibold">Edit text</p>
                            <p className="text-gray-300 mt-0.5">
                                Modify with AI
                            </p>
                        </div>
                    )}

                    {/* Edit Popover */}
                    {showEditPopover && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-10">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-gray-900">
                                    Edit text
                                </p>
                                <button
                                    onClick={() => {
                                        setShowEditPopover(false);
                                        setEditInstruction("");
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                                Tell AI how to modify your text
                            </p>
                            <textarea
                                value={editInstruction}
                                onChange={(e) =>
                                    setEditInstruction(e.target.value)
                                }
                                placeholder="e.g., make it more specific, focus on beginners, add a number..."
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleEditPrompt();
                                    }
                                }}
                            />
                            <button
                                onClick={handleEditPrompt}
                                disabled={isRefining || !editInstruction.trim()}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isRefining ? (
                                    <>
                                        <Loader2
                                            size={14}
                                            className="animate-spin"
                                        />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} />
                                        Apply
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 min-h-[280px]">
                        {/* Generating Overlay */}
                        {isGenerating && (
                            <GeneratingOverlay
                                title="Finding Topic Ideas"
                                descriptions={[
                                    "Searching trending topics...",
                                    "Analyzing top-performing content...",
                                    "Finding what's working right now...",
                                    "Checking Google trends...",
                                    "Curating the best ideas...",
                                ]}
                            />
                        )}

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
                        {generatedTopics.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 max-h-64 overflow-y-auto">
                                <p className="text-xs font-medium text-gray-500 mb-2">
                                    Click to use:
                                </p>
                                {generatedTopics.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="relative flex items-start gap-2 group"
                                    >
                                        <button
                                            onClick={() =>
                                                handleSelectTopic(
                                                    suggestion.title,
                                                )
                                            }
                                            className="flex-1 text-left text-sm p-3 rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors text-gray-700 border border-transparent hover:border-blue-200"
                                        >
                                            {suggestion.title}
                                        </button>
                                        <button
                                            onMouseEnter={() =>
                                                setHoveredIndex(index)
                                            }
                                            onMouseLeave={() =>
                                                setHoveredIndex(null)
                                            }
                                            className="shrink-0 p-2 text-gray-400 hover:text-gray-600 mt-1"
                                        >
                                            <HelpCircle size={14} />
                                        </button>

                                        {/* Tooltip */}
                                        {hoveredIndex === index && (
                                            <div className="absolute right-8 top-0 z-10 w-52 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                                <p className="font-semibold mb-1">
                                                    Why it works
                                                </p>
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
                    <span className="font-semibold text-blue-600">Tip:</span> Be
                    specific! Instead of "weight loss tips", try "5 mistakes
                    busy moms make when trying to lose weight"
                </p>
            </div>
        </div>
    );
}
