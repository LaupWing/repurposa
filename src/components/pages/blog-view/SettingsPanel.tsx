import { useState } from '@wordpress/element';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteBlog } from '@/services/blogApi';
import type { BlogPost } from '@/types';

export function SettingsPanel({
    post,
    onDeleted,
}: {
    post: BlogPost;
    onDeleted: () => void;
}) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this blog? This action cannot be undone.')) return;

        setIsDeleting(true);
        try {
            await deleteBlog(post.id);
            toast.success('Blog deleted');
            onDeleted();
        } catch (error) {
            console.error('Failed to delete blog:', error);
            toast.error('Failed to delete blog');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const statusLabels: Record<string, string> = {
        generating: 'Generating',
        draft: 'Draft',
        published: 'Published',
        'out-of-sync': 'Out of Sync',
    };
    const statusColors: Record<string, string> = {
        generating: 'text-blue-700 bg-blue-50 border-blue-200',
        draft: 'text-orange-700 bg-orange-50 border-orange-200',
        published: 'text-green-700 bg-green-50 border-green-200',
        'out-of-sync': 'text-yellow-700 bg-yellow-50 border-yellow-200',
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
                {/* Blog Info */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Blog Info</h3>
                    <dl className="space-y-4">
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Topic</dt>
                            <dd className="text-sm text-gray-900">{post.topic || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Created</dt>
                            <dd className="text-sm text-gray-900">{formatDate(post.created_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Last Updated</dt>
                            <dd className="text-sm text-gray-900">{formatDate(post.updated_at)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-gray-500 mb-1">Status</dt>
                            <dd>
                                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${statusColors[post.status] || statusColors.draft}`}>
                                    {statusLabels[post.status] || post.status}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Outline */}
                {post.outline && post.outline.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Outline</h3>
                        <ol className="space-y-3">
                            {post.outline.map((section, index) => (
                                <li
                                    key={index}
                                    className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                >
                                    <div className="text-sm font-medium text-gray-900">
                                        {index + 1}. {section.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {section.purpose}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Danger Zone */}
                <div className="border-t border-gray-200 pt-8">
                    <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Permanently delete this blog and all associated data. This action cannot be undone.
                    </p>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Trash2 size={16} />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete Blog'}
                    </button>
                </div>
            </div>
        </div>
    );
}
