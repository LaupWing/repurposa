/**
 * Analytics Page
 *
 * Shows post-level performance metrics grouped by blog post.
 * Each card shows metrics per platform with a toggle inside.
 */

import { useState, useEffect } from '@wordpress/element';
import {
    Eye,
    Heart,
    MessageCircle,
    Repeat2,
    MousePointerClick,
    Bookmark,
    TrendingUp,
    BarChart2,
    Quote,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { getAnalyticsSummary, getAnalyticsPosts } from '@/services/analyticsApi';
import type { AnalyticsSummary, AnalyticsPost } from '@/services/analyticsApi';

// ============================================
// TYPES
// ============================================

type Platform = 'x' | 'linkedin' | 'threads' | 'instagram' | 'facebook';

const API_TO_UI_PLATFORM: Record<string, Platform> = {
    twitter: 'x',
    linkedin: 'linkedin',
    threads: 'threads',
    instagram: 'instagram',
    facebook: 'facebook',
};

interface PostMetrics {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks?: number;
    bookmarks?: number;
    quotes?: number;
    saves?: number;
    reach?: number;
}

interface PlatformData {
    platform: Platform;
    publishedAt: string;
    metrics: PostMetrics;
    postUrl?: string | null;
}

interface BlogPost {
    id: number;
    title: string;
    platforms: PlatformData[];
}

// ============================================
// DATA MAPPING
// ============================================

function mapApiPostsToBlogs(apiPosts: AnalyticsPost[]): BlogPost[] {
    const groups = new Map<string, BlogPost>();

    for (const post of apiPosts) {
        if (!post.latest_analytics) continue;

        const a = post.latest_analytics;
        const uiPlatform = API_TO_UI_PLATFORM[post.platform] || post.platform as Platform;
        const groupKey = post.post_id ? `post-${post.post_id}` : `schedulable-${post.schedulable_id}`;
        const title = post.post?.title || 'Standalone Post';

        const platformData: PlatformData = {
            platform: uiPlatform,
            publishedAt: post.published_at,
            postUrl: post.platform_post_url,
            metrics: {
                views: a.views,
                likes: a.likes,
                comments: a.comments,
                shares: a.shares,
                clicks: a.clicks || undefined,
                quotes: a.quotes ?? undefined,
                saves: a.saves ?? undefined,
                reach: a.reach ?? undefined,
                profile_clicks: a.profile_clicks ?? undefined,
            } as PostMetrics,
        };

        const existing = groups.get(groupKey);
        if (existing) {
            // Don't add duplicate platforms
            if (!existing.platforms.some(p => p.platform === uiPlatform)) {
                existing.platforms.push(platformData);
            }
        } else {
            groups.set(groupKey, {
                id: post.post_id || post.schedulable_id,
                title,
                platforms: [platformData],
            });
        }
    }

    const platformOrder: Platform[] = ['x', 'linkedin', 'threads', 'instagram', 'facebook'];
    for (const blog of groups.values()) {
        blog.platforms.sort((a, b) => platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform));
    }

    return Array.from(groups.values());
}

// ============================================
// PLATFORM CONFIG
// ============================================

const PLATFORM_CONFIG: Record<Platform, { name: string; icon: React.ReactNode; bg: string }> = {
    x:         { name: 'X',         icon: <RiTwitterXFill size={12} />,  bg: 'bg-black' },
    linkedin:  { name: 'LinkedIn',  icon: <RiLinkedinFill size={12} />,  bg: 'bg-blue-700' },
    threads:   { name: 'Threads',   icon: <RiThreadsFill size={12} />,   bg: 'bg-gray-900' },
    instagram: { name: 'Instagram', icon: <RiInstagramFill size={12} />, bg: 'bg-gradient-to-br from-purple-600 to-pink-500' },
    facebook:  { name: 'Facebook',  icon: <RiFacebookFill size={12} />,  bg: 'bg-blue-600' },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG) as Platform[];

// ============================================
// HELPERS
// ============================================

function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

function engRate(m: PostMetrics): string {
    if (!m.views) return '0%';
    const eng = m.likes + m.comments + m.shares + (m.clicks ?? 0);
    return ((eng / m.views) * 100).toFixed(1) + '%';
}

// ============================================
// SUB-COMPONENTS
// ============================================

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="flex flex-col items-center gap-0.5 flex-1">
            <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                <span className="text-gray-400">{icon}</span>
                {value}
            </div>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
        </div>
    );
}

