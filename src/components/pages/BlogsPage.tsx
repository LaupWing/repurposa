/**
 * Blogs Page
 *
 * Lists all blogs created by the plugin.
 * Features: search, filter by status, grid of cards.
 */

import { useState } from '@wordpress/element';
import { FileText, Search, Filter, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Post {
    id: number;
    title: string;
    content: string | null;
    status: 'draft' | 'generating' | 'completed' | 'published';
    created_at: string;
}

type StatusFilter = 'all' | 'draft' | 'generating' | 'completed' | 'published';

// ============================================
// MOCK DATA (will be replaced with API data)
// ============================================

const mockPosts: Post[] = [
    {
        id: 1,
        title: '5 Mistakes Beginners Make When Trying to Lose Weight',
        content: 'Most people start their weight loss journey with the best intentions, but quickly fall into common traps that sabotage their progress...',
        status: 'published',
        created_at: '2024-01-15T10:30:00Z',
    },
    {
        id: 2,
        title: 'The Complete Guide to Meal Prep for Busy Professionals',
        content: 'If you struggle to eat healthy during the week, meal prep is your secret weapon. Here\'s how to get started...',
        status: 'completed',
        created_at: '2024-01-14T14:20:00Z',
    },
    {
        id: 3,
        title: 'Why Most Diets Fail (And What to Do Instead)',
        content: null,
        status: 'generating',
        created_at: '2024-01-13T09:15:00Z',
    },
    {
        id: 4,
        title: 'How I Lost 30 Pounds in 6 Months Without Giving Up Pizza',
        content: 'This is my personal story of transformation. It wasn\'t about restriction, it was about finding balance...',
        status: 'draft',
        created_at: '2024-01-12T16:45:00Z',
    },
];

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
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatusDot({ status }: { status: Post['status'] }) {
    const isLive = status === 'published';
    const isGenerating = status === 'generating';

    return (
        <span className="relative flex h-2.5 w-2.5">
            {/* Glow effect */}
            <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                    isLive
                        ? 'bg-green-400'
                        : isGenerating
                          ? 'bg-blue-400'
                          : 'bg-orange-400'
                }`}
                style={{ animationDuration: '2s' }}
            />
            {/* Solid dot */}
            <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    isLive
                        ? 'bg-green-500'
                        : isGenerating
                          ? 'bg-blue-500'
                          : 'bg-orange-500'
                }`}
            />
        </span>
    );
}

function PostCard({ post, onEdit, onDelete }: { post: Post; onEdit: (id: number) => void; onDelete: (id: number) => void }) {
    const statusColors = {
        published: 'text-green-600',
        completed: 'text-blue-600',
        generating: 'text-yellow-600',
        draft: 'text-orange-600',
    };

    const handleCardClick = () => {
        onEdit(post.id);
    };

    return (
        <div
            onClick={handleCardClick}
            className="group relative flex flex-col h-full bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
        >
            {/* Header: Status + Date + Delete */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <StatusDot status={post.status} />
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {formatDate(post.created_at)} at {formatTime(post.created_at)}
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
                <span className={`text-xs font-medium capitalize ${statusColors[post.status]}`}>
                    {post.status}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(post.id); }}
                    className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-all"
                >
                    <Pencil size={14} />
                </button>
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
        { value: 'generating', label: 'Generating' },
        { value: 'completed', label: 'Completed' },
        { value: 'published', label: 'Published' },
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
    const [posts] = useState<Post[]>(mockPosts);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter posts
    const filteredPosts = posts.filter((post) => {
        const matchesSearch =
            searchQuery === '' ||
            post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.content?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || post.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const handleEdit = (id: number) => {
        // Navigate to blog view page
        window.location.href = `admin.php?page=blog-repurpose-blogs&post_id=${id}`;
    };

    const handleDelete = (id: number) => {
        console.log('Delete post:', id);
        alert(`Delete post ${id} - Coming soon!`);
    };

    const handleCreateNew = () => {
        // Navigate to create page
        window.location.href = 'admin.php?page=blog-repurpose';
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900">
                        All <em className="font-normal italic">Blogs</em>
                    </h1>

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

            {/* Post Count */}
            <p className="text-sm text-gray-500 mb-4">
                {filteredPosts.length} blog {filteredPosts.length === 1 ? 'post' : 'posts'}
            </p>

            {/* Content */}
            {filteredPosts.length > 0 ? (
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
            ) : posts.length > 0 ? (
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
            ) : (
                /* Empty State */
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={24} className="text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No blogs yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Create your first blog post to get started
                    </p>
                    <button
                        onClick={handleCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                    >
                        <Plus size={16} />
                        Create Blog
                    </button>
                </div>
            )}
        </div>
    );
}
