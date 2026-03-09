/**
 * Analytics Page
 *
 * Shows post-level performance metrics grouped by blog post.
 * Each card shows metrics per platform with a toggle inside.
 */

import { useState } from '@wordpress/element';
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
} from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';

// ============================================
// TYPES
// ============================================

type Platform = 'x' | 'linkedin' | 'threads' | 'instagram' | 'facebook';

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
}

interface BlogPost {
    id: number;
    title: string;
    platforms: PlatformData[];
}

// ============================================
// MOCK DATA
// ============================================

const MOCK_BLOG_POSTS: BlogPost[] = [
    {
        id: 1,
        title: 'Why You Don\'t Need Redux Anymore',
        platforms: [
            {
                platform: 'x',
                publishedAt: '2026-03-08T09:00:00Z',
                metrics: { views: 14820, likes: 312, comments: 47, shares: 89, clicks: 203, bookmarks: 156, quotes: 18 },
            },
            {
                platform: 'linkedin',
                publishedAt: '2026-03-08T09:00:00Z',
                metrics: { views: 8430, likes: 284, comments: 63, shares: 41, clicks: 312, reach: 6200 },
            },
            {
                platform: 'threads',
                publishedAt: '2026-03-08T10:00:00Z',
                metrics: { views: 6210, likes: 198, comments: 34, shares: 52, clicks: 87, quotes: 11 },
            },
        ],
    },
    {
        id: 2,
        title: 'The Mom Test: How to Talk to Customers',
        platforms: [
            {
                platform: 'x',
                publishedAt: '2026-03-07T09:00:00Z',
                metrics: { views: 22100, likes: 891, comments: 112, shares: 234, clicks: 445, bookmarks: 389, quotes: 67 },
            },
            {
                platform: 'instagram',
                publishedAt: '2026-03-07T09:00:00Z',
                metrics: { views: 11340, likes: 567, comments: 29, shares: 78, saves: 234, reach: 9800 },
            },
            {
                platform: 'facebook',
                publishedAt: '2026-03-07T09:30:00Z',
                metrics: { views: 4320, likes: 143, comments: 21, shares: 37, clicks: 95 },
            },
        ],
    },
    {
        id: 3,
        title: 'Ship First, Refactor Later',
        platforms: [
            {
                platform: 'x',
                publishedAt: '2026-03-06T09:00:00Z',
                metrics: { views: 9870, likes: 423, comments: 58, shares: 134, clicks: 287, bookmarks: 201, quotes: 32 },
            },
            {
                platform: 'linkedin',
                publishedAt: '2026-03-06T09:00:00Z',
                metrics: { views: 5670, likes: 178, comments: 44, shares: 29, clicks: 187, reach: 4100 },
            },
            {
                platform: 'threads',
                publishedAt: '2026-03-06T10:00:00Z',
                metrics: { views: 3890, likes: 124, comments: 18, shares: 31, clicks: 54, quotes: 8 },
            },
            {
                platform: 'instagram',
                publishedAt: '2026-03-06T11:00:00Z',
                metrics: { views: 7240, likes: 389, comments: 15, shares: 45, saves: 167, reach: 6100 },
            },
        ],
    },
    {
        id: 4,
        title: 'How to Level Up as a Developer',
        platforms: [
            {
                platform: 'linkedin',
                publishedAt: '2026-03-05T09:00:00Z',
                metrics: { views: 12800, likes: 534, comments: 91, shares: 67, clicks: 423, reach: 10200 },
            },
            {
                platform: 'threads',
                publishedAt: '2026-03-05T09:30:00Z',
                metrics: { views: 4560, likes: 201, comments: 28, shares: 44, clicks: 73, quotes: 14 },
            },
        ],
    },
];

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
    const cfg = PLATFORM_CONFIG[displayPlatform];

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

    // Filter out posts that don't have data for the selected platform
    const visiblePosts = platformFilter === 'all'
        ? MOCK_BLOG_POSTS
        : MOCK_BLOG_POSTS.filter(p => p.platforms.some(pl => pl.platform === platformFilter));

    // Aggregate totals
    const allMetrics = MOCK_BLOG_POSTS.flatMap(p => p.platforms.map(pl => pl.metrics));
    const totalViews  = allMetrics.reduce((s, m) => s + m.views, 0);
    const totalLikes  = allMetrics.reduce((s, m) => s + m.likes, 0);
    const totalClicks = allMetrics.reduce((s, m) => s + (m.clicks ?? 0), 0);
    const avgEng = (allMetrics.reduce((s, m) => {
        return s + (m.likes + m.comments + m.shares) / (m.views || 1);
    }, 0) / allMetrics.length * 100).toFixed(1) + '%';

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
                    const hasData = MOCK_BLOG_POSTS.some(post => post.platforms.some(pl => pl.platform === id));
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
        </div>
    );
}
