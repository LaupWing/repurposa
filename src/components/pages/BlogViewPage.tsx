/**
 * Blog View Page
 *
 * Single blog view with tabs on top and content below.
 * Blog Post tab shows editor, other tabs show repurpose content.
 */

import { useState, useEffect } from '@wordpress/element';
import { toast } from 'sonner';
import {
    ChevronLeft,
    PenTool,
    Share2,
    FileText,
    Image,
    Video,
    Settings,
} from 'lucide-react';
import { RepurposePanel } from '@/components/repurpose/RepurposePanel';
import { getBlog } from '@/services/blogApi';
import type { BlogPost } from '@/types';
import type { ContentTab, BlogViewPageProps } from '@/components/blog-view/types';
import { BlogEditor } from '@/components/blog-view/BlogEditor';
import { RegenerateModal } from '@/components/blog-view/RegenerateModal';
import { SettingsPanel } from '@/components/blog-view/SettingsPanel';
import { TabButton } from '@/components/blog-view/TabButton';
import { DisabledTabsOverlay } from '@/components/blog-view/DisabledTabsOverlay';

export default function BlogViewPage({ postId, onBack }: BlogViewPageProps) {
    // Read short_post_id from URL for deep-linking from schedule queue
    const urlParams = new URLSearchParams(window.location.search);
    const shortPostId = urlParams.get('short_post_id') ? parseInt(urlParams.get('short_post_id')!, 10) : undefined;

    const [activeTab, setActiveTab] = useState<ContentTab>(shortPostId ? 'short' : 'blog');
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [editorKey, setEditorKey] = useState(0);
    const [highlightVisualId, setHighlightVisualId] = useState<number | null>(null);

    // Fetch blog from API
    useEffect(() => {
        if (!postId) {
            setIsLoading(false);
            return;
        }

        const fetchBlog = async () => {
            try {
                const blog = await getBlog(postId);
                setPost(blog);
            } catch (error) {
                console.error('Failed to fetch blog:', error);
                toast.error('Failed to load blog');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlog();
    }, [postId]);

    // Navigation back to blogs list
    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            window.location.href = 'admin.php?page=blog-repurpose-blogs';
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="h-[calc(100vh-100px)] flex items-center justify-center p-4">
                <div className="text-gray-500">Loading blog...</div>
            </div>
        );
    }

    // No post found
    if (!post) {
        return (
            <div className="h-[calc(100vh-100px)] flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Blog not found</h2>
                    <p className="text-sm text-gray-500 mb-4">This blog may have been deleted.</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Blogs
                    </button>
                </div>
            </div>
        );
    }

    // Blog needs a title or content before repurpose tabs are usable
    const hasContent = !!(post.title?.trim() || post.content?.replace(/<[^>]*>/g, '').trim());

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
                        {/* Blog Post tab — always enabled */}
                        <TabButton
                            active={activeTab === 'blog'}
                            onClick={() => setActiveTab('blog')}
                            icon={PenTool}
                            label="Blog Post"
                        />

                        {/* Repurpose tabs — wrapped with overlay when no content */}
                        <div className="relative flex items-center gap-1">
                            {!hasContent && <DisabledTabsOverlay />}
                            {tabs.filter(t => t.id !== 'blog').map((tab) => (
                                <TabButton
                                    key={tab.id}
                                    active={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    icon={tab.icon}
                                    label={tab.label}
                                    badge={tab.id === 'video' ? 'Soon' : undefined}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Settings gear icon */}
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`ml-auto flex items-center justify-center h-8 w-8 rounded transition-colors ${
                            activeTab === 'settings'
                                ? 'text-gray-900 bg-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                        }`}
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                </div>

                {/* Content Area - Connected to tabs above */}
                <div className="flex-1 min-h-0 overflow-hidden">
                    {/* Empty blog guard for repurpose tabs */}
                    {!hasContent && activeTab !== 'blog' && activeTab !== 'settings' && (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <PenTool size={24} className="text-gray-400" />
                            </div>
                            <h3 className="text-base font-semibold text-gray-900 mb-1">Write your blog first</h3>
                            <p className="text-sm text-gray-500 max-w-xs mb-4">
                                Add a title and some content to your blog post before repurposing it into short posts, threads, or other formats.
                            </p>
                            <button
                                onClick={() => setActiveTab('blog')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <PenTool size={16} />
                                Go to Editor
                            </button>
                        </div>
                    )}

                    {activeTab === 'blog' && (
                        <BlogEditor
                            key={editorKey}
                            post={post}
                            isGenerating={false}
                            onPublished={(publishedPostId, publishedPostUrl) => {
                                setPost(prev => prev ? {
                                    ...prev,
                                    status: 'published',
                                    published_post_id: publishedPostId,
                                    published_post_url: publishedPostUrl,
                                } : prev);
                            }}
                            onSaved={(title, content) => {
                                setPost(prev => prev ? { ...prev, title, content } : prev);
                            }}
                            onRegenerate={() => setIsRegenerateModalOpen(true)}
                        />
                    )}

                    {/* Regenerate Modal */}
                    {isRegenerateModalOpen && (
                        <RegenerateModal
                            onClose={() => setIsRegenerateModalOpen(false)}
                            post={post}
                            onRegenerated={(title, content) => {
                                setPost(prev => prev ? { ...prev, title, content } : prev);
                                setEditorKey(k => k + 1);
                                setIsRegenerateModalOpen(false);
                            }}
                        />
                    )}

                    {activeTab !== 'blog' && activeTab !== 'settings' && (
                        <RepurposePanel
                            initialTab={activeTab}
                            blogContent={post.content}
                            blogId={post.id}
                            isPublished={!!post.published_post_id}
                            publishedPostUrl={post.published_post_url}
                            editShortPostId={shortPostId}
                            onSwitchTab={setActiveTab}
                            onVisualCreated={(visual) => {
                                setPost(prev => prev ? { ...prev, visuals: [...(prev.visuals || []), visual] } : prev);
                                setHighlightVisualId(visual.id);
                            }}
                            onThreadsGenerated={(threads) => {
                                setPost(prev => prev ? { ...prev, threads } : prev);
                            }}
                            onShortPostsGenerated={(shortPosts) => {
                                setPost(prev => prev ? { ...prev, short_posts: shortPosts } : prev);
                            }}
                            onHighlightVisual={setHighlightVisualId}
                            initialHighlightVisualId={highlightVisualId}
                            initialShortPosts={post.short_posts}
                            initialThreads={post.threads}
                            initialVisuals={post.visuals}
                        />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsPanel
                            post={post}
                            onDeleted={handleBack}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
