/**
 * Repurpose Panel Component
 *
 * Panel for generating tweets, threads, visuals from blog content.
 */

import { useState } from '@wordpress/element';
import {
    Share2,
    FileText,
    Image,
    Video,
    Sparkles,
    Copy,
    Check,
    Lightbulb,
    Layout,
    Calendar,
    Pencil,
    ImagePlus,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type TabType = 'short' | 'threads' | 'visuals' | 'video';

interface TweetPattern {
    id: number;
    content: string;
    emotions: string[];
    structure: string;
    why_it_works: string;
}

interface Thread {
    id: string;
    tweets: { id: string; content: string; characterCount: number }[];
}

// ============================================
// SAMPLE DATA
// ============================================

const samplePatterns: TweetPattern[] = [
    {
        id: 1,
        content: "Most people think weight loss is about willpower.\n\nIt's not.\n\nIt's about systems.\n\nHere's what actually works:",
        emotions: ['Confident', 'Contrarian'],
        structure: 'Myth-busting opener',
        why_it_works: 'Challenges common belief and promises insider knowledge',
    },
    {
        id: 2,
        content: "I spent 6 months trying every diet.\n\nHere's the one thing they all got wrong:\n\nThey focused on restriction, not addition.",
        emotions: ['Honest', 'Reflective'],
        structure: 'Personal story + insight',
        why_it_works: 'Builds trust through vulnerability and lived experience',
    },
    {
        id: 3,
        content: "Stop counting calories.\n\nStart counting habits.\n\nThe scale will follow.",
        emotions: ['Motivational', 'Provocative'],
        structure: 'Pattern interrupt',
        why_it_works: 'Simple, memorable, and actionable advice',
    },
];

const sampleThreads: Thread[] = [
    {
        id: '1',
        tweets: [
            {
                id: 't1',
                content: "I've lost 30 pounds in 6 months without giving up pizza.\n\nHere's exactly how I did it:\n\n(A thread) 🧵",
                characterCount: 112,
            },
            {
                id: 't2',
                content: "1/ First, I stopped treating food as the enemy.\n\nDiets fail because they're built on restriction.\n\nI built mine on addition.",
                characterCount: 128,
            },
            {
                id: 't3',
                content: "2/ I added:\n- More protein at breakfast\n- A 10-min walk after meals\n- One glass of water before eating\n\nSmall additions. Big results.",
                characterCount: 146,
            },
        ],
    },
];

// ============================================
// EMOTION COLORS
// ============================================

const emotionColors: Record<string, string> = {
    Confident: 'bg-blue-100 text-blue-700 border-blue-200',
    Calm: 'bg-teal-100 text-teal-700 border-teal-200',
    Motivational: 'bg-orange-100 text-orange-700 border-orange-200',
    Provocative: 'bg-red-100 text-red-700 border-red-200',
    Honest: 'bg-slate-100 text-slate-700 border-slate-200',
    Reflective: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Contrarian: 'bg-violet-100 text-violet-700 border-violet-200',
    Educational: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// ============================================
// SUB-COMPONENTS
// ============================================

function TweetCard({ pattern, index }: { pattern: TweetPattern; index: number }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(pattern.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group relative mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
            {/* Pattern number */}
            <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white shadow-sm">
                {index + 1}
            </div>

            {/* Emotions */}
            <div className="mt-1 mb-3 flex flex-wrap items-center gap-1.5">
                {pattern.emotions.map((emotion) => (
                    <span
                        key={emotion}
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            emotionColors[emotion] || 'border-gray-200 bg-gray-100 text-gray-600'
                        }`}
                    >
                        {emotion}
                    </span>
                ))}
            </div>

            {/* Content */}
            <div className="mb-3">
                {pattern.content.split('\n').map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed text-gray-800">
                        {line || <span className="block h-2" />}
                    </p>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                {/* Left - Info tooltips */}
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                        <Lightbulb size={14} />
                        Why it works
                    </button>
                    <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                        <Layout size={14} />
                        Structure
                    </button>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className={`h-7 w-7 flex items-center justify-center rounded hover:bg-gray-100 ${
                            copied ? 'text-green-500' : 'text-gray-400'
                        }`}
                    >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Pencil size={14} />
                    </button>
                    <button className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <ImagePlus size={14} />
                    </button>
                    <button className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                        <Calendar size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function ThreadCard({ thread, index }: { thread: Thread; index: number }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyAll = () => {
        const fullThread = thread.tweets.map((t) => t.content).join('\n\n---\n\n');
        navigator.clipboard.writeText(fullThread);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const totalChars = thread.tweets.reduce((sum, t) => sum + t.characterCount, 0);

    return (
        <div className="mb-3 rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50"
            >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                    {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {thread.tweets.length} posts
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {totalChars} chars
                        </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-gray-800 whitespace-pre-wrap">
                        {thread.tweets[0]?.content}
                    </p>
                </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="flex items-center justify-between py-2">
                        <span className="text-xs text-gray-500">{totalChars} total characters</span>
                        <button
                            onClick={handleCopyAll}
                            className={`text-xs flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 ${
                                copied ? 'text-green-500' : 'text-gray-500'
                            }`}
                        >
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                            {copied ? 'Copied!' : 'Copy All'}
                        </button>
                    </div>

                    <div className="relative mt-2">
                        {thread.tweets.map((tweet, idx) => (
                            <div key={tweet.id} className="relative pb-4 pl-8 last:pb-0">
                                {/* Thread line */}
                                {idx < thread.tweets.length - 1 && (
                                    <div className="absolute top-6 left-[11px] h-[calc(100%-12px)] w-[2px] bg-gray-200" />
                                )}
                                {/* Number dot */}
                                <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-500">
                                    {idx + 1}
                                </div>
                                {/* Content */}
                                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
                                        {tweet.content}
                                    </p>
                                    <div className="mt-2 border-t border-gray-100 pt-2">
                                        <span
                                            className={`font-mono text-[10px] ${
                                                tweet.characterCount > 280 ? 'text-red-500' : 'text-gray-400'
                                            }`}
                                        >
                                            {tweet.characterCount}/280
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({
    type,
    onGenerate,
    isGenerating,
}: {
    type: TabType;
    onGenerate: () => void;
    isGenerating: boolean;
}) {
    const config = {
        short: { title: 'Short Posts', button: 'Generate Tweets', icon: Share2 },
        threads: { title: 'Threads', button: 'Generate Threads', icon: FileText },
        visuals: { title: 'Visuals', button: 'Generate Visuals', icon: Image },
        video: { title: 'Video Scripts', button: 'Generate Scripts', icon: Video },
    };

    const { title, button, icon: Icon } = config[type];

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
            <div className="mb-4 h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                <Icon size={20} className="text-gray-400" />
            </div>
            <h3 className="mb-1 font-medium text-gray-900">No {title} Yet</h3>
            <p className="mb-6 max-w-[200px] text-sm text-gray-500">
                Generate optimized {title.toLowerCase()} from your blog post content.
            </p>
            <button
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
                <Sparkles size={16} />
                {isGenerating ? 'Generating...' : button}
            </button>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface RepurposePanelProps {
    initialTab?: TabType;
    blogContent?: string;
}

export function RepurposePanel({ initialTab = 'short', blogContent }: RepurposePanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setHasGenerated(true);
        setIsGenerating(false);
    };

    // Show content based on initialTab (parent controls the tab)
    const renderContent = () => {
        switch (initialTab) {
            case 'short':
                return !hasGenerated ? (
                    <EmptyState type="short" onGenerate={handleGenerate} isGenerating={isGenerating} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Selected Patterns</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {samplePatterns.length} patterns
                            </span>
                        </div>
                        <div className="pl-2">
                            {samplePatterns.map((pattern, index) => (
                                <TweetCard key={pattern.id} pattern={pattern} index={index} />
                            ))}
                        </div>
                    </div>
                );

            case 'threads':
                return !hasGenerated ? (
                    <EmptyState type="threads" onGenerate={handleGenerate} isGenerating={isGenerating} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500">Thread Variations</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {sampleThreads.length} generated
                            </span>
                        </div>
                        {sampleThreads.map((thread, index) => (
                            <ThreadCard key={thread.id} thread={thread} index={index} />
                        ))}
                    </div>
                );

            case 'visuals':
                return <EmptyState type="visuals" onGenerate={handleGenerate} isGenerating={isGenerating} />;

            case 'video':
                return <EmptyState type="video" onGenerate={handleGenerate} isGenerating={isGenerating} />;

            default:
                return null;
        }
    };

    return (
        <div className="flex h-full flex-col bg-white">
            {/* Content - No internal tabs, parent controls which content to show */}
            <div className="flex-1 overflow-y-auto p-6">
                {renderContent()}
            </div>
        </div>
    );
}
