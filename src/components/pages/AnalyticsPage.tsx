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
    ChevronDown,
    ArrowUpDown,
    MessageSquare,
    ListOrdered,
    Image,
} from 'lucide-react';
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from 'react-icons/ri';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getAnalyticsSummary, getAnalyticsPosts, getPostSnapshots, getDailyTotals } from '@/services/analyticsApi';
import type { DailyTotal } from '@/services/analyticsApi';
import type { AnalyticsSummary, AnalyticsPost, AnalyticsSnapshot } from '@/services/analyticsApi';

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
    content?: string | null;
    scheduledPostId: number;
}

type PostType = 'short' | 'thread' | 'visual';

interface BlogPost {
    id: number;
    title: string;
    postType: PostType;
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
        const groupKey = `${post.schedulable_type}-${post.schedulable_id}`;
        const title = post.post?.title || 'Standalone Post';
        const st = post.schedulable_type.toLowerCase();
        const postType: PostType = (st === 'thread' || st.includes('thread')) ? 'thread'
            : (st === 'visual' || st.includes('visual')) ? 'visual'
            : 'short';

        const platformData: PlatformData = {
            platform: uiPlatform,
            publishedAt: post.published_at,
            postUrl: post.platform_post_url,
            content: post.schedulable_content,
            scheduledPostId: post.id,
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
                postType,
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

const OVERVIEW_METRICS = [
    { key: 'views', color: '#3b82f6', label: 'Views' },
    { key: 'likes', color: '#ef4444', label: 'Likes' },
    { key: 'comments', color: '#8b5cf6', label: 'Comments' },
    { key: 'shares', color: '#10b981', label: 'Shares' },
    { key: 'clicks', color: '#f59e0b', label: 'Clicks' },
] as const;

const OVERVIEW_PERIODS = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'all', label: 'All time' },
] as const;

