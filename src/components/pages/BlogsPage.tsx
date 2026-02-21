/**
 * Blogs Page
 *
 * Lists all blogs created by the plugin.
 * Features: search, filter by status, grid of cards.
 */

import { useState, useEffect } from '@wordpress/element';
import { FileText, Search, Filter, Plus, Trash2, Pencil, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getBlogs, deleteBlog } from '@/services/blogApi';
import type { BlogPost } from '@/types';

// ============================================
// TYPES
// ============================================

type StatusFilter = 'all' | 'draft' | 'published' | 'out-of-sync';

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function truncateContent(content: string | null, maxLength: number = 100): string {
    if (!content) return 'No content yet...';
    // Strip HTML tags
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (textContent.length <= maxLength) return textContent;
    return textContent.substring(0, maxLength).trim() + '...';
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatusDot({ status }: { status: BlogPost['wp_status'] }) {
    const colors = {
        published: 'bg-green-500',
        'out-of-sync': 'bg-yellow-500',
        draft: 'bg-orange-500',
    };

    const glowColors = {
        published: 'bg-green-400',
        'out-of-sync': 'bg-yellow-400',
        draft: 'bg-orange-400',
    };

    return (
        <span className="relative flex h-2.5 w-2.5">
            {/* Glow effect */}
            <span
                className={`absolute inline-flex h-full w-full rounded-full animate-status-ping ${glowColors[status]}`}
            />
            {/* Solid dot */}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colors[status]}`} />
        </span>
    );
}

function PostCard({ post, onEdit, onDelete }: { post: BlogPost; onEdit: (id: number) => void; onDelete: (id: number) => void }) {
    const statusColors = {
        published: 'text-green-600',
        'out-of-sync': 'text-yellow-600',
        draft: 'text-orange-600',
    };

    const handleCardClick = () => {
        onEdit(post.id);
    };

    return (
        <div
            onClick={handleCardClick}
            className="group relative flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
        >
            {/* Thumbnail */}
            {post.thumbnail ? (
                <div className="h-32 bg-gray-100 overflow-hidden">
                    <img
                        src={post.thumbnail}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            ) : (
                <div className="h-32 bg-gray-100 flex items-center justify-center">
                    <FileText size={32} className="text-gray-300" />
                </div>
            )}

            <div className="p-4 flex flex-col flex-1">
                {/* Header: Status + Date + Delete */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <StatusDot status={post.wp_status} />
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {post.created_at ? `${formatDate(post.created_at)} at ${formatTime(post.created_at)}` : '—'}
                        </span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
                        className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-all"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Title */}
                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 leading-snug">
                    {post.title || 'Untitled'}
                </h3>

                {/* Content Preview */}
                <p className="text-sm text-gray-500 mb-3 flex-1 line-clamp-2 leading-relaxed">
                    {truncateContent(post.content)}
                </p>

                {/* Footer: Status + Edit */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className={`text-xs font-medium capitalize ${statusColors[post.wp_status]}`}>
                        {post.wp_status}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(post.id); }}
                        className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-all"
                    >
                        <Pencil size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function FilterDropdown({
    value,
    onChange,
    isOpen,
    onToggle,
}: {
    value: StatusFilter;
    onChange: (value: StatusFilter) => void;
    isOpen: boolean;
    onToggle: () => void;
}) {
    const options: { value: StatusFilter; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'out-of-sync', label: 'Out of Sync' },
    ];

    return (
        <div className="relative">
            <button
                onClick={onToggle}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                    value !== 'all'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
            >
                <Filter size={14} />
                {value === 'all' ? 'Filter' : options.find(o => o.value === value)?.label}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => { onChange(option.value); onToggle(); }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${
                                value === option.value
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {option.label}
                            {value === option.value && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BlogsPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Fetch blogs from API
    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const blogs = await getBlogs();
                setPosts(blogs);
            } catch (error) {
                console.error('Failed to fetch blogs:', error);
                toast.error('Failed to load blogs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlogs();
    }, []);

    // Filter posts
    const filteredPosts = posts.filter((post) => {
        const matchesSearch =
            searchQuery === '' ||
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || post.wp_status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleEdit = (id: number) => {
        window.location.href = `admin.php?page=blog-repurpose-blogs&post_id=${id}`;
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this blog?')) return;

        try {
            await deleteBlog(id);
            setPosts(posts.filter(p => p.id !== id));
            toast.success('Blog deleted');
        } catch (error) {
            console.error('Failed to delete blog:', error);
            toast.error('Failed to delete blog');
        }
    };

    const handleCreateNew = () => {
        window.location.href = 'admin.php?page=blog-repurpose';
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto mt-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-gray-500">Loading blogs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900">
                        All <em className="font-serif font-normal italic">Blogs</em>
                    </h1>

                    {/* Only show search/filter when there are posts */}
                    {posts.length > 0 && (
                        <>
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search blogs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-56 h-8 pl-3 pr-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>

                            {/* Filter */}
                            <FilterDropdown
                                value={statusFilter}
                                onChange={setStatusFilter}
                                isOpen={isFilterOpen}
                                onToggle={() => setIsFilterOpen(!isFilterOpen)}
                            />
                        </>
                    )}
                </div>

                {/* New Blog Button */}
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} />
                    New Blog
                </button>
            </div>

            {/* Content */}
            {posts.length === 0 ? (
                /* Zero state */
                <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                        <FileText size={28} className="text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No blogs yet
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        Create your first AI-powered blog post. It only takes a few minutes to go from idea to draft.
                    </p>
                </div>
            ) : filteredPosts.length > 0 ? (
                <>
                    {/* Post Count */}
                    <p className="text-sm text-gray-500 mb-4">
                        {filteredPosts.length} blog {filteredPosts.length === 1 ? 'post' : 'posts'}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredPosts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </>
            ) : (
                /* No results from filter */
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No matching blogs</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Try adjusting your search or filter
                    </p>
                    <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
}