function BlogPostCard({ post, forcePlatform }: { post: BlogPost; forcePlatform: Platform | 'all' }) {
    const availablePlatforms = post.platforms.map(p => p.platform);
    const defaultPlatform = forcePlatform !== 'all' && availablePlatforms.includes(forcePlatform)
        ? forcePlatform
        : availablePlatforms[0];

    const [activePlatform, setActivePlatform] = useState<Platform>(defaultPlatform);

    // When forcePlatform changes from outside, sync if available
    const displayPlatform = forcePlatform !== 'all' && availablePlatforms.includes(forcePlatform)
        ? forcePlatform
        : activePlatform;

    const data = post.platforms.find(p => p.platform === displayPlatform);
    if (!data) return null;

    const m = data.metrics;

    return (
        <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-4">
            {/* Blog title + external link */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">{post.title}</h3>
                <button className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                    <ExternalLink size={13} />
                </button>
            </div>

            {/* Platform tabs */}
            <div className="flex items-center gap-1 mb-4">
                {post.platforms.map(({ platform }) => {
                    const p = PLATFORM_CONFIG[platform];
                    const isActive = displayPlatform === platform;
                    return (
                        <button
                            key={platform}
                            onClick={() => setActivePlatform(platform)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                                isActive
                                    ? `${p.bg} text-white`
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                        >
                            {p.icon}
                            {p.name}
                        </button>
                    );
                })}
                <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                    <TrendingUp size={11} />
                    {engRate(m)}
                </span>
            </div>

            {/* Core metrics */}
            <div className="flex items-start gap-2 py-3 border-y border-gray-100">
                <Metric icon={<Eye size={12} />}               value={fmt(m.views)}                                            label="Views" />
                <Metric icon={<Heart size={12} />}             value={fmt(m.likes)}                                            label="Likes" />
                <Metric icon={<MessageCircle size={12} />}     value={fmt(m.comments)}                                         label="Comments" />
                <Metric icon={<Repeat2 size={12} />}           value={fmt(m.shares)}                                           label="Shares" />
                <Metric icon={<MousePointerClick size={12} />} value={m.clicks !== undefined ? fmt(m.clicks) : '—'}            label="Clicks" />
            </div>

            {/* Platform extras */}
            {(m.bookmarks !== undefined || m.quotes !== undefined || m.saves !== undefined || m.reach !== undefined) && (
                <div className="flex items-center gap-2 pt-3">
                    {m.bookmarks !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Bookmark size={11} className="text-gray-400" /> {fmt(m.bookmarks)} bookmarks
                        </span>
                    )}
                    {m.quotes !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Quote size={11} className="text-gray-400" /> {fmt(m.quotes)} quotes
                        </span>
                    )}
                    {m.saves !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Bookmark size={11} className="text-gray-400" /> {fmt(m.saves)} saves
                        </span>
                    )}
                    {m.reach !== undefined && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Eye size={11} className="text-gray-400" /> {fmt(m.reach)} reach
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AnalyticsPage() {
    const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getAnalyticsSummary('all'),
            getAnalyticsPosts('all'),
        ]).then(([summaryData, postsData]) => {
            console.log('[AnalyticsPage] summary:', JSON.stringify(summaryData, null, 2));
            console.log('[AnalyticsPage] raw posts:', JSON.stringify(postsData, null, 2));
            const mapped = mapApiPostsToBlogs(postsData);
            console.log('[AnalyticsPage] mapped blogs:', JSON.stringify(mapped, null, 2));
            setSummary(summaryData);
            setBlogPosts(mapped);
        }).catch((err) => {
            console.error('[AnalyticsPage] Failed to load:', err);
        }).finally(() => setIsLoading(false));
    }, []);

    // Filter out posts that don't have data for the selected platform
    const visiblePosts = platformFilter === 'all'
        ? blogPosts
        : blogPosts.filter(p => p.platforms.some(pl => pl.platform === platformFilter));

    // Aggregate totals from summary endpoint
    const totalViews  = summary?.totals.total_views ?? 0;
    const totalLikes  = summary?.totals.total_likes ?? 0;
    const totalClicks = summary?.totals.total_clicks ?? 0;
    const allMetrics = blogPosts.flatMap(p => p.platforms.map(pl => pl.metrics));
    const avgEng = allMetrics.length > 0
        ? (allMetrics.reduce((s, m) => {
            return s + (m.likes + m.comments + m.shares) / (m.views || 1);
        }, 0) / allMetrics.length * 100).toFixed(1) + '%'
        : '0%';

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">
                        Post{' '}
                        <em className="font-serif font-normal italic">Analytics</em>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Performance across all your published posts</p>
                </div>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
            )}

            {!isLoading && <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { icon: <Eye size={13} />,               label: 'Total Views',     value: fmt(totalViews),  sub: 'Last 30 days' },
                    { icon: <Heart size={13} />,             label: 'Total Likes',     value: fmt(totalLikes),  sub: 'Across all platforms' },
                    { icon: <MousePointerClick size={13} />, label: 'Total Clicks',    value: fmt(totalClicks), sub: 'Link clicks' },
                    { icon: <BarChart2 size={13} />,         label: 'Avg Engagement',  value: avgEng,           sub: 'Likes + comments + shares / views' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 text-gray-400 mb-2">
                            {s.icon}
                            <span className="text-xs text-gray-500">{s.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 w-fit mb-5">
                <button
                    onClick={() => setPlatformFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${platformFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    All
                </button>
                {ALL_PLATFORMS.map(id => {
                    const p = PLATFORM_CONFIG[id];
                    const hasData = blogPosts.some(post => post.platforms.some(pl => pl.platform === id));
                    if (!hasData) return null;
                    return (
                        <button
                            key={id}
                            onClick={() => setPlatformFilter(id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${platformFilter === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {p.icon}
                            {p.name}
                        </button>
                    );
                })}
            </div>

            {/* Post cards grid */}
            {visiblePosts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {visiblePosts.map(post => (
                        <BlogPostCard key={post.id} post={post} forcePlatform={platformFilter} />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <BarChart2 size={28} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h3>
                    <p className="text-sm text-gray-500">Published posts will show their analytics here.</p>
                </div>
            )}
            </>}
        </div>
    );
}
