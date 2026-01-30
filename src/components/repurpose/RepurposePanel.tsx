/**
 * Repurpose Panel Component
 *
 * Panel for generating tweets, threads, visuals from blog content.
 */

import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
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
    AlertTriangle,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateTweets } from '../../services/api';
import { GeneratingOverlay } from '../GeneratingOverlay';

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

interface SavedTweet {
    id: number;
    content: string;
    inspiration_id: string;
    inspiration_content: string;
    inspiration_hook: string;
    emotions: string[];
    structure: string;
    why_it_works: string;
}

// ============================================
// SAMPLE DATA (threads - placeholder until API)
// ============================================

const sampleThreads: Thread[] = [];

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
    isPublished,
}: {
    type: TabType;
    onGenerate: () => void;
    isGenerating: boolean;
    isPublished?: boolean;
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
            <p className="mb-4 max-w-[240px] text-sm text-gray-500">
                Generate optimized {title.toLowerCase()} from your blog post content.
            </p>
            {!isPublished && type === 'short' && (
                <p className="mb-4 max-w-[280px] text-xs text-amber-600">
                    Tip: Publish your blog first to create tweets with effective CTAs that link back to your post.
                </p>
            )}
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

function ConfirmGenerateModal({
    isOpen,
    onClose,
    onConfirm,
    isPublished,
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (includeCta: boolean) => void;
    isPublished?: boolean;
}) {
    const [includeCta, setIncludeCta] = useState(!!isPublished);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Generate Tweets</h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    {/* CTA Checkbox */}
                    <label
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isPublished
                                ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                                : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                    >
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={includeCta}
                                onChange={(e) => setIncludeCta(e.target.checked)}
                                disabled={!isPublished}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    includeCta && isPublished
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'border-gray-300 bg-white'
                                }`}
                            >
                                {includeCta && isPublished && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900">Include CTA to blog post</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Add a call-to-action linking back to your published blog.
                            </p>
                        </div>
                    </label>

                    {/* Warning if not published */}
                    {!isPublished && (
                        <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">
                                Publish your blog first to enable CTAs that link back to your post.
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(includeCta && !!isPublished)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Generate Tweets
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface RepurposePanelProps {
    initialTab?: TabType;
    blogContent?: string;
    blogId?: number;
    isPublished?: boolean;
    publishedPostUrl?: string | null;
}

export function RepurposePanel({ initialTab = 'short', blogContent, blogId, isPublished, publishedPostUrl }: RepurposePanelProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [tweets, setTweets] = useState<TweetPattern[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Load saved tweets on mount
    useEffect(() => {
        if (!blogId) return;

        const loadTweets = async () => {
            setIsLoading(true);
            try {
                const response = await apiFetch<{ tweets: SavedTweet[] }>({
                    path: `/wbrp/v1/blogs/${blogId}/tweets`,
                });
                const patterns: TweetPattern[] = response.tweets.map((t) => ({
                    id: t.id,
                    content: t.content,
                    emotions: t.emotions,
                    structure: t.structure,
                    why_it_works: t.why_it_works,
                }));
                setTweets(patterns);
            } catch (error) {
                console.error('Failed to load tweets:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadTweets();
    }, [blogId]);

    const onGenerateClick = () => {
        setShowConfirmModal(true);
    };

    const handleGenerateTweets = async (includeCta: boolean = false) => {
        setShowConfirmModal(false);

        if (!blogContent) {
            toast.error('No blog content available to repurpose.');
            return;
        }

        setIsGenerating(true);

        try {
            const ctaLink = includeCta && publishedPostUrl ? publishedPostUrl : undefined;
            const response = await generateTweets(blogContent, ctaLink);

            const patterns: TweetPattern[] = response.tweets.map((tweet) => ({
                id: tweet.inspiration.id,
                content: tweet.generated_tweet,
                emotions: tweet.inspiration.emotions,
                structure: tweet.inspiration.structure,
                why_it_works: tweet.inspiration.why_it_works,
            }));

            setTweets(patterns);

            // Save to WordPress
            if (blogId) {
                await apiFetch({
                    path: `/wbrp/v1/blogs/${blogId}/tweets`,
                    method: 'POST',
                    data: {
                        tweets: response.tweets.map((tweet) => ({
                            content: tweet.generated_tweet,
                            inspiration_id: tweet.inspiration.id,
                            inspiration_content: tweet.inspiration.content,
                            inspiration_hook: tweet.inspiration.hook,
                            emotions: tweet.inspiration.emotions,
                            structure: tweet.inspiration.structure,
                            why_it_works: tweet.inspiration.why_it_works,
                        })),
                    },
                });
            }
        } catch (error) {
            console.error('Failed to generate tweets:', error);
            toast.error('Failed to generate tweets', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Show content based on initialTab (parent controls the tab)
    const renderContent = () => {
        switch (initialTab) {
            case 'short':
                return tweets.length === 0 ? (
                    <EmptyState type="short" onGenerate={onGenerateClick} isGenerating={isGenerating} isPublished={isPublished} />
                ) : (
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-500" style={{ margin: 0 }}>Generated Tweets</h3>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                {tweets.length} tweets
                            </span>
                        </div>
                        <div className="pl-2">
                            {tweets.map((pattern, index) => (
                                <TweetCard key={pattern.id} pattern={pattern} index={index} />
                            ))}
                        </div>
                    </div>
                );

            case 'threads':
                return sampleThreads.length === 0 ? (
                    <EmptyState type="threads" onGenerate={() => {}} isGenerating={false} />
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
                return <EmptyState type="visuals" onGenerate={() => {}} isGenerating={false} />;

            case 'video':
                return <EmptyState type="video" onGenerate={() => {}} isGenerating={false} />;

            default:
                return null;
        }
    };

    return (
        <div className="relative flex h-full flex-col bg-white">
            {isGenerating && (
                <GeneratingOverlay
                    title="Generating Tweets"
                    description="Analyzing your blog content and crafting engaging tweets..."
                />
            )}
            <ConfirmGenerateModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleGenerateTweets}
                isPublished={isPublished}
            />
            {/* Content - No internal tabs, parent controls which content to show */}
            <div className="flex-1 overflow-y-auto p-6">
                {renderContent()}
            </div>
        </div>
    );
}
