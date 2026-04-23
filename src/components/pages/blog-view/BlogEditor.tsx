import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { toast } from 'sonner';
import {
    Save,
    Sparkles,
    X,
    Trash2,
    Loader2,
    RefreshCw,
    Plus,
    Image,
    History,
    RotateCcw,
    Clock,
} from 'lucide-react';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import ImagePickerModal from '@/components/ImagePickerModal';
import { updateBlog, getVersions, createVersion, restoreVersion, refineText } from '@/services/blogApi';
import type { BlogPost, PostVersion } from '@/types';
import { PublishModal } from './PublishModal';
import SnelstackBanner from '@/components/SnelstackBanner';
import { useProfileStore } from '@/store/profileStore';
import { apiRequest, getConfig } from '@/services/client';

export function BlogEditor({
    post,
    isGenerating,
    onPublished,
    onRegenerate,
    onSaved,
    onPublishingStateChange,
}: {
    post: BlogPost;
    isGenerating: boolean;
    onPublished: (postId: number, postUrl: string) => void;
    onRegenerate: () => void;
    onSaved?: (title: string, content: string) => void;
    onPublishingStateChange?: (state: 'translating' | 'publishing' | null) => void;
}) {
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const { profile } = useProfileStore();
    const [thumbnail, setThumbnail] = useState(post.thumbnail || '');
    const [savedTitle, setSavedTitle] = useState(post.title);
    const [savedContent, setSavedContent] = useState(post.content);
    const [savedThumbnail, setSavedThumbnail] = useState(post.thumbnail || '');
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const isDirty = title !== savedTitle || content !== savedContent || thumbnail !== savedThumbnail;

    // Version history state
    const [versions, setVersions] = useState<PostVersion[]>([]);
    const [isVersionPopoverOpen, setIsVersionPopoverOpen] = useState(false);
    const [isCreateVersionModalOpen, setIsCreateVersionModalOpen] = useState(false);
    const [restoreTargetId, setRestoreTargetId] = useState<number | null>(null);
    const [isCreatingVersion, setIsCreatingVersion] = useState(false);
    const [restoringVersionId, setRestoringVersionId] = useState<number | null>(null);

    const fetchVersions = async () => {
        try {
            console.log('[Versions] Fetching versions for post', post.id);
            const data = await getVersions(post.id);
            console.log('[Versions] Fetched:', data);
            setVersions(data);
        } catch (error) {
            console.error('Failed to fetch versions:', error);
        }
    };

    useEffect(() => {
        fetchVersions();
    }, [post.id]);

    const handleCreateVersion = async () => {
        setIsCreatingVersion(true);
        try {
            console.log('[Versions] Creating version for post', post.id);
            const created = await createVersion(post.id);
            console.log('[Versions] Created:', created);
            await fetchVersions();
            setIsCreateVersionModalOpen(false);
            toast.success('Version created');
        } catch (error) {
            console.error('Failed to create version:', error);
            toast.error('Failed to create version', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsCreatingVersion(false);
        }
    };

    const handleRestoreVersion = async (versionId: number) => {
        setRestoringVersionId(versionId);
        try {
            console.log('[Versions] Restoring version', versionId, 'for post', post.id);
            const restored = await restoreVersion(post.id, versionId);
            console.log('[Versions] Restored:', restored);
            await fetchVersions();
            setTitle(restored.title);
            setContent(restored.content);
            setSavedTitle(restored.title);
            setSavedContent(restored.content);
            setRestoreTargetId(null);
            toast.success('Version restored');
        } catch (error) {
            console.error('Failed to restore version:', error);
            toast.error('Failed to restore version', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setRestoringVersionId(null);
        }
    };

    const changeTypeLabel = (version: PostVersion, allVersions: PostVersion[]) => {
        switch (version.change_type) {
            case 'initial':
                return 'Initial version';
            case 'manual_edit':
                return 'Manual edit';
            case 'restored': {
                if (version.restored_from_version_id) {
                    const source = allVersions.find(v => v.id === version.restored_from_version_id);
                    if (source) return `Restored from v${source.version_number}`;
                }
                return 'Restored';
            }
            case 'regenerate':
                return 'Regenerated';
            default:
                return version.change_type;
        }
    };

    const formatVersionDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleAIRequest = async (selectedText: string, action: string): Promise<string> => {
        const instructions: Record<string, string> = {
            improve: 'Improve the clarity and quality of this text while keeping the same meaning.',
            rewrite: 'Rewrite this text in a different way while preserving the core message.',
            shorter: 'Make this text more concise without losing the key points.',
            longer: 'Expand this text with more detail and explanation.',
            fix: 'Fix any grammar, spelling, or punctuation errors in this text.',
        };
        const instruction = instructions[action] || action;
        const result = await refineText(selectedText, instruction);
        return result.text;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateBlog(post.id, { title, content, thumbnail });
            setSavedTitle(title);
            setSavedContent(content);
            setSavedThumbnail(thumbnail);
            onSaved?.(title, content);
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
            // Save latest content to Laravel first
            await updateBlog(post.id, { title, content, thumbnail });
            setSavedTitle(title);
            setSavedContent(content);
            setSavedThumbnail(thumbnail);

            const { snelstackLang } = getConfig();
            const contentLang = profile?.content_lang ?? 'en';
            let publishContent = content;

            if (snelstackLang) {
                if (snelstackLang !== contentLang) {
                    // Translate to site default lang, store original in contentTranslations
                    onPublishingStateChange?.('translating');
                    const translated = await apiRequest<{ content: string }>('/translate', {
                        content,
                        target_lang: snelstackLang,
                    });
                    // Inner block = translated (site default lang), contentTranslations = original
                    const translations = JSON.stringify({ [contentLang]: [content] });
                    publishContent = `<!-- wp:snel/content-section {"contentTranslations":${translations}} -->\n<!-- wp:html -->\n${translated.content}\n<!-- /wp:html -->\n<!-- /wp:snel/content-section -->`;
                } else {
                    publishContent = `<!-- wp:snel/content-section -->\n<!-- wp:html -->\n${content}\n<!-- /wp:html -->\n<!-- /wp:snel/content-section -->`;
                }
            }

            // Create/update real WordPress post
            onPublishingStateChange?.('publishing');
            const response = await apiFetch<{
                success: boolean;
                post_id: number;
                post_url: string;
                updated: boolean;
            }>({
                path: `/repurposa/v1/posts/${post.id}/publish`,
                method: 'POST',
                data: { title, content: publishContent, thumbnail },
            });

            // Update status on Laravel
            await updateBlog(post.id, { status: 'published', published_post_id: response.post_id, published_post_url: response.post_url });

            onPublished(response.post_id, response.post_url);
            onSaved?.(title, content);

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
            onPublishingStateChange?.(null);
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
                        disabled={isSaving || !isDirty}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={onRegenerate}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Regenerate
                    </button>

                    {/* Version History */}
                    <div className="relative">
                        <button
                            onClick={() => setIsVersionPopoverOpen(!isVersionPopoverOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            <History size={16} />
                            {versions.length > 0 ? `v${versions[0].version_number}` : 'Versions'}
                        </button>

                        {/* Version Popover */}
                        {isVersionPopoverOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsVersionPopoverOpen(false)} />
                                <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                                    {/* Header */}
                                    <div className="px-4 py-3 border-b border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-900">Version History</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Snapshots of your blog content</p>
                                    </div>

                                    {/* Version List */}
                                    <div className="max-h-64 overflow-y-auto">
                                        {versions.length === 0 ? (
                                            <div className="px-4 py-6 text-center">
                                                <Clock size={20} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-xs text-gray-500">No versions yet</p>
                                            </div>
                                        ) : (
                                            versions.map((version, index) => {
                                                const isCurrent = index === 0;
                                                return (
                                                    <div
                                                        key={version.id}
                                                        className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${isCurrent ? 'bg-green-50/50' : ''}`}
                                                    >
                                                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-gray-900">v{version.version_number}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                                                    {changeTypeLabel(version, versions)}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{version.title}</p>
                                                            <p className="text-[10px] text-gray-400 mt-0.5">{formatVersionDate(version.created_at)}</p>
                                                        </div>
                                                        {!isCurrent && (
                                                            <button
                                                                onClick={() => {
                                                                    setRestoreTargetId(version.id);
                                                                    setIsVersionPopoverOpen(false);
                                                                }}
                                                                className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                                            >
                                                                <RotateCcw size={12} />
                                                                Restore
                                                            </button>
                                                        )}
                                                        {isCurrent && (
                                                            <span className="shrink-0 text-[10px] font-medium text-green-600 px-2 py-1">Current</span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                                        <button
                                            onClick={() => {
                                                setIsCreateVersionModalOpen(true);
                                                setIsVersionPopoverOpen(false);
                                            }}
                                            className="flex items-center gap-2 w-full justify-center px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                        >
                                            <Plus size={14} />
                                            New Version
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
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
                            <SnelstackBanner compact contentLang={profile?.content_lang ?? 'en'} />
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
                            <SnelstackBanner compact contentLang={profile?.content_lang ?? 'en'} />
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

            {/* Create Version Modal */}
            {isCreateVersionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !isCreatingVersion && setIsCreateVersionModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Create New Version</h2>
                            <button
                                onClick={() => setIsCreateVersionModalOpen(false)}
                                disabled={isCreatingVersion}
                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-600">
                                This will snapshot your current content as a new version. You can restore to this version at any time.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setIsCreateVersionModalOpen(false)}
                                disabled={isCreatingVersion}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateVersion}
                                disabled={isCreatingVersion}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {isCreatingVersion && <Loader2 size={14} className="animate-spin" />}
                                {isCreatingVersion ? 'Creating...' : 'Create Version'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Version Modal */}
            {restoreTargetId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !restoringVersionId && setRestoreTargetId(null)} />
                    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Restore Version</h2>
                            <button
                                onClick={() => setRestoreTargetId(null)}
                                disabled={!!restoringVersionId}
                                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 py-5">
                            <p className="text-sm text-gray-600">
                                This will create a new version with the content from the selected version. Your current content won't be lost — it's preserved in the version history.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setRestoreTargetId(null)}
                                disabled={!!restoringVersionId}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRestoreVersion(restoreTargetId)}
                                disabled={!!restoringVersionId}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {restoringVersionId && <Loader2 size={14} className="animate-spin" />}
                                {restoringVersionId ? 'Restoring...' : 'Restore'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
