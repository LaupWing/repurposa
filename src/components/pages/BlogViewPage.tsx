/**
 * Blog View Page
 *
 * Single blog view with tabs on top and content below.
 * Blog Post tab shows editor, other tabs show repurpose content.
 */

import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { toast } from 'sonner';
import {
    ChevronLeft,
    PenTool,
    Share2,
    FileText,
    Image,
    Video,
    Save,
    Sparkles,
    X,
    Check,
    Trash2,
    Loader2,
} from 'lucide-react';
import { TiptapEditor } from '../editor/TiptapEditor';
import { RepurposePanel } from '../repurpose/RepurposePanel';
import ImagePickerModal from '../ImagePickerModal';

// ============================================
// TYPES
// ============================================

type ContentTab = 'blog' | 'short' | 'threads' | 'visuals' | 'video';

interface BlogPost {
    id: number;
    title: string;
    content: string;
    thumbnail?: string;
    status: 'draft' | 'generating' | 'completed' | 'published';
    published_post_id?: number | null;
    published_post_url?: string | null;
}

interface BlogViewPageProps {
    postId?: number;
    onBack?: () => void;
}


// ============================================
// SUB-COMPONENTS
// ============================================

function PublishModal({
    isOpen,
    onClose,
    onPublish,
}: {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (publishNow: boolean) => void;
}) {
    const [publishNow, setPublishNow] = useState(true);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Publish to WordPress</h2>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-sm text-gray-600 mb-5">
                        This will publish your blog post to WordPress. Once published, it will be visible on your website.
                    </p>

                    {/* Checkbox */}
                    <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-colors">
                        <div className="relative flex items-center justify-center mt-0.5">
                            <input
                                type="checkbox"
                                checked={publishNow}
                                onChange={(e) => setPublishNow(e.target.checked)}
                                className="sr-only"
                            />
                            <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    publishNow
                                        ? 'bg-[#2271b1] border-[#2271b1]'
                                        : 'border-gray-300 bg-white'
                                }`}
                            >
                                {publishNow && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-900">Publish right away</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Also publish scheduled social media posts immediately
                            </p>
                        </div>
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onPublish(publishNow)}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#2271b1] hover:bg-[#135e96] rounded-lg transition-colors"
                    >
                        Publish
                    </button>
                </div>
            </div>
        </div>
    );
}

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
    onPublished,
}: {
    post: BlogPost;
    isGenerating: boolean;
    onPublished: (postId: number, postUrl: string) => void;
}) {
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [thumbnail, setThumbnail] = useState(post.thumbnail || '');
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const handleAIRequest = (selectedText: string, action: string) => {
        console.log(`AI Action: ${action}`, selectedText);
        alert(`AI ${action} request for: "${selectedText.substring(0, 50)}..."\n\nThis will be connected to your AI backend.`);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiFetch({
                path: `/wbrp/v1/blogs/${post.id}`,
                method: 'PUT',
                data: { title, content, thumbnail },
            });
            toast.success('Draft saved successfully');
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePublish = async (publishNow: boolean) => {
        setIsPublishing(true);
        try {
            // Save latest content first
            await apiFetch({
                path: `/wbrp/v1/blogs/${post.id}`,
                method: 'PUT',
                data: { title, content, thumbnail },
            });

            const response = await apiFetch<{
                success: boolean;
                post_id: number;
                post_url: string;
                updated: boolean;
            }>({
                path: `/wbrp/v1/blogs/${post.id}/publish`,
                method: 'POST',
            });

            onPublished(response.post_id, response.post_url);

            toast.success(
                response.updated
                    ? 'Blog post updated on WordPress.'
                    : 'Blog post published to WordPress!',
            );
        } catch (error) {
            console.error('Failed to publish:', error);
            toast.error('Failed to publish', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsPublishing(false);
            setIsPublishModalOpen(false);
        }
    };

    const handleRemoveThumbnail = () => {
        setThumbnail('');
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    {post.published_post_id ? (
                        <>
                            <span className="text-xs px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-600">
                                Published
                            </span>
                            <a
                                href={post.published_post_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                            >
                                View Post
                            </a>
                            <button
                                onClick={() => setIsPublishModalOpen(true)}
                                disabled={isPublishing}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#2271b1] text-white text-sm font-medium rounded-lg hover:bg-[#135e96] disabled:opacity-50 transition-colors"
                            >
                                {isPublishing ? 'Updating...' : 'Update'}
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-xs px-2 py-0.5 rounded border border-orange-200 bg-orange-50 text-orange-600">
                                Draft
                            </span>
                            <button
                                onClick={() => setIsPublishModalOpen(true)}
                                disabled={isPublishing}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#2271b1] text-white text-sm font-medium rounded-lg hover:bg-[#135e96] disabled:opacity-50 transition-colors"
                            >
                                {isPublishing ? 'Publishing...' : 'Publish'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Publish Modal */}
            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                onPublish={handlePublish}
            />

            {/* Editor Area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-8">
                    {/* Image Picker Modal */}
                    <ImagePickerModal
                        isOpen={isImagePickerOpen}
                        onClose={() => setIsImagePickerOpen(false)}
                        onSelect={setThumbnail}
                        currentImage={thumbnail}
                    />

                    {/* Thumbnail Section */}
                    <div className="mb-6">
                        {thumbnail ? (
                            <div className="relative group rounded-lg overflow-hidden">
                                <img
                                    src={thumbnail}
                                    alt="Blog thumbnail"
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => setIsImagePickerOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-white text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <Image size={16} />
                                        Change
                                    </button>
                                    <button
                                        onClick={handleRemoveThumbnail}
                                        className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsImagePickerOpen(true)}
                                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                            >
                                <Image size={32} className="mx-auto mb-3 text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">Choose Image</span>
                                <p className="text-xs text-gray-400 mt-1">
                                    Select from media library
                                </p>
                            </button>
                        )}
                    </div>

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

export default function BlogViewPage({ postId, onBack }: BlogViewPageProps) {
    const [activeTab, setActiveTab] = useState<ContentTab>('blog');
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch blog from API
    useEffect(() => {
        if (!postId) {
            setIsLoading(false);
            return;
        }

        const fetchBlog = async () => {
            try {
                const response = await apiFetch<{ blog: BlogPost }>({
                    path: `/wbrp/v1/blogs/${postId}`,
                });
                setPost(response.blog);
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

    const tabs = [
        { id: 'blog' as const, label: 'Blog Post', icon: PenTool },
        { id: 'short' as const, label: 'Short Posts', icon: Share2 },
        { id: 'threads' as const, label: 'Threads', icon: FileText },
        { id: 'visuals' as const, label: 'Visuals', icon: Image },
        { id: 'video' as const, label: 'Video', icon: Video },
    ];

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
                        <BlogEditor
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
                        />
                    )}

                    {activeTab === 'short' && (
                        <RepurposePanel initialTab="short" blogContent={post.content} blogId={post.id} isPublished={!!post.published_post_id} />
                    )}

                    {activeTab === 'threads' && (
                        <RepurposePanel initialTab="threads" blogContent={post.content} blogId={post.id} />
                    )}

                    {activeTab === 'visuals' && (
                        <RepurposePanel initialTab="visuals" blogContent={post.content} blogId={post.id} />
                    )}

                    {activeTab === 'video' && (
                        <RepurposePanel initialTab="video" blogContent={post.content} />
                    )}
                </div>
            </div>
        </div>
    );
}