function OverviewChart() {
    const [dailyData, setDailyData] = useState<DailyTotal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<string>('views');
    const [period, setPeriod] = useState<string>('7d');

    useEffect(() => {
        setIsLoading(true);
        getDailyTotals(period)
            .then(setDailyData)
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [period]);

    const metric = OVERVIEW_METRICS.find(m => m.key === activeMetric) || OVERVIEW_METRICS[0];

    const chartData = dailyData.map(d => ({
        label: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        views: Number(d.views),
        likes: Number(d.likes),
        comments: Number(d.comments),
        shares: Number(d.shares),
        clicks: Number(d.clicks),
    }));

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                    {OVERVIEW_METRICS.map(m => (
                        <button
                            key={m.key}
                            onClick={() => setActiveMetric(m.key)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                activeMetric === m.key
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            style={activeMetric === m.key ? { backgroundColor: m.color } : undefined}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-md p-0.5">
                    {OVERVIEW_PERIODS.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setPeriod(p.key)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                period === p.key
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={20} className="animate-spin text-gray-300" />
                </div>
            ) : chartData.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-400">
                    No analytics data for this period
                </div>
            ) : (
                <div
                    style={{ userSelect: 'none' } as React.CSSProperties}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                            <defs>
                                <linearGradient id={`overview-grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={metric.color} stopOpacity={0.35} />
                                    <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                stroke="#d1d5db"
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                stroke="#d1d5db"
                                tickLine={false}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #d1d5db', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                                labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}
                            />
                            <Area
                                type="monotone"
                                dataKey={metric.key}
                                stroke={metric.color}
                                strokeWidth={2}
                                fill={`url(#overview-grad-${metric.key})`}
                                dot={chartData.length === 1 ? { r: 4, fill: metric.color, strokeWidth: 0 } : false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

const CHART_METRICS = [
    { key: 'views', color: '#3b82f6', label: 'Views' },
    { key: 'likes', color: '#ef4444', label: 'Likes' },
    { key: 'comments', color: '#8b5cf6', label: 'Comments' },
    { key: 'shares', color: '#10b981', label: 'Shares' },
] as const;

type TimeMode = 'hours' | 'time';
type RangeMode = '24h' | 'all';

function GrowthChart({ scheduledPostId, publishedAt }: { scheduledPostId: number; publishedAt: string }) {
    const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState<string>('views');
    const [timeMode, setTimeMode] = useState<TimeMode>('hours');
    const [rangeMode, setRangeMode] = useState<RangeMode>('24h');

    useEffect(() => {
        setIsLoading(true);
        getPostSnapshots(scheduledPostId)
            .then(setSnapshots)
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [scheduledPostId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-gray-300" />
            </div>
        );
    }

    if (snapshots.length === 0) {
        return (
            <div className="text-center py-6 text-xs text-gray-400">
                No data yet — check back in an hour
            </div>
        );
    }

    const pubTime = new Date(publishedAt).getTime();

    // Filter based on range mode
    const cutoff = pubTime + 24.5 * 60 * 60 * 1000;
    const first24h = snapshots.filter(s => new Date(s.fetched_at).getTime() <= cutoff);
    const dataSource = rangeMode === '24h' && first24h.length > 0 ? first24h : snapshots;

    const chartData = dataSource.map(s => {
        const fetchedAt = new Date(s.fetched_at);
        const hoursAfter = Math.round((fetchedAt.getTime() - pubTime) / (1000 * 60 * 60));
        const daysAfter = Math.round((fetchedAt.getTime() - pubTime) / (1000 * 60 * 60 * 24));
        const timeStr = fetchedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

        let label: string;
        if (timeMode === 'time') {
            label = rangeMode === 'all'
                ? fetchedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : timeStr;
        } else {
            label = rangeMode === 'all' ? `${daysAfter}d` : `${hoursAfter}h`;
        }

        return {
            label,
            views: s.views,
            likes: s.likes,
            comments: s.comments,
            shares: s.shares,
        };
    });

    // Extrapolate to 24h if in 24h mode and last data point is before 24h
    if (rangeMode === '24h' && dataSource.length >= 2) {
        const lastSnap = dataSource[dataSource.length - 1];
        const lastHour = Math.round((new Date(lastSnap.fetched_at).getTime() - pubTime) / (1000 * 60 * 60));
        if (lastHour < 24) {
            const prevSnap = dataSource[dataSource.length - 2];
            const prevHour = Math.round((new Date(prevSnap.fetched_at).getTime() - pubTime) / (1000 * 60 * 60));
            const hourDiff = lastHour - prevHour || 1;
            const hoursToExtrap = 24 - lastHour;
            const ratio = hoursToExtrap / hourDiff;

            const extrapolate = (last: number, prev: number) => Math.round(last + (last - prev) * ratio);

            const pubAt24 = new Date(pubTime + 24 * 60 * 60 * 1000);
            chartData.push({
                label: timeMode === 'time'
                    ? pubAt24.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                    : '24h',
                views: extrapolate(lastSnap.views, prevSnap.views),
                likes: extrapolate(lastSnap.likes, prevSnap.likes),
                comments: extrapolate(lastSnap.comments, prevSnap.comments),
                shares: extrapolate(lastSnap.shares, prevSnap.shares),
            });
        }
    }

    const metric = CHART_METRICS.find(m => m.key === activeMetric) || CHART_METRICS[0];

    return (
        <div>
            {/* Header: metric pills + range/time toggles */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                    {CHART_METRICS.map(m => (
                        <button
                            key={m.key}
                            onClick={() => setActiveMetric(m.key)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                activeMetric === m.key
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            style={activeMetric === m.key ? { backgroundColor: m.color } : undefined}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setRangeMode(prev => prev === '24h' ? 'all' : '24h')}
                        className="text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100"
                    >
                        {rangeMode === '24h' ? 'All time' : 'First 24h'}
                    </button>
                    <span className="text-gray-200">·</span>
                    <button
                        onClick={() => setTimeMode(prev => prev === 'hours' ? 'time' : 'hours')}
                        className="text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-100"
                    >
                        {timeMode === 'hours' ? 'Show time' : 'Show hours'}
                    </button>
                </div>
            </div>
            <div
                style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' } as React.CSSProperties}
                onMouseDown={(e) => e.preventDefault()}
            >
            <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                        <linearGradient id={`grad-${scheduledPostId}-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={metric.color} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={metric.color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        stroke="#d1d5db"
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        stroke="#d1d5db"
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #d1d5db', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                        labelStyle={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}
                    />
                    <Area
                        type="monotone"
                        dataKey={metric.key}
                        stroke={metric.color}
                        strokeWidth={2}
                        fill={`url(#grad-${scheduledPostId}-${metric.key})`}
                        dot={chartData.length === 1 ? { r: 4, fill: metric.color, strokeWidth: 0 } : false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
            </div>
        </div>
    );
}

function BlogPostCard({ post, forcePlatform }: { post: BlogPost; forcePlatform: Platform | 'all' }) {
    const availablePlatforms = post.platforms.map(p => p.platform);
    const defaultPlatform = forcePlatform !== 'all' && availablePlatforms.includes(forcePlatform)
        ? forcePlatform
        : availablePlatforms[0];

    const [activePlatform, setActivePlatform] = useState<Platform>(defaultPlatform);
    const [showChart, setShowChart] = useState(false);

    // When forcePlatform changes from outside, sync if available
    const displayPlatform = forcePlatform !== 'all' && availablePlatforms.includes(forcePlatform)
        ? forcePlatform
        : activePlatform;

    const data = post.platforms.find(p => p.platform === displayPlatform);
    if (!data) return null;

    const m = data.metrics;

    return (
        <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-4">
            {/* Post type badge + published date */}
            <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {post.postType === 'short' && <><MessageSquare size={13} /> Short Post</>}
                    {post.postType === 'thread' && <><ListOrdered size={13} /> Thread</>}
                    {post.postType === 'visual' && <><Image size={13} /> Visual</>}
                </span>
                <span className="text-[10px] text-gray-400">
                    {new Date(data.publishedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
            </div>

            {/* Post content + external link */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm text-gray-900 leading-snug line-clamp-2 whitespace-pre-line">
                    {data.content || post.title}
                </p>
                {data.postUrl && (
                    <a href={data.postUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                        <ExternalLink size={13} />
                    </a>
                )}
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
                <button
                    onClick={() => setShowChart(!showChart)}
                    className="ml-auto text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600 transition-colors"
                >
                    <TrendingUp size={11} />
                    {engRate(m)}
                    <span className="text-[10px] ml-0.5">{showChart ? 'Hide graph' : 'Show graph'}</span>
                    <ChevronDown size={11} className={`transition-transform ${showChart ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* Growth chart (expandable) */}
            {showChart && (
                <div className="mb-4 pb-1">
                    <GrowthChart scheduledPostId={data.scheduledPostId} publishedAt={data.publishedAt} />
                </div>
            )}

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
    const [sortBy, setSortBy] = useState<'recent' | 'views' | 'likes' | 'engagement'>('recent');

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
    const filtered = platformFilter === 'all'
        ? blogPosts
        : blogPosts.filter(p => p.platforms.some(pl => pl.platform === platformFilter));

    // Sort
    const visiblePosts = [...filtered].sort((a, b) => {
        const aPlat = a.platforms[0];
        const bPlat = b.platforms[0];
        if (sortBy === 'recent') {
            return new Date(bPlat.publishedAt).getTime() - new Date(aPlat.publishedAt).getTime();
        }
        const aMetrics = a.platforms.reduce((s, p) => ({ views: s.views + p.metrics.views, likes: s.likes + p.metrics.likes, eng: s.eng + (p.metrics.likes + p.metrics.comments + p.metrics.shares) / (p.metrics.views || 1) }), { views: 0, likes: 0, eng: 0 });
        const bMetrics = b.platforms.reduce((s, p) => ({ views: s.views + p.metrics.views, likes: s.likes + p.metrics.likes, eng: s.eng + (p.metrics.likes + p.metrics.comments + p.metrics.shares) / (p.metrics.views || 1) }), { views: 0, likes: 0, eng: 0 });
        if (sortBy === 'views') return bMetrics.views - aMetrics.views;
        if (sortBy === 'likes') return bMetrics.likes - aMetrics.likes;
        return bMetrics.eng - aMetrics.eng; // engagement
    });

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
            {/* Overview chart */}
            <OverviewChart />

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

            {/* Platform filter + sort */}
            <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 w-fit">
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

            {/* Sort */}
            <div className="flex items-center gap-1.5">
                <ArrowUpDown size={12} className="text-gray-400" />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer font-medium"
                >
                    <option value="recent">Most recent</option>
                    <option value="views">Most views</option>
                    <option value="likes">Most likes</option>
                    <option value="engagement">Highest engagement</option>
                </select>
            </div>
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
