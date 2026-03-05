import { useState, useEffect, useRef } from '@wordpress/element';
import {
    Check,
    AlertTriangle,
    X,
    Send,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Tooltip } from '@wordpress/components';
import { getSocialAccounts } from '@/services/profileApi';
import { publishNow } from '@/services/scheduleApi';
import { renderVisual } from '@/services/repurposeApi';
import type { SocialAccount, ShortPostSchedule, Visual } from '@/types';
import type { ShortPostPattern } from '@/components/repurpose/cards/ShortPostCard';
import { VisualPreview, GRADIENT_PRESETS } from './VisualPreviewModal';
import {
    type SchedulePlatform,
    type ScheduleContentType,
    SCHEDULE_PLATFORMS,
    API_TO_UI_PLATFORM,
    UI_TO_API_PLATFORM,
    getUnsupportedReason,
} from './schedule-utils';

interface PublishNowModalProps {
    isOpen: boolean;
    post: ShortPostPattern | null;
    contentType?: ScheduleContentType;
    visual?: Visual | null;
    onClose: () => void;
    onPublished?: (publishedPosts: ShortPostSchedule[]) => void;
}

export default function PublishNowModal({
    isOpen,
    post,
    contentType = 'short_post',
    visual,
    onClose,
    onPublished,
}: PublishNowModalProps) {
    const [selectedPlatforms, setSelectedPlatforms] = useState<SchedulePlatform[]>([]);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedPlatforms([]);
        setIsPublishing(false);

        setLoading(true);
        getSocialAccounts()
            .then((accounts) => {
                setSocialAccounts(accounts);
                const connected = accounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);
                const firstSupported = connected.find((id) => !getUnsupportedReason(id, contentType));
                if (firstSupported) setSelectedPlatforms([firstSupported]);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [isOpen, contentType]);

    if (!isOpen || !post) return null;

    const connectedPlatformIds = socialAccounts.map((a) => API_TO_UI_PLATFORM[a.platform]).filter(Boolean);

    // Computed visual data for offscreen rendering
    const visualSlides = visual ? (Array.isArray(visual.content) ? visual.content : [visual.content]) : [];
    const gradientPreset = visual ? (GRADIENT_PRESETS.find(g => g.id === visual.settings.gradient_id) || GRADIENT_PRESETS[0]) : GRADIENT_PRESETS[0];

    // Check which platforms this content was already published to
    const getPublishedInfo = (platformId: SchedulePlatform): ShortPostSchedule | undefined => {
        const apiPlatform = UI_TO_API_PLATFORM[platformId];
        return post.scheduled_posts?.find((sp) => sp.platform === apiPlatform && sp.status === 'published');
    };

    const togglePlatform = (id: SchedulePlatform) => {
        const unsupported = getUnsupportedReason(id, contentType);
        if (unsupported) return;
        if (!connectedPlatformIds.includes(id)) {
            const name = SCHEDULE_PLATFORMS.find((p) => p.id === id)?.name || id;
            toast.error(`Connect ${name} first`, {
                description: 'Go to Settings → Connected Accounts to link your account.',
            });
            return;
        }
        setSelectedPlatforms((prev) => {
            if (prev.includes(id)) {
                if (prev.length === 1) return prev;
                return prev.filter((p) => p !== id);
            }
            return [...prev, id];
        });
    };

    const handlePublish = async () => {
        if (selectedPlatforms.length === 0) return;
        setIsPublishing(true);

        try {
            // For visuals: capture offscreen slides as PNGs and upload before publishing
            if (contentType === 'visual' && visual) {
                const blobs: Blob[] = [];
                for (let i = 0; i < slideRefs.current.length; i++) {
                    const el = slideRefs.current[i];
                    if (!el) continue;
                    const dataUrl = await toPng(el, { quality: 1, pixelRatio: 2 });
                    const res = await fetch(dataUrl);
                    blobs.push(await res.blob());
                }
                if (blobs.length === 0) {
                    throw new Error('Failed to render visual slides');
                }
                await renderVisual(visual.id, blobs);
            }

            const accountIds = selectedPlatforms
                .map((platformId) => {
                    const apiPlatform = UI_TO_API_PLATFORM[platformId];
                    return socialAccounts.find((a) => a.platform === apiPlatform)?.id;
                })
                .filter((id): id is number => id !== undefined);

            if (accountIds.length === 0) {
                toast.error('No connected accounts for selected platforms');
                return;
            }

            const response = await publishNow({
                social_account_ids: accountIds,
                schedulable_type: contentType,
                schedulable_id: post.id,
            });

            const succeeded = response.results.filter((r) => r.status === 'published');
            const failed = response.results.filter((r) => r.status === 'failed');

            if (succeeded.length > 0) {
                const names = succeeded.map((r) => {
                    const uiId = API_TO_UI_PLATFORM[r.platform] || r.platform;
                    return SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.name || r.platform;
                }).join(', ');
                toast.success('Published!', { description: names });
            }
            if (failed.length > 0) {
                const names = failed.map((r) => {
                    const uiId = API_TO_UI_PLATFORM[r.platform] || r.platform;
                    return SCHEDULE_PLATFORMS.find((p) => p.id === uiId)?.name || r.platform;
                }).join(', ');
                toast.error(`Failed on ${names}`, { description: failed[0].error || 'Please try again.' });
            }

            if (succeeded.length > 0) {
                onPublished?.(succeeded.map((r) => ({
                    id: 0, // not returned from publish API
                    platform: r.platform,
                    status: 'published' as const,
                    scheduled_at: new Date().toISOString(),
                })));
            }

            onClose();
        } catch (error) {
            toast.error('Failed to publish', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Offscreen visual slide rendering for PNG capture */}
            {visual && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    {visualSlides.map((text, i) => (
                        <div key={i} ref={(el) => { slideRefs.current[i] = el; }}>
                            <VisualPreview
                                content={text}
                                displayName={visual.settings.display_name}
                                handle={visual.settings.handle}
                                avatarUrl={visual.settings.avatar_url}
                                theme={visual.settings.theme}
                                style={visual.settings.style}
                                stats={visual.settings.stats || { views: 0, reposts: 0, quotes: 0, likes: 0, bookmarks: 0 }}
                                roundedCorners={visual.settings.corners === 'rounded'}
                                gradient={gradientPreset}
                                textSize={(visual.settings.text_sizes?.[i] as any) || null}
                            />
                        </div>
                    ))}
                </div>
            )}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Publish <em className="font-serif font-normal italic">Now</em></h2>
                    <button
                        onClick={onClose}
                        className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {/* Post preview */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Instagram warning */}
                    {(contentType === 'short_post' || contentType === 'thread') && (
                        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-amber-300 bg-amber-50">
                            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">
                                Instagram is not available for {contentType === 'short_post' ? 'short posts' : 'threads'}. Use <strong>Visuals</strong> to publish to Instagram.
                            </p>
                        </div>
                    )}

                    {/* Platform selection */}
                    {loading ? (
                        <div className="flex items-center justify-center py-4 text-sm text-gray-400">
                            Loading accounts...
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select platforms</label>
                            <div className="grid grid-cols-2 gap-2">
                                {SCHEDULE_PLATFORMS.map((p) => {
                                    const active = selectedPlatforms.includes(p.id);
                                    const connected = connectedPlatformIds.includes(p.id);
                                    const unsupported = getUnsupportedReason(p.id, contentType);
                                    if (unsupported) {
                                        return (
                                            <Tooltip key={p.id} text={unsupported} delay={0} placement="top">
                                                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-400 cursor-not-allowed">
                                                    <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-300 flex items-center justify-center">
                                                        {p.icon}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-300 flex-1">{p.name}</span>
                                                    <AlertTriangle size={16} className="text-amber-500" />
                                                </div>
                                            </Tooltip>
                                        );
                                    }
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => togglePlatform(p.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                                !connected
                                                    ? 'border-gray-100 cursor-not-allowed'
                                                    : active
                                                        ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-400'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                                !connected
                                                    ? 'bg-gray-100 text-gray-300'
                                                    : active
                                                        ? `${p.bg} text-white`
                                                        : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {p.icon}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <span className={`text-sm font-medium ${
                                                    !connected ? 'text-gray-300' : 'text-gray-900'
                                                }`}>
                                                    {p.name}
                                                </span>
                                                {(() => {
                                                    const published = getPublishedInfo(p.id);
                                                    if (published) {
                                                        const date = new Date(published.scheduled_at);
                                                        return (
                                                            <span className="block text-xs text-green-600">
                                                                Published {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            {!connected && (
                                                <span className="text-xs text-gray-400">Not connected</span>
                                            )}
                                            {connected && (
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                    active ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                                                }`}>
                                                    {active && <Check size={12} className="text-white" />}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={isPublishing || selectedPlatforms.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Send size={14} />
                        {isPublishing ? (visual ? 'Rendering & Publishing...' : 'Publishing...') : 'Publish Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
