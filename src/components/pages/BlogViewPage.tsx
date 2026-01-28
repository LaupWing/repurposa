/**
 * Blog View Page
 *
 * Single blog view with tabs on top and content below.
 * Blog Post tab shows editor, other tabs show repurpose content.
 */

import { useState } from '@wordpress/element';
import {
    ChevronLeft,
    PenTool,
    Share2,
    FileText,
    Image,
    Video,
    Save,
    Eye,
    MoreHorizontal,
    History,
    Sparkles,
} from 'lucide-react';
import { TiptapEditor } from '../editor/TiptapEditor';
import { RepurposePanel } from '../repurpose/RepurposePanel';

// ============================================
// TYPES
// ============================================

type ContentTab = 'blog' | 'short' | 'threads' | 'visuals' | 'video';

interface BlogPost {
    id: number;
    title: string;
    content: string;
    status: 'draft' | 'generating' | 'completed' | 'published';
}

interface BlogViewPageProps {
    postId?: number;
    onBack?: () => void;
}

// ============================================
// MOCK DATA
// ============================================

const mockPost: BlogPost = {
    id: 1,
    title: '5 Mistakes Beginners Make When Trying to Lose Weight',
    content: `
<h2>Introduction</h2>
<p>Most people start their weight loss journey with the best intentions, but quickly fall into common traps that sabotage their progress. After helping hundreds of clients reach their goals, I've identified the five most common mistakes—and how to avoid them.</p>

<h2>Mistake #1: Going Too Hard, Too Fast</h2>
<p>The biggest mistake I see is trying to change everything at once. People wake up on Monday morning, throw out all their "bad" food, sign up for a gym, and commit to working out 6 days a week.</p>

<p>By Wednesday, they're exhausted. By Friday, they've given up.</p>

<h2>Mistake #2: Focusing Only on the Scale</h2>
<p>The scale is just one measurement—and not even the most important one. Body composition, energy levels, sleep quality, and how your clothes fit are all better indicators of progress.</p>

<h2>Mistake #3: Cutting Out Entire Food Groups</h2>
<p>Unless you have a medical reason, there's no need to completely eliminate carbs, fats, or any food group. Sustainable weight loss comes from balance, not restriction.</p>

<h2>The Better Approach</h2>
<p>Instead of dramatic changes, focus on small, consistent improvements. Add one healthy habit per week. Build momentum. Create systems that support your goals.</p>

<p>Remember: the best diet is the one you can actually stick to.</p>
`,
    status: 'completed',
};

// ============================================
// SUB-COMPONENTS
// ============================================

function TabButton({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
        >
            <Icon size={16} />
            {label}
        </button>
    );
}

function BlogEditor({
    post,
    isGenerating,
}: {
    post: BlogPost;
    isGenerating: boolean;
}) {
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);

    const handleAIRequest = (selectedText: string, action: string) => {
        console.log(`AI Action: ${action}`, selectedText);
        alert(`AI ${action} request for: "${selectedText.substring(0, 50)}..."\n\nThis will be connected to your AI backend.`);
    };

    if (isGenerating) {
        return (
            <div className="flex h-full flex-col items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4 p-8">
                    <div className="relative">
                        <Sparkles className="h-12 w-12 animate-pulse text-blue-500" />
                        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-2 border-blue-500/30" />
                    </div>
                    <div className="text-center">
                        <h2 className="mb-2 text-xl font-semibold text-gray-900">
                            Generating your blog...
                        </h2>
                        <p className="max-w-md text-sm text-gray-500">
                            Our AI is crafting your blog post. This may take a moment.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col min-h-0 bg-white">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-600">
                        Draft
                    </span>
                    <span className="text-sm text-gray-400">Auto-saved</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
                        <History size={16} />
                        <span className="text-xs">Version 1</span>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <button className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        <Eye size={16} />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
                        <MoreHorizontal size={16} />
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        <Save size={16} />
                        Save
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    {/* Title Input */}
                    <textarea
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Blog title..."
                        rows={1}
                        style={{
                            width: '100%',
                            marginBottom: '1.5rem',
                            padding: '0.5rem 0',
                            border: 'none',
                            borderBottom: '2px solid transparent',
                            borderRadius: 0,
                            backgroundColor: 'transparent',
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: '#111827',
                            outline: 'none',
                            boxShadow: 'none',
                            resize: 'none',
                            overflow: 'hidden',
                            lineHeight: 1.3,
                            transition: 'border-color 0.2s',
                            fieldSizing: 'content',
                        } as React.CSSProperties}
                        onFocus={(e) => e.target.style.borderBottomColor = '#2271b1'}
                        onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                    />

                    {/* TipTap Editor */}
                    <TiptapEditor
                        content={content}
                        onUpdate={setContent}
                        onAIRequest={handleAIRequest}
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BlogViewPage({ onBack }: BlogViewPageProps) {
    const [activeTab, setActiveTab] = useState<ContentTab>('blog');
    const [post] = useState<BlogPost>(mockPost);
    const [isGenerating] = useState(false);

    // Navigation back to blogs list
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            window.location.href = 'admin.php?page=blog-repurpose-blogs';
        }
    };

    const tabs = [
        { id: 'blog' as const, label: 'Blog Post', icon: PenTool },
        { id: 'short' as const, label: 'Short Posts', icon: Share2 },
        { id: 'threads' as const, label: 'Threads', icon: FileText },
        { id: 'visuals' as const, label: 'Visuals', icon: Image },
        { id: 'video' as const, label: 'Video', icon: Video },
    ];

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col overflow-hidden p-4">
            {/* Card container - tabs and content connected */}
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header with Back + Tabs */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
                    {/* Back button */}
                    <button
                        onClick={handleBack}
                        className="group flex items-center h-8 px-2 rounded text-gray-400 hover:text-gray-600 hover:bg-white transition-all"
                    >
                        <ChevronLeft size={16} />
                        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm group-hover:max-w-10 group-hover:ml-1 transition-all duration-200">
                            Back
                        </span>
                    </button>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 ml-2 p-1 bg-gray-100 rounded-lg">
                        {tabs.map((tab) => (
                            <TabButton
                                key={tab.id}
                                active={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                icon={tab.icon}
                                label={tab.label}
                            />
                        ))}
                    </div>
                </div>

                {/* Content Area - Connected to tabs above */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {activeTab === 'blog' && (
                        <BlogEditor post={post} isGenerating={isGenerating} />
                    )}

                    {activeTab === 'short' && (
                        <RepurposePanel initialTab="short" blogContent={post.content} />
                    )}

                    {activeTab === 'threads' && (
                        <RepurposePanel initialTab="threads" blogContent={post.content} />
                    )}

                    {activeTab === 'visuals' && (
                        <RepurposePanel initialTab="visuals" blogContent={post.content} />
                    )}

                    {activeTab === 'video' && (
                        <RepurposePanel initialTab="video" blogContent={post.content} />
                    )}
                </div>
            </div>
        </div>
    );
}
